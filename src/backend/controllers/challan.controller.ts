import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { challanService } from '../services/challan.service';

export class ChallanController {
  async getChallans(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await challanService.getChallans(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNextChallanNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const nextNum = await challanService.getNextChallanNumber(companyId, req.query.fy as string | undefined);
      return res.json({ nextNumber: nextNum });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async findChallanByNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { number } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!number) return res.status(400).json({ error: 'Challan number parameter required.' });

    try {
      const result = await challanService.findChallanByNumber(companyId, number, req.query.fy as string | undefined);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === 'Delivery Challan not found.' ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async createChallan(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const challanId = await challanService.createChallan(companyId, req.user, req.body);
      return res.status(201).json({ success: true, challanId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateChallan(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await challanService.updateChallan(companyId, id, req.user, req.body);
      return res.json({ success: true, message: 'Challan record updated.' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async deleteChallan(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await challanService.deleteChallan(companyId, id, req.user);
      return res.json({ success: true, message: 'Challan record deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const challanController = new ChallanController();
