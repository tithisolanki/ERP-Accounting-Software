import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { accVoucherRepository } from '../repositories/accvoucher.repository';
import { auditService } from './audit.service';
import { BankVoucher } from '../types/Voucher';

export class AccVoucherService {
  async getGroupedVouchers(companyId: string, type: 'payment' | 'receipt' | 'journal'): Promise<any[]> {
    if (type === 'journal') {
      const rows = await accVoucherRepository.findRawJournalVouchers(companyId);
      const groupedMap = new Map<string, any>();
      rows.forEach((item: any) => {
        const vNo = item.voucher_no;
        if (!groupedMap.has(vNo)) {
          groupedMap.set(vNo, {
            voucherNo: vNo,
            date: item.date,
            voucherType: item.voucher_type,
            lines: []
          });
        }
        groupedMap.get(vNo)!.lines.push({
          id: item.id,
          accountId: item.account_id,
          accountName: item.account_name || '',
          debitAmount: item.debit_amount,
          creditAmount: item.credit_amount,
          particulars: item.particulars || ''
        });
      });
      return Array.from(groupedMap.values());
    }

    const tableName = type === 'payment' ? 'payments' : 'receipts';
    const rows = await accVoucherRepository.findRawVouchers(companyId, tableName);

    // Group individual records by parsed Voucher Number
    const groupedMap = new Map<string, any>();
    rows.forEach((item: any) => {
      const vMatch = item.notes?.match(/\[Voucher:\s*([^\]]+)\]/);
      const bMatch = item.notes?.match(/\[Bank:\s*([^\]]+)\]/);
      const dMatch = item.notes?.match(/\[Drawn:\s*([^\]]+)\]/);
      
      const vNo = vMatch ? vMatch[1] : 'Unknown';
      const bank = bMatch ? bMatch[1] : '';
      const drawn = dMatch ? dMatch[1] : '';
      const particulars = item.notes ? item.notes.replace(/\[[^\]]+\]/g, '').trim() : '';

      if (!groupedMap.has(vNo)) {
        groupedMap.set(vNo, {
          voucherNo: vNo,
          date: item.date,
          chequeNo: item.reference_number || '',
          bankAccountName: bank,
          drawnOn: drawn,
          lines: []
        });
      }
      
      groupedMap.get(vNo)!.lines.push({
        id: item.id,
        accountId: item.account_id,
        accountName: item.account_name || '',
        amount: item.amount,
        particulars: particulars
      });
    });

    return Array.from(groupedMap.values());
  }

  async saveVoucher(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const { type, voucherDate, voucherNo, bankAccountName, chequeNo, drawnOn, voucherType, lines, isNew } = body;

    if (type !== 'payment' && type !== 'receipt' && type !== 'journal') {
      throw new Error('Invalid transaction type.');
    }

    if (type === 'journal') {
      if (!voucherDate || !voucherNo || !voucherType) {
        throw new Error('Missing required journal voucher header fields.');
      }
      if (!lines || !Array.isArray(lines) || lines.length === 0) {
        throw new Error('Voucher must contain at least one line.');
      }

      let totalDr = 0;
      let totalCr = 0;
      for (const line of lines) {
        if (!line.accountId) {
          throw new Error('Invalid line item detected. Account is required.');
        }
        const dr = Number(line.debitAmount || 0);
        const cr = Number(line.creditAmount || 0);
        if (dr < 0 || cr < 0) {
          throw new Error('Amounts cannot be negative.');
        }
        if (dr === 0 && cr === 0) {
          throw new Error('Line item must have either a debit or credit amount.');
        }
        totalDr += dr;
        totalCr += cr;
      }
      if (Math.abs(totalDr - totalCr) > 0.005) {
        throw new Error(`Out of balance: total debit ${totalDr.toFixed(2)} must equal total credit ${totalCr.toFixed(2)}.`);
      }

      await withTransaction(async (db) => {
        if (isNew && await accVoucherRepository.countJournalVouchersByNo(db, companyId, voucherNo) > 0) {
          throw new Error(`Journal Voucher No. ${voucherNo} already exists. Open it to edit, or use a new number.`);
        }
        await accVoucherRepository.deleteJournalVouchersByNo(db, companyId, voucherNo);

        const now = new Date().toISOString();
        for (const line of lines) {
          await accVoucherRepository.createJournalVoucherLine(db, {
            id: crypto.randomUUID(),
            companyId,
            voucherNo,
            date: voucherDate,
            voucherType,
            accountId: line.accountId,
            debitAmount: Number(line.debitAmount || 0),
            creditAmount: Number(line.creditAmount || 0),
            particulars: line.particulars || '',
            now
          });
        }
      });

      await auditService.log(
        companyId,
        user.id,
        user.username,
        'Journal Voucher Saved',
        `Saved/Updated Journal Voucher No. ${voucherNo}. Lines count: ${lines.length}`
      );

      return voucherNo;
    }

    if (!voucherDate || !voucherNo || !bankAccountName) {
      throw new Error('Missing required voucher header fields.');
    }
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new Error('Voucher must contain at least one line.');
    }

    for (const line of lines) {
      if (!line.accountId || !line.amount || Number(line.amount) <= 0) {
        throw new Error('Invalid line item detected. Account and positive amount are required.');
      }
    }

    const tableName = type === 'payment' ? 'payments' : 'receipts';
    const likePattern = `%[Voucher: ${voucherNo}]%`;

    await withTransaction(async (db) => {
      if (isNew && await accVoucherRepository.countVouchersByNo(db, companyId, tableName, likePattern) > 0) {
        throw new Error(`Voucher No. ${voucherNo} already exists. Open it to edit, or use a new number.`);
      }
      await accVoucherRepository.deleteVouchersByNo(db, companyId, tableName, likePattern);

      const now = new Date().toISOString();
      for (const line of lines) {
        const serializedNotes = `[Voucher: ${voucherNo}] [Bank: ${bankAccountName}] [Drawn: ${drawnOn || ''}] ${line.particulars || ''}`.trim();
        await accVoucherRepository.createVoucherLine(db, tableName, {
          id: crypto.randomUUID(),
          companyId,
          accountId: line.accountId,
          amount: Number(line.amount),
          date: voucherDate,
          referenceNumber: chequeNo || null,
          notes: serializedNotes,
          now
        });
      }
    });

    await auditService.log(
      companyId,
      user.id,
      user.username,
      type === 'payment' ? 'Bank Payment Saved' : 'Bank Receipt Saved',
      `Saved/Updated Bank ${type === 'payment' ? 'Payment' : 'Receipt'} Voucher No. ${voucherNo}. Lines count: ${lines.length}`
    );

    return voucherNo;
  }

  async deleteVoucher(companyId: string, user: { id: string; username: string }, type: 'payment' | 'receipt' | 'journal', voucherNo: string): Promise<void> {
    if (type !== 'payment' && type !== 'receipt' && type !== 'journal') {
      throw new Error('Invalid transaction type.');
    }
    if (!voucherNo) {
      throw new Error('Missing voucher number.');
    }

    const isJournal = type === 'journal';
    const tableName = type === 'payment' ? 'payments' : 'receipts';
    const likePattern = `%[Voucher: ${voucherNo}]%`;

    await withTransaction(async (db) => {
      const count = isJournal
        ? await accVoucherRepository.countJournalVouchersByNo(db, companyId, voucherNo)
        : await accVoucherRepository.countVouchersByNo(db, companyId, tableName, likePattern);
      if (count === 0) {
        throw new Error(`${isJournal ? 'Journal Voucher' : 'Voucher'} No. ${voucherNo} not found.`);
      }
      if (isJournal) {
        await accVoucherRepository.deleteJournalVouchersByNo(db, companyId, voucherNo);
      } else {
        await accVoucherRepository.deleteVouchersByNo(db, companyId, tableName, likePattern);
      }
    });

    const action = isJournal ? 'Journal Voucher Deleted'
      : type === 'payment' ? 'Bank Payment Deleted' : 'Bank Receipt Deleted';
    const label = isJournal ? 'Journal Voucher' : `Bank ${type === 'payment' ? 'Payment' : 'Receipt'} Voucher`;
    await auditService.log(companyId, user.id, user.username, action, `Deleted ${label} No. ${voucherNo}`);
  }
}
export const accVoucherService = new AccVoucherService();
