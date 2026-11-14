import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AccountService } from '../../services/api';
import { PrintAllocationModal } from './PrintAllocationModal';
import { Printer } from 'lucide-react';

/** Multi-account, date-ranged setup screen for Print Allocation, matching AC_PLUS's own
 * ADEBALOCPRNT/ACREALOCPRNT screens: an account multi-select plus a Start Date/End Date range,
 * handing off to a PDF preview once Print is pressed. One screen toggles Sales/Purchase rather
 * than two separate sidebar entries. */
export const PrintAllocationPage: React.FC = () => {
  const { token, loginDate, financialYear, addNotification } = useStore();
  const [side, setSide] = useState<'debtor' | 'creditor'>('debtor');
  const label = side === 'debtor' ? 'Sales' : 'Purchase';

  const fyStartYear = (financialYear || '').split('-')[0] || new Date().getFullYear().toString();
  const defaultStartDate = `${fyStartYear}-04-01`;

  const [allAccounts, setAllAccounts] = useState<{ id: string; name: string; group_name?: string | null }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(loginDate);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAllAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
  }, [token]);

  // Only Sundry Debtors/Creditors accounts apply here -- picking the wrong side's account
  // (e.g. a supplier while on Sales) silently returns zero rows, not an error.
  const accounts = allAccounts.filter((a) => a.group_name === (side === 'debtor' ? 'Sundry Debtors' : 'Sundry Creditors'));

  const toggleAccount = (id: string) => {
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const handlePrint = () => {
    if (selectedAccountIds.length === 0) {
      addNotification('error', 'Select at least one account.');
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-4xl">
      <Card title="Print Allocation" subtitle="Pick one or more accounts and a date range, matching AC_PLUS's own batch print screen">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 font-bold text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="radio" name="allocPrintSide" checked={side === 'debtor'} onChange={() => { setSide('debtor'); setSelectedAccountIds([]); }} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
              Sales
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="radio" name="allocPrintSide" checked={side === 'creditor'} onChange={() => { setSide('creditor'); setSelectedAccountIds([]); }} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
              Purchase
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase font-bold text-slate-500">{label} Accounts</label>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedAccountIds(accounts.map((a) => a.id))}>
                  Select All
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedAccountIds([])}>
                  UnSelect All
                </Button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-slate-100">
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-slate-50 font-semibold text-slate-700">
                  <input type="checkbox" checked={selectedAccountIds.includes(a.id)} onChange={() => toggleAccount(a.id)} className="w-3.5 h-3.5 rounded accent-indigo-650 cursor-pointer" />
                  {a.name}
                </label>
              ))}
            </div>
          </div>

          <Button variant="primary" disabled={selectedAccountIds.length === 0} onClick={handlePrint}
            className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9 self-end">
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
        </div>
      </Card>

      <PrintAllocationModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        side={side}
        accountIds={selectedAccountIds}
        startDate={startDate}
        endDate={endDate}
        token={token}
      />
    </div>
  );
};
