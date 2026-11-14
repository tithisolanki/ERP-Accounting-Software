import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { API_URL } from '../../../services/client';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  printId: string | null;
  activeType: 'purchase' | 'sale' | 'payment' | 'receipt' | 'challan';
  selectedCopies: string[];
  setSelectedCopies: React.Dispatch<React.SetStateAction<string[]>>;
  docNumber: string;
  token: string | null;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  printId,
  activeType,
  selectedCopies,
  setSelectedCopies,
  docNumber,
  token
}) => {
  if (!isOpen || !printId) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Print Preview Document" size="xl">
      <div className="flex flex-col gap-4 h-[78vh] select-none text-xs">
        {/* Copy Selector Checkboxes */}
        {activeType === 'challan' ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700">
            <span>Print Copies:</span>
            <span className="text-slate-800 font-normal">2 Copies (Original for Consignee & Duplicate for Transporter)</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <span className="font-extrabold text-slate-700">Print Copies:</span>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCopies.length === 4}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCopies(['original', 'duplicate', 'triplicate', 'quadruplicate']);
                  } else {
                    setSelectedCopies([]);
                  }
                }}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              [Select All]
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCopies.includes('original')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCopies([...selectedCopies, 'original']);
                  } else {
                    setSelectedCopies(selectedCopies.filter(c => c !== 'original'));
                  }
                }}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              Original for Consignee
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCopies.includes('duplicate')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCopies([...selectedCopies, 'duplicate']);
                  } else {
                    setSelectedCopies(selectedCopies.filter(c => c !== 'duplicate'));
                  }
                }}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              Duplicate for Transporter
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCopies.includes('triplicate')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCopies([...selectedCopies, 'triplicate']);
                  } else {
                    setSelectedCopies(selectedCopies.filter(c => c !== 'triplicate'));
                  }
                }}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              Triplicate for Consignor
            </label>
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedCopies.includes('quadruplicate')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCopies([...selectedCopies, 'quadruplicate']);
                  } else {
                    setSelectedCopies(selectedCopies.filter(c => c !== 'quadruplicate'));
                  }
                }}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              Quadruplicate for Agent
            </label>
          </div>
        )}

        {selectedCopies.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border border-dashed border-rose-200 bg-rose-50/30 rounded-xl font-bold text-rose-600">
            Please check at least one copy to generate printout preview.
          </div>
        ) : (
          <iframe
            src={`${API_URL}/api/reports/${activeType === 'challan' ? 'challan-pdf' : 'invoice-pdf'}/${printId}?token=${token}&copies=${selectedCopies.join(',')}`}
            className="w-full flex-1 border border-slate-200 rounded-xl shadow-sm bg-slate-50/10"
            title="Invoice PDF"
          />
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <a
            href={selectedCopies.length > 0 ? `${API_URL}/api/reports/${activeType === 'challan' ? 'challan-pdf' : 'invoice-pdf'}/${printId}?token=${token}&copies=${selectedCopies.join(',')}` : '#'}
            download={`${activeType === 'challan' ? 'challan' : 'invoice'}_${docNumber}.pdf`}
            onClick={(e) => selectedCopies.length === 0 && e.preventDefault()}
          >
            <Button variant="success" disabled={selectedCopies.length === 0}>Download PDF</Button>
          </a>
        </div>
      </div>
    </Modal>
  );
};

