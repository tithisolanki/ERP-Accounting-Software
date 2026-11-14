import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { purchaseService } from '../services/purchase.service';

export class PurchaseController {
  async getPurchases(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await purchaseService.getPurchases(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNextPurchaseNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const nextNum = await purchaseService.getNextPurchaseNumber(companyId, req.query.fy as string | undefined);
      return res.json({ nextNumber: nextNum });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async findPurchaseByNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { number } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!number) return res.status(400).json({ error: 'Bill number parameter required.' });

    try {
      const result = await purchaseService.findPurchaseByNumber(companyId, number, req.query.fy as string | undefined);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === 'Purchase bill not found.' ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async createPurchase(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const purchaseId = await purchaseService.createPurchase(companyId, req.user, req.body);
      return res.status(201).json({ success: true, purchaseId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updatePurchase(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await purchaseService.updatePurchase(companyId, id, req.user, req.body);
      return res.json({ success: true, message: 'Purchase record updated.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deletePurchase(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await purchaseService.deletePurchase(companyId, id, req.user);
      return res.json({ success: true, message: 'Purchase record deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDebitAccounts(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await purchaseService.getDebitAccounts(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const purchaseController = new PurchaseController();
