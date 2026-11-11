import { getDb } from '../db/index';
import { SalesInvoice, SalesItem } from '../types/Sales';

export class SalesRepository {
  async findAll(companyId: string): Promise<SalesInvoice[]> {
    const db = await getDb();
    return db.all(`
      SELECT s.*, pt.name as customer_name 
      FROM sales s
      JOIN accounts pt ON s.customer_id = pt.id
      WHERE s.company_id = ? 
      ORDER BY s.date DESC, s.updated_at DESC
    `, [companyId]);
  }

  async findItemsBySalesId(salesId: string): Promise<SalesItem[]> {
    return this.findItems('si.sales_id = ?', salesId);
  }

  async findItemsByCompany(companyId: string): Promise<SalesItem[]> {
    return this.findItems('si.company_id = ?', companyId);
  }

  private async findItems(where: string, param: string): Promise<SalesItem[]> {
    const db = await getDb();
    return db.all(`
      SELECT si.*, 
             c.name as category_name,
             q.name as quality_name,
             d.name as description_name,
             h.hsn_code,
             -- compatibility mapping
             q.name as product_name,
             d.name as description,
             si.meters as quantity
      FROM sales_items si
      JOIN categories c ON si.category_id = c.id
      JOIN qualities q ON si.quality_id = q.id
      JOIN descriptions d ON si.description_id = d.id
      JOIN hsn_codes h ON si.hsn_id = h.id
      WHERE ${where}
    `, [param]);
  }

  /** Highest number in one financial year (all years when none is given). */
  async findMaxInvoiceNumber(companyId: string, financialYear?: string): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT MAX(invoice_number) as maxNo FROM sales WHERE company_id = ? AND (? IS NULL OR financial_year = ?)', [companyId, financialYear || null, financialYear || null]);
    return Number(row?.maxNo || 0);
  }

  async findSaleByNumber(companyId: string, number: any, financialYear?: string): Promise<SalesInvoice | null> {
    const db = await getDb();
    const sale = await db.get(
      `SELECT s.*, pt.name as customer_name 
       FROM sales s 
       JOIN accounts pt ON s.customer_id = pt.id 
       WHERE s.company_id = ? AND s.invoice_number = ? AND (? IS NULL OR s.financial_year = ?)
       ORDER BY s.date DESC`,
      [companyId, number, financialYear || null, financialYear || null]
    );
    return sale || null;
  }

  async findIdByNumber(db: any, companyId: string, financialYear: string, number: number): Promise<string | null> {
    const row = await db.get(
      'SELECT id FROM sales WHERE company_id = ? AND financial_year = ? AND invoice_number = ?',
      [companyId, financialYear, number]
    );
    return row ? row.id : null;
  }

  /** Pass `db` to read inside an open transaction (see withTransaction). */
  async findSaleById(companyId: string, id: string, db?: any): Promise<SalesInvoice | null> {
    db = db || await getDb();
    const sale = await db.get(
      'SELECT * FROM sales WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    return sale || null;
  }

  async createHeader(db: any, sale: SalesInvoice): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO sales (
        id, company_id, invoice_number, date, customer_id, financial_year,
        taxable_value, gst_amount, total_amount, is_dirty, updated_at,
        challan_number, challan_date, credit_days, broker_name, bale_number,
        order_number, order_date, sales_type, lr_number, lr_date,
        transport, delivery_at, vehicle_number, remark, credit_account,
        cartage, postage, less, less_add, rounded_off
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.id, sale.company_id, sale.invoice_number, sale.date, sale.customer_id, sale.financial_year,
        sale.taxable_value, sale.gst_amount, sale.total_amount, now,
        sale.challan_number || null, sale.challan_date || null, sale.credit_days || 0, sale.broker_name || null, sale.bale_number || null,
        sale.order_number || null, sale.order_date || null, sale.sales_type || null, sale.lr_number || null, sale.lr_date || null,
        sale.transport || null, sale.delivery_at || null, sale.vehicle_number || null, sale.remark || null, sale.credit_account || null,
        sale.cartage || 0, sale.postage || 0, sale.less || 0, sale.less_add || 0, sale.rounded_off || 0
      ]
    );
  }

  async updateHeader(db: any, id: string, sale: SalesInvoice): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE sales SET 
        invoice_number = ?, date = ?, customer_id = ?, financial_year = ?,
        taxable_value = ?, gst_amount = ?, total_amount = ?, is_dirty = 1, updated_at = ?,
        challan_number = ?, challan_date = ?, credit_days = ?, broker_name = ?, bale_number = ?,
        order_number = ?, order_date = ?, sales_type = ?, lr_number = ?, lr_date = ?,
        transport = ?, delivery_at = ?, vehicle_number = ?, remark = ?, credit_account = ?,
        cartage = ?, postage = ?, less = ?, less_add = ?, rounded_off = ?
       WHERE id = ?`,
      [
        sale.invoice_number, sale.date, sale.customer_id, sale.financial_year,
        sale.taxable_value, sale.gst_amount, sale.total_amount, now,
        sale.challan_number || null, sale.challan_date || null, sale.credit_days || 0, sale.broker_name || null, sale.bale_number || null,
        sale.order_number || null, sale.order_date || null, sale.sales_type || null, sale.lr_number || null, sale.lr_date || null,
        sale.transport || null, sale.delivery_at || null, sale.vehicle_number || null, sale.remark || null, sale.credit_account || null,
        sale.cartage || 0, sale.postage || 0, sale.less || 0, sale.less_add || 0, sale.rounded_off || 0,
        id
      ]
    );
  }

  async createItem(db: any, item: SalesItem): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO sales_items (id, sales_id, company_id, category_id, quality_id, description_id, hsn_id, pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, piece_meters, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [item.id, item.sales_id, item.company_id, item.category_id, item.quality_id, item.description_id, item.hsn_id, item.pcs || 0, item.meters, item.rate, item.gst_percentage, item.taxable_value, item.gst_amount, item.total_amount, item.piece_meters || null, now]
    );
  }

  async deleteItemsBySalesId(db: any, salesId: string): Promise<void> {
    await db.run('DELETE FROM sales_items WHERE sales_id = ?', [salesId]);
  }

  async deleteSale(db: any, id: string): Promise<void> {
    await db.run('DELETE FROM sales WHERE id = ?', [id]);
  }

  async findDistinctCreditAccounts(companyId: string): Promise<string[]> {
    const db = await getDb();
    const rows = await db.all(`
      SELECT DISTINCT credit_account 
      FROM sales 
      WHERE company_id = ? AND credit_account IS NOT NULL AND credit_account != ''
      ORDER BY credit_account ASC
    `, [companyId]);
    return rows.map((r: any) => r.credit_account);
  }
}
export const salesRepository = new SalesRepository();
