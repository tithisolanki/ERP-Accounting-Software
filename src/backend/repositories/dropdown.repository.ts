import { getDb } from '../db/index';

export const dropdownRepository = {
  async getCategories(companyId: string) {
    const db = await getDb();
    return db.all(
      'SELECT id, name FROM categories WHERE company_id = ? AND is_active = 1 ORDER BY name ASC',
      [companyId]
    );
  },

  async getQualities(companyId: string, categoryId: string) {
    const db = await getDb();
    return db.all(
      'SELECT id, name FROM qualities WHERE company_id = ? AND category_id = ? AND is_active = 1 ORDER BY name ASC',
      [companyId, categoryId]
    );
  },

  async getDescriptions(companyId: string) {
    const db = await getDb();
    return db.all(
      'SELECT id, name FROM descriptions WHERE company_id = ? AND is_active = 1 ORDER BY name ASC',
      [companyId]
    );
  },

  async getHsnCodes(companyId: string) {
    const db = await getDb();
    return db.all(
      'SELECT id, hsn_code, gst_percentage FROM hsn_codes WHERE company_id = ? AND is_active = 1 ORDER BY hsn_code ASC',
      [companyId]
    );
  }
};
