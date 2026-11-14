import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AccountMultiSelect } from '../../components/AccountMultiSelect';
import { AccountService, GroupService } from '../../services/api';
import { PrintAllocationModal } from './PrintAllocationModal';
import { Printer } from 'lucide-react';

/** Multi-account, date-ranged setup screen for Print Allocation, matching AC_PLUS's own
 * ADEBALOCPRNT/ACREALOCPRNT screens: an account multi-select plus a Start Date/End Date range,
 * handing off to a PDF preview once Print is pressed. */
export const PrintAllocationPage: React.FC<{ side: 'debtor' | 'creditor' }> = ({ side }) => {
  const { token, loginDate, addNotification } = useStore();
  const label = side === 'debtor' ? 'Sales' : 'Purchase';

  const [accounts, setAccounts] = useState<any[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(loginDate);
  const [endDate, setEndDate] = useState(loginDate);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
    GroupService.getGroups(token).then(setGroups).catch(() => addNotification('error', 'Failed to load groups.'));
  }, [token]);

  const handlePrint = () => {
    if (selectedAccountIds.length === 0) {
      addNotification('error', 'Select at least one account.');
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-4xl">
      <Card title={`Print ${label} Allocation`} subtitle="Pick one or more accounts and a date range, matching AC_PLUS's own batch print screen">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
          </div>

          <AccountMultiSelect accounts={accounts} groups={groups} selectedIds={selectedAccountIds} onChange={setSelectedAccountIds} />

          <Button variant="primary" disabled={selectedAccountIds.length === 0} onClick={handlePrint}
            className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9 self-end">
            <Printer className="w-4 h-4 mr-1.5" /> Print
          </Button>
        </div>
      </Card>

      <PrintAllocationModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        side={side}
        accountIds={selectedAccountIds}
        startDate={startDate}
        endDate={endDate}
        token={token}
      />
    </div>
  );
};
