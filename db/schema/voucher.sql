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

-- Allocation Entry (R20): adjusts old dues / on-account amounts / kasar against specific bills
-- without a real receipt or payment voucher -- AC_PLUS's ADEBALOCENTRY/ACREALOCENTRY screens.
-- Kept as its own table rather than widening receipt_allocations/payment_allocations' NOT NULL
-- receipt_id/payment_id: SQLite can't relax a NOT NULL column without rebuilding the table,
-- unsafe against an already-populated install. Bill-balance queries that join
-- receipt_allocations/payment_allocations also join this table so a bill's balance stays correct.
CREATE TABLE IF NOT EXISTS allocation_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  side TEXT NOT NULL, -- 'debtor' or 'creditor'
  entry_no TEXT NOT NULL,
  date TEXT NOT NULL,
  account_id TEXT NOT NULL,
  entry_type TEXT NOT NULL, -- 'on_account' or 'kasar'
  amount REAL NOT NULL,
  kasar_account_id TEXT,
  notes TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY(kasar_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);

-- One row per bill a given allocation entry adjusts: amount_applied for 'on_account' entries,
-- discount_amount for 'kasar' entries -- same amount/discount split as receipt_allocations.
CREATE TABLE IF NOT EXISTS allocation_entry_bills (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  allocation_entry_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  bill_type TEXT NOT NULL, -- 'sale' or 'purchase'
  amount_applied REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(allocation_entry_id) REFERENCES allocation_entries(id) ON DELETE CASCADE
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
CREATE INDEX IF NOT EXISTS idx_allocation_entries_account ON allocation_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_allocation_entries_lookup ON allocation_entries(company_id, side, entry_no);
CREATE INDEX IF NOT EXISTS idx_allocation_entry_bills_entry ON allocation_entry_bills(allocation_entry_id);
CREATE INDEX IF NOT EXISTS idx_allocation_entry_bills_bill ON allocation_entry_bills(bill_id);

CREATE TABLE IF NOT EXISTS sales_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  against_sale_id TEXT NOT NULL,
  against_bill_date TEXT NOT NULL,
  return_type TEXT NOT NULL,
  broker_name TEXT,
  challan_number INTEGER,
  challan_date TEXT,
  lr_number TEXT,
  lr_date TEXT,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  remark TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(customer_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY(against_sale_id) REFERENCES sales(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sales_return_items (
  id TEXT PRIMARY KEY,
  sales_return_id TEXT NOT NULL,
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
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(sales_return_id) REFERENCES sales_returns(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  return_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  against_purchase_id TEXT NOT NULL,
  against_bill_date TEXT NOT NULL,
  return_type TEXT NOT NULL,
  broker_name TEXT,
  challan_number INTEGER,
  challan_date TEXT,
  lr_number TEXT,
  lr_date TEXT,
  taxable_value REAL NOT NULL,
  gst_amount REAL NOT NULL,
  total_amount REAL NOT NULL,
  remark TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(supplier_id) REFERENCES accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY(against_purchase_id) REFERENCES purchases(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id TEXT PRIMARY KEY,
  purchase_return_id TEXT NOT NULL,
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
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(purchase_return_id) REFERENCES purchase_returns(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY(quality_id) REFERENCES qualities(id) ON DELETE RESTRICT,
  FOREIGN KEY(description_id) REFERENCES descriptions(id) ON DELETE RESTRICT,
  FOREIGN KEY(hsn_id) REFERENCES hsn_codes(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sales_returns_company ON sales_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_returns_against_sale ON sales_returns(against_sale_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sales_returns_number ON sales_returns(company_id, financial_year, return_number);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_company ON purchase_returns(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_returns_against_purchase ON purchase_returns(against_purchase_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_purchase_returns_number ON purchase_returns(company_id, financial_year, return_number);
