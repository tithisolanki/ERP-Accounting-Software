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

export const Masters: React.FC<MastersProps> = ({ activeSubTab }) => {
  const [activeTab, setActiveTab] = useState<string>(activeSubTab || 'accounts');

  useEffect(() => {
    if (activeSubTab) {
      setActiveTab(activeSubTab);
    }
  }, [activeSubTab]);


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
    <div className="flex flex-col lg:flex-row gap-6 min-h-[620px]">


      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};
