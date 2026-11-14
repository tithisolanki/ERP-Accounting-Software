import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { purchaseReturnService } from '../services/purchase-return.service';
import { OverReturnError } from '../services/sales-return.service';

export class PurchaseReturnController {
  async getPurchaseReturns(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await purchaseReturnService.getPurchaseReturns(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNextReturnNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const nextNum = await purchaseReturnService.getNextPurchaseReturnNumber(companyId, req.query.fy as string | undefined);
      return res.json({ nextNumber: nextNum });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async findPurchaseReturnByNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { number } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!number) return res.status(400).json({ error: 'Return number parameter required.' });

    try {
      const result = await purchaseReturnService.findPurchaseReturnByNumber(companyId, number, req.query.fy as string | undefined);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === 'Purchase return not found.' ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async createPurchaseReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const returnId = await purchaseReturnService.createPurchaseReturn(companyId, req.user, req.body);
      return res.status(201).json({ success: true, returnId });
    } catch (error: any) {
      if (error instanceof OverReturnError) {
        return res.status(409).json({ error: error.message, balanceDue: error.balanceDue });
      }
      return res.status(400).json({ error: error.message });
    }
  }

  async updatePurchaseReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await purchaseReturnService.updatePurchaseReturn(companyId, id, req.user, req.body);
      return res.json({ success: true, message: 'Purchase return record updated.' });
    } catch (error: any) {
      if (error instanceof OverReturnError) {
        return res.status(409).json({ error: error.message, balanceDue: error.balanceDue });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  async deletePurchaseReturn(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await purchaseReturnService.deletePurchaseReturn(companyId, id, req.user);
      return res.json({ success: true, message: 'Purchase return record deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const purchaseReturnController = new PurchaseReturnController();
