import { getDb, initDb, closeDb } from '../../src/backend/db';
import { reportsService } from '../../src/backend/services/reports.service';
import { salesService } from '../../src/backend/services/sales.service';
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
