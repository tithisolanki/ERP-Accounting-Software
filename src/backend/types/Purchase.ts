export interface PurchaseItem {
  id: string;
  purchase_id: string;
  company_id: string;
  category_id: string;
  quality_id: string;
  description_id: string;
  hsn_id: string;
  lot_number: number;
  pcs?: number;
  meters: number;
  rate: number;
  gst_percentage: number;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  
  // Mapped fields
  category_name?: string;
  quality_name?: string;
  description_name?: string;
  hsn_code?: number;
  
  // Compatibility mappings
  product_name?: string;
  description?: string;
  quantity?: number;
}

export interface Purchase {
  id: string;
  company_id: string;
  purchase_number: string;
  date: string;
  supplier_id: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  lot_number?: number | null;
  updated_at?: string;
  
  entry_no?: number | string | null;
  credit_days?: number;
  broker_name?: string | null;
  challan_number?: number | null;
  challan_date?: string | null;
  purchase_type?: string | null;
  lr_number?: string | null;
  lr_date?: string | null;
  transport?: string | null;
  remark?: string | null;
  debit_account?: string | null;
  add_value?: number;
  less_value?: number;
  less_add?: number;
  rounded_off?: number;
  
  // Joined fields
  supplier_name?: string;
  items?: PurchaseItem[];
}
