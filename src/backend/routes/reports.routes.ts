import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. Dashboard Summary Stats
// ==========================================
router.get('/dashboard', authenticateJWT, (req, res) => reportsController.getDashboardSummary(req, res));

// ==========================================
// 2. Account Ledger Statement
// ==========================================
router.get('/ledger/:accountId', authenticateJWT, (req, res) => reportsController.getAccountLedger(req, res));

// ==========================================
// 3. GST Summary Report
// ==========================================
router.get('/gst', authenticateJWT, (req, res) => reportsController.getGstReport(req, res));

// ==========================================
// 4. Generate Invoice PDF
// ==========================================
router.get('/invoice-pdf/:salesId', authenticateJWT, (req, res) => reportsController.getInvoicePdf(req, res));

// ==========================================
// 4b. Generate Challan PDF
// ==========================================
router.get('/challan-pdf/:challanId', authenticateJWT, (req, res) => reportsController.getChallanPdf(req, res));

// ==========================================
// 5. Excel Export Endpoint
// ==========================================
router.get('/export-excel', authenticateJWT, (req, res) => reportsController.exportExcel(req, res));

// ==========================================
// 6. Trial Balance Report
// ==========================================
router.get('/trial-balance', authenticateJWT, (req, res) => reportsController.getTrialBalance(req, res));

export default router;
