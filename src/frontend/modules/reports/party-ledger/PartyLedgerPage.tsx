import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { AccountService, GroupService } from '../../../services/api';
import { Account } from '../../../../shared/types/masters';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { AccountMultiSelect } from '../../../components/AccountMultiSelect';
import { LedgerPdfPreviewModal } from './LedgerPdfPreviewModal';
import { ScrollText } from 'lucide-react';

export const PartyLedgerPage: React.FC = () => {
  const { token, loginDate, addNotification } = useStore();

  // Get start and end of Financial Year based on date
  const getFYDates = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return {
      start: `${year}-04-01`,
      end: `${year + 1}-03-31`
    };
  };

  const fy = getFYDates(loginDate || new Date().toISOString().split('T')[0]);

  const [startDate, setStartDate] = useState(fy.start);
  const [endDate, setEndDate] = useState(fy.end);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token).then(setAccounts).catch(() => addNotification('error', 'Failed to load accounts.'));
    GroupService.getGroups(token).then(setGroups).catch(() => addNotification('error', 'Failed to load groups.'));
  }, [token]);

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-2xl">
      <Card title="Party Ledger" subtitle="General Account Ledger — one or more accounts, each on its own printed page">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer"
              />
            </div>
          </div>

          <AccountMultiSelect
            accounts={accounts}
            groups={groups}
            selectedIds={selectedAccountIds}
            onChange={setSelectedAccountIds}
          />

          <Button
            variant="primary"
            disabled={selectedAccountIds.length === 0}
            onClick={() => setPreviewOpen(true)}
            className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9 self-end"
          >
            <ScrollText className="w-4 h-4 mr-1.5" /> Generate Ledger PDF
          </Button>
        </div>
      </Card>

      <LedgerPdfPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        accountIds={selectedAccountIds}
        startDate={startDate}
        endDate={endDate}
        token={token}
      />
    </div>
  );
};
