import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { purchaseReturnRepository } from '../repositories/purchase-return.repository';
import { purchaseRepository } from '../repositories/purchase.repository';
import { accVoucherRepository } from '../repositories/accvoucher.repository';
import { calculateItemTotals, calculateVoucherTotals, roundMoney, parseDocNumber } from './voucherCalculation.service';
import { auditService } from './audit.service';
import { resolveDescriptionAndHsn } from '../utils/resolveDescriptionAndHsn';
import { OverReturnError } from './sales-return.service';
import { PurchaseReturn, PurchaseReturnItem } from '../types/PurchaseReturn';

/**
 * Builds the header and item rows for a purchase return from the request body.
 * Used by both create and update so the two can never compute totals differently.
 * Mirrors sales-return.service.ts's buildSalesReturn onto the purchase side: the referenced
 * bill must belong to the same account, and the return's total must not exceed what's left
 * on that bill (unless the caller confirms the overage).
 */
async function buildPurchaseReturn(db: any, companyId: string, returnId: string, body: any) {
  const {
    returnNumber, date, supplierId, financialYear, items,
    againstPurchaseId, againstBillDate, returnType,
    brokerName, challanNumber, challanDate, lrNumber, lrDate, remark, confirmOverage
  } = body;

  if (!returnNumber || !date || !supplierId || !financialYear || !items || !items.length) {
    throw new Error('Missing required purchase return header or item parameters.');
  }
  if (!againstPurchaseId || !againstBillDate || !returnType) {
    throw new Error('Against Bill No., Bill Date and Return Type are required.');
  }
  const returnNumberVal = parseDocNumber(returnNumber, 'Return number');
  const challanNumberVal = challanNumber ? parseDocNumber(challanNumber, 'Challan number') : null;

  const purchase = await purchaseRepository.findPurchaseById(companyId, againstPurchaseId, db);
  if (!purchase) {
    throw new Error('Referenced purchase bill not found.');
  }
  if (purchase.supplier_id !== supplierId) {
    throw new Error('This bill does not belong to the selected account.');
  }

  const itemRows: PurchaseReturnItem[] = [];
  for (const item of items) {
    const { categoryId, qualityId, quantity, meters, rate, gstPercentage, pcs } = item;

    const resolved = await resolveDescriptionAndHsn(
      db, companyId,
      item.descriptionName || item.description, item.descriptionId,
      item.hsnCode, item.hsnId, gstPercentage
    );

    const itemMeters = Number(meters !== undefined ? meters : quantity);
    if (!categoryId || !qualityId || !resolved.descriptionId || !resolved.hsnId || !itemMeters || !rate || gstPercentage === undefined) {
      throw new Error('Invalid item fields detected.');
    }

    const calcs = calculateItemTotals(itemMeters, Number(rate), Number(gstPercentage));
    itemRows.push({
      id: crypto.randomUUID(),
      purchase_return_id: returnId,
      company_id: companyId,
      category_id: categoryId,
      quality_id: qualityId,
      description_id: resolved.descriptionId,
      hsn_id: resolved.hsnId,
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

  const header: PurchaseReturn = {
    id: returnId,
    company_id: companyId,
    return_number: returnNumberVal,
    date,
    supplier_id: supplierId,
    financial_year: financialYear,
    against_purchase_id: againstPurchaseId,
    against_bill_date: againstBillDate,
    return_type: returnType,
    taxable_value: roundMoney(sums.totalTaxable),
    gst_amount: roundMoney(sums.totalGst),
    total_amount: roundMoney(sums.totalAmount),
    broker_name: brokerName || null,
    challan_number: challanNumberVal,
    challan_date: challanDate || null,
    lr_number: lrNumber || null,
    lr_date: lrDate || null,
    remark: remark || null
  };

  // Over-return check: the bill's own balanceDue, excluding this return's own prior effect
  // (its own id, safe to pass even on create since no row with that id exists yet).
  const outstanding = await accVoucherRepository.getOutstandingBills(
    companyId, supplierId, [returnId], { billType: 'purchase', includeAllEntries: true }
  );
  const billRow = outstanding.find((b: any) => b.billId === againstPurchaseId);
  const balanceDue = billRow ? billRow.balanceDue : 0;
  if (header.total_amount - balanceDue > 0.005 && confirmOverage !== true) {
    throw new OverReturnError(balanceDue);
  }

  return { header, itemRows };
}

async function assertReturnNumberFree(db: any, companyId: string, header: PurchaseReturn, ownId: string | null) {
  const clashId = await purchaseReturnRepository.findIdByNumber(db, companyId, header.financial_year, header.return_number);
  if (clashId && clashId !== ownId) {
    throw new Error(`Return number ${header.return_number} already exists in ${header.financial_year}.`);
  }
}

export class PurchaseReturnService {
  async getPurchaseReturns(companyId: string): Promise<PurchaseReturn[]> {
    const purchaseReturns = await purchaseReturnRepository.findAll(companyId);
    const items = await purchaseReturnRepository.findItemsByCompany(companyId);
    const byReturn = new Map<string, PurchaseReturnItem[]>();
    for (const item of items) {
      if (!byReturn.has(item.purchase_return_id)) byReturn.set(item.purchase_return_id, []);
      byReturn.get(item.purchase_return_id)!.push(item);
    }
    for (const purchaseReturn of purchaseReturns) purchaseReturn.items = byReturn.get(purchaseReturn.id) || [];
    return purchaseReturns;
  }

  async getNextPurchaseReturnNumber(companyId: string, financialYear?: string): Promise<string> {
    return String((await purchaseReturnRepository.findMaxReturnNumber(companyId, financialYear)) + 1);
  }

  async findPurchaseReturnByNumber(companyId: string, number: any, financialYear?: string): Promise<PurchaseReturn> {
    const purchaseReturn = await purchaseReturnRepository.findPurchaseReturnByNumber(companyId, number, financialYear);
    if (!purchaseReturn) {
      throw new Error('Purchase return not found.');
    }
    purchaseReturn.items = await purchaseReturnRepository.findItemsByPurchaseReturnId(purchaseReturn.id);
    return purchaseReturn;
  }

  async createPurchaseReturn(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const returnId = crypto.randomUUID();
    const header = await withTransaction(async (db) => {
      const { header, itemRows } = await buildPurchaseReturn(db, companyId, returnId, body);
      await assertReturnNumberFree(db, companyId, header, null);

      await purchaseReturnRepository.createHeader(db, header);
      for (const item of itemRows) await purchaseReturnRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Return Created',
      `Created Purchase Return ${header.return_number}. Total Amount: ${header.total_amount}`
    );
    return returnId;
  }

  async updatePurchaseReturn(companyId: string, id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const header = await withTransaction(async (db) => {
      const oldReturn = await purchaseReturnRepository.findPurchaseReturnById(companyId, id, db);
      if (!oldReturn) {
        throw new Error('Purchase return record not found.');
      }

      const { header, itemRows } = await buildPurchaseReturn(db, companyId, id, body);
      await assertReturnNumberFree(db, companyId, header, id);

      await purchaseReturnRepository.deleteItemsByPurchaseReturnId(db, id);
      await purchaseReturnRepository.updateHeader(db, id, header);
      for (const item of itemRows) await purchaseReturnRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Return Updated',
      `Modified Purchase Return ${header.return_number}. New Amount: ${header.total_amount}`
    );
  }

  async deletePurchaseReturn(companyId: string, id: string, user: { id: string; username: string }): Promise<void> {
    const purchaseReturn = await withTransaction(async (db) => {
      const purchaseReturn = await purchaseReturnRepository.findPurchaseReturnById(companyId, id, db);
      if (!purchaseReturn) {
        throw new Error('Purchase return record not found.');
      }

      await purchaseReturnRepository.deleteItemsByPurchaseReturnId(db, id);
      await purchaseReturnRepository.deletePurchaseReturn(db, id);
      return purchaseReturn;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Purchase Return Deleted',
      `Deleted purchase return ${purchaseReturn.return_number}`
    );
  }
}
export const purchaseReturnService = new PurchaseReturnService();
