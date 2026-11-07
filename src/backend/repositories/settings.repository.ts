import { getDb } from '../db/index';
import { SettingItem, AuditLogItem } from '../types/Settings';

export class SettingsRepository {
  async getGlobalSettings(): Promise<{ key: string; value: string }[]> {
    const db = await getDb();
    return db.all('SELECT key, value FROM settings WHERE company_id IS NULL');
  }

  async getCompanySettings(companyId: string): Promise<{ key: string; value: string }[]> {
    const db = await getDb();
    return db.all('SELECT key, value FROM settings WHERE company_id = ?', [companyId]);
  }

  async upsertSetting(id: string, companyId: string | null, key: string, value: string, now: string): Promise<void> {
    const db = await getDb();
    await db.run(
      `INSERT INTO settings (id, company_id, key, value, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(company_id, key) DO UPDATE SET value = excluded.value, is_dirty = 1, updated_at = excluded.updated_at`,
      [id, companyId, key, value, now]
    );
  }

  async getAuditLogs(companyId: string | null, limit: number): Promise<AuditLogItem[]> {
    const db = await getDb();
    if (companyId === null) {
      return db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?', [limit]);
    } else {
      return db.all('SELECT * FROM audit_logs WHERE company_id = ? ORDER BY timestamp DESC LIMIT ?', [companyId, limit]);
    }
  }

  async getSupabaseCredentials(): Promise<{ url: string | null; key: string | null }> {
    const db = await getDb();
    const urlSetting = await db.get('SELECT value FROM settings WHERE key = "supabase_url"');
    const keySetting = await db.get('SELECT value FROM settings WHERE key = "supabase_key"');
    return {
      url: process.env.SUPABASE_URL || urlSetting?.value || null,
      key: process.env.SUPABASE_KEY || keySetting?.value || null
    };
  }
}

export const settingsRepository = new SettingsRepository();
