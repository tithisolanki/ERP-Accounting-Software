import React from 'react';

interface RegisterFiltersProps {
  activeRegister: 'sales' | 'purchases' | 'journal';
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  accounts: any[];
  
  salesCustomer: string;
  setSalesCustomer: (v: string) => void;
  salesCreditAccount: string;
  setSalesCreditAccount: (v: string) => void;
  salesCreditAccounts: string[];
  salesRegisterType: 'summarised' | 'detailed';
  setSalesRegisterType: (v: 'summarised' | 'detailed') => void;
  salesType: 'Finish Sales' | 'Grey Sales' | 'all';
  setSalesType: (v: 'Finish Sales' | 'Grey Sales' | 'all') => void;

  purchaseSupplier: string;
  setPurchaseSupplier: (v: string) => void;
  purchaseDebitAccount: string;
  setPurchaseDebitAccount: (v: string) => void;
  purchaseDebitAccounts: string[];
  purchaseRegisterType: 'summarised' | 'detailed';
  setPurchaseRegisterType: (v: 'summarised' | 'detailed') => void;
  purchaseTypes: { finish: boolean; grey: boolean; dyeing: boolean; expenses: boolean };
  togglePurchaseType: (key: 'finish' | 'grey' | 'dyeing' | 'expenses') => void;

  journalDebitAccount: string;
  setJournalDebitAccount: (v: string) => void;
  journalCreditAccount: string;
  setJournalCreditAccount: (v: string) => void;
  journalVoucherType: string;
  setJournalVoucherType: (v: string) => void;
  voucherTypes: any[];
}

export const RegisterFilters: React.FC<RegisterFiltersProps> = ({
  activeRegister,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  accounts,
  
  salesCustomer,
  setSalesCustomer,
  salesCreditAccount,
  setSalesCreditAccount,
  salesCreditAccounts,
  salesRegisterType,
  setSalesRegisterType,
  salesType,
  setSalesType,

  purchaseSupplier,
  setPurchaseSupplier,
  purchaseDebitAccount,
  setPurchaseDebitAccount,
  purchaseDebitAccounts,
  purchaseRegisterType,
  setPurchaseRegisterType,
  purchaseTypes,
  togglePurchaseType,

  journalDebitAccount,
  setJournalDebitAccount,
  journalCreditAccount,
  setJournalCreditAccount,
  journalVoucherType,
  setJournalVoucherType,
  voucherTypes
}) => {
  return (
    <div className="lg:w-[320px] w-full shrink-0 flex flex-col gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm text-slate-800 font-semibold select-none">
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
        Filter Parameters
      </h3>

      <div className="flex flex-col gap-4">
        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase font-bold text-slate-500">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase font-bold text-slate-500">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
          />
        </div>

        {/* Sales Filters */}
        {activeRegister === 'sales' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Customer Name</label>
              <select
                value={salesCustomer}
                onChange={(e) => setSalesCustomer(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Customers --</option>
                {accounts.filter(p => p.group_name === 'Sundry Debtors').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Credit Account</label>
              <select
                value={salesCreditAccount}
                onChange={(e) => setSalesCreditAccount(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Accounts --</option>
                {salesCreditAccounts.map((acc, index) => (
                  <option key={index} value={acc}>{acc}</option>
                ))}
                {!salesCreditAccounts.includes('SALES') && <option value="SALES">SALES</option>}
                {!salesCreditAccounts.includes('CASH A/C') && <option value="CASH A/C">CASH A/C</option>}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 border border-slate-200 p-2 rounded-lg bg-white justify-center h-14">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mb-1 leading-none">Register Layout</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="salesRegisterType"
                    checked={salesRegisterType === 'summarised'}
                    onChange={() => setSalesRegisterType('summarised')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Summarised</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="salesRegisterType"
                    checked={salesRegisterType === 'detailed'}
                    onChange={() => setSalesRegisterType('detailed')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Detailed</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 border border-slate-200 p-2 rounded-lg bg-white justify-center h-14">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mb-1 leading-none">Sales Category</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="salesTypeFilter"
                    checked={salesType === 'all'}
                    onChange={() => setSalesType('all')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">All</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="salesTypeFilter"
                    checked={salesType === 'Finish Sales'}
                    onChange={() => setSalesType('Finish Sales')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Finish</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="salesTypeFilter"
                    checked={salesType === 'Grey Sales'}
                    onChange={() => setSalesType('Grey Sales')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Grey</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Purchase Filters */}
        {activeRegister === 'purchases' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Supplier Name</label>
              <select
                value={purchaseSupplier}
                onChange={(e) => setPurchaseSupplier(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Suppliers --</option>
                {accounts.filter(p => p.group_name === 'Sundry Creditors').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Debit Account</label>
              <select
                value={purchaseDebitAccount}
                onChange={(e) => setPurchaseDebitAccount(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Accounts --</option>
                {purchaseDebitAccounts.map((acc, index) => (
                  <option key={index} value={acc}>{acc}</option>
                ))}
                {!purchaseDebitAccounts.includes('PURCHASES') && <option value="PURCHASES">PURCHASES</option>}
                {!purchaseDebitAccounts.includes('EXPENSES') && <option value="EXPENSES">EXPENSES</option>}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 border border-slate-200 p-2 rounded-lg bg-white justify-center h-14">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mb-1 leading-none">Register Layout</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="purchaseRegisterType"
                    checked={purchaseRegisterType === 'summarised'}
                    onChange={() => setPurchaseRegisterType('summarised')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Summarised</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="purchaseRegisterType"
                    checked={purchaseRegisterType === 'detailed'}
                    onChange={() => setPurchaseRegisterType('detailed')}
                    className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Detailed</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2 border border-slate-200 p-3 rounded-lg bg-white">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider leading-none">Purchase Categories</span>
              <div className="flex flex-col gap-2">
                {(['finish', 'grey', 'dyeing', 'expenses'] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={purchaseTypes[key]}
                      onChange={() => togglePurchaseType(key)}
                      className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                    />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-750">
                      {key === 'finish' ? 'Finish Purchase' : key === 'grey' ? 'Grey Purchase' : key === 'dyeing' ? 'Dyeing Charges' : 'Expenses Purchase'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Journal Filters */}
        {activeRegister === 'journal' && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Debit Account Name</label>
              <select
                value={journalDebitAccount}
                onChange={(e) => setJournalDebitAccount(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Accounts --</option>
                {accounts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Credit Account Name</label>
              <select
                value={journalCreditAccount}
                onChange={(e) => setJournalCreditAccount(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Accounts --</option>
                {accounts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Voucher Type</label>
              <select
                value={journalVoucherType}
                onChange={(e) => setJournalVoucherType(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer"
              >
                <option value="">-- All Types --</option>
                {voucherTypes.map(vt => (
                  <option key={vt.id} value={vt.name}>{vt.name}</option>
                ))}
                {voucherTypes.length === 0 && (
                  <>
                    <option value="GENERAL">GENERAL</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                    <option value="OPENING">OPENING</option>
                  </>
                )}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
