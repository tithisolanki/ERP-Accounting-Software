/**
 * One-off cleanup: the AC_PLUS -> TexFin migration that ran before this session's own
 * receipts/payments migration had already copied every Bank Payment/Receipt and Cash
 * Payment/Receipt from AGTRA into journal_vouchers (tagged with a voucher_type label, not a
 * real "Journal Voucher" entry) -- a real, fully-posted double-entry pair, not a placeholder.
 * This session's receipts/payments migration (see migrate-ac-plus-receipts-payments.ts) added
 * the SAME transactions properly into receipts/payments (+ bill-wise allocations), unaware the
 * data already existed here. Every customer/supplier/bank/expense account touched by a receipt
 * or payment is now double-counted in any net-balance calculation (Trial Balance, Account
 * Ledger, Outstanding Ledger, Print Allocation).
 *
 * This deletes the redundant journal_vouchers rows -- ONLY voucher_type IN ('Bank Payment',
 * 'Bank Receipt', 'Cash Payment', 'Cash Receipt') for KCT01 specifically (the only company this
 * session added receipts/payments for -- deleting these for any other company would remove their
 * only record of that activity, since nothing replaced it there).
 *
 * Run modes:
 *   ts-node -P tsconfig.electron.json scripts/migrations/dedupe-journal-vouchers.ts              (dry run)
 *   ts-node -P tsconfig.electron.json scripts/migrations/dedupe-journal-vouchers.ts --apply       (writes for real)
 */
import path from 'path';
process.env.DB_PATH = path.resolve(__dirname, '../../ACPLUS-DATA.sqlite');
import { getDb } from '../../src/backend/db/index';

const APPLY = process.argv.includes('--apply');
const DUPLICATE_TYPES = ['Bank Payment', 'Bank Receipt', 'Cash Payment', 'Cash Receipt'];

async function main() {
  const db = await getDb();
  const company = await db.get(`SELECT id FROM companies WHERE code = 'KCT01'`);
  if (!company) throw new Error("Company 'KCT01' not found.");

  const placeholders = DUPLICATE_TYPES.map(() => '?').join(',');
  const before = await db.all(
    `SELECT voucher_type, COUNT(*) c, COUNT(DISTINCT voucher_no) vc, SUM(debit_amount) d, SUM(credit_amount) cr
     FROM journal_vouchers WHERE company_id = ? AND voucher_type IN (${placeholders}) GROUP BY voucher_type`,
    [company.id, ...DUPLICATE_TYPES]
  );
  console.log('Rows to remove (duplicated by this session\'s receipts/payments migration):');
  console.table(before);
  const totalRows = before.reduce((s, r: any) => s + r.c, 0);
  const totalDr = before.reduce((s, r: any) => s + r.d, 0);
  console.log(`Total: ${totalRows} rows, ${totalDr.toFixed(2)} in debit amount removed from the ledger (now represented by receipts/payments instead).`);

  const remainingCount = await db.get(`SELECT COUNT(*) c FROM journal_vouchers WHERE company_id = ?`, [company.id]);
  console.log(`journal_vouchers total for KCT01 before: ${remainingCount.c}, after would be: ${remainingCount.c - totalRows}`);

  if (!APPLY) {
    console.log('\nDRY RUN -- nothing deleted. Re-run with --apply to delete for real.');
    return;
  }

  const result = await db.run(
    `DELETE FROM journal_vouchers WHERE company_id = ? AND voucher_type IN (${placeholders})`,
    [company.id, ...DUPLICATE_TYPES]
  );
  console.log(`Deleted ${(result as any).changes ?? totalRows} rows.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
