import React, { useState, useMemo } from 'react';
import { Account } from '@shared/types';
import { Card } from '../../../components/Card';
import { Table } from '../../../components/Table';
import { Button } from '../../../components/Button';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';

interface AccountListProps {
  accounts: Account[];
  loading: boolean;
  canModify: boolean;
  onAddClick: () => void;
  onViewEditClick: (account: Account) => void;
  onDeleteClick: (id: string) => void;
}

export const AccountList: React.FC<AccountListProps> = ({
  accounts,
  loading,
  canModify,
  onAddClick,
  onViewEditClick,
  onDeleteClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Extract unique filter options memoized from accounts list
  const filterOptions = useMemo(() => {
    const groups = new Set<string>();
    const cities = new Set<string>();
    const states = new Set<string>();

    accounts.forEach((a) => {
      if (a.group_name) groups.add(a.group_name);
      if (a.city) cities.add(a.city);
      if (a.state) states.add(a.state);
    });

    return {
      groups: Array.from(groups).sort(),
      cities: Array.from(cities).sort(),
      states: Array.from(states).sort()
    };
  }, [accounts]);

  // Client-side memoized search and filtering
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return accounts.filter((a) => {
      const matchesQuery = !query || 
        a.name.toLowerCase().includes(query) ||
        (a.gst_number || '').toLowerCase().includes(query);

      const matchesGroup = !selectedGroup || a.group_name === selectedGroup;
      const matchesCity = !selectedCity || a.city === selectedCity;
      const matchesState = !selectedState || a.state === selectedState;

      return matchesQuery && matchesGroup && matchesCity && matchesState;
    });
  }, [accounts, searchQuery, selectedGroup, selectedCity, selectedState]);

  return (
    <Card
      title="General Account Master"
      subtitle="Add, modify and delete customer, supplier, bank, and ledger accounts"
      headerAction={
        canModify && (
          <Button size="sm" onClick={onAddClick} className="cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Account
          </Button>
        )
      }
    >
      {/* Search & Filter Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex flex-col md:flex-row gap-3 shadow-inner">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search Account Name / GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-700 focus:border-indigo-500"
          >
            <option value="">-- All Groups --</option>
            {filterOptions.groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-700 focus:border-indigo-500"
          >
            <option value="">-- All Cities --</option>
            {filterOptions.cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-700 focus:border-indigo-500"
          >
            <option value="">-- All States --</option>
            {filterOptions.states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {(searchQuery || selectedGroup || selectedCity || selectedState) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGroup('');
                setSelectedCity('');
                setSelectedState('');
              }}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-350 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-[0.98]"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm font-semibold animate-pulse">
          Loading accounts...
        </div>
      ) : filteredAccounts.length > 0 ? (
        <Table headers={['Account Name', 'Group Name', 'GSTIN', 'City', 'State', 'Opening Bal', 'Actions']}>
          {filteredAccounts.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{a.name}</td>
              <td className="px-4 py-3 text-sm text-slate-500 font-bold">{a.group_name || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-500 font-mono">{a.gst_number || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-550">{a.city || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{a.state || '-'}</td>
              <td className="px-4 py-3 text-sm font-mono text-slate-700">
                Rs. {a.opening_balance?.toLocaleString() ?? '0'}
              </td>
              <td className="px-4 py-3 text-sm flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onViewEditClick(a)} className="cursor-pointer">
                  <Edit2 className="w-3.5 h-3.5 mr-1 text-indigo-650 inline" /> View / Edit
                </Button>
                {canModify && (
                   <Button 
                     size="sm" 
                     variant="ghost" 
                     className="!text-red-500 hover:!bg-red-50 cursor-pointer" 
                     onClick={() => onDeleteClick(a.id)}
                   >
                     <Trash2 className="w-3 h-3 mr-1 inline" /> Delete
                   </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm">
          No accounts found matching the search/filter criteria.
        </div>
      )}
    </Card>
  );
};
