import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { AccountService, AccVoucherService } from '../../services/api';
import type { OutstandingBill } from '../../services/accvoucher.api';
import { Save, Printer, Trash2 } from 'lucide-react';

const formatCurrency = (val: number) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Allocation Entry (R20): AC_PLUS's Debtors/Creditors Allocation-Adjustment Entry --
 * adjusts old dues, on-account amounts or kasar against specific bills, without a real
 * receipt/payment voucher. Confirmed via the live binary: Data Entry > Purchase Bill >
 * Allocation Entry + Print Allocation (creditor side) and Data Entry > Sales Bill >
 * Allocation Entry + Print Allocation (debtor side), both direct siblings of the bill entry
 * screens, not nested under any extra submenu.
 */
export const AllocationEntryPage: React.FC<{ side: 'debtor' | 'creditor' }> = ({ side }) => {
  const { token, addNotification, loginDate, confirm } = useStore();
  const label = side === 'debtor' ? 'Sales' : 'Purchase';

  const [accounts, setAccounts] = useState<any[]>([]);
  const [savedEntries, setSavedEntries] = useState<any[]>([]);

  const [accountId, setAccountId] = useState('');
  const [entryNo, setEntryNo] = useState('');
  const [entryDate, setEntryDate] = useState(loginDate);
  const [entryType, setEntryType] = useState<'on_account' | 'kasar'>('on_account');
  const [kasarAccountId, setKasarAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [includeAllEntries, setIncludeAllEntries] = useState(false);

  const [bills, setBills] = useState<OutstandingBill[]>([]);
  const [billAmounts, setBillAmounts] = useState<Record<string, number>>({});
  const [printEntry, setPrintEntry] = useState<{ header: any; bills: any[] } | null>(null);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
    reloadEntries();
  }, [token, side]);

  const reloadEntries = () => {
    if (!token) return;
    AccVoucherService.getAllocationEntries(side, token)
      .then((rows: any[]) => {
        setSavedEntries(rows);
        const maxNo = rows.reduce((max, r) => Math.max(max, parseInt(r.entry_no) || 0), 0);
        setEntryNo(String(maxNo + 1));
      })
      .catch(() => addNotification('error', 'Failed to load allocation entries.'));
  };

  useEffect(() => {
    if (!token || !accountId) { setBills([]); return; }
    AccVoucherService.getOutstandingBillsForAllocation(side, accountId, token, { includeAllEntries })
      .then(setBills)
      .catch(() => addNotification('error', 'Failed to load outstanding bills.'));
  }, [token, side, accountId, includeAllEntries]);

  const totalApplied = Object.values(billAmounts).reduce((sum, v) => sum + (v || 0), 0);

  const handleBillAmountChange = (billId: string, value: number, cap: number) => {
    setBillAmounts((prev) => ({ ...prev, [billId]: Math.max(0, Math.min(value, cap)) }));
  };

  const handleClear = () => {
    setAccountId('');
    setEntryType('on_account');
    setKasarAccountId('');
    setAmount('');
    setNotes('');
    setBillAmounts({});
    reloadEntries();
  };

  const handleSave = async () => {
    if (!token) return;
    const selectedBills = Object.entries(billAmounts)
      .filter(([, amt]) => amt > 0)
      .map(([billId, amt]) => {
        const bill = bills.find((b) => b.billId === billId)!;
        return { billId, billType: bill.billType, amount: amt };
      });
    try {
      await AccVoucherService.saveAllocationEntry({
        side, entryNo, date: entryDate, accountId, entryType, amount: Number(amount || 0),
        kasarAccountId: entryType === 'kasar' ? kasarAccountId : undefined,
        notes, isNew: true, bills: selectedBills
      }, token);
      addNotification('success', `Allocation Entry No. ${entryNo} saved.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save allocation entry.');
    }
  };

  const handlePrint = async (no: string) => {
    if (!token) return;
    try {
      const detail = await AccVoucherService.getAllocationEntryDetail(side, no, token);
      setPrintEntry(detail);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load allocation entry for printing.');
    }
  };

  const handleDelete = async (no: string) => {
    if (!token) return;
    const ok = await confirm({ message: `Delete Allocation Entry No. ${no}? This cannot be undone.`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await AccVoucherService.deleteAllocationEntry(side, no, token);
      addNotification('success', `Allocation Entry No. ${no} deleted.`);
      reloadEntries();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete allocation entry.');
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-5xl">
      <Card title={`${label} Allocation Entry`} subtitle="Adjust old dues, on-account amounts or kasar against specific bills, without a receipt or payment voucher">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Entry No.</label>
              <input type="text" value={entryNo} onChange={(e) => setEntryNo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Entry Date</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">{side === 'debtor' ? 'Customer' : 'Supplier'} Account</label>
              <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setBillAmounts({}); }}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                <option value="">-- Select Account --</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="flex items-center gap-4 font-bold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="radio" name="entryType" checked={entryType === 'on_account'} onChange={() => setEntryType('on_account')} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
                On Account
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="radio" name="entryType" checked={entryType === 'kasar'} onChange={() => setEntryType('kasar')} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
                Kasar
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs" />
            </div>
            {entryType === 'kasar' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase font-bold text-slate-500">Kasar / Discount Account</label>
                <select value={kasarAccountId} onChange={(e) => setKasarAccountId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                  <option value="">-- Select Account --</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={includeAllEntries} onChange={(e) => setIncludeAllEntries(e.target.checked)} className="w-4 h-4 rounded accent-indigo-650 cursor-pointer" />
            Include All Entries
          </label>

          {accountId && (
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Bill-wise Adjustment</span>
                <span className={totalApplied > Number(amount || 0) + 0.01 ? 'text-rose-600' : 'text-slate-500'}>
                  Adjusted {formatCurrency(totalApplied)} / Amount {formatCurrency(Number(amount || 0))}
                </span>
              </div>
              <Table headers={['Voucher No.', 'Type', 'Date', 'Total Amount', 'Adjusted Amount', 'UnAdjusted Amount']}>
                {bills.map((bill) => {
                  const applied = billAmounts[bill.billId] || 0;
                  return (
                    <tr key={bill.billId} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 font-semibold">{bill.billNumber}</td>
                      <td className="px-4 py-2">{bill.billType === 'sale' ? 'Sales Bill' : 'Purchase Bill'}</td>
                      <td className="px-4 py-2">{bill.date}</td>
                      <td className="px-4 py-2">{formatCurrency(bill.totalAmount)}</td>
                      <td className="px-4 py-2">
                        <input type="number" min="0" step="0.01" max={bill.balanceDue}
                          value={applied || ''}
                          onChange={(e) => handleBillAmountChange(bill.billId, parseFloat(e.target.value) || 0, bill.balanceDue)}
                          placeholder="0.00"
                          className="w-28 px-2 py-1 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-right font-mono" />
                      </td>
                      <td className="px-4 py-2 font-bold">{formatCurrency(bill.balanceDue - applied)}</td>
                    </tr>
                  );
                })}
              </Table>
            </div>
          )}

          {(() => {
            const reason = !accountId ? 'Select an account first.'
              : !entryNo ? 'Entry No. is required.'
              : !(Number(amount) > 0) ? 'Enter an Amount greater than 0.'
              : entryType === 'kasar' && !kasarAccountId ? 'Select a Kasar/Discount account.'
              : bills.length === 0 ? 'This account has no outstanding bills to adjust against.'
              : Math.abs(totalApplied - Number(amount || 0)) > 0.01
                ? `Bill lines total ${formatCurrency(totalApplied)} must equal the Amount ${formatCurrency(Number(amount || 0))} -- fill in the Adjusted Amount cell(s) above.`
              : null;
            return (
              <div className="flex justify-between items-center gap-3 border-t border-slate-100 pt-4 mt-2">
                <span className="text-rose-600 font-semibold">{reason}</span>
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={handleClear} className="font-bold cursor-pointer">Cancel / New</Button>
                  <Button type="button" variant="primary" onClick={handleSave} disabled={!!reason} className="font-bold cursor-pointer">
                    <Save className="w-4 h-4 mr-1.5" /> Save Allocation Entry
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </Card>

      <Card title={`Saved ${label} Allocation Entries`}>
        <Table headers={['Entry No.', 'Date', 'Account', 'Type', 'Amount', '']}>
          {savedEntries.map((e) => (
            <tr key={e.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2 font-bold text-indigo-650">{e.entry_no}</td>
              <td className="px-4 py-2">{e.date}</td>
              <td className="px-4 py-2">{e.accountName}</td>
              <td className="px-4 py-2 capitalize">{e.entry_type === 'on_account' ? 'On Account' : 'Kasar'}</td>
              <td className="px-4 py-2">{formatCurrency(e.amount)}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => handlePrint(e.entry_no)} title="Print Allocation" className="w-7 h-7 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 inline-flex items-center justify-center cursor-pointer mr-1">
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(e.entry_no)} title="Delete" className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal isOpen={!!printEntry} onClose={() => setPrintEntry(null)} title="Print Allocation" size="lg">
        {printEntry && (
          <div className="flex flex-col gap-4 text-xs">
            <div id="print-allocation-entry" className="flex flex-col gap-3 p-2">
              <h2 className="text-base font-bold">{label} Allocation Entry No. {printEntry.header.entry_no}</h2>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="font-bold text-slate-500">Date:</span> {printEntry.header.date}</div>
                <div><span className="font-bold text-slate-500">Account:</span> {printEntry.header.accountName}</div>
                <div><span className="font-bold text-slate-500">Entry Type:</span> {printEntry.header.entry_type === 'on_account' ? 'On Account' : 'Kasar'}</div>
                <div><span className="font-bold text-slate-500">Amount:</span> {formatCurrency(printEntry.header.amount)}</div>
                {printEntry.header.kasarAccountName && (
                  <div><span className="font-bold text-slate-500">Kasar Account:</span> {printEntry.header.kasarAccountName}</div>
                )}
              </div>
              <Table headers={['Voucher No.', 'Type', 'Date', 'Total Amount', 'Applied', 'Discount']}>
                {printEntry.bills.map((b: any) => (
                  <tr key={b.billId}>
                    <td className="px-4 py-2">{b.billNumber}</td>
                    <td className="px-4 py-2">{b.billType === 'sale' ? 'Sales Bill' : 'Purchase Bill'}</td>
                    <td className="px-4 py-2">{b.billDate}</td>
                    <td className="px-4 py-2">{formatCurrency(b.totalAmount)}</td>
                    <td className="px-4 py-2">{formatCurrency(b.amountApplied)}</td>
                    <td className="px-4 py-2">{formatCurrency(b.discountAmount)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="primary" onClick={() => window.print()} className="font-bold cursor-pointer">
                <Printer className="w-4 h-4 mr-1.5" /> Print
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
