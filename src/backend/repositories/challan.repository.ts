import { getDb } from '../db/index';
import { DeliveryChallan, ChallanItem } from '../types/Challan';

export class ChallanRepository {
  async findAll(companyId: string): Promise<DeliveryChallan[]> {
    const db = await getDb();
    return db.all(`
      SELECT c.*, pt.name as customer_name 
      FROM delivery_challans c
      JOIN accounts pt ON c.customer_id = pt.id
      WHERE c.company_id = ? 
      ORDER BY c.date DESC, c.updated_at DESC
    `, [companyId]);
  }

  async findItemsByChallanId(challanId: string): Promise<ChallanItem[]> {
    return this.findItems('ci.challan_id = ?', challanId);
  }

  async findItemsByCompany(companyId: string): Promise<ChallanItem[]> {
    return this.findItems('ci.company_id = ?', companyId);
  }

  private async findItems(where: string, param: string): Promise<ChallanItem[]> {
    const db = await getDb();
    return db.all(`
      SELECT ci.*, 
             c.name as category_name,
             q.name as quality_name,
             d.name as description_name,
             h.hsn_code,
             -- compatibility mapping
             q.name as product_name,
             d.name as description,
             ci.meters as quantity
      FROM delivery_challan_items ci
      JOIN categories c ON ci.category_id = c.id
      JOIN qualities q ON ci.quality_id = q.id
      JOIN descriptions d ON ci.description_id = d.id
      JOIN hsn_codes h ON ci.hsn_id = h.id
      WHERE ${where}
    `, [param]);
  }

  async findMaxChallanNumber(companyId: string): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT MAX(challan_number) as maxNo FROM delivery_challans WHERE company_id = ?', [companyId]);
    return Number(row?.maxNo || 0);
  }

  async findChallanByNumber(companyId: string, number: any): Promise<DeliveryChallan | null> {
    const db = await getDb();
    const challan = await db.get(
      `SELECT c.*, pt.name as customer_name 
       FROM delivery_challans c 
       JOIN accounts pt ON c.customer_id = pt.id 
       WHERE c.company_id = ? AND c.challan_number = ?`,
      [companyId, number]
    );
    return challan || null;
  }

  async findIdByNumber(db: any, companyId: string, financialYear: string, number: number): Promise<string | null> {
    const row = await db.get(
      'SELECT id FROM delivery_challans WHERE company_id = ? AND financial_year = ? AND challan_number = ?',
      [companyId, financialYear, number]
    );
    return row ? row.id : null;
  }

  /** Pass `db` to read inside an open transaction (see withTransaction). */
  async findChallanById(companyId: string, id: string, db?: any): Promise<DeliveryChallan | null> {
    db = db || await getDb();
    const challan = await db.get(
      'SELECT * FROM delivery_challans WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    return challan || null;
  }

  async createHeader(db: any, challan: DeliveryChallan): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO delivery_challans (
        id, company_id, challan_number, date, customer_id, financial_year,
        taxable_value, gst_amount, total_amount, is_dirty, updated_at,
        broker_name, bale_number, order_number, order_date, sales_type,
        transport, delivery_at, vehicle_number, remark, rounded_off
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        challan.id, challan.company_id, challan.challan_number, challan.date, challan.customer_id, challan.financial_year,
        challan.taxable_value, challan.gst_amount, challan.total_amount, now,
        challan.broker_name || null, challan.bale_number || null, challan.order_number || null, challan.order_date || null, challan.sales_type || null,
        challan.transport || null, challan.delivery_at || null, challan.vehicle_number || null, challan.remark || null, challan.rounded_off || 0
      ]
    );
  }

  async updateHeader(db: any, id: string, challan: DeliveryChallan): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE delivery_challans SET 
        challan_number = ?, date = ?, customer_id = ?, financial_year = ?,
        taxable_value = ?, gst_amount = ?, total_amount = ?, is_dirty = 1, updated_at = ?,
        broker_name = ?, bale_number = ?, order_number = ?, order_date = ?, sales_type = ?,
        transport = ?, delivery_at = ?, vehicle_number = ?, remark = ?, rounded_off = ?
       WHERE id = ?`,
      [
        challan.challan_number, challan.date, challan.customer_id, challan.financial_year,
        challan.taxable_value, challan.gst_amount, challan.total_amount, now,
        challan.broker_name || null, challan.bale_number || null, challan.order_number || null, challan.order_date || null, challan.sales_type || null,
        challan.transport || null, challan.delivery_at || null, challan.vehicle_number || null, challan.remark || null, challan.rounded_off || 0,
        id
      ]
    );
  }

  async createItem(db: any, item: ChallanItem): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO delivery_challan_items (id, challan_id, company_id, category_id, quality_id, description_id, hsn_id, pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, piece_meters, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [item.id, item.challan_id, item.company_id, item.category_id, item.quality_id, item.description_id, item.hsn_id, item.pcs || 0, item.meters, item.rate, item.gst_percentage, item.taxable_value, item.gst_amount, item.total_amount, item.piece_meters || null, now]
    );
  }

  async deleteItemsByChallanId(db: any, challanId: string): Promise<void> {
    await db.run('DELETE FROM delivery_challan_items WHERE challan_id = ?', [challanId]);
  }

  async deleteChallan(db: any, id: string): Promise<void> {
    await db.run('DELETE FROM delivery_challans WHERE id = ?', [id]);
  }

  async updateStatusAndInvoice(db: any, companyId: string, challanNumber: number, status: 'PENDING' | 'INVOICED', salesInvoiceId: string | null): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE delivery_challans 
       SET status = ?, sales_invoice_id = ?, is_dirty = 1, updated_at = ?
       WHERE company_id = ? AND challan_number = ?`,
      [status, salesInvoiceId, now, companyId, challanNumber]
    );
  }

  async resetStatusByInvoiceId(db: any, companyId: string, salesInvoiceId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE delivery_challans 
       SET status = 'PENDING', sales_invoice_id = NULL, is_dirty = 1, updated_at = ?
       WHERE company_id = ? AND sales_invoice_id = ?`,
      [now, companyId, salesInvoiceId]
    );
  }
}
export const challanRepository = new ChallanRepository();
