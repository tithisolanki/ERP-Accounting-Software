import React from 'react';

interface RegisterTableProps {
  activeRegister: 'sales' | 'purchases' | 'journal' | 'sales_returns';
  salesRegisterType: 'summarised' | 'detailed';
  purchaseRegisterType: 'summarised' | 'detailed';
  filteredSales: any[];
  filteredPurchases: any[];
  filteredJournals: any[];
  filteredSalesReturns: any[];
  formatDateForDisplay: (date: string) => string;
  formatCurrency: (val: number) => string;
  salesSummary: any;
  purchaseSummary: any;
  salesReturnSummary: any;
}

export const RegisterTable: React.FC<RegisterTableProps> = ({
  activeRegister,
  salesRegisterType,
  purchaseRegisterType,
  filteredSales,
  filteredPurchases,
  filteredJournals,
  filteredSalesReturns,
  formatDateForDisplay,
  formatCurrency,
  salesSummary,
  purchaseSummary,
  salesReturnSummary
}) => {
  if (activeRegister === 'sales') {
    if (filteredSales.length === 0) {
      return <div className="py-20 text-center text-slate-400 italic">No sales transactions match the filter criteria.</div>;
    }

    if (salesRegisterType === 'summarised') {
      return (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-400 font-bold text-slate-700">
                <th className="py-2 px-3 text-[11px] uppercase">Date</th>
                <th className="py-2 px-3 text-[11px] uppercase">Invoice No</th>
                <th className="py-2 px-3 text-[11px] uppercase">Customer Name</th>
                <th className="py-2 px-3 text-[11px] uppercase">Sales Type</th>
                <th className="py-2 px-3 text-[11px] uppercase">Credit Account</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">Taxable Val</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">GST Amt</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((s) => (
                <tr key={s.id} className="border-b border-slate-200/60 hover:bg-slate-50/20 text-slate-800">
                  <td className="py-2 px-3 font-mono text-[11px]">{formatDateForDisplay(s.date)}</td>
                  <td className="py-2 px-3 font-mono font-bold text-indigo-650">{s.invoice_number}</td>
                  <td className="py-2 px-3 font-bold text-slate-700">{s.customer_name}</td>
                  <td className="py-2 px-3 text-slate-550 font-semibold">{s.sales_type || '-'}</td>
                  <td className="py-2 px-3 text-slate-550">{s.credit_account}</td>
                  <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(s.taxable_value)}</td>
                  <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(s.gst_amount)}</td>
                  <td className="py-2 px-3 font-mono font-bold text-right text-slate-850">{formatCurrency(s.total_amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-400 font-bold bg-slate-50/40">
                <td colSpan={5} className="py-2 px-3 text-[11px] uppercase text-slate-700 font-black">Grand Totals ({filteredSales.length} bills)</td>
                <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(salesSummary.taxable)}</td>
                <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(salesSummary.gst)}</td>
                <td className="py-2 px-3 font-mono text-right text-indigo-700">{formatCurrency(salesSummary.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-5 w-full">
          {filteredSales.map((s) => (
            <div key={s.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <div className="bg-slate-50 px-3 py-2 flex flex-wrap justify-between items-center border-b border-slate-300 gap-3 font-semibold text-[11px] text-slate-600">
                <div>
                  Date: <strong className="text-slate-800 font-mono">{formatDateForDisplay(s.date)}</strong> | Invoice No: <strong className="text-indigo-650 font-mono">{s.invoice_number}</strong> | Customer: <strong className="text-slate-800">{s.customer_name}</strong>
                </div>
                <div>
                  Type: <strong className="text-slate-700">{s.sales_type || '-'}</strong> | Credit: <strong className="text-slate-700">{s.credit_account || 'Sales Account'}</strong>
                </div>
              </div>
              <div className="p-1 bg-white">
                {s.items && s.items.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                        <th className="py-1 px-3">SRL</th>
                        <th className="py-1 px-3">Fabric Quality</th>
                        <th className="py-1 px-3">Description</th>
                        <th className="py-1 px-3">HSN</th>
                        <th className="py-1 px-3 text-right">Pcs</th>
                        <th className="py-1 px-3 text-right">Meters</th>
                        <th className="py-1 px-3 text-right">Rate</th>
                        <th className="py-1 px-3 text-center">GST %</th>
                        <th className="py-1 px-3 text-right">Taxable Val</th>
                        <th className="py-1 px-3 text-right">GST Amt</th>
                        <th className="py-1 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.items.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="text-slate-700 hover:bg-slate-50/10">
                          <td className="py-1 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="py-1 px-3 font-bold text-slate-700">{item.quality_name || item.product_name}</td>
                          <td className="py-1 px-3 text-slate-550">{item.description_name || item.description || '-'}</td>
                          <td className="py-1 px-3 font-mono text-[11px]">{item.hsn_code || '-'}</td>
                          <td className="py-1 px-3 font-mono text-right font-bold">{item.pcs || 0}</td>
                          <td className="py-1 px-3 font-mono text-right">{item.meters || item.quantity} m</td>
                          <td className="py-1 px-3 font-mono text-right">{formatCurrency(item.rate)}</td>
                          <td className="py-1 px-3 font-mono text-center text-slate-400">{item.gst_percentage}%</td>
                          <td className="py-1 px-3 font-mono text-right text-slate-550">{formatCurrency(item.taxable_value)}</td>
                          <td className="py-1 px-3 font-mono text-right text-slate-400">{formatCurrency(item.gst_amount)}</td>
                          <td className="py-1 px-3 font-mono font-semibold text-right text-slate-800">{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 font-bold bg-slate-50/10">
                        <td colSpan={4} className="py-1.5 px-3 text-[11px] uppercase text-slate-500">Invoice Sums</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{s.items.reduce((sum: number, i: any) => sum + (i.pcs || 0), 0)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{s.items.reduce((sum: number, i: any) => sum + (i.meters || i.quantity || 0), 0)} m</td>
                        <td colSpan={2} className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{formatCurrency(s.taxable_value)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-550">{formatCurrency(s.gst_amount)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-indigo-700">{formatCurrency(s.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="py-2 text-center text-slate-400 italic">No items.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  if (activeRegister === 'purchases') {
    if (filteredPurchases.length === 0) {
      return <div className="py-20 text-center text-slate-400 italic">No purchase transactions match the filter criteria.</div>;
    }

    if (purchaseRegisterType === 'summarised') {
      return (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-400 font-bold text-slate-700">
                <th className="py-2 px-3 text-[11px] uppercase">Date</th>
                <th className="py-2 px-3 text-[11px] uppercase">Entry No</th>
                <th className="py-2 px-3 text-[11px] uppercase">Bill No</th>
                <th className="py-2 px-3 text-[11px] uppercase">Supplier Name</th>
                <th className="py-2 px-3 text-[11px] uppercase">Purchase Type</th>
                <th className="py-2 px-3 text-[11px] uppercase">Debit Account</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">Taxable Val</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">GST Amt</th>
                <th className="py-2 px-3 text-[11px] uppercase text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="border-b border-slate-200/60 hover:bg-slate-50/20 text-slate-800">
                  <td className="py-2 px-3 font-mono text-[11px]">{formatDateForDisplay(p.date)}</td>
                  <td className="py-2 px-3 font-mono font-bold text-indigo-650">{p.purchase_number}</td>
                  <td className="py-2 px-3 font-mono text-slate-700">{p.entry_no || '-'}</td>
                  <td className="py-2 px-3 font-bold text-slate-700">{p.supplier_name}</td>
                  <td className="py-2 px-3 text-slate-550 font-semibold">{p.purchase_type || '-'}</td>
                  <td className="py-2 px-3 text-slate-550">{p.debit_account || 'Purchase Account'}</td>
                  <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(p.taxable_value)}</td>
                  <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(p.gst_amount)}</td>
                  <td className="py-2 px-3 font-mono font-bold text-right text-slate-850">{formatCurrency(p.total_amount)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-400 font-bold bg-slate-50/40">
                <td colSpan={6} className="py-2 px-3 text-[11px] uppercase text-slate-700 font-black">Grand Totals ({filteredPurchases.length} bills)</td>
                <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(purchaseSummary.taxable)}</td>
                <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(purchaseSummary.gst)}</td>
                <td className="py-2 px-3 font-mono text-right text-indigo-700">{formatCurrency(purchaseSummary.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col gap-5 w-full">
          {filteredPurchases.map((p) => (
            <div key={p.id} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
              <div className="bg-slate-50 px-3 py-2 flex flex-wrap justify-between items-center border-b border-slate-300 gap-3 font-semibold text-[11px] text-slate-600">
                <div>
                  Date: <strong className="text-slate-800 font-mono">{formatDateForDisplay(p.date)}</strong> | Bill No: <strong className="text-indigo-650 font-mono">{p.purchase_number}</strong> | Entry No: <strong className="text-slate-700 font-mono">{p.entry_no || '-'}</strong> | Supplier: <strong className="text-slate-800">{p.supplier_name}</strong>
                </div>
                <div>
                  Type: <strong className="text-slate-700">{p.purchase_type || '-'}</strong> | Debit Acc: <strong className="text-slate-700">{p.debit_account || 'Purchase Account'}</strong>
                </div>
              </div>
              <div className="p-1 bg-white">
                {p.items && p.items.length > 0 ? (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                        <th className="py-1 px-3">SRL</th>
                        <th className="py-1 px-3">Category</th>
                        <th className="py-1 px-3">Fabric Quality</th>
                        <th className="py-1 px-3">Description</th>
                        <th className="py-1 px-3">HSN</th>
                        <th className="py-1 px-3 text-right">Pcs</th>
                        <th className="py-1 px-3 text-right">Meters</th>
                        <th className="py-1 px-3 text-right">Rate</th>
                        <th className="py-1 px-3 text-center">GST %</th>
                        <th className="py-1 px-3 text-right">Taxable Val</th>
                        <th className="py-1 px-3 text-right">GST Amt</th>
                        <th className="py-1 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((item: any, idx: number) => (
                        <tr key={item.id || idx} className="text-slate-700 hover:bg-slate-50/10">
                          <td className="py-1 px-3 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="py-1 px-3 text-slate-550 font-semibold">{item.category_name || '-'}</td>
                          <td className="py-1 px-3 font-bold text-slate-700">{item.quality_name}</td>
                          <td className="py-1 px-3 text-slate-550">{item.description_name || item.description || '-'}</td>
                          <td className="py-1 px-3 font-mono text-[11px]">{item.hsn_code || '-'}</td>
                          <td className="py-1 px-3 font-mono text-right font-bold">{item.pcs || 0}</td>
                          <td className="py-1 px-3 font-mono text-right">{item.meters || item.quantity} m</td>
                          <td className="py-1 px-3 font-mono text-right">{formatCurrency(item.rate)}</td>
                          <td className="py-1 px-3 font-mono text-center text-slate-400">{item.gst_percentage}%</td>
                          <td className="py-1 px-3 font-mono text-right text-slate-550">{formatCurrency(item.rate * (item.meters || item.quantity))}</td>
                          <td className="py-1 px-3 font-mono text-right text-slate-400">{formatCurrency(item.gst_amount)}</td>
                          <td className="py-1 px-3 font-mono font-semibold text-right text-slate-800">{formatCurrency(item.total_amount)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 font-bold bg-slate-50/10">
                        <td colSpan={5} className="py-1.5 px-3 text-[11px] uppercase text-slate-500">Invoice Sums</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{p.items.reduce((sum: number, i: any) => sum + (i.pcs || 0), 0)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{p.items.reduce((sum: number, i: any) => sum + (i.meters || i.quantity || 0), 0)} m</td>
                        <td colSpan={2} className="py-1.5 px-3"></td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-700">{formatCurrency(p.taxable_value)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-slate-550">{formatCurrency(p.gst_amount)}</td>
                        <td className="py-1.5 px-3 font-mono text-right text-indigo-700">{formatCurrency(p.total_amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="py-2 text-center text-slate-400 italic">No items.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  if (activeRegister === 'journal') {
    if (filteredJournals.length === 0) {
      return <div className="py-20 text-center text-slate-400 italic">No journal vouchers match the filter criteria.</div>;
    }

    return (
      <div className="flex flex-col gap-6 w-full">
        {filteredJournals.map((v) => (
          <div key={v.voucherNo} className="border border-slate-300 rounded-lg overflow-hidden bg-white">
            <div className="bg-slate-50 px-3 py-2 flex justify-between items-center border-b border-slate-300 font-semibold text-[11px] text-slate-650">
              <div>
                Date: <strong className="text-slate-800 font-mono">{formatDateForDisplay(v.date)}</strong> | Voucher No: <strong className="text-indigo-650 font-mono">{v.voucherNo}</strong> | Type: <strong className="text-slate-800">{v.voucherType}</strong>
              </div>
            </div>
            <div className="p-1 bg-white">
              {v.lines && v.lines.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase">
                      <th className="py-1 px-3">Account Name</th>
                      <th className="py-1 px-3 text-right">Debit Amount (Dr)</th>
                      <th className="py-1 px-3 text-right">Credit Amount (Cr)</th>
                      <th className="py-1 px-3">Particulars / Narration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.lines.map((line: any, idx: number) => (
                      <tr key={line.id || idx} className="text-slate-700 hover:bg-slate-50/10">
                        <td className="py-1 px-3 font-bold text-slate-700">{line.accountName}</td>
                        <td className="py-1 px-3 font-mono font-bold text-emerald-650 text-right">
                          {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                        </td>
                        <td className="py-1 px-3 font-mono font-bold text-rose-650 text-right">
                          {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                        </td>
                        <td className="py-1 px-3 text-slate-450 italic">{line.particulars || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-2 text-center text-slate-400 italic">No lines.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeRegister === 'sales_returns') {
    if (filteredSalesReturns.length === 0) {
      return <div className="py-20 text-center text-slate-400 italic">No sales returns match the filter criteria.</div>;
    }

    return (
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 font-bold text-slate-700">
              <th className="py-2 px-3 text-[11px] uppercase">Date</th>
              <th className="py-2 px-3 text-[11px] uppercase">Return No</th>
              <th className="py-2 px-3 text-[11px] uppercase">Customer Name</th>
              <th className="py-2 px-3 text-[11px] uppercase">Return Type</th>
              <th className="py-2 px-3 text-[11px] uppercase text-right">Taxable Val</th>
              <th className="py-2 px-3 text-[11px] uppercase text-right">GST Amt</th>
              <th className="py-2 px-3 text-[11px] uppercase text-right">Grand Total</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalesReturns.map((r) => (
              <tr key={r.id} className="border-b border-slate-200/60 hover:bg-slate-50/20 text-slate-800">
                <td className="py-2 px-3 font-mono text-[11px]">{formatDateForDisplay(r.date)}</td>
                <td className="py-2 px-3 font-mono font-bold text-indigo-650">{r.return_number}</td>
                <td className="py-2 px-3 font-bold text-slate-700">{r.customer_name}</td>
                <td className="py-2 px-3 text-slate-550 font-semibold">{r.return_type || '-'}</td>
                <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(r.taxable_value)}</td>
                <td className="py-2 px-3 font-mono text-right text-slate-650">{formatCurrency(r.gst_amount)}</td>
                <td className="py-2 px-3 font-mono font-bold text-right text-slate-850">{formatCurrency(r.total_amount)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-slate-400 font-bold bg-slate-50/40">
              <td colSpan={4} className="py-2 px-3 text-[11px] uppercase text-slate-700 font-black">Grand Totals ({filteredSalesReturns.length} returns)</td>
              <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(salesReturnSummary.taxable)}</td>
              <td className="py-2 px-3 font-mono text-right text-slate-800">{formatCurrency(salesReturnSummary.gst)}</td>
              <td className="py-2 px-3 font-mono text-right text-indigo-700">{formatCurrency(salesReturnSummary.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return null;
};
