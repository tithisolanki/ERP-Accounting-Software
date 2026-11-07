import { Router } from 'express';
import { paymentController } from '../controllers/cashflow.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => paymentController.getAll(req, res));
router.post('/', authenticateJWT, (req, res) => paymentController.create(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => paymentController.delete(req, res));

export default router;
