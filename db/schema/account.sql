CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  gst_number TEXT,
  contact_person TEXT,
  mobile_number TEXT,
  address TEXT,
  state TEXT,
  opening_balance REAL DEFAULT 0,
  opening_balance_date TEXT,
  opening_balance_dc TEXT,
  group_name TEXT,
  city TEXT,
  pin_code TEXT,
  dist_taluka TEXT,
  telephone_no TEXT,
  email TEXT,
  credit_days INTEGER DEFAULT 0,
  pan_no TEXT,
  vat_tin_no TEXT,
  cst_tin_no TEXT,
  account_type TEXT,
  broker TEXT,
  tds_rate REAL DEFAULT 0,
  tds_ledger TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  bank_account_no TEXT,
  bank_ifsc TEXT,
  bank_account_holder TEXT,
  print_order TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS primary_groups (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  show_mailing INTEGER DEFAULT 1,
  show_statutory INTEGER DEFAULT 1,
  show_banking INTEGER DEFAULT 1,
  show_tds INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_group_id TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(primary_group_id) REFERENCES primary_groups(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS brokers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS states (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transports (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_primary_groups_name ON primary_groups(name);
CREATE INDEX IF NOT EXISTS idx_accounts_group_name ON accounts(group_name);
CREATE INDEX IF NOT EXISTS idx_groups_primary_group_id ON groups(primary_group_id);

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
