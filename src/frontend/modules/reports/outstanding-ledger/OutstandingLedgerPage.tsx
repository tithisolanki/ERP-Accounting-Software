import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { AccountService, GroupService, ReportsService } from '../../../services/api';
import { Account } from '../../../../shared/types/masters';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { AccountMultiSelect } from '../../../components/AccountMultiSelect';
import { Scale } from 'lucide-react';

export const OutstandingLedgerPage: React.FC = () => {
  const { token, loginDate, addNotification } = useStore();
  const today = loginDate || new Date().toISOString().split('T')[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [asOfDate, setAsOfDate] = useState(today);
  const [paymentUpto, setPaymentUpto] = useState(today);
  const [groupBy, setGroupBy] = useState<'account' | 'broker'>('account');
  const [dueOnly, setDueOnly] = useState(false);
  const [overdueDays, setOverdueDays] = useState('');
  const [outstandingGroups, setOutstandingGroups] = useState<{ groupName: string; bills: any[]; totalOutstanding: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
    GroupService.getGroups(token).then(setGroups).catch(() => addNotification('error', 'Failed to load groups.'));
  }, [token]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const handleGenerate = async () => {
    if (!token || selectedAccountIds.length === 0) return;
    setLoading(true);
    try {
      const result = await ReportsService.getOutstandingLedger(token, {
        accountIds: selectedAccountIds, asOfDate, paymentUpto, groupBy, dueOnly,
        overdueDays: overdueDays ? Number(overdueDays) : undefined
      });
      setOutstandingGroups(result);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load outstanding ledger.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-4xl">
      <Card title="Outstanding & Ageing" subtitle="Debtors/Creditors Outstanding Ledger — bill-wise, by account or by broker">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Outstanding as on Date</label>
              <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Payment Including upto Date</label>
              <input type="date" value={paymentUpto} onChange={(e) => setPaymentUpto(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Outstanding Type</label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'account' | 'broker')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                <option value="account">Account-wise</option>
                <option value="broker">Broker-wise</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Over Due Days (optional)</label>
              <input type="number" value={overdueDays} onChange={(e) => setOverdueDays(e.target.value)} placeholder="e.g. 30"
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs" />
            </div>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none pb-2">
              <input type="checkbox" checked={dueOnly} onChange={(e) => setDueOnly(e.target.checked)} className="w-4 h-4 rounded accent-indigo-650 cursor-pointer" />
              Due Bills only
            </label>
          </div>

          <AccountMultiSelect accounts={accounts} groups={groups} selectedIds={selectedAccountIds} onChange={setSelectedAccountIds} />

          <Button variant="primary" disabled={selectedAccountIds.length === 0 || loading} onClick={handleGenerate}
            className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9 self-end">
            <Scale className="w-4 h-4 mr-1.5" /> {loading ? 'Loading...' : 'Generate'}
          </Button>
        </div>
      </Card>

      {outstandingGroups.map(group => (
        <Card key={group.groupName} title={group.groupName} subtitle={`Total Outstanding: ${formatCurrency(group.totalOutstanding)}`}>
          <Table headers={['Bill Type', 'Bill No.', 'Date', 'Due Date', 'Overdue Days', 'Amount', 'Balance Due']}>
            {group.bills.map((bill: any) => (
              <tr key={bill.billId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 capitalize">{bill.billType}</td>
                <td className="px-4 py-2">{bill.billNumber}</td>
                <td className="px-4 py-2">{bill.date}</td>
                <td className="px-4 py-2">{bill.dueDate}</td>
                <td className={`px-4 py-2 font-bold ${bill.overdueDays > 0 ? 'text-rose-600' : 'text-slate-600'}`}>{bill.overdueDays}</td>
                <td className="px-4 py-2">{formatCurrency(bill.totalAmount)}</td>
                <td className="px-4 py-2 font-bold">{formatCurrency(bill.balanceDue)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ))}
    </div>
  );
};
