import { Account, StockOpeningBalance } from '@shared/types';
import { apiFetch } from './client';

export const OpeningService = {
  async getAccountBalances(token: string): Promise<Account[]> {
    return apiFetch('/api/opening/accounts', token);
  },
  async saveAccountBalance(
    payload: { accountId: string; amount: number; date: string; dc: string },
    token: string
  ): Promise<any> {
    return apiFetch('/api/opening/accounts', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async deleteAccountBalance(accountId: string, token: string): Promise<any> {
    return apiFetch(`/api/opening/accounts/${accountId}`, token, {
      method: 'DELETE'
    });
  },
  async getStockBalances(token: string): Promise<StockOpeningBalance[]> {
    return apiFetch('/api/opening/stocks', token);
  },
  async saveStockBalance(
    payload: {
      id?: string;
      date: string;
      qualityId: string;
      balanceMeters: number;
      costPerMeter: number;
      stockType: string;
    },
    token: string
  ): Promise<any> {
    return apiFetch('/api/opening/stocks', token, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async deleteStockBalance(id: string, token: string): Promise<any> {
    return apiFetch(`/api/opening/stocks/${id}`, token, {
      method: 'DELETE'
    });
  }
};
