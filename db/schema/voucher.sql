CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qualities (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS descriptions (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hsn_codes (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  hsn_code INTEGER NOT NULL,
  gst_percentage REAL NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  purchase_number TEXT NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  lot_number INTEGER,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  entry_no INTEGER,
  credit_days INTEGER DEFAULT 0,
  broker_name TEXT,
  challan_number INTEGER,
  challan_date TEXT,
  purchase_type TEXT,
  lr_number TEXT,
  lr_date TEXT,
  transport TEXT,
  remark TEXT,
  debit_account TEXT,
  add_value REAL DEFAULT 0,
  less_value REAL DEFAULT 0,
  less_add REAL DEFAULT 0,
  rounded_off REAL DEFAULT 0,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(supplier_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id TEXT PRIMARY KEY,
  purchase_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  quality_id TEXT NOT NULL,
  description_id TEXT NOT NULL,
  hsn_id TEXT NOT NULL,
  lot_number INTEGER NOT NULL,
  pcs INTEGER DEFAULT 0,
  meters REAL NOT NULL,
  rate REAL NOT NULL,
  gst_percentage REAL NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  invoice_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  challan_number INTEGER,
  challan_date TEXT,
  credit_days INTEGER DEFAULT 0,
  broker_name TEXT,
  bale_number TEXT,
  order_number TEXT,
  order_date TEXT,
  sales_type TEXT,
  lr_number TEXT,
  lr_date TEXT,
  transport TEXT,
  delivery_at TEXT,
  vehicle_number TEXT,
  remark TEXT,
  credit_account TEXT,
  cartage REAL DEFAULT 0,
  postage REAL DEFAULT 0,
  less REAL DEFAULT 0,
  less_add REAL DEFAULT 0,
  rounded_off REAL DEFAULT 0,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_items (
  id TEXT PRIMARY KEY,
  sales_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  quality_id TEXT NOT NULL,
  description_id TEXT NOT NULL,
  hsn_id TEXT NOT NULL,
  pcs INTEGER DEFAULT 0,
  meters REAL NOT NULL,
  rate REAL NOT NULL,
  gst_percentage REAL NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  piece_meters TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(sales_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  payment_mode TEXT NOT NULL, -- 'Cash', 'Bank', 'UPI', 'Cheque'
  reference_number TEXT,
  notes TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  payment_mode TEXT NOT NULL, -- 'Cash', 'Bank', 'UPI', 'Cheque'
  reference_number TEXT,
  notes TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

-- Bill-wise allocation: which specific sales/purchase bill(s) a receipt/payment settles.
-- One row per bill settled by a voucher (a receipt split across 3 invoices = 3 rows), matching
-- how the legacy AC_PLUS app modeled its "Allocation Entry" save (see AC_PLUS_DATA_FLOW.md).
CREATE TABLE IF NOT EXISTS receipt_allocations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  sale_id TEXT NOT NULL,
  amount_applied REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY(sale_id) REFERENCES sales(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL,
  amount_applied REAL NOT NULL,
  discount_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY(purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS delivery_challans (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  challan_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  broker_name TEXT,
  bale_number TEXT,
  order_number TEXT,
  order_date TEXT,
  sales_type TEXT,
  transport TEXT,
  delivery_at TEXT,
  vehicle_number TEXT,
  remark TEXT,
  rounded_off REAL DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  sales_invoice_id TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS delivery_challan_items (
  id TEXT PRIMARY KEY,
  challan_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  quality_id TEXT NOT NULL,
  description_id TEXT NOT NULL,
  hsn_id TEXT NOT NULL,
  pcs INTEGER DEFAULT 0,
  meters REAL NOT NULL,
  rate REAL NOT NULL,
  gst_percentage REAL NOT NULL,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  piece_meters TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(challan_id) REFERENCES delivery_challans(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS journal_vouchers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  voucher_no TEXT NOT NULL,
  date TEXT NOT NULL,
  voucher_type TEXT NOT NULL,
  account_id TEXT NOT NULL,
  debit_amount REAL DEFAULT 0,
  credit_amount REAL DEFAULT 0,
  particulars TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS journal_voucher_types (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_opening_balances (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT NOT NULL,
  quality_id TEXT NOT NULL,
  balance_meters REAL NOT NULL DEFAULT 0,
  cost_per_meter REAL NOT NULL DEFAULT 0,
  stock_type TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchases_company ON purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_company ON sales(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
CREATE INDEX IF NOT EXISTS idx_receipts_account ON receipts(account_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_receipt ON receipt_allocations(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_allocations_sale ON receipt_allocations(sale_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_purchase ON payment_allocations(purchase_id);
CREATE INDEX IF NOT EXISTS idx_challans_company ON delivery_challans(company_id);
CREATE INDEX IF NOT EXISTS idx_challans_lookup ON delivery_challans(company_id, challan_number);
CREATE INDEX IF NOT EXISTS idx_journal_vouchers_lookup ON journal_vouchers(company_id, voucher_no);
CREATE INDEX IF NOT EXISTS idx_journal_voucher_types_company ON journal_voucher_types(company_id);
