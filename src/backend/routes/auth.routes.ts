import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res) => authController.login(req, res));
router.get('/me', authenticateJWT, (req, res) => authController.getMe(req, res));
router.post('/change-password', authenticateJWT, (req, res) => authController.changePassword(req, res));
router.get('/companies', (req, res) => authController.getCompanies(req, res));
router.get('/companies/:companyId/users', (req, res) => authController.getUsers(req, res));

export default router;
