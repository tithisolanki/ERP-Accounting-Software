import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { AccountService, GroupService, ReportsService } from '../../../services/api';
import { Account } from '../../../../shared/types/masters';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { AccountMultiSelect } from '../../../components/AccountMultiSelect';
import { Percent } from 'lucide-react';

export const OverdueInterestPage: React.FC = () => {
  const { token, loginDate, addNotification } = useStore();
  const today = loginDate || new Date().toISOString().split('T')[0];

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [reportDate, setReportDate] = useState(today);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [interestRate, setInterestRate] = useState('');
  const [maxDaysOfYear, setMaxDaysOfYear] = useState<360 | 365>(365);
  const [includeEarlyPayments, setIncludeEarlyPayments] = useState(true);
  const [groupBy, setGroupBy] = useState<'account' | 'broker'>('account');
  const [interestGroups, setInterestGroups] = useState<{ groupName: string; bills: any[]; totalInterest: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
    GroupService.getGroups(token).then(setGroups).catch(() => addNotification('error', 'Failed to load groups.'));
  }, [token]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  const handleGenerate = async () => {
    if (!token || selectedAccountIds.length === 0 || !interestRate) return;
    setLoading(true);
    try {
      const result = await ReportsService.getOverdueInterest(token, {
        accountIds: selectedAccountIds, reportDate, periodStart, periodEnd,
        interestRate: Number(interestRate), maxDaysOfYear, includeEarlyPayments, groupBy
      });
      setInterestGroups(result);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load overdue interest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-4xl">
      <Card title="Overdue Interest" subtitle="Debtors only — interest on sale bills unpaid past their credit days">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Report Date</label>
              <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Payment Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Payment Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Interest Rate (%)</label>
              <input type="number" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="e.g. 18"
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Maximum Days of the Year</label>
              <select value={maxDaysOfYear} onChange={(e) => setMaxDaysOfYear(Number(e.target.value) as 360 | 365)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                <option value={365}>365</option>
                <option value={360}>360</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Outstanding Type</label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'account' | 'broker')}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                <option value="account">Account-wise</option>
                <option value="broker">Broker-wise</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={includeEarlyPayments} onChange={(e) => setIncludeEarlyPayments(e.target.checked)} className="w-4 h-4 rounded accent-indigo-650 cursor-pointer" />
            Include Payment before due date
          </label>

          <AccountMultiSelect accounts={accounts} groups={groups} selectedIds={selectedAccountIds} onChange={setSelectedAccountIds} />

          <Button variant="primary" disabled={selectedAccountIds.length === 0 || !interestRate || loading} onClick={handleGenerate}
            className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9 self-end">
            <Percent className="w-4 h-4 mr-1.5" /> {loading ? 'Loading...' : 'Generate'}
          </Button>
        </div>
      </Card>

      {interestGroups.map((group, i) => (
        <Card key={`${group.groupName}-${i}`} title={group.groupName} subtitle={`Interest: ${formatCurrency(group.totalInterest)}`}>
          <Table headers={['Invoice No.', 'Date', 'Due Date', 'Overdue Days', 'Principal', 'Interest']}>
            {group.bills.map((bill: any) => (
              <tr key={bill.billId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2">{bill.billNumber}</td>
                <td className="px-4 py-2">{bill.date}</td>
                <td className="px-4 py-2">{bill.dueDate}</td>
                <td className="px-4 py-2 font-bold text-rose-600">{bill.overdueDays}</td>
                <td className="px-4 py-2">{formatCurrency(bill.principal)}</td>
                <td className="px-4 py-2 font-bold">{formatCurrency(bill.interest)}</td>
              </tr>
            ))}
          </Table>
        </Card>
      ))}
    </div>
  );
};
