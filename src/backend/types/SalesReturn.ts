export interface SalesReturnItem {
  id: string;
  sales_return_id: string;
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

  // Mapped fields
  category_name?: string;
  quality_name?: string;
  description_name?: string;
  hsn_code?: number;
}

export interface SalesReturn {
  id: string;
  company_id: string;
  return_number: number;
  date: string;
  customer_id: string;
  financial_year: string;
  against_sale_id: string;
  against_bill_date: string;
  return_type: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  updated_at?: string;

  broker_name?: string | null;
  challan_number?: number | null;
  challan_date?: string | null;
  lr_number?: string | null;
  lr_date?: string | null;
  remark?: string | null;

  // Joined fields
  customer_name?: string;
  items?: SalesReturnItem[];
}
