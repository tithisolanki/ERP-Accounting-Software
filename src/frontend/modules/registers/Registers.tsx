import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { LookupService, TransactionsService, ReportsService, AccountService, SalesReturnService } from '../../services/api';
import { TrendingUp, TrendingDown, FileText, RotateCcw } from 'lucide-react';

import { RegisterToolbar } from './RegistersToolbar';
import { RegisterFilters } from './RegistersFilters';
import { RegisterTable } from './RegistersTable';
import { RegisterSummary } from './RegistersSummary';
import { exportToCSV } from './utils/reportExport';

export const Registers: React.FC<{ initialRegister?: 'sales' | 'purchases' | 'journal' | 'sales_returns' }> = ({ initialRegister = 'sales' }) => {
  const { token, addNotification, loginDate, company } = useStore();
  const [activeRegister, setActiveRegister] = useState<'sales' | 'purchases' | 'journal' | 'sales_returns'>(initialRegister);

  useEffect(() => {
    if (initialRegister) {
      setActiveRegister(initialRegister);
    }
  }, [initialRegister]);

  // Master lists for filters
  const [accounts, setAccounts] = useState<any[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<any[]>([]);
  const [salesCreditAccounts, setSalesCreditAccounts] = useState<string[]>([]);
  const [purchaseDebitAccounts, setPurchaseDebitAccounts] = useState<string[]>([]);

  // Transaction data lists
  const [salesList, setSalesList] = useState<any[]>([]);
  const [purchasesList, setPurchasesList] = useState<any[]>([]);
  const [journalList, setJournalList] = useState<any[]>([]);
  const [salesReturnsList, setSalesReturnsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get start and end of Financial Year based on date
  const getFYDates = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return {
      start: `${year}-04-01`,
      end: `${year + 1}-03-31`
    };
  };

  const fy = getFYDates(loginDate || new Date().toISOString().split('T')[0]);

  // Filters State
  const [startDate, setStartDate] = useState(fy.start);
  const [endDate, setEndDate] = useState(fy.end);

  // Sales specific filters
  const [salesCustomer, setSalesCustomer] = useState('');
  const [salesRegisterType, setSalesRegisterType] = useState<'summarised' | 'detailed'>('summarised');
  const [salesType, setSalesType] = useState<'Finish Sales' | 'Grey Sales' | 'all'>('all');
  const [salesCreditAccount, setSalesCreditAccount] = useState('');

  // Sales Return specific filters -- mirrors the sales filter shape (customer only; a
  // return has no credit-account/sales-type fields of its own to filter on).
  const [salesReturnCustomer, setSalesReturnCustomer] = useState('');

  // Purchase specific filters
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseRegisterType, setPurchaseRegisterType] = useState<'summarised' | 'detailed'>('summarised');
  const [purchaseTypes, setPurchaseTypes] = useState({
    finish: true,
    grey: true,
    dyeing: true,
    expenses: true
  });
  const [purchaseDebitAccount, setPurchaseDebitAccount] = useState('');

  // Journal specific filters
  const [journalDebitAccount, setJournalDebitAccount] = useState('');
  const [journalCreditAccount, setJournalCreditAccount] = useState('');
  const [journalVoucherType, setJournalVoucherType] = useState('');

  useEffect(() => {
    fetchFiltersData();
    fetchTransactions();
  }, [activeRegister]);

  const fetchFiltersData = async () => {
    if (!token) return;
    try {
      const [accountsData, vTypesData, salesAccsData, purchaseAccsData] = await Promise.all([
        AccountService.getAll(token),
        LookupService.getJournalVoucherTypes(token),
        TransactionsService.getSalesCreditAccounts(token),
        TransactionsService.getPurchaseDebitAccounts(token)
      ]);

      setAccounts(accountsData);
      setVoucherTypes(vTypesData);
      setSalesCreditAccounts(salesAccsData);
      setPurchaseDebitAccounts(purchaseAccsData);
    } catch (err) {
      console.error('Failed to load filter lookups:', err);
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (activeRegister === 'sales') {
        setSalesList((await TransactionsService.getSales(token)) || []);
      } else if (activeRegister === 'purchases') {
        setPurchasesList((await TransactionsService.getPurchases(token)) || []);
      } else if (activeRegister === 'journal') {
        setJournalList((await ReportsService.getJournalRegister(token)) || []);
      } else if (activeRegister === 'sales_returns') {
        setSalesReturnsList((await SalesReturnService.getAll(token)) || []);
      }
    } catch (err: any) {
      addNotification('error', 'Failed to fetch transactions: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(val);
  };

  const togglePurchaseType = (key: keyof typeof purchaseTypes) => {
    setPurchaseTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // FILTERING LOGIC
  const getFilteredSales = () => {
    return salesList.filter(s => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      if (salesCustomer && s.customer_id !== salesCustomer) return false;
      if (salesType !== 'all') {
        if (salesType === 'Finish Sales' && s.sales_type !== 'Finish Sales') return false;
        if (salesType === 'Grey Sales' && s.sales_type !== 'Grey Sales') return false;
      }
      if (salesCreditAccount && s.credit_account !== salesCreditAccount) return false;
      return true;
    });
  };

  const getFilteredPurchases = () => {
    return purchasesList.filter(p => {
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
      if (purchaseSupplier && p.supplier_id !== purchaseSupplier) return false;

      const pType = (p.purchase_type || '').toUpperCase();
      if (pType.includes('FINISH') && !purchaseTypes.finish) return false;
      if (pType.includes('GREY') && !purchaseTypes.grey) return false;
      if (pType.includes('DYEING') && !purchaseTypes.dyeing) return false;
      if (pType.includes('EXPENSE') && !purchaseTypes.expenses) return false;

      if (purchaseDebitAccount && p.debit_account !== purchaseDebitAccount) return false;
      return true;
    });
  };

  const getFilteredJournalVouchers = () => {
    return journalList.filter(v => {
      if (startDate && v.date < startDate) return false;
      if (endDate && v.date > endDate) return false;
      if (journalVoucherType && v.voucherType !== journalVoucherType) return false;

      if (journalDebitAccount) {
        const hasDebit = v.lines.some((l: any) => l.accountId === journalDebitAccount && l.debitAmount > 0);
        if (!hasDebit) return false;
      }
      if (journalCreditAccount) {
        const hasCredit = v.lines.some((l: any) => l.accountId === journalCreditAccount && l.creditAmount > 0);
        if (!hasCredit) return false;
      }
      return true;
    });
  };

  const getFilteredSalesReturns = () => {
    return salesReturnsList.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (salesReturnCustomer && r.customer_id !== salesReturnCustomer) return false;
      return true;
    });
  };

  const filteredSales = getFilteredSales();
  const filteredPurchases = getFilteredPurchases();
  const filteredJournals = getFilteredJournalVouchers();
  const filteredSalesReturns = getFilteredSalesReturns();

  // CALCULATE SUMMARIES FOR REGISTERS
  const salesReturnSummary = {
    taxable: filteredSalesReturns.reduce((sum, r) => sum + (r.taxable_value || 0), 0),
    gst: filteredSalesReturns.reduce((sum, r) => sum + (r.gst_amount || 0), 0),
    total: filteredSalesReturns.reduce((sum, r) => sum + (r.total_amount || 0), 0)
  };

  const salesSummary = {
    taxable: filteredSales.reduce((sum, s) => sum + (s.taxable_value || 0), 0),
    gst: filteredSales.reduce((sum, s) => sum + (s.gst_amount || 0), 0),
    total: filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    pcs: filteredSales.reduce((sum, s) => sum + (s.items ? s.items.reduce((iSum: number, item: any) => iSum + (item.pcs || 0), 0) : 0), 0),
    meters: filteredSales.reduce((sum, s) => sum + (s.items ? s.items.reduce((iSum: number, item: any) => iSum + (item.meters || item.quantity || 0), 0) : 0), 0)
  };

  const purchaseSummary = {
    taxable: filteredPurchases.reduce((sum, p) => sum + (p.taxable_value || 0), 0),
    gst: filteredPurchases.reduce((sum, p) => sum + (p.gst_amount || 0), 0),
    total: filteredPurchases.reduce((sum, p) => sum + (p.total_amount || 0), 0),
    pcs: filteredPurchases.reduce((sum, p) => sum + (p.items ? p.items.reduce((iSum: number, item: any) => iSum + (item.pcs || 0), 0) : 0), 0),
    meters: filteredPurchases.reduce((sum, p) => sum + (p.items ? p.items.reduce((iSum: number, item: any) => iSum + (item.meters || item.quantity || 0), 0) : 0), 0)
  };

  const journalSummary = {
    debit: filteredJournals.reduce((sum, v) => sum + (v.lines ? v.lines.reduce((lSum: number, l: any) => lSum + (l.debitAmount || 0), 0) : 0), 0),
    credit: filteredJournals.reduce((sum, v) => sum + (v.lines ? v.lines.reduce((lSum: number, l: any) => lSum + (l.creditAmount || 0), 0) : 0), 0)
  };

  const handleExport = () => {
    // Sales Return Register exports itself -- exportToCSV's own union type is
    // sales/purchases/journal only, and widening it is out of this change's scope.
    if (activeRegister === 'sales_returns') {
      const headers = ['Date', 'Return No', 'Customer Name', 'Return Type', 'Taxable Val', 'GST Amt', 'Grand Total'];
      const rows = filteredSalesReturns.map(r => [r.date, r.return_number, r.customer_name, r.return_type || '', r.taxable_value, r.gst_amount, r.total_amount]);
      const csvContent = [headers.join(','), ...rows.map(r => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `Sales_Return_Register_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    exportToCSV(
      activeRegister,
      startDate,
      endDate,
      filteredSales,
      salesRegisterType,
      filteredPurchases,
      purchaseRegisterType,
      filteredJournals
    );
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs">
      {/* Dynamic inline media print styles to isolate report page */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 1.5rem !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Top Header Navigation Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Registers</h1>
          <p className="text-[12px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Track Sales, Purchases and Journal Vouchers logs
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-100/80 p-1 border border-slate-200/80 rounded-xl gap-1 shrink-0 self-start select-none overflow-x-auto max-w-full text-xs">
          <button
            onClick={() => setActiveRegister('sales')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center ${activeRegister === 'sales' ? 'bg-white text-indigo-650 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-600 hover:text-indigo-600 hover:bg-white/50'}`}
          >
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Sales Register
          </button>
          <button
            onClick={() => setActiveRegister('purchases')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center ${activeRegister === 'purchases' ? 'bg-white text-indigo-650 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-600 hover:text-indigo-650 hover:bg-white/50'}`}
          >
            <TrendingDown className="w-3.5 h-3.5 mr-1.5" /> Purchase Register
          </button>
          <button
            onClick={() => setActiveRegister('journal')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center ${activeRegister === 'journal' ? 'bg-white text-indigo-650 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-600 hover:text-indigo-650 hover:bg-white/50'}`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" /> Journal Register
          </button>
          <button
            onClick={() => setActiveRegister('sales_returns')}
            className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer flex items-center ${activeRegister === 'sales_returns' ? 'bg-white text-indigo-650 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-600 hover:text-indigo-650 hover:bg-white/50'}`}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Sales Return Register
          </button>
        </div>
      </div>

      {/* Main Content Area in Dual-Pane Split screen */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">

        {/* Left Column Pane: Filter Options Sidebar -- Sales Return Register gets its own
            compact panel (RegisterFilters is typed sales/purchases/journal only) */}
        {activeRegister === 'sales_returns' ? (
          <div className="lg:w-[320px] w-full shrink-0 flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-800 font-semibold select-none">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
              Filter Parameters
            </h3>
            <div className="flex flex-col gap-4">
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
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase font-bold text-slate-500">Customer Name</label>
                <select value={salesReturnCustomer} onChange={(e) => setSalesReturnCustomer(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer">
                  <option value="">-- All Customers --</option>
                  {accounts.filter(p => p.group_name === 'Sundry Debtors').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
        <RegisterFilters
          activeRegister={activeRegister}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          accounts={accounts}
          salesCustomer={salesCustomer}
          setSalesCustomer={setSalesCustomer}
          salesCreditAccount={salesCreditAccount}
          setSalesCreditAccount={setSalesCreditAccount}
          salesCreditAccounts={salesCreditAccounts}
          salesRegisterType={salesRegisterType}
          setSalesRegisterType={setSalesRegisterType}
          salesType={salesType}
          setSalesType={setSalesType}
          purchaseSupplier={purchaseSupplier}
          setPurchaseSupplier={setPurchaseSupplier}
          purchaseDebitAccount={purchaseDebitAccount}
          setPurchaseDebitAccount={setPurchaseDebitAccount}
          purchaseDebitAccounts={purchaseDebitAccounts}
          purchaseRegisterType={purchaseRegisterType}
          setPurchaseRegisterType={setPurchaseRegisterType}
          purchaseTypes={purchaseTypes}
          togglePurchaseType={togglePurchaseType}
          journalDebitAccount={journalDebitAccount}
          setJournalDebitAccount={setJournalDebitAccount}
          journalCreditAccount={journalCreditAccount}
          setJournalCreditAccount={setJournalCreditAccount}
          journalVoucherType={journalVoucherType}
          setJournalVoucherType={setJournalVoucherType}
          voucherTypes={voucherTypes}
        />
        )}

        {/* Right Column Pane: Live Print Preview Sheet */}
        <div className="flex-1 w-full flex flex-col gap-4">
          
          {/* Sheet Actions Toolbar */}
          <RegisterToolbar
            onReload={fetchTransactions}
            onExport={handleExport}
            onPrint={handlePrint}
          />

          {/* Formatted Paper Sheet for on-screen inspection and window.print() */}
          <div
            id="print-section"
            className="bg-white border border-slate-200 shadow-md rounded-xl p-8 max-w-5xl mx-auto w-full select-text min-h-[700px] flex flex-col text-slate-800"
          >
            {/* Header Information */}
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none mb-1">
                {company?.name || ''}
              </h2>
              {company?.address && (
                <p className="text-[11px] text-slate-550 font-bold uppercase tracking-wider leading-none mb-1">
                  {company.address}
                </p>
              )}
              <h3 className="text-xs font-bold text-slate-700 capitalize leading-none tracking-wide mt-2">
                {activeRegister === 'sales_returns' ? 'Sales Return Register' : `${activeRegister} Register (${activeRegister === 'sales' ? salesRegisterType : activeRegister === 'purchases' ? purchaseRegisterType : 'Journal'} view)`}
              </h3>
              <p className="text-[11px] font-bold text-slate-500 font-mono tracking-wider mt-1.5">
                For Period: {formatDateForDisplay(startDate)} To {formatDateForDisplay(endDate)}
              </p>
            </div>

            <hr className="border-t border-slate-250 mb-4" />

            {/* Table Details */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-400 font-bold text-xs animate-pulse">
                Generating Register Data...
              </div>
            ) : activeRegister === 'sales_returns' ? (
              <>
                {filteredSalesReturns.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 italic">No sales returns match the filter criteria.</div>
                ) : (
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
                )}
              </>
            ) : (
              <>
                <RegisterTable
                  activeRegister={activeRegister}
                  salesRegisterType={salesRegisterType}
                  purchaseRegisterType={purchaseRegisterType}
                  filteredSales={filteredSales}
                  filteredPurchases={filteredPurchases}
                  filteredJournals={filteredJournals}
                  formatDateForDisplay={formatDateForDisplay}
                  formatCurrency={formatCurrency}
                  salesSummary={salesSummary}
                  purchaseSummary={purchaseSummary}
                />

                <RegisterSummary
                  activeRegister={activeRegister}
                  salesRegisterType={salesRegisterType}
                  purchaseRegisterType={purchaseRegisterType}
                  filteredSales={filteredSales}
                  filteredPurchases={filteredPurchases}
                  filteredJournals={filteredJournals}
                  salesSummary={salesSummary}
                  purchaseSummary={purchaseSummary}
                  journalSummary={journalSummary}
                  formatCurrency={formatCurrency}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Registers;
