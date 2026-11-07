export interface SearchTarget {
  name: string;
  tab: string;
  sub: string | null;
  keywords: string;
}

export const searchTargets: SearchTarget[] = [
  { name: 'Sales Invoice', tab: 'vouchers', sub: 'sale', keywords: 'invoice bill billing sale vouchers data entry' },
  { name: 'Purchase Bill', tab: 'vouchers', sub: 'purchase', keywords: 'purchase bill supplier vouchers data entry' },
  { name: 'Delivery Challan', tab: 'vouchers', sub: 'challan', keywords: 'challan delivery dc vouchers data entry' },
  { name: 'Sales Register', tab: 'registers', sub: 'sales', keywords: 'sales registers register audit' },
  { name: 'Purchase Register', tab: 'registers', sub: 'purchases', keywords: 'purchase register register audit' },
  { name: 'Journal Register', tab: 'registers', sub: 'journal', keywords: 'journal register register audit double entry' },
  { name: 'Accounts Master', tab: 'masters', sub: 'accounts', keywords: 'accounts parties customers suppliers masters manager' },
  { name: 'Inventory Items', tab: 'masters', sub: 'qualities', keywords: 'inventory items products qualities categories masters manager' },
  { name: 'Broker Master', tab: 'masters', sub: 'brokers', keywords: 'brokers brokers listing masters manager' },
  { name: 'Transporter Master', tab: 'masters', sub: 'transports', keywords: 'transporters transports freight masters manager' },
  { name: 'Journal Voucher Types', tab: 'masters', sub: 'journal-voucher-types', keywords: 'voucher type journal types configurations masters manager' },
  { name: 'Backup & Restore', tab: 'backup', sub: null, keywords: 'backup restore database zip download upload' },
  { name: 'Company Settings', tab: 'settings', sub: null, keywords: 'settings profile supabase config backup restore' },
  { name: 'Account Opening Balance', tab: 'account_opening', sub: null, keywords: 'opening balance account starting ledger data entry' },
  { name: 'Stock Opening Balance', tab: 'stock_opening', sub: null, keywords: 'opening stock fabric quality starting data entry' }
];

export const navItems = [
  { id: null, name: 'Home' },
  { id: 'masters', name: 'Master' },
  { id: 'vouchers', name: 'Data Entry' },
  { id: 'registers', name: 'Registers' },
  { id: 'reports', name: 'Reports' },
  { id: 'misreports', name: 'M.I.S. Reports' },
  { id: 'backup', name: 'Backup & Restore' },
  { id: 'settings', name: 'Company Settings' }
] as const;

export const accountsSidebarItems = [
  { id: 'accounts', name: 'Accounts Master' },
  { id: 'groups', name: 'Account Groups' },
  { id: 'journal-voucher-types', name: 'Journal Voucher Types' }
];

export const inventorySidebarItems = [
  { id: 'categories', name: 'Stock Categories' },
  { id: 'qualities', name: 'Fabric Qualities' },
  { id: 'descriptions', name: 'Descriptions Master' },
  { id: 'hsn-codes', name: 'HSN & GST Mappings' }
];

export const brokersSidebarItems = [
  { id: 'brokers', name: 'Brokers Master' },
  { id: 'cities', name: 'Cities Register' },
  { id: 'states', name: 'States Directory' },
  { id: 'transports', name: 'Transporters Master' }
];

export const companySidebarItems = [
  { id: 'companies', name: 'Company Profiles' }
];

export const voucherSidebarItems = [
  { id: 'challan', name: 'Delivery Challan' },
  { id: 'sale', name: 'Sales Invoice' },
  { id: 'purchase', name: 'Purchase Voucher' }
];

export const accountVoucherItems = [
  { id: 'bank_payment', name: 'Bank Payment' },
  { id: 'bank_receipt', name: 'Bank Receipt' },
  { id: 'journal_voucher', name: 'Journal Voucher' }
];

export const openingBalanceSidebarItems = [
  { id: 'account_opening', name: 'Account Opening Balance' },
  { id: 'stock_opening', name: 'Stock Opening Balance' }
];

export const registerSidebarItems = [
  { id: 'sales', name: 'Sales Register' },
  { id: 'purchases', name: 'Purchase Register' },
  { id: 'journal', name: 'Journal Register' }
];

export const reportsSidebarItems = [
  { id: 'trial_balance', name: 'Trial Balance' }
];

export const quickAccessItems = [
  { tab: 'vouchers', sub: 'sale', label: 'Sales Invoice' },
  { tab: 'vouchers', sub: 'purchase', label: 'Purchase Bill' },
  { tab: 'vouchers', sub: 'challan', label: 'Delivery Challan' }
];

export function formatLoginDate(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
