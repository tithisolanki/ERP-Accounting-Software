import { Database } from 'sqlite';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function runSeeds(db: Database): Promise<void> {
  // Seed default primary groups if empty
  const defaultPrimaryGroups = [
    'Sundry Debtors',
    'Sundry Creditors',
    'Bank Account',
    'Cash In Hand',
    'Advances',
    'Direct Expenses',
    'Indirect Expenses',
    'Direct Income',
    'Indirect Income',
    'Duties & Taxes',
    'Capital Account'
  ];

  for (const name of defaultPrimaryGroups) {
    const existing = await db.get('SELECT * FROM primary_groups WHERE name = ?', [name]);
    if (!existing) {
      const id = crypto.randomUUID();
      await db.run(
        `INSERT INTO primary_groups (id, name) VALUES (?, ?)`,
        [id, name]
      );
      console.log(`Seeded primary group: ${name}`);
    }
  }

  // Configure default show_* blocks for seeded Sundry Debtors
  await db.run('UPDATE primary_groups SET show_tds = 0 WHERE name = "Sundry Debtors"');

  // Purge any super_admin user to clean up existing databases
  await db.run('DELETE FROM users WHERE role = "super_admin" OR username = "superadmin"');

  // Migrate existing roles to new roles
  await db.run('UPDATE users SET role = "ADMIN" WHERE role = "company_admin"');
  await db.run('UPDATE users SET role = "USER" WHERE role = "operator" OR role = "accountant"');

  // Run seed data if empty
  const checkCompany = await db.get('SELECT COUNT(*) as count FROM companies');
  if (checkCompany.count === 0) {
    console.log('Seeding default company, users, master hierarchy and inventory...');
    const companyUUID = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO companies (id, name, code, gst_number, pan_number, address, phone, email, is_dirty, updated_at)
       VALUES (?, 'K Chandrakant Textiles', 'KCT01', '32AAACK1234A1Z1', 'AAACK1234A', 'Erode, Tamil Nadu', '9876543210', 'info@kctextiles.com', 0, ?)`,
      [companyUUID, now]
    );

    // Seed default ADMIN user
    const adminUUID = crypto.randomUUID();
    const adminHash = await bcrypt.hash('company123', 10);
    await db.run(
      `INSERT INTO users (id, company_id, username, password_hash, role, name, is_dirty, updated_at)
       VALUES (?, ?, 'companyadmin', ?, 'ADMIN', 'Company Admin', 0, ?)`,
      [adminUUID, companyUUID, adminHash, now]
    );

    // Seed default USER
    const userUUID = crypto.randomUUID();
    const userHash = await bcrypt.hash('user123', 10);
    await db.run(
      `INSERT INTO users (id, company_id, username, password_hash, role, name, is_dirty, updated_at)
       VALUES (?, ?, 'companyuser', ?, 'USER', 'Company User', 0, ?)`,
      [userUUID, companyUUID, userHash, now]
    );

    // Seed Categories
    const finishCatId = crypto.randomUUID();
    const greyCatId = crypto.randomUUID();
    await db.run(
      `INSERT INTO categories (id, company_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 'FINISH', 1, 0, ?, ?)`,
      [finishCatId, companyUUID, now, now]
    );
    await db.run(
      `INSERT INTO categories (id, company_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 'GREY', 1, 0, ?, ?)`,
      [greyCatId, companyUUID, now, now]
    );

    // Seed Qualities
    const shirtingQualId = crypto.randomUUID();
    const suitingQualId = crypto.randomUUID();
    await db.run(
      `INSERT INTO qualities (id, company_id, category_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, 'SHIRTING', 1, 0, ?, ?)`,
      [shirtingQualId, companyUUID, finishCatId, now, now]
    );
    await db.run(
      `INSERT INTO qualities (id, company_id, category_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, 'SUITING', 1, 0, ?, ?)`,
      [suitingQualId, companyUUID, greyCatId, now, now]
    );

    // Seed Descriptions
    const mazzaDescId = crypto.randomUUID();
    const rubyDescId = crypto.randomUUID();
    await db.run(
      `INSERT INTO descriptions (id, company_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 'MAZZA', 1, 0, ?, ?)`,
      [mazzaDescId, companyUUID, now, now]
    );
    await db.run(
      `INSERT INTO descriptions (id, company_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 'RUBY', 1, 0, ?, ?)`,
      [rubyDescId, companyUUID, now, now]
    );

    // Seed HSN Codes
    const hsn5407Id = crypto.randomUUID();
    const hsn5512Id = crypto.randomUUID();
    const hsn6006Id = crypto.randomUUID();
    await db.run(
      `INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 5407, 5.0, 1, 0, ?, ?)`,
      [hsn5407Id, companyUUID, now, now]
    );
    await db.run(
      `INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 5512, 12.0, 1, 0, ?, ?)`,
      [hsn5512Id, companyUUID, now, now]
    );
    await db.run(
      `INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, 6006, 18.0, 1, 0, ?, ?)`,
      [hsn6006Id, companyUUID, now, now]
    );

    // Seed default groups
    const sundryDebtorsPG = await db.get('SELECT id FROM primary_groups WHERE name = "Sundry Debtors"');
    const sundryCreditorsPG = await db.get('SELECT id FROM primary_groups WHERE name = "Sundry Creditors"');

    const sundryDebtorsGroupId = crypto.randomUUID();
    const sundryCreditorsGroupId = crypto.randomUUID();

    await db.run(
      `INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at) VALUES (?, ?, 'Sundry Debtors', ?, 0, ?)`,
      [sundryDebtorsGroupId, companyUUID, sundryDebtorsPG?.id || null, now]
    );

    await db.run(
      `INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at) VALUES (?, ?, 'Sundry Creditors', ?, 0, ?)`,
      [sundryCreditorsGroupId, companyUUID, sundryCreditorsPG?.id || null, now]
    );

    // Seed default accounts
    const customerUUID = crypto.randomUUID();
    await db.run(
      `INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at)
       VALUES (?, ?, 'Sri Krishna Fabrics', 0.0, 'Sundry Debtors', 0, ?)`,
      [customerUUID, companyUUID, now]
    );

    const supplierUUID = crypto.randomUUID();
    await db.run(
      `INSERT INTO accounts (id, company_id, name, opening_balance, group_name, is_dirty, updated_at)
       VALUES (?, ?, 'Durga Dyeing Unit', 0.0, 'Sundry Creditors', 0, ?)`,
      [supplierUUID, companyUUID, now]
    );
  }
}
