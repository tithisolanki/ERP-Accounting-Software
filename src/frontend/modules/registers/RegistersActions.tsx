import React from 'react';
import { Printer, FileSpreadsheet } from 'lucide-react';
import { Button } from '../../components/Button';

interface ReportActionsProps {
  onPrint: (e: React.MouseEvent) => void;
  onExportCSV: () => void;
}

export const ReportActions: React.FC<ReportActionsProps> = ({ onPrint, onExportCSV }) => {
  return (
    <div className="flex gap-2 justify-end print:hidden">
      <Button size="sm" variant="secondary" onClick={onExportCSV} className="cursor-pointer text-[11px] h-7 px-3 flex items-center">
        <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-650" /> Export to CSV
      </Button>
      <Button size="sm" onClick={onPrint} className="cursor-pointer text-[11px] h-7 px-3 flex items-center">
        <Printer className="w-3.5 h-3.5 mr-1" /> Print Layout
      </Button>
    </div>
  );
};
