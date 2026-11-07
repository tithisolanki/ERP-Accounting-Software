import { getDb } from '../db/index';
import { Purchase, PurchaseItem } from '../types/Purchase';

export class PurchaseRepository {
  async findAll(companyId: string): Promise<Purchase[]> {
    const db = await getDb();
    return db.all(`
      SELECT p.*, pt.name as supplier_name 
      FROM purchases p
      JOIN accounts pt ON p.supplier_id = pt.id
      WHERE p.company_id = ? 
      ORDER BY p.date DESC, p.updated_at DESC
    `, [companyId]);
  }

  async findItemsByPurchaseId(purchaseId: string): Promise<PurchaseItem[]> {
    return this.findItems('pi.purchase_id = ?', purchaseId);
  }

  async findItemsByCompany(companyId: string): Promise<PurchaseItem[]> {
    return this.findItems('pi.company_id = ?', companyId);
  }

  private async findItems(where: string, param: string): Promise<PurchaseItem[]> {
    const db = await getDb();
    return db.all(`
      SELECT pi.*, 
             c.name as category_name,
             q.name as quality_name,
             d.name as description_name,
             h.hsn_code,
             -- compatibility mapping
             q.name as product_name,
             d.name as description,
             pi.meters as quantity
      FROM purchase_items pi
      JOIN categories c ON pi.category_id = c.id
      JOIN qualities q ON pi.quality_id = q.id
      JOIN descriptions d ON pi.description_id = d.id
      JOIN hsn_codes h ON pi.hsn_id = h.id
      WHERE ${where}
    `, [param]);
  }

  async findMaxEntryNo(companyId: string): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT MAX(entry_no) as maxNo FROM purchases WHERE company_id = ?', [companyId]);
    return Number(row?.maxNo || 0);
  }

  async findPurchaseByNumber(companyId: string, number: any): Promise<Purchase | null> {
    const db = await getDb();
    const purchase = await db.get(
      `SELECT p.*, pt.name as supplier_name 
       FROM purchases p 
       JOIN accounts pt ON p.supplier_id = pt.id 
       WHERE p.company_id = ? AND p.entry_no = ?`,
      [companyId, number]
    );
    return purchase || null;
  }

  async findIdByNumber(db: any, companyId: string, financialYear: string, number: number): Promise<string | null> {
    const row = await db.get(
      'SELECT id FROM purchases WHERE company_id = ? AND financial_year = ? AND entry_no = ?',
      [companyId, financialYear, number]
    );
    return row ? row.id : null;
  }

  /** Pass `db` to read inside an open transaction (see withTransaction). */
  async findPurchaseById(companyId: string, id: string, db?: any): Promise<Purchase | null> {
    db = db || await getDb();
    const purchase = await db.get(
      'SELECT * FROM purchases WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    return purchase || null;
  }

  async createHeader(db: any, purchase: Purchase): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO purchases (
        id, company_id, purchase_number, date, supplier_id, financial_year, 
        taxable_value, gst_amount, total_amount, is_dirty, updated_at,
        entry_no, credit_days, broker_name, challan_number, challan_date,
        purchase_type, lr_number, lr_date, transport, remark, debit_account,
        add_value, less_value, less_add, rounded_off, lot_number
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchase.id, purchase.company_id, purchase.purchase_number, purchase.date, purchase.supplier_id, purchase.financial_year, 
        purchase.taxable_value, purchase.gst_amount, purchase.total_amount, now,
        purchase.entry_no || null, purchase.credit_days || 0, purchase.broker_name || null, purchase.challan_number || null, purchase.challan_date || null,
        purchase.purchase_type || null, purchase.lr_number || null, purchase.lr_date || null, purchase.transport || null, purchase.remark || null, purchase.debit_account || null,
        purchase.add_value || 0, purchase.less_value || 0, purchase.less_add || 0, purchase.rounded_off || 0, purchase.lot_number || null
      ]
    );
  }

  async updateHeader(db: any, id: string, purchase: Purchase): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE purchases SET 
        purchase_number = ?, date = ?, supplier_id = ?, financial_year = ?,
        taxable_value = ?, gst_amount = ?, total_amount = ?, is_dirty = 1, updated_at = ?,
        entry_no = ?, credit_days = ?, broker_name = ?, challan_number = ?, challan_date = ?,
        purchase_type = ?, lr_number = ?, lr_date = ?, transport = ?, remark = ?, debit_account = ?,
        add_value = ?, less_value = ?, less_add = ?, rounded_off = ?, lot_number = ?
       WHERE id = ?`,
      [
        purchase.purchase_number, purchase.date, purchase.supplier_id, purchase.financial_year,
        purchase.taxable_value, purchase.gst_amount, purchase.total_amount, now,
        purchase.entry_no || null, purchase.credit_days || 0, purchase.broker_name || null, purchase.challan_number || null, purchase.challan_date || null,
        purchase.purchase_type || null, purchase.lr_number || null, purchase.lr_date || null, purchase.transport || null, purchase.remark || null, purchase.debit_account || null,
        purchase.add_value || 0, purchase.less_value || 0, purchase.less_add || 0, purchase.rounded_off || 0, purchase.lot_number || null,
        id
      ]
    );
  }

  async createItem(db: any, item: PurchaseItem): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO purchase_items (id, purchase_id, company_id, category_id, quality_id, description_id, hsn_id, lot_number, pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [item.id, item.purchase_id, item.company_id, item.category_id, item.quality_id, item.description_id, item.hsn_id, item.lot_number, item.pcs || 0, item.meters, item.rate, item.gst_percentage, item.taxable_value, item.gst_amount, item.total_amount, now]
    );
  }

  async deleteItemsByPurchaseId(db: any, purchaseId: string): Promise<void> {
    await db.run('DELETE FROM purchase_items WHERE purchase_id = ?', [purchaseId]);
  }

  async deletePurchase(db: any, id: string): Promise<void> {
    await db.run('DELETE FROM purchases WHERE id = ?', [id]);
  }

  async findDistinctDebitAccounts(companyId: string): Promise<string[]> {
    const db = await getDb();
    const rows = await db.all(`
      SELECT DISTINCT debit_account 
      FROM purchases 
      WHERE company_id = ? AND debit_account IS NOT NULL AND debit_account != ''
      ORDER BY debit_account ASC
    `, [companyId]);
    return rows.map((r: any) => r.debit_account);
  }
}
export const purchaseRepository = new PurchaseRepository();
