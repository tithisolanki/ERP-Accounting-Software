import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
const AdmZip = require('adm-zip');
import { getDb, closeDb, initDb } from '../db/index';
import { settingsRepository } from '../repositories/settings.repository';
import { auditService } from './audit.service';
import { runSync } from './sync.service';

export class SettingsService {
  async getSettings(companyId: string | null) {
    const globalSettings = await settingsRepository.getGlobalSettings();
    let companySettings: any[] = [];
    if (companyId) {
      companySettings = await settingsRepository.getCompanySettings(companyId);
    }
    return {
      global: globalSettings,
      company: companySettings
    };
  }

  async saveSettings(companyId: string | null, user: { id: string; username: string }, settings: any[]) {
    const now = new Date().toISOString();
    for (const item of settings) {
      const scopeId = item.isGlobal ? null : companyId;
      const keyId = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
      await settingsRepository.upsertSetting(keyId, scopeId, item.key, item.value, now);
    }

    await auditService.log(
      companyId,
      user.id,
      user.username,
      'Settings Updated',
      `Updated settings: ${settings.map(s => s.key).join(', ')}`
    );
  }

  async getAuditLogs(companyId: string | null, userRole: string) {
    return settingsRepository.getAuditLogs(companyId, 300);
  }

  // Shared by the manual download route and the scheduled backup job, so both
  // ever zip the live database the same way.
  private buildBackupZipBuffer(): Buffer {
    const dbPath = process.env.DB_PATH || './DATA.sqlite';
    if (!fs.existsSync(dbPath)) {
      throw new Error('Database file not found.');
    }

    const zip = new AdmZip();
    zip.addLocalFile(dbPath, undefined, 'DATA.sqlite');
    return zip.toBuffer();
  }

  async createBackup(companyId: string | null, user: { id: string; username: string }): Promise<Buffer> {
    const zipBuffer = this.buildBackupZipBuffer();

    await auditService.log(
      companyId,
      user.id,
      user.username,
      'Database Backup',
      'Created system backup archive'
    );

    return zipBuffer;
  }

  // Called on a timer from backend/index.ts. Writes a timestamped zip to the
  // configured folder (default: a "backups" folder next to the DB file) once
  // every ~24h, and records last_backup_at so the UI can show a reminder.
  // shortcut: no retention/rotation of old backup files; revisit if disk usage becomes a problem.
  async runScheduledBackupIfDue(): Promise<void> {
    const lastBackupAt = await settingsRepository.getGlobalSetting('last_backup_at');
    const dayMs = 24 * 60 * 60 * 1000;
    if (lastBackupAt && Date.now() - new Date(lastBackupAt).getTime() < dayMs) {
      return;
    }

    try {
      const dbPath = path.resolve(process.env.DB_PATH || './DATA.sqlite');
      const defaultFolder = path.join(path.dirname(dbPath), 'backups');
      const folder = (await settingsRepository.getGlobalSetting('backup_folder_path')) || defaultFolder;

      fs.mkdirSync(folder, { recursive: true });
      const zipBuffer = this.buildBackupZipBuffer();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const destPath = path.join(folder, `texfin_backup_${stamp}.zip`);
      fs.writeFileSync(destPath, zipBuffer);

      const now = new Date().toISOString();
      await settingsRepository.setGlobalSetting('last_backup_at', now);
      await auditService.log(null, 'system', 'system', 'Scheduled Backup', `Automatic backup written to ${destPath}`);
      console.log(`Scheduled backup written to ${destPath}`);
    } catch (error: any) {
      console.error('Scheduled backup failed:', error);
    }
  }

  async restoreBackup(companyId: string | null, user: { id: string; username: string }, zipBuffer: Buffer): Promise<void> {
    const dbPath = process.env.DB_PATH || './DATA.sqlite';
    const safetyCopy = `${dbPath}.before-restore`;

    // Read and check the zip before touching the live database.
    const zip = new AdmZip(zipBuffer);
    const dbEntry = zip.getEntries().find((e: any) => e.entryName === 'DATA.sqlite');
    if (!dbEntry) {
      throw new Error('Invalid backup file. Missing DATA.sqlite.');
    }
    const newDb: Buffer = dbEntry.getData();
    if (newDb.subarray(0, 16).toString('latin1') !== 'SQLite format 3\u0000') {
      throw new Error('Invalid backup file. DATA.sqlite is not a SQLite database.');
    }

    await closeDb();
    fs.copyFileSync(dbPath, safetyCopy);

    try {
      fs.writeFileSync(dbPath, newDb);
      await getDb();
      await initDb();
    } catch (error) {
      // Put the old database back so the app keeps working.
      await closeDb();
      fs.copyFileSync(safetyCopy, dbPath);
      await getDb();
      throw error;
    }

    await auditService.log(
      companyId,
      user.id,
      user.username,
      'Database Restored',
      `System database restored from zip backup. Previous database kept at ${safetyCopy}.`
    );
  }

  async syncSupabase(companyId: string, user: { id: string; username: string }) {
    const { url, key } = await settingsRepository.getSupabaseCredentials();
    if (!url || !key) {
      throw new Error('Supabase cloud configuration not found. Please set URL and Key in settings.');
    }

    const syncRes = await runSync(
      companyId,
      url,
      key,
      user.id,
      user.username
    );

    return syncRes;
  }
}

export const settingsService = new SettingsService();
