import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { salesReturnService, OverReturnError } from '../services/sales-return.service';

export class SalesReturnController {
  async getSalesReturns(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await salesReturnService.getSalesReturns(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNextReturnNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const nextNum = await salesReturnService.getNextSalesReturnNumber(companyId, req.query.fy as string | undefined);
      return res.json({ nextNumber: nextNum });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async findSalesReturnByNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { number } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!number) return res.status(400).json({ error: 'Return number parameter required.' });

    try {
      const result = await salesReturnService.findSalesReturnByNumber(companyId, number, req.query.fy as string | undefined);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === 'Sales return not found.' ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async createSalesReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const returnId = await salesReturnService.createSalesReturn(companyId, req.user, req.body);
      return res.status(201).json({ success: true, returnId });
    } catch (error: any) {
      if (error instanceof OverReturnError) {
        return res.status(409).json({ error: error.message, balanceDue: error.balanceDue });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async updateSalesReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await salesReturnService.updateSalesReturn(companyId, id, req.user, req.body);
      return res.json({ success: true, message: 'Sales return record updated.' });
    } catch (error: any) {
      if (error instanceof OverReturnError) {
        return res.status(409).json({ error: error.message, balanceDue: error.balanceDue });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteSalesReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await salesReturnService.deleteSalesReturn(companyId, id, req.user);
      return res.json({ success: true, message: 'Sales return record deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const salesReturnController = new SalesReturnController();
