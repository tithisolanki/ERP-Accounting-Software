import React from 'react';
import { Save } from 'lucide-react';

interface CashVoucherFormProps {
  activeType: 'payment' | 'receipt';
  docDate: string;
  setDocDate: (val: string) => void;
  selectedAccountId: string;
  setSelectedAccountId: (val: string) => void;
  filteredAccounts: any[];
  amount: string;
  setAmount: (val: string) => void;
  paymentMode: string;
  setPaymentMode: (val: string) => void;
  refNum: string;
  setRefNum: (val: string) => void;
  notes: string;
  setNotes: (val: string) => void;
  handleCashSubmit: (e: React.FormEvent) => void;
}

export const CashVoucherForm: React.FC<CashVoucherFormProps> = ({
  activeType,
  docDate,
  setDocDate,
  selectedAccountId,
  setSelectedAccountId,
  filteredAccounts,
  amount,
  setAmount,
  paymentMode,
  setPaymentMode,
  refNum,
  setRefNum,
  notes,
  setNotes,
  handleCashSubmit
}) => {
  return (
    <form onSubmit={handleCashSubmit} className="flex flex-col gap-6 bg-white border border-slate-200 rounded-2xl p-6 max-w-xl mx-auto shadow-sm select-none">
      <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-3 uppercase tracking-wider">
        {activeType} VOUCHER ENTRY
      </h3>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Voucher Date</label>
          <input
            type="date"
            value={docDate}
            onChange={(e) => setDocDate(e.target.value)}
            required
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8"
          />
        </div>
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Select Account</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 cursor-pointer"
          >
            {filteredAccounts.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.state})</option>
            ))}
          </select>
        </div>
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Amount (Rs.)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 font-mono"
          />
        </div>
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Payment Mode</label>
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 cursor-pointer"
          >
            <option value="Bank">Bank Transfer</option>
            <option value="Cash">Cash in hand</option>
            <option value="UPI">UPI / QR Scan</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Reference No</label>
          <input
            type="text"
            value={refNum}
            onChange={(e) => setRefNum(e.target.value)}
            placeholder="Cheque No / UPI Transaction ID"
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8 font-mono"
          />
        </div>
        <div className="flex items-center">
          <label className="text-[12px] font-semibold text-slate-500 w-32 shrink-0 uppercase tracking-wider">Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter brief description or remarks"
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-slate-800 h-8"
          />
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
        >
          <Save className="w-3.5 h-3.5 mr-1.5" /> Save Cash Voucher
        </button>
      </div>
    </form>
  );
};
