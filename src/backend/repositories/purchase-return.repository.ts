import { getDb } from '../db/index';
import { PurchaseReturn, PurchaseReturnItem } from '../types/PurchaseReturn';

export class PurchaseReturnRepository {
  async findAll(companyId: string): Promise<PurchaseReturn[]> {
    const db = await getDb();
    return db.all(`
      SELECT pr.*, pt.name as supplier_name
      FROM purchase_returns pr
      JOIN accounts pt ON pr.supplier_id = pt.id
      WHERE pr.company_id = ?
      ORDER BY pr.date DESC, pr.updated_at DESC
    `, [companyId]);
  }

  async findItemsByPurchaseReturnId(purchaseReturnId: string): Promise<PurchaseReturnItem[]> {
    return this.findItems('pri.purchase_return_id = ?', purchaseReturnId);
  }

  async findItemsByCompany(companyId: string): Promise<PurchaseReturnItem[]> {
    return this.findItems('pri.company_id = ?', companyId);
  }

  private async findItems(where: string, param: string): Promise<PurchaseReturnItem[]> {
    const db = await getDb();
    return db.all(`
      SELECT pri.*,
             c.name as category_name,
             q.name as quality_name,
             d.name as description_name,
             h.hsn_code
      FROM purchase_return_items pri
      JOIN categories c ON pri.category_id = c.id
      JOIN qualities q ON pri.quality_id = q.id
      JOIN descriptions d ON pri.description_id = d.id
      JOIN hsn_codes h ON pri.hsn_id = h.id
      WHERE ${where}
    `, [param]);
  }

  /** Highest number in one financial year (all years when none is given). */
  async findMaxReturnNumber(companyId: string, financialYear?: string): Promise<number> {
    const db = await getDb();
    const row = await db.get('SELECT MAX(return_number) as maxNo FROM purchase_returns WHERE company_id = ? AND (? IS NULL OR financial_year = ?)', [companyId, financialYear || null, financialYear || null]);
    return Number(row?.maxNo || 0);
  }

  async findPurchaseReturnByNumber(companyId: string, number: any, financialYear?: string): Promise<PurchaseReturn | null> {
    const db = await getDb();
    const purchaseReturn = await db.get(
      `SELECT pr.*, pt.name as supplier_name
       FROM purchase_returns pr
       JOIN accounts pt ON pr.supplier_id = pt.id
       WHERE pr.company_id = ? AND pr.return_number = ? AND (? IS NULL OR pr.financial_year = ?)
       ORDER BY pr.date DESC`,
      [companyId, number, financialYear || null, financialYear || null]
    );
    return purchaseReturn || null;
  }

  async findIdByNumber(db: any, companyId: string, financialYear: string, number: number): Promise<string | null> {
    const row = await db.get(
      'SELECT id FROM purchase_returns WHERE company_id = ? AND financial_year = ? AND return_number = ?',
      [companyId, financialYear, number]
    );
    return row ? row.id : null;
  }

  /** Pass `db` to read inside an open transaction (see withTransaction). */
  async findPurchaseReturnById(companyId: string, id: string, db?: any): Promise<PurchaseReturn | null> {
    db = db || await getDb();
    const purchaseReturn = await db.get(
      'SELECT * FROM purchase_returns WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    return purchaseReturn || null;
  }

  async createHeader(db: any, purchaseReturn: PurchaseReturn): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO purchase_returns (
        id, company_id, return_number, date, supplier_id, financial_year,
        against_purchase_id, against_bill_date, return_type,
        taxable_value, gst_amount, total_amount, is_dirty, updated_at,
        broker_name, challan_number, challan_date, lr_number, lr_date, remark
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
      [
        purchaseReturn.id, purchaseReturn.company_id, purchaseReturn.return_number, purchaseReturn.date, purchaseReturn.supplier_id, purchaseReturn.financial_year,
        purchaseReturn.against_purchase_id, purchaseReturn.against_bill_date, purchaseReturn.return_type,
        purchaseReturn.taxable_value, purchaseReturn.gst_amount, purchaseReturn.total_amount, now,
        purchaseReturn.broker_name || null, purchaseReturn.challan_number || null, purchaseReturn.challan_date || null,
        purchaseReturn.lr_number || null, purchaseReturn.lr_date || null, purchaseReturn.remark || null
      ]
    );
  }

  async updateHeader(db: any, id: string, purchaseReturn: PurchaseReturn): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `UPDATE purchase_returns SET
        return_number = ?, date = ?, supplier_id = ?, financial_year = ?,
        against_purchase_id = ?, against_bill_date = ?, return_type = ?,
        taxable_value = ?, gst_amount = ?, total_amount = ?, is_dirty = 1, updated_at = ?,
        broker_name = ?, challan_number = ?, challan_date = ?, lr_number = ?, lr_date = ?, remark = ?
       WHERE id = ?`,
      [
        purchaseReturn.return_number, purchaseReturn.date, purchaseReturn.supplier_id, purchaseReturn.financial_year,
        purchaseReturn.against_purchase_id, purchaseReturn.against_bill_date, purchaseReturn.return_type,
        purchaseReturn.taxable_value, purchaseReturn.gst_amount, purchaseReturn.total_amount, now,
        purchaseReturn.broker_name || null, purchaseReturn.challan_number || null, purchaseReturn.challan_date || null,
        purchaseReturn.lr_number || null, purchaseReturn.lr_date || null, purchaseReturn.remark || null,
        id
      ]
    );
  }

  async createItem(db: any, item: PurchaseReturnItem): Promise<void> {
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO purchase_return_items (id, purchase_return_id, company_id, category_id, quality_id, description_id, hsn_id, pcs, meters, rate, gst_percentage, taxable_value, gst_amount, total_amount, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [item.id, item.purchase_return_id, item.company_id, item.category_id, item.quality_id, item.description_id, item.hsn_id, item.pcs || 0, item.meters, item.rate, item.gst_percentage, item.taxable_value, item.gst_amount, item.total_amount, now]
    );
  }

  async deleteItemsByPurchaseReturnId(db: any, purchaseReturnId: string): Promise<void> {
    await db.run('DELETE FROM purchase_return_items WHERE purchase_return_id = ?', [purchaseReturnId]);
  }

  async deletePurchaseReturn(db: any, id: string): Promise<void> {
    await db.run('DELETE FROM purchase_returns WHERE id = ?', [id]);
  }
}
export const purchaseReturnRepository = new PurchaseReturnRepository();
