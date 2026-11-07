import { Router } from 'express';
import { openingController } from '../controllers/opening.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Account Opening Balances
router.get('/accounts', authenticateJWT, (req, res) => openingController.getAccountBalances(req, res));
router.post('/accounts', authenticateJWT, (req, res) => openingController.updateAccountBalance(req, res));
router.delete('/accounts/:accountId', authenticateJWT, requireRole(['ADMIN']), (req, res) => openingController.clearAccountBalance(req, res));

// Stock Opening Balances
router.get('/stocks', authenticateJWT, (req, res) => openingController.getStockBalances(req, res));
router.post('/stocks', authenticateJWT, (req, res) => openingController.saveStockBalance(req, res));
router.delete('/stocks/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => openingController.deleteStockBalance(req, res));

export default router;
