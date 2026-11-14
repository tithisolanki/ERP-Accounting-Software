import { Router } from 'express';
import { purchaseController } from '../controllers/purchase.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => purchaseController.getPurchases(req, res));
router.get('/next-number', authenticateJWT, (req, res) => purchaseController.getNextPurchaseNumber(req, res));
router.get('/find', authenticateJWT, (req, res) => purchaseController.findPurchaseByNumber(req, res));
router.get('/debit-accounts', authenticateJWT, (req, res) => purchaseController.getDebitAccounts(req, res));
router.post('/', authenticateJWT, (req, res) => purchaseController.createPurchase(req, res));
router.put('/:id', authenticateJWT, (req, res) => purchaseController.updatePurchase(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => purchaseController.deletePurchase(req, res));

export default router;
