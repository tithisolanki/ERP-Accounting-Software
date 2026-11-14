import { getDb, initDb, closeDb } from '../../src/backend/db';
import { reportsService } from '../../src/backend/services/reports.service';
import { reportsRepository } from '../../src/backend/repositories/reports.repository';
import { salesService } from '../../src/backend/services/sales.service';
import { salesReturnService, OverReturnError } from '../../src/backend/services/sales-return.service';
import { purchaseService } from '../../src/backend/services/purchase.service';
import { purchaseReturnService } from '../../src/backend/services/purchase-return.service';
import { accVoucherService } from '../../src/backend/services/accvoucher.service';
import { accVoucherRepository } from '../../src/backend/repositories/accvoucher.repository';
import { receiptService } from '../../src/backend/services/cashflow.service';
import { companyService } from '../../src/backend/services/masters.service';
import { generateLedgerPdf } from '../../src/backend/services/pdf.service';
import { PDFDocument } from 'pdf-lib';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.join(__dirname, 'test.sqlite');

async function runTests() {
  console.log('----------------------------------------------------');
  console.log('TexFin Backend Automated Integration Verification Test');
  console.log('----------------------------------------------------');

  process.env.DB_PATH = TEST_DB_PATH;

  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch {
    // ignore cleanup errors
  }

  let passed = true;

  try {
    console.log('Test 1: SQLite schema migrations and seeding...');
    await initDb();
    const db = await getDb();

    const company = await db.get('SELECT * FROM companies WHERE code = "KCT01"');
    if (company && company.name === 'K Chandrakant Textiles') {
      console.log('  ✔ Seeding companies: PASS');
    } else {
      console.log('  ❌ Seeding companies: FAIL');
      passed = false;
    }

    const user = await db.get('SELECT * FROM users WHERE username = "companyadmin"');
    if (user && user.role === 'ADMIN') {
      const match = await bcrypt.compare('company123', user.password_hash);
      if (match) {
        console.log('  ✔ Password hashing & seeding: PASS');
      } else {
        console.log('  ❌ Password validation: FAIL');
        passed = false;
      }
    } else {
      console.log('  ❌ Seeding users: FAIL');
      passed = false;
    }

    console.log('\nTest 2: Delivery Challan to Sales Invoice status updates...');

    const customer = await db.get('SELECT * FROM accounts WHERE group_name = "Sundry Debtors"');
    const challanId = crypto.randomUUID();
    const now = new Date().toISOString();

    console.log('  Creating Delivery Challan...');
    await db.run(
      `INSERT INTO delivery_challans (id, company_id, challan_number, date, customer_id, financial_year, taxable_value, gst_amount, total_amount, status, sales_invoice_id, is_dirty, updated_at)
       VALUES (?, ?, 3001, '2026-06-06', ?, '2026-27', 25000.0, 1250.0, 26250.0, 'PENDING', NULL, 1, ?)`,
      [challanId, company.id, customer.id, now]
    );

    const initialChallan = await db.get('SELECT * FROM delivery_challans WHERE id = ?', [challanId]);
    if (initialChallan && initialChallan.status === 'PENDING' && initialChallan.sales_invoice_id === null) {
      console.log('  ✔ Challan starts as PENDING: PASS');
    } else {
      console.log('  ❌ Challan initial status error: FAIL');
      passed = false;
    }

    console.log('  Simulating sale transaction linked to Challan...');
    const salesId = crypto.randomUUID();
    await db.run(
      `INSERT INTO sales (id, company_id, invoice_number, date, customer_id, financial_year, taxable_value, gst_amount, total_amount, is_dirty, updated_at)
       VALUES (?, ?, 2001, '2026-06-06', ?, '2026-27', 25000.0, 1250.0, 26250.0, 1, ?)`,
      [salesId, company.id, customer.id, now]
    );

    // Update challan to invoiced
    await db.run(
      `UPDATE delivery_challans
       SET status = 'INVOICED', sales_invoice_id = ?, updated_at = ?
       WHERE id = ?`,
      [salesId, now, challanId]
    );

    const updatedChallan = await db.get('SELECT * FROM delivery_challans WHERE id = ?', [challanId]);
    if (updatedChallan && updatedChallan.status === 'INVOICED' && updatedChallan.sales_invoice_id === salesId) {
      console.log('  ✔ Challan status updated to INVOICED: PASS');
    } else {
      console.log('  ❌ Challan status update error: FAIL');
      passed = false;
    }

    console.log('\nTest 3: Double-entry Account Ledger computations...');
    const receiptId = crypto.randomUUID();
    await db.run(
      `INSERT INTO receipts (id, company_id, account_id, amount, date, payment_mode, reference_number, is_dirty, updated_at)
       VALUES (?, ?, ?, 15000.0, '2026-06-06', 'UPI', 'TXN100021', 1, ?)`,
      [receiptId, company.id, customer.id, now]
    );

    const salesTotal = await db.get('SELECT SUM(total_amount) as total FROM sales WHERE customer_id = ?', [customer.id]);
    const receiptsTotal = await db.get('SELECT SUM(amount) as total FROM receipts WHERE account_id = ?', [customer.id]);
    const ledgerBalance = (customer.opening_balance || 0) + (salesTotal.total || 0) - (receiptsTotal.total || 0);

    if (ledgerBalance === 11250) {
      console.log('  ✔ Ledger Closing Balance (Rs. 11,250): PASS');
    } else {
      console.log(`  ❌ Incorrect ledger balance. Expected 11250, got ${ledgerBalance}: FAIL`);
      passed = false;
    }

    // Test 4: Trial Balance Report calculation and double-entry balancing
    console.log('\nTest 4: Trial Balance calculations and double-entry balancing...');
    const trialBalance = await reportsService.getTrialBalance(company.id, '2026-04-01', '2026-06-30', 'with_opening');
    const totalDr = trialBalance.reduce((sum, item) => sum + item.debit, 0);
    const totalCr = trialBalance.reduce((sum, item) => sum + item.credit, 0);

    if (totalDr === totalCr) {
      console.log(`  ✔ Trial Balance Balances (Dr = Cr = Rs. ${totalDr}): PASS`);
    } else {
      console.log(`  ❌ Trial Balance Discrepancy. Dr: ${totalDr}, Cr: ${totalCr}: FAIL`);
      passed = false;
    }

    const check = (label: string, ok: boolean, detail = '') => {
      console.log(ok ? `  ✔ ${label}: PASS` : `  ❌ ${label}: FAIL ${detail}`);
      if (!ok) passed = false;
    };
    const rejects = async (fn: () => Promise<unknown>, messagePart: string) => {
      try { await fn(); return false; } catch (e: any) { return String(e.message).includes(messagePart); }
    };

    const salesReturnCols = await db.all('PRAGMA table_info(sales_returns)');
    check('sales_returns table exists with the expected columns',
      salesReturnCols.some((c: any) => c.name === 'against_sale_id') &&
      salesReturnCols.some((c: any) => c.name === 'return_type') &&
      salesReturnCols.some((c: any) => c.name === 'broker_name'), JSON.stringify(salesReturnCols));
    const purchaseReturnCols = await db.all('PRAGMA table_info(purchase_returns)');
    check('purchase_returns table exists with the expected columns',
      purchaseReturnCols.some((c: any) => c.name === 'against_purchase_id') &&
      purchaseReturnCols.some((c: any) => c.name === 'broker_name'), JSON.stringify(purchaseReturnCols));

    const actor = { id: user.id, username: user.username };
    const quality = await db.get('SELECT * FROM qualities WHERE company_id = ?', [company.id]);
    const description = await db.get('SELECT * FROM descriptions WHERE company_id = ?', [company.id]);
    const hsn = await db.get('SELECT * FROM hsn_codes WHERE company_id = ?', [company.id]);
    const saleBody = (invoiceNumber: number, extra: Record<string, unknown> = {}) => ({
      invoiceNumber, date: '2026-06-10', customerId: customer.id, financialYear: '2026-27',
      items: [{
        categoryId: quality.category_id, qualityId: quality.id,
        descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5
      }],
      ...extra
    });

    console.log('\nTest 5: Sale grand total includes cartage, postage, less and round-off...');
    // Screen: gross 10,000 + GST 500 + cartage 200 + postage 50 - less 100 = 10,650 -> rounded 10,650
    const saleId = await salesService.createSale(company.id, actor, saleBody(5001, { cartage: 200, postage: 50, less: 100, roundedOff: 0 }));
    const savedSale = await db.get('SELECT total_amount FROM sales WHERE id = ?', [saleId]);
    check('Sale total = 10,650', savedSale.total_amount === 10650, `got ${savedSale.total_amount}`);

    console.log('\nTest 6: Ledger closing balance matches the trial balance...');
    await db.run(
      `INSERT INTO journal_vouchers (id, company_id, voucher_no, date, voucher_type, account_id, debit_amount, credit_amount, particulars, is_dirty, updated_at)
       VALUES (?, ?, 'JV-T1', '2026-06-11', 'Journal', ?, 0, 500, 'discount', 1, ?)`,
      [crypto.randomUUID(), company.id, customer.id, now]
    );
    const ledger = await reportsService.getAccountLedger(company.id, customer.id);
    const tbAll = await reportsService.getTrialBalance(company.id, '1900-01-01', '2999-12-31', 'with_opening');
    const tbLine = tbAll.find(a => a.id === customer.id);
    const tbNet = tbLine ? tbLine.debit - tbLine.credit : 0;
    check('Ledger closing = trial balance', Math.abs(ledger.closingBalance - tbNet) < 0.01,
      `ledger ${ledger.closingBalance} vs TB ${tbNet}`);
    check('Ledger shows the journal line', ledger.ledger.some((r: any) => r.voucherType === 'Journal'));

    console.log('\nTest 7: Unbalanced journal voucher is rejected...');
    const other = await db.get('SELECT * FROM accounts WHERE company_id = ? AND id != ?', [company.id, customer.id]);
    check('Dr 1000 / Cr 900 rejected', await rejects(() => accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-12', voucherNo: 'JV-T2', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: customer.id, debitAmount: 1000 }, { accountId: other.id, creditAmount: 900 }]
    }), 'Out of balance'));

    console.log('\nTest 8: New voucher cannot overwrite an existing number...');
    check('Existing JV-T1 not overwritten', await rejects(() => accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-12', voucherNo: 'JV-T1', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: customer.id, debitAmount: 10 }, { accountId: other.id, creditAmount: 10 }]
    }), 'already exists'));

    console.log('\nTest 9: Duplicate invoice number is rejected, next number is MAX + 1...');
    check('Duplicate 5001 rejected', await rejects(() => salesService.createSale(company.id, actor, saleBody(5001)), 'already exists'));
    check('Next invoice number = 5002', (await salesService.getNextInvoiceNumber(company.id)) === '5002');
    await salesService.createSale(company.id, actor, saleBody(9001, { date: '2025-06-10', financialYear: '2025-26' }));
    check('Next number counts only the chosen year', (await salesService.getNextInvoiceNumber(company.id, '2026-27')) === '5002');
    check('Find by number picks the chosen year',
      (await salesService.findSaleByNumber(company.id, 9001, '2025-26')).financial_year === '2025-26'
      && await rejects(() => salesService.findSaleByNumber(company.id, 9001, '2026-27'), 'not found'));

    console.log('\nTest 10: A failed save does not undo other writes made at the same time...');
    const results = await Promise.allSettled([
      salesService.createSale(company.id, actor, saleBody(5002)),
      salesService.createSale(company.id, actor, { ...saleBody(5003), items: [{ meters: 1 }] }), // invalid item
      receiptService.create(company.id, actor, { accountId: customer.id, amount: 77, date: '2026-06-13', paymentMode: 'Cash' })
    ]);
    const kept = await db.get(
      `SELECT (SELECT COUNT(*) FROM sales WHERE invoice_number = 5002) AS s,
              (SELECT COUNT(*) FROM receipts WHERE amount = 77) AS r`
    );
    check('Valid sale and receipt both saved', kept.s === 1 && kept.r === 1 && results[1].status === 'rejected',
      JSON.stringify(kept));

    console.log('\nTest 11: Dashboard loads...');
    const dash = await reportsService.getDashboardSummary(company.id, false);
    check('Dashboard returns numbers', typeof dash.totalStock === 'number' && dash.outstandingReceivables > 0,
      JSON.stringify({ stock: dash.totalStock, recv: dash.outstandingReceivables }));

    console.log('\nTest 12: Company stores its P&L closing account.');
    const updated = await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: customer.id });
    check('pnl_closing_account_id persisted', updated.pnl_closing_account_id === customer.id);
    const reloaded = await db.get('SELECT pnl_closing_account_id FROM companies WHERE id = ?', [company.id]);
    check('pnl_closing_account_id reloaded from DB', reloaded.pnl_closing_account_id === customer.id);

    const capitalAccounts = await reportsService.getAccountsByPrimaryGroup(company.id, 'Sundry Debtors');
    check('Accounts-by-group returns the seeded debtor', capitalAccounts.some((a: any) => a.id === customer.id));

    console.log('\nTest 13: Automatic year-end close, happy path...');
    const now13 = new Date().toISOString();
    const incomeGroupId = crypto.randomUUID();
    const expenseGroupId = crypto.randomUUID();
    const capitalGroupId = crypto.randomUUID();
    const directIncomePG = await db.get('SELECT id FROM primary_groups WHERE name = "Direct Income"');
    const directExpensesPG = await db.get('SELECT id FROM primary_groups WHERE name = "Direct Expenses"');
    const capitalPG = await db.get('SELECT id FROM primary_groups WHERE name = "Capital Account"');
    await db.run(`INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at) VALUES (?, ?, 'Direct Income', ?, 0, ?)`, [incomeGroupId, company.id, directIncomePG.id, now13]);
    await db.run(`INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at) VALUES (?, ?, 'Direct Expenses', ?, 0, ?)`, [expenseGroupId, company.id, directExpensesPG.id, now13]);
    await db.run(`INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at) VALUES (?, ?, 'Capital Account', ?, 0, ?)`, [capitalGroupId, company.id, capitalPG.id, now13]);

    const salesAccountId = crypto.randomUUID();
    const purchaseAccountId = crypto.randomUUID();
    const capitalAccountId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Sales Account', 0, 'Direct Income', 0, ?)`, [salesAccountId, company.id, now13]);
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Purchase Account', 0, 'Direct Expenses', 0, ?)`, [purchaseAccountId, company.id, now13]);
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Owner Capital', 0, 'Capital Account', 0, ?)`, [capitalAccountId, company.id, now13]);

    // Test 12 already set pnl_closing_account_id on this company — clear it for this check.
    await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: null });
    check('Close rejected with no pnl_closing_account_id set',
      await rejects(() => reportsService.closeFinancialYear(company.id, actor, '2026-27'), 'closing account'));

    await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: capitalAccountId });

    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-01', voucherNo: 'JV-INC1', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: customer.id, debitAmount: 1000 }, { accountId: salesAccountId, creditAmount: 1000 }]
    });
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-02', voucherNo: 'JV-EXP1', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: purchaseAccountId, debitAmount: 400 }, { accountId: customer.id, creditAmount: 400 }]
    });

    const closeResult = await reportsService.closeFinancialYear(company.id, actor, '2026-27');
    check('Net profit computed as 1000 - 400', closeResult.netProfitLoss === 600, String(closeResult.netProfitLoss));
    check('Closing voucher number follows the pattern', closeResult.voucherNo === 'CLOSE-2026-27');

    const closingVoucherRows = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'CLOSE-2026-27']);
    const closingTotalDr = closingVoucherRows.reduce((s, r) => s + r.debit_amount, 0);
    const closingTotalCr = closingVoucherRows.reduce((s, r) => s + r.credit_amount, 0);
    check('Closing voucher balances', Math.abs(closingTotalDr - closingTotalCr) < 0.01, JSON.stringify({ closingTotalDr, closingTotalCr }));

    const fyMovementAfterClose = await reportsService.getTrialBalance(company.id, '2026-04-01', '2027-03-31', 'without_opening');
    const salesRowAfter = fyMovementAfterClose.find(r => r.id === salesAccountId);
    const purchaseRowAfter = fyMovementAfterClose.find(r => r.id === purchaseAccountId);
    check('Sales Account FY movement zeroed by the close', !salesRowAfter || (salesRowAfter.debit === salesRowAfter.credit));
    check('Purchase Account FY movement zeroed by the close', !purchaseRowAfter || (purchaseRowAfter.debit === purchaseRowAfter.credit));
    const capitalRowAfter = fyMovementAfterClose.find(r => r.id === capitalAccountId)!;
    check('Owner Capital credited by the net profit', capitalRowAfter.credit - capitalRowAfter.debit === 600);

    // A posting in the NEXT financial year must survive this year's close untouched.
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2027-06-01', voucherNo: 'JV-INC2', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: customer.id, debitAmount: 500 }, { accountId: salesAccountId, creditAmount: 500 }]
    });
    const nextFyMovement = await reportsService.getTrialBalance(company.id, '2027-04-01', '2028-03-31', 'without_opening');
    const salesRowNextFy = nextFyMovement.find(r => r.id === salesAccountId)!;
    check("Next FY's Sales Account posting is untouched by this year's close", salesRowNextFy.credit === 500 && salesRowNextFy.debit === 0);

    console.log('\nTest 14: Re-close replaces the prior closing voucher; unmatched account names are skipped...');

    // A sale whose credit_account matches no real account by name — becomes a 'virtual' PNL row.
    await salesService.createSale(company.id, actor, saleBody(9101, {
      date: '2026-06-05', financialYear: '2026-27', creditAccount: 'UNMATCHED REVENUE'
    }));

    const closeResult2 = await reportsService.closeFinancialYear(company.id, actor, '2026-27');
    check('Unmatched sales credit account reported as skipped, not silently dropped',
      closeResult2.skippedAccounts.some((s: any) => s.name.toUpperCase() === 'UNMATCHED REVENUE' && s.amount > 0),
      JSON.stringify(closeResult2.skippedAccounts));

    const closingVoucherRows2 = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'CLOSE-2026-27']);
    const distinctClosingVoucherNos = await db.all("SELECT DISTINCT voucher_no FROM journal_vouchers WHERE company_id = ? AND voucher_type = 'Books Closing'", [company.id]);
    check('Still exactly one closing voucher after re-close', distinctClosingVoucherNos.length === 1, JSON.stringify(distinctClosingVoucherNos));
    const closingTotalDr2 = closingVoucherRows2.reduce((s: number, r: any) => s + r.debit_amount, 0);
    const closingTotalCr2 = closingVoucherRows2.reduce((s: number, r: any) => s + r.credit_amount, 0);
    check('Re-closed voucher still balances (skipped amount excluded)', Math.abs(closingTotalDr2 - closingTotalCr2) < 0.01);
    check('Re-close recomputed the same net profit (unmatched account excluded from the total)',
      closeResult2.netProfitLoss === closeResult.netProfitLoss, String(closeResult2.netProfitLoss));

    // Re-close after a REAL new posting must recompute a genuinely different net profit.
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-10', voucherNo: 'JV-INC3', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: customer.id, debitAmount: 200 }, { accountId: salesAccountId, creditAmount: 200 }]
    });
    const closeResult3 = await reportsService.closeFinancialYear(company.id, actor, '2026-27');
    check('Re-close after a real posting recomputes a genuinely different net profit', closeResult3.netProfitLoss === 800, String(closeResult3.netProfitLoss));

    // A year with no P&L postings at all must close cleanly with no stale voucher left behind.
    const emptyCloseResult = await reportsService.closeFinancialYear(company.id, actor, '2030-31');
    check('Zero-movement year reports zero net profit/loss', emptyCloseResult.netProfitLoss === 0);
    const emptyVoucherRows = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'CLOSE-2030-31']);
    check('No voucher posted for a zero-movement year', emptyVoucherRows.length === 0);

    console.log('\nTest 15: Close validates its inputs instead of crashing or silently corrupting the books...');
    check('Malformed financial year rejected', await rejects(() => reportsService.closeFinancialYear(company.id, actor, 'not-a-year'), 'financial year'));
    check('Non-sequential financial year rejected', await rejects(() => reportsService.closeFinancialYear(company.id, actor, '2026-29'), 'financial year'));

    await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: customer.id });
    check('Closing account must be under Capital Account, not just any account',
      await rejects(() => reportsService.closeFinancialYear(company.id, actor, '2026-27'), 'closing account'));

    await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: crypto.randomUUID() });
    check('Nonexistent closing account rejected',
      await rejects(() => reportsService.closeFinancialYear(company.id, actor, '2026-27'), 'closing account'));

    await companyService.updateCompany(company.id, { ...actor, company_id: company.id }, { pnl_closing_account_id: capitalAccountId });

    console.log('\nTest 16: getAccountLedger filters by date range without losing the pre-range running balance...');
    const now16 = new Date().toISOString();
    const ledgerTestAccountId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, opening_balance_dc, group_name, is_dirty, updated_at) VALUES (?, ?, 'Ledger Test Account', 0, 'DR', 'Sundry Debtors', 0, ?)`, [ledgerTestAccountId, company.id, now16]);

    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-01-01', voucherNo: 'JV-LT1', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: ledgerTestAccountId, debitAmount: 100 }, { accountId: customer.id, creditAmount: 100 }]
    });
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-06-01', voucherNo: 'JV-LT2', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: ledgerTestAccountId, debitAmount: 50 }, { accountId: customer.id, creditAmount: 50 }]
    });
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'journal', voucherDate: '2026-12-01', voucherNo: 'JV-LT3', voucherType: 'Journal', isNew: true,
      lines: [{ accountId: ledgerTestAccountId, debitAmount: 25 }, { accountId: customer.id, creditAmount: 25 }]
    });

    const rangedLedger = await reportsService.getAccountLedger(company.id, ledgerTestAccountId, '2026-05-01', '2026-07-01');
    check('Only the in-range posting is returned', rangedLedger.ledger.length === 1 && rangedLedger.ledger[0].debit === 50, JSON.stringify(rangedLedger.ledger));
    check('Opening balance reflects the pre-range posting (100)', rangedLedger.openingBalance === 100, String(rangedLedger.openingBalance));
    check('Closing balance excludes the after-range posting (100+50, not +25)', rangedLedger.closingBalance === 150, String(rangedLedger.closingBalance));

    const unrangedLedger = await reportsService.getAccountLedger(company.id, ledgerTestAccountId);
    check('No date args still returns full history (backward compatible)', unrangedLedger.ledger.length === 3 && unrangedLedger.closingBalance === 175, JSON.stringify({ len: unrangedLedger.ledger.length, closing: unrangedLedger.closingBalance }));

    const emptyRangeLedger = await reportsService.getAccountLedger(company.id, ledgerTestAccountId, '2030-01-01', '2030-12-31');
    check('A range with no activity returns zero rows with opening = closing', emptyRangeLedger.ledger.length === 0 && emptyRangeLedger.openingBalance === emptyRangeLedger.closingBalance, JSON.stringify(emptyRangeLedger));

    const excelExport = await reportsService.exportExcel(company.id, 'ledger', ledgerTestAccountId);
    check('exportExcel\'s existing 2-arg caller still works unchanged', excelExport.buffer.length > 0);

    console.log('\nTest 17: generateLedgerPdf paginates to the exact row-count boundary (page NUMBER of pages, not the drawn "Page N" labels — those can\'t be read back without a text-extraction library)...');
    const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({
      date: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`, particulars: `Row ${i}`, debit: 10, credit: 0, balance: 10 * (i + 1)
    }));
    const manyRows = makeRows(45);
    const pdfBytes = await generateLedgerPdf({
      company: { name: 'Test Co' },
      accounts: [
        { account: { name: 'Overflow Account' }, openingBalance: 0, closingBalance: 450, ledger: manyRows },
        { account: { name: 'Short Account' }, openingBalance: 0, closingBalance: 20, ledger: [{ date: '2026-04-01', particulars: 'Row A', debit: 20, credit: 0, balance: 20 }] },
        { account: { name: 'Dormant Account' }, openingBalance: 0, closingBalance: 0, ledger: [] }
      ],
      startDate: '2026-04-01', endDate: '2027-03-31'
    });
    check('Returns a non-empty buffer', pdfBytes.length > 0);
    const loadedDoc = await PDFDocument.load(pdfBytes);
    check('45-row account spans 2 pages, +1 for the short account, +1 for the zero-row account (4 total)', loadedDoc.getPageCount() === 4, String(loadedDoc.getPageCount()));

    const exactly40 = await generateLedgerPdf({ company: { name: 'Test Co' }, accounts: [{ account: { name: 'Exactly 40' }, openingBalance: 0, closingBalance: 400, ledger: makeRows(40) }], startDate: '2026-04-01', endDate: '2027-03-31' });
    check('Exactly 40 rows is 1 page (no row dropped or duplicated at the boundary)', (await PDFDocument.load(exactly40)).getPageCount() === 1);
    const exactly41 = await generateLedgerPdf({ company: { name: 'Test Co' }, accounts: [{ account: { name: 'Exactly 41' }, openingBalance: 0, closingBalance: 410, ledger: makeRows(41) }], startDate: '2026-04-01', endDate: '2027-03-31' });
    check('Exactly 41 rows is 2 pages', (await PDFDocument.load(exactly41)).getPageCount() === 2);

    const unicodePdf = await generateLedgerPdf({
      company: { name: 'Test Co' },
      accounts: [{
        account: { name: 'Account ₹' },
        openingBalance: 0, closingBalance: 100,
        ledger: [{ date: '2026-04-01', particulars: 'Payment ₹100 received from a customer with a very long narration that would otherwise overlap the Debit column', debit: 100, credit: 0, balance: 100 }]
      }],
      startDate: '2026-04-01', endDate: '2027-03-31'
    });
    check('Unencodable characters (₹, non-Latin1) do not crash PDF generation', unicodePdf.length > 0);

    console.log('\nTest 18: getPartyLedgerPdf assembles multiple accounts and rejects an unknown one...');
    const multiAccountPdf = await reportsService.getPartyLedgerPdf(company.id, [ledgerTestAccountId, customer.id], '2026-01-01', '2026-12-31');
    check('Multi-account PDF is non-empty', multiAccountPdf.length > 0);
    check('Unknown account id is rejected, not silently skipped',
      await rejects(() => reportsService.getPartyLedgerPdf(company.id, [ledgerTestAccountId, crypto.randomUUID()], '2026-01-01', '2026-12-31'), 'not found'));

    console.log('\nTest 19: Debtors Outstanding Ledger (debtors only) ages on the BILL\'s own credit_days/broker, nets partial payments, filters by state/city/broker, Over Due Days (0 for all), Summarised, and Including Paid Bills...');
    const now19 = new Date().toISOString();
    const outstandingCustomerId = crypto.randomUUID();
    // Account-level credit_days/broker deliberately differ from the bill's own, to prove the
    // bill's own values win (Sale A has no broker_name, so it falls back to the account's).
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, credit_days, broker, state, city, is_dirty, updated_at) VALUES (?, ?, 'Overdue Customer', 0, 'Sundry Debtors', 30, 'Ramesh Broker', 'Gujarat', 'Surat', 0, ?)`, [outstandingCustomerId, company.id, now19]);

    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9201, date: '2026-01-01', customerId: outstandingCustomerId, financialYear: '2025-26', creditDays: 45,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5 }]
    });
    const saleA = await db.get('SELECT id FROM sales WHERE invoice_number = 9201 AND company_id = ?', [company.id]);

    // Partial payment with a discount, dated BEFORE paymentUpto -- must net off the balance.
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-02-01', voucherNo: 'RCPT-OA1', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: outstandingCustomerId, amount: 500, allocations: [{ billId: saleA.id, amount: 300, discount: 50 }] }]
    });
    // A second payment dated AFTER paymentUpto -- must be excluded from the balance.
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-07-01', voucherNo: 'RCPT-OA2', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: outstandingCustomerId, amount: 200, allocations: [{ billId: saleA.id, amount: 200 }] }]
    });

    const agedLedger = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true);
    const saleBill = agedLedger.find(g => g.groupName === 'Ramesh Broker')?.bills[0];

    check('Sale bill uses its OWN credit_days (45), not the account\'s (30): due Feb 15, 106 days overdue as of Jun 1',
      saleBill?.overdueDays === 106, JSON.stringify(saleBill));
    check('Sale bill with no broker_name falls back to the account\'s broker', agedLedger.some(g => g.groupName === 'Ramesh Broker'), JSON.stringify(agedLedger));
    check('Only the pre-paymentUpto receipt (300+50 discount) is netted off; the post-paymentUpto one (200) is not: 10500-350=10150',
      saleBill?.balanceDue === 10150, String(saleBill?.balanceDue));

    const dueOnlyExcluded = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-01-05', '2026-01-05', 'account', true, 0, true);
    check('All Bills / Due Bills: Due Bills excludes a bill not yet past its credit days', dueOnlyExcluded.length === 0, JSON.stringify(dueOnlyExcluded));

    check('Over Due Days = 0 means no threshold (the bill, 106 days overdue, is included)',
      agedLedger.length === 1, JSON.stringify(agedLedger));
    const aboveThreshold = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 200, true);
    check('Over Due Days > 0 is an actual threshold: 200 excludes a bill only 106 days overdue', aboveThreshold.length === 0, JSON.stringify(aboveThreshold));

    const summarised = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, false);
    check('Summarised (detailed=false) keeps the total but drops the bill rows',
      summarised[0]?.bills.length === 0 && summarised[0]?.totalOutstanding === 10150, JSON.stringify(summarised));

    const byState = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, 'Gujarat');
    check('State filter matches this account\'s state', byState.length === 1, JSON.stringify(byState));
    const wrongState = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, 'Maharashtra');
    check('State filter excludes a non-matching state', wrongState.length === 0, JSON.stringify(wrongState));
    const byCity = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, undefined, 'Surat');
    check('City filter matches this account\'s city', byCity.length === 1, JSON.stringify(byCity));
    const byBroker = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, undefined, undefined, 'Ramesh Broker');
    check('Broker Name filter matches this bill\'s (fallback) broker', byBroker.length === 1, JSON.stringify(byBroker));
    const wrongBroker = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, undefined, undefined, 'Someone Else');
    check('Broker Name filter excludes a non-matching broker', wrongBroker.length === 0, JSON.stringify(wrongBroker));

    // A bill fully paid off -- normally hidden -- only shows up with Including Paid Bills on.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9202, date: '2026-01-01', customerId: outstandingCustomerId, financialYear: '2025-26', creditDays: 10,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const saleOA3 = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9202 AND company_id = ?', [company.id]);
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-01-15', voucherNo: 'RCPT-OA3', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: outstandingCustomerId, amount: saleOA3.total_amount, allocations: [{ billId: saleOA3.id, amount: saleOA3.total_amount }] }]
    });
    const withoutPaid = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-06-01', 'account', false, 0, true);
    check('Including Paid Bills off (default): a fully paid bill is hidden, only the unpaid bill remains',
      withoutPaid[0]?.bills.length === 1 && !withoutPaid[0]?.bills.some((b: any) => b.billNumber === 9202), JSON.stringify(withoutPaid));
    const withPaid = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-06-01', 'account', false, 0, true, undefined, undefined, undefined, true);
    check('Including Paid Bills on: the same fully paid bill now appears',
      withPaid[0]?.bills.some((b: any) => b.billNumber === 9202), JSON.stringify(withPaid));

    const paidBillNeverDue = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-06-01', 'account', true, 0, true, undefined, undefined, undefined, true);
    check('A fully paid bill is never "Due", even with Including Paid Bills on and a Due Bills filter',
      !paidBillNeverDue[0]?.bills.some((b: any) => b.billNumber === 9202), JSON.stringify(paidBillNeverDue));
    const paidBillNeverOverThreshold = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-06-01', 'account', false, 30, true, undefined, undefined, undefined, true);
    check('A fully paid bill never counts toward the Over Due Days threshold either',
      !paidBillNeverOverThreshold[0]?.bills.some((b: any) => b.billNumber === 9202), JSON.stringify(paidBillNeverOverThreshold));

    const wrongCity = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, undefined, 'Mumbai');
    check('City filter excludes a non-matching city', wrongCity.length === 0, JSON.stringify(wrongCity));
    const exactThreshold = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 106, true);
    check('Over Due Days threshold is inclusive (>=): 106 includes a bill exactly 106 days overdue', exactThreshold.length === 1, JSON.stringify(exactThreshold));

    const byStateLowerCase = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, 'gujarat');
    check('State filter matches case-insensitively (AC_PLUS data is often inconsistently cased)', byStateLowerCase.length === 1, JSON.stringify(byStateLowerCase));
    const byStatePadded = await reportsService.getOutstandingLedger(company.id, [outstandingCustomerId], '2026-06-01', '2026-03-01', 'broker', false, 0, true, ' Gujarat ');
    check('State filter trims surrounding whitespace', byStatePadded.length === 1, JSON.stringify(byStatePadded));

    console.log('\nTest 20: getOverdueBillsWithPaymentSplit splits payments by whether they landed before or on/after the BILL\'s own due date, and getOverdueInterestReport applies simple interest...');
    const now20 = new Date().toISOString();
    const interestCustomerId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Interest Test Account', 0, 'Sundry Debtors', 0, ?)`, [interestCustomerId, company.id, now20]);
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9401, date: '2026-01-01', customerId: interestCustomerId, financialYear: '2025-26', creditDays: 30, brokerName: 'Mahesh Broker',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5 }]
    });
    const saleB = await db.get('SELECT id FROM sales WHERE invoice_number = 9401 AND company_id = ?', [company.id]);
    // Due date = 2026-01-31. This payment lands BEFORE it.
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-01-15', voucherNo: 'RCPT-INT1', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: interestCustomerId, amount: 2000, allocations: [{ billId: saleB.id, amount: 2000 }] }]
    });

    // A zero-credit-days bill: due date must equal the bill's own date, not crash or null out.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9402, date: '2026-02-01', customerId: interestCustomerId, financialYear: '2025-26', creditDays: 0,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    // A separate bill whose only payment lands EXACTLY on its own due date (Jan 1 + 10d = Jan 11).
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9403, date: '2026-01-01', customerId: interestCustomerId, financialYear: '2025-26', creditDays: 10,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const saleC = await db.get('SELECT id FROM sales WHERE invoice_number = 9403 AND company_id = ?', [company.id]);
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-01-11', voucherNo: 'RCPT-INT2', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: interestCustomerId, amount: 1000, allocations: [{ billId: saleC.id, amount: 1000 }] }]
    });

    const split = await accVoucherRepository.getOverdueBillsWithPaymentSplit(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01');
    const billA = split.find((b: any) => b.billNumber === 9401);
    const billB = split.find((b: any) => b.billNumber === 9402);
    const billC = split.find((b: any) => b.billNumber === 9403);
    check('Due date computed from the bill\'s own credit_days (Jan 1 + 30d = Jan 31)', billA?.dueDate === '2026-01-31', JSON.stringify(billA));
    check('Payment dated before the due date lands in paidBeforeDue, not paidOnOrAfterDue', billA?.paidBeforeDue === 2000 && billA?.paidOnOrAfterDue === 0, JSON.stringify(billA));
    check('credit_days=0 gives a due date equal to the bill\'s own date, not a crash or null', billB?.dueDate === '2026-02-01', JSON.stringify(billB));
    check('A payment dated EXACTLY on the due date counts as paidOnOrAfterDue, not paidBeforeDue', billC?.paidOnOrAfterDue === 1000 && billC?.paidBeforeDue === 0, JSON.stringify(billC));

    const withEarly = await reportsService.getOverdueInterestReport(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01', 18, 365, true);
    check('Grouped by account only -- no Outstanding Type on this AC_PLUS screen (confirmed via its form fields)',
      withEarly.length === 1 && withEarly[0].groupName === 'Interest Test Account' && withEarly[0].bills.length >= 3, JSON.stringify(withEarly.map((g: any) => g.groupName)));
    const billWithEarly = withEarly[0]?.bills.find((b: any) => b.billNumber === 9401);
    check('overdueDays = Jan 31 to Apr 1 = 60 days', billWithEarly?.overdueDays === 60, String(billWithEarly?.overdueDays));
    check('includeEarlyPayments=true nets the early payment: principal 10500-2000=8500, interest = 8500*0.18*60/365 = 251.51',
      billWithEarly?.principal === 8500 && billWithEarly?.interest === 251.51, JSON.stringify(billWithEarly));

    const withoutEarly = await reportsService.getOverdueInterestReport(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01', 18, 365, false);
    const billWithoutEarly = withoutEarly[0]?.bills.find((b: any) => b.billNumber === 9401);
    check('includeEarlyPayments=false ignores the early payment: principal stays 10500, interest = 10500*0.18*60/365 = 310.68',
      billWithoutEarly?.principal === 10500 && billWithoutEarly?.interest === 310.68, JSON.stringify(billWithoutEarly));

    const with360 = await reportsService.getOverdueInterestReport(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01', 18, 360, true);
    const bill360 = with360[0]?.bills.find((b: any) => b.billNumber === 9401);
    check('maxDaysOfYear changes the result (now a typed number, not limited to 360/365): 365-day basis gives 251.51, 360 gives exactly 255.00',
      bill360?.interest === 255, String(bill360?.interest));

    // A bill fully settled by a payment BEFORE its own due date never genuinely went overdue --
    // must be excluded entirely, regardless of includeEarlyPayments (fix for a reviewer finding:
    // the toggle used to still charge full-principal interest on such a bill when set to false).
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9404, date: '2026-01-01', customerId: interestCustomerId, financialYear: '2025-26', creditDays: 30,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const saleD = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9404 AND company_id = ?', [company.id]);
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-01-10', voucherNo: 'RCPT-INT3', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: interestCustomerId, amount: saleD.total_amount, allocations: [{ billId: saleD.id, amount: saleD.total_amount }] }]
    });
    const afterFullEarlyPayment = await reportsService.getOverdueInterestReport(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01', 18, 365, false);
    check('Bill fully paid before its due date never appears, even with includeEarlyPayments=false',
      !afterFullEarlyPayment.some(g => g.bills.some((b: any) => b.billNumber === 9404)), JSON.stringify(afterFullEarlyPayment));

    // A payment dated BEFORE the queried Payment Period Start must be ignored -- this is AC_PLUS's
    // own field (a real operator-controlled window), confirmed intentional, not a bug: the bill
    // still shows its full amount owed when the window doesn't reach back far enough to see the payment.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9405, date: '2026-01-01', customerId: interestCustomerId, financialYear: '2025-26', creditDays: 10,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const saleE = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9405 AND company_id = ?', [company.id]);
    await accVoucherService.saveVoucher(company.id, actor, {
      type: 'receipt', voucherDate: '2026-01-05', voucherNo: 'RCPT-INT4', bankAccountName: 'Test Bank', isNew: true,
      lines: [{ accountId: interestCustomerId, amount: saleE.total_amount, allocations: [{ billId: saleE.id, amount: saleE.total_amount }] }]
    });
    const windowExcludesOldPayment = await reportsService.getOverdueInterestReport(company.id, [interestCustomerId], '2026-04-01', '2026-02-01', '2026-04-01', 18, 365, true);
    const billE = windowExcludesOldPayment[0]?.bills.find((b: any) => b.billNumber === 9405);
    check('A payment dated before periodStart is correctly ignored (full amount still shown as owed)',
      billE?.principal === saleE.total_amount, JSON.stringify(billE));

    // A NULL credit_days (possible via sync/legacy import, bypassing the service's Number(||0)
    // coercion) must give a sane due date equal to the bill's own date, not a crash or ~56 years
    // of bogus interest from an invalid date() computation.
    const nullCreditDaysBillId = crypto.randomUUID();
    await db.run(
      `INSERT INTO sales (id, company_id, invoice_number, date, customer_id, financial_year, taxable_value, gst_amount, total_amount, credit_days, updated_at)
       VALUES (?, ?, 9406, '2026-01-01', ?, '2025-26', 1000, 50, 1050, NULL, ?)`,
      [nullCreditDaysBillId, company.id, interestCustomerId, now20]
    );
    const splitWithNull = await accVoucherRepository.getOverdueBillsWithPaymentSplit(company.id, [interestCustomerId], '2026-04-01', '2026-01-01', '2026-04-01');
    const billNullCreditDays = splitWithNull.find((b: any) => b.billNumber === 9406);
    check('NULL credit_days gives a due date equal to the bill\'s own date, not a crash or null',
      billNullCreditDays?.dueDate === '2026-01-01', JSON.stringify(billNullCreditDays));

    console.log('\nTest 21: Allocation Entry (R20) adjusts old dues/on-account amounts/kasar against specific bills without a receipt/payment voucher, debtor and creditor sides, kasar posts a real journal entry...');
    const now21 = new Date().toISOString();
    const allocCustomerId = crypto.randomUUID();
    const kasarAccountId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Allocation Customer', 0, 'Sundry Debtors', 0, ?)`, [allocCustomerId, company.id, now21]);
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Kasar Allowed', 0, 'Indirect Expenses', 0, ?)`, [kasarAccountId, company.id, now21]);

    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9501, date: '2026-01-01', customerId: allocCustomerId, financialYear: '2025-26', creditDays: 30,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5 }]
    });
    const allocSaleA = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9501 AND company_id = ?', [company.id]);

    // on_account: reallocates an existing credit against the bill -- no new GL posting.
    await accVoucherService.saveAllocationEntry(company.id, actor, {
      side: 'debtor', entryNo: 'ALLOC-OA-1', date: '2026-02-01', accountId: allocCustomerId,
      entryType: 'on_account', amount: 400, isNew: true,
      bills: [{ billId: allocSaleA.id, billType: 'sale', amount: 400 }]
    });
    const afterOnAccount = await accVoucherRepository.getOutstandingBills(company.id, allocCustomerId);
    const billAfterOnAccount = afterOnAccount.find((b: any) => b.billId === allocSaleA.id);
    check('on_account entry reduces the bill\'s balanceDue (10500 - 400 = 10100)',
      billAfterOnAccount?.balanceDue === 10100, JSON.stringify(billAfterOnAccount));
    const journalAfterOnAccount = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'ALLOC-D-ALLOC-OA-1']);
    check('on_account entry posts nothing to the general ledger -- it only reallocates an already-posted balance',
      journalAfterOnAccount.length === 0, JSON.stringify(journalAfterOnAccount));

    // kasar: writes off part of the bill -- must ALSO post a balanced debit/credit journal pair,
    // matching AC_PLUS's own confirmed JV-shaped posting for a kasar write-off.
    await accVoucherService.saveAllocationEntry(company.id, actor, {
      side: 'debtor', entryNo: 'ALLOC-KS-1', date: '2026-02-05', accountId: allocCustomerId,
      entryType: 'kasar', amount: 100, kasarAccountId, isNew: true,
      bills: [{ billId: allocSaleA.id, billType: 'sale', amount: 100 }]
    });
    const afterKasar = await accVoucherRepository.getOutstandingBills(company.id, allocCustomerId);
    const billAfterKasar = afterKasar.find((b: any) => b.billId === allocSaleA.id);
    check('kasar entry further reduces the bill\'s balanceDue (10100 - 100 = 10000)',
      billAfterKasar?.balanceDue === 10000, JSON.stringify(billAfterKasar));
    const journalAfterKasar = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'ALLOC-D-ALLOC-KS-1']);
    const kasarDebitLine = journalAfterKasar.find((l: any) => l.account_id === kasarAccountId);
    const kasarCreditLine = journalAfterKasar.find((l: any) => l.account_id === allocCustomerId);
    check('kasar entry posts exactly 2 balanced journal lines: debit the Kasar account, credit the customer',
      journalAfterKasar.length === 2 && kasarDebitLine?.debit_amount === 100 && kasarDebitLine?.credit_amount === 0
        && kasarCreditLine?.credit_amount === 100 && kasarCreditLine?.debit_amount === 0,
      JSON.stringify(journalAfterKasar));

    // "Include All Entries": a bill fully settled by an allocation entry is hidden by default,
    // but still shows up when requested (same pattern as R6's Including Paid Bills).
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9502, date: '2026-01-01', customerId: allocCustomerId, financialYear: '2025-26', creditDays: 30,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const allocSaleB = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9502 AND company_id = ?', [company.id]);
    await accVoucherService.saveAllocationEntry(company.id, actor, {
      side: 'debtor', entryNo: 'ALLOC-OA-2', date: '2026-02-01', accountId: allocCustomerId,
      entryType: 'on_account', amount: allocSaleB.total_amount, isNew: true,
      bills: [{ billId: allocSaleB.id, billType: 'sale', amount: allocSaleB.total_amount }]
    });
    const defaultPicker = await accVoucherService.getOutstandingBillsForAllocation(company.id, allocCustomerId, 'debtor');
    const includeAllEntries = await accVoucherService.getOutstandingBillsForAllocation(company.id, allocCustomerId, 'debtor', { includeAllEntries: true });
    check('Allocation Entry picker hides a fully-settled bill by default',
      !defaultPicker.some((b: any) => b.billId === allocSaleB.id), JSON.stringify(defaultPicker));
    check('"Include All Entries" still returns the bill once it is fully settled',
      includeAllEntries.some((b: any) => b.billId === allocSaleB.id), JSON.stringify(includeAllEntries));

    // Validation: bill lines must sum to the header amount.
    check('Allocation entry rejects when bill lines don\'t sum to the header amount',
      await rejects(() => accVoucherService.saveAllocationEntry(company.id, actor, {
        side: 'debtor', entryNo: 'ALLOC-BAD-1', date: '2026-02-10', accountId: allocCustomerId,
        entryType: 'on_account', amount: 500, isNew: true,
        bills: [{ billId: allocSaleA.id, billType: 'sale', amount: 400 }]
      }), 'Bill lines total'));

    // Validation: a kasar entry without a Kasar/Discount account is rejected.
    check('Allocation entry rejects a kasar entry with no kasarAccountId',
      await rejects(() => accVoucherService.saveAllocationEntry(company.id, actor, {
        side: 'debtor', entryNo: 'ALLOC-BAD-2', date: '2026-02-10', accountId: allocCustomerId,
        entryType: 'kasar', amount: 50, isNew: true,
        bills: [{ billId: allocSaleA.id, billType: 'sale', amount: 50 }]
      }), 'Kasar/Discount account is required'));

    // Creditor side: the same mechanism, mirrored onto a purchase bill.
    const allocSupplierId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Allocation Supplier', 0, 'Sundry Creditors', 0, ?)`, [allocSupplierId, company.id, now21]);
    await purchaseService.createPurchase(company.id, actor, {
      purchaseNumber: '9601', entryNo: '9601', date: '2026-01-01', supplierId: allocSupplierId, financialYear: '2025-26', creditDays: 30,
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 50, rate: 100, gstPercentage: 5 }]
    });
    const allocPurchaseA = await db.get('SELECT id, total_amount FROM purchases WHERE purchase_number = ? AND company_id = ?', ['9601', company.id]);
    await accVoucherService.saveAllocationEntry(company.id, actor, {
      side: 'creditor', entryNo: 'ALLOC-C-OA-1', date: '2026-02-01', accountId: allocSupplierId,
      entryType: 'on_account', amount: 250, isNew: true,
      bills: [{ billId: allocPurchaseA.id, billType: 'purchase', amount: 250 }]
    });
    const creditorBills = await accVoucherRepository.getOutstandingBills(company.id, allocSupplierId);
    const billAfterCreditorAlloc = creditorBills.find((b: any) => b.billId === allocPurchaseA.id);
    check('Creditor-side allocation entry reduces the purchase bill\'s balanceDue the same way (5250 - 250 = 5000)',
      billAfterCreditorAlloc?.balanceDue === 5000, JSON.stringify(billAfterCreditorAlloc));

    // Validation: a creditor-side entry can only touch purchase bills, not a sale bill.
    check('A creditor-side allocation entry rejects a sale-type bill line',
      await rejects(() => accVoucherService.saveAllocationEntry(company.id, actor, {
        side: 'creditor', entryNo: 'ALLOC-BAD-3', date: '2026-02-10', accountId: allocSupplierId,
        entryType: 'on_account', amount: 50, isNew: true,
        bills: [{ billId: allocSaleA.id, billType: 'sale', amount: 50 }]
      }), 'Invalid bill line'));

    console.log('\nTest 22: Print Allocation (R20) -- multi-account PDF, date-range filtering, and unknown account rejection...');
    const multiAccountAllocPdf = await accVoucherService.getAllocationPrintPdf(company.id, 'debtor', [allocCustomerId], '2026-01-01', '2026-12-31');
    check('Multi-account Print Allocation PDF is non-empty', multiAccountAllocPdf.length > 0);
    check('Unknown account id is rejected, not silently skipped',
      await rejects(() => accVoucherService.getAllocationPrintPdf(company.id, 'debtor', [crypto.randomUUID()], '2026-01-01', '2026-12-31'), 'not found'));

    const allocRowsInRange = await accVoucherRepository.getAllocationHistoryForPrint(company.id, 'debtor', [allocCustomerId], '2026-02-01', '2026-02-01');
    check('Date range includes an entry dated exactly on the start/end date (ALLOC-OA-1, 2026-02-01)',
      allocRowsInRange.some((r: any) => r.voucherNo === 'ALLOC-OA-1'), JSON.stringify(allocRowsInRange));
    check('Date range excludes an entry dated outside it (ALLOC-KS-1, 2026-02-05)',
      !allocRowsInRange.some((r: any) => r.voucherNo === 'ALLOC-KS-1'), JSON.stringify(allocRowsInRange));

    const allocRowsFullRange = await accVoucherRepository.getAllocationHistoryForPrint(company.id, 'debtor', [allocCustomerId], '2026-01-01', '2026-12-31');
    check('A fuller range picks up both the on_account and kasar entries',
      allocRowsFullRange.some((r: any) => r.voucherNo === 'ALLOC-OA-1') && allocRowsFullRange.some((r: any) => r.voucherNo === 'ALLOC-KS-1'),
      JSON.stringify(allocRowsFullRange));

    const interestCustomerFullRange = await accVoucherRepository.getAllocationHistoryForPrint(company.id, 'debtor', [interestCustomerId], '2026-01-01', '2026-12-31');
    check('The combined history also includes ordinary bill-wise receipts (R7), not just Allocation Entries (R20)',
      interestCustomerFullRange.some((r: any) => r.voucherKind === 'receipt'), JSON.stringify(interestCustomerFullRange.slice(0, 1)));

    const creditorAllocPdf = await accVoucherService.getAllocationPrintPdf(company.id, 'creditor', [allocSupplierId], '2026-01-01', '2026-12-31');
    check('Creditor-side Print Allocation PDF is also non-empty', creditorAllocPdf.length > 0);

    // AC_PLUS's own printed report never shows a bare account name with nothing under it --
    // matters more now that Select All can pull in every account in the company, most of which
    // will have zero activity in a given range.
    const noActivityAccountId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'No Activity Debtor', 0, 'Sundry Debtors', 0, ?)`, [noActivityAccountId, company.id, now21]);
    const noActivityPdf = await accVoucherService.getAllocationPrintPdf(company.id, 'debtor', [noActivityAccountId], '2026-01-01', '2026-12-31');
    const noActivityDoc = await PDFDocument.load(noActivityPdf);
    check('An account with zero allocation activity produces a single "no activity" page, not a crash or an invalid empty PDF',
      noActivityDoc.getPageCount() === 1 && noActivityPdf.length > 0, `pages=${noActivityDoc.getPageCount()}`);

    // A bill settled across two separate allocations (an ordinary receipt, then an on_account
    // entry) must show a correctly running "Balance Amt." on each row -- not just the last one.
    const runningBalanceBill = await db.get('SELECT id, total_amount FROM sales WHERE invoice_number = 9501 AND company_id = ?', [company.id]);
    const runningRows = allocRowsFullRange.filter((r: any) => r.billId === runningBalanceBill.id).sort((a: any, b: any) => a.voucherDate < b.voucherDate ? -1 : 1);
    check('Both allocations against the same bill (RCPT-OA1 pattern + ALLOC-OA-1 + ALLOC-KS-1) appear as separate rows',
      runningRows.length >= 2, JSON.stringify(runningRows));

    console.log('\nTest 23: Sales Return -- itemized, against-bill linkage, over-return warn-and-confirm, account mismatch reject...');
    const now23 = new Date().toISOString();
    const returnCustomerId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Return Customer', 0, 'Sundry Debtors', 0, ?)`, [returnCustomerId, company.id, now23]);

    // Sale A: used for the basic create / account-mismatch / over-return warn+confirm checks.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9601, date: '2026-01-01', customerId: returnCustomerId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5 }]
    });
    const srSaleA = await db.get('SELECT id, total_amount, date FROM sales WHERE invoice_number = 9601 AND company_id = ?', [company.id]);
    check('Sale A total = 10,500', srSaleA.total_amount === 10500, `got ${srSaleA.total_amount}`);

    const returnOk = await salesReturnService.createSalesReturn(company.id, actor, {
      returnNumber: 1, date: '2026-03-01', customerId: returnCustomerId, financialYear: '2025-26',
      againstSaleId: srSaleA.id, againstBillDate: srSaleA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const billsAfterReturn1 = await accVoucherRepository.getOutstandingBills(company.id, returnCustomerId);
    const srSaleABillAfterReturn1 = billsAfterReturn1.find((b: any) => b.billId === srSaleA.id);
    check('Sales Return creates successfully and reduces the bill\'s balanceDue (10500 - 1050 = 9450)',
      !!returnOk && srSaleABillAfterReturn1?.balanceDue === 9450, JSON.stringify(srSaleABillAfterReturn1));

    check('Account mismatch is rejected outright', await rejects(() => salesReturnService.createSalesReturn(company.id, actor, {
      returnNumber: 2, date: '2026-03-02', customerId: customer.id, financialYear: '2025-26',
      againstSaleId: srSaleA.id, againstBillDate: srSaleA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 5 }]
    }), 'does not belong'));

    const overReturnBody = {
      returnNumber: 2, date: '2026-03-05', customerId: returnCustomerId, financialYear: '2025-26',
      againstSaleId: srSaleA.id, againstBillDate: srSaleA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 91, rate: 100, gstPercentage: 5 }]
    };
    let overReturnError: any = null;
    try {
      await salesReturnService.createSalesReturn(company.id, actor, overReturnBody);
    } catch (e) {
      overReturnError = e;
    }
    check('Over-return without confirmOverage throws OverReturnError (not a generic Error)',
      overReturnError instanceof OverReturnError && overReturnError.balanceDue === 9450 && String(overReturnError.message).includes('exceeds'),
      String(overReturnError?.message));

    const confirmedReturnId = await salesReturnService.createSalesReturn(company.id, actor, { ...overReturnBody, confirmOverage: true });
    check('The same over-return with confirmOverage:true saves successfully', !!confirmedReturnId);

    // Sale B: used for the cross-financial-year bill lookup check.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9602, date: '2026-01-10', customerId: returnCustomerId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 50, rate: 100, gstPercentage: 5 }]
    });
    const srSaleB = await db.get('SELECT id, total_amount, date FROM sales WHERE invoice_number = 9602 AND company_id = ?', [company.id]);
    check('Sale B total = 5,250', srSaleB.total_amount === 5250, `got ${srSaleB.total_amount}`);

    const returnBId = await salesReturnService.createSalesReturn(company.id, actor, {
      returnNumber: 1, date: '2026-04-05', customerId: returnCustomerId, financialYear: '2026-27',
      againstSaleId: srSaleB.id, againstBillDate: srSaleB.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const billsAfterCrossFyReturn = await accVoucherRepository.getOutstandingBills(company.id, returnCustomerId);
    const srSaleBBill = billsAfterCrossFyReturn.find((b: any) => b.billId === srSaleB.id);
    check('A return dated in a different financial year than its bill still finds the bill correctly (5250 - 1050 = 4200)',
      srSaleBBill?.balanceDue === 4200, JSON.stringify(srSaleBBill));

    await salesReturnService.deleteSalesReturn(company.id, returnBId, actor);
    const billsAfterReturnDelete = await accVoucherRepository.getOutstandingBills(company.id, returnCustomerId);
    const srSaleBBillAfterDelete = billsAfterReturnDelete.find((b: any) => b.billId === srSaleB.id);
    check('Deleting a return reverts the bill\'s balanceDue to its pre-return amount (back to 5250)',
      srSaleBBillAfterDelete?.balanceDue === 5250, JSON.stringify(srSaleBBillAfterDelete));

    // Sale C: used for the edit-does-not-double-count check (zero GST for clean arithmetic).
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9603, date: '2026-01-15', customerId: returnCustomerId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 42, rate: 100, gstPercentage: 0 }]
    });
    const srSaleC = await db.get('SELECT id, total_amount, date FROM sales WHERE invoice_number = 9603 AND company_id = ?', [company.id]);
    check('Sale C total = 4,200', srSaleC.total_amount === 4200, `got ${srSaleC.total_amount}`);

    const returnCId = await salesReturnService.createSalesReturn(company.id, actor, {
      returnNumber: 3, date: '2026-03-10', customerId: returnCustomerId, financialYear: '2025-26',
      againstSaleId: srSaleC.id, againstBillDate: srSaleC.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 0 }]
    });
    // Edit to a total (4000) that only fits if the update excludes this return's OWN prior 500
    // from the balance check -- without that exclusion the (buggy) check would see only
    // 4200 - 500 = 3700 room left and wrongly throw OverReturnError for a 4000 edit.
    await salesReturnService.updateSalesReturn(company.id, returnCId, actor, {
      returnNumber: 3, date: '2026-03-10', customerId: returnCustomerId, financialYear: '2025-26',
      againstSaleId: srSaleC.id, againstBillDate: srSaleC.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 40, rate: 100, gstPercentage: 0 }]
    });
    const billsAfterEdit = await accVoucherRepository.getOutstandingBills(company.id, returnCustomerId);
    const srSaleCBillAfterEdit = billsAfterEdit.find((b: any) => b.billId === srSaleC.id);
    check('Editing a return does not double-count its own prior effect on the bill\'s balanceDue (4200 - 4000 = 200, not 4200 - 500 - 4000 = -300)',
      srSaleCBillAfterEdit?.balanceDue === 200, JSON.stringify(srSaleCBillAfterEdit));

    console.log('\nTest 24: Purchase Return -- itemized, against-bill linkage, over-return warn-and-confirm, account mismatch reject...');
    const now24 = new Date().toISOString();
    const returnSupplierId = crypto.randomUUID();
    await db.run(`INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at) VALUES (?, ?, 'Return Supplier', 0, 'Sundry Creditors', 0, ?)`, [returnSupplierId, company.id, now24]);

    // Purchase A: used for the basic create / account-mismatch / over-return warn+confirm checks.
    await purchaseService.createPurchase(company.id, actor, {
      purchaseNumber: 9701, entryNo: 9701, date: '2026-01-01', supplierId: returnSupplierId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 100, rate: 100, gstPercentage: 5 }]
    });
    const prPurchaseA = await db.get('SELECT id, total_amount, date FROM purchases WHERE entry_no = 9701 AND company_id = ?', [company.id]);
    check('Purchase A total = 10,500', prPurchaseA.total_amount === 10500, `got ${prPurchaseA.total_amount}`);

    const returnOk2 = await purchaseReturnService.createPurchaseReturn(company.id, actor, {
      returnNumber: 1, date: '2026-03-01', supplierId: returnSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseA.id, againstBillDate: prPurchaseA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const billsAfterPrReturn1 = await accVoucherRepository.getOutstandingBills(company.id, returnSupplierId);
    const prPurchaseABillAfterReturn1 = billsAfterPrReturn1.find((b: any) => b.billId === prPurchaseA.id);
    check('Purchase Return creates successfully and reduces the bill\'s balanceDue (10500 - 1050 = 9450)',
      !!returnOk2 && prPurchaseABillAfterReturn1?.balanceDue === 9450, JSON.stringify(prPurchaseABillAfterReturn1));

    check('Account mismatch is rejected outright', await rejects(() => purchaseReturnService.createPurchaseReturn(company.id, actor, {
      returnNumber: 2, date: '2026-03-02', supplierId: allocSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseA.id, againstBillDate: prPurchaseA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 5 }]
    }), 'does not belong'));

    const overPrReturnBody = {
      returnNumber: 2, date: '2026-03-05', supplierId: returnSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseA.id, againstBillDate: prPurchaseA.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 91, rate: 100, gstPercentage: 5 }]
    };
    let overPrReturnError: any = null;
    try {
      await purchaseReturnService.createPurchaseReturn(company.id, actor, overPrReturnBody);
    } catch (e) {
      overPrReturnError = e;
    }
    check('Over-return without confirmOverage throws OverReturnError (not a generic Error)',
      overPrReturnError instanceof OverReturnError && overPrReturnError.balanceDue === 9450 && String(overPrReturnError.message).includes('exceeds'),
      String(overPrReturnError?.message));

    const confirmedPrReturnId = await purchaseReturnService.createPurchaseReturn(company.id, actor, { ...overPrReturnBody, confirmOverage: true });
    check('The same over-return with confirmOverage:true saves successfully', !!confirmedPrReturnId);

    // Purchase B: used for the cross-financial-year bill lookup check and the delete-recompute check.
    await purchaseService.createPurchase(company.id, actor, {
      purchaseNumber: 9702, entryNo: 9702, date: '2026-01-10', supplierId: returnSupplierId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 50, rate: 100, gstPercentage: 5 }]
    });
    const prPurchaseB = await db.get('SELECT id, total_amount, date FROM purchases WHERE entry_no = 9702 AND company_id = ?', [company.id]);
    check('Purchase B total = 5,250', prPurchaseB.total_amount === 5250, `got ${prPurchaseB.total_amount}`);

    const returnBId2 = await purchaseReturnService.createPurchaseReturn(company.id, actor, {
      returnNumber: 1, date: '2026-04-05', supplierId: returnSupplierId, financialYear: '2026-27',
      againstPurchaseId: prPurchaseB.id, againstBillDate: prPurchaseB.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 10, rate: 100, gstPercentage: 5 }]
    });
    const billsAfterCrossFyPrReturn = await accVoucherRepository.getOutstandingBills(company.id, returnSupplierId);
    const prPurchaseBBill = billsAfterCrossFyPrReturn.find((b: any) => b.billId === prPurchaseB.id);
    check('A return dated in a different financial year than its bill still finds the bill correctly (5250 - 1050 = 4200)',
      prPurchaseBBill?.balanceDue === 4200, JSON.stringify(prPurchaseBBill));

    await purchaseReturnService.deletePurchaseReturn(company.id, returnBId2, actor);
    const billsAfterPrReturnDelete = await accVoucherRepository.getOutstandingBills(company.id, returnSupplierId);
    const prPurchaseBBillAfterDelete = billsAfterPrReturnDelete.find((b: any) => b.billId === prPurchaseB.id);
    check('Deleting a return reverts the bill\'s balanceDue to its pre-return amount (back to 5250)',
      prPurchaseBBillAfterDelete?.balanceDue === 5250, JSON.stringify(prPurchaseBBillAfterDelete));

    // Purchase C: used for the edit-does-not-double-count check (zero GST for clean arithmetic).
    await purchaseService.createPurchase(company.id, actor, {
      purchaseNumber: 9703, entryNo: 9703, date: '2026-01-15', supplierId: returnSupplierId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 42, rate: 100, gstPercentage: 0 }]
    });
    const prPurchaseC = await db.get('SELECT id, total_amount, date FROM purchases WHERE entry_no = 9703 AND company_id = ?', [company.id]);
    check('Purchase C total = 4,200', prPurchaseC.total_amount === 4200, `got ${prPurchaseC.total_amount}`);

    const returnCId2 = await purchaseReturnService.createPurchaseReturn(company.id, actor, {
      returnNumber: 3, date: '2026-03-10', supplierId: returnSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseC.id, againstBillDate: prPurchaseC.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 0 }]
    });
    // Edit to a total (4000) that only fits if the update excludes this return's OWN prior 500
    // from the balance check -- without that exclusion the (buggy) check would see only
    // 4200 - 500 = 3700 room left and wrongly throw OverReturnError for a 4000 edit.
    await purchaseReturnService.updatePurchaseReturn(company.id, returnCId2, actor, {
      returnNumber: 3, date: '2026-03-10', supplierId: returnSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseC.id, againstBillDate: prPurchaseC.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 40, rate: 100, gstPercentage: 0 }]
    });
    const billsAfterPrEdit = await accVoucherRepository.getOutstandingBills(company.id, returnSupplierId);
    const prPurchaseCBillAfterEdit = billsAfterPrEdit.find((b: any) => b.billId === prPurchaseC.id);
    check('Editing a return does not double-count its own prior effect on the bill\'s balanceDue (4200 - 4000 = 200, not 4200 - 500 - 4000 = -300)',
      prPurchaseCBillAfterEdit?.balanceDue === 200, JSON.stringify(prPurchaseCBillAfterEdit));

    console.log('\nTest 25: Goods Returns correctly reverse ledger balances, account postings, and GST report figures...');

    // Dedicated sale + return pair, isolated from Tests 23/24's other fixtures, so the
    // before/after net-balance delta is attributable only to this one new return.
    await salesService.createSale(company.id, actor, {
      invoiceNumber: 9604, date: '2026-05-01', customerId: returnCustomerId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 20, rate: 100, gstPercentage: 5 }]
    });
    const srSaleD = await db.get('SELECT id, invoice_number, total_amount, taxable_value, gst_amount, date FROM sales WHERE invoice_number = 9604 AND company_id = ?', [company.id]);

    const netBalancesBeforeSalesReturn = await reportsRepository.getAccountNetBalances(company.id);
    const customerNetBefore = netBalancesBeforeSalesReturn.find((b: any) => b.id === returnCustomerId)?.net_dr ?? 0;

    const returnDId = await salesReturnService.createSalesReturn(company.id, actor, {
      returnNumber: 10, date: '2026-05-05', customerId: returnCustomerId, financialYear: '2025-26',
      againstSaleId: srSaleD.id, againstBillDate: srSaleD.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 5 }]
    });
    const srReturnD = await db.get('SELECT id, return_number, total_amount, taxable_value, gst_amount, date FROM sales_returns WHERE id = ?', [returnDId]);

    const netBalancesAfterSalesReturn = await reportsRepository.getAccountNetBalances(company.id);
    const customerNetAfter = netBalancesAfterSalesReturn.find((b: any) => b.id === returnCustomerId)?.net_dr ?? 0;

    check('A sales return reduces the customer\'s net balance by its own total_amount (credits them)',
      customerNetBefore - customerNetAfter === srReturnD.total_amount,
      `before=${customerNetBefore} after=${customerNetAfter} returnTotal=${srReturnD.total_amount}`);

    await purchaseService.createPurchase(company.id, actor, {
      purchaseNumber: 9704, entryNo: 9704, date: '2026-05-01', supplierId: returnSupplierId, financialYear: '2025-26',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 20, rate: 100, gstPercentage: 5 }]
    });
    const prPurchaseD = await db.get('SELECT id, total_amount, taxable_value, gst_amount, date FROM purchases WHERE entry_no = 9704 AND company_id = ?', [company.id]);

    const netBalancesBeforePurchaseReturn = await reportsRepository.getAccountNetBalances(company.id);
    const supplierNetBefore = netBalancesBeforePurchaseReturn.find((b: any) => b.id === returnSupplierId)?.net_dr ?? 0;

    const returnDId2 = await purchaseReturnService.createPurchaseReturn(company.id, actor, {
      returnNumber: 10, date: '2026-05-05', supplierId: returnSupplierId, financialYear: '2025-26',
      againstPurchaseId: prPurchaseD.id, againstBillDate: prPurchaseD.date, returnType: 'Grey',
      items: [{ categoryId: quality.category_id, qualityId: quality.id, descriptionId: description.id, hsnId: hsn.id, meters: 5, rate: 100, gstPercentage: 5 }]
    });
    const prReturnD = await db.get('SELECT id, return_number, total_amount, taxable_value, gst_amount, date FROM purchase_returns WHERE id = ?', [returnDId2]);

    const netBalancesAfterPurchaseReturn = await reportsRepository.getAccountNetBalances(company.id);
    const supplierNetAfter = netBalancesAfterPurchaseReturn.find((b: any) => b.id === returnSupplierId)?.net_dr ?? 0;

    check('A purchase return reduces the supplier\'s net balance by its own total_amount (debits them)',
      supplierNetAfter - supplierNetBefore === prReturnD.total_amount,
      `before=${supplierNetBefore} after=${supplierNetAfter} returnTotal=${prReturnD.total_amount}`);

    const customerPostings = await reportsRepository.getAccountPostings(company.id, returnCustomerId);
    const salesReturnPosting = customerPostings.find((p: any) => p.id === returnDId);
    check('getAccountPostings lists the sales return as its own \'Sales Return\' row with the credit/debit swapped from a normal sale',
      !!salesReturnPosting && salesReturnPosting.voucherType === 'Sales Return' && salesReturnPosting.debit === 0 && salesReturnPosting.credit === srReturnD.total_amount,
      JSON.stringify(salesReturnPosting));

    const supplierPostings = await reportsRepository.getAccountPostings(company.id, returnSupplierId);
    const purchaseReturnPosting = supplierPostings.find((p: any) => p.id === returnDId2);
    check('getAccountPostings lists the purchase return as its own \'Purchase Return\' row with the credit/debit swapped from a normal purchase',
      !!purchaseReturnPosting && purchaseReturnPosting.voucherType === 'Purchase Return' && purchaseReturnPosting.credit === 0 && purchaseReturnPosting.debit === prReturnD.total_amount,
      JSON.stringify(purchaseReturnPosting));

    const gstReport = await reportsService.getGstReport(company.id);
    const originalInvoiceRow = gstReport.sales.find((s: any) => s.voucherNo === srSaleD.invoice_number && s.taxable > 0);
    const salesReturnGstRow = gstReport.sales.find((s: any) => s.voucherNo === srReturnD.return_number && s.taxable < 0);
    check('getGstReport includes the sales return as a separate negative-signed line, not netted into the original invoice\'s row',
      !!originalInvoiceRow && originalInvoiceRow.taxable === srSaleD.taxable_value && originalInvoiceRow.total === srSaleD.total_amount &&
      !!salesReturnGstRow && salesReturnGstRow.taxable === -srReturnD.taxable_value && salesReturnGstRow.total === -srReturnD.total_amount &&
      salesReturnGstRow.cgst === -(srReturnD.gst_amount / 2) && salesReturnGstRow.sgst === -(srReturnD.gst_amount / 2) &&
      originalInvoiceRow !== salesReturnGstRow,
      JSON.stringify({ originalInvoiceRow, salesReturnGstRow }));

    await closeDb();
    console.log('\nDatabase closed.');

    try {
      if (fs.existsSync(TEST_DB_PATH)) {
        fs.unlinkSync(TEST_DB_PATH);
      }
    } catch {
      // ignore cleanup errors
    }
  } catch (err: any) {
    console.error('❌ Test crashed with error:', err.stack || err);
    passed = false;
  }

  console.log('----------------------------------------------------');
  if (passed) {
    console.log('VERIFICATION SUMMARY: ALL TEST CASES PASSED SUCCESSFULLY');
    process.exit(0);
  } else {
    console.log('VERIFICATION SUMMARY: SOME TEST CASES ENCOUNTERED FAILURES');
    process.exit(1);
  }
}

runTests();
