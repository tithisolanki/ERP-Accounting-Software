import { Router } from 'express';
import { purchaseReturnController } from '../controllers/purchase-return.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => purchaseReturnController.getPurchaseReturns(req, res));
router.get('/next-number', authenticateJWT, (req, res) => purchaseReturnController.getNextReturnNumber(req, res));
router.get('/find', authenticateJWT, (req, res) => purchaseReturnController.findPurchaseReturnByNumber(req, res));
router.post('/', authenticateJWT, (req, res) => purchaseReturnController.createPurchaseReturn(req, res));
router.put('/:id', authenticateJWT, (req, res) => purchaseReturnController.updatePurchaseReturn(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => purchaseReturnController.deletePurchaseReturn(req, res));

export default router;
