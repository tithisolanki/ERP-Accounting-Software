export interface Inventory {
  id: string;
  company_id: string;
  category_id: string;
  quality_id: string;
  description_id: string;
  hsn_id: string;
  lot_number: number;
  pcs?: number;
  quantity: number; // current meters
  purchase_qty?: number;
  sold_qty?: number;
  purchase_pcs?: number;
  sold_pcs?: number;
  updated_at?: string;
  
  // Joined/Compatibility fields
  category_name?: string;
  quality_name?: string;
  description_name?: string;
  hsn_code?: number;
  gst_percentage?: number;
  product_name?: string;
  cloth_type?: string;
}
