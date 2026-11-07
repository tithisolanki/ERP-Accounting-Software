import React, { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useStore } from '../../../store/useStore';
import { GroupService } from '../../../services/api';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Table } from '../../../components/Table';
import { Edit2, Trash2, Plus, Save, X } from 'lucide-react';

interface PrimaryGroup {
  id: string;
  name: string;
  show_mailing?: number;
  show_statutory?: number;
  show_banking?: number;
  show_tds?: number;
}

interface GroupItem {
  id: string;
  name: string;
  primary_group_id?: string;
  primary_group?: string;
  show_mailing?: number;
  show_statutory?: number;
  show_banking?: number;
  show_tds?: number;
}

export const GroupMasterPage: React.FC = () => {
  const { token, addNotification, user } = useStore();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [templates, setTemplates] = useState<PrimaryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // UX State Management: 'view' | 'edit' | 'add'
  const [mode, setMode] = useState<'view' | 'edit' | 'add'>('add');

  // Form Fields State
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [primaryGroupId, setPrimaryGroupId] = useState('');

  // Primary Group Config Fields State (Admins only)
  const [showMailing, setShowMailing] = useState(true);
  const [showStatutory, setShowStatutory] = useState(true);
  const [showBanking, setShowBanking] = useState(true);
  const [showTds, setShowTds] = useState(true);

  // Tab State: 'groups' (standard company groups) | 'primary-groups' (global primary groups)
  const [activeTab, setActiveTab] = useState<'groups' | 'primary-groups'>('groups');

  const isAdmin = user?.role === 'ADMIN';
  const isPrimaryGroupsTab = activeTab === 'primary-groups';
  const isEditing = mode === 'edit' || mode === 'add';
  const isView = mode === 'view';

  const getSelectedGroup = () => groups.find((g) => g.id === selectedGroupId);

  const fetchGroups = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (isPrimaryGroupsTab) {
        const data = await GroupService.getAllTemplates(token);
        setGroups(data);
        if (data.length > 0) {
          // In primary groups mode, we automatically select the first group for inspection
          loadGroupIntoForm(data[0]);
        } else {
          resetForm();
          setMode('view');
        }
      } else {
        const data = await GroupService.getGroups(token);
        setGroups(data);
        const templatesData = await GroupService.getCompanyGroups(token);
        setTemplates(templatesData);
        resetForm();
        setMode('add');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load groups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [token, activeTab]);

  // Load a selected group's details into the form and set mode to 'view'
  const loadGroupIntoForm = (g: GroupItem) => {
    setSelectedGroupId(g.id);
    setGroupName(g.name || '');
    setPrimaryGroupId(g.primary_group_id || '');
    if (isPrimaryGroupsTab) {
      setShowMailing(g.show_mailing !== 0);
      setShowStatutory(g.show_statutory !== 0);
      setShowBanking(g.show_banking !== 0);
      setShowTds(g.show_tds !== 0);
    }
    setMode('view');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const finalName = groupName.trim();
    if (!finalName) {
      addNotification('error', 'Group name is required.');
      return;
    }

    try {
      if (mode === 'add') {
        if (isPrimaryGroupsTab) {
          addNotification('error', 'Primary groups are fixed and cannot be added.');
          return;
        }
        await GroupService.createGroup(
          {
            name: finalName,
            primary_group_id: primaryGroupId
          },
          token
        );
        addNotification('success', 'Account group created successfully.');
      } else if (mode === 'edit') {
        if (!selectedGroupId) {
          addNotification('error', 'No group selected to update.');
          return;
        }
        const entityName = isPrimaryGroupsTab
          ? 'Primary group configuration'
          : 'Account group';

        if (isPrimaryGroupsTab) {
          if (!isAdmin) {
            addNotification('error', 'Only administrators can configure primary groups.');
            return;
          }
          await GroupService.updateTemplate(
            selectedGroupId,
            {
              name: finalName,
              show_mailing: showMailing ? 1 : 0,
              show_statutory: showStatutory ? 1 : 0,
              show_banking: showBanking ? 1 : 0,
              show_tds: showTds ? 1 : 0
            },
            token
          );
        } else {
          await GroupService.updateGroup(
            selectedGroupId,
            {
              name: finalName,
              primary_group_id: primaryGroupId
            },
            token
          );
        }
        addNotification('success', `${entityName} updated successfully.`);
      }
      
      await fetchGroups();
      if (isPrimaryGroupsTab) {
        // Keep selected primary group in focus
        const found = getSelectedGroup();
        if (found) loadGroupIntoForm(found);
      } else {
        resetForm();
        setMode('add');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save account group.');
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedGroupId) return;
    if (isPrimaryGroupsTab) {
      addNotification('error', 'Primary groups are fixed and cannot be deleted.');
      return;
    }

    const selected = getSelectedGroup();
    if (!selected) return;

    if (!window.confirm(`Delete Group?\n\nGroup: ${selected.name}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await GroupService.deleteGroup(selectedGroupId, token);
      addNotification('success', 'Account group deleted successfully.');
      await fetchGroups();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete account group.');
    }
  };

  const resetForm = () => {
    setSelectedGroupId('');
    setGroupName('');
    setPrimaryGroupId('');
    setShowMailing(true);
    setShowStatutory(true);
    setShowBanking(true);
    setShowTds(true);
  };

  const handleCancel = () => {
    if (selectedGroupId) {
      const original = getSelectedGroup();
      if (original) {
        loadGroupIntoForm(original);
      } else {
        setMode('view');
      }
    } else {
      if (groups.length > 0) {
        loadGroupIntoForm(groups[0]);
      } else {
        resetForm();
        setMode(isPrimaryGroupsTab ? 'view' : 'add');
      }
    }
  };

  const startAddMode = () => {
    resetForm();
    setMode('add');
  };

  return (
    <div className="flex flex-col gap-6 p-1 select-none">
      
      {/* Admin Tab Toggle */}
      {isAdmin && (
        <div className="flex bg-slate-100 border border-slate-200/80 rounded-xl p-1 gap-1 self-start max-w-xs shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'groups'
                ? 'bg-white text-indigo-650 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Account Groups
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('primary-groups')}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'primary-groups'
                ? 'bg-white text-indigo-650 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Primary Groups
          </button>
        </div>
      )}

      <Card
        title={isPrimaryGroupsTab ? "Primary Group Master" : "Group Master"}
        subtitle={
          isPrimaryGroupsTab 
            ? (mode === 'edit' ? `Configure UI block visibility for primary group: ${groupName}` : `Inspect primary group block rules`) 
            : (mode === 'add' ? `Create a new ledger group` : mode === 'edit' ? `Modify group: ${groupName}` : `Inspect group details`)
        }
      >
        {!isPrimaryGroupsTab && isView && (
          <div className="flex justify-end mb-4">
            <Button type="button" onClick={startAddMode} size="sm" className="cursor-pointer h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add New Group
            </Button>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 p-5 rounded-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            
            {/* Group Name Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">
                {isPrimaryGroupsTab ? 'Primary Group Name (Uneditable)' : 'Group Name'}
              </label>
              <input
                type="text"
                required
                disabled={!isEditing || isPrimaryGroupsTab}
                placeholder={isPrimaryGroupsTab ? "" : "e.g. Unsecured Loans"}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8 disabled:bg-slate-100/70 disabled:text-slate-500 disabled:border-slate-200"
              />
            </div>

            {/* Under Primary Group Field */}
            {!isPrimaryGroupsTab && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase font-bold text-slate-500">Under Primary Group</label>
                <select
                  required
                  disabled={!isEditing}
                  value={primaryGroupId}
                  onChange={(e) => setPrimaryGroupId(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg outline-none h-8 cursor-pointer font-semibold text-slate-750 text-xs disabled:bg-slate-100/70 disabled:text-slate-500 disabled:border-slate-200"
                >
                  <option value="">-- Select Primary Group --</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Required UI Configuration Checkboxes (Primary Groups Mode Only) */}
            {isPrimaryGroupsTab && (
              <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-xl p-4 mt-2 flex flex-col gap-3">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Required UI Blocks in Account Master</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={showMailing}
                      onChange={(e) => setShowMailing(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    Mailing Details
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={showStatutory}
                      onChange={(e) => setShowStatutory(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    Statutory Details
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={showBanking}
                      onChange={(e) => setShowBanking(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    Banking Details
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-650 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={showTds}
                      onChange={(e) => setShowTds(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    TDS Details
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            {isView ? (
              <>
                <Button type="button" onClick={() => setMode('edit')} className="cursor-pointer h-8 text-xs flex items-center">
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> {isPrimaryGroupsTab ? 'Edit Configuration' : 'Edit Group'}
                </Button>
                {!isPrimaryGroupsTab && (
                  <Button type="button" onClick={handleDelete} className="!bg-red-500 hover:!bg-red-650 cursor-pointer text-white flex items-center h-8 text-xs font-bold border border-red-600 rounded-lg px-4">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Group
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button type="submit" className="cursor-pointer h-8 text-xs">
                  <Save className="w-3.5 h-3.5 mr-1" /> Save
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={handleCancel} className="cursor-pointer h-8">
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
              </>
            )}
          </div>
        </form>

        <h4 className="text-xs font-bold text-slate-700 mb-3">
          {isPrimaryGroupsTab ? 'Predefined Primary Groups List' : 'Group Hierarchy List'}
        </h4>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm font-semibold animate-pulse">
            Loading groups...
          </div>
        ) : groups.length > 0 ? (
          <Table headers={isPrimaryGroupsTab ? ['Primary Group Name', 'Action'] : ['Group Name', 'Under Primary Group', 'Action']}>
            {groups.map((g: GroupItem) => (
              <tr
                key={g.id}
                onClick={() => loadGroupIntoForm(g)}
                className={`cursor-pointer transition-all hover:bg-slate-50/70 ${selectedGroupId === g.id ? 'bg-indigo-50/40 hover:bg-indigo-50/50 border-l-4 border-l-indigo-650' : ''}`}
              >
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{g.name}</td>
                {!isPrimaryGroupsTab && (
                  <td className="px-4 py-3 text-sm font-semibold text-slate-550">{g.primary_group || '-'}</td>
                )}
                <td className="px-4 py-3 text-xs text-indigo-650 font-bold hover:underline">
                  Inspect
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="py-12 text-center text-slate-400 text-sm">
            No account groups found.
          </div>
        )}
      </Card>
    </div>
  );
};
