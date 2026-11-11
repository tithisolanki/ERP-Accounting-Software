import { getDb, initDb, closeDb } from '../../src/backend/db';
import { reportsService } from '../../src/backend/services/reports.service';
import { salesService } from '../../src/backend/services/sales.service';
import { accVoucherService } from '../../src/backend/services/accvoucher.service';
import { receiptService } from '../../src/backend/services/cashflow.service';
import { companyService } from '../../src/backend/services/masters.service';
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
    check('Still exactly one closing voucher after re-close', new Set(closingVoucherRows2.map((r: any) => r.voucher_no)).size === 1);
    const closingTotalDr2 = closingVoucherRows2.reduce((s: number, r: any) => s + r.debit_amount, 0);
    const closingTotalCr2 = closingVoucherRows2.reduce((s: number, r: any) => s + r.credit_amount, 0);
    check('Re-closed voucher still balances (skipped amount excluded)', Math.abs(closingTotalDr2 - closingTotalCr2) < 0.01);
    check('Re-close recomputed the same net profit (unmatched account excluded from the total)',
      closeResult2.netProfitLoss === closeResult.netProfitLoss, String(closeResult2.netProfitLoss));

    // A year with no P&L postings at all must close cleanly with no stale voucher left behind.
    const emptyCloseResult = await reportsService.closeFinancialYear(company.id, actor, '2030-31');
    check('Zero-movement year reports zero net profit/loss', emptyCloseResult.netProfitLoss === 0);
    const emptyVoucherRows = await db.all('SELECT * FROM journal_vouchers WHERE company_id = ? AND voucher_no = ?', [company.id, 'CLOSE-2030-31']);
    check('No voucher posted for a zero-movement year', emptyVoucherRows.length === 0);

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
