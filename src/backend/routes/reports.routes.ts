import { Router } from 'express';
import { reportsController } from '../controllers/reports.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

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
// 2b. Accounts under one primary group (e.g. for the P&L closing account picker)
// ==========================================
router.get('/accounts-by-group', authenticateJWT, (req, res) => reportsController.getAccountsByGroup(req, res));

// ==========================================
// 2c. Party Ledger PDF (multi-account, per-account page reset)
// ==========================================
router.get('/party-ledger-pdf', authenticateJWT, (req, res) => reportsController.getPartyLedgerPdf(req, res));

// ==========================================
// 2d. Outstanding & Ageing (by account or broker)
// ==========================================
router.get('/outstanding-ledger', authenticateJWT, (req, res) => reportsController.getOutstandingLedger(req, res));

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

// ==========================================
// 7. Automatic Year-End Close
// ==========================================
router.post('/close-financial-year', authenticateJWT, requireRole(['ADMIN']), (req, res) => reportsController.closeFinancialYear(req, res));

export default router;
