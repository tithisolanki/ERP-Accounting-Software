import crypto from 'crypto';
import { openingRepository } from '../repositories/opening.repository';
import { accountRepository } from '../repositories/masters.repository';
import { Account, StockOpeningBalance } from '../types/Masters';

export function isDebitNatured(groupName: string): boolean {
  const debitGroups = [
    'Sundry Debtors',
    'Bank Account',
    'Cash In Hand',
    'Loans & Advances',
    'Direct Expenses',
    'Indirect Expenses'
  ];
  return debitGroups.includes(groupName);
}

export class OpeningService {
  // ==========================================
  // Account Opening Balances
  // ==========================================
  async getAccountOpeningBalances(companyId: string): Promise<Account[]> {
    const accounts = await openingRepository.findAllAccounts(companyId);
    return accounts.map(account => {
      const isDebit = isDebitNatured(account.group_name || '');
      let dc = account.opening_balance_dc;
      const amount = Math.abs(account.opening_balance || 0);

      if (!dc && amount > 0) {
        if ((account.opening_balance || 0) >= 0) {
          dc = isDebit ? 'Dr' : 'Cr';
        } else {
          dc = isDebit ? 'Cr' : 'Dr';
        }
      }

      return {
        ...account,
        opening_balance: amount,
        opening_balance_date: account.opening_balance_date || null,
        opening_balance_dc: dc || (isDebit ? 'Dr' : 'Cr')
      };
    });
  }

  async updateAccountOpening(
    id: string,
    companyId: string,
    amount: number,
    date: string,
    dc: string
  ): Promise<void> {
    const account = await accountRepository.findById(id, companyId);
    if (!account) {
      throw new Error('Account not found.');
    }

    const isDebit = isDebitNatured(account.group_name || '');
    let signedBalance = amount;

    if (isDebit) {
      signedBalance = dc === 'Dr' ? amount : -amount;
    } else {
      signedBalance = dc === 'Cr' ? amount : -amount;
    }

    const now = new Date().toISOString();
    await openingRepository.updateAccountOpening(id, companyId, signedBalance, date, dc, now);
  }

  async clearAccountOpening(id: string, companyId: string): Promise<void> {
    const now = new Date().toISOString();
    await openingRepository.clearAccountOpening(id, companyId, now);
  }

  // ==========================================
  // Stock Opening Balances
  // ==========================================
  async getStockOpeningBalances(companyId: string): Promise<StockOpeningBalance[]> {
    return openingRepository.findAllStock(companyId);
  }

  async saveStockOpening(companyId: string, data: any): Promise<void> {
    const { id, date, qualityId, balanceMeters, costPerMeter, stockType } = data;

    if (!date || !qualityId || balanceMeters === undefined || costPerMeter === undefined || !stockType) {
      throw new Error('Missing required stock opening parameters.');
    }

    const now = new Date().toISOString();

    if (id) {
      const existing = await openingRepository.findStockById(id, companyId);
      if (!existing) {
        throw new Error('Stock opening entry not found.');
      }

      const updatedStock: Partial<StockOpeningBalance> = {
        date,
        quality_id: qualityId,
        balance_meters: Number(balanceMeters),
        cost_per_meter: Number(costPerMeter),
        stock_type: stockType,
        updated_at: now
      };
      await openingRepository.updateStock(id, companyId, updatedStock);
    } else {
      const newStock: StockOpeningBalance = {
        id: crypto.randomUUID(),
        company_id: companyId,
        date,
        quality_id: qualityId,
        balance_meters: Number(balanceMeters),
        cost_per_meter: Number(costPerMeter),
        stock_type: stockType,
        updated_at: now
      };
      await openingRepository.createStock(newStock);
    }
  }

  async deleteStockOpening(id: string, companyId: string): Promise<void> {
    const existing = await openingRepository.findStockById(id, companyId);
    if (!existing) {
      throw new Error('Stock opening entry not found.');
    }
    await openingRepository.deleteStock(id, companyId);
  }
}

export const openingService = new OpeningService();
