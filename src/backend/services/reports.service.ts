import { getDb } from '../db/index';
import { reportsRepository } from '../repositories/reports.repository';
import { companyRepository, accountRepository } from '../repositories/masters.repository';
import { generateInvoicePdf, generateChallanPdf } from './pdf.service';
import { generateExcelBuffer } from './excel.service';

/** Primary groups whose balance is normally on the credit side. */
const CREDIT_NATURE_GROUPS = ['Sundry Creditors', 'Capital Account', 'Direct Income', 'Indirect Income', 'Duties & Taxes'];

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

  /**
   * Party ledger. Uses the same postings and Dr/Cr rules as getTrialBalance, so the
   * closing balance here always matches that account's line in the trial balance.
   * Balance is shown on the account's natural side: credit-nature groups count Cr - Dr.
   */
  async getAccountLedger(companyId: string, accountId: string) {
    const account = await reportsRepository.getAccountWithPrimaryGroup(companyId, accountId);
    if (!account) throw new Error('Account not found.');

    const creditNature = CREDIT_NATURE_GROUPS.includes(account.primary_group_name);
    const sign = creditNature ? -1 : 1;
    const openingNetDr = (account.opening_balance_dc === 'CR' ? -1 : 1) * (account.opening_balance || 0);

    let runningNetDr = openingNetDr;
    const postings = await reportsRepository.getAccountPostings(companyId, accountId);
    const ledgerRows = postings.map(({ ord, ...p }) => {
      runningNetDr += p.debit - p.credit;
      return { ...p, balance: sign * runningNetDr };
    });

    return {
      account,
      openingBalance: sign * openingNetDr,
      closingBalance: sign * runningNetDr,
      ledger: ledgerRows
    };
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
        lot_number: String(i.lot_number),
        pcs: i.pcs || 0,
        quantity: i.quantity,
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
        lot_number: String(i.lot_number),
        pcs: i.pcs || 0,
        quantity: i.quantity,
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
}
export const reportsService = new ReportsService();
