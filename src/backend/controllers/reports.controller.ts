import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { reportsService } from '../services/reports.service';

export class ReportsController {
  async getDashboardSummary(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const isSuperAdmin = req.user?.role === 'super_admin';
    if (!companyId && !isSuperAdmin) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await reportsService.getDashboardSummary(companyId || null, isSuperAdmin);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getAccountLedger(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const accountId = req.params.accountId || req.params.partyId;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await reportsService.getAccountLedger(companyId, accountId);
      return res.json(result);
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async getAccountsByGroup(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const name = req.query.name as string;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!name) return res.status(400).json({ error: 'Primary group name required.' });

    try {
      const result = await reportsService.getAccountsByPrimaryGroup(companyId, name);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getGstReport(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await reportsService.getGstReport(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getInvoicePdf(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { salesId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const copiesParam = (req.query.copies as string) || 'original,duplicate,triplicate,quadruplicate';
    const copies = copiesParam.split(',').filter(Boolean);

    try {
      const pdfBuffer = await reportsService.getInvoicePdf(salesId, companyId, copies);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${salesId}.pdf"`);
      return res.end(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async getChallanPdf(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { challanId } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const copiesParam = (req.query.copies as string) || 'original,duplicate,triplicate,quadruplicate';
    const copies = copiesParam.split(',').filter(Boolean);

    try {
      const pdfBuffer = await reportsService.getChallanPdf(challanId, companyId, copies);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="challan-${challanId}.pdf"`);
      return res.end(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error('PDF Generation Error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async exportExcel(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { type } = req.query;
    const accountId = (req.query.accountId || req.query.partyId) as string | undefined;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const result = await reportsService.exportExcel(companyId, type as string, accountId || null);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.end(result.buffer);
    } catch (error: any) {
      console.error('Excel Export Error:', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return res.status(status).json({ error: error.message });
    }
  }

  async getTrialBalance(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const balanceType = (req.query.balanceType as string) || 'with_opening';

    try {
      const result = await reportsService.getTrialBalance(companyId, startDate, endDate, balanceType as any);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
export const reportsController = new ReportsController();
