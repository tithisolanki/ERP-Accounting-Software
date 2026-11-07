import React from 'react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';

interface RecentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeType: 'purchase' | 'sale' | 'payment' | 'receipt' | 'challan';
  recentVouchers: any[];
  loadVoucherIntoForm: (v: any) => void;
}

export const RecentSearchModal: React.FC<RecentSearchModalProps> = ({
  isOpen,
  onClose,
  activeType,
  recentVouchers,
  loadVoucherIntoForm
}) => {
  if (!isOpen) return null;

  const titleText = `Search Recent ${activeType === 'sale' ? 'Sales Invoices' : activeType === 'challan' ? 'Delivery Challans' : 'Purchase Bills'}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleText} size="lg">
      <div className="flex flex-col gap-4 text-xs select-none">
        <div className="max-h-[60vh] overflow-y-auto">
          {recentVouchers.length > 0 ? (
            <Table headers={['Date', 'Number', 'Account Name', 'Grand Total']}>
              {recentVouchers.map((v) => (
                <tr 
                  key={v.id} 
                  onClick={() => {
                    loadVoucherIntoForm(v);
                    onClose();
                  }}
                  className="hover:bg-slate-50 cursor-pointer font-bold text-slate-700 transition-colors border-b border-slate-100 last:border-b-0"
                >
                  <td className="px-4 py-2.5 font-mono">{v.date}</td>
                  <td className="px-4 py-2.5 font-mono text-indigo-650">
                    {activeType === 'sale' ? v.invoice_number : activeType === 'challan' ? v.challan_number : v.purchase_number}
                  </td>
                  <td className="px-4 py-2.5 truncate max-w-[220px]">
                    {activeType === 'sale' || activeType === 'challan' ? v.customer_name : v.supplier_name}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-900">
                    Rs. {v.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="font-bold text-slate-400">No recent transactions found.</p>
            </div>
          )}
        </div>
        
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

