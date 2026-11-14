import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { settingsService } from '../services/settings.service';

export class SettingsController {
  async getSettings(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id || null;
    try {
      const result = await settingsService.getSettings(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async saveSettings(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id || null;
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array required.' });
    }

    try {
      await settingsService.saveSettings(companyId, req.user, settings);
      return res.json({ success: true, message: 'Settings saved.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const logs = await settingsService.getAuditLogs(companyId, req.user.role);
      return res.json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async backupDatabase(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const zipBuffer = await settingsService.createBackup(companyId, req.user);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="texfin_backup.zip"');
      return res.end(zipBuffer);
    } catch (error: any) {
      console.error('Backup failed:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async restoreDatabase(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only administrators can restore databases.' });
    }

    const zipBuffer = req.body;
    if (!zipBuffer || !(zipBuffer instanceof Buffer)) {
      return res.status(400).json({ error: 'Valid ZIP archive payload required.' });
    }

    try {
      await settingsService.restoreBackup(companyId, req.user, zipBuffer);
      return res.json({ success: true, message: 'Database restored successfully.' });
    } catch (error: any) {
      console.error('Restore failed:', error);
      return res.status(500).json({ error: `Restore failed: ${error.message}` });
    }
  }

  async syncSupabase(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const syncRes = await settingsService.syncSupabase(companyId, req.user);
      if (syncRes.success) {
        return res.json(syncRes);
      } else {
        return res.status(500).json({ error: syncRes.message });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const settingsController = new SettingsController();
