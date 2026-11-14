import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { ReportsService } from '../../../services/api';
import { Button } from '../../../components/Button';
import { RotateCw, FileSpreadsheet, Printer, Scale } from 'lucide-react';

export const TrialBalancePage: React.FC = () => {
  const { token, addNotification, loginDate, company } = useStore();

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

  // Filters state
  const [startDate, setStartDate] = useState(fy.start);
  const [endDate, setEndDate] = useState(fy.end);
  const [balanceType, setBalanceType] = useState<'with_opening' | 'without_opening' | 'only_opening'>('with_opening');
  const [trialBalanceType, setTrialBalanceType] = useState<'account_wise' | 'group_wise'>('account_wise');
  const [showSubTotal, setShowSubTotal] = useState(false);

  // Data state
  const [rawBalances, setRawBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrialBalance();
  }, [startDate, endDate, balanceType]);

  const fetchTrialBalance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await ReportsService.getTrialBalance(token, {
        startDate,
        endDate,
        balanceType
      });
      setRawBalances(data || []);
    } catch (err: any) {
      addNotification('error', 'Failed to fetch Trial Balance: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  // CSV Export
  const handleExport = () => {
    let headers = ['Account Name', 'Debit Amount', 'Credit Amount'];
    let rows: any[] = [];
    const filename = `Trial_Balance_${startDate}_to_${endDate}.csv`;

    if (trialBalanceType === 'account_wise') {
      const sorted = [...rawBalances].sort((a, b) => a.name.localeCompare(b.name));
      sorted.forEach(item => {
        rows.push([
          item.name,
          item.debit > 0 ? item.debit.toFixed(2) : '',
          item.credit > 0 ? item.credit.toFixed(2) : ''
        ]);
      });
    } else {
      // Group-wise CSV format
      const groupsMap = new Map<string, any[]>();
      rawBalances.forEach(item => {
        const group = item.primaryGroupName || 'Unassigned';
        if (!groupsMap.has(group)) {
          groupsMap.set(group, []);
        }
        groupsMap.get(group)!.push(item);
      });

      const sortedGroups = Array.from(groupsMap.keys()).sort();
      sortedGroups.forEach(groupName => {
        rows.push([`-- ${groupName.toUpperCase()} --`, '', '']);
        const items = groupsMap.get(groupName) || [];
        items.sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
          rows.push([
            item.name,
            item.debit > 0 ? item.debit.toFixed(2) : '',
            item.credit > 0 ? item.credit.toFixed(2) : ''
          ]);
        });

        if (showSubTotal) {
          const subDebit = items.reduce((sum, i) => sum + i.debit, 0);
          const subCredit = items.reduce((sum, i) => sum + i.credit, 0);
          rows.push([
            `Total ${groupName}`,
            subDebit > 0 ? subDebit.toFixed(2) : '0.00',
            subCredit > 0 ? subCredit.toFixed(2) : '0.00'
          ]);
        }
      });
    }

    // Grand totals row
    const grandDebit = rawBalances.reduce((sum, i) => sum + i.debit, 0);
    const grandCredit = rawBalances.reduce((sum, i) => sum + i.credit, 0);
    rows.push([
      'Grand Totals',
      grandDebit.toFixed(2),
      grandCredit.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Grand totals calculations
  const grandDebit = rawBalances.reduce((sum, item) => sum + (item.debit || 0), 0);
  const grandCredit = rawBalances.reduce((sum, item) => sum + (item.credit || 0), 0);

  // Group-wise layout structure
  const getGroupedBalances = () => {
    const groupsMap = new Map<string, any[]>();
    rawBalances.forEach(item => {
      const groupName = item.primaryGroupName || 'Unassigned';
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName)!.push(item);
    });

    return Array.from(groupsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const groupedBalances = getGroupedBalances();

  return (
    <div className="flex flex-col gap-5 select-none text-xs">
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

      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-sm font-bold text-slate-800 tracking-tight">Trial Balance</h1>
          <p className="text-[12px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Audit debit & credit accounting balances equality
          </p>
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* Left Sidebar Filter Pane */}
        <div className="w-full lg:w-[280px] bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-5 select-none shrink-0">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Scale className="w-4 h-4 text-indigo-650" />
            <span className="font-bold text-slate-700 text-xs">Report Configuration</span>
          </div>

          {/* Date Parameters */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
            />
          </div>

          {/* Balance Type Radio Group */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase font-bold text-slate-500">Balance Type</label>
            <div className="flex flex-col gap-1.5 bg-white p-2.5 border border-slate-250 rounded-xl">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="balanceType"
                  checked={balanceType === 'with_opening'}
                  onChange={() => setBalanceType('with_opening')}
                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                />
                <span>Print With Opening Balance</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="balanceType"
                  checked={balanceType === 'without_opening'}
                  onChange={() => setBalanceType('without_opening')}
                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                />
                <span>Print Without Opening Balance</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="balanceType"
                  checked={balanceType === 'only_opening'}
                  onChange={() => setBalanceType('only_opening')}
                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                />
                <span>Print Only Opening Balance</span>
              </label>
            </div>
          </div>

          {/* Trial Balance Type Radio Group */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] uppercase font-bold text-slate-500">Trial Balance Type</label>
            <div className="flex flex-col gap-1.5 bg-white p-2.5 border border-slate-250 rounded-xl">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="trialBalanceType"
                  checked={trialBalanceType === 'account_wise'}
                  onChange={() => setTrialBalanceType('account_wise')}
                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                />
                <span>Account-wise</span>
              </label>
              <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="trialBalanceType"
                  checked={trialBalanceType === 'group_wise'}
                  onChange={() => setTrialBalanceType('group_wise')}
                  className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                />
                <span>Group-wise</span>
              </label>
            </div>
          </div>

          {/* Group-wise Sub-total options */}
          {trialBalanceType === 'group_wise' && (
            <div className="flex flex-col gap-2">
              <label className="text-[11px] uppercase font-bold text-slate-500">Formatting</label>
              <div className="bg-white p-2.5 border border-slate-250 rounded-xl">
                <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSubTotal}
                    onChange={(e) => setShowSubTotal(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-indigo-600 cursor-pointer"
                  />
                  <span>Group-wise Sub-Total</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Sheet Pane */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Actions Toolbar */}
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
              Live Printable Sheet
            </h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={fetchTrialBalance} variant="secondary" className="cursor-pointer text-[11px] h-7 px-3">
                <RotateCw className="w-3 h-3 mr-1" /> Reload
              </Button>
              <Button size="sm" onClick={handleExport} variant="secondary" className="cursor-pointer text-[11px] h-7 px-3">
                <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-650" /> CSV Excel
              </Button>
              <Button size="sm" onClick={handlePrint} className="cursor-pointer text-[11px] h-7 px-3">
                <Printer className="w-3 h-3 mr-1" /> Print Sheet
              </Button>
            </div>
          </div>

          {/* Formatted Paper Sheet */}
          <div
            id="print-section"
            className="bg-white border border-slate-200 shadow-md rounded-xl p-8 max-w-5xl mx-auto w-full select-text min-h-[700px] flex flex-col text-slate-800"
          >
            {/* Header info */}
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
                Trial Balance Report ({trialBalanceType === 'account_wise' ? 'Account-wise' : 'Group-wise'} view)
              </h3>
              <p className="text-[11px] font-bold text-slate-500 font-mono tracking-wider mt-1.5">
                Period: {formatDateForDisplay(startDate)} To {formatDateForDisplay(endDate)}
              </p>
            </div>

            <hr className="border-t border-slate-250 mb-4" />

            {/* Table Detail lists */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-400 font-bold text-xs animate-pulse">
                Generating Trial Balance...
              </div>
            ) : rawBalances.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-20 text-slate-400 font-bold text-xs italic">
                No active balances found for the selected configuration.
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-400 font-bold text-slate-700">
                      <th className="py-2.5 px-3 text-[11px] uppercase">Account Name</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase text-right w-[150px]">Debit Amount</th>
                      <th className="py-2.5 px-3 text-[11px] uppercase text-right w-[150px]">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Account-wise list view */}
                    {trialBalanceType === 'account_wise' &&
                      [...rawBalances]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((item) => (
                          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-slate-800">
                            <td className="py-2 px-3 font-semibold text-slate-700">{item.name}</td>
                            <td className="py-2 px-3 font-mono text-right text-slate-700">
                              {item.debit > 0 ? formatCurrency(item.debit) : ''}
                            </td>
                            <td className="py-2 px-3 font-mono text-right text-slate-700">
                              {item.credit > 0 ? formatCurrency(item.credit) : ''}
                            </td>
                          </tr>
                        ))}

                    {/* Group-wise categorized lists */}
                    {trialBalanceType === 'group_wise' &&
                      groupedBalances.map(([groupName, items]) => (
                        <React.Fragment key={groupName}>
                          {/* Group Subheading */}
                          <tr className="bg-slate-50/50">
                            <td colSpan={3} className="py-2.5 px-3 font-black text-slate-850 uppercase border-b border-slate-200">
                              <span className="underline">{groupName}</span>
                            </td>
                          </tr>
                          {/* Group Members */}
                          {items
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((item) => (
                              <tr key={item.id} className="border-b border-slate-100/50 hover:bg-slate-50/20 text-slate-800">
                                <td className="py-2 px-6 text-slate-750 font-semibold">{item.name}</td>
                                <td className="py-2 px-3 font-mono text-right text-slate-700">
                                  {item.debit > 0 ? formatCurrency(item.debit) : ''}
                                </td>
                                <td className="py-2 px-3 font-mono text-right text-slate-700">
                                  {item.credit > 0 ? formatCurrency(item.credit) : ''}
                                </td>
                              </tr>
                            ))}
                          {/* Optional Sub-Total rows */}
                          {showSubTotal && (
                            <tr className="border-b border-slate-300 font-bold bg-slate-50/20 text-slate-750">
                              <td className="py-2 px-6 italic font-bold">Total {groupName}</td>
                              <td className="py-2 px-3 font-mono text-right border-t border-slate-200">
                                {formatCurrency(items.reduce((sum, i) => sum + i.debit, 0))}
                              </td>
                              <td className="py-2 px-3 font-mono text-right border-t border-slate-200">
                                {formatCurrency(items.reduce((sum, i) => sum + i.credit, 0))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}

                    {/* Double-line spacer */}
                    <tr>
                      <td colSpan={3} className="py-1"></td>
                    </tr>

                    {/* Grand totals */}
                    <tr className="border-t-2 border-b-4 border-slate-400 font-black bg-slate-100/40 text-slate-900">
                      <td className="py-3 px-3 text-[11px] uppercase font-black tracking-wider text-slate-850">
                        Grand Totals
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-indigo-750 text-xs font-black">
                        {formatCurrency(grandDebit)}
                      </td>
                      <td className="py-3 px-3 font-mono text-right text-indigo-750 text-xs font-black">
                        {formatCurrency(grandCredit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
