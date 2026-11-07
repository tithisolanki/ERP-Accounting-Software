import { API_URL, apiFetch, getHeaders } from './client';

type VoucherType = 'purchase' | 'sale' | 'challan';

const endpointFor = (type: VoucherType) =>
  type === 'purchase' ? 'purchases' : type === 'sale' ? 'sales' : 'challans';

export const TransactionsService = {
  async getSales(token: string): Promise<unknown[]> {
    return apiFetch('/api/transactions/sales', token);
  },

  async getPurchases(token: string): Promise<unknown[]> {
    return apiFetch('/api/transactions/purchases', token);
  },

  async getSalesCreditAccounts(token: string): Promise<string[]> {
    return apiFetch('/api/transactions/sales/credit-accounts', token);
  },

  async getPurchaseDebitAccounts(token: string): Promise<string[]> {
    return apiFetch('/api/transactions/purchases/debit-accounts', token);
  },

  async list(type: VoucherType, token: string): Promise<unknown[]> {
    return apiFetch(`/api/transactions/${endpointFor(type)}`, token);
  },

  async getNextNumber(type: VoucherType, token: string): Promise<{ nextNumber: number | string }> {
    return apiFetch(`/api/transactions/${endpointFor(type)}/next-number`, token);
  },

  async findByNumber(type: VoucherType, number: string, token: string): Promise<unknown> {
    return apiFetch(
      `/api/transactions/${endpointFor(type)}/find?number=${encodeURIComponent(number)}`,
      token
    );
  },

  async findChallanByNumber(number: string, token: string): Promise<unknown> {
    return apiFetch(
      `/api/transactions/challans/find?number=${encodeURIComponent(number)}`,
      token
    );
  },

  async getById(type: VoucherType, id: string, token: string): Promise<unknown> {
    return apiFetch(`/api/transactions/${endpointFor(type)}/${id}`, token);
  },

  async create(type: VoucherType, payload: unknown, token: string): Promise<unknown> {
    return apiFetch(`/api/transactions/${endpointFor(type)}`, token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(type: VoucherType, id: string, payload: unknown, token: string): Promise<unknown> {
    return apiFetch(`/api/transactions/${endpointFor(type)}/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async delete(type: VoucherType, id: string, token: string): Promise<void> {
    await apiFetch(`/api/transactions/${endpointFor(type)}/${id}`, token, { method: 'DELETE' });
  },

  async getPdfUrl(type: VoucherType, id: string, token: string): Promise<string> {
    return `${API_URL}/api/transactions/${endpointFor(type)}/${id}/pdf?token=${token}`;
  },

  async fetchPdf(type: VoucherType, id: string, token: string): Promise<Response> {
    const res = await fetch(`${API_URL}/api/transactions/${endpointFor(type)}/${id}/pdf`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch PDF');
    return res;
  }
};
