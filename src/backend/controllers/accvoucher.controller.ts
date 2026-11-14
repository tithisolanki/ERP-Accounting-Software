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
    const excludeParam = (req.query.exclude as string) || '';
    const excludeLineIds = excludeParam.split(',').map((s) => s.trim()).filter(Boolean);
    try {
      const result = await accVoucherService.getOutstandingBills(companyId, accountId, excludeLineIds);
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

  async getOutstandingBillsForAllocation(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { side, accountId } = req.params;
    if (side !== 'debtor' && side !== 'creditor') {
      return res.status(400).json({ error: 'Invalid side.' });
    }
    try {
      const result = await accVoucherService.getOutstandingBillsForAllocation(companyId, accountId, side, {
        includeAllEntries: req.query.includeAllEntries === 'true',
        excludeEntryNo: (req.query.excludeEntryNo as string) || undefined
      });
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getAllocationEntries(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { side } = req.params;
    if (side !== 'debtor' && side !== 'creditor') {
      return res.status(400).json({ error: 'Invalid side.' });
    }
    try {
      const result = await accVoucherService.getAllocationEntries(companyId, side);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getAllocationEntryDetail(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const { side, entryNo } = req.params;
    if (side !== 'debtor' && side !== 'creditor') {
      return res.status(400).json({ error: 'Invalid side.' });
    }
    try {
      const result = await accVoucherService.getAllocationEntryDetail(companyId, side, entryNo);
      if (!result) return res.status(404).json({ error: `Allocation Entry No. ${entryNo} not found.` });
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async saveAllocationEntry(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    try {
      const entryNo = await accVoucherService.saveAllocationEntry(companyId, req.user, req.body);
      return res.status(201).json({ success: true, entryNo });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteAllocationEntry(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });

    const { side, entryNo } = req.params;
    if (side !== 'debtor' && side !== 'creditor') {
      return res.status(400).json({ error: 'Invalid side.' });
    }
    try {
      await accVoucherService.deleteAllocationEntry(companyId, req.user, side as any, entryNo);
      return res.json({ success: true, message: `Allocation Entry No. ${entryNo} deleted.` });
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
