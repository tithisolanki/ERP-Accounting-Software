import { Router } from 'express';
import { salesController } from '../controllers/sales.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => salesController.getSales(req, res));
router.get('/next-number', authenticateJWT, (req, res) => salesController.getNextInvoiceNumber(req, res));
router.get('/find', authenticateJWT, (req, res) => salesController.findSaleByNumber(req, res));
router.get('/credit-accounts', authenticateJWT, (req, res) => salesController.getCreditAccounts(req, res));
router.post('/', authenticateJWT, (req, res) => salesController.createSale(req, res));
router.put('/:id', authenticateJWT, (req, res) => salesController.updateSale(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => salesController.deleteSale(req, res));

export default router;
