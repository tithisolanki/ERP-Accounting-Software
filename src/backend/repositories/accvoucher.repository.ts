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
      paymentMode: string;
      referenceNumber: string | null;
      notes: string;
      now: string;
    }
  ): Promise<void> {
    await db.run(
      `INSERT INTO ${tableName} (id, company_id, account_id, amount, date, payment_mode, reference_number, notes, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [line.id, line.companyId, line.accountId, line.amount, line.date, line.paymentMode, line.referenceNumber, line.notes, line.now]
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

  /** Bills (sales or purchases) still owing against one account, with what's already been allocated. */
  async getOutstandingBills(companyId: string, accountId: string): Promise<any[]> {
    const db = await getDb();
    const sales = await db.all(
      `SELECT s.id AS billId, 'sale' AS billType, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount,
              COALESCE(SUM(ra.amount_applied), 0) + COALESCE(SUM(ra.discount_amount), 0) AS allocated,
              s.total_amount - COALESCE(SUM(ra.amount_applied), 0) - COALESCE(SUM(ra.discount_amount), 0) AS balanceDue
       FROM sales s
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id
       WHERE s.company_id = ? AND s.customer_id = ?
       GROUP BY s.id
       HAVING balanceDue > 0.005
       ORDER BY s.date`,
      [companyId, accountId]
    );
    const purchases = await db.all(
      `SELECT p.id AS billId, 'purchase' AS billType, p.purchase_number AS billNumber, p.date,
              p.total_amount AS totalAmount,
              COALESCE(SUM(pa.amount_applied), 0) + COALESCE(SUM(pa.discount_amount), 0) AS allocated,
              p.total_amount - COALESCE(SUM(pa.amount_applied), 0) - COALESCE(SUM(pa.discount_amount), 0) AS balanceDue
       FROM purchases p
       LEFT JOIN payment_allocations pa ON pa.purchase_id = p.id
       WHERE p.company_id = ? AND p.supplier_id = ?
       GROUP BY p.id
       HAVING balanceDue > 0.005
       ORDER BY p.date`,
      [companyId, accountId]
    );
    return [...sales, ...purchases].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  async createReceiptAllocation(
    db: any,
    alloc: { id: string; companyId: string; receiptId: string; saleId: string; amountApplied: number; discountAmount: number; now: string }
  ): Promise<void> {
    await db.run(
      `INSERT INTO receipt_allocations (id, company_id, receipt_id, sale_id, amount_applied, discount_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alloc.id, alloc.companyId, alloc.receiptId, alloc.saleId, alloc.amountApplied, alloc.discountAmount, alloc.now]
    );
  }

  async createPaymentAllocation(
    db: any,
    alloc: { id: string; companyId: string; paymentId: string; purchaseId: string; amountApplied: number; discountAmount: number; now: string }
  ): Promise<void> {
    await db.run(
      `INSERT INTO payment_allocations (id, company_id, payment_id, purchase_id, amount_applied, discount_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [alloc.id, alloc.companyId, alloc.paymentId, alloc.purchaseId, alloc.amountApplied, alloc.discountAmount, alloc.now]
    );
  }
}
export const accVoucherRepository = new AccVoucherRepository();
