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
  { name: 'Sales Return', tab: 'sales_return', sub: null, keywords: 'sales return goods credit note return vouchers data entry' },
  { name: 'Purchase Return', tab: 'purchase_return', sub: null, keywords: 'purchase return goods debit note return vouchers data entry' },
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
  { id: 'masters', name: 'Masters' },
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

// AC_PLUS files these as direct siblings of Sales Bill / Purchase Bill under Data Entry --
// "Allocation Entry" + "Print Allocation" (confirmed via its menu resource strings:
// MnuDebAlocEntry/MnuCreAlocEntry), not nested under any extra "Allocations" submenu.
export const allocationEntrySidebarItems = [
  { id: 'sales_allocation', name: 'Sales Allocation Entry' },
  { id: 'purchase_allocation', name: 'Purchase Allocation Entry' },
  { id: 'allocation_print', name: 'Print Allocation' }
];

// AC_PLUS files "Sales Return Entry" as a direct sibling of Sales Invoice under Data Entry
// (confirmed in AC_PLUS_SCREEN_MAP.md), not nested under any extra "Returns" submenu.
export const goodsReturnsSidebarItems = [
  { id: 'sales_return', name: 'Sales Return' },
  { id: 'purchase_return', name: 'Purchase Return' }
];

export const accountVoucherItems = [
  { id: 'bank_payment', name: 'Bank Payment' },
  { id: 'bank_receipt', name: 'Bank Receipt' },
  { id: 'cash_payment', name: 'Cash Payment' },
  { id: 'cash_receipt', name: 'Cash Receipt' },
  { id: 'journal_voucher', name: 'Journal Voucher' },
  // AC_PLUS files this under Data Entry > Account Voucher > Books Closing > Books
  // Closing Voucher (confirmed via its menu resource strings), not under Reports.
  { id: 'close_financial_year', name: 'Close Financial Year' }
];

export const openingBalanceSidebarItems = [
  { id: 'account_opening', name: 'Account Opening Balance' },
  { id: 'stock_opening', name: 'Stock Opening Balance' }
];

export const registerSidebarItems = [
  { id: 'sales', name: 'Sales Register' },
  { id: 'purchases', name: 'Purchase Register' },
  { id: 'journal', name: 'Journal Register' },
  { id: 'sales_returns', name: 'Sales Return Register' },
  { id: 'purchase_returns', name: 'Purchase Return Register' }
];

// AC_PLUS files Trial Balance under its separate M.I.S.Reports menu
// (confirmed via its menu resource strings), not plain Reports.
export const misreportsSidebarItems = [
  { id: 'trial_balance', name: 'Trial Balance' }
];

// AC_PLUS files General Account Ledger directly under plain Reports (confirmed via its
// menu resource strings).
export const reportsSidebarItems = [
  { id: 'party_ledger', name: 'Party Ledger' }
];

// AC_PLUS nests both of these inside its "Debtors Reports" submenu
// (MnuDebtorsRepors -> ... -> MnuOutStanding -> ... -> MnuOverDueInterest), not flat
// under plain Reports -- confirmed via its menu resource strings.
export const debtorReportsSidebarItems = [
  { id: 'outstanding_ledger', name: 'Debtors Outstanding Ledger' },
  { id: 'overdue_interest', name: 'Overdue Interest' }
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
