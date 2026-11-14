import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { purchaseRepository } from '../repositories/purchase.repository';
import { calculateItemTotals, calculateVoucherTotals, roundMoney, parseDocNumber } from './voucherCalculation.service';
import { auditService } from './audit.service';
import { resolveDescriptionAndHsn } from '../utils/resolveDescriptionAndHsn';
import { Purchase, PurchaseItem } from '../types/Purchase';

/**
 * Builds the header and item rows for a purchase from the request body.
 * Used by both create and update so the two can never compute totals differently.
 * Grand total = items (taxable + GST) + addValue - lessValue + lessAdd + roundedOff,
 * the same formula the voucher screen shows (VouchersPage.calculateTotals).
 */
async function buildPurchase(db: any, companyId: string, purchaseId: string, body: any) {
  const {
    purchaseNumber, date, supplierId, financialYear, items,
    entryNo, creditDays, brokerName, challanNumber, challanDate,
    purchaseType, lotNumber, lrNumber, lrDate, transport, remark, debitAccount,
    addValue, lessValue, lessAdd, roundedOff
  } = body;

  if (!purchaseNumber || !date || !supplierId || !financialYear || !items || !items.length) {
    throw new Error('Missing required purchase header or item parameters.');
  }
  const purchaseNumberVal = parseDocNumber(purchaseNumber, 'Purchase entry number');
  const challanNumberVal = challanNumber ? Number(challanNumber) : null;
  const lotNumberValInput = lotNumber ? Number(lotNumber) : null;

  const itemRows: PurchaseItem[] = [];
  for (const item of items) {
    const { categoryId, qualityId, lotNumber: itemLot, quantity, meters, rate, gstPercentage, pcs } = item;

    const resolved = await resolveDescriptionAndHsn(
      db, companyId,
      item.descriptionName || item.description, item.descriptionId,
      item.hsnCode, item.hsnId, gstPercentage
    );

    const itemMeters = Number(meters !== undefined ? meters : quantity);
    const finalLotNumber = itemLot ? Number(itemLot) : (lotNumberValInput || purchaseNumberVal);

    if (!categoryId || !qualityId || !resolved.descriptionId || !resolved.hsnId || !finalLotNumber || !itemMeters || !rate || gstPercentage === undefined) {
      throw new Error('Invalid item fields detected.');
    }

    const calcs = calculateItemTotals(itemMeters, Number(rate), Number(gstPercentage));
    itemRows.push({
      id: crypto.randomUUID(),
      purchase_id: purchaseId,
      company_id: companyId,
      category_id: categoryId,
      quality_id: qualityId,
      description_id: resolved.descriptionId,
      hsn_id: resolved.hsnId,
      lot_number: finalLotNumber,
      pcs: Number(pcs || 0),
      meters: itemMeters,
      rate: Number(rate),
      gst_percentage: Number(gstPercentage),
      taxable_value: calcs.taxable,
      gst_amount: calcs.gst,
      total_amount: calcs.total
    });
  }

  const sums = calculateVoucherTotals(itemRows.map(i => ({ taxable: i.taxable_value, gst: i.gst_amount, total: i.total_amount })));
  const extras = {
    add_value: Number(addValue || 0),
    less_value: Number(lessValue || 0),
    less_add: Number(lessAdd || 0),
    rounded_off: Number(roundedOff || 0)
  };
  const grandTotal = roundMoney(
    sums.totalAmount + extras.add_value - extras.less_value + extras.less_add + extras.rounded_off
  );

  const header: Purchase = {
    id: purchaseId,
    company_id: companyId,
    purchase_number: entryNo || '',
    date,
    supplier_id: supplierId,
    financial_year: financialYear,
    taxable_value: roundMoney(sums.totalTaxable),
    gst_amount: roundMoney(sums.totalGst),
    total_amount: grandTotal,
    lot_number: lotNumberValInput,
    entry_no: purchaseNumberVal,
    credit_days: Number(creditDays || 0),
    broker_name: brokerName || null,
    challan_number: challanNumberVal,
    challan_date: challanDate || null,
    purchase_type: purchaseType || null,
    lr_number: lrNumber || null,
    lr_date: lrDate || null,
    transport: transport || null,
    remark: remark || null,
    debit_account: debitAccount || null,
    ...extras
  };

  return { header, itemRows };
}

async function assertEntryNoFree(db: any, companyId: string, header: Purchase, ownId: string | null) {
  const clashId = await purchaseRepository.findIdByNumber(db, companyId, header.financial_year, Number(header.entry_no));
  if (clashId && clashId !== ownId) {
    throw new Error(`Purchase entry number ${header.entry_no} already exists in ${header.financial_year}.`);
  }
}

export class PurchaseService {
  async getPurchases(companyId: string): Promise<Purchase[]> {
    const purchases = await purchaseRepository.findAll(companyId);
    const items = await purchaseRepository.findItemsByCompany(companyId);
    const byPurchase = new Map<string, PurchaseItem[]>();
    for (const item of items) {
      if (!byPurchase.has(item.purchase_id)) byPurchase.set(item.purchase_id, []);
      byPurchase.get(item.purchase_id)!.push(item);
    }
    for (const purchase of purchases) purchase.items = byPurchase.get(purchase.id) || [];
    return purchases;
  }

  async getNextPurchaseNumber(companyId: string, financialYear?: string): Promise<string> {
    return String((await purchaseRepository.findMaxEntryNo(companyId, financialYear)) + 1);
  }

  async findPurchaseByNumber(companyId: string, number: any, financialYear?: string): Promise<Purchase> {
    const purchase = await purchaseRepository.findPurchaseByNumber(companyId, number, financialYear);
    if (!purchase) {
      throw new Error('Purchase bill not found.');
    }
    purchase.items = await purchaseRepository.findItemsByPurchaseId(purchase.id);
    return purchase;
  }

  async createPurchase(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const purchaseId = crypto.randomUUID();
    const header = await withTransaction(async (db) => {
      const { header, itemRows } = await buildPurchase(db, companyId, purchaseId, body);
      await assertEntryNoFree(db, companyId, header, null);
      await purchaseRepository.createHeader(db, header);
      for (const item of itemRows) await purchaseRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Created',
      `Created Purchase Voucher ${header.entry_no}. Total Amount: ${header.total_amount}`
    );
    return purchaseId;
  }

  async updatePurchase(companyId: string, id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const header = await withTransaction(async (db) => {
      const old = await purchaseRepository.findPurchaseById(companyId, id, db);
      if (!old) {
        throw new Error('Purchase record not found.');
      }
      const { header, itemRows } = await buildPurchase(db, companyId, id, body);
      await assertEntryNoFree(db, companyId, header, id);
      await purchaseRepository.deleteItemsByPurchaseId(db, id);
      await purchaseRepository.updateHeader(db, id, header);
      for (const item of itemRows) await purchaseRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Updated',
      `Modified Purchase Voucher ${header.entry_no}. New Amount: ${header.total_amount}`
    );
  }

  async deletePurchase(companyId: string, id: string, user: { id: string; username: string }): Promise<void> {
    const purchase = await withTransaction(async (db) => {
      const purchase = await purchaseRepository.findPurchaseById(companyId, id, db);
      if (!purchase) {
        throw new Error('Purchase record not found.');
      }
      await purchaseRepository.deleteItemsByPurchaseId(db, id);
      await purchaseRepository.deletePurchase(db, id);
      return purchase;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Deleted',
      `Deleted purchase bill ${purchase.purchase_number}`
    );
  }

  async getDebitAccounts(companyId: string): Promise<string[]> {
    return purchaseRepository.findDistinctDebitAccounts(companyId);
  }
}
export const purchaseService = new PurchaseService();
