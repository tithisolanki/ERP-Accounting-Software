import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { AccountService } from '../../services/masters.api';
import { OpeningService } from '../../services/opening.api';
import { Account } from '@shared/types';
import { Search, Trash2, Edit2, Save, X } from 'lucide-react';

export const AccountOpeningBalancePage: React.FC = () => {
  const { token, addNotification, confirm } = useStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState('2026-04-01');
  const [amount, setAmount] = useState('0.00');
  const [dc, setDc] = useState('Dr');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchInitialData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [allAccounts, activeBalances] = await Promise.all([
        AccountService.getAll(token),
        OpeningService.getAccountBalances(token)
      ]);
      setAccounts(allAccounts);
      setBalances(activeBalances);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load account balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!accountId) {
      addNotification('error', 'Please select an account.');
      return;
    }
    if (Number(amount) < 0) {
      addNotification('error', 'Balance amount cannot be negative.');
      return;
    }

    try {
      await OpeningService.saveAccountBalance(
        {
          accountId,
          amount: Number(amount),
          date,
          dc
        },
        token
      );
      addNotification('success', 'Account opening balance saved successfully.');
      resetForm();
      fetchInitialData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save account opening balance.');
    }
  };

  const handleEdit = (balance: Account) => {
    setAccountId(balance.id);
    setDate(balance.opening_balance_date || '2026-04-01');
    setAmount((balance.opening_balance || 0).toFixed(2));
    setDc(balance.opening_balance_dc || 'Dr');
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!(await confirm({ message: 'Are you sure you want to delete this opening balance?', danger: true, confirmLabel: 'Delete' }))) return;

    try {
      await OpeningService.deleteAccountBalance(id, token);
      addNotification('success', 'Opening balance cleared successfully.');
      fetchInitialData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to clear opening balance.');
    }
  };

  const resetForm = () => {
    setAccountId('');
    setDate('2026-04-01');
    setAmount('0.00');
    setDc('Dr');
    setIsEditing(false);
  };

  // Filter accounts that have an opening balance configuration for the table view
  const filteredBalances = balances.filter(b => {
    const hasBalance = (b.opening_balance && b.opening_balance > 0) || b.opening_balance_date;
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (b.group_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return hasBalance && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-6 p-1">
      <Card
        title="Account Opening Balance Entry"
        subtitle="Manage starting ledger balances for customer, supplier, bank, and expense accounts"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6 bg-slate-50 p-4 border border-slate-200 rounded-xl">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-500">Opening Balance Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8"
            />
          </div>

          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-[11px] uppercase font-bold text-slate-500">Account Name</label>
            <select
              required
              disabled={isEditing}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-700 text-xs disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">-- Select Account --</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.group_name || 'No Group'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-[11px] uppercase font-bold text-slate-500">Balance Amount</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8 text-right font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Dr/Cr</label>
              <select
                value={dc}
                onChange={(e) => setDc(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-750 text-xs"
              >
                <option value="Dr">Dr</option>
                <option value="Cr">Cr</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end md:col-span-4 mt-2">
            {isEditing && (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm} className="cursor-pointer h-8">
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            )}
            <Button type="submit" size="sm" className="cursor-pointer h-8">
              <Save className="w-3.5 h-3.5 mr-1" /> {isEditing ? 'Update Balance' : 'Save Balance'}
            </Button>
          </div>
        </form>

        {/* List of configured balances */}
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-700">Configured Starting Balances</h4>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search by Account Name / Group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-semibold animate-pulse">
            Loading balances...
          </div>
        ) : filteredBalances.length > 0 ? (
          <Table headers={['As of Date', 'Account Name', 'Group Name', 'Opening Balance', 'Dr/Cr', 'Actions']}>
            {filteredBalances.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-xs text-slate-500 font-semibold font-mono">
                  {item.opening_balance_date ? new Date(item.opening_balance_date).toLocaleDateString('en-GB') : '-'}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-bold">{item.group_name || '-'}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-700 font-bold">
                  Rs. {item.opening_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-2 py-0.5 rounded font-black text-xs ${item.opening_balance_dc === 'Dr' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                    {item.opening_balance_dc}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5 mr-1 text-indigo-650 inline" /> Modify
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="!text-red-500 hover:!bg-red-50 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5 mr-1 inline" /> Clear
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            No account starting balances configured yet.
          </div>
        )}
      </Card>
    </div>
  );
};
