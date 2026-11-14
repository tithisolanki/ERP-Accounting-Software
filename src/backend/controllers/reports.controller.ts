import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { reportsService } from '../services/reports.service';
import { salesReturnRepository } from '../repositories/sales-return.repository';
import { accountRepository, companyRepository } from '../repositories/masters.repository';
import { generateSalesReturnPdf } from '../services/pdf.service';

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
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const result = await reportsService.getAccountLedger(companyId, accountId, startDate, endDate);
      return res.json(result);
    } catch (error: any) {
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async getPartyLedgerPdf(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const accountIds = ((req.query.accountIds as string) || '').split(',').filter(Boolean);
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    try {
      const pdfBuffer = await reportsService.getPartyLedgerPdf(companyId, accountIds, startDate, endDate);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="party-ledger.pdf"');
      return res.end(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error('Party Ledger PDF Generation Error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({ error: error.message });
    }
  }

  async getOutstandingLedger(req: AuthenticatedRequest, res: Response) {
    // "Include All Companies" is AC_PLUS's own field for a multi-company install -- only an
    // admin's session can ever see another company's data, same gate the dashboard already uses.
    const isSuperAdmin = req.user?.role === 'super_admin';
    const includeAllCompanies = req.query.includeAllCompanies === 'true' && isSuperAdmin;
    const companyId = includeAllCompanies ? null : req.user?.company_id;
    if (!companyId && !includeAllCompanies) return res.status(400).json({ error: 'Company scope required.' });

    const accountIds = ((req.query.accountIds as string) || '').split(',').filter(Boolean);
    const asOfDate = req.query.asOfDate as string;
    const paymentUpto = req.query.paymentUpto as string;
    const groupBy = (req.query.groupBy as string) === 'broker' ? 'broker' : 'account';
    const dueOnly = req.query.dueOnly === 'true';
    const overdueDaysThreshold = Number(req.query.overdueDays || 0);
    const detailed = req.query.detailed !== 'false';
    const state = (req.query.state as string) || undefined;
    const city = (req.query.city as string) || undefined;
    const brokerFilter = (req.query.broker as string) || undefined;
    const includingPaidBills = req.query.includingPaidBills === 'true';

    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (!accountIds.length || !dateFormat.test(asOfDate) || !dateFormat.test(paymentUpto)) {
      return res.status(400).json({ error: 'accountIds, asOfDate and paymentUpto (as YYYY-MM-DD) are required.' });
    }
    if (Number.isNaN(overdueDaysThreshold) || overdueDaysThreshold < 0) {
      return res.status(400).json({ error: 'overdueDays must be a non-negative number (0 for all).' });
    }

    try {
      const result = await reportsService.getOutstandingLedger(
        companyId, accountIds, asOfDate, paymentUpto, groupBy, dueOnly, overdueDaysThreshold, detailed,
        state, city, brokerFilter, includingPaidBills
      );
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getOverdueInterest(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    const accountIds = ((req.query.accountIds as string) || '').split(',').filter(Boolean);
    const reportDate = req.query.reportDate as string;
    const periodStart = req.query.periodStart as string;
    const periodEnd = req.query.periodEnd as string;
    const interestRate = Number(req.query.interestRate);
    const maxDaysOfYear = Number(req.query.maxDaysOfYear);
    const includeEarlyPayments = req.query.includeEarlyPayments === 'true';

    const dateFormat = /^\d{4}-\d{2}-\d{2}$/;
    if (!accountIds.length || !dateFormat.test(reportDate) || !dateFormat.test(periodStart) || !dateFormat.test(periodEnd)) {
      return res.status(400).json({ error: 'accountIds, reportDate, periodStart and periodEnd (as YYYY-MM-DD) are required.' });
    }
    if (Number.isNaN(interestRate) || interestRate <= 0) {
      return res.status(400).json({ error: 'interestRate must be a positive number.' });
    }
    if (Number.isNaN(maxDaysOfYear) || maxDaysOfYear <= 0) {
      return res.status(400).json({ error: 'maxDaysOfYear must be a positive number.' });
    }

    try {
      const result = await reportsService.getOverdueInterestReport(companyId, accountIds, reportDate, periodStart, periodEnd, interestRate, maxDaysOfYear, includeEarlyPayments);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
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

  async getSalesReturnPdf(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });

    try {
      const salesReturn = await salesReturnRepository.findSalesReturnById(companyId, id);
      if (!salesReturn) throw new Error('Sales return not found.');

      const customer = await accountRepository.findById(salesReturn.customer_id, companyId);
      if (!customer) throw new Error('Customer not found.');

      const company = await companyRepository.findById(companyId);
      const items = await salesReturnRepository.findItemsBySalesReturnId(id);

      const copiesParam = (req.query.copies as string) || 'original,duplicate,triplicate,quadruplicate';
      const copies = copiesParam.split(',').filter(Boolean);

      const pdfBuffer = await generateSalesReturnPdf({
        company: {
          name: company?.name || 'TexFin Vendor',
          gst_number: company?.gst_number || undefined,
          pan_number: company?.pan_number || undefined,
          address: company?.address || undefined,
          phone: company?.phone || undefined,
          email: company?.email || undefined,
          bank1_name: company?.bank1_name || undefined,
          bank1_account_no: company?.bank1_account_no || undefined,
          bank1_ifsc: company?.bank1_ifsc || undefined,
          bank2_name: company?.bank2_name || undefined,
          bank2_account_no: company?.bank2_account_no || undefined,
          bank2_ifsc: company?.bank2_ifsc || undefined,
          credit_interest_rate: company?.credit_interest_rate ?? undefined
        },
        customer: {
          name: customer.name,
          gst_number: customer.gst_number || undefined,
          address: customer.address || undefined,
          state: customer.state || undefined,
          mobile_number: customer.mobile_number || undefined
        },
        return_number: String(salesReturn.return_number),
        date: salesReturn.date,
        financial_year: salesReturn.financial_year,
        taxable_value: salesReturn.taxable_value,
        gst_amount: salesReturn.gst_amount,
        total_amount: salesReturn.total_amount,
        challan_number: salesReturn.challan_number ? String(salesReturn.challan_number) : '',
        challan_date: salesReturn.challan_date || '',
        broker_name: salesReturn.broker_name || '',
        lr_number: salesReturn.lr_number || '',
        lr_date: salesReturn.lr_date || '',
        remark: salesReturn.remark || '',
        items: items.map((i: any) => ({
          product_name: i.quality_name,
          hsn_code: i.hsn_code !== null && i.hsn_code !== undefined ? String(i.hsn_code) : '',
          cloth_type: i.category_name || '',
          pcs: i.pcs || 0,
          quantity: i.meters,
          rate: i.rate,
          gst_percentage: i.gst_percentage,
          taxable_value: i.taxable_value,
          gst_amount: i.gst_amount,
          total_amount: i.total_amount
        }))
      }, copies);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="sales-return-${id}.pdf"`);
      return res.end(Buffer.from(pdfBuffer));
    } catch (error: any) {
      console.error('Sales Return PDF Generation Error:', error);
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

  async closeFinancialYear(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId || !req.user) return res.status(400).json({ error: 'Company scope required.' });

    const { financialYear } = req.body;

    try {
      const result = await reportsService.closeFinancialYear(companyId, { id: req.user.id, username: req.user.username }, financialYear);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
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
