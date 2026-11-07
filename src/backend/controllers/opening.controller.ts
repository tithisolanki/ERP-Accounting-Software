import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { openingService } from '../services/opening.service';

export class OpeningController {
  async getAccountBalances(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const balances = await openingService.getAccountOpeningBalances(companyId);
      return res.json(balances);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateAccountBalance(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { accountId, amount, date, dc } = req.body;
    if (!accountId || amount === undefined || !date || !dc) {
      return res.status(400).json({ error: 'Missing required account opening parameters.' });
    }

    try {
      await openingService.updateAccountOpening(accountId, companyId, Number(amount), date, dc);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async clearAccountBalance(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { accountId } = req.params;
    if (!accountId) {
      return res.status(400).json({ error: 'Account ID parameter required.' });
    }

    try {
      await openingService.clearAccountOpening(accountId, companyId);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getStockBalances(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const balances = await openingService.getStockOpeningBalances(companyId);
      return res.json(balances);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async saveStockBalance(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      await openingService.saveStockOpening(companyId, req.body);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteStockBalance(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Stock opening ID parameter required.' });
    }

    try {
      await openingService.deleteStockOpening(id, companyId);
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const openingController = new OpeningController();
