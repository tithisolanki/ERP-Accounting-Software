import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { Modal } from '../../components/Modal';
import { LookupService, AccVoucherService, AccountService } from '../../services/api';
import { Plus, Trash2, Save, Search, Edit2 } from 'lucide-react';

interface JournalVoucherLine {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  particulars: string;
}

export const JournalVouchers: React.FC = () => {
  const { token, addNotification, loginDate } = useStore();

  // Form states
  const [voucherDate, setVoucherDate] = useState(loginDate);
  const [voucherNo, setVoucherNo] = useState('');
  const [voucherType, setVoucherType] = useState('GENERAL');

  // Input Row state (row above the table)
  const [inputAccountId, setInputAccountId] = useState('');
  const [inputDebitAmount, setInputDebitAmount] = useState<string>('');
  const [inputCreditAmount, setInputCreditAmount] = useState<string>('');
  const [inputParticulars, setInputParticulars] = useState('');

  // Table grid states (prepopulated as empty to match Sales Invoice pattern)
  const [lines, setLines] = useState<JournalVoucherLine[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Masters & Search
  const [accounts, setAccounts] = useState<any[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // const fallbackTypeOptions = [
  //   { value: 'GENERAL', label: 'GENERAL' },
  //   { value: 'TRANSFER', label: 'TRANSFER' },
  //   { value: 'ADJUSTMENT', label: 'ADJUSTMENT' },
  //   { value: 'OPENING', label: 'OPENING' }
  // ];

  const [typeOptions, setTypeOptions] = useState<{ value: string; label: string }[]>([] );

  // Load parties, next voucher no, and custom voucher types on mount
  useEffect(() => {
    loadAccounts();
    loadNextVoucherNo();
    loadVoucherTypes();
  }, []);

  const loadVoucherTypes = async () => {
    if (!token) return;
    try {
      const data = await LookupService.getJournalVoucherTypes(token);
      if (data && data.length > 0) {
        const mapped = data.map((item) => ({ value: item.name, label: item.name }));
        setTypeOptions(mapped);
        const hasGeneral = mapped.some((m) => m.value === 'GENERAL');
        setVoucherType(hasGeneral ? 'GENERAL' : mapped[0].value);
      }
    } catch {
      addNotification('error', 'Failed to load voucher types. Using default types.');
    }
  };

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
      const data = await AccVoucherService.getJournalVouchers(token) as { voucherNo: string }[];
      const voucherNumbers = data
        .map((item) => parseInt(item.voucherNo) || 0)
        .filter((n) => n > 0);
      const maxNo = voucherNumbers.length > 0 ? Math.max(...voucherNumbers) : 0;
      setVoucherNo(String(maxNo + 1));
    } catch {
      setVoucherNo('1');
    }
  };

  // Direct line modification handlers matching Sales Invoice
  const handleAddOrUpdateLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputAccountId) {
      addNotification('warning', 'Please select an Account Name.');
      return;
    }
    const dr = parseFloat(inputDebitAmount) || 0;
    const cr = parseFloat(inputCreditAmount) || 0;
    if (dr < 0 || cr < 0) {
      addNotification('warning', 'Amounts cannot be negative.');
      return;
    }
    if (dr === 0 && cr === 0) {
      addNotification('warning', 'Please enter a Debit or Credit amount.');
      return;
    }
    if (dr > 0 && cr > 0) {
      addNotification('warning', 'A journal entry line cannot have both Debit and Credit amounts. Use separate lines.');
      return;
    }

    const newLine: JournalVoucherLine = {
      accountId: inputAccountId,
      debitAmount: dr,
      creditAmount: cr,
      particulars: inputParticulars
    };

    if (editingIndex !== null) {
      // Update existing line
      const updated = [...lines];
      updated[editingIndex] = newLine;
      setLines(updated);
      setEditingIndex(null);
      addNotification('success', 'Journal line updated.');
    } else {
      // Add new line
      setLines([...lines, newLine]);
      addNotification('success', 'Journal line added.');
    }

    // Reset input fields
    setInputAccountId('');
    setInputDebitAmount('');
    setInputCreditAmount('');
    setInputParticulars('');
  };

  const handleEdit = (index: number) => {
    const item = lines[index];
    setInputAccountId(item.accountId);
    setInputDebitAmount(item.debitAmount > 0 ? String(item.debitAmount) : '');
    setInputCreditAmount(item.creditAmount > 0 ? String(item.creditAmount) : '');
    setInputParticulars(item.particulars);
    setEditingIndex(index);
  };

  const handleDelete = (index: number) => {
    setLines(lines.filter((_, idx) => idx !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setInputAccountId('');
      setInputDebitAmount('');
      setInputCreditAmount('');
      setInputParticulars('');
    }
    addNotification('info', 'Journal line removed.');
  };

  // Totals calculations
  const calculateTotalDebit = () => {
    return lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
  };

  const calculateTotalCredit = () => {
    return lines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
  };

  const handleClear = () => {
    setVoucherDate(loginDate);
    setVoucherType('GENERAL');
    setLines([]);
    setInputAccountId('');
    setInputDebitAmount('');
    setInputCreditAmount('');
    setInputParticulars('');
    setEditingIndex(null);
    setActiveId(null);
    loadNextVoucherNo();
  };

  // Save Voucher
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const validLines = lines.filter(l => l.accountId && (l.debitAmount > 0 || l.creditAmount > 0));
    if (validLines.length === 0) {
      addNotification('warning', 'Please add at least one valid account line with an amount.');
      return;
    }

    const totalDebit = calculateTotalDebit();
    const totalCredit = calculateTotalCredit();
    // Compare to the paisa: 100.10 + 200.20 is 300.29999... in floating point.
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      addNotification('error', `Out of balance: Debit Total (${totalDebit}) must equal Credit Total (${totalCredit}).`);
      return;
    }

    try {
      const savedVoucherNo = activeId || voucherNo;
      const payload = {
        type: 'journal',
        voucherDate,
        voucherNo: savedVoucherNo,
        isNew: !activeId,
        voucherType,
        lines: validLines
      };

      await AccVoucherService.create(payload, token!);

      addNotification('success', `Journal Voucher No. ${savedVoucherNo} saved successfully.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', err.message);
    }
  };

  // Browse recent JVs
  const handleBrowseVouchers = async () => {
    setSearchModalOpen(true);
    setLoadingRecent(true);
    try {
      setRecentVouchers(await AccVoucherService.getJournalVouchers(token!) as typeof recentVouchers);
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
    setVoucherType(v.voucherType || 'GENERAL');
    
    // Map lines to input structure
    const mappedLines = v.lines.map((l: any) => ({
      accountId: l.accountId,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      particulars: l.particulars
    }));

    setLines(mappedLines);
    setSearchModalOpen(false);
  };

  const handleDeleteVoucher = async () => {
    if (!activeId) return;

    if (!confirm(`Are you sure you want to delete Journal Voucher No. ${activeId}?`)) {
      return;
    }

    try {
      await AccVoucherService.deleteJournal(activeId, token!);
      addNotification('success', `Journal Voucher No. ${activeId} deleted.`);
      handleClear();
    } catch (err: any) {
      addNotification('error', 'Deletion failed: ' + err.message);
    }
  };

  const isBalanced = calculateTotalDebit() === calculateTotalCredit();

  return (
    <div className="flex flex-col gap-5 text-xs select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">
            Journal Voucher Entry
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Add / Modify / Delete Double-Entry Journal Voucher Logs
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

      {/* Main Card Form */}
      <Card title="Journal Voucher Details" subtitle="Input voucher header details and transaction rows">
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Header fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-b border-slate-100 pb-4.5">
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
              label="Voucher Type"
              value={voucherType}
              onChange={(e) => setVoucherType(e.target.value)}
              options={typeOptions}
              required
            />
          </div>

          {/* ItemEntry Form above table */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row gap-4.5 items-end">
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Account Name</label>
              <select
                value={inputAccountId}
                onChange={(e) => setInputAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all text-slate-800 h-8 cursor-pointer font-semibold"
              >
                <option value="">-- Select Account --</option>
                {accounts.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.gst_number ? `(${p.gst_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full md:w-36 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Debit Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={inputDebitAmount}
                disabled={!!inputCreditAmount && parseFloat(inputCreditAmount) > 0}
                onChange={(e) => setInputDebitAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all text-slate-800 h-8 font-bold font-mono text-right"
              />
            </div>

            <div className="w-full md:w-36 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Credit Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={inputCreditAmount}
                disabled={!!inputDebitAmount && parseFloat(inputDebitAmount) > 0}
                onChange={(e) => setInputCreditAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all text-slate-800 h-8 font-bold font-mono text-right"
              />
            </div>

            <div className="flex-1 w-full flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Particulars</label>
              <input
                type="text"
                placeholder="Particular remarks..."
                value={inputParticulars}
                onChange={(e) => setInputParticulars(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all text-slate-800 h-8 font-medium"
              />
            </div>

            <button
              type="button"
              onClick={handleAddOrUpdateLine}
              className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm transition-all cursor-pointer select-none gap-1.5 active:scale-95 shrink-0"
            >
              {editingIndex !== null ? (
                <>
                  <Save className="w-3.5 h-3.5" /> Update Row
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </>
              )}
            </button>
          </div>

          {/* ProductGridTable style display table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden select-none bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider select-none h-10">
                    <th className="px-4.5 border-r border-slate-100 text-center w-12">SRL</th>
                    <th className="px-4.5 border-r border-slate-100 min-w-[200px]">ACCOUNT NAME</th>
                    <th className="px-4.5 border-r border-slate-100 text-right w-36">DEBIT AMOUNT</th>
                    <th className="px-4.5 border-r border-slate-100 text-right w-36">CREDIT AMOUNT</th>
                    <th className="px-4.5 border-r border-slate-100">PARTICULARS</th>
                    <th className="px-4.5 text-center w-28">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4.5 py-8 text-center text-slate-400 font-medium italic bg-white"
                      >
                        No journal lines added yet. Use the form above to enter and add lines.
                      </td>
                    </tr>
                  ) : (
                    lines.map((line, index) => {
                       const account = accounts.find(p => p.id === line.accountId);
                       const accountName = account ? account.name : 'Unknown Account';
                      return (
                        <tr
                          key={index}
                          className="hover:bg-slate-50/50 bg-white text-slate-800 transition-colors h-11"
                        >
                          {/* SRL */}
                          <td className="px-4.5 border-r border-slate-100 text-center font-bold text-slate-400 font-mono">
                            {index + 1}
                          </td>
                          {/* Account Name */}
                          <td className="px-4.5 border-r border-slate-100 font-bold text-slate-700">
                            {accountName}
                          </td>
                          {/* Debit */}
                          <td className="px-4.5 border-r border-slate-100 text-right font-bold font-mono text-slate-800">
                            {line.debitAmount > 0 ? line.debitAmount.toFixed(2) : '-'}
                          </td>
                          {/* Credit */}
                          <td className="px-4.5 border-r border-slate-100 text-right font-bold font-mono text-slate-800">
                            {line.creditAmount > 0 ? line.creditAmount.toFixed(2) : '-'}
                          </td>
                          {/* Particulars */}
                          <td className="px-4.5 border-r border-slate-100 text-slate-600 font-medium">
                            {line.particulars || ''}
                          </td>
                          {/* Actions */}
                          <td className="px-4.5 text-center whitespace-nowrap">
                            <div className="flex gap-3 justify-center items-center">
                              <button
                                type="button"
                                onClick={() => handleEdit(index)}
                                title="Edit Row"
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-all cursor-pointer hover:scale-110 active:scale-95"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(index)}
                                title="Delete Row"
                                className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded transition-all cursor-pointer hover:scale-110 active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Row & Totals display */}
          <div className="flex justify-between items-center mt-1 pb-1">
            <span /> {/* Empty spacer instead of Add Row button to fit mockup flow */}

            {/* Totals displays */}
            <div className="flex items-center gap-5 select-none">
              <span className="text-slate-600 font-bold uppercase tracking-wide text-[12px]">Total :</span>
              
              <div className="flex gap-2.5">
                <div 
                  className="h-9 px-4 rounded-lg flex items-center justify-end font-extrabold text-red-650 font-mono text-xs shadow-inner min-w-[120px]"
                  style={{ backgroundColor: '#e2fbe2', border: '1px solid #c2eecf' }}
                >
                  {calculateTotalDebit().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                
                <div 
                  className="h-9 px-4 rounded-lg flex items-center justify-end font-extrabold text-red-650 font-mono text-xs shadow-inner min-w-[120px]"
                  style={{ backgroundColor: '#e2fbe2', border: '1px solid #c2eecf' }}
                >
                  {calculateTotalCredit().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Balance Warn / Status Bar */}
          {!isBalanced && (
            <div className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl font-bold text-center">
              ⚠ Vouchers must balance! Debit Total and Credit Total must be equal to save. (Difference: {Math.abs(calculateTotalDebit() - calculateTotalCredit()).toFixed(2)})
            </div>
          )}

          {/* Action Bar */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4.5 mt-2">
            <Button type="button" variant="secondary" onClick={handleClear} className="font-bold cursor-pointer">
              Cancel / New
            </Button>
            <Button 
              type="submit" 
              disabled={!isBalanced || lines.length === 0} 
              className={`font-bold h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 flex items-center gap-1.5 shadow-md shadow-blue-500/10 cursor-pointer ${(!isBalanced || lines.length === 0) ? 'opacity-50 cursor-not-allowed bg-blue-400 hover:bg-blue-400 shadow-none' : ''}`}
            >
              <Save className="w-4 h-4" /> Save Voucher
            </Button>
          </div>
        </form>
      </Card>

      {/* SEARCH / BROWSE VOUCHERS DIALOG */}
      <Modal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        title="Search Recent Journal Vouchers"
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
                    <th className="px-4">Voucher Type</th>
                    <th className="px-4 text-right">Debit Total</th>
                    <th className="px-4 text-right">Credit Total</th>
                    <th className="px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVouchers.map((v) => {
                    const drVal = v.lines.reduce((sum: number, l: any) => sum + l.debitAmount, 0);
                    const crVal = v.lines.reduce((sum: number, l: any) => sum + l.creditAmount, 0);
                    return (
                      <tr key={v.voucherNo} className="border-b border-slate-100 hover:bg-slate-50 h-10 font-semibold text-slate-700">
                        <td className="px-4 font-bold text-blue-650">{v.voucherNo}</td>
                        <td className="px-4 font-mono">{v.date}</td>
                        <td className="px-4 uppercase">{v.voucherType || 'GENERAL'}</td>
                        <td className="px-4 text-right font-bold font-mono">
                          {drVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 text-right font-bold font-mono">
                          {crVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 text-center">
                          <button
                            onClick={() => handleSelectVoucher(v)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
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
