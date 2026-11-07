import crypto from 'crypto';
import { getDb } from '../db/index';
import { auditService } from './audit.service';
import { Payment, Receipt } from '../types/Voucher';
import { paymentRepository, receiptRepository } from '../repositories/cashflow.repository';

type CashflowRecord = Payment | Receipt;
type CashflowRepo = typeof paymentRepository;

function createCashflowService(type: 'payment' | 'receipt', repository: CashflowRepo) {
  const label = type === 'payment' ? 'Payment' : 'Receipt';

  return {
    async getAll(companyId: string): Promise<CashflowRecord[]> {
      return repository.findAll(companyId);
    },

    async create(
      companyId: string,
      user: { id: string; username: string },
      body: any
    ): Promise<string> {
      const accountId = body.accountId || body.partyId;
      const { amount, date, paymentMode, referenceNumber, notes } = body;
      if (!accountId || !amount || !date || !paymentMode) {
        throw new Error(`Missing required ${type} fields.`);
      }

      const db = await getDb();
      const id = crypto.randomUUID();

      const record: CashflowRecord = {
        id,
        company_id: companyId,
        account_id: accountId,
        amount: Number(amount),
        date,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        notes
      };

      await repository.create(db, record);
      await auditService.log(
        companyId, user.id, user.username,
        `${label} Created`,
        `Recorded ${label} for Account ID ${accountId}. Amount: ${amount}`
      );

      return id;
    },

    async delete(
      companyId: string,
      id: string,
      user: { id: string; username: string }
    ): Promise<void> {
      const db = await getDb();
      const record = await repository.findById(companyId, id);
      if (!record) {
        throw new Error(`${label} record not found.`);
      }

      await repository.delete(db, id);
      await auditService.log(
        companyId, user.id, user.username,
        `${label} Deleted`,
        `Deleted ${type} record for amount: ${record.amount}`
      );
    }
  };
}

export const paymentService = createCashflowService('payment', paymentRepository);
export const receiptService = createCashflowService('receipt', receiptRepository);
