import { apiFetch } from './client';

export const AccVoucherService = {
  async getJournalVouchers(token: string): Promise<unknown[]> {
    return apiFetch('/api/accvoucher/journal', token);
  },

  async getBankVouchers(type: 'payment' | 'receipt', token: string): Promise<unknown[]> {
    return apiFetch(`/api/accvoucher/${type}`, token);
  },

  async create(payload: unknown, token: string): Promise<unknown> {
    return apiFetch('/api/accvoucher', token, { method: 'POST', body: JSON.stringify(payload) });
  },

  async deleteJournal(id: string, token: string): Promise<void> {
    await apiFetch(`/api/accvoucher/journal/${id}`, token, { method: 'DELETE' });
  },

  async deleteBank(type: 'payment' | 'receipt', id: string, token: string): Promise<void> {
    await apiFetch(`/api/accvoucher/${type}/${id}`, token, { method: 'DELETE' });
  }
};
