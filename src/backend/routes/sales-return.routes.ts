import { Router } from 'express';
import { salesReturnController } from '../controllers/sales-return.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => salesReturnController.getSalesReturns(req, res));
router.get('/next-number', authenticateJWT, (req, res) => salesReturnController.getNextReturnNumber(req, res));
router.get('/find', authenticateJWT, (req, res) => salesReturnController.findSalesReturnByNumber(req, res));
router.post('/', authenticateJWT, (req, res) => salesReturnController.createSalesReturn(req, res));
router.put('/:id', authenticateJWT, (req, res) => salesReturnController.updateSalesReturn(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => salesReturnController.deleteSalesReturn(req, res));

export default router;
