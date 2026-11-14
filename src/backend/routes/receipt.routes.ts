import { Router } from 'express';
import { receiptController } from '../controllers/cashflow.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => receiptController.getAll(req, res));
router.post('/', authenticateJWT, (req, res) => receiptController.create(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => receiptController.delete(req, res));

export default router;
