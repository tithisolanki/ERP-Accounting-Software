import { getDb, withTransaction } from '../db/index';
import { reportsRepository } from '../repositories/reports.repository';
import { companyRepository, accountRepository } from '../repositories/masters.repository';
import { accVoucherService } from './accvoucher.service';
import { accVoucherRepository } from '../repositories/accvoucher.repository';
import { generateInvoicePdf, generateChallanPdf, generateLedgerPdf } from './pdf.service';
import { generateExcelBuffer } from './excel.service';

/** Primary groups whose balance is normally on the credit side. */
// The last six come from AC_PLUS imports (scripts/acplus).
const CREDIT_NATURE_GROUPS = ['Sundry Creditors', 'Capital Account', 'Direct Income', 'Indirect Income', 'Duties & Taxes',
  'Sales', 'Secured Loans', 'Unsecured Loans', 'Bank OverDraft', 'Current Liabilities', 'Other Liabilities'];

/** Primary groups closed to zero (reversed to the company's P&L closing account) at year-end. Not a full P&L/BS classification — see R21. */
const PNL_GROUPS = ['Direct Income', 'Indirect Income', 'Direct Expenses', 'Indirect Expenses', 'Sales', 'Purchase'];

/** "2026-27" -> the FY's first and last calendar day. Throws if the string isn't that exact shape. */
function parseFinancialYear(financialYear: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(financialYear || '');
  if (!match || Number(match[2]) !== (Number(match[1]) + 1) % 100) {
    throw new Error(`Invalid financial year "${financialYear}". Expected the form "2026-27".`);
  }
  const year = Number(match[1]);
  return { start: `${year}-04-01`, end: `${year + 1}-03-31` };
}

export class ReportsService {
  async getDashboardSummary(companyId: string | null, isSuperAdmin: boolean) {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayPur = await reportsRepository.getPurchasesTotalByDate(companyId, todayStr);
    const todaySal = await reportsRepository.getSalesTotalByDate(companyId, todayStr);
    const monthlySales = await reportsRepository.getMonthlySales(companyId);
    const monthlyPurchases = await reportsRepository.getMonthlyPurchases(companyId);
    const recentLogs = await reportsRepository.getRecentLogs(companyId);

    let totalStock = 0;
    let totalReceivables = 0;
    let totalPayables = 0;
    if (companyId) {
      const stock = await reportsRepository.getStockByQuality(companyId);
      totalStock = stock.reduce((sum, r) => sum + r.Current_Stock, 0);

      for (const acc of await reportsRepository.getAccountNetBalances(companyId)) {
        if (acc.primary_group === 'Sundry Debtors' && acc.net_dr > 0) totalReceivables += acc.net_dr;
        if (acc.primary_group === 'Sundry Creditors' && acc.net_dr < 0) totalPayables += -acc.net_dr;
      }
    }

    return {
      todayPurchases: todayPur,
      todaySales: todaySal,
      totalStock,
      outstandingReceivables: totalReceivables,
      outstandingPayables: totalPayables,
      monthlySales: monthlySales.reverse(),
      monthlyPurchases: monthlyPurchases.reverse(),
      recentActivities: recentLogs
    };
  }

  async getAccountsByPrimaryGroup(companyId: string, primaryGroupName: string) {
    return reportsRepository.getAccountsByPrimaryGroup(companyId, primaryGroupName);
  }

  /**
   * Party ledger. Uses the same postings and Dr/Cr rules as getTrialBalance, so the
   * closing balance here always matches that account's line in the trial balance.
   * Balance is shown on the account's natural side: credit-nature groups count Cr - Dr.
   */
  async getAccountLedger(companyId: string, accountId: string, startDate?: string, endDate?: string) {
    const account = await reportsRepository.getAccountWithPrimaryGroup(companyId, accountId);
    if (!account) throw new Error('Account not found.');

    const creditNature = CREDIT_NATURE_GROUPS.includes(account.primary_group_name);
    const sign = creditNature ? -1 : 1;
    const openingNetDr = (account.opening_balance_dc === 'CR' ? -1 : 1) * (account.opening_balance || 0);

    let runningNetDr = openingNetDr;
    let openingNetDrAtRangeStart = openingNetDr;
    const postings = await reportsRepository.getAccountPostings(companyId, accountId);
    const ledgerRows: any[] = [];
    for (const { ord, ...p } of postings) {
      if (endDate && p.date > endDate) break;
      if (startDate && p.date < startDate) {
        runningNetDr += p.debit - p.credit;
        openingNetDrAtRangeStart = runningNetDr;
        continue;
      }
      runningNetDr += p.debit - p.credit;
      ledgerRows.push({ ...p, balance: sign * runningNetDr });
    }

    return {
      account,
      openingBalance: sign * openingNetDrAtRangeStart,
      closingBalance: sign * runningNetDr,
      ledger: ledgerRows
    };
  }

  /** One PDF covering several accounts' ledgers, each on its own page(s) — see generateLedgerPdf. */
  async getPartyLedgerPdf(companyId: string, accountIds: string[], startDate?: string, endDate?: string): Promise<Uint8Array> {
    const company = await companyRepository.findById(companyId);
    const accounts = [];
    for (const accountId of accountIds) {
      const { account, openingBalance, closingBalance, ledger } = await this.getAccountLedger(companyId, accountId, startDate, endDate);
      accounts.push({ account, openingBalance, closingBalance, ledger });
    }
    return generateLedgerPdf({
      company: { name: company?.name || 'TexFin Vendor' },
      accounts,
      startDate: startDate || '',
      endDate: endDate || ''
    });
  }

  /**
   * Outstanding & Ageing (R6 part 2): bills across several accounts, grouped by account or
   * broker, with each bill's days-overdue (asOfDate - (bill date + the account's credit_days)).
   * dueOnly keeps only bills past their credit days; overdueDaysThreshold (if given) raises that
   * bar further, matching AC_PLUS's separate "Due Bills" and "Over Due Days" controls.
   */
  async getOutstandingLedger(
    companyId: string, accountIds: string[], asOfDate: string, paymentUpto: string,
    groupBy: 'account' | 'broker', dueOnly: boolean, overdueDaysThreshold?: number
  ) {
    const bills = await accVoucherRepository.getOutstandingBillsForAccounts(companyId, accountIds, asOfDate, paymentUpto);
    const asOf = new Date(asOfDate).getTime();

    const aged = bills
      .map(b => {
        const dueDate = new Date(b.date);
        dueDate.setDate(dueDate.getDate() + (b.credit_days || 0));
        const overdueDays = Math.floor((asOf - dueDate.getTime()) / 86400000);
        return { ...b, dueDate: dueDate.toISOString().split('T')[0], overdueDays };
      })
      .filter(b => !dueOnly || b.overdueDays > 0)
      .filter(b => overdueDaysThreshold == null || b.overdueDays >= overdueDaysThreshold);

    // Grouped by accountId (not name, which two accounts could share); broker groups by the
    // broker string itself since there's no separate broker id to key on here.
    const groups = new Map<string, { groupName: string; bills: any[] }>();
    for (const bill of aged) {
      const key = groupBy === 'broker' ? (bill.broker || '(No Broker)') : bill.accountId;
      const groupName = groupBy === 'broker' ? (bill.broker || '(No Broker)') : bill.accountName;
      if (!groups.has(key)) groups.set(key, { groupName, bills: [] });
      groups.get(key)!.bills.push(bill);
    }

    // Receivable (sales) and payable (purchases) are kept separate -- summing them into one
    // "total outstanding" would mean nothing once a group has both, or both are selected.
    return Array.from(groups.values()).map(({ groupName, bills: groupBills }) => ({
      groupName,
      bills: groupBills,
      totalReceivable: groupBills.filter(b => b.billType === 'sale').reduce((sum, b) => sum + b.balanceDue, 0),
      totalPayable: groupBills.filter(b => b.billType === 'purchase').reduce((sum, b) => sum + b.balanceDue, 0)
    }));
  }

  async getGstReport(companyId: string) {
    const companyState = await reportsRepository.getCompanyState(companyId);

    const salesGst = await reportsRepository.getSalesGst(companyId);
    const salesList = salesGst.map(s => {
      const pState = (s.party_state || '').toLowerCase();
      const isInterstate = pState && companyState && !companyState.includes(pState) && !pState.includes(companyState);
      const cgst = isInterstate ? 0 : s.gst_amount / 2;
      const sgst = isInterstate ? 0 : s.gst_amount / 2;
      const igst = isInterstate ? s.gst_amount : 0;
      return {
        voucherNo: s.invoice_number,
        date: s.date,
        partyName: s.party_name,
        gstin: s.gst_number || 'N/A',
        taxable: s.taxable_value,
        cgst,
        sgst,
        igst,
        total: s.total_amount
      };
    });

    const purchaseGst = await reportsRepository.getPurchasesGst(companyId);
    const purchasesList = purchaseGst.map(p => {
      const pState = (p.party_state || '').toLowerCase();
      const isInterstate = pState && companyState && !companyState.includes(pState) && !pState.includes(companyState);
      const cgst = isInterstate ? 0 : p.gst_amount / 2;
      const sgst = isInterstate ? 0 : p.gst_amount / 2;
      const igst = isInterstate ? p.gst_amount : 0;
      return {
        entryNo: p.purchase_number,
        voucherNo: p.entry_no || p.purchase_number,
        date: p.date,
        partyName: p.party_name,
        gstin: p.gst_number || 'N/A',
        taxable: p.taxable_value,
        cgst,
        sgst,
        igst,
        total: p.total_amount
      };
    });

    return {
      sales: salesList,
      purchases: purchasesList
    };
  }

  async getInvoicePdf(salesId: string, companyId: string, copies: string[]) {
    const sale = await reportsRepository.getSalesInvoiceForPdf(salesId, companyId);
    if (!sale) throw new Error('Invoice not found.');

    const customer = await accountRepository.findById(sale.customer_id, companyId);
    if (!customer) throw new Error('Customer not found.');

    const company = await companyRepository.findById(companyId);
    const items = await reportsRepository.getSalesItemsForPdf(salesId);

    let deliveryAddress = sale.delivery_at || '';
    if (deliveryAddress) {
      const db = await getDb();
      const targetAccount = await db.get('SELECT address FROM accounts WHERE name = ? AND company_id = ?', [sale.delivery_at, companyId]);
      if (targetAccount && targetAccount.address) {
        deliveryAddress = targetAccount.address;
      }
    }

    const invoicePayload = {
      company: {
        name: company?.name || 'TexFin Vendor',
        gst_number: company?.gst_number || undefined,
        pan_number: company?.pan_number || undefined,
        address: company?.address || undefined,
        phone: company?.phone || undefined,
        email: company?.email || undefined,
        bank1_name: company?.bank1_name || undefined,
        bank1_account_no: company?.bank1_account_no || undefined,
        bank1_ifsc: company?.bank1_ifsc || undefined,
        bank2_name: company?.bank2_name || undefined,
        bank2_account_no: company?.bank2_account_no || undefined,
        bank2_ifsc: company?.bank2_ifsc || undefined,
        credit_interest_rate: company?.credit_interest_rate ?? undefined
      },
      customer: {
        name: customer.name,
        gst_number: customer.gst_number || undefined,
        address: customer.address || undefined,
        state: customer.state || undefined,
        mobile_number: customer.mobile_number || undefined
      },
      invoice_number: String(sale.invoice_number),
      date: sale.date,
      financial_year: sale.financial_year,
      taxable_value: sale.taxable_value,
      gst_amount: sale.gst_amount,
      total_amount: sale.total_amount,
      challan_number: sale.challan_number ? String(sale.challan_number) : '',
      challan_date: sale.challan_date || '',
      credit_days: sale.credit_days || 0,
      broker_name: sale.broker_name || '',
      bale_number: sale.bale_number || '',
      order_number: sale.order_number || '',
      order_date: sale.order_date || '',
      sales_type: sale.sales_type || '',
      lr_number: sale.lr_number || '',
      lr_date: sale.lr_date || '',
      transport: sale.transport || '',
      delivery_at: deliveryAddress,
      vehicle_number: sale.vehicle_number || '',
      remark: sale.remark || '',
      credit_account: sale.credit_account || '',
      cartage: sale.cartage || 0,
      postage: sale.postage || 0,
      less: sale.less || 0,
      less_add: sale.less_add || 0,
      rounded_off: sale.rounded_off || 0,
      items: items.map(i => ({
        product_name: i.product_name,
        hsn_code: i.hsn_code !== null && i.hsn_code !== undefined ? String(i.hsn_code) : '',
        cloth_type: i.cloth_type || '',
        pcs: i.pcs || 0,
        quantity: i.meters,
        rate: i.rate,
        gst_percentage: i.gst_percentage,
        taxable_value: i.taxable_value,
        gst_amount: i.gst_amount,
        total_amount: i.total_amount
      }))
    };

    return generateInvoicePdf(invoicePayload, copies);
  }

  async getChallanPdf(challanId: string, companyId: string, copies: string[]) {
    const challan = await reportsRepository.getDeliveryChallanForPdf(challanId, companyId);
    if (!challan) throw new Error('Challan not found.');

    const customer = await accountRepository.findById(challan.customer_id, companyId);
    if (!customer) throw new Error('Customer not found.');

    const company = await companyRepository.findById(companyId);
    const items = await reportsRepository.getDeliveryChallanItemsForPdf(challanId);

    let deliveryAddress = challan.delivery_at || '';
    if (deliveryAddress) {
      const db = await getDb();
      const targetAccount = await db.get('SELECT address FROM accounts WHERE name = ? AND company_id = ?', [challan.delivery_at, companyId]);
      if (targetAccount && targetAccount.address) {
        deliveryAddress = targetAccount.address;
      }
    }

    const challanPayload = {
      company: {
        name: company?.name || 'TexFin Vendor',
        gst_number: company?.gst_number || undefined,
        pan_number: company?.pan_number || undefined,
        address: company?.address || undefined,
        phone: company?.phone || undefined,
        email: company?.email || undefined
      },
      customer: {
        name: customer.name,
        gst_number: customer.gst_number || undefined,
        address: customer.address || undefined,
        state: customer.state || undefined,
        mobile_number: customer.mobile_number || undefined
      },
      challan_number: String(challan.challan_number),
      date: challan.date,
      financial_year: challan.financial_year,
      taxable_value: challan.taxable_value,
      gst_amount: challan.gst_amount,
      total_amount: challan.total_amount,
      broker_name: challan.broker_name || '',
      bale_number: challan.bale_number || '',
      order_number: challan.order_number || '',
      order_date: challan.order_date || '',
      sales_type: challan.sales_type || '',
      lr_number: challan.lr_number || '',
      lr_date: challan.lr_date || '',
      transport: challan.transport || '',
      delivery_at: deliveryAddress,
      vehicle_number: challan.vehicle_number || '',
      remark: challan.remark || '',
      rounded_off: challan.rounded_off || 0,
      items: items.map(i => ({
        product_name: i.product_name,
        hsn_code: i.hsn_code !== null && i.hsn_code !== undefined ? String(i.hsn_code) : '',
        cloth_type: i.cloth_type || '',
        pcs: i.pcs || 0,
        quantity: i.meters,
        rate: i.rate,
        gst_percentage: i.gst_percentage,
        taxable_value: i.taxable_value,
        gst_amount: i.gst_amount,
        total_amount: i.total_amount,
        piece_meters: i.piece_meters || ''
      }))
    };

    return generateChallanPdf(challanPayload, copies);
  }

  async exportExcel(companyId: string, type: string, accountId: string | null): Promise<{ buffer: any; filename: string }> {
    let sheetsPayload: Array<{ name: string; data: any[] }> = [];
    let filename = 'TexFin_Report.xlsx';

    if (type === 'ledger' && accountId) {
      const { account, openingBalance, ledger } = await this.getAccountLedger(companyId, accountId);
      const formatted = [
        { Date: account.opening_balance_date || '', Particulars: 'Opening Balance', Debit: '-', Credit: '-', Balance: openingBalance },
        ...ledger.map((e: any) => ({
          Date: e.date,
          Particulars: e.particulars,
          Debit: e.debit || '-',
          Credit: e.credit || '-',
          Balance: e.balance
        }))
      ];
      sheetsPayload = [{ name: 'Account Ledger', data: formatted }];
      filename = `Ledger_${account.name.replace(/\s+/g, '_')}.xlsx`;
    } else if (type === 'stock') {
      const stock = await reportsRepository.getStockByQuality(companyId);
      sheetsPayload = [{ name: 'Inventory Stock', data: stock }];
      filename = 'Inventory_Stock_Report.xlsx';
    } else {
      throw new Error('Unsupported export type.');
    }

    const excelBuffer = generateExcelBuffer(sheetsPayload);
    return { buffer: excelBuffer, filename };
  }

  async getTrialBalance(
    companyId: string,
    startDate: string,
    endDate: string,
    balanceType: 'with_opening' | 'without_opening' | 'only_opening'
  ) {
    const db = await getDb();

    // 1. Fetch all accounts for the company
    const accounts = await db.all(`
      SELECT 
        a.id, 
        a.name, 
        a.opening_balance, 
        a.opening_balance_dc, 
        a.group_name, 
        pg.id as primary_group_id,
        pg.name as primary_group_name
      FROM accounts a
      LEFT JOIN groups g ON a.group_name = g.name AND g.company_id = a.company_id
      LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
      WHERE a.company_id = ?
    `, [companyId]);

    // Use a map to track running totals for each account
    const accountMap = new Map<string, any>();
    const virtualAccountMap = new Map<string, any>();

    accounts.forEach(a => {
      const opening = a.opening_balance || 0;
      let opDebit = 0;
      let opCredit = 0;

      if (balanceType !== 'without_opening') {
        if (a.opening_balance_dc === 'CR') {
          opCredit = opening;
        } else {
          opDebit = opening;
        }
      }

      accountMap.set(a.id, {
        id: a.id,
        name: a.name,
        groupName: a.group_name || 'Unassigned',
        primaryGroupId: a.primary_group_id || 'Unassigned',
        primaryGroupName: a.primary_group_name || 'Unassigned',
        debit: opDebit,
        credit: opCredit
      });
    });

    // Helper to add debit/credit by account ID
    const addBalance = (id: string, debitAmount: number, creditAmount: number) => {
      const acc = accountMap.get(id);
      if (acc) {
        acc.debit += debitAmount;
        acc.credit += creditAmount;
      }
    };

    // Helper to add balance by account Name (for Sales/Purchases credit/debit accounts)
    const addBalanceByName = (name: string, debitAmount: number, creditAmount: number, groupFallback: string) => {
      if (!name) return;
      const normalized = name.trim().toUpperCase();
      // Try to find matching account in accountMap
      const matched = Array.from(accountMap.values()).find(a => a.name.trim().toUpperCase() === normalized);
      if (matched) {
        matched.debit += debitAmount;
        matched.credit += creditAmount;
      } else {
        // If not found, add to virtualAccountMap
        if (!virtualAccountMap.has(normalized)) {
          let primaryGroupName = 'Unassigned';
          if (groupFallback.includes('Sales')) {
            primaryGroupName = 'Direct Income';
          } else if (groupFallback.includes('Purchase')) {
            primaryGroupName = 'Direct Expenses';
          } else if (groupFallback.includes('Cash')) {
            primaryGroupName = 'Cash In Hand';
          } else if (groupFallback.includes('Bank')) {
            primaryGroupName = 'Bank Account';
          }

          virtualAccountMap.set(normalized, {
            id: `VIRTUAL_${normalized}`,
            name: name.trim(),
            groupName: groupFallback,
            primaryGroupId: 'Unassigned',
            primaryGroupName,
            debit: 0,
            credit: 0
          });
        }
        const vAcc = virtualAccountMap.get(normalized);
        vAcc.debit += debitAmount;
        vAcc.credit += creditAmount;
      }
    };

    if (balanceType !== 'only_opening') {
      // 2. Fetch Sales within period
      const sales = await db.all(`
        SELECT customer_id, credit_account, total_amount 
        FROM sales 
        WHERE company_id = ? AND date >= ? AND date <= ?
      `, [companyId, startDate, endDate]);

      sales.forEach(s => {
        addBalance(s.customer_id, s.total_amount, 0);
        addBalanceByName(s.credit_account || 'SALES', 0, s.total_amount, 'Sales Account');
      });

      // 3. Fetch Purchases within period
      const purchases = await db.all(`
        SELECT supplier_id, debit_account, total_amount 
        FROM purchases 
        WHERE company_id = ? AND date >= ? AND date <= ?
      `, [companyId, startDate, endDate]);

      purchases.forEach(p => {
        addBalance(p.supplier_id, 0, p.total_amount);
        addBalanceByName(p.debit_account || 'PURCHASE', p.total_amount, 0, 'Purchase Account');
      });

      // 4. Fetch Payments within period
      const payments = await db.all(`
        SELECT account_id, amount, notes, payment_mode 
        FROM payments 
        WHERE company_id = ? AND date >= ? AND date <= ?
      `, [companyId, startDate, endDate]);

      payments.forEach(p => {
        addBalance(p.account_id, p.amount, 0);
        let bankName = 'CASH IN HAND';
        if (p.payment_mode !== 'Cash') {
          const match = p.notes?.match(/\[Bank:\s*([^\]]+)\]/);
          if (match && match[1]) {
            bankName = match[1];
          } else {
            bankName = 'BANK ACCOUNT';
          }
        }
        addBalanceByName(bankName, 0, p.amount, p.payment_mode === 'Cash' ? 'Cash In Hand' : 'Bank Account');
      });

      // 5. Fetch Receipts within period
      const receipts = await db.all(`
        SELECT account_id, amount, notes, payment_mode 
        FROM receipts 
        WHERE company_id = ? AND date >= ? AND date <= ?
      `, [companyId, startDate, endDate]);

      receipts.forEach(r => {
        addBalance(r.account_id, 0, r.amount);
        let bankName = 'CASH IN HAND';
        if (r.payment_mode !== 'Cash') {
          const match = r.notes?.match(/\[Bank:\s*([^\]]+)\]/);
          if (match && match[1]) {
            bankName = match[1];
          } else {
            bankName = 'BANK ACCOUNT';
          }
        }
        addBalanceByName(bankName, r.amount, 0, r.payment_mode === 'Cash' ? 'Cash In Hand' : 'Bank Account');
      });

      // 6. Fetch Journal Vouchers within period
      const journals = await db.all(`
        SELECT account_id, debit_amount, credit_amount 
        FROM journal_vouchers 
        WHERE company_id = ? AND date >= ? AND date <= ?
      `, [companyId, startDate, endDate]);

      journals.forEach(j => {
        addBalance(j.account_id, j.debit_amount || 0, j.credit_amount || 0);
      });
    }

    // Combine real and virtual accounts, and net them out
    const combined = [...Array.from(accountMap.values()), ...Array.from(virtualAccountMap.values())];

    const results = combined.map(acc => {
      const netDebit = acc.debit;
      const netCredit = acc.credit;
      let finalDebit = 0;
      let finalCredit = 0;

      if (netDebit >= netCredit) {
        finalDebit = netDebit - netCredit;
      } else {
        finalCredit = netCredit - netDebit;
      }

      return {
        id: acc.id,
        name: acc.name,
        groupName: acc.groupName,
        primaryGroupId: acc.primaryGroupId,
        primaryGroupName: acc.primaryGroupName,
        debit: finalDebit,
        credit: finalCredit
      };
    }).filter(acc => acc.debit > 0 || acc.credit > 0); // Only return non-zero balances

    return results;
  }

  /**
   * Zeroes out P&L-group accounts' FY movement and transfers the net profit/loss to the
   * company's configured closing (Capital) account, as one journal voucher. Re-runnable:
   * calling this again for the same financialYear replaces the prior closing voucher.
   */
  async closeFinancialYear(companyId: string, user: { id: string; username: string }, financialYear: string) {
    const { start, end } = parseFinancialYear(financialYear);

    const company = await companyRepository.findById(companyId);
    if (!company?.pnl_closing_account_id) {
      throw new Error('Set a P&L closing account in Company Settings before closing a financial year.');
    }
    const closingAccount = await reportsRepository.getAccountWithPrimaryGroup(companyId, company.pnl_closing_account_id);
    if (!closingAccount || closingAccount.primary_group_name !== 'Capital Account') {
      throw new Error('The configured P&L closing account no longer exists or is not a Capital Account. Fix it in Company Settings before closing a financial year.');
    }

    const voucherNo = `CLOSE-${financialYear}`;
    // Delete any prior closing voucher BEFORE measuring this FY's movement: its reversal lines
    // are dated inside this same FY range, so leaving them in place would make a re-close see
    // its own previous output and compute a wrong (already-neutralized) net movement.
    await withTransaction(db => accVoucherRepository.deleteJournalVouchersByNo(db, companyId, voucherNo));

    const movements = await this.getTrialBalance(companyId, start, end, 'without_opening');
    const pnlRows = movements.filter(r => PNL_GROUPS.includes(r.primaryGroupName));
    const realRows = pnlRows.filter(r => !r.id.startsWith('VIRTUAL_'));
    const virtualRows = pnlRows.filter(r => r.id.startsWith('VIRTUAL_'));

    const lines = realRows
      .filter(r => r.debit !== r.credit)
      .map(r => ({
        accountId: r.id,
        debitAmount: r.credit,
        creditAmount: r.debit,
        particulars: `Year-end close FY ${financialYear}`
      }));

    const netProfitLoss = realRows.reduce((sum, r) => sum + (r.credit - r.debit), 0);
    if (Math.abs(netProfitLoss) > 0.005) {
      lines.push({
        accountId: company.pnl_closing_account_id,
        debitAmount: netProfitLoss < 0 ? -netProfitLoss : 0,
        creditAmount: netProfitLoss > 0 ? netProfitLoss : 0,
        particulars: `Year-end close FY ${financialYear}: net ${netProfitLoss >= 0 ? 'profit' : 'loss'}`
      });
    }

    if (lines.length > 0) {
      await accVoucherService.saveVoucher(companyId, user, {
        type: 'journal', voucherDate: end, voucherNo, voucherType: 'Books Closing', isNew: false, lines
      });
    }
    // Zero net movement (lines.length === 0): the prior voucher was already deleted above, nothing to repost.

    return {
      voucherNo,
      netProfitLoss,
      closedAccounts: realRows.map(r => ({ name: r.name, amount: r.credit - r.debit })),
      skippedAccounts: virtualRows.map(r => ({ name: r.name, amount: r.credit - r.debit }))
    };
  }
}
export const reportsService = new ReportsService();
