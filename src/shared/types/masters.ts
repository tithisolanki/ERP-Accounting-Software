export interface Company {
  id: string;
  name: string;
  code: string;
  gst_number?: string | null;
  pan_number?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bank1_name?: string | null;
  bank1_account_no?: string | null;
  bank1_ifsc?: string | null;
  bank2_name?: string | null;
  bank2_account_no?: string | null;
  bank2_ifsc?: string | null;
  credit_interest_rate?: number | null;
  pnl_closing_account_id?: string | null;
  is_dirty?: number;
  updated_at?: string;
}

export interface PrimaryGroup {
  id: string;
  name: string;
  show_mailing?: number;
  show_statutory?: number;
  show_banking?: number;
  show_tds?: number;
}



export interface Account {
  id: string;
  company_id: string;
  name: string;
  gst_number?: string | null;
  contact_person?: string | null;
  mobile_number?: string | null;
  address?: string | null;
  state?: string | null;
  opening_balance?: number;
  opening_balance_date?: string | null;
  opening_balance_dc?: string | null;
  group_name?: string | null;
  city?: string | null;
  pin_code?: string | null;
  dist_taluka?: string | null;
  telephone_no?: string | null;
  email?: string | null;
  credit_days?: number;
  pan_no?: string | null;
  vat_tin_no?: string | null;
  cst_tin_no?: string | null;
  account_type?: string | null;
  broker?: string | null;
  tds_rate?: number;
  tds_ledger?: string | null;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_no?: string | null;
  bank_ifsc?: string | null;
  bank_account_holder?: string | null;
  print_order?: string | null;
  is_dirty?: number;
  updated_at?: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  cloth_type: string;
  is_dirty?: number;
  updated_at?: string;
}

export interface Broker {
  id: string;
  company_id: string;
  name: string;
  is_dirty?: number;
  updated_at?: string;
}

export interface City {
  id: string;
  company_id: string;
  name: string;
  is_dirty?: number;
  updated_at?: string;
}

export interface State {
  id: string;
  company_id: string;
  name: string;
  is_dirty?: number;
  updated_at?: string;
}

export interface Category {
  id: string;
  company_id: string;
  name: string;
  is_active?: number;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Quality {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  is_active?: number;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
}

export interface Description {
  id: string;
  company_id: string;
  name: string;
  is_active?: number;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HsnCode {
  id: string;
  company_id: string;
  hsn_code: number;
  gst_percentage: number;
  is_active?: number;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
}

export interface JournalVoucherType {
  id: string;
  company_id: string;
  name: string;
  is_dirty?: number;
  updated_at?: string;
}

export interface StandardMasterItem {
  id: string;
  company_id: string;
  name: string;
  is_active?: number;
  is_dirty?: number;
  created_at?: string;
  updated_at?: string;
  group_name?: string;
  primary_group_id?: string;
  primary_group?: string;
  description?: string;
}

/** @deprecated Use StandardMasterItem */
export type StandardMaster = StandardMasterItem;

export interface StockOpeningBalance {
  id: string;
  company_id: string;
  date: string;
  quality_id: string;
  balance_meters: number;
  cost_per_meter: number;
  stock_type: 'GREY' | 'FINISH';
  quality_name?: string;
  is_dirty?: number;
  updated_at?: string;
}
