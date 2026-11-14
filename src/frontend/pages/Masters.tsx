import React, { useState, useEffect } from 'react';
import { AccountMasterPage } from '../modules/masters/accounts/AccountMasterPage';
import { GroupMasterPage } from '../modules/masters/groups/GroupMasterPage';
import { CompanyMasterPage } from '../modules/masters/companies/CompanyMasterPage';
import { CategoryMasterPage } from '../modules/masters/inventory/CategoryMasterPage';
import { QualityMasterPage } from '../modules/masters/inventory/QualityMasterPage';
import { DescriptionMasterPage } from '../modules/masters/inventory/DescriptionMasterPage';
import { HSNMasterPage } from '../modules/masters/inventory/HSNMasterPage';
import { AdministrationMasterPage } from '../modules/masters/administration/AdministrationMasterPage';

interface MastersProps {
  activeSubTab?: string;
  onChangeSubTab?: (tab: string) => void;
}

// Page-title banner text per sub-tab, matching the pattern every other top-level section
// (Registers, Reports, Settings...) already uses so "where am I" is visible here too.
// Title only - every sub-page below already shows its own subtitle in its Card header,
// so repeating one here just duplicated it.
const TITLES: Record<string, string> = {
  accounts: 'Accounts Master',
  groups: 'Account Groups',
  companies: 'Company Profiles',
  categories: 'Stock Categories',
  qualities: 'Fabric Qualities',
  descriptions: 'Descriptions Master',
  'hsn-codes': 'HSN & GST Mappings',
  brokers: 'Brokers Master',
  cities: 'Cities Register',
  states: 'States Directory',
  transports: 'Transporters Master',
  'journal-voucher-types': 'Journal Voucher Types'
};

export const Masters: React.FC<MastersProps> = ({ activeSubTab }) => {
  const [activeTab, setActiveTab] = useState<string>(activeSubTab || 'accounts');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);

  const title = TITLES[activeTab] || TITLES.accounts;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountMasterPage />;
      case 'groups':
        return <GroupMasterPage />;
      case 'companies':
        return <CompanyMasterPage />;
      case 'categories':
        return <CategoryMasterPage />;
      case 'qualities':
        return <QualityMasterPage />;
      case 'descriptions':
        return <DescriptionMasterPage />;
      case 'hsn-codes':
        return <HSNMasterPage />;
      case 'brokers':
      case 'cities':
      case 'states':
      case 'transports':
      case 'journal-voucher-types':
        return <AdministrationMasterPage activeTab={activeTab as any} />;
      default:
        return <AccountMasterPage />;
    }
  };

  return (
    <div className="flex flex-col gap-5 min-h-[620px]">

      {/* Top Header Navigation Panel (matches Registers/Reports/Settings) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};
