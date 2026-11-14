import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { paymentService, receiptService } from '../services/cashflow.service';

type CashflowSvc = typeof paymentService;

function createCashflowController(service: CashflowSvc, entityId: 'paymentId' | 'receiptId') {
  return {
    async getAll(req: AuthenticatedRequest, res: Response) {
      const companyId = req.user?.company_id;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      try {
        const result = await service.getAll(companyId);
        return res.json(result);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    },

    async create(req: AuthenticatedRequest, res: Response) {
      const companyId = req.user?.company_id;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      try {
        const id = await service.create(companyId, req.user, req.body);
        return res.status(201).json({ success: true, [entityId]: id });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    },

    async delete(req: AuthenticatedRequest, res: Response) {
      const companyId = req.user?.company_id;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      try {
        await service.delete(companyId, id, req.user);
        const label = entityId === 'paymentId' ? 'Payment' : 'Receipt';
        return res.json({ success: true, message: `${label} record deleted.` });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  };
}

export const paymentController = createCashflowController(paymentService, 'paymentId');
export const receiptController = createCashflowController(receiptService, 'receiptId');
