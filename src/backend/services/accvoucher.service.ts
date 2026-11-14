import crypto from 'crypto';
import { withTransaction } from '../db/index';
import { accVoucherRepository } from '../repositories/accvoucher.repository';
import { companyRepository } from '../repositories/masters.repository';
import { auditService } from './audit.service';
import { generateAllocationPrintPdf } from './pdf.service';
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

    // Attach each line's previously saved bill allocations, so editing a voucher can reload
    // what it already settled instead of silently losing it on re-save (delete-then-recreate).
    const allLineIds = rows.map((item: any) => item.id);
    const allocationRows = await accVoucherRepository.getAllocationsForLines(companyId, type, allLineIds);
    const allocationsByLineId = new Map<string, { billId: string; amount: number; discount: number }[]>();
    allocationRows.forEach((a) => {
      const list = allocationsByLineId.get(a.lineId) || [];
      list.push({ billId: a.billId, amount: a.amount, discount: a.discount });
      allocationsByLineId.set(a.lineId, list);
    });
    for (const voucher of groupedMap.values()) {
      for (const line of voucher.lines) {
        line.allocations = allocationsByLineId.get(line.id) || [];
      }
    }

    return Array.from(groupedMap.values());
  }

  /**
   * Outstanding (balance_due > 0) sales/purchase bills for an account, for bill-wise receipt/payment
   * allocation. excludeLineIds: pass the voucher currently being edited's own line ids so its own
   * prior allocations don't count against the balance (see repository method's doc comment).
   */
  async getOutstandingBills(companyId: string, accountId: string, excludeLineIds: string[] = []): Promise<any[]> {
    return accVoucherRepository.getOutstandingBills(companyId, accountId, excludeLineIds);
  }

  async saveVoucher(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const { type, voucherDate, voucherNo, bankAccountName, chequeNo, drawnOn, paymentMode, voucherType, lines, isNew } = body;

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
      for (const alloc of (line.allocations || [])) {
        if (!alloc.billId || !(Number(alloc.amount) > 0)) {
          throw new Error('Invalid bill allocation detected. Bill and positive amount are required.');
        }
      }
      const allocatedTotal = (line.allocations || []).reduce(
        (sum: number, a: any) => sum + Number(a.amount || 0) + Number(a.discount || 0), 0
      );
      if (allocatedTotal > Number(line.amount) + 0.01) {
        throw new Error('Bill allocations for a line cannot exceed that line\'s amount.');
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
        const voucherLineId = crypto.randomUUID();
        const serializedNotes = `[Voucher: ${voucherNo}] [Bank: ${bankAccountName}] [Drawn: ${drawnOn || ''}] ${line.particulars || ''}`.trim();
        await accVoucherRepository.createVoucherLine(db, tableName, {
          id: voucherLineId,
          companyId,
          accountId: line.accountId,
          amount: Number(line.amount),
          date: voucherDate,
          paymentMode: paymentMode || 'Cheque',
          referenceNumber: chequeNo || null,
          notes: serializedNotes,
          now
        });

        // Bill-wise allocations are optional: on-account receipts/payments with no bill yet are valid.
        for (const alloc of (line.allocations || [])) {
          if (type === 'receipt') {
            await accVoucherRepository.createReceiptAllocation(db, {
              id: crypto.randomUUID(),
              companyId,
              receiptId: voucherLineId,
              saleId: alloc.billId,
              amountApplied: Number(alloc.amount),
              discountAmount: Number(alloc.discount || 0),
              now
            });
          } else {
            await accVoucherRepository.createPaymentAllocation(db, {
              id: crypto.randomUUID(),
              companyId,
              paymentId: voucherLineId,
              purchaseId: alloc.billId,
              amountApplied: Number(alloc.amount),
              discountAmount: Number(alloc.discount || 0),
              now
            });
          }
        }
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

  // ---- Allocation Entry (R20): adjusts old dues/on-account amounts/kasar against specific
  // bills without a real receipt/payment voucher (AC_PLUS's Debtors/Creditors Allocation-
  // Adjustment Entry, confirmed debtor AND creditor sides both exist, unlike R6/R19). ----

  /** Bills for the Allocation Entry picker: sale bills for a debtor entry, purchase bills for a creditor one. */
  async getOutstandingBillsForAllocation(
    companyId: string, accountId: string, side: 'debtor' | 'creditor',
    options: { includeAllEntries?: boolean; excludeEntryNo?: string } = {}
  ): Promise<any[]> {
    let excludeAllocationEntryIds: string[] = [];
    if (options.excludeEntryNo) {
      const existing = await accVoucherRepository.findAllocationEntryByNo(companyId, side, options.excludeEntryNo);
      if (existing) excludeAllocationEntryIds = [existing.id];
    }
    return accVoucherRepository.getOutstandingBills(companyId, accountId, [], {
      billType: side === 'debtor' ? 'sale' : 'purchase',
      includeAllEntries: options.includeAllEntries,
      excludeAllocationEntryIds
    });
  }

  async getAllocationEntries(companyId: string, side: 'debtor' | 'creditor'): Promise<any[]> {
    return accVoucherRepository.getAllocationEntries(companyId, side);
  }

  async getAllocationEntryDetail(companyId: string, side: 'debtor' | 'creditor', entryNo: string): Promise<{ header: any; bills: any[] } | null> {
    return accVoucherRepository.getAllocationEntryDetail(companyId, side, entryNo);
  }

  /**
   * Print Allocation (R20): AC_PLUS's ADEBALOCPRNT/ACREALOCPRNT -- a multi-account, date-ranged
   * batch print. Confirmed from a real printed sample ("creditor allocation.pdf") to combine
   * every bill-settling voucher for the account (ordinary receipts/payments from R7, plus R20's
   * own standalone Allocation Entries), continuously paginated across all selected accounts
   * (no per-account page reset, unlike Party Ledger), with a running subtotal per account.
   * AC_PLUS's real sample also includes Credit/Debit Notes and bill-linked Journal Vouchers --
   * TexFin doesn't model bill-wise linkage for those yet (R3, unbuilt), so they're left out here.
   */
  async getAllocationPrintPdf(
    companyId: string, side: 'debtor' | 'creditor', accountIds: string[], startDate: string, endDate: string
  ): Promise<Uint8Array> {
    const company = await companyRepository.findById(companyId);
    const accounts = await accVoucherRepository.getAccountNames(companyId, accountIds);
    const foundIds = new Set(accounts.map((a) => a.id));
    const missing = accountIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw new Error(`Account(s) not found: ${missing.join(', ')}`);

    const rawRows = await accVoucherRepository.getAllocationHistoryForPrint(companyId, side, accountIds, startDate, endDate);
    const billType = side === 'debtor' ? 'sale' : 'purchase';
    const billIds = [...new Set(rawRows.map((r: any) => r.billId))];
    const fullHistory = await accVoucherRepository.getFullBillAllocationHistory(companyId, billType, billIds);
    const cumulativeByBill = new Map<string, { date: string; amount: number; cumulative: number }[]>();
    for (const h of fullHistory) {
      const list = cumulativeByBill.get(h.billId) || [];
      const running = (list[list.length - 1]?.cumulative || 0) + h.amount;
      list.push({ date: h.date, amount: h.amount, cumulative: running });
      cumulativeByBill.set(h.billId, list);
    }
    // Each rawRow IS one of fullHistory's entries (same two source tables, just date-unfiltered),
    // so a monotonically-advancing pointer matched by (date, amount) finds its true running
    // balance -- including settlements made before the print's own startDate.
    const pointerByBill = new Map<string, number>();

    const label = (r: any) => {
      if (r.voucherKind === 'receipt' || r.voucherKind === 'payment') {
        const mode = r.voucherLabel || 'Cash';
        return `${mode} ${r.voucherKind === 'receipt' ? 'Receipt' : 'Payment'}`;
      }
      return r.voucherKind === 'kasar' ? 'Kasar' : 'On Account';
    };
    const voucherNoOf = (r: any) => {
      if (r.voucherNo) return String(r.voucherNo);
      const match = r.voucherNotes?.match(/\[Voucher:\s*([^\]]+)\]/);
      return match ? match[1] : r.voucherId;
    };

    const rowsByAccount = new Map<string, any[]>();
    for (const r of rawRows) {
      const cum = cumulativeByBill.get(r.billId) || [];
      let ptr = pointerByBill.get(r.billId) || 0;
      while (ptr < cum.length && !(cum[ptr].date === r.voucherDate && cum[ptr].amount === r.adjustAmount)) ptr++;
      const cumulative = ptr < cum.length ? cum[ptr].cumulative : (cum[cum.length - 1]?.cumulative || r.adjustAmount);
      pointerByBill.set(r.billId, ptr + 1);
      const balanceAfter = r.billAmount - cumulative;

      const list = rowsByAccount.get(r.accountId) || [];
      list.push({
        date: r.voucherDate, voucherLabel: label(r), voucherNo: voucherNoOf(r), voucherId: r.voucherId, voucherAmount: r.voucherAmount,
        billDate: r.billDate, billType: r.billType, billNumber: r.billNumber, billAmount: r.billAmount,
        adjustAmount: r.adjustAmount, balanceAfter
      });
      rowsByAccount.set(r.accountId, list);
    }

    const sortedAccounts = [...accounts].sort((a, b) => a.name.localeCompare(b.name));
    // An account with no settling activity in the range gets no section at all -- matching
    // AC_PLUS's own printed report, which never shows a bare account name with nothing under it.
    // This matters more now that Select All can pull in every account in the company at once.
    const accountPages = sortedAccounts.filter((account) => (rowsByAccount.get(account.id) || []).length > 0).map((account) => {
      const accountRows = rowsByAccount.get(account.id) || [];
      const seenVouchers = new Set<string>();
      let voucherTotal = 0;
      const seenBills = new Set<string>();
      let billTotal = 0;
      let adjustTotal = 0;
      const pdfRows = accountRows.map((r) => {
        const isFirstForVoucher = !seenVouchers.has(r.voucherId);
        seenVouchers.add(r.voucherId);
        if (isFirstForVoucher) voucherTotal += r.voucherAmount;
        const billKey = `${r.billType}:${r.billNumber}`;
        if (!seenBills.has(billKey)) {
          seenBills.add(billKey);
          billTotal += r.billAmount;
        }
        adjustTotal += r.adjustAmount;
        return {
          date: isFirstForVoucher ? r.date : '', voucherLabel: isFirstForVoucher ? r.voucherLabel : '',
          voucherNo: isFirstForVoucher ? r.voucherNo : '', voucherAmount: isFirstForVoucher ? r.voucherAmount : null,
          billDate: r.billDate, billType: r.billType, billNumber: r.billNumber, billAmount: r.billAmount,
          adjustAmount: r.adjustAmount, balanceAfter: r.balanceAfter
        };
      });
      return { account: { name: account.name }, rows: pdfRows, subtotal: { voucherTotal, billTotal, adjustTotal } };
    });

    return generateAllocationPrintPdf({
      company: { name: company?.name || 'TexFin Vendor', address: company?.address },
      side, accounts: accountPages, startDate, endDate
    });
  }

  async saveAllocationEntry(companyId: string, user: { id: string; username: string }, body: any): Promise<string> {
    const { side, entryNo, date, accountId, entryType, amount, kasarAccountId, notes, bills, isNew } = body;

    if (side !== 'debtor' && side !== 'creditor') {
      throw new Error('Invalid side: must be debtor or creditor.');
    }
    if (entryType !== 'on_account' && entryType !== 'kasar') {
      throw new Error('Invalid entry type: must be on_account or kasar.');
    }
    if (!date || !entryNo || !accountId) {
      throw new Error('Missing required allocation entry header fields.');
    }
    if (!(Number(amount) > 0)) {
      throw new Error('Amount must be positive.');
    }
    if (entryType === 'kasar' && !kasarAccountId) {
      throw new Error('A Kasar/Discount account is required for a kasar entry.');
    }
    if (!bills || !Array.isArray(bills) || bills.length === 0) {
      throw new Error('At least one bill must be selected.');
    }

    const expectedBillType = side === 'debtor' ? 'sale' : 'purchase';
    let billTotal = 0;
    for (const bill of bills) {
      if (!bill.billId || bill.billType !== expectedBillType || !(Number(bill.amount) > 0)) {
        throw new Error('Invalid bill line detected.');
      }
      billTotal += Number(bill.amount);
    }
    if (Math.abs(billTotal - Number(amount)) > 0.01) {
      throw new Error(`Bill lines total ${billTotal.toFixed(2)} must equal the entry amount ${Number(amount).toFixed(2)}.`);
    }

    await withTransaction(async (db) => {
      if (isNew && await accVoucherRepository.findAllocationEntryByNo(companyId, side, entryNo)) {
        throw new Error(`Allocation Entry No. ${entryNo} already exists. Open it to edit, or use a new number.`);
      }
      await accVoucherRepository.deleteAllocationEntryByNo(db, companyId, side, entryNo);
      if (entryType === 'kasar') {
        await accVoucherRepository.deleteJournalVouchersByNo(db, companyId, `ALLOC-${side === 'debtor' ? 'D' : 'C'}-${entryNo}`);
      }

      const now = new Date().toISOString();
      const allocationEntryId = crypto.randomUUID();
      await accVoucherRepository.createAllocationEntry(db, {
        id: allocationEntryId, companyId, side, entryNo, date, accountId, entryType,
        amount: Number(amount), kasarAccountId: entryType === 'kasar' ? kasarAccountId : null,
        notes: notes || '', now
      });

      for (const bill of bills) {
        await accVoucherRepository.createAllocationEntryBill(db, {
          id: crypto.randomUUID(), companyId, allocationEntryId, billId: bill.billId, billType: bill.billType,
          amountApplied: entryType === 'on_account' ? Number(bill.amount) : 0,
          discountAmount: entryType === 'kasar' ? Number(bill.amount) : 0,
          now
        });
      }

      // A kasar write-off is real money forgiven, not just bill bookkeeping: post it to the
      // general ledger the same way a Journal Voucher would (debit the chosen Kasar/Discount
      // account, credit the party) -- matching AC_PLUS's own confirmed JV-shaped posting for
      // this case. An on_account entry only reallocates an already-posted balance, so it
      // posts nothing new.
      if (entryType === 'kasar') {
        const voucherNo = `ALLOC-${side === 'debtor' ? 'D' : 'C'}-${entryNo}`;
        const particulars = `Kasar against Allocation Entry No. ${entryNo}`;
        await accVoucherRepository.createJournalVoucherLine(db, {
          id: crypto.randomUUID(), companyId, voucherNo, date, voucherType: 'Allocation Entry (Kasar)',
          accountId: kasarAccountId, debitAmount: Number(amount), creditAmount: 0, particulars, now
        });
        await accVoucherRepository.createJournalVoucherLine(db, {
          id: crypto.randomUUID(), companyId, voucherNo, date, voucherType: 'Allocation Entry (Kasar)',
          accountId, debitAmount: 0, creditAmount: Number(amount), particulars, now
        });
      }
    });

    await auditService.log(
      companyId, user.id, user.username,
      `${side === 'debtor' ? 'Debtors' : 'Creditors'} Allocation Entry Saved`,
      `Saved/Updated Allocation Entry No. ${entryNo} (${entryType}), amount ${amount}, ${bills.length} bill(s).`
    );

    return entryNo;
  }

  async deleteAllocationEntry(companyId: string, user: { id: string; username: string }, side: 'debtor' | 'creditor', entryNo: string): Promise<void> {
    await withTransaction(async (db) => {
      const existing = await accVoucherRepository.findAllocationEntryByNo(companyId, side, entryNo);
      if (!existing) throw new Error(`Allocation Entry No. ${entryNo} not found.`);
      await accVoucherRepository.deleteAllocationEntryByNo(db, companyId, side, entryNo);
      await accVoucherRepository.deleteJournalVouchersByNo(db, companyId, `ALLOC-${side === 'debtor' ? 'D' : 'C'}-${entryNo}`);
    });
    await auditService.log(
      companyId, user.id, user.username,
      `${side === 'debtor' ? 'Debtors' : 'Creditors'} Allocation Entry Deleted`,
      `Deleted Allocation Entry No. ${entryNo}`
    );
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
