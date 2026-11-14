import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../components/Modal';
import { useStore } from '../../../store/useStore';
import { Save, Trash2, Play } from 'lucide-react';

interface PieceRow {
  pcs: number;
  meters: number;
}

interface PieceMetersModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempPieceText: string;
  setTempPieceText: (val: string) => void;
  mode: 'new' | 'view' | 'edit';
  handleSavePieceMeters: (overrideText?: string) => void;
}

export const PieceMetersModal: React.FC<PieceMetersModalProps> = ({
  isOpen,
  onClose,
  tempPieceText,
  setTempPieceText,
  mode,
  handleSavePieceMeters
}) => {
  const { addNotification } = useStore();
  const [rows, setRows] = useState<PieceRow[]>([]);
  const [pcsInput, setPcsInput] = useState('1');
  const [metersInput, setMetersInput] = useState('');

  const pcsInputRef = useRef<HTMLInputElement>(null);
  const metersInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRows(parsePieceText(tempPieceText));
      setPcsInput('1');
      setMetersInput('');
    }
  }, [isOpen, tempPieceText]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const pcs = parseInt(pcsInput, 10);
    const meters = parseFloat(metersInput);
    if (isNaN(pcs) || pcs <= 0 || isNaN(meters) || meters <= 0) {
      addNotification('error', 'Please enter valid positive numbers for PCS and METERS.');
      return;
    }
    setRows([...rows, { pcs, meters }]);
    setPcsInput('1');
    setMetersInput('');
    setTimeout(() => {
      metersInputRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRow();
    }
  };

  const handleDeleteRow = (index: number) => {
    if (mode === 'view') return;
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  const handleOkClick = () => {
    const serialized = serializePieceRows(rows);
    setTempPieceText(serialized);
    handleSavePieceMeters(serialized);
  };

  const totalPcs = rows.reduce((s, r) => s + r.pcs, 0);
  const totalMeters = rows.reduce((s, r) => s + (r.pcs * r.meters), 0);

  const currentPcs = parseInt(pcsInput, 10) || 0;
  const currentMeters = parseFloat(metersInput) || 0;
  const currentTotal = currentPcs * currentMeters;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Piece-wise Meters Details" size="sm">
      <div className="flex flex-col gap-4 text-xs select-none">
        
        {/* Yellow Entry Row */}
        <div className="grid grid-cols-12 gap-1 bg-[#ffffb8] p-2 border border-slate-350 rounded-lg items-center">
          <div className="col-span-3 flex flex-col gap-1">
            <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider pl-0.5">PCS</span>
            <input
              type="number"
              ref={pcsInputRef}
              disabled={mode === 'view'}
              value={pcsInput}
              onChange={(e) => setPcsInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-xs h-7 outline-none text-center"
              placeholder="Pcs"
            />
          </div>
          
          <div className="col-span-4 flex flex-col gap-1">
            <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider pl-0.5">METERS</span>
            <input
              type="number"
              ref={metersInputRef}
              disabled={mode === 'view'}
              value={metersInput}
              step="0.01"
              onChange={(e) => setMetersInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-bold text-xs h-7 outline-none text-right font-mono"
              placeholder="0.00"
            />
          </div>

          <div className="col-span-4 flex flex-col gap-1">
            <span className="font-bold text-[11px] text-slate-500 uppercase tracking-wider pl-0.5 text-right pr-0.5">TOTAL METERS</span>
            <div className="w-full px-2 py-1 bg-slate-100 border border-slate-300 rounded font-black text-xs h-7 flex items-center justify-end font-mono text-slate-700">
              {currentTotal.toFixed(2)}
            </div>
          </div>

          <div className="col-span-1 flex items-end justify-center pt-4">
            <button
              type="button"
              disabled={mode === 'view'}
              onClick={handleAddRow}
              className="p-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              title="Add pieces"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pieces Table Grid */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-slate-100 border-b border-slate-200 font-bold text-[11px] text-slate-500 uppercase tracking-wider py-1.5 text-center leading-none">
            <div className="col-span-2"></div>
            <div className="col-span-3 text-center">PCS</div>
            <div className="col-span-3 text-right pr-2">METERS</div>
            <div className="col-span-4 text-right pr-4">TOTAL METERS</div>
          </div>

          {/* Table Body (Scrollable) */}
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
            {rows.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-medium">No pieces added yet.</div>
            ) : (
              rows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 py-2 items-center text-xs font-semibold text-slate-700 hover:bg-slate-50/50">
                  <div className="col-span-2 flex justify-center text-indigo-500">
                    {mode !== 'view' ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-0.5 rounded cursor-pointer transition-all"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Play className="w-2.5 h-2.5 fill-indigo-500" />
                    )}
                  </div>
                  <div className="col-span-3 text-center font-bold">{row.pcs}</div>
                  <div className="col-span-3 text-right pr-2 font-mono">{row.meters.toFixed(2)}</div>
                  <div className="col-span-4 text-right pr-4 font-mono font-bold text-slate-900">
                    {(row.pcs * row.meters).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bottom Summary Boxes */}
        <div className="flex justify-end gap-2 items-center select-none pt-1">
          {/* Pieces Sum Box */}
          <div className="bg-[#d2f8d2] border border-[#a0cfa0] rounded-lg px-3 py-1 flex flex-col items-center shadow-sm w-20">
            <span className="text-[11px] font-bold text-slate-550 uppercase tracking-wider leading-none mb-0.5">Total Pcs</span>
            <span className="font-black font-mono text-sm text-slate-800 leading-none">{totalPcs}</span>
          </div>

          {/* Meters Sum Box */}
          <div className="bg-[#d2f8d2] border border-[#a0cfa0] rounded-lg px-4 py-1 flex flex-col items-end shadow-sm w-36">
            <span className="text-[11px] font-bold text-slate-550 uppercase tracking-wider leading-none mb-0.5">Total Meters</span>
            <span className="font-black font-mono text-sm text-slate-800 leading-none">{totalMeters.toFixed(2)}</span>
          </div>
        </div>

        {/* Centered Ok button inside Footer */}
        <div className="bg-indigo-500/90 rounded-xl p-2.5 mt-1 flex justify-center shadow-md">
          <button
            type="button"
            onClick={handleOkClick}
            className="px-6 py-1 bg-white hover:bg-slate-50 text-indigo-750 border border-slate-200 rounded font-black text-xs cursor-pointer shadow transition-all active:scale-[0.98]"
          >
            <u>O</u>k
          </button>
        </div>

      </div>
    </Modal>
  );
};

function parsePieceText(text: string): PieceRow[] {
  const numbers = text
    .split(/[\s,]+/)
    .map(Number)
    .filter(n => !isNaN(n) && n > 0);

  const rows: PieceRow[] = [];
  if (numbers.length === 0) return rows;

  let currentMeters = numbers[0];
  let currentCount = 1;

  for (let i = 1; i < numbers.length; i++) {
    if (numbers[i] === currentMeters) {
      currentCount++;
    } else {
      rows.push({ pcs: currentCount, meters: currentMeters });
      currentMeters = numbers[i];
      currentCount = 1;
    }
  }
  rows.push({ pcs: currentCount, meters: currentMeters });
  return rows;
}

function serializePieceRows(rows: PieceRow[]): string {
  const list: number[] = [];
  rows.forEach(r => {
    for (let i = 0; i < r.pcs; i++) {
      list.push(r.meters);
    }
  });
  return list.map(n => n.toFixed(2)).join(', ');
}
