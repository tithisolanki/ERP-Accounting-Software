import { getDb } from '../db/index';
import { Payment, Receipt } from '../types/Voucher';

type CashflowType = 'payments' | 'receipts';
type CashflowRecord = Payment | Receipt;

function createCashflowRepository(table: CashflowType) {
  return {
    async findAll(companyId: string): Promise<CashflowRecord[]> {
      const db = await getDb();
      return db.all(`
        SELECT c.*, acc.name as account_name
        FROM ${table} c
        JOIN accounts acc ON c.account_id = acc.id
        WHERE c.company_id = ?
        ORDER BY c.date DESC, c.updated_at DESC
      `, [companyId]);
    },

    async findById(companyId: string, id: string): Promise<CashflowRecord | null> {
      const db = await getDb();
      const row = await db.get(
        `SELECT * FROM ${table} WHERE id = ? AND company_id = ?`,
        [id, companyId]
      );
      return row || null;
    },

    async create(db: any, record: CashflowRecord): Promise<void> {
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO ${table} (id, company_id, account_id, amount, date, payment_mode, reference_number, notes, is_dirty, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [record.id, record.company_id, record.account_id, record.amount, record.date,
         record.payment_mode, record.reference_number || null, record.notes || null, now]
      );
    },

    async delete(db: any, id: string): Promise<void> {
      await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
    }
  };
}

export const paymentRepository = createCashflowRepository('payments');
export const receiptRepository = createCashflowRepository('receipts');
