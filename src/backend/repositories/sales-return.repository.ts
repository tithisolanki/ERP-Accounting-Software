import { getDb } from '../db/index';
import { SalesReturn, SalesReturnItem } from '../types/SalesReturn';

export class SalesReturnRepository {
  async findAll(companyId: string): Promise<SalesReturn[]> {
    const db = await getDb();
    return db.all(`
      SELECT sr.*, pt.name as customer_name
      FROM sales_returns sr
      JOIN accounts pt ON sr.customer_id = pt.id
      WHERE sr.company_id = ?
      ORDER BY sr.date DESC, sr.updated_at DESC
    `, [companyId]);
  }

  async findItemsBySalesReturnId(salesReturnId: string): Promise<SalesReturnItem[]> {
    return this.findItems('sri.sales_return_id = ?', salesReturnId);
  }

  async findItemsByCompany(companyId: string): Promise<SalesReturnItem[]> {
    return this.findItems('sri.company_id = ?', companyId);
  }

  private async findItems(where: string, param: string): Promise<SalesReturnItem[]> {
    const db = await getDb();
    return db.all(`
      SELECT sri.*,
             c.name as category_name,
             q.name as quality_name,
             d.name as description_name,
             h.hsn_code
      FROM sales_return_items sri
      JOIN categories c ON sri.category_id = c.id
      JOIN qualities q ON sri.quality_id = q.id
      JOIN descriptions d ON sri.description_id = d.id
      JOIN hsn_codes h ON sri.hsn_id = h.id
      WHERE ${where}
    `, [param]);
  }

  /** Highest number in one financial year (all years when none is given). */
  async findMaxReturnNumber(companyId: string, financialYear?: string): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT MAX(return_number) as maxNo FROM sales_returns WHERE company_id = ? AND (? IS NULL OR financial_year = ?)', [companyId, financialYear || null, financialYear || null]);
    return Number(row?.maxNo || 0);
  }

  async findSalesReturnByNumber(companyId: string, number: any, financialYear?: string): Promise<SalesReturn | null> {
    const db = await getDb();
    const salesReturn = await db.get(
      `SELECT sr.*, pt.name as customer_name
       FROM sales_returns sr
       JOIN accounts pt ON sr.customer_id = pt.id
       WHERE sr.company_id = ? AND sr.return_number = ? AND (? IS NULL OR sr.financial_year = ?)
       ORDER BY sr.date DESC`,
      [companyId, number, financialYear || null, financialYear || null]
    );
    return salesReturn || null;
  }

  async findIdByNumber(db: any, companyId: string, financialYear: string, number: number): Promise<string | null> {
    const row = await db.get(
      'SELECT id FROM sales_returns WHERE company_id = ? AND financial_year = ? AND return_number = ?',
      [companyId, financialYear, number]
    );
    return row ? row.id : null;
  }

  /** Pass `db` to read inside an open transaction (see withTransaction). */
  async findSalesReturnById(companyId: string, id: string, db?: any): Promise<SalesReturn | null> {
    db = db || await getDb();
    const salesReturn = await db.get(
      'SELECT * FROM sales_returns WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    return salesReturn || null;
  }

  async createHeader(db: any, salesReturn: SalesReturn): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO sales_returns (
        id, company_id, return_number, date, customer_id, financial_year,
        against_sale_id, against_bill_date, return_type,
        taxable_value, gst_amount, total_amount, is_dirty, updated_at,
        broker_name, challan_number, challan_date, lr_number, lr_date, remark
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        salesReturn.id, salesReturn.company_id, salesReturn.return_number, salesReturn.date, salesReturn.customer_id, salesReturn.financial_year,
        salesReturn.against_sale_id, salesReturn.against_bill_date, salesReturn.return_type,
        salesReturn.taxable_value, salesReturn.gst_amount, salesReturn.total_amount, now,
        salesReturn.broker_name || null, salesReturn.challan_number || null, salesReturn.challan_date || null,
        salesReturn.lr_number || null, salesReturn.lr_date || null, salesReturn.remark || null
      ]
    );
  }

  async updateHeader(db: any, id: string, salesReturn: SalesReturn): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE sales_returns SET
        return_number = ?, date = ?, customer_id = ?, financial_year = ?,
        against_sale_id = ?, against_bill_date = ?, return_type = ?,
        taxable_value = ?, gst_amount = ?, total_amount = ?, is_dirty = 1, updated_at = ?,
        broker_name = ?, challan_number = ?, challan_date = ?, lr_number = ?, lr_date = ?, remark = ?
       WHERE id = ?`,
      [
        salesReturn.return_number, salesReturn.date, salesReturn.customer_id, salesReturn.financial_year,
        salesReturn.against_sale_id, salesReturn.against_bill_date, salesReturn.return_type,
        salesReturn.taxable_value, salesReturn.gst_amount, salesReturn.total_amount, now,
        salesReturn.broker_name || null, salesReturn.challan_number || null, salesReturn.challan_date || null,
        salesReturn.lr_number || null, salesReturn.lr_date || null, salesReturn.remark || null,
        id
      ]
    );
  }

  async createItem(db: any, item: SalesReturnItem): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO sales_return_items (id, sales_return_id, company_id, category_id, quality_id, description_id, hsn_id, pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [item.id, item.sales_return_id, item.company_id, item.category_id, item.quality_id, item.description_id, item.hsn_id, item.pcs || 0, item.meters, item.rate, item.gst_percentage, item.taxable_value, item.gst_amount, item.total_amount, now]
    );
  }

  async deleteItemsBySalesReturnId(db: any, salesReturnId: string): Promise<void> {
    await db.run('DELETE FROM sales_return_items WHERE sales_return_id = ?', [salesReturnId]);
  }

  async deleteSalesReturn(db: any, id: string): Promise<void> {
    await db.run('DELETE FROM sales_returns WHERE id = ?', [id]);
  }
}
export const salesReturnRepository = new SalesReturnRepository();
