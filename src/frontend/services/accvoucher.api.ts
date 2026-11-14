import { apiFetch } from './client';

export interface OutstandingBill {
  billId: string;
  billType: 'sale' | 'purchase';
  billNumber: string | number;
  date: string;
  totalAmount: number;
  allocated: number;
  balanceDue: number;
}

export const AccVoucherService = {
  async getJournalVouchers(token: string): Promise<unknown[]> {
    return apiFetch('/api/accvoucher/journal', token);
  },

  async getBankVouchers(type: 'payment' | 'receipt', token: string): Promise<unknown[]> {
    return apiFetch(`/api/accvoucher/${type}`, token);
  },

  async getOutstandingBills(accountId: string, token: string, excludeLineIds?: string[]): Promise<OutstandingBill[]> {
    const query = excludeLineIds && excludeLineIds.length ? `?exclude=${excludeLineIds.join(',')}` : '';
    return apiFetch(`/api/accvoucher/outstanding/${accountId}${query}`, token);
  },

  async create(payload: unknown, token: string): Promise<unknown> {
    return apiFetch('/api/accvoucher', token, { method: 'POST', body: JSON.stringify(payload) });
  },

  async deleteJournal(id: string, token: string): Promise<void> {
    await apiFetch(`/api/accvoucher/journal/${id}`, token, { method: 'DELETE' });
  },

  async deleteBank(type: 'payment' | 'receipt', id: string, token: string): Promise<void> {
    await apiFetch(`/api/accvoucher/${type}/${id}`, token, { method: 'DELETE' });
  },

  async getOutstandingBillsForAllocation(
    side: 'debtor' | 'creditor', accountId: string, token: string,
    options: { includeAllEntries?: boolean; excludeEntryNo?: string } = {}
  ): Promise<OutstandingBill[]> {
    const params = new URLSearchParams();
    if (options.includeAllEntries) params.set('includeAllEntries', 'true');
    if (options.excludeEntryNo) params.set('excludeEntryNo', options.excludeEntryNo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/accvoucher/allocation/${side}/outstanding/${accountId}${query}`, token);
  },

  async getAllocationEntries(side: 'debtor' | 'creditor', token: string): Promise<any[]> {
    return apiFetch(`/api/accvoucher/allocation/${side}`, token);
  },

  async getAllocationEntryDetail(side: 'debtor' | 'creditor', entryNo: string, token: string): Promise<{ header: any; bills: any[] }> {
    return apiFetch(`/api/accvoucher/allocation/${side}/entry/${entryNo}`, token);
  },

  async saveAllocationEntry(payload: unknown, token: string): Promise<unknown> {
    return apiFetch('/api/accvoucher/allocation', token, { method: 'POST', body: JSON.stringify(payload) });
  },

  async deleteAllocationEntry(side: 'debtor' | 'creditor', entryNo: string, token: string): Promise<void> {
    await apiFetch(`/api/accvoucher/allocation/${side}/${entryNo}`, token, { method: 'DELETE' });
  }
};
