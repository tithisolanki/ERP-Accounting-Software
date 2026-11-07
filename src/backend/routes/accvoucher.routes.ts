import { Router } from 'express';
import { accVoucherController } from '../controllers/accvoucher.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/:type', authenticateJWT, (req, res) => accVoucherController.getGroupedVouchers(req, res));
router.post('/', authenticateJWT, (req, res) => accVoucherController.saveVoucher(req, res));
router.delete('/:type/:voucherNo', authenticateJWT, requireRole(['ADMIN']), (req, res) => accVoucherController.deleteVoucher(req, res));

export default router;
