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

  /**
   * Bills (sales or purchases) still owing against one account, with what's already been allocated.
   * excludeLineIds: receipt/payment row ids whose own allocations should NOT count against the
   * balance - pass the voucher currently being edited's own line ids, since its old rows (and their
   * allocation rows) are deleted and recreated on save. Without this, a bill this same voucher already
   * fully settled would simply vanish from the picker when re-opening it to edit.
   */
  async getOutstandingBills(companyId: string, accountId: string, excludeLineIds: string[] = []): Promise<any[]> {
    const db = await getDb();
    const excludeClause = excludeLineIds.length ? `AND ra.receipt_id NOT IN (${excludeLineIds.map(() => '?').join(',')})` : '';
    const excludeClausePa = excludeLineIds.length ? `AND pa.payment_id NOT IN (${excludeLineIds.map(() => '?').join(',')})` : '';

    const sales = await db.all(
      `SELECT s.id AS billId, 'sale' AS billType, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount,
              COALESCE(SUM(ra.amount_applied), 0) + COALESCE(SUM(ra.discount_amount), 0) AS allocated,
              s.total_amount - COALESCE(SUM(ra.amount_applied), 0) - COALESCE(SUM(ra.discount_amount), 0) AS balanceDue
       FROM sales s
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id ${excludeClause}
       WHERE s.company_id = ? AND s.customer_id = ?
       GROUP BY s.id
       HAVING balanceDue > 0.005
       ORDER BY s.date`,
      [...excludeLineIds, companyId, accountId]
    );
    const purchases = await db.all(
      `SELECT p.id AS billId, 'purchase' AS billType, p.purchase_number AS billNumber, p.date,
              p.total_amount AS totalAmount,
              COALESCE(SUM(pa.amount_applied), 0) + COALESCE(SUM(pa.discount_amount), 0) AS allocated,
              p.total_amount - COALESCE(SUM(pa.amount_applied), 0) - COALESCE(SUM(pa.discount_amount), 0) AS balanceDue
       FROM purchases p
       LEFT JOIN payment_allocations pa ON pa.purchase_id = p.id ${excludeClausePa}
       WHERE p.company_id = ? AND p.supplier_id = ?
       GROUP BY p.id
       HAVING balanceDue > 0.005
       ORDER BY p.date`,
      [...excludeLineIds, companyId, accountId]
    );
    return [...sales, ...purchases].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  /**
   * Outstanding bills across several accounts at once (for the Outstanding & Ageing report),
   * with each bill's account name/broker/credit_days attached for grouping and ageing.
   * "asOfDate" limits which bills are considered; "paymentUpto" limits which receipts/payments
   * count against them — matching AC_PLUS's "Outstanding as on Date" + "Payment Including upto Date".
   */
  async getOutstandingBillsForAccounts(companyId: string, accountIds: string[], asOfDate: string, paymentUpto: string): Promise<any[]> {
    const db = await getDb();
    const placeholders = accountIds.map(() => '?').join(',');

    const sales = await db.all(
      `SELECT s.id AS billId, 'sale' AS billType, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount, a.id AS accountId, a.name AS accountName,
              COALESCE(NULLIF(s.broker_name, ''), a.broker) AS broker, s.credit_days,
              s.total_amount - COALESCE(SUM(CASE WHEN rcpt.date <= ? THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0) AS balanceDue
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id
       LEFT JOIN receipts rcpt ON rcpt.id = ra.receipt_id
       WHERE s.company_id = ? AND s.customer_id IN (${placeholders}) AND s.date <= ?
       GROUP BY s.id
       HAVING balanceDue > 0.005
       ORDER BY s.date`,
      [paymentUpto, companyId, ...accountIds, asOfDate]
    );
    const purchases = await db.all(
      `SELECT p.id AS billId, 'purchase' AS billType, p.purchase_number AS billNumber, p.date,
              p.total_amount AS totalAmount, a.id AS accountId, a.name AS accountName,
              COALESCE(NULLIF(p.broker_name, ''), a.broker) AS broker, p.credit_days,
              p.total_amount - COALESCE(SUM(CASE WHEN pmt.date <= ? THEN pa.amount_applied + pa.discount_amount ELSE 0 END), 0) AS balanceDue
       FROM purchases p
       JOIN accounts a ON a.id = p.supplier_id
       LEFT JOIN payment_allocations pa ON pa.purchase_id = p.id
       LEFT JOIN payments pmt ON pmt.id = pa.payment_id
       WHERE p.company_id = ? AND p.supplier_id IN (${placeholders}) AND p.date <= ?
       GROUP BY p.id
       HAVING balanceDue > 0.005
       ORDER BY p.date`,
      [paymentUpto, companyId, ...accountIds, asOfDate]
    );
    return [...sales, ...purchases].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  /**
   * Sales bills (debtors only -- R19's AC_PLUS screen is confirmed Debtors-Reports-only, no
   * Creditors side) with each bill's payments split by whether they landed before or on/after
   * that BILL's own due date (bill date + its own credit_days, varies bill to bill), for the
   * Overdue Interest report's "Include Payment before due date" toggle.
   */
  async getOverdueBillsWithPaymentSplit(companyId: string, accountIds: string[], reportDate: string, periodStart: string, periodEnd: string): Promise<any[]> {
    const db = await getDb();
    const placeholders = accountIds.map(() => '?').join(',');

    return db.all(
      `SELECT s.id AS billId, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount, a.id AS accountId, a.name AS accountName,
              COALESCE(NULLIF(s.broker_name, ''), a.broker) AS broker, s.credit_days,
              date(s.date, '+' || s.credit_days || ' days') AS dueDate,
              COALESCE(SUM(CASE WHEN rcpt.date BETWEEN ? AND ? AND rcpt.date < date(s.date, '+' || s.credit_days || ' days') THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0) AS paidBeforeDue,
              COALESCE(SUM(CASE WHEN rcpt.date BETWEEN ? AND ? AND rcpt.date >= date(s.date, '+' || s.credit_days || ' days') THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0) AS paidOnOrAfterDue
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id
       LEFT JOIN receipts rcpt ON rcpt.id = ra.receipt_id
       WHERE s.company_id = ? AND s.customer_id IN (${placeholders}) AND s.date <= ?
       GROUP BY s.id
       ORDER BY s.date`,
      [periodStart, periodEnd, periodStart, periodEnd, companyId, ...accountIds, reportDate]
    );
  }

  /** Previously saved bill allocations for a set of receipt/payment row ids, keyed by that row's own id. */
  async getAllocationsForLines(companyId: string, kind: 'receipt' | 'payment', lineIds: string[]): Promise<{ lineId: string; billId: string; amount: number; discount: number }[]> {
    if (lineIds.length === 0) return [];
    const db = await getDb();
    const placeholders = lineIds.map(() => '?').join(',');
    if (kind === 'receipt') {
      return db.all(
        `SELECT receipt_id AS lineId, sale_id AS billId, amount_applied AS amount, discount_amount AS discount
         FROM receipt_allocations WHERE company_id = ? AND receipt_id IN (${placeholders})`,
        [companyId, ...lineIds]
      );
    }
    return db.all(
      `SELECT payment_id AS lineId, purchase_id AS billId, amount_applied AS amount, discount_amount AS discount
       FROM payment_allocations WHERE company_id = ? AND payment_id IN (${placeholders})`,
      [companyId, ...lineIds]
    );
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
