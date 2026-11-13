import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { API_URL } from '../../../services/client';

interface LedgerPdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountIds: string[];
  startDate: string;
  endDate: string;
  token: string | null;
}

export const LedgerPdfPreviewModal: React.FC<LedgerPdfPreviewModalProps> = ({
  isOpen,
  onClose,
  accountIds,
  startDate,
  endDate,
  token
}) => {
  if (!isOpen) return null;

  const url = `${API_URL}/api/reports/party-ledger-pdf?accountIds=${accountIds.join(',')}&startDate=${startDate}&endDate=${endDate}&token=${token}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Party Ledger PDF Preview" size="xl">
      <div className="flex flex-col gap-4 h-[78vh] select-none text-xs">
        <iframe src={url} className="w-full flex-1 border border-slate-200 rounded-xl shadow-sm bg-slate-50/10" title="Party Ledger PDF" />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <a href={url} download="party-ledger.pdf">
            <Button variant="success">Download PDF</Button>
          </a>
        </div>
      </div>
    </Modal>
  );
};
