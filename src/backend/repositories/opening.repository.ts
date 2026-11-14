import { getDb } from '../db/index';
import { Account, StockOpeningBalance } from '../types/Masters';

export class OpeningRepository {
  // ==========================================
  // Account Opening Balances
  // ==========================================
  async findAllAccounts(companyId: string): Promise<Account[]> {
    const db = await getDb();
    return db.all(
      `SELECT id, name, group_name, opening_balance, opening_balance_date, opening_balance_dc 
       FROM accounts 
       WHERE company_id = ? 
       ORDER BY name ASC`,
      [companyId]
    );
  }

  async updateAccountOpening(
    id: string,
    companyId: string,
    balance: number,
    date: string,
    dc: string,
    updatedAt: string
  ): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE accounts 
       SET opening_balance = ?, opening_balance_date = ?, opening_balance_dc = ?, is_dirty = 1, updated_at = ? 
       WHERE id = ? AND company_id = ?`,
      [balance, date, dc, updatedAt, id, companyId]
    );
  }

  async clearAccountOpening(
    id: string,
    companyId: string,
    updatedAt: string
  ): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE accounts 
       SET opening_balance = 0, opening_balance_date = NULL, opening_balance_dc = NULL, is_dirty = 1, updated_at = ? 
       WHERE id = ? AND company_id = ?`,
      [updatedAt, id, companyId]
    );
  }

  // ==========================================
  // Stock Opening Balances
  // ==========================================
  async findAllStock(companyId: string): Promise<StockOpeningBalance[]> {
    const db = await getDb();
    return db.all(
      `SELECT s.*, q.name as quality_name 
       FROM stock_opening_balances s
       JOIN qualities q ON s.quality_id = q.id
       WHERE s.company_id = ? 
       ORDER BY s.date DESC, q.name ASC`,
      [companyId]
    );
  }

  async findStockById(id: string, companyId: string): Promise<StockOpeningBalance | null> {
    const db = await getDb();
    const result = await db.get(
      `SELECT * FROM stock_opening_balances WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    return result || null;
  }

  async createStock(stock: StockOpeningBalance): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO stock_opening_balances (
        id, company_id, date, quality_id, balance_meters, cost_per_meter, stock_type, is_dirty, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        stock.id,
        stock.company_id,
        stock.date,
        stock.quality_id,
        stock.balance_meters,
        stock.cost_per_meter,
        stock.stock_type,
        stock.updated_at
      ]
    );
  }

  async updateStock(
    id: string,
    companyId: string,
    stock: Partial<StockOpeningBalance>
  ): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE stock_opening_balances 
       SET date = ?, quality_id = ?, balance_meters = ?, cost_per_meter = ?, stock_type = ?, is_dirty = 1, updated_at = ?
       WHERE id = ? AND company_id = ?`,
      [
        stock.date,
        stock.quality_id,
        stock.balance_meters,
        stock.cost_per_meter,
        stock.stock_type,
        stock.updated_at,
        id,
        companyId
      ]
    );
  }

  async deleteStock(id: string, companyId: string): Promise<void> {
    const db = await getDb();
    await db.run(
      `DELETE FROM stock_opening_balances WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
  }
}

export const openingRepository = new OpeningRepository();
