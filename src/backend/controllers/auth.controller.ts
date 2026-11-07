import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { authService } from '../services/auth.service';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);
      return res.json(result);
    } catch (error: any) {
      const status = error.message.includes('Invalid credentials') || error.message.includes('not found') ? 401 : 400;
      return res.status(status).json({ error: error.message });
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
      const result = await authService.getMe(req.user.id);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    try {
      await authService.changePassword(req.user.id, req.user, req.body);
      return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async getCompanies(req: Request, res: Response) {
    try {
      const result = await authService.getCompanies();
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getUsers(req: Request, res: Response) {
    const { companyId } = req.params;
    try {
      const result = await authService.getUsersForCompany(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const authController = new AuthController();
