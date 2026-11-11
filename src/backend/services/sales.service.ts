import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { salesRepository } from '../repositories/sales.repository';
import { challanRepository } from '../repositories/challan.repository';
import { calculateItemTotals, calculateVoucherTotals, roundMoney, parseDocNumber } from './voucherCalculation.service';
import { auditService } from './audit.service';
import { resolveDescriptionAndHsn } from '../utils/resolveDescriptionAndHsn';
import { SalesInvoice, SalesItem } from '../types/Sales';

/**
 * Builds the header and item rows for a sale from the request body.
 * Used by both create and update so the two can never compute totals differently.
 * Grand total = items (taxable + GST) + cartage + postage - less + lessAdd + roundedOff,
 * the same formula the voucher screen shows (VouchersPage.calculateTotals).
 */
async function buildSale(db: any, companyId: string, salesId: string, body: any) {
  const {
    invoiceNumber, date, customerId, financialYear, items,
    challanNumber, challanDate, creditDays, brokerName, baleNumber,
    orderNumber, orderDate, salesType, lrNumber, lrDate,
    transport, deliveryAt, vehicleNumber, remark, creditAccount,
    cartage, postage, less, lessAdd, roundedOff
  } = body;

  if (!invoiceNumber || !date || !customerId || !financialYear || !items || !items.length) {
    throw new Error('Missing required sales header or item parameters.');
  }
  const invoiceNumberVal = parseDocNumber(invoiceNumber, 'Invoice number');
  const challanNumberVal = challanNumber ? parseDocNumber(challanNumber, 'Challan number') : null;

  const itemRows: SalesItem[] = [];
  for (const item of items) {
    const { categoryId, qualityId, quantity, meters, rate, gstPercentage, pcs, pieceMeters } = item;

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
      sales_id: salesId,
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
      total_amount: calcs.total,
      piece_meters: pieceMeters || null
    });
  }

  const sums = calculateVoucherTotals(itemRows.map(i => ({ taxable: i.taxable_value, gst: i.gst_amount, total: i.total_amount })));
  const extras = {
    cartage: Number(cartage || 0),
    postage: Number(postage || 0),
    less: Number(less || 0),
    less_add: Number(lessAdd || 0),
    rounded_off: Number(roundedOff || 0)
  };
  const grandTotal = roundMoney(
    sums.totalAmount + extras.cartage + extras.postage - extras.less + extras.less_add + extras.rounded_off
  );

  const header: SalesInvoice = {
    id: salesId,
    company_id: companyId,
    invoice_number: invoiceNumberVal,
    date,
    customer_id: customerId,
    financial_year: financialYear,
    taxable_value: roundMoney(sums.totalTaxable),
    gst_amount: roundMoney(sums.totalGst),
    total_amount: grandTotal,
    challan_number: challanNumberVal,
    challan_date: challanDate || null,
    credit_days: Number(creditDays || 0),
    broker_name: brokerName || null,
    bale_number: baleNumber || null,
    order_number: orderNumber || null,
    order_date: orderDate || null,
    sales_type: salesType || null,
    lr_number: lrNumber || null,
    lr_date: lrDate || null,
    transport: transport || null,
    delivery_at: deliveryAt || null,
    vehicle_number: vehicleNumber || null,
    remark: remark || null,
    credit_account: creditAccount || null,
    ...extras
  };

  return { header, itemRows };
}

async function assertInvoiceNumberFree(db: any, companyId: string, header: SalesInvoice, ownId: string | null) {
  const clashId = await salesRepository.findIdByNumber(db, companyId, header.financial_year, header.invoice_number);
  if (clashId && clashId !== ownId) {
    throw new Error(`Invoice number ${header.invoice_number} already exists in ${header.financial_year}.`);
  }
}

export class SalesService {
  async getSales(companyId: string): Promise<SalesInvoice[]> {
    const sales = await salesRepository.findAll(companyId);
    const items = await salesRepository.findItemsByCompany(companyId);
    const bySale = new Map<string, SalesItem[]>();
    for (const item of items) {
      if (!bySale.has(item.sales_id)) bySale.set(item.sales_id, []);
      bySale.get(item.sales_id)!.push(item);
    }
    for (const sale of sales) sale.items = bySale.get(sale.id) || [];
    return sales;
  }

  async getNextInvoiceNumber(companyId: string, financialYear?: string): Promise<string> {
    return String((await salesRepository.findMaxInvoiceNumber(companyId, financialYear)) + 1);
  }

  async findSaleByNumber(companyId: string, number: any, financialYear?: string): Promise<SalesInvoice> {
    const sale = await salesRepository.findSaleByNumber(companyId, number, financialYear);
    if (!sale) {
      throw new Error('Sales invoice not found.');
    }
    sale.items = await salesRepository.findItemsBySalesId(sale.id);
    return sale;
  }

  async createSale(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const salesId = crypto.randomUUID();
    const header = await withTransaction(async (db) => {
      const { header, itemRows } = await buildSale(db, companyId, salesId, body);
      await assertInvoiceNumberFree(db, companyId, header, null);

      await salesRepository.createHeader(db, header);
      for (const item of itemRows) await salesRepository.createItem(db, item);

      if (header.challan_number) {
        await challanRepository.updateStatusAndInvoice(db, companyId, header.challan_number, 'INVOICED', salesId);
      }
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Created',
      `Created Sales Invoice ${header.invoice_number}. Total Amount: ${header.total_amount}`
    );
    return salesId;
  }

  async updateSale(companyId: string, id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const header = await withTransaction(async (db) => {
      const oldSale = await salesRepository.findSaleById(companyId, id, db);
      if (!oldSale) {
        throw new Error('Sales invoice record not found.');
      }

      const { header, itemRows } = await buildSale(db, companyId, id, body);
      await assertInvoiceNumberFree(db, companyId, header, id);

      // If previously linked to a challan, revert its status to PENDING
      if (oldSale.challan_number) {
        await challanRepository.updateStatusAndInvoice(db, companyId, oldSale.challan_number, 'PENDING', null);
      }

      await salesRepository.deleteItemsBySalesId(db, id);
      await salesRepository.updateHeader(db, id, header);
      for (const item of itemRows) await salesRepository.createItem(db, item);

      if (header.challan_number) {
        await challanRepository.updateStatusAndInvoice(db, companyId, header.challan_number, 'INVOICED', id);
      }
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Updated',
      `Modified Sales Invoice ${header.invoice_number}. New Amount: ${header.total_amount}`
    );
  }

  async deleteSale(companyId: string, id: string, user: { id: string; username: string }): Promise<void> {
    const sale = await withTransaction(async (db) => {
      const sale = await salesRepository.findSaleById(companyId, id, db);
      if (!sale) {
        throw new Error('Sales invoice record not found.');
      }

      // If linked to a challan, revert its status to PENDING
      if (sale.challan_number) {
        await challanRepository.updateStatusAndInvoice(db, companyId, sale.challan_number, 'PENDING', null);
      }

      await salesRepository.deleteItemsBySalesId(db, id);
      await salesRepository.deleteSale(db, id);
      return sale;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Sales Deleted',
      `Deleted sales invoice ${sale.invoice_number}`
    );
  }

  async getCreditAccounts(companyId: string): Promise<string[]> {
    return salesRepository.findDistinctCreditAccounts(companyId);
  }
}
export const salesService = new SalesService();
