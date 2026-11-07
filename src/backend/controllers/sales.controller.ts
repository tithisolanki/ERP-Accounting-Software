import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { salesService } from '../services/sales.service';

export class SalesController {
  async getSales(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await salesService.getSales(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getNextInvoiceNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const nextNum = await salesService.getNextInvoiceNumber(companyId);
      return res.json({ nextNumber: nextNum });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async findSaleByNumber(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { number } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!number) return res.status(400).json({ error: 'Invoice number parameter required.' });

    try {
      const result = await salesService.findSaleByNumber(companyId, number);
      return res.json(result);
    } catch (error: any) {
      const status = error.message === 'Sales invoice not found.' ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async createSale(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const salesId = await salesService.createSale(companyId, req.user, req.body);
      return res.status(201).json({ success: true, salesId });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  async updateSale(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await salesService.updateSale(companyId, id, req.user, req.body);
      return res.json({ success: true, message: 'Sales invoice record updated.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteSale(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      await salesService.deleteSale(companyId, id, req.user);
      return res.json({ success: true, message: 'Sales invoice record deleted.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getCreditAccounts(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await salesService.getCreditAccounts(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const salesController = new SalesController();
