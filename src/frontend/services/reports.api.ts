import { apiFetch } from './client';

export const ReportsService = {
  async getJournalRegister(token: string): Promise<unknown[]> {
    return apiFetch('/api/accvoucher/journal', token);
  },

  async getTrialBalance(
    token: string,
    filters: { startDate: string; endDate: string; balanceType: string }
  ): Promise<any[]> {
    const query = new URLSearchParams(filters).toString();
    return apiFetch(`/api/reports/trial-balance?${query}`, token);
  }
};
