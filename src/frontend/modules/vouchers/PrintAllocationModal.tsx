import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { apiFetchRaw } from '../../services/client';

interface PrintAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'debtor' | 'creditor';
  accountIds: string[];
  startDate: string;
  endDate: string;
  token: string | null;
}

/** Print Allocation: AC_PLUS's ADEBALOCPRNT/ACREALOCPRNT -- same PDF preview pattern as
 * LedgerPdfPreviewModal (Party Ledger), but fetched via POST + blob URL rather than a direct
 * iframe src: a company can have 1000+ accounts, and "Select All" can mean every one of them
 * ends up in accountIds -- far more than fits in a GET URL (Node's HTTP server itself rejects
 * anything that long with 431 Request Header Fields Too Large, before the request is even
 * routed, which is why the preview used to come back silently blank). */
export const PrintAllocationModal: React.FC<PrintAllocationModalProps> = ({
  isOpen, onClose, side, accountIds, startDate, endDate, token
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !token) return;
    let currentUrl: string | null = null;
    setError(null);
    setBlobUrl(null);
    apiFetchRaw(`/api/accvoucher/allocation/${side}/print-pdf`, token, {
      method: 'POST',
      body: JSON.stringify({ accountIds, startDate, endDate })
    })
      .then((res) => res.blob())
      .then((blob) => {
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      })
      .catch((err) => setError(err.message || 'Failed to generate the PDF.'));

    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [isOpen, token, side, accountIds, startDate, endDate]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Allocation PDF Preview" size="xl">
      <div className="flex flex-col gap-4 h-[78vh] select-none text-xs">
        {error ? (
          <div className="flex-1 flex items-center justify-center text-rose-600 font-semibold">{error}</div>
        ) : blobUrl ? (
          <iframe src={blobUrl} className="w-full flex-1 border border-slate-200 rounded-xl shadow-sm bg-slate-50/10" title="Print Allocation PDF" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 font-semibold">Generating PDF...</div>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {blobUrl && (
            <a href={blobUrl} download="allocation-print.pdf">
              <Button variant="success">Download PDF</Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
};
