import { Router } from 'express';
import { challanController } from '../controllers/challan.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, (req, res) => challanController.getChallans(req, res));
router.get('/next-number', authenticateJWT, (req, res) => challanController.getNextChallanNumber(req, res));
router.get('/find', authenticateJWT, (req, res) => challanController.findChallanByNumber(req, res));
router.post('/', authenticateJWT, (req, res) => challanController.createChallan(req, res));
router.put('/:id', authenticateJWT, (req, res) => challanController.updateChallan(req, res));
router.delete('/:id', authenticateJWT, requireRole(['ADMIN']), (req, res) => challanController.deleteChallan(req, res));

export default router;
