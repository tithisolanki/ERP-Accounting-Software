export interface SalesItem {
  id: string;
  sales_id: string;
  company_id: string;
  category_id: string;
  quality_id: string;
  description_id: string;
  hsn_id: string;
  pcs?: number;
  meters: number;
  rate: number;
  gst_percentage: number;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  piece_meters?: string | null;
  
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

export interface SalesInvoice {
  id: string;
  company_id: string;
  invoice_number: number;
  date: string;
  customer_id: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  updated_at?: string;
  
  challan_number?: number | null;
  challan_date?: string | null;
  credit_days?: number;
  broker_name?: string | null;
  bale_number?: string | null;
  order_number?: string | null;
  order_date?: string | null;
  sales_type?: string | null;
  lr_number?: string | null;
  lr_date?: string | null;
  transport?: string | null;
  delivery_at?: string | null;
  vehicle_number?: string | null;
  remark?: string | null;
  credit_account?: string | null;
  cartage?: number;
  postage?: number;
  less?: number;
  less_add?: number;
  rounded_off?: number;
  
  // Joined fields
  customer_name?: string;
  items?: SalesItem[];
}
