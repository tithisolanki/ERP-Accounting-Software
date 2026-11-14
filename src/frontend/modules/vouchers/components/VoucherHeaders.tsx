import React from 'react';
import { Search, Download } from 'lucide-react';

interface VoucherHeadersProps {
  activeType: 'purchase' | 'sale' | 'challan';
  mode: 'new' | 'view' | 'edit';
  docNumber: string;
  setDocNumber: (val: string) => void;
  docDate: string;
  setDocDate: (val: string) => void;
  challanNo: string;
  setChallanNo: (val: string) => void;
  challanDate: string;
  setChallanDate: (val: string) => void;
  creditDays: number;
  setCreditDays: (val: number) => void;
  selectedAccountId: string;
  setSelectedAccountId: (val: string) => void;
  filteredAccounts: any[];
  brokerName: string;
  setBrokerName: (val: string) => void;
  brokersList: any[];
  baleNo: string;
  setBaleNo: (val: string) => void;
  orderNo: string;
  setOrderNo: (val: string) => void;
  orderDate: string;
  setOrderDate: (val: string) => void;
  salesType: string;
  setSalesType: (val: string) => void;
  creditAccount: string;
  setCreditAccount: (val: string) => void;
  creditAccountsList: string[];
  purchaseType: string;
  setPurchaseType: (val: string) => void;
  lotNumber: string | number;
  setLotNumber: (val: string | number) => void;
  addLotNumber: boolean;
  setAddLotNumber: (val: boolean) => void;
  debitAccount: string;
  setDebitAccount: (val: string) => void;
  entryNo: string;
  setEntryNo: (val: string) => void;
  handleEnquiry: () => void;
  handleFetchChallan: () => void;
  categories: any[];
}

export const VoucherHeaders: React.FC<VoucherHeadersProps> = ({
  activeType,
  mode,
  docNumber,
  setDocNumber,
  docDate,
  setDocDate,
  challanNo,
  setChallanNo,
  challanDate,
  setChallanDate,
  creditDays,
  setCreditDays,
  selectedAccountId,
  setSelectedAccountId,
  filteredAccounts,
  brokerName,
  setBrokerName,
  brokersList,
  baleNo,
  setBaleNo,
  orderNo,
  setOrderNo,
  orderDate,
  setOrderDate,
  salesType,
  setSalesType,
  creditAccount,
  setCreditAccount,
  creditAccountsList,
  purchaseType,
  setPurchaseType,
  lotNumber,
  setLotNumber,
  addLotNumber,
  setAddLotNumber,
  debitAccount,
  setDebitAccount,
  entryNo,
  setEntryNo,
  handleEnquiry,
  handleFetchChallan,
  categories
}) => {
  const inputClass = "w-full px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-xs h-8 font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400";
  const selectClass = "w-full px-2.5 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-xs h-8 font-semibold text-slate-800 cursor-pointer disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "font-bold text-slate-500 uppercase tracking-wider text-[11px]";
  const btnClass = "px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 rounded-lg text-xs font-semibold text-indigo-700 shadow-sm active:scale-95 transition-all shrink-0 h-8 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

  const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      };

  const handleFieldChange = (field: string, value: string): void => {
    if (field === 'creditAccount') {
      setCreditAccount(value);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-xs pb-1 select-none">
      
      {/* CARD 1: DOCUMENT DETAILS */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-0.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
            <Search className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-850 text-lg">Document Info</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Doc Identifier (Invoice/Challan/Entry No) */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              {activeType === 'sale' ? 'Invoice No.' : activeType === 'challan' ? 'Challan No.' : 'Entry No.'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                required
                value={docNumber}
                disabled={mode === 'view'}
                onChange={(e) => setDocNumber(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-xs h-8 font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button 
                type="button" 
                onClick={handleEnquiry} 
                className={btnClass}
              >
                <Search className="w-3.5 h-3.5 mr-1" /> Enquiry
              </button>
            </div>
          </div>

          {/* Doc Date */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              {activeType === 'sale' ? 'Invoice Date' : activeType === 'challan' ? 'Challan Date' : 'Bill Date'}
            </label>
            <input
              type="date"
              required
              value={docDate}
              disabled={mode === 'view'}
              onChange={(e) => setDocDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Linked Challan / Bill No */}
          {activeType === 'sale' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Challan No.</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={challanNo}
                    disabled={mode === 'view'}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none transition-all shadow-sm text-xs h-8 font-semibold text-slate-800 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={handleFetchChallan}
                    disabled={mode === 'view'}
                    className={btnClass}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Fetch
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Challan Date</label>
                <input
                  type="date"
                  value={challanDate}
                  disabled={mode === 'view'}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {activeType === 'purchase' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Supplier Bill No.</label>
                <input
                  type="text"
                  value={entryNo}
                  disabled={mode === 'view'}
                  onChange={(e) => setEntryNo(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Challan No.</label>
                  <input
                    type="number"
                    value={challanNo}
                    disabled={mode === 'view'}
                    onChange={(e) => setChallanNo(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Challan Date</label>
                  <input
                    type="date"
                    value={challanDate}
                    disabled={mode === 'view'}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CARD 2: PARTY & TRANSACTION TERMS */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-0.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
            <Download className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-850 text-lg">Account & Terms</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              {activeType === 'purchase' ? 'Supplier Name' : 'Customer Name'}
            </label>
            <select
              value={selectedAccountId}
              disabled={mode === 'view'}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className={selectClass}
            >
              {filteredAccounts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Broker Name</label>
            <select
              value={brokerName}
              disabled={mode === 'view'}
              onChange={(e) => setBrokerName(e.target.value)}
              className={selectClass}
            >
              <option value="">-- Direct --</option>
              {brokersList.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {activeType !== 'challan' && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Credit Days</label>
                <input
                  type="number"
                  value={creditDays}
                  disabled={mode === 'view'}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                  className={`${inputClass} font-mono`}
                />
              </div>
            )}

            {activeType === 'sale' && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Credit Account</label>
                <input
                  type="text"
                  list="credit-accounts"
                  value={creditAccount || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => handleFieldChange('creditAccount', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type Credit Account"
                  required
                  className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-xs font-semibold h-8 font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm"
                />
                <datalist id="credit-accounts">
                  {creditAccountsList.map((acc, idx) => (
                    <option key={idx} value={acc} />
                  ))}
                  {!creditAccountsList.includes('SALES') && <option value="SALES" />}
                  {!creditAccountsList.includes('CASH A/C') && <option value="CASH A/C" />}
                </datalist>
              </div>
            )}

            {activeType === 'purchase' && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Debit Account</label>
                <select
                  value={debitAccount}
                  disabled={mode === 'view'}
                  onChange={(e) => setDebitAccount(e.target.value)}
                  className={selectClass}
                >
                  <option value="PURCHASES">PURCHASES</option>
                  <option value="EXPENSES">EXPENSES A/C</option>
                </select>
              </div>
            )}
          </div>

          {/* Sales or Purchase Type (Radio Button Group) */}
          {(activeType === 'sale' || activeType === 'challan') && (
            <div className="flex flex-col gap-1.5 border border-slate-150 p-2.5 rounded-lg bg-slate-50/50 justify-center h-14 mt-1">
              <span className="font-bold text-slate-500 text-[12px] uppercase tracking-wider mb-1 leading-none">Sales Category</span>
              <div className="flex gap-4">
                {categories.filter(c => c.is_active !== 0).map((cat) => {
                  const displayName = cat.name.charAt(0).toUpperCase() + cat.name.slice(1).toLowerCase();
                  const salesValue = `${displayName} Sales`;
                  return (
                    <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="salesType"
                        checked={salesType === salesValue}
                        disabled={mode === 'view'}
                        onChange={() => setSalesType(salesValue)}
                        className="cursor-pointer w-3.5 h-3.5 accent-indigo-650"
                      />
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-600">{displayName}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeType === 'purchase' && (
            <div className="flex flex-col gap-1.5 border border-slate-150 p-2.5 rounded-lg bg-slate-50/50 justify-center min-h-[64px] mt-1">
              <label className="font-bold text-slate-500 text-[12px] uppercase tracking-wider leading-none mb-1.5">Purchase Type</label>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-600">
                <label className="flex items-center gap-1.5 select-none cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={purchaseType === 'Finish Purchase'}
                    disabled={mode === 'view'}
                    onChange={() => setPurchaseType('Finish Purchase')}
                    className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                  />
                  Finish
                </label>
                <label className="flex items-center gap-1.5 select-none cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={purchaseType === 'Grey Purchase'}
                    disabled={mode === 'view'}
                    onChange={() => setPurchaseType('Grey Purchase')}
                    className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                  />
                  Grey
                </label>
                <label className="flex items-center gap-1.5 select-none cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={purchaseType === 'Dyeing Charges'}
                    disabled={mode === 'view'}
                    onChange={() => setPurchaseType('Dyeing Charges')}
                    className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                  />
                  Dyeing Chgs
                </label>
                <label className="flex items-center gap-1.5 select-none cursor-pointer">
                  <input
                    type="radio"
                    name="purchaseType"
                    checked={purchaseType === 'Expenses Purchase'}
                    disabled={mode === 'view'}
                    onChange={() => setPurchaseType('Expenses Purchase')}
                    className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                  />
                  Expenses
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: REFERENCES & LOGISTICS */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-2 shadow-sm flex flex-col gap-3.5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-0.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
            <Search className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-850 text-lg">Reference & Logistics</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Order No.</label>
              <input
                type="text"
                value={orderNo}
                disabled={mode === 'view'}
                onChange={(e) => setOrderNo(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Order Date</label>
              <input
                type="date"
                value={orderDate}
                disabled={mode === 'view'}
                onChange={(e) => setOrderDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {(activeType === 'sale' || activeType === 'challan') && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Bale No.</label>
              <input
                type="text"
                value={baleNo}
                disabled={mode === 'view'}
                onChange={(e) => setBaleNo(e.target.value)}
                placeholder="e.g. 565*5"
                className={inputClass}
              />
            </div>
          )}

          {/* Conditional Lot Number Section for Grey/Dyeing Purchases */}
          {activeType === 'purchase' && (purchaseType === 'Grey Purchase' || purchaseType === 'Dyeing Charges') && (
            <div className="flex flex-col gap-1.5 border border-slate-150 p-2.5 rounded-lg bg-slate-50/50 justify-center min-h-[64px]">
              {purchaseType === 'Dyeing Charges' && (
                <label className="flex items-center gap-1.5 select-none cursor-pointer mb-1.5 font-bold text-slate-650">
                  <input
                    type="checkbox"
                    checked={addLotNumber}
                    disabled={mode === 'view'}
                    onChange={(e) => {
                      setAddLotNumber(e.target.checked);
                      if (!e.target.checked) setLotNumber('');
                    }}
                    className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer"
                  />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Add Lot Number</span>
                </label>
              )}

              {(purchaseType === 'Grey Purchase' || addLotNumber) && (
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Lot Number</label>
                  <input
                    type="number"
                    required
                    value={lotNumber}
                    disabled={mode === 'view'}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Enter Lot Number"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
