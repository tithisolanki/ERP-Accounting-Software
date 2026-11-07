import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { challanRepository } from '../repositories/challan.repository';
import { calculateItemTotals, calculateVoucherTotals, roundMoney, parseDocNumber } from './voucherCalculation.service';
import { auditService } from './audit.service';
import { resolveDescriptionAndHsn } from '../utils/resolveDescriptionAndHsn';
import { DeliveryChallan, ChallanItem } from '../types/Challan';

/** Builds header + item rows for a challan. Shared by create and update. */
async function buildChallan(db: any, companyId: string, challanId: string, body: any) {
  const {
    challanNumber, date, customerId, financialYear, items,
    brokerName, baleNumber, orderNumber, orderDate, salesType,
    transport, deliveryAt, vehicleNumber, remark, roundedOff
  } = body;

  if (!challanNumber || !date || !customerId || !financialYear || !items || !items.length) {
    throw new Error('Missing required challan header or item parameters.');
  }
  const challanNumberVal = parseDocNumber(challanNumber, 'Challan number');

  const itemRows: ChallanItem[] = [];
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
      challan_id: challanId,
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
  const roundedOffVal = Number(roundedOff || 0);

  const header: DeliveryChallan = {
    id: challanId,
    company_id: companyId,
    challan_number: challanNumberVal,
    date,
    customer_id: customerId,
    financial_year: financialYear,
    taxable_value: roundMoney(sums.totalTaxable),
    gst_amount: roundMoney(sums.totalGst),
    total_amount: roundMoney(sums.totalAmount + roundedOffVal),
    broker_name: brokerName || null,
    bale_number: baleNumber || null,
    order_number: orderNumber || null,
    order_date: orderDate || null,
    sales_type: salesType || null,
    transport: transport || null,
    delivery_at: deliveryAt || null,
    vehicle_number: vehicleNumber || null,
    remark: remark || null,
    rounded_off: roundedOffVal
  };

  return { header, itemRows };
}

async function assertChallanNumberFree(db: any, companyId: string, header: DeliveryChallan, ownId: string | null) {
  const clashId = await challanRepository.findIdByNumber(db, companyId, header.financial_year, header.challan_number);
  if (clashId && clashId !== ownId) {
    throw new Error(`Challan number ${header.challan_number} already exists in ${header.financial_year}.`);
  }
}

export class ChallanService {
  async getChallans(companyId: string): Promise<DeliveryChallan[]> {
    const challans = await challanRepository.findAll(companyId);
    const items = await challanRepository.findItemsByCompany(companyId);
    const byChallan = new Map<string, ChallanItem[]>();
    for (const item of items) {
      if (!byChallan.has(item.challan_id)) byChallan.set(item.challan_id, []);
      byChallan.get(item.challan_id)!.push(item);
    }
    for (const challan of challans) challan.items = byChallan.get(challan.id) || [];
    return challans;
  }

  async getNextChallanNumber(companyId: string): Promise<string> {
    return String((await challanRepository.findMaxChallanNumber(companyId)) + 1);
  }

  async findChallanByNumber(companyId: string, number: any): Promise<DeliveryChallan> {
    const challan = await challanRepository.findChallanByNumber(companyId, number);
    if (!challan) {
      throw new Error('Delivery Challan not found.');
    }
    challan.items = await challanRepository.findItemsByChallanId(challan.id);
    return challan;
  }

  async createChallan(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const challanId = crypto.randomUUID();
    const header = await withTransaction(async (db) => {
      const { header, itemRows } = await buildChallan(db, companyId, challanId, body);
      await assertChallanNumberFree(db, companyId, header, null);
      await challanRepository.createHeader(db, header);
      for (const item of itemRows) await challanRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Challan Created',
      `Created Delivery Challan ${header.challan_number}. Total Amount: ${header.total_amount}`
    );
    return challanId;
  }

  async updateChallan(companyId: string, id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const header = await withTransaction(async (db) => {
      const old = await challanRepository.findChallanById(companyId, id, db);
      if (!old) {
        throw new Error('Challan record not found.');
      }
      const { header, itemRows } = await buildChallan(db, companyId, id, body);
      await assertChallanNumberFree(db, companyId, header, id);
      await challanRepository.deleteItemsByChallanId(db, id);
      await challanRepository.updateHeader(db, id, header);
      for (const item of itemRows) await challanRepository.createItem(db, item);
      return header;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Challan Updated',
      `Modified Delivery Challan ${header.challan_number}. New Amount: ${header.total_amount}`
    );
  }

  async deleteChallan(companyId: string, id: string, user: { id: string; username: string }): Promise<void> {
    const challan = await withTransaction(async (db) => {
      const challan = await challanRepository.findChallanById(companyId, id, db);
      if (!challan) {
        throw new Error('Challan record not found.');
      }
      await challanRepository.deleteItemsByChallanId(db, id);
      await challanRepository.deleteChallan(db, id);
      return challan;
    });

    await auditService.log(
      companyId, user.id, user.username, 'Challan Deleted',
      `Deleted delivery challan ${challan.challan_number}`
    );
  }
}
export const challanService = new ChallanService();
