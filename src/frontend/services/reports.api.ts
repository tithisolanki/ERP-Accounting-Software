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
  }
};
