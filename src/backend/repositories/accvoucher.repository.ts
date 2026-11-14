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
   * A bill's balance is also reduced by any Allocation Entry (R20) rows against it -- see
   * allocationEntryJoin() below. options.billType/includeAllEntries/excludeAllocationEntryIds serve
   * R20's own bill-picker (Allocation Entry only ever touches one side: sale bills for a debtor
   * entry, purchase bills for a creditor entry; "Include All Entries" needs settled bills too).
   */
  async getOutstandingBills(
    companyId: string, accountId: string, excludeLineIds: string[] = [],
    options: { billType?: 'sale' | 'purchase'; includeAllEntries?: boolean; excludeAllocationEntryIds?: string[] } = {}
  ): Promise<any[]> {
    const db = await getDb();
    const { billType, includeAllEntries } = options;
    const excludeAllocationEntryIds = options.excludeAllocationEntryIds || [];
    const excludeClause = excludeLineIds.length ? `AND ra.receipt_id NOT IN (${excludeLineIds.map(() => '?').join(',')})` : '';
    const excludeClausePa = excludeLineIds.length ? `AND pa.payment_id NOT IN (${excludeLineIds.map(() => '?').join(',')})` : '';
    const excludeAllocClause = excludeAllocationEntryIds.length
      ? `AND allocation_entry_id NOT IN (${excludeAllocationEntryIds.map(() => '?').join(',')})` : '';
    const havingClause = includeAllEntries ? 'HAVING 1 = 1' : 'HAVING balanceDue > 0.005';

    const sales = billType === 'purchase' ? [] : await db.all(
      `SELECT s.id AS billId, 'sale' AS billType, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount,
              COALESCE(SUM(ra.amount_applied), 0) + COALESCE(SUM(ra.discount_amount), 0) + COALESCE(MAX(aeb.applied), 0) + COALESCE(MAX(aeb.discount), 0) AS allocated,
              s.total_amount - COALESCE(SUM(ra.amount_applied), 0) - COALESCE(SUM(ra.discount_amount), 0) - COALESCE(MAX(aeb.applied), 0) - COALESCE(MAX(aeb.discount), 0) AS balanceDue
       FROM sales s
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id ${excludeClause}
       LEFT JOIN (
         SELECT bill_id, SUM(amount_applied) AS applied, SUM(discount_amount) AS discount
         FROM allocation_entry_bills WHERE bill_type = 'sale' ${excludeAllocClause} GROUP BY bill_id
       ) aeb ON aeb.bill_id = s.id
       WHERE s.company_id = ? AND s.customer_id = ?
       GROUP BY s.id
       ${havingClause}
       ORDER BY s.date`,
      [...excludeLineIds, ...excludeAllocationEntryIds, companyId, accountId]
    );
    const purchases = billType === 'sale' ? [] : await db.all(
      `SELECT p.id AS billId, 'purchase' AS billType, p.purchase_number AS billNumber, p.date,
              p.total_amount AS totalAmount,
              COALESCE(SUM(pa.amount_applied), 0) + COALESCE(SUM(pa.discount_amount), 0) + COALESCE(MAX(aeb.applied), 0) + COALESCE(MAX(aeb.discount), 0) AS allocated,
              p.total_amount - COALESCE(SUM(pa.amount_applied), 0) - COALESCE(SUM(pa.discount_amount), 0) - COALESCE(MAX(aeb.applied), 0) - COALESCE(MAX(aeb.discount), 0) AS balanceDue
       FROM purchases p
       LEFT JOIN payment_allocations pa ON pa.purchase_id = p.id ${excludeClausePa}
       LEFT JOIN (
         SELECT bill_id, SUM(amount_applied) AS applied, SUM(discount_amount) AS discount
         FROM allocation_entry_bills WHERE bill_type = 'purchase' ${excludeAllocClause} GROUP BY bill_id
       ) aeb ON aeb.bill_id = p.id
       WHERE p.company_id = ? AND p.supplier_id = ?
       GROUP BY p.id
       ${havingClause}
       ORDER BY p.date`,
      [...excludeLineIds, ...excludeAllocationEntryIds, companyId, accountId]
    );
    return [...sales, ...purchases].sort((a, b) => (a.date > b.date ? 1 : -1));
  }

  /**
   * Debtors Outstanding Ledger (R6, debtors only -- AC_PLUS's ADEBOUTLEDGER form; the mirrored
   * ACREOUTLEDGER "Creditors Outstanding Ledger" is a separate, unbuilt screen). companyId null
   * + an admin caller means "Include All Companies". state/city/broker narrow by the account's
   * own fields (falling back the same way the bill-level broker already does); includingPaidBills
   * drops the normal "only unpaid" filter.
   */
  async getOutstandingBillsForAccounts(
    companyId: string | null, accountIds: string[], asOfDate: string, paymentUpto: string,
    filters: { state?: string; city?: string; broker?: string; includingPaidBills?: boolean } = {}
  ): Promise<any[]> {
    const db = await getDb();
    const placeholders = accountIds.map(() => '?').join(',');
    const { state, city, broker, includingPaidBills } = filters;

    return db.all(
      `SELECT s.id AS billId, 'sale' AS billType, s.invoice_number AS billNumber, s.date,
              s.total_amount AS totalAmount, a.id AS accountId, a.name AS accountName,
              COALESCE(NULLIF(s.broker_name, ''), a.broker) AS broker, s.credit_days,
              s.total_amount - COALESCE(SUM(CASE WHEN rcpt.date <= ? THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0)
                - COALESCE(MAX(aeb.applied), 0) - COALESCE(MAX(aeb.discount), 0) AS balanceDue
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id
       LEFT JOIN receipts rcpt ON rcpt.id = ra.receipt_id
       LEFT JOIN (
         SELECT aeb.bill_id, SUM(aeb.amount_applied) AS applied, SUM(aeb.discount_amount) AS discount
         FROM allocation_entry_bills aeb
         JOIN allocation_entries ae ON ae.id = aeb.allocation_entry_id
         WHERE aeb.bill_type = 'sale' AND ae.date <= ? GROUP BY aeb.bill_id
       ) aeb ON aeb.bill_id = s.id
       WHERE (? IS NULL OR s.company_id = ?) AND s.customer_id IN (${placeholders}) AND s.date <= ?
         AND (? IS NULL OR LOWER(TRIM(a.state)) = LOWER(TRIM(?))) AND (? IS NULL OR LOWER(TRIM(a.city)) = LOWER(TRIM(?)))
         AND (? IS NULL OR LOWER(TRIM(COALESCE(NULLIF(s.broker_name, ''), a.broker))) = LOWER(TRIM(?)))
       GROUP BY s.id
       HAVING ? = 1 OR balanceDue > 0.005
       ORDER BY s.date`,
      [
        paymentUpto, paymentUpto, companyId, companyId, ...accountIds, asOfDate,
        state || null, state || null, city || null, city || null, broker || null, broker || null,
        includingPaidBills ? 1 : 0
      ]
    );
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
              date(s.date, COALESCE(s.credit_days, 0) || ' days') AS dueDate,
              COALESCE(SUM(CASE WHEN rcpt.date BETWEEN ? AND ? AND rcpt.date < date(s.date, COALESCE(s.credit_days, 0) || ' days') THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0)
                + COALESCE(MAX(aeb.beforeDue), 0) AS paidBeforeDue,
              COALESCE(SUM(CASE WHEN rcpt.date BETWEEN ? AND ? AND rcpt.date >= date(s.date, COALESCE(s.credit_days, 0) || ' days') THEN ra.amount_applied + ra.discount_amount ELSE 0 END), 0)
                + COALESCE(MAX(aeb.onOrAfterDue), 0) AS paidOnOrAfterDue
       FROM sales s
       JOIN accounts a ON a.id = s.customer_id
       LEFT JOIN receipt_allocations ra ON ra.sale_id = s.id
       LEFT JOIN receipts rcpt ON rcpt.id = ra.receipt_id
       LEFT JOIN (
         SELECT aeb.bill_id,
                SUM(CASE WHEN ae.date BETWEEN ? AND ? AND ae.date < date(s2.date, COALESCE(s2.credit_days, 0) || ' days') THEN aeb.amount_applied + aeb.discount_amount ELSE 0 END) AS beforeDue,
                SUM(CASE WHEN ae.date BETWEEN ? AND ? AND ae.date >= date(s2.date, COALESCE(s2.credit_days, 0) || ' days') THEN aeb.amount_applied + aeb.discount_amount ELSE 0 END) AS onOrAfterDue
         FROM allocation_entry_bills aeb
         JOIN allocation_entries ae ON ae.id = aeb.allocation_entry_id
         JOIN sales s2 ON s2.id = aeb.bill_id
         WHERE aeb.bill_type = 'sale'
         GROUP BY aeb.bill_id
       ) aeb ON aeb.bill_id = s.id
       WHERE s.company_id = ? AND s.customer_id IN (${placeholders}) AND s.date <= ?
       GROUP BY s.id
       ORDER BY s.date`,
      [periodStart, periodEnd, periodStart, periodEnd, periodStart, periodEnd, periodStart, periodEnd, companyId, ...accountIds, reportDate]
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

  // ---- Allocation Entry (R20) ----

  async findAllocationEntryByNo(companyId: string, side: 'debtor' | 'creditor', entryNo: string): Promise<{ id: string } | undefined> {
    const db = await getDb();
    return db.get(
      `SELECT id FROM allocation_entries WHERE company_id = ? AND side = ? AND entry_no = ?`,
      [companyId, side, entryNo]
    );
  }

  async deleteAllocationEntryByNo(db: any, companyId: string, side: 'debtor' | 'creditor', entryNo: string): Promise<void> {
    await db.run(
      `DELETE FROM allocation_entries WHERE company_id = ? AND side = ? AND entry_no = ?`,
      [companyId, side, entryNo]
    );
  }

  async createAllocationEntry(
    db: any,
    entry: {
      id: string; companyId: string; side: 'debtor' | 'creditor'; entryNo: string; date: string;
      accountId: string; entryType: 'on_account' | 'kasar'; amount: number; kasarAccountId: string | null;
      notes: string; now: string;
    }
  ): Promise<void> {
    await db.run(
      `INSERT INTO allocation_entries (id, company_id, side, entry_no, date, account_id, entry_type, amount, kasar_account_id, notes, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [entry.id, entry.companyId, entry.side, entry.entryNo, entry.date, entry.accountId, entry.entryType, entry.amount, entry.kasarAccountId, entry.notes, entry.now]
    );
  }

  async createAllocationEntryBill(
    db: any,
    bill: { id: string; companyId: string; allocationEntryId: string; billId: string; billType: 'sale' | 'purchase'; amountApplied: number; discountAmount: number; now: string }
  ): Promise<void> {
    await db.run(
      `INSERT INTO allocation_entry_bills (id, company_id, allocation_entry_id, bill_id, bill_type, amount_applied, discount_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [bill.id, bill.companyId, bill.allocationEntryId, bill.billId, bill.billType, bill.amountApplied, bill.discountAmount, bill.now]
    );
  }

  async getAllocationEntries(companyId: string, side: 'debtor' | 'creditor'): Promise<any[]> {
    const db = await getDb();
    return db.all(
      `SELECT ae.*, a.name AS accountName
       FROM allocation_entries ae
       JOIN accounts a ON a.id = ae.account_id
       WHERE ae.company_id = ? AND ae.side = ?
       ORDER BY ae.date DESC, ae.updated_at DESC`,
      [companyId, side]
    );
  }

  /** One allocation entry with its bill-wise lines, for re-opening to edit or for Print Allocation. */
  async getAllocationEntryDetail(companyId: string, side: 'debtor' | 'creditor', entryNo: string): Promise<{ header: any; bills: any[] } | null> {
    const db = await getDb();
    const header = await db.get(
      `SELECT ae.*, a.name AS accountName, ka.name AS kasarAccountName
       FROM allocation_entries ae
       JOIN accounts a ON a.id = ae.account_id
       LEFT JOIN accounts ka ON ka.id = ae.kasar_account_id
       WHERE ae.company_id = ? AND ae.side = ? AND ae.entry_no = ?`,
      [companyId, side, entryNo]
    );
    if (!header) return null;
    const bills = await db.all(
      `SELECT aeb.bill_id AS billId, aeb.bill_type AS billType, aeb.amount_applied AS amountApplied, aeb.discount_amount AS discountAmount,
              CASE WHEN aeb.bill_type = 'sale' THEN s.invoice_number ELSE p.purchase_number END AS billNumber,
              CASE WHEN aeb.bill_type = 'sale' THEN s.date ELSE p.date END AS billDate,
              CASE WHEN aeb.bill_type = 'sale' THEN s.total_amount ELSE p.total_amount END AS totalAmount
       FROM allocation_entry_bills aeb
       LEFT JOIN sales s ON aeb.bill_type = 'sale' AND s.id = aeb.bill_id
       LEFT JOIN purchases p ON aeb.bill_type = 'purchase' AND p.id = aeb.bill_id
       WHERE aeb.allocation_entry_id = ?`,
      [header.id]
    );
    return { header, bills };
  }
}
export const accVoucherRepository = new AccVoucherRepository();
