import React from 'react';

interface RegisterSummaryProps {
  activeRegister: 'sales' | 'purchases' | 'journal';
  salesRegisterType: 'summarised' | 'detailed';
  purchaseRegisterType: 'summarised' | 'detailed';
  filteredSales: any[];
  filteredPurchases: any[];
  filteredJournals: any[];
  salesSummary: any;
  purchaseSummary: any;
  journalSummary: any;
  formatCurrency: (val: number) => string;
}

export const RegisterSummary: React.FC<RegisterSummaryProps> = ({
  activeRegister,
  salesRegisterType,
  purchaseRegisterType,
  filteredSales,
  filteredPurchases,
  filteredJournals,
  salesSummary,
  purchaseSummary,
  journalSummary,
  formatCurrency
}) => {
  if (activeRegister === 'sales' && salesRegisterType === 'detailed' && filteredSales.length > 0) {
    return (
      <div className="border-t-2 border-slate-400 pt-4 mt-5 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold select-none text-xs w-full">
        <span className="text-[11px] uppercase text-slate-700 font-black">
          Register Grand Totals ({filteredSales.length} Invoices)
        </span>
        <div className="flex flex-wrap gap-5 text-right font-mono text-slate-700">
          <div>Total Pcs: <strong className="text-slate-850 font-bold">{salesSummary.pcs}</strong></div>
          <div>Total Mtrs: <strong className="text-slate-850 font-bold">{salesSummary.meters} m</strong></div>
          <div>Taxable Val: <strong className="text-slate-850 font-bold">{formatCurrency(salesSummary.taxable)}</strong></div>
          <div>GST Amt: <strong className="text-slate-850 font-bold">{formatCurrency(salesSummary.gst)}</strong></div>
          <div>Grand Total: <strong className="text-indigo-700 font-black">{formatCurrency(salesSummary.total)}</strong></div>
        </div>
      </div>
    );
  }

  if (activeRegister === 'purchases' && purchaseRegisterType === 'detailed' && filteredPurchases.length > 0) {
    return (
      <div className="border-t-2 border-slate-400 pt-4 mt-5 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold select-none text-xs w-full">
        <span className="text-[11px] uppercase text-slate-700 font-black">
          Register Grand Totals ({filteredPurchases.length} Purchase Bills)
        </span>
        <div className="flex flex-wrap gap-5 text-right font-mono text-slate-700">
          <div>Total Pcs: <strong className="text-slate-850 font-bold">{purchaseSummary.pcs}</strong></div>
          <div>Total Mtrs: <strong className="text-slate-850 font-bold">{purchaseSummary.meters} m</strong></div>
          <div>Taxable Val: <strong className="text-slate-850 font-bold">{formatCurrency(purchaseSummary.taxable)}</strong></div>
          <div>GST Amt: <strong className="text-slate-850 font-bold">{formatCurrency(purchaseSummary.gst)}</strong></div>
          <div>Grand Total: <strong className="text-indigo-700 font-black">{formatCurrency(purchaseSummary.total)}</strong></div>
        </div>
      </div>
    );
  }

  if (activeRegister === 'journal' && filteredJournals.length > 0) {
    return (
      <div className="border-t-2 border-slate-400 pt-4 mt-5 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold select-none text-xs w-full">
        <span className="text-[11px] uppercase text-slate-700 font-black">
          Register Grand Totals ({filteredJournals.length} Journal Vouchers)
        </span>
        <div className="flex flex-wrap gap-5 text-right font-mono text-slate-700">
          <div>Total Debit: <strong className="text-emerald-700 font-bold">{formatCurrency(journalSummary.debit)}</strong></div>
          <div>Total Credit: <strong className="text-rose-700 font-bold">{formatCurrency(journalSummary.credit)}</strong></div>
        </div>
      </div>
    );
  }

  return null;
};
