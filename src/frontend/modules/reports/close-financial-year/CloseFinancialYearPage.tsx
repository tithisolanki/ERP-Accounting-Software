import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { ReportsService } from '../../../services/api';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Lock } from 'lucide-react';

export const CloseFinancialYearPage: React.FC = () => {
  const { token, financialYear, addNotification, confirm } = useStore();
  const [closing, setClosing] = useState(false);
  const [result, setResult] = useState<{
    voucherNo: string; netProfitLoss: number;
    closedAccounts: { name: string; amount: number }[]; skippedAccounts: { name: string; amount: number }[];
  } | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val);

  const handleClose = async () => {
    if (!token) return;
    if (!(await confirm({
      title: 'Close Financial Year',
      message: `This will post an irreversible Books Closing journal voucher for FY ${financialYear}. This cannot be undone.`,
      danger: true,
      confirmLabel: 'Close Year',
      requireText: financialYear
    }))) return;

    setClosing(true);
    try {
      const data = await ReportsService.closeFinancialYear(token, financialYear);
      setResult(data);
      addNotification('success', `FY ${financialYear} closed. Voucher ${data.voucherNo} posted.`);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to close the financial year.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-2xl">
      <Card title="Close Financial Year" subtitle={`Zero out Profit & Loss accounts' movement for FY ${financialYear} and transfer the net profit/loss to the configured Capital account.`}>
        <p className="text-slate-500 mb-4">
          This posts a "Books Closing" journal voucher dated the last day of the financial year. It is safe
          to re-run: doing so replaces the previous closing voucher for this year with a freshly recomputed one.
        </p>
        <Button variant="primary" onClick={handleClose} disabled={closing} className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9">
          <Lock className="w-4 h-4 mr-1.5" /> {closing ? 'Closing...' : `Close FY ${financialYear}`}
        </Button>

        {result && (
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col gap-2">
            <p className="text-slate-700 font-semibold">
              Net {result.netProfitLoss >= 0 ? 'Profit' : 'Loss'}: {formatCurrency(Math.abs(result.netProfitLoss))}
            </p>
            <p className="text-slate-500">Voucher No. {result.voucherNo}</p>
            {result.skippedAccounts.length > 0 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <p className="font-semibold mb-1">Not included in this close (no matching ledger account):</p>
                <ul className="list-disc list-inside">
                  {result.skippedAccounts.map((s) => (
                    <li key={s.name}>{s.name}: {formatCurrency(s.amount)}</li>
                  ))}
                </ul>
                <p className="mt-1">Match these to a real account under the correct group, then re-run the close.</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
