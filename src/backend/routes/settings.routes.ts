import express, { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. Settings Endpoints
// ==========================================
router.get('/', authenticateJWT, (req, res) => settingsController.getSettings(req, res));
router.post('/', authenticateJWT, (req, res) => settingsController.saveSettings(req, res));

// ==========================================
// 2. Audit Logs
// ==========================================
router.get('/audit-logs', authenticateJWT, (req, res) => settingsController.getAuditLogs(req, res));

// ==========================================
// 3. Backup Database (Download ZIP)
// ==========================================
router.get('/backup', authenticateJWT, requireRole(['ADMIN']), (req, res) => settingsController.backupDatabase(req, res));

// ==========================================
// 4. Restore Database (Upload ZIP)
// ==========================================
// The screen uploads the zip as raw bytes, so this route needs a raw body parser.
router.post('/restore', authenticateJWT, express.raw({ type: 'application/zip', limit: '500mb' }), (req, res) => settingsController.restoreDatabase(req, res));

// ==========================================
// 5. Trigger Supabase Cloud Sync
// ==========================================
router.post('/sync', authenticateJWT, (req, res) => settingsController.syncSupabase(req, res));

export default router;
