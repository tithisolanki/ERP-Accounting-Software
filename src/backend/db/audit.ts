import crypto from 'crypto';
import { getDb } from '../../../db/connection';

export async function insertAuditLog(
  companyId: string | null,
  userId: string,
  username: string,
  action: string,
  details: string
) {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO audit_logs (id, company_id, user_id, username, action, details, timestamp, is_dirty, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [crypto.randomUUID(), companyId, userId, username, action, details, now, now]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
