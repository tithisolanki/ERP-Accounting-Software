import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { accVoucherService } from '../services/accvoucher.service';

export class AccVoucherController {
  async getGroupedVouchers(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { type } = req.params;
    if (type !== 'payment' && type !== 'receipt' && type !== 'journal') {
      return res.status(400).json({ error: 'Invalid transaction type.' });
    }

    try {
      const result = await accVoucherService.getGroupedVouchers(companyId, type);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getOutstandingBills(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { accountId } = req.params;
    try {
      const result = await accVoucherService.getOutstandingBills(companyId, accountId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async saveVoucher(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const voucherNo = await accVoucherService.saveVoucher(companyId, req.user, req.body);
      return res.status(201).json({ success: true, voucherNo });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteVoucher(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    const { type, voucherNo } = req.params;
    try {
      await accVoucherService.deleteVoucher(companyId, req.user, type as any, voucherNo);
      return res.json({ success: true, message: `Voucher No. ${voucherNo} deleted.` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const accVoucherController = new AccVoucherController();
