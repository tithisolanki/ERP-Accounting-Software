import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Modal } from '../../components/Modal';
import { AccountService, AccVoucherService } from '../../services/api';
import { Plus, Trash2, Save, Search } from 'lucide-react';

interface BankVoucherLine {
  accountId: string;
  amount: number;
  particulars: string;
}

export const BankVouchers: React.FC<{ type: 'payment' | 'receipt' }> = ({ type }) => {
  const { token, addNotification, loginDate } = useStore();

  // Form states
  const [voucherDate, setVoucherDate] = useState(loginDate);
  const [voucherNo, setVoucherNo] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [balance, setBalance] = useState('0.00');
  const [chequeNo, setChequeNo] = useState('');
  const [drawnOn, setDrawnOn] = useState('');

  // Grid states
  const [lines, setLines] = useState<BankVoucherLine[]>([
    { accountId: '', amount: 0, particulars: '' }
  ]);

  // Masters
  const [accounts, setAccounts] = useState<any[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Prepopulated lists
  const bankOptions = [
    { value: '', label: '-- Select Bank --' },
    { value: 'State Bank of India', label: 'State Bank of India' },
    { value: 'HDFC Bank', label: 'HDFC Bank' },
    { value: 'ICICI Bank', label: 'ICICI Bank' },
    { value: 'Axis Bank', label: 'Axis Bank' },
    { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra Bank' },
    { value: 'Bank of Baroda', label: 'Bank of Baroda' },
    { value: 'Punjab National Bank', label: 'Punjab National Bank' },
    { value: 'Union Bank of India', label: 'Union Bank of India' },
    { value: 'Canara Bank', label: 'Canara Bank' }
  ];

  // Load accounts and calculate next voucher no
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

  // Grid operations
  const handleAddLine = () => {
    setLines([...lines, { accountId: '', amount: 0, particulars: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) {
      setLines([{ accountId: '', amount: 0, particulars: '' }]);
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof BankVoucherLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  };

  const handleClear = () => {
    setVoucherDate(loginDate);
    setBankAccountName('');
    setBalance('0.00');
    setChequeNo('');
    setDrawnOn('');
    setLines([{ accountId: '', amount: 0, particulars: '' }]);
    setActiveId(null);
    loadNextVoucherNo();
  };

  // Save Voucher
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bankAccountName) {
      addNotification('warning', 'Please select a Bank Account Name.');
      return;
    }

    // Validate lines
    const validLines = lines.filter(l => l.accountId && l.amount > 0);
    if (validLines.length === 0) {
      addNotification('warning', 'Please add at least one account line with a valid amount.');
      return;
    }

    try {
      const savedVoucherNo = activeId || voucherNo;
      const payload = {
        type,
        voucherDate,
        voucherNo: savedVoucherNo,
        isNew: !activeId,
        bankAccountName,
        chequeNo: chequeNo || null,
        drawnOn: drawnOn || null,
        lines: validLines
      };

      await AccVoucherService.create(payload, token!);

      addNotification('success', `Voucher No. ${savedVoucherNo} saved successfully.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', err.message);
    }
  };

  // Browse recent vouchers
  const handleBrowseVouchers = async () => {
    setSearchModalOpen(true);
    setLoadingRecent(true);
    try {
      setRecentVouchers(await AccVoucherService.getBankVouchers(type, token!) as typeof recentVouchers);
    } catch (err: any) {
      addNotification('error', err.message);
    } finally {
      setLoadingRecent(false);
    }
  };

  const handleSelectVoucher = (v: any) => {
    setActiveId(v.voucherNo);
    setVoucherNo(v.voucherNo);
    setVoucherDate(v.date);
    setBankAccountName(v.bankAccountName);
    setChequeNo(v.chequeNo);
    setDrawnOn(v.drawnOn);
    
    // Map lines to input structure
    setLines(v.lines.map((l: any) => ({
      accountId: l.accountId,
      amount: l.amount,
      particulars: l.particulars
    })));

    setSearchModalOpen(false);
  };

  const handleDeleteVoucher = async () => {
    if (!activeId) return;

    if (!confirm(`Are you sure you want to delete Voucher No. ${activeId}?`)) {
      return;
    }

    try {
      await AccVoucherService.deleteBank(type, activeId, token!);
      addNotification('success', `Voucher No. ${activeId} deleted.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', 'Deletion failed: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-5 text-xs select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">
            {type === 'payment' ? 'Bank Payment Voucher' : 'Bank Receipt Voucher'}
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            {type === 'payment' ? 'Record payments issued from your bank accounts' : 'Record payments received into your bank accounts'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="secondary" onClick={handleBrowseVouchers} className="font-bold cursor-pointer">
            <Search className="w-4 h-4 mr-1.5" /> Browse Vouchers
          </Button>
          {activeId && (
            <Button type="button" variant="danger" onClick={handleDeleteVoucher} className="font-bold cursor-pointer">
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete Voucher
            </Button>
          )}
        </div>
      </div>

      {/* Main Form Form Card */}
      <Card title="Voucher Details" subtitle="Enter transaction headers and line items">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Header Row Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 border-b border-slate-100 pb-4.5">
            <Input
              label="Voucher Date"
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              required
            />

            <Input
              label="Voucher No."
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              disabled={!!activeId}
              required
              placeholder="Auto-generated"
              className={activeId ? 'bg-slate-100/60' : ''}
            />

            <Select
              label="Bank Account Name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              options={bankOptions}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Balance</label>
              <div className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center font-bold text-slate-700 font-mono shadow-inner">
                {balance}
              </div>
            </div>

            <Input
              label="Cheque No."
              value={chequeNo}
              onChange={(e) => setChequeNo(e.target.value)}
              placeholder="Enter cheque/ref number"
            />

            <Select
              label="Drawn On"
              value={drawnOn}
              onChange={(e) => setDrawnOn(e.target.value)}
              options={bankOptions}
            />
          </div>

          {/* Grid lines Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse bg-white">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-250 font-bold text-slate-550 select-none text-[12px] tracking-wider uppercase h-10">
                  <th className="px-4.5 w-12 text-center">Srl</th>
                  <th className="px-4.5">Account Name</th>
                  <th className="px-4.5 w-48">Amount</th>
                  <th className="px-4.5">Particulars</th>
                  <th className="px-4.5 w-16 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors h-11">
                    <td className="px-4.5 text-center font-bold text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="px-3.5">
                      <select
                        value={line.accountId}
                        onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                        required
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-lg outline-none transition-all text-slate-800 h-8 cursor-pointer font-semibold"
                      >
                        <option value="">-- Select Account Name --</option>
                        {accounts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.gst_number ? `(${p.gst_number})` : ''}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.amount || ''}
                        onChange={(e) => handleLineChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        required
                        placeholder="0.00"
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-lg outline-none transition-all text-slate-800 h-8 font-bold font-mono text-right"
                      />
                    </td>
                    <td className="px-3.5">
                      <input
                        type="text"
                        value={line.particulars}
                        onChange={(e) => handleLineChange(index, 'particulars', e.target.value)}
                        placeholder="Enter particulars..."
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-lg outline-none transition-all text-slate-800 h-8 font-medium"
                      />
                    </td>
                    <td className="px-4.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(index)}
                        title="Delete Line"
                        className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row & Totals Section */}
          <div className="flex justify-between items-center mt-1 pb-2">
            <Button type="button" variant="secondary" onClick={handleAddLine} className="font-bold cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" /> Add Row
            </Button>

            {/* Voucher Total display matching mockup styles */}
            <div className="flex items-center gap-3 select-none">
              <span className="text-slate-600 font-bold uppercase tracking-wide text-[12px]">Voucher Total</span>
              <div 
                className="h-10 px-5 bg-emerald-50 border border-emerald-150 rounded-xl flex items-center justify-end font-extrabold text-rose-600 font-mono text-sm shadow-inner min-w-[140px]"
                style={{ backgroundColor: '#e2f9e9', border: '1px solid #c2eecf' }}
              >
                {calculateTotal().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4.5 mt-2">
            <Button type="button" variant="secondary" onClick={handleClear} className="font-bold cursor-pointer">
              Cancel / New
            </Button>
            <Button type="submit" variant="primary" className="font-bold cursor-pointer">
              <Save className="w-4 h-4 mr-1.5" /> Save Voucher
            </Button>
          </div>
        </form>
      </Card>

      {/* SEARCH / BROWSE VOUCHERS DIALOG */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title={`Search Recent ${type === 'payment' ? 'Payment' : 'Receipt'} Vouchers`}
        size="lg"
      >
        <div className="flex flex-col gap-4 text-xs">
          {loadingRecent ? (
            <div className="text-center py-8 font-semibold text-slate-450">Loading recent records...</div>
          ) : recentVouchers.length === 0 ? (
            <div className="text-center py-8 font-semibold text-slate-450">No recent vouchers found.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 h-9">
                    <th className="px-4">Voucher No</th>
                    <th className="px-4">Date</th>
                    <th className="px-4">Bank Name</th>
                    <th className="px-4">Cheque No</th>
                    <th className="px-4 text-right">Total Amount</th>
                    <th className="px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVouchers.map((v) => {
                    const totalVal = v.lines.reduce((sum: number, l: any) => sum + l.amount, 0);
                    return (
                      <tr key={v.voucherNo} className="border-b border-slate-100 hover:bg-slate-50 h-10 font-semibold text-slate-700">
                        <td className="px-4 font-bold text-indigo-650">{v.voucherNo}</td>
                        <td className="px-4 font-mono">{v.date}</td>
                        <td className="px-4">{v.bankAccountName}</td>
                        <td className="px-4 font-mono">{v.chequeNo || 'N/A'}</td>
                        <td className="px-4 text-right font-bold font-mono">
                          {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 text-center">
                          <button
                            onClick={() => handleSelectVoucher(v)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end border-t border-slate-100 pt-3 mt-1">
            <Button type="button" variant="secondary" onClick={() => setSearchModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
