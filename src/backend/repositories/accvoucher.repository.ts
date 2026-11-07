import { getDb } from '../db/index';

export class AccVoucherRepository {
  async findRawVouchers(companyId: string, tableName: 'payments' | 'receipts'): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT p.*, acc.name as account_name 
      FROM ${tableName} p
      JOIN accounts acc ON p.account_id = acc.id
      WHERE p.company_id = ? 
      ORDER BY p.date DESC, p.updated_at DESC
    `, [companyId]);
  }

  async countVouchersByNo(db: any, companyId: string, tableName: 'payments' | 'receipts', likePattern: string): Promise<number> {
    const existing = await db.get(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE company_id = ? AND notes LIKE ?`,
      [companyId, likePattern]
    );
    return existing ? existing.count : 0;
  }

  async deleteVouchersByNo(db: any, companyId: string, tableName: 'payments' | 'receipts', likePattern: string): Promise<void> {
    await db.run(
      `DELETE FROM ${tableName} WHERE company_id = ? AND notes LIKE ?`,
      [companyId, likePattern]
    );
  }

  async createVoucherLine(
    db: any,
    tableName: 'payments' | 'receipts',
    line: {
      id: string;
      companyId: string;
      accountId: string;
      amount: number;
      date: string;
      referenceNumber: string | null;
      notes: string;
      now: string;
    }
  ): Promise<void> {
    await db.run(
      `INSERT INTO ${tableName} (id, company_id, account_id, amount, date, payment_mode, reference_number, notes, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [line.id, line.companyId, line.accountId, line.amount, line.date, 'Cheque', line.referenceNumber, line.notes, line.now]
    );
  }

  async findRawJournalVouchers(companyId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT jv.*, acc.name as account_name 
      FROM journal_vouchers jv
      JOIN accounts acc ON jv.account_id = acc.id
      WHERE jv.company_id = ? 
      ORDER BY jv.date DESC, jv.updated_at DESC
    `, [companyId]);
  }

  async countJournalVouchersByNo(db: any, companyId: string, voucherNo: string): Promise<number> {
    const existing = await db.get(
      `SELECT COUNT(*) as count FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?`,
      [companyId, voucherNo]
    );
    return existing ? existing.count : 0;
  }

  async deleteJournalVouchersByNo(db: any, companyId: string, voucherNo: string): Promise<void> {
    await db.run(
      `DELETE FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?`,
      [companyId, voucherNo]
    );
  }

  async createJournalVoucherLine(
    db: any,
    line: {
      id: string;
      companyId: string;
      voucherNo: string;
      date: string;
      voucherType: string;
      accountId: string;
      debitAmount: number;
      creditAmount: number;
      particulars: string;
      now: string;
    }
  ): Promise<void> {
    await db.run(
      `INSERT INTO journal_vouchers (id, company_id, voucher_no, date, voucher_type, account_id, debit_amount, credit_amount, particulars, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [line.id, line.companyId, line.voucherNo, line.date, line.voucherType, line.accountId, line.debitAmount, line.creditAmount, line.particulars, line.now]
    );
  }
}
export const accVoucherRepository = new AccVoucherRepository();
