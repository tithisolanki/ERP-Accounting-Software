import { getDb } from '../db/index';

export class AuthRepository {
  async findCompanyByCode(code: string) {
    const db = await getDb();
    return db.get('SELECT * FROM companies WHERE code = ?', [code]);
  }

  async findUserByUsernameAndCompany(username: string, companyId: string) {
    const db = await getDb();
    return db.get('SELECT * FROM users WHERE username = ? AND company_id = ?', [username, companyId]);
  }

  async findUserById(id: string) {
    const db = await getDb();
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }

  async findCompanyById(id: string) {
    const db = await getDb();
    return db.get('SELECT * FROM companies WHERE id = ?', [id]);
  }

  async updatePassword(id: string, hash: string, now: string) {
    const db = await getDb();
    await db.run(
      'UPDATE users SET password_hash = ?, is_dirty = 1, updated_at = ? WHERE id = ?',
      [hash, now, id]
    );
  }

  async findAllCompanies() {
    const db = await getDb();
    return db.all('SELECT id, name, code, gst_number, pan_number, address, phone, email FROM companies ORDER BY name ASC');
  }

  async findUsersByCompanyId(companyId: string | null) {
    const db = await getDb();
    if (companyId === null || companyId === 'superadmin' || companyId === 'null') {
      return db.all('SELECT id, username, name, role FROM users WHERE company_id IS NULL');
    } else {
      return db.all('SELECT id, username, name, role FROM users WHERE company_id = ?', [companyId]);
    }
  }
}

export const authRepository = new AuthRepository();
