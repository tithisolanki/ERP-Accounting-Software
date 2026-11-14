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

  async getNextNumber(type: VoucherType, token: string, financialYear: string): Promise<{ nextNumber: number | string }> {
    return apiFetch(`/api/transactions/${endpointFor(type)}/next-number?fy=${encodeURIComponent(financialYear)}`, token);
  },

  async findByNumber(type: VoucherType, number: string, token: string, financialYear: string): Promise<unknown> {
    return apiFetch(
      `/api/transactions/${endpointFor(type)}/find?number=${encodeURIComponent(number)}&fy=${encodeURIComponent(financialYear)}`,
      token
    );
  },

  async findChallanByNumber(number: string, token: string, financialYear: string): Promise<unknown> {
    return apiFetch(
      `/api/transactions/challans/find?number=${encodeURIComponent(number)}&fy=${encodeURIComponent(financialYear)}`,
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

export interface SalesReturnItemPayload {
  categoryId: string;
  qualityId: string;
  descriptionId?: string | null;
  descriptionName: string;
  hsnId?: string | null;
  hsnCode: string;
  pcs?: number;
  meters: number;
  rate: number;
  gstPercentage: number;
}

export interface SalesReturnPayload {
  returnNumber: string;
  date: string;
  customerId: string;
  financialYear: string;
  againstSaleId: string;
  againstBillDate: string;
  returnType: string;
  brokerName?: string;
  challanNumber?: string;
  challanDate?: string;
  lrNumber?: string;
  lrDate?: string;
  remark?: string;
  confirmOverage?: boolean;
  items: SalesReturnItemPayload[];
}

/** Thrown when POST/PUT /api/transactions/sales-returns answers 409 -- the return would take
 * the bill's remaining balance negative. Carries the bill's own balanceDue so the page can show
 * it in a confirm dialog, then resubmit with confirmOverage: true. */
export class OverReturnApiError extends Error {
  balanceDue: number;
  constructor(message: string, balanceDue: number) {
    super(message);
    this.name = 'OverReturnApiError';
    this.balanceDue = balanceDue;
  }
}

async function saveSalesReturn(method: 'POST' | 'PUT', path: string, payload: SalesReturnPayload, token: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: getHeaders(token),
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 409 && typeof data.balanceDue === 'number') {
      throw new OverReturnApiError(data.error || "Return total exceeds the bill's remaining balance.", data.balanceDue);
    }
    throw new Error(data.error || `Request failed: ${path}`);
  }
  return data;
}

export const SalesReturnService = {
  async getAll(token: string): Promise<any[]> {
    return apiFetch('/api/transactions/sales-returns', token);
  },

  async getNextNumber(token: string, financialYear: string): Promise<{ nextNumber: number | string }> {
    return apiFetch(`/api/transactions/sales-returns/next-number?fy=${encodeURIComponent(financialYear)}`, token);
  },

  async create(payload: SalesReturnPayload, token: string): Promise<{ success: boolean }> {
    return saveSalesReturn('POST', '/api/transactions/sales-returns', payload, token);
  },

  async update(id: string, payload: SalesReturnPayload, token: string): Promise<{ success: boolean }> {
    return saveSalesReturn('PUT', `/api/transactions/sales-returns/${id}`, payload, token);
  },

  async delete(id: string, token: string): Promise<void> {
    await apiFetch(`/api/transactions/sales-returns/${id}`, token, { method: 'DELETE' });
  }
};
