import React from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { API_URL } from '../../services/client';

interface PrintAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'debtor' | 'creditor';
  accountIds: string[];
  startDate: string;
  endDate: string;
  token: string | null;
}

/** Print Allocation (R20): AC_PLUS's ADEBALOCPRNT/ACREALOCPRNT -- same multi-account,
 * date-ranged PDF preview pattern as LedgerPdfPreviewModal (Party Ledger). */
export const PrintAllocationModal: React.FC<PrintAllocationModalProps> = ({
  isOpen, onClose, side, accountIds, startDate, endDate, token
}) => {
  if (!isOpen) return null;

  const url = `${API_URL}/api/accvoucher/allocation/${side}/print-pdf?accountIds=${accountIds.join(',')}&startDate=${startDate}&endDate=${endDate}&token=${token}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Allocation PDF Preview" size="xl">
      <div className="flex flex-col gap-4 h-[78vh] select-none text-xs">
        <iframe src={url} className="w-full flex-1 border border-slate-200 rounded-xl shadow-sm bg-slate-50/10" title="Print Allocation PDF" />

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <a href={url} download="allocation-print.pdf">
            <Button variant="success">Download PDF</Button>
          </a>
        </div>
      </div>
    </Modal>
  );
};
