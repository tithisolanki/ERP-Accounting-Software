import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { AccountService, AccVoucherService } from '../../services/api';
import type { OutstandingBill } from '../../services/accvoucher.api';
import { CashVoucherForm } from './components/CashVoucherForm';

const CASH_ACCOUNT_NAME = 'CASH IN HAND';

export const CashVouchers: React.FC<{ type: 'payment' | 'receipt' }> = ({ type }) => {
  const { token, addNotification, loginDate } = useStore();

  const [docDate, setDocDate] = useState(loginDate);
  const [voucherNo, setVoucherNo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [refNum, setRefNum] = useState('');
  const [notes, setNotes] = useState('');

  const [accounts, setAccounts] = useState<any[]>([]);

  // Bill-wise allocation: outstanding bills for the selected account, and what the user applies.
  const [bills, setBills] = useState<OutstandingBill[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    setAllocations({});
    if (!token || !selectedAccountId) {
      setBills([]);
      return;
    }
    AccVoucherService.getOutstandingBills(selectedAccountId, token)
      .then(setBills)
      .catch(() => { setBills([]); addNotification('error', 'Failed to load outstanding bills for that account.'); });
  }, [selectedAccountId, token]);

  const handleAllocationChange = (billId: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [billId]: value }));
  };

  // Load accounts and calculate next voucher no (same pattern as BankVouchersPage)
  useEffect(() => {
    loadAccounts();
    loadNextVoucherNo();
  }, [type]);

  const loadAccounts = async () => {
    if (!token) return;
    try {
      setAccounts(await AccountService.getAll(token));
    } catch {
      addNotification('error', 'Failed to load accounts list.');
    }
  };

  const loadNextVoucherNo = async () => {
    if (!token) return;
    try {
      const data = await AccVoucherService.getBankVouchers(type, token) as { voucherNo: string }[];
      const voucherNumbers = data
        .map((item) => parseInt(item.voucherNo) || 0)
        .filter((n) => n > 0);
      const maxNo = voucherNumbers.length > 0 ? Math.max(...voucherNumbers) : 0;
      setVoucherNo(String(maxNo + 1));
    } catch {
      setVoucherNo('1');
    }
  };

  const handleClear = () => {
    setDocDate(loginDate);
    setSelectedAccountId('');
    setAmount('');
    setPaymentMode('Cash');
    setRefNum('');
    setNotes('');
    setBills([]);
    setAllocations({});
    loadNextVoucherNo();
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccountId) {
      addNotification('warning', 'Please select an account.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      addNotification('warning', 'Please enter a valid amount.');
      return;
    }

    try {
      const payload = {
        type,
        voucherDate: docDate,
        voucherNo,
        isNew: true,
        bankAccountName: CASH_ACCOUNT_NAME,
        paymentMode,
        chequeNo: refNum || null,
        drawnOn: null,
        lines: [{
          accountId: selectedAccountId,
          amount: parsedAmount,
          particulars: notes,
          allocations: Object.entries(allocations)
            .filter(([, amt]) => amt > 0)
            .map(([billId, amt]) => ({ billId, amount: amt, discount: 0 }))
        }]
      };

      await AccVoucherService.create(payload, token!);

      addNotification('success', `Voucher No. ${voucherNo} saved successfully.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', err.message);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-xs select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          {type === 'payment' ? 'Cash Payment Voucher' : 'Cash Receipt Voucher'}
        </h1>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
          {type === 'payment' ? 'Record cash payments issued from Cash In Hand' : 'Record cash receipts received into Cash In Hand'}
        </p>
      </div>

      <CashVoucherForm
        activeType={type}
        docDate={docDate}
        setDocDate={setDocDate}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        filteredAccounts={accounts}
        amount={amount}
        setAmount={setAmount}
        paymentMode={paymentMode}
        setPaymentMode={setPaymentMode}
        refNum={refNum}
        setRefNum={setRefNum}
        notes={notes}
        setNotes={setNotes}
        handleCashSubmit={handleCashSubmit}
        bills={bills}
        allocations={allocations}
        onAllocationChange={handleAllocationChange}
        voucherAmount={parseFloat(amount) || 0}
      />
    </div>
  );
};
