import React from 'react';
import { Account } from '../../shared/types/masters';
import { Button } from './Button';

export interface AccountMultiSelectProps {
  accounts: Account[];
  groups: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const AccountMultiSelect: React.FC<AccountMultiSelectProps> = ({ accounts, groups, selectedIds, onChange }) => {
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);

  const toggleGroup = (name: string) => {
    setGroupFilter(prev => prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]);
  };

  const narrowedAccounts = groupFilter.length === 0
    ? accounts
    : accounts.filter(a => a.group_name && groupFilter.includes(a.group_name));

  const toggleAccount = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter(s => s !== id) : [...selectedIds, id]);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Group Name</label>
        <div className="flex flex-wrap gap-3 p-2 border border-slate-200 rounded-lg bg-slate-50/50 max-h-24 overflow-y-auto">
          {groups.map(g => (
            <label key={g.id} className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupFilter.includes(g.name)}
                onChange={() => toggleGroup(g.name)}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              {g.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Accounts</label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => onChange(Array.from(new Set([...selectedIds, ...narrowedAccounts.map(a => a.id)])))}>
              Select All
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => onChange(selectedIds.filter(id => !narrowedAccounts.some(a => a.id === id)))}>
              UnSelect All
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-1 p-2 border border-slate-200 rounded-lg bg-slate-50/50 max-h-64 overflow-y-auto">
          {narrowedAccounts.map(a => (
            <label key={a.id} className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer select-none px-1 py-0.5 rounded hover:bg-white">
              <input
                type="checkbox"
                checked={selectedIds.includes(a.id)}
                onChange={() => toggleAccount(a.id)}
                className="w-4 h-4 rounded accent-indigo-650 cursor-pointer"
              />
              {a.name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
