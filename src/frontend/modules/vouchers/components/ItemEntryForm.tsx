  import React, { useEffect, useRef } from 'react';
  import { Plus, Save, Calculator } from 'lucide-react';

  interface GridItem {
    categoryId: string;
    qualityId: string;
    descriptionId: string;
    descriptionName: string;
    hsnId: string;
    hsnCode: string;
    lotNumber: string;
    pcs: number;
    quantity: number;
    rate: number;
    gstPercentage: number;
    per: string;
    pieceMeters?: string;
  }

  interface ItemEntryFormProps {
    currentItem: GridItem;
    setCurrentItem: React.Dispatch<React.SetStateAction<GridItem>>;
    editingIndex: number | null;
    onAddOrUpdate: () => void;
    onCancelEdit: () => void;
    qualities: any[];
    descriptions: any[];
    hsnMappings: any[];
    activeCategoryId: string;
    openPieceModal: (index: number) => void;
    setGstSelect: (gst: number) => void;
    isFirstItem: boolean;
    mode: 'new' | 'view' | 'edit';
  }

  export const ItemEntryForm: React.FC<ItemEntryFormProps> = ({
    currentItem,
    setCurrentItem,
    editingIndex,
    onAddOrUpdate,
    onCancelEdit,
    qualities,
    descriptions,
    hsnMappings,
    activeCategoryId,
    openPieceModal,
    setGstSelect,
    isFirstItem,
    mode
  }) => {
    const qualityRef = useRef<HTMLSelectElement>(null);

    // Clear Quality & Description if category changes
    useEffect(() => {
      if (editingIndex !== null) return;
      setCurrentItem(prev => ({
        ...prev,
        categoryId: activeCategoryId,
        qualityId: '',
        descriptionId: '',
        descriptionName: '',
        hsnId: '',
        hsnCode: '',
        pcs: 0,
        quantity: 0,
        rate: 0,
        pieceMeters: ''
      }));
    }, [activeCategoryId, setCurrentItem, editingIndex]);

    if (mode === 'view') return null;

    const rowQualities = qualities.filter(q => q.category_id === activeCategoryId);
    const computedAmount = (currentItem.quantity || 0) * (currentItem.rate || 0);

    const handleFieldChange = (field: keyof GridItem, value: any) => {
      setCurrentItem(prev => {
        const updated = { ...prev };
        
        if (field === 'qualityId') {
          updated.qualityId = value;
        } else if (field === 'descriptionName') {
          updated.descriptionName = value;
          const match = descriptions.find(d => d && d.name && d.name.toLowerCase() === value.trim().toLowerCase());
          updated.descriptionId = match ? match.id : '';
        } else if (field === 'hsnCode') {
          updated.hsnCode = value;
          const match = hsnMappings.find(m => m && m.hsn_code && String(m.hsn_code) === value.trim());
          if (match) {
            updated.hsnId = match.id;
            updated.gstPercentage = match.gst_percentage;
            if (isFirstItem) {
              setGstSelect(match.gst_percentage);
            }
          } else {
            updated.hsnId = '';
          }
        } else if (field === 'pcs' || field === 'quantity' || field === 'rate') {
          updated[field] = value === '' ? 0 : Number(value);
        } else {
          updated[field] = value as never;
        }
        return updated;
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onAddOrUpdate();
      }
    };

    return (
      <div className="border border-slate-200 rounded-xl bg-slate-50/50 p-2 shadow-sm select-none">
        <div className="text-[12px] font-bold uppercase text-indigo-650 tracking-wider mb-3 select-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
          {editingIndex !== null ? 'Modify Item' : 'Add New Item'}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-3.5 items-end">
          {/* Quality select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quality *</label>
            <select
              id="item-quality-select"
              ref={qualityRef}
              value={currentItem.qualityId}
              onChange={(e) => handleFieldChange('qualityId', e.target.value)}
              onKeyDown={handleKeyDown}
              // required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-xs font-semibold h-8 cursor-pointer text-slate-800 transition-all shadow-sm"
            >
              <option value="">-- Select Quality --</option>
              {rowQualities.map(q => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>

          {/* Description Autocomplete */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description *</label>
            <input
              type="text"
              list="descriptions-datalist"
              value={currentItem.descriptionName || ''}
              disabled={!currentItem.qualityId}
              onChange={(e) => handleFieldChange('descriptionName', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type Description"
              // required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-xs font-semibold h-8 text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm"
            />
          </div>

          {/* HSN Autocomplete */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">HSN *</label>
            <input
              type="text"
              list="hsn-datalist"
              value={currentItem.hsnCode || ''}
              disabled={!currentItem.descriptionName?.trim()}
              onChange={(e) => handleFieldChange('hsnCode', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type HSN"
              // required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-xs font-semibold h-8 font-mono text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-sm"
            />
          </div>

          {/* Pieces */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pieces</label>
            <div className="flex gap-1.5 items-center w-full">
              <input
                type="number"
                value={currentItem.pcs || ''}
                onChange={(e) => handleFieldChange('pcs', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0"
                className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-right text-xs font-semibold h-8 font-mono text-slate-800 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => openPieceModal(-1)}
                title="Edit Piece-wise Meters"
                className="px-2.5 h-8 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Meters (Quantity) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Meters *</label>
            <input
              type="number"
              step="0.01"
              value={currentItem.quantity || ''}
              onChange={(e) => handleFieldChange('quantity', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              // required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-right text-xs font-semibold h-8 font-mono text-slate-800 transition-all shadow-sm"
            />
          </div>

          {/* Rate */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rate *</label>
            <input
              type="number"
              step="0.01"
              value={currentItem.rate || ''}
              onChange={(e) => handleFieldChange('rate', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              // required
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 outline-none text-right text-xs font-semibold h-8 font-mono text-slate-800 transition-all shadow-sm"
            />
          </div>

          {/* Per select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Per</label>
            <select
              value={currentItem.per}
              onChange={(e) => handleFieldChange('per', e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg px-2 py-1.5 outline-none text-xs font-semibold h-8 cursor-pointer text-slate-800 transition-all shadow-sm"
            >
              <option value="Mtr">Mtr</option>
              <option value="Pcs">Pcs</option>
              <option value="Ltr">Ltr</option>
              <option value="Kg">Kg</option>
            </select>
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount</label>
            <input
              type="text"
              value={computedAmount > 0 ? computedAmount.toFixed(2) : '0.00'}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none text-right text-xs font-bold h-8 font-mono text-slate-600 shadow-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0 justify-end sm:justify-start">
            <button
              type="button"
              onClick={onAddOrUpdate}
              className="flex items-center justify-center gap-1.5 px-4 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0 uppercase tracking-wider"
            >
              {editingIndex !== null ? (
                <>
                  <Save size={14} /> Update
                </>
              ) : (
                <>
                  <Plus size={14} />Add
                </>
              )}
            </button>
            
            {editingIndex !== null && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-3.5 h-8 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-[0.98] cursor-pointer uppercase tracking-wider"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Hidden Datalists for Autocompletes */}
        <datalist id="descriptions-datalist">
          {descriptions.map(d => (
            <option key={d.id} value={d.name} />
          ))}
        </datalist>

        <datalist id="hsn-datalist">
          {hsnMappings.map(h => (
            <option key={h.id} value={String(h.hsn_code)} label={`${h.gst_percentage}% GST`} />
          ))}z
        </datalist>
      </div>
    );
  };