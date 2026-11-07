import fs from 'fs';
import path from 'path';
import { getDb } from '../../../db/connection';
import { runSeeds } from '../../../db/seed/seeds';

export { getDb, closeDb, withTransaction } from '../../../db/connection';
export { insertAuditLog } from './audit';

// A robust function to locate the db folder (either in development or packaged dist)
export function getDbPath(subPath: string): string {
  let currentDir = __dirname;
  // Try up to 5 parent directories to locate the db folder (dev and dist layouts vary)
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(currentDir, subPath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    currentDir = path.dirname(currentDir);
  }
  return path.join(process.cwd(), subPath);
}

async function ensureSchemaUpdates(db: any) {
  // 1. Rename party_id to account_id in payments if exists
  const paymentCols = await db.all("PRAGMA table_info(payments)");
  const hasPartyIdPayment = paymentCols.some((c: any) => c.name === 'party_id');
  const hasAccountIdPayment = paymentCols.some((c: any) => c.name === 'account_id');
  if (hasPartyIdPayment && !hasAccountIdPayment) {
    try {
      await db.exec("ALTER TABLE payments RENAME COLUMN party_id TO account_id");
      console.log("Renamed payments.party_id to account_id successfully.");
    } catch (e) {
      console.error("Failed to rename payments.party_id:", e);
    }
  }

  // 2. Rename party_id to account_id in receipts if exists
  const receiptCols = await db.all("PRAGMA table_info(receipts)");
  const hasPartyIdReceipt = receiptCols.some((c: any) => c.name === 'party_id');
  const hasAccountIdReceipt = receiptCols.some((c: any) => c.name === 'account_id');
  if (hasPartyIdReceipt && !hasAccountIdReceipt) {
    try {
      await db.exec("ALTER TABLE receipts RENAME COLUMN party_id TO account_id");
      console.log("Renamed receipts.party_id to account_id successfully.");
    } catch (e) {
      console.error("Failed to rename receipts.party_id:", e);
    }
  }

  // 3. Migrate group_templates to primary_groups
  const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'primary_groups'");
  if (!tableCheck) {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS primary_groups (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL
        );
      `);
      console.log("Created table primary_groups.");

      const oldTableCheck = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'group_templates'");
      if (oldTableCheck) {
        await db.exec("INSERT OR IGNORE INTO primary_groups (id, name) SELECT id, group_name FROM group_templates");
        console.log("Migrated data from group_templates to primary_groups.");
        await db.exec("DROP TABLE IF EXISTS group_templates");
        console.log("Dropped table group_templates.");
      } else {
        // Seed default primary groups
        const defaultPGs = [
          'Sundry Debtors', 'Sundry Creditors', 'Bank Account', 'Cash In Hand',
          'Loans & Advances', 'Direct Expenses', 'Indirect Expenses', 'Direct Income',
          'Indirect Income', 'Duties & Taxes', 'Capital Account'
        ];
        for (const name of defaultPGs) {
          const id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
          await db.run("INSERT OR IGNORE INTO primary_groups (id, name) VALUES (?, ?)", [id, name]);
        }
        console.log("Seeded default primary_groups.");
      }
    } catch (e) {
      console.error("Failed to migrate to primary_groups:", e);
    }
  }

  // 4. Migrate groups table to use primary_group_id foreign key
  const groupCols = await db.all("PRAGMA table_info(groups)");
  const hasPrimaryGroupId = groupCols.some((c: any) => c.name === 'primary_group_id');
  const hasOldPrimaryGroup = groupCols.some((c: any) => c.name === 'primary_group');

  if (!hasPrimaryGroupId && groupCols.length > 0) {
    try {
      await db.exec("ALTER TABLE groups ADD COLUMN primary_group_id TEXT");
      console.log("Added column primary_group_id to groups.");

      if (hasOldPrimaryGroup) {
        await db.exec(`
          UPDATE groups 
          SET primary_group_id = (
            SELECT id FROM primary_groups 
            WHERE primary_groups.name = groups.primary_group
          )
          WHERE primary_group IS NOT NULL
        `);
        console.log("Mapped existing groups.primary_group names to primary_group_id.");
      }
    } catch (e) {
      console.error("Failed to alter groups schema:", e);
    }
  }

  // 5. Create stock_opening_balances if missing
  try {
    await db.exec(`
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
    `);
  } catch (e) {
    console.error("Failed to create stock_opening_balances:", e);
  }

  // 6. Add columns to accounts if missing
  const accountCols = await db.all("PRAGMA table_info(accounts)");
  const columnsToAdd = [
    { name: 'opening_balance_date', def: 'TEXT' },
    { name: 'opening_balance_dc', def: 'TEXT' },
    { name: 'group_name', def: 'TEXT' },
    { name: 'city', def: 'TEXT' },
    { name: 'pin_code', def: 'TEXT' },
    { name: 'dist_taluka', def: 'TEXT' },
    { name: 'telephone_no', def: 'TEXT' },
    { name: 'email', def: 'TEXT' },
    { name: 'credit_days', def: 'INTEGER DEFAULT 0' },
    { name: 'pan_no', def: 'TEXT' },
    { name: 'vat_tin_no', def: 'TEXT' },
    { name: 'cst_tin_no', def: 'TEXT' },
    { name: 'account_type', def: 'TEXT' },
    { name: 'broker', def: 'TEXT' },
    { name: 'tds_rate', def: 'REAL DEFAULT 0' },
    { name: 'tds_ledger', def: 'TEXT' },
    { name: 'bank_name', def: 'TEXT' },
    { name: 'bank_branch', def: 'TEXT' },
    { name: 'bank_account_no', def: 'TEXT' },
    { name: 'bank_ifsc', def: 'TEXT' },
    { name: 'bank_account_holder', def: 'TEXT' },
    { name: 'print_order', def: 'TEXT' }
  ];

  for (const col of columnsToAdd) {
    if (!accountCols.some((c: any) => c.name === col.name) && accountCols.length > 0) {
      try {
        await db.exec(`ALTER TABLE accounts ADD COLUMN ${col.name} ${col.def}`);
        console.log(`Added accounts.${col.name} column successfully.`);
      } catch (e) {
        console.error(`Failed to add accounts.${col.name} column:`, e);
      }
    }
  }

  // 7. Add columns to delivery_challans if missing
  const challanCols = await db.all("PRAGMA table_info(delivery_challans)");
  if (!challanCols.some((c: any) => c.name === 'status') && challanCols.length > 0) {
    try {
      await db.exec("ALTER TABLE delivery_challans ADD COLUMN status TEXT DEFAULT 'PENDING'");
      console.log("Added delivery_challans.status column successfully.");
    } catch (e) {
      console.error("Failed to add delivery_challans.status column:", e);
    }
  }
  if (!challanCols.some((c: any) => c.name === 'sales_invoice_id') && challanCols.length > 0) {
    try {
      await db.exec("ALTER TABLE delivery_challans ADD COLUMN sales_invoice_id TEXT");
      console.log("Added delivery_challans.sales_invoice_id column successfully.");
    } catch (e) {
      console.error("Failed to add delivery_challans.sales_invoice_id column:", e);
    }
  }

  // 8. Add configuration columns to primary_groups if missing
  const pgCols = await db.all("PRAGMA table_info(primary_groups)");
  if (pgCols.length > 0) {
    const columnsToAdd = [
      { name: 'show_mailing', def: 'INTEGER DEFAULT 1' },
      { name: 'show_statutory', def: 'INTEGER DEFAULT 1' },
      { name: 'show_banking', def: 'INTEGER DEFAULT 1' },
      { name: 'show_tds', def: 'INTEGER DEFAULT 1' }
    ];
    for (const col of columnsToAdd) {
      if (!pgCols.some((c: any) => c.name === col.name)) {
        try {
          await db.exec(`ALTER TABLE primary_groups ADD COLUMN ${col.name} ${col.def}`);
          console.log(`Added primary_groups.${col.name} column successfully.`);
        } catch (e) {
          console.error(`Failed to add primary_groups.${col.name} column:`, e);
        }
      }
    }
  }

  // 9. Add indexes to accounts and groups if missing
  try {
    await db.exec("CREATE INDEX IF NOT EXISTS idx_accounts_group_name ON accounts(group_name)");
    await db.exec("CREATE INDEX IF NOT EXISTS idx_groups_primary_group_id ON groups(primary_group_id)");
    console.log("Ensured accounts and groups indexes exist.");
  } catch (e) {
    console.error("Failed to ensure accounts and groups indexes:", e);
  }

  // 10. One document number per company per financial year.
  // If an old database already has duplicates, the index cannot be built: we log which
  // ones so the owner can renumber them (see RUNBOOK.md), and the app checks in code anyway.
  const uniqueNumbers = [
    { index: 'ux_sales_number', table: 'sales', column: 'invoice_number' },
    { index: 'ux_purchases_entry_no', table: 'purchases', column: 'entry_no' },
    { index: 'ux_challans_number', table: 'delivery_challans', column: 'challan_number' }
  ];
  for (const u of uniqueNumbers) {
    try {
      await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS ${u.index} ON ${u.table}(company_id, financial_year, ${u.column})`);
    } catch (e) {
      const dupes = await db.all(
        `SELECT financial_year, ${u.column} AS number, COUNT(*) AS copies FROM ${u.table}
         GROUP BY company_id, financial_year, ${u.column} HAVING COUNT(*) > 1`
      );
      console.warn(`WARNING: duplicate numbers in ${u.table}, unique index not created:`, dupes);
    }
  }
}

export async function initDb() {
  const db = await getDb();

  // Apply SQL schema DDLs dynamically
  const schemaDir = getDbPath('db/schema');
  console.log('Loading schemas from:', schemaDir);

  const companySql = fs.readFileSync(path.join(schemaDir, 'company.sql'), 'utf8');
  const accountSql = fs.readFileSync(path.join(schemaDir, 'account.sql'), 'utf8');
  const voucherSql = fs.readFileSync(path.join(schemaDir, 'voucher.sql'), 'utf8');

  await db.exec(companySql);
  await db.exec(accountSql);
  await db.exec(voucherSql);

  // Safely ensure columns exist for existing databases
  await ensureSchemaUpdates(db);

  await runSeeds(db);
}
