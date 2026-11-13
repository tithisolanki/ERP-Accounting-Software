import { apiFetch } from './client';

export interface DashboardSummary {
  todayPurchases: number;
  todaySales: number;
  totalStock: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  monthlySales: unknown[];
  monthlyPurchases: unknown[];
  recentActivities: unknown[];
}

export const ReportsService = {
  async getJournalRegister(token: string): Promise<unknown[]> {
    return apiFetch('/api/accvoucher/journal', token);
  },

  async getDashboardSummary(token: string): Promise<DashboardSummary> {
    return apiFetch('/api/reports/dashboard', token);
  },

  async getTrialBalance(
    token: string,
    filters: { startDate: string; endDate: string; balanceType: string }
  ): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    return apiFetch(`/api/reports/trial-balance?${query}`, token);
  },

  async getAccountsByGroup(token: string, name: string): Promise<{ id: string; name: string }[]> {
    return apiFetch(`/api/reports/accounts-by-group?name=${encodeURIComponent(name)}`, token);
  },

  async closeFinancialYear(token: string, financialYear: string): Promise<{
    voucherNo: string; netProfitLoss: number;
    closedAccounts: { name: string; amount: number }[]; skippedAccounts: { name: string; amount: number }[];
  }> {
    return apiFetch('/api/reports/close-financial-year', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ financialYear })
    });
  },

  async getOutstandingLedger(token: string, filters: {
    accountIds: string[]; asOfDate: string; paymentUpto: string;
    groupBy: 'account' | 'broker'; dueOnly: boolean; overdueDays?: number; detailed?: boolean;
    state?: string; city?: string; broker?: string; includingPaidBills?: boolean; includeAllCompanies?: boolean;
  }): Promise<{ groupName: string; bills: any[]; totalOutstanding: number }[]> {
    const query = new URLSearchParams({
      accountIds: filters.accountIds.join(','),
      asOfDate: filters.asOfDate,
      paymentUpto: filters.paymentUpto,
      groupBy: filters.groupBy,
      dueOnly: String(filters.dueOnly),
      ...(filters.overdueDays != null ? { overdueDays: String(filters.overdueDays) } : {}),
      ...(filters.detailed != null ? { detailed: String(filters.detailed) } : {}),
      ...(filters.state ? { state: filters.state } : {}),
      ...(filters.city ? { city: filters.city } : {}),
      ...(filters.broker ? { broker: filters.broker } : {}),
      ...(filters.includingPaidBills ? { includingPaidBills: String(filters.includingPaidBills) } : {}),
      ...(filters.includeAllCompanies ? { includeAllCompanies: String(filters.includeAllCompanies) } : {})
    }).toString();
    return apiFetch(`/api/reports/outstanding-ledger?${query}`, token);
  },

  async getOverdueInterest(token: string, filters: {
    accountIds: string[]; reportDate: string; periodStart: string; periodEnd: string;
    interestRate: number; maxDaysOfYear: number; includeEarlyPayments: boolean;
  }): Promise<{ groupName: string; bills: any[]; totalInterest: number }[]> {
    const query = new URLSearchParams({
      accountIds: filters.accountIds.join(','),
      reportDate: filters.reportDate,
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      interestRate: String(filters.interestRate),
      maxDaysOfYear: String(filters.maxDaysOfYear),
      includeEarlyPayments: String(filters.includeEarlyPayments)
    }).toString();
    return apiFetch(`/api/reports/overdue-interest?${query}`, token);
  }
};
