CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  gst_number TEXT,
  pan_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- 'super_admin', 'company_admin', 'accountant', 'operator'
  name TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  company_id TEXT, -- NULL for global app settings (e.g. Supabase keys)
  key TEXT NOT NULL,
  value TEXT,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL,
  UNIQUE(company_id, key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  company_id TEXT,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TEXT NOT NULL,
  is_dirty INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
