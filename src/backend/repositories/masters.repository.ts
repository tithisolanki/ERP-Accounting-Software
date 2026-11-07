import { getDb } from '../db/index';
import { Company, UserMaster, Account, StandardMaster, Quality, Description, HsnCode } from '../types/Masters';

export class CompanyRepository {
  async findAll(): Promise<Company[]> {
    const db = await getDb();
    return db.all('SELECT * FROM companies ORDER BY name ASC');
  }

  async findById(id: string): Promise<Company | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM companies WHERE id = ?', [id]);
    return result || null;
  }

  async create(company: Company): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO companies (id, name, code, gst_number, pan_number, address, phone, email, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [company.id, company.name, company.code, company.gst_number, company.pan_number, company.address, company.phone, company.email, company.updated_at]
    );
  }

  async update(id: string, company: Company): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE companies SET name = ?, gst_number = ?, pan_number = ?, address = ?, phone = ?, email = ?, is_dirty = 1, updated_at = ?
       WHERE id = ?`,
      [company.name, company.gst_number, company.pan_number, company.address, company.phone, company.email, company.updated_at, id]
    );
  }
}

export class UserRepository {
  async findAllForSuperAdmin(): Promise<UserMaster[]> {
    const db = await getDb();
    return db.all(`
      SELECT u.id, u.username, u.role, u.name, u.company_id, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
    `);
  }

  async findAllForCompany(companyId: string): Promise<UserMaster[]> {
    const db = await getDb();
    return db.all(`
      SELECT id, username, role, name, company_id 
      FROM users 
      WHERE company_id = ?
    `, [companyId]);
  }

  async findById(id: string): Promise<any | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    return result || null;
  }

  async create(user: { id: string; companyId: string | null; username: string; passwordHash: string; role: string; name: string; now: string }): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO users (id, company_id, username, password_hash, role, name, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [user.id, user.companyId, user.username, user.passwordHash, user.role, user.name, user.now]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }
}

export class AccountRepository {
  async findAll(companyId: string): Promise<Account[]> {
    const db = await getDb();
    return db.all('SELECT * FROM accounts WHERE company_id = ? ORDER BY name ASC', [companyId]);
  }

  async findById(id: string, companyId: string): Promise<Account | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM accounts WHERE id = ? AND company_id = ?', [id, companyId]);
    return result || null;
  }

  async create(account: Account): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO accounts (
        id, company_id, name, gst_number, contact_person, mobile_number, address, state, opening_balance, group_name, city,
        pin_code, dist_taluka, telephone_no, email, credit_days, pan_no, vat_tin_no, cst_tin_no, account_type, broker,
        tds_rate, tds_ledger, bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_holder, print_order,
        is_dirty, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        account.id, account.company_id, account.name, account.gst_number, account.contact_person, account.mobile_number, account.address, account.state, account.opening_balance, account.group_name, account.city,
        account.pin_code, account.dist_taluka, account.telephone_no, account.email, account.credit_days, account.pan_no, account.vat_tin_no, account.cst_tin_no, account.account_type, account.broker,
        account.tds_rate || 0, account.tds_ledger || null,
        account.bank_name || null, account.bank_branch || null, account.bank_account_no || null, account.bank_ifsc || null, account.bank_account_holder || null,
        account.print_order || null,
        account.updated_at
      ]
    );
  }

  async update(id: string, companyId: string, account: Account): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE accounts SET 
        name = ?, gst_number = ?, contact_person = ?, mobile_number = ?, address = ?, state = ?, opening_balance = ?, group_name = ?, city = ?,
        pin_code = ?, dist_taluka = ?, telephone_no = ?, email = ?, credit_days = ?, pan_no = ?, vat_tin_no = ?, cst_tin_no = ?, account_type = ?, broker = ?,
        tds_rate = ?, tds_ledger = ?, bank_name = ?, bank_branch = ?, bank_account_no = ?, bank_ifsc = ?, bank_account_holder = ?, print_order = ?,
        is_dirty = 1, updated_at = ?
       WHERE id = ? AND company_id = ?`,
      [
        account.name, account.gst_number, account.contact_person, account.mobile_number, account.address, account.state, account.opening_balance, account.group_name, account.city,
        account.pin_code, account.dist_taluka, account.telephone_no, account.email, account.credit_days, account.pan_no, account.vat_tin_no, account.cst_tin_no, account.account_type, account.broker,
        account.tds_rate || 0, account.tds_ledger || null,
        account.bank_name || null, account.bank_branch || null, account.bank_account_no || null, account.bank_ifsc || null, account.bank_account_holder || null,
        account.print_order || null,
        account.updated_at, id, companyId
      ]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.run('DELETE FROM accounts WHERE id = ?', [id]);
  }
}

export class StandardMasterRepository {
  async findAll(table: string, companyId: string): Promise<StandardMaster[]> {
    const db = await getDb();
    if (table === 'categories') {
      return db.all(`SELECT * FROM ${table} WHERE company_id = ? AND is_active = 1 ORDER BY name ASC`, [companyId]);
    }
    if (table === 'groups') {
      return db.all(
        `SELECT g.*, pg.name as primary_group,
                pg.show_mailing, pg.show_statutory, pg.show_banking, pg.show_tds
         FROM groups g
         LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
         WHERE g.company_id = ?
         ORDER BY g.name ASC`,
        [companyId]
      );
    }
    return db.all(`SELECT * FROM ${table} WHERE company_id = ? ORDER BY name ASC`, [companyId]);
  }

  async findById(table: string, id: string, companyId: string): Promise<StandardMaster | null> {
    const db = await getDb();
    if (table === 'groups') {
      const result = await db.get(
        `SELECT g.*, pg.name as primary_group,
                pg.show_mailing, pg.show_statutory, pg.show_banking, pg.show_tds
         FROM groups g
         LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
         WHERE g.id = ? AND g.company_id = ?`,
        [id, companyId]
      );
      return result || null;
    }
    const result = await db.get(`SELECT * FROM ${table} WHERE id = ? AND company_id = ?`, [id, companyId]);
    return result || null;
  }

  async create(table: string, item: StandardMaster, isCategory: boolean): Promise<void> {
    const db = await getDb();
    if (isCategory) {
      await db.run(
        `INSERT INTO categories (id, company_id, name, is_active, is_dirty, created_at, updated_at)
         VALUES (?, ?, ?, 1, 1, ?, ?)`,
        [item.id, item.company_id, item.name, item.created_at, item.updated_at]
      );
    } else if (table === 'groups') {
      await db.run(
        `INSERT INTO groups (id, company_id, name, primary_group_id, is_dirty, updated_at)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [item.id, item.company_id, item.name, item.primary_group_id || null, item.updated_at]
      );
    } else {
      await db.run(
        `INSERT INTO ${table} (id, company_id, name, is_dirty, updated_at) VALUES (?, ?, ?, 1, ?)`,
        [item.id, item.company_id, item.name, item.updated_at]
      );
    }
  }

  async update(table: string, id: string, companyId: string, name: string, isActive: number, isCategory: boolean, now: string, primaryGroupId?: string): Promise<void> {
    const db = await getDb();
    if (isCategory) {
      await db.run(
        `UPDATE categories SET name = ?, is_active = ?, is_dirty = 1, updated_at = ? WHERE id = ? AND company_id = ?`,
        [name, isActive, now, id, companyId]
      );
    } else if (table === 'groups') {
      await db.run(
        `UPDATE groups SET name = ?, primary_group_id = ?, is_dirty = 1, updated_at = ? WHERE id = ? AND company_id = ?`,
        [name, primaryGroupId || null, now, id, companyId]
      );
    } else {
      await db.run(
        `UPDATE ${table} SET name = ?, is_dirty = 1, updated_at = ? WHERE id = ? AND company_id = ?`,
        [name, now, id, companyId]
      );
    }
  }

  async deactivateCategory(id: string, now: string): Promise<void> {
    const db = await getDb();
    await db.run(`UPDATE categories SET is_active = 0, is_dirty = 1, updated_at = ? WHERE id = ?`, [now, id]);
  }

  async delete(table: string, id: string): Promise<void> {
    const db = await getDb();
    await db.run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }
}

export class QualityRepository {
  async findAll(companyId: string): Promise<Quality[]> {
    const db = await getDb();
    return db.all(`
      SELECT q.*, c.name as category_name 
      FROM qualities q
      JOIN categories c ON q.category_id = c.id
      WHERE q.company_id = ?
      ORDER BY q.name ASC
    `, [companyId]);
  }

  async findById(id: string, companyId: string): Promise<Quality | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM qualities WHERE id = ? AND company_id = ?', [id, companyId]);
    return result || null;
  }

  async create(quality: Quality): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO qualities (id, company_id, category_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      [quality.id, quality.company_id, quality.category_id, quality.name, quality.created_at, quality.updated_at]
    );
  }

  async update(id: string, quality: Quality): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE qualities SET category_id = ?, name = ?, is_active = ?, is_dirty = 1, updated_at = ? WHERE id = ?`,
      [quality.category_id, quality.name, quality.is_active, quality.updated_at, id]
    );
  }

  async deactivate(id: string, now: string): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE qualities SET is_active = 0, is_dirty = 1, updated_at = ? WHERE id = ?', [now, id]);
  }

  async getJoinedResult(id: string): Promise<any> {
    const db = await getDb();
    return db.get(`
      SELECT q.*, c.name as category_name
      FROM qualities q
      JOIN categories c ON q.category_id = c.id
      WHERE q.id = ?
    `, [id]);
  }
}

export class DescriptionRepository {
  async findAll(companyId: string): Promise<Description[]> {
    const db = await getDb();
    return db.all('SELECT * FROM descriptions WHERE company_id = ? ORDER BY name ASC', [companyId]);
  }

  async findById(id: string, companyId: string): Promise<Description | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM descriptions WHERE id = ? AND company_id = ?', [id, companyId]);
    return result || null;
  }

  async create(desc: Description): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO descriptions (id, company_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, 1, 1, ?, ?)`,
      [desc.id, desc.company_id, desc.name, desc.created_at, desc.updated_at]
    );
  }

  async update(id: string, desc: Description): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE descriptions SET name = ?, is_active = ?, is_dirty = 1, updated_at = ? WHERE id = ?`,
      [desc.name, desc.is_active, desc.updated_at, id]
    );
  }

  async deactivate(id: string, now: string): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE descriptions SET is_active = 0, is_dirty = 1, updated_at = ? WHERE id = ?', [now, id]);
  }
}

export class HsnRepository {
  async findAll(companyId: string): Promise<HsnCode[]> {
    const db = await getDb();
    return db.all('SELECT * FROM hsn_codes WHERE company_id = ? ORDER BY hsn_code ASC', [companyId]);
  }

  async findById(id: string, companyId: string): Promise<HsnCode | null> {
    const db = await getDb();
    const result = await db.get('SELECT * FROM hsn_codes WHERE id = ? AND company_id = ?', [id, companyId]);
    return result || null;
  }

  async create(hsn: HsnCode): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO hsn_codes (id, company_id, hsn_code, gst_percentage, is_active, is_dirty, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      [hsn.id, hsn.company_id, hsn.hsn_code, hsn.gst_percentage, hsn.created_at, hsn.updated_at]
    );
  }

  async update(id: string, hsn: HsnCode): Promise<void> {
    const db = await getDb();
    await db.run(
      `UPDATE hsn_codes SET hsn_code = ?, gst_percentage = ?, is_active = ?, is_dirty = 1, updated_at = ? WHERE id = ?`,
      [hsn.hsn_code, hsn.gst_percentage, hsn.is_active, hsn.updated_at, id]
    );
  }

  async deactivate(id: string, now: string): Promise<void> {
    const db = await getDb();
    await db.run('UPDATE hsn_codes SET is_active = 0, is_dirty = 1, updated_at = ? WHERE id = ?', [now, id]);
  }
}

export const companyRepository = new CompanyRepository();
export const userRepository = new UserRepository();
export const accountRepository = new AccountRepository();
export const standardMasterRepository = new StandardMasterRepository();
export const qualityRepository = new QualityRepository();
export const descriptionRepository = new DescriptionRepository();
export const hsnRepository = new HsnRepository();
