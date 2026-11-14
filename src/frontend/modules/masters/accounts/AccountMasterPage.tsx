import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { AccountList } from './AccountList';
import { AccountForm } from './AccountForm';
import { AccountFormValues } from './AccountTypes';
import { Account, StandardMasterItem, City, State, Broker } from '@shared/types';
import { AccountService, LookupService, GroupService } from '../../../services/api';

export const AccountMasterPage: React.FC = () => {
  const { token, addNotification, user, confirm } = useStore();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form selections and configuration lookups
  const [lookupGroups, setLookupGroups] = useState<StandardMasterItem[]>([]);
  const [lookupCities, setLookupCities] = useState<City[]>([]);
  const [lookupStates, setLookupStates] = useState<State[]>([]);
  const [lookupBrokers, setLookupBrokers] = useState<Broker[]>([]);

  // Navigation mode and edit selection
  const [mode, setMode] = useState<'list' | 'view' | 'edit' | 'new'>('list');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const fetchLookups = async () => {
    if (!token) return;
    try {
      const [groupsData, citiesData, statesData, brokersData] = await Promise.all([
        GroupService.getGroups(token),
        LookupService.getCities(token),
        LookupService.getStates(token),
        LookupService.getBrokers(token)
      ]);
      setLookupGroups(groupsData as any);
      setLookupCities(citiesData);
      setLookupStates(statesData);
      setLookupBrokers(brokersData);
    } catch (err: any) {
      console.error('Failed to load Account lookups:', err);
    }
  };

  const fetchAccounts = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await AccountService.getAll(token);
      setAccounts(data);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to load accounts list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchLookups();
  }, [token]);

  const handleAddClick = () => {
    setSelectedAccount(null);
    setMode('new');
  };

  const handleViewEditClick = (account: Account) => {
    setSelectedAccount(account);
    setMode('view');
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (!(await confirm({ message: 'Are you sure you want to delete this account? This cannot be undone.', danger: true, confirmLabel: 'Delete' }))) {
      return;
    }
    try {
      await AccountService.delete(id, token);
      addNotification('success', 'Account deleted successfully.');
      fetchAccounts();
      if (selectedAccount?.id === id) {
        setMode('list');
        setSelectedAccount(null);
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete account.');
    }
  };

  // Convert schema attributes to Account structure
  const mapFormToAccount = (values: AccountFormValues): Omit<Account, 'id'> => {
    const addressString = `${values.addressLine1}\n${values.addressLine2}`.trim();
    return {
      company_id: user?.company_id || '',
      name: values.name,
      gst_number: values.gst_number || null,
      contact_person: values.contact_person || null,
      mobile_number: values.mobile_number || null,
      address: addressString || null,
      state: values.state || null,
      opening_balance: Number(values.opening_balance) || 0,
      group_name: values.group_name || null,
      city: values.city || null,
      pin_code: values.pin_code || null,
      dist_taluka: values.dist_taluka || null,
      telephone_no: values.telephone_no || null,
      email: values.email || null,
      credit_days: Number(values.credit_days) || 0,
      pan_no: values.pan_no || null,
      vat_tin_no: values.vat_tin_no || null,
      cst_tin_no: values.cst_tin_no || null,
      account_type: values.account_type || null,
      broker: values.broker || null,
      tds_rate: Number(values.tds_rate) || 0,
      tds_ledger: values.tds_ledger || null,
      bank_name: values.bank_name || null,
      bank_branch: values.bank_branch || null,
      bank_account_no: values.bank_account_no || null,
      bank_ifsc: values.bank_ifsc || null,
      bank_account_holder: values.bank_account_holder || null,
      print_order: values.print_order || null
    };
  };

  // Convert Account structure to Form schema values
  const mapAccountToForm = (a: Account): Partial<AccountFormValues> => {
    const addrParts = (a.address || '').split('\n');
    return {
      name: a.name,
      gst_number: a.gst_number || '',
      group_name: a.group_name || '',
      contact_person: a.contact_person || '',
      mobile_number: a.mobile_number || '',
      addressLine1: addrParts[0] || '',
      addressLine2: addrParts[1] || '',
      city: a.city || '',
      state: a.state || '',
      opening_balance: a.opening_balance || 0,
      pin_code: a.pin_code || '',
      dist_taluka: a.dist_taluka || '',
      telephone_no: a.telephone_no || '',
      email: a.email || '',
      credit_days: a.credit_days || 0,
      pan_no: a.pan_no || '',
      vat_tin_no: a.vat_tin_no || '',
      cst_tin_no: a.cst_tin_no || '',
      account_type: a.account_type || 'Local',
      broker: a.broker || '',
      tds_rate: a.tds_rate || 0,
      tds_ledger: a.tds_ledger || '',
      bank_name: a.bank_name || '',
      bank_branch: a.bank_branch || '',
      bank_account_no: a.bank_account_no || '',
      bank_ifsc: a.bank_ifsc || '',
      bank_account_holder: a.bank_account_holder || '',
      print_order: a.print_order || ''
    };
  };

  const handleFormSubmit = async (values: AccountFormValues) => {
    if (!token) return;
    try {
      const payload = mapFormToAccount(values);
      if (mode === 'edit' && selectedAccount) {
        const updated = await AccountService.update(selectedAccount.id, payload, token);
        addNotification('success', 'Account details updated successfully.');
        setSelectedAccount(updated);
        setMode('view');
      } else {
        await AccountService.create(payload, token);
        addNotification('success', 'Account registered successfully.');
        setSelectedAccount(null);
        setMode('list');
      }
      fetchAccounts();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save account record.');
    }
  };

  // Find all Duty & Tax accounts for TDS mapping
  const dutiesAndTaxesAccounts = accounts.filter((a) => a.group_name === 'Duties & Taxes');

  if (mode === 'list') {
    return (
      <AccountList
        accounts={accounts}
        loading={loading}
        canModify={true}
        onAddClick={handleAddClick}
        onViewEditClick={handleViewEditClick}
        onDeleteClick={handleDeleteClick}
      />
    );
  }

  const initialValues = selectedAccount ? mapAccountToForm(selectedAccount) : {
    opening_balance: 0,
    credit_days: 0,
    account_type: 'Local',
    tds_rate: 0
  };

  return (
    <AccountForm
      initialValues={initialValues}
      lookupGroups={lookupGroups}
      lookupCities={lookupCities}
      lookupStates={lookupStates}
      lookupBrokers={lookupBrokers}
      dutiesAndTaxesAccounts={dutiesAndTaxesAccounts}
      mode={mode}
      onSubmit={handleFormSubmit}
      onCancel={() => {
        setMode('list');
        setSelectedAccount(null);
      }}
      onEditModeTrigger={() => setMode('edit')}
      onDeleteTrigger={() => selectedAccount && handleDeleteClick(selectedAccount.id)}
    />
  );
};
