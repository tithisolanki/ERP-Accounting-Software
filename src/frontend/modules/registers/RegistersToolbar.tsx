import React from 'react';
import { RotateCw, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '../../components/Button';

interface RegisterToolbarProps {
  onReload: () => void;
  onExport: () => void;
  onPrint: (e: React.MouseEvent) => void;
}

export const RegisterToolbar: React.FC<RegisterToolbarProps> = ({ onReload, onExport, onPrint }) => {
  return (
    <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
      <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
        Live Printable Sheet
      </h4>
      <div className="flex gap-2">
        <Button size="sm" onClick={onReload} variant="secondary" className="cursor-pointer text-[11px] h-7 px-3">
          <RotateCw className="w-3 h-3 mr-1" /> Reload
        </Button>
        <Button size="sm" onClick={onExport} variant="secondary" className="cursor-pointer text-[11px] h-7 px-3">
          <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-650" /> CSV Excel
        </Button>
        <Button size="sm" onClick={onPrint} className="cursor-pointer text-[11px] h-7 px-3">
          <Printer className="w-3 h-3 mr-1" /> Print Register
        </Button>
      </div>
    </div>
  );
};
