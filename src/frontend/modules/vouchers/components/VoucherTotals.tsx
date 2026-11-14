import React from 'react';
import { Truck, Receipt } from 'lucide-react';

interface VoucherTotalsProps {
  activeType: 'purchase' | 'sale' | 'challan';
  mode: 'new' | 'view' | 'edit';
  lrNo: string;
  setLrNo: (val: string) => void;
  lrDate: string;
  setLrDate: (val: string) => void;
  transport: string;
  setTransport: (val: string) => void;
  transportsList: any[];
  deliveryAt: string;
  setDeliveryAt: (val: string) => void;
  filteredAccounts: any[];
  citiesList: any[];
  vehicleNo: string;
  setVehicleNo: (val: string) => void;
  remark: string;
  setRemark: (val: string) => void;
  totals: {
    totalPcs: number;
    totalMeters: number;
    grossAmount: number;
    gstAmount: number;
    roundedOff: number;
    grandTotal: number;
  };
  cartage: number;
  setCartage: (val: number) => void;
  postage: number;
  setPostage: (val: number) => void;
  lessValue: number;
  setLessValue: (val: number) => void;
  addValue: number;
  setAddValue: (val: number) => void;
  gstSelect: number;
  handleGstSelectChange: (val: number) => void;
}

export const VoucherTotals: React.FC<VoucherTotalsProps> = ({
  activeType,
  mode,
  lrNo,
  setLrNo,
  lrDate,
  setLrDate,
  transport,
  setTransport,
  transportsList,
  deliveryAt,
  setDeliveryAt,
  filteredAccounts,
  vehicleNo,
  setVehicleNo,
  remark,
  setRemark,
  totals,
  cartage,
  setCartage,
  postage,
  setPostage,
  lessValue,
  setLessValue,
  addValue,
  setAddValue,
  gstSelect,
  handleGstSelectChange
}) => {
  const labelClass = "w-32 shrink-0 font-bold text-slate-500 uppercase tracking-wider text-[11px]";
  const inputClass = "flex-1 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs h-8 text-slate-800 transition-all shadow-sm font-semibold disabled:bg-slate-100 disabled:text-slate-400";
  const selectClass = "flex-1 px-2.5 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-xs h-8 text-slate-800 transition-all cursor-pointer shadow-sm font-semibold disabled:bg-slate-100 disabled:text-slate-400";
  const numInputClass = "flex-1 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-right font-semibold font-mono text-slate-700 outline-none h-8 transition-all shadow-sm disabled:bg-slate-100";
  const readOnlyClass = "flex-1 px-3 py-1.5 bg-slate-100/80 border border-slate-200/80 text-right font-bold font-mono text-slate-600 outline-none h-8 rounded-lg shadow-inner";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start select-none text-xs mt-2">
      
      {/* Bottom Left Panel: Shipping/Transport Details */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-0.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-850 text-lg">Transport & Shipping</span>
        </div>

        <div className="flex flex-col gap-3.5">
          {activeType !== 'challan' && (
            <div className="flex items-center">
              <label className={labelClass}>L.R. No. & Date</label>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={lrNo}
                  disabled={mode === 'view'}
                  onChange={(e) => setLrNo(e.target.value)}
                  placeholder="LR No."
                  className={inputClass}
                />
                <input
                  type="date"
                  value={lrDate}
                  disabled={mode === 'view'}
                  onChange={(e) => setLrDate(e.target.value)}
                  className="w-32 px-3 py-1.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none text-[11px] font-semibold h-8 text-slate-800 transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Transport Dynamic Select Dropdown */}
          <div className="flex items-center">
            <label className={labelClass}>Transport</label>
            <select
              value={transport}
              disabled={mode === 'view'}
              onChange={(e) => setTransport(e.target.value)}
              className={selectClass}
            >
              <option value="">-- Select Transport --</option>
              {transportsList.map(t => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>

          {(activeType === 'sale' || activeType === 'challan') && (
            <>
              {/* Delivery At (Party Account) Dropdown */}
              <div className="flex items-center">
                <label className={labelClass}>Delivery At</label>
                <select
                  value={deliveryAt}
                  disabled={mode === 'view'}
                  onChange={(e) => setDeliveryAt(e.target.value)}
                  className={selectClass}
                >
                  <option value="">-- Select Party --</option>
                  {filteredAccounts.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <label className={labelClass}>Vehicle No.</label>
                <input
                  type="text"
                  value={vehicleNo}
                  disabled={mode === 'view'}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  placeholder="e.g. MH-12-PQ-1234"
                  className={inputClass}
                />
              </div>
            </>
          )}

          <div className="flex items-center">
            <label className={labelClass}>Remark</label>
            <input
              type="text"
              value={remark}
              disabled={mode === 'view'}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Add payment or transport remark..."
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Bottom Right Panel: Billing Totals and Tax */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4 w-full max-w-md ml-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-0.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-850 text-lg">Summary Details</span>
          </div>
          <div className="flex gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Pcs: <strong className="text-slate-800 font-mono text-xs">{totals.totalPcs}</strong></span>
            <span>Meters: <strong className="text-slate-800 font-mono text-xs">{totals.totalMeters.toFixed(2)}</strong></span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center">
            <label className={labelClass}>Gross Amount</label>
            <input
              type="text"
              readOnly
              value={totals.grossAmount.toFixed(2)}
              className={readOnlyClass}
            />
          </div>

          {activeType === 'sale' ? (
            <>
              <div className="flex items-center">
                <label className={labelClass}>Cartage (+)</label>
                <input
                  type="number"
                  step="0.01"
                  value={cartage || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => setCartage(Number(e.target.value))}
                  placeholder="0.00"
                  className={numInputClass}
                />
              </div>
              <div className="flex items-center">
                <label className={labelClass}>Postage (+)</label>
                <input
                  type="number"
                  step="0.01"
                  value={postage || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => setPostage(Number(e.target.value))}
                  placeholder="0.00"
                  className={numInputClass}
                />
              </div>
              <div className="flex items-center">
                <label className={labelClass}>Less (-)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lessValue || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => setLessValue(Number(e.target.value))}
                  placeholder="0.00"
                  className={numInputClass}
                />
              </div>
            </>
          ) : activeType === 'purchase' ? (
            <>
              <div className="flex items-center">
                <label className={labelClass}>Add Value (+)</label>
                <input
                  type="number"
                  step="0.01"
                  value={addValue || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => setAddValue(Number(e.target.value))}
                  placeholder="0.00"
                  className={numInputClass}
                />
              </div>
              <div className="flex items-center">
                <label className={labelClass}>Less Value (-)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lessValue || ''}
                  disabled={mode === 'view'}
                  onChange={(e) => setLessValue(Number(e.target.value))}
                  placeholder="0.00"
                  className={numInputClass}
                />
              </div>
            </>
          ) : null}

          <div className="flex items-center gap-2">
            <div className="w-32 shrink-0">
              <select
                value={gstSelect}
                disabled={mode === 'view'}
                onChange={(e) => handleGstSelectChange(Number(e.target.value))}
                className="w-full font-bold text-slate-500 bg-white border border-slate-200 rounded-lg outline-none h-8 cursor-pointer focus:border-indigo-500 px-2 text-xs shadow-sm"
              >
                <option value={0}>Exempt (0%)</option>
                <option value={5}>GST 5%</option>
                <option value={12}>GST 12%</option>
                <option value={18}>GST 18%</option>
              </select>
            </div>
            <input
              type="text"
              readOnly
              value={totals.gstAmount.toFixed(2)}
              className={readOnlyClass}
            />
          </div>

          {activeType === 'sale' && (
            <div className="flex items-center">
              <label className={labelClass}>Less / Add</label>
              <input
                type="number"
                step="0.01"
                value={addValue || ''}
                disabled={mode === 'view'}
                onChange={(e) => setAddValue(Number(e.target.value))}
                placeholder="0.00"
                className={numInputClass}
              />
            </div>
          )}

          <div className="flex items-center">
            <label className={labelClass}>Rounded-Off</label>
            <input
              type="text"
              readOnly
              value={totals.roundedOff.toFixed(2)}
              className={readOnlyClass}
            />
          </div>

          <div className="flex items-center bg-[#d2f8d2] mt-2 border-t border-slate-100 p-4 rounded-lg">
            <label className="w-32 shrink-0 font-bold text-slate-800 uppercase tracking-wide text-xs">GRAND TOTAL</label>
            <input
              type="text"
              readOnly
              value={totals.grandTotal.toFixed(2)}
              className="flex-1 px-4 py-2 bg-indigo-50 border border-indigo-150 text-right font-black font-mono text-[14px] text-indigo-700 outline-none h-10 rounded-lg shadow-sm"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
