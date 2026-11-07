import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Table } from '../../components/Table';
import { Button } from '../../components/Button';
import { LookupService } from '../../services/masters.api';
import { OpeningService } from '../../services/opening.api';
import { Quality, StockOpeningBalance } from '@shared/types';
import { Trash2, Edit2, Save, X } from 'lucide-react';

export const StockOpeningBalancePage: React.FC = () => {
  const { token, addNotification } = useStore();

  const [qualities, setQualities] = useState<Quality[]>([]);
  const [stockBalances, setStockBalances] = useState<StockOpeningBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [id, setId] = useState<string | undefined>(undefined);
  const [stockType, setStockType] = useState<'GREY' | 'FINISH'>('GREY');
  const [date, setDate] = useState('2026-04-01');
  const [qualityId, setQualityId] = useState('');
  const [balanceMeters, setBalanceMeters] = useState('0.00');
  const [costPerMeter, setCostPerMeter] = useState('0.00');
  const [isEditing, setIsEditing] = useState(false);

  const fetchInitialData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [allQualities, activeBalances] = await Promise.all([
        LookupService.getQualities(token),
        OpeningService.getStockBalances(token)
      ]);
      setQualities(allQualities);
      setStockBalances(activeBalances);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load stock balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  // Dynamically filter qualities by chosen stock type (Grey or Finish)
  const filteredQualities = qualities.filter(
    (q) => (q.category_name || '').toUpperCase() === stockType.toUpperCase()
  );

  // Auto-reset quality choice when changing stock category
  useEffect(() => {
    if (!isEditing) {
      setQualityId('');
    }
  }, [stockType, isEditing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!qualityId) {
      addNotification('error', `Please select a ${stockType.toLowerCase()} quality.`);
      return;
    }
    if (Number(balanceMeters) < 0 || Number(costPerMeter) < 0) {
      addNotification('error', 'Meters and cost values cannot be negative.');
      return;
    }

    try {
      await OpeningService.saveStockBalance(
        {
          id,
          date,
          qualityId,
          balanceMeters: Number(balanceMeters),
          costPerMeter: Number(costPerMeter),
          stockType
        },
        token
      );
      addNotification('success', 'Stock opening balance saved successfully.');
      resetForm();
      fetchInitialData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save stock opening balance.');
    }
  };

  const handleEdit = (item: StockOpeningBalance) => {
    setId(item.id);
    setStockType(item.stock_type);
    setDate(item.date);
    setQualityId(item.quality_id);
    setBalanceMeters(item.balance_meters.toFixed(2));
    setCostPerMeter(item.cost_per_meter.toFixed(2));
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this stock opening balance?')) return;

    try {
      await OpeningService.deleteStockBalance(id, token);
      addNotification('success', 'Stock opening balance deleted successfully.');
      fetchInitialData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete stock opening balance.');
    }
  };

  const resetForm = () => {
    setId(undefined);
    setStockType('GREY');
    setDate('2026-04-01');
    setQualityId('');
    setBalanceMeters('0.00');
    setCostPerMeter('0.00');
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      <Card
        title={`${stockType === 'GREY' ? 'Grey' : 'Finish'} Stock Opening Balance Entry`}
        subtitle="Add, modify, and delete starting fabric stock quantities and rates"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 bg-slate-50 p-5 border border-slate-200 rounded-xl mb-6">
          
          {/* Stock Type Selector Radio Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase font-bold text-slate-500">Stock Category Type</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="stockType"
                  disabled={isEditing}
                  checked={stockType === 'GREY'}
                  onChange={() => setStockType('GREY')}
                  className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                />
                Grey Stock
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="radio"
                  name="stockType"
                  disabled={isEditing}
                  checked={stockType === 'FINISH'}
                  onChange={() => setStockType('FINISH')}
                  className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                />
                Finish Stock
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
              <label className="text-[11px] uppercase font-bold text-slate-500">
                {stockType === 'GREY' ? 'Grey Quality' : 'Finish Quality'}
              </label>
              <select
                required
                value={qualityId}
                onChange={(e) => setQualityId(e.target.value)}
                className="w-full px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-700 text-xs"
              >
                <option value="">-- Select {stockType === 'GREY' ? 'Grey' : 'Finish'} Quality --</option>
                {filteredQualities.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase font-bold text-slate-500">Balance Meters</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balanceMeters}
                  onChange={(e) => setBalanceMeters(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8 text-right font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase font-bold text-slate-500">Cost per Meter</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={costPerMeter}
                  onChange={(e) => setCostPerMeter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8 text-right font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-2">
            {isEditing && (
              <Button type="button" variant="secondary" size="sm" onClick={resetForm} className="cursor-pointer h-8">
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            )}
            <Button type="submit" size="sm" className="cursor-pointer h-8">
              <Save className="w-3.5 h-3.5 mr-1" /> {isEditing ? 'Update Stock' : 'Add Stock Balance'}
            </Button>
          </div>
        </form>

        {/* Existing Stock Balances list */}
        <h4 className="text-xs font-bold text-slate-700 mb-3">Starting Stock Balances Ledger</h4>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-semibold animate-pulse">
            Loading stock balances...
          </div>
        ) : stockBalances.length > 0 ? (
          <Table headers={['Date', 'Quality Name', 'Stock Type', 'Balance Meters', 'Cost/Meter', 'Total Value', 'Actions']}>
            {stockBalances.map((item) => {
              const totalVal = item.balance_meters * item.cost_per_meter;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs text-slate-500 font-semibold font-mono">
                    {new Date(item.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.quality_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-0.5 rounded font-black text-xs ${item.stock_type === 'GREY' ? 'bg-slate-100 text-slate-700 border border-slate-350' : 'bg-emerald-50 text-emerald-700 border border-emerald-250'}`}>
                      {item.stock_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700 text-right">{item.balance_meters.toFixed(2)} mtr</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-500 text-right">Rs. {item.cost_per_meter.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-700 font-bold text-right">
                    Rs. {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)} className="cursor-pointer">
                      <Edit2 className="w-3.5 h-3.5 mr-1 text-indigo-650 inline" /> Modify
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="!text-red-500 hover:!bg-red-50 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 mr-1 inline" /> Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            No starting stock balances configured yet.
          </div>
        )}
      </Card>
    </div>
  );
};
