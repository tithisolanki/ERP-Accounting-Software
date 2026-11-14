import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { salesReturnRepository } from '../repositories/sales-return.repository';
import { salesRepository } from '../repositories/sales.repository';
import { accVoucherRepository } from '../repositories/accvoucher.repository';
import { calculateItemTotals, calculateVoucherTotals, roundMoney, parseDocNumber } from './voucherCalculation.service';
import { auditService } from './audit.service';
import { resolveDescriptionAndHsn } from '../utils/resolveDescriptionAndHsn';
import { SalesReturn, SalesReturnItem } from '../types/SalesReturn';

/**
 * Thrown when a return's total would take its bill's remaining balance negative and the
 * caller hasn't set confirmOverage: true. Exported standalone (not nested in SalesReturnService)
 * so the Purchase Return side can reuse it rather than duplicating the same class.
 */
export class OverReturnError extends Error {
  balanceDue: number;
  constructor(balanceDue: number) {
    super(`Return total exceeds the bill's remaining balance of ${roundMoney(balanceDue)}.`);
    this.name = 'OverReturnError';
    this.balanceDue = balanceDue;
  }
}

/**
 * Builds the header and item rows for a sales return from the request body.
 * Used by both create and update so the two can never compute totals differently.
 * Mirrors sales.service.ts's buildSale, plus two validations a return needs that a sale
 * doesn't: the referenced bill must belong to the same account, and the return's total
 * must not exceed what's left on that bill (unless the caller confirms the overage).
 */
async function buildSalesReturn(db: any, companyId: string, returnId: string, body: any) {
  const {
    returnNumber, date, customerId, financialYear, items,
    againstSaleId, againstBillDate, returnType,
    brokerName, challanNumber, challanDate, lrNumber, lrDate, remark, confirmOverage
  } = body;

  if (!returnNumber || !date || !customerId || !financialYear || !items || !items.length) {
    throw new Error('Missing required sales return header or item parameters.');
  }
  if (!againstSaleId || !againstBillDate || !returnType) {
    throw new Error('Against Bill No., Bill Date and Return Type are required.');
  }
  const returnNumberVal = parseDocNumber(returnNumber, 'Return number');
  const challanNumberVal = challanNumber ? parseDocNumber(challanNumber, 'Challan number') : null;

  const sale = await salesRepository.findSaleById(companyId, againstSaleId, db);
  if (!sale) {
    throw new Error('Referenced sales invoice not found.');
  }
  if (sale.customer_id !== customerId) {
    throw new Error('This bill does not belong to the selected account.');
  }

  const itemRows: SalesReturnItem[] = [];
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
      sales_return_id: returnId,
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

  const header: SalesReturn = {
    id: returnId,
    company_id: companyId,
    return_number: returnNumberVal,
    date,
    customer_id: customerId,
    financial_year: financialYear,
    against_sale_id: againstSaleId,
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
    companyId, customerId, [returnId], { billType: 'sale', includeAllEntries: true }
  );
  const billRow = outstanding.find((b: any) => b.billId === againstSaleId);
  const balanceDue = billRow ? billRow.balanceDue : 0;
  if (header.total_amount - balanceDue > 0.005 && confirmOverage !== true) {
    throw new OverReturnError(balanceDue);
  }

  return { header, itemRows };
}

async function assertReturnNumberFree(db: any, companyId: string, header: SalesReturn, ownId: string | null) {
  const clashId = await salesReturnRepository.findIdByNumber(db, companyId, header.financial_year, header.return_number);
  if (clashId && clashId !== ownId) {
    throw new Error(`Return number ${header.return_number} already exists in ${header.financial_year}.`);
  }
}

export class SalesReturnService {
  async getSalesReturns(companyId: string): Promise<SalesReturn[]> {
    const salesReturns = await salesReturnRepository.findAll(companyId);
    const items = await salesReturnRepository.findItemsByCompany(companyId);
    const byReturn = new Map<string, SalesReturnItem[]>();
    for (const item of items) {
      if (!byReturn.has(item.sales_return_id)) byReturn.set(item.sales_return_id, []);
      byReturn.get(item.sales_return_id)!.push(item);
    }
    for (const salesReturn of salesReturns) salesReturn.items = byReturn.get(salesReturn.id) || [];
    return salesReturns;
  }

  async getNextSalesReturnNumber(companyId: string, financialYear?: string): Promise<string> {
    return String((await salesReturnRepository.findMaxReturnNumber(companyId, financialYear)) + 1);
  }

  async findSalesReturnByNumber(companyId: string, number: any, financialYear?: string): Promise<SalesReturn> {
    const salesReturn = await salesReturnRepository.findSalesReturnByNumber(companyId, number, financialYear);
    if (!salesReturn) {
      throw new Error('Sales return not found.');
    }
    salesReturn.items = await salesReturnRepository.findItemsBySalesReturnId(salesReturn.id);
    return salesReturn;
  }

  async createSalesReturn(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const returnId = crypto.randomUUID();
    const header = await withTransaction(async (db) => {
      const { header, itemRows } = await buildSalesReturn(db, companyId, returnId, body);
      await assertReturnNumberFree(db, companyId, header, null);

      await salesReturnRepository.createHeader(db, header);
      for (const item of itemRows) await salesReturnRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Return Created',
      `Created Sales Return ${header.return_number}. Total Amount: ${header.total_amount}`
    );
    return returnId;
  }

  async updateSalesReturn(companyId: string, id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const header = await withTransaction(async (db) => {
      const oldReturn = await salesReturnRepository.findSalesReturnById(companyId, id, db);
      if (!oldReturn) {
        throw new Error('Sales return record not found.');
      }

      const { header, itemRows } = await buildSalesReturn(db, companyId, id, body);
      await assertReturnNumberFree(db, companyId, header, id);

      await salesReturnRepository.deleteItemsBySalesReturnId(db, id);
      await salesReturnRepository.updateHeader(db, id, header);
      for (const item of itemRows) await salesReturnRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Return Updated',
      `Modified Sales Return ${header.return_number}. New Amount: ${header.total_amount}`
    );
  }

  async deleteSalesReturn(companyId: string, id: string, user: { id: string; username: string }): Promise<void> {
    const salesReturn = await withTransaction(async (db) => {
      const salesReturn = await salesReturnRepository.findSalesReturnById(companyId, id, db);
      if (!salesReturn) {
        throw new Error('Sales return record not found.');
      }

      await salesReturnRepository.deleteItemsBySalesReturnId(db, id);
      await salesReturnRepository.deleteSalesReturn(db, id);
      return salesReturn;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Return Deleted',
      `Deleted sales return ${salesReturn.return_number}`
    );
  }
}
export const salesReturnService = new SalesReturnService();
