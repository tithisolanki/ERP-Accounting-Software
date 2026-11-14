import { getDb } from '../db/index';

export class ReportsRepository {
  async getSalesTotalByDate(companyId: string | null, date: string): Promise<number> {
    const db = await getDb();
    let row;
    if (companyId) {
      row = await db.get('SELECT SUM(total_amount) as total FROM sales WHERE company_id = ? AND date = ?', [companyId, date]);
    } else {
      row = await db.get('SELECT SUM(total_amount) as total FROM sales WHERE date = ?', [date]);
    }
    return row?.total || 0;
  }

  async getPurchasesTotalByDate(companyId: string | null, date: string): Promise<number> {
    const db = await getDb();
    let row;
    if (companyId) {
      row = await db.get('SELECT SUM(total_amount) as total FROM purchases WHERE company_id = ? AND date = ?', [companyId, date]);
    } else {
      row = await db.get('SELECT SUM(total_amount) as total FROM purchases WHERE date = ?', [date]);
    }
    return row?.total || 0;
  }

  async getMonthlySales(companyId: string | null): Promise<any[]> {
    const db = await getDb();
    if (companyId) {
      return db.all(`
        SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as total 
        FROM sales 
        WHERE company_id = ? 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `, [companyId]);
    } else {
      return db.all(`
        SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as total 
        FROM sales 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `);
    }
  }

  async getMonthlyPurchases(companyId: string | null): Promise<any[]> {
    const db = await getDb();
    if (companyId) {
      return db.all(`
        SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as total 
        FROM purchases 
        WHERE company_id = ? 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `, [companyId]);
    } else {
      return db.all(`
        SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as total 
        FROM purchases 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `);
    }
  }

  async getRecentLogs(companyId: string | null): Promise<any[]> {
    const db = await getDb();
    if (companyId) {
      return db.all(
        'SELECT username, action, details, timestamp FROM audit_logs WHERE company_id = ? ORDER BY timestamp DESC LIMIT 10',
        [companyId]
      );
    } else {
      return db.all(
        'SELECT username, action, details, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 10'
      );
    }
  }

  async getCompanyState(companyId: string): Promise<string> {
    const db = await getDb();
    const company = await db.get('SELECT address FROM companies WHERE id = ?', [companyId]);
    return (company?.address || '').toLowerCase();
  }

  async getSalesGst(companyId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT s.invoice_number, s.date, s.taxable_value, s.gst_amount, s.total_amount, p.name as party_name, p.gst_number, p.state as party_state
      FROM sales s
      JOIN accounts p ON s.customer_id = p.id
      WHERE s.company_id = ?
    `, [companyId]);
  }

  async getPurchasesGst(companyId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT pu.purchase_number, pu.entry_no, pu.date, pu.taxable_value, pu.gst_amount, pu.total_amount, p.name as party_name, p.gst_number, p.state as party_state
      FROM purchases pu
      JOIN accounts p ON pu.supplier_id = p.id
      WHERE pu.company_id = ?
    `, [companyId]);
  }

  async getSalesInvoiceForPdf(salesId: string, companyId: string): Promise<any | null> {
    const db = await getDb();
    return db.get('SELECT * FROM sales WHERE id = ? AND company_id = ?', [salesId, companyId]);
  }

  async getDeliveryChallanForPdf(challanId: string, companyId: string): Promise<any | null> {
    const db = await getDb();
    return db.get('SELECT * FROM delivery_challans WHERE id = ? AND company_id = ?', [challanId, companyId]);
  }

  async getSalesItemsForPdf(salesId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT si.*, 
             c.name as cloth_type,
             q.name as product_name,
             d.name as description,
             h.hsn_code
      FROM sales_items si
      JOIN categories c ON si.category_id = c.id
      JOIN qualities q ON si.quality_id = q.id
      JOIN descriptions d ON si.description_id = d.id
      JOIN hsn_codes h ON si.hsn_id = h.id
      WHERE si.sales_id = ?
    `, [salesId]);
  }

  async getDeliveryChallanItemsForPdf(challanId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT ci.*, 
             c.name as cloth_type,
             q.name as product_name,
             d.name as description,
             h.hsn_code
      FROM delivery_challan_items ci
      JOIN categories c ON ci.category_id = c.id
      JOIN qualities q ON ci.quality_id = q.id
      JOIN descriptions d ON ci.description_id = d.id
      JOIN hsn_codes h ON ci.hsn_id = h.id
      WHERE ci.challan_id = ?
    `, [challanId]);
  }

  /** Stock per quality: opening + purchased - sold (meters). */
  async getStockByQuality(companyId: string): Promise<any[]> {
    const db = await getDb();
    const rows = await db.all(`
      SELECT c.name as Category, q.name as Quality,
        COALESCE((SELECT SUM(o.balance_meters) FROM stock_opening_balances o WHERE o.quality_id = q.id AND o.company_id = q.company_id), 0) as Opening,
        COALESCE((SELECT SUM(pi.meters) FROM purchase_items pi WHERE pi.quality_id = q.id AND pi.company_id = q.company_id), 0) as Purchased,
        COALESCE((SELECT SUM(si.meters) FROM sales_items si WHERE si.quality_id = q.id AND si.company_id = q.company_id), 0) as Sold
      FROM qualities q
      LEFT JOIN categories c ON q.category_id = c.id
      WHERE q.company_id = ?
      ORDER BY c.name, q.name
    `, [companyId]);
    return rows.map((r: any) => ({ ...r, Current_Stock: r.Opening + r.Purchased - r.Sold }));
  }

  /**
   * One row per account with its primary group and net balance (debit minus credit),
   * using the same postings as the trial balance: opening (Dr/Cr), sales Dr customer,
   * purchases Cr supplier, payments Dr, receipts Cr, journal lines as entered.
   */
  async getAccountNetBalances(companyId: string): Promise<{ id: string; primary_group: string | null; net_dr: number }[]> {
    const db = await getDb();
    return db.all(`
      WITH mv AS (
        SELECT customer_id AS id, total_amount AS dr, 0 AS cr FROM sales WHERE company_id = ?1
        UNION ALL SELECT supplier_id, 0, total_amount FROM purchases WHERE company_id = ?1
        UNION ALL SELECT account_id, amount, 0 FROM payments WHERE company_id = ?1
        UNION ALL SELECT account_id, 0, amount FROM receipts WHERE company_id = ?1
        UNION ALL SELECT account_id, COALESCE(debit_amount, 0), COALESCE(credit_amount, 0) FROM journal_vouchers WHERE company_id = ?1
      ),
      totals AS (SELECT id, SUM(dr) AS dr, SUM(cr) AS cr FROM mv GROUP BY id)
      SELECT a.id, pg.name AS primary_group,
        (CASE WHEN a.opening_balance_dc = 'CR' THEN -1 ELSE 1 END) * COALESCE(a.opening_balance, 0)
          + COALESCE(t.dr, 0) - COALESCE(t.cr, 0) AS net_dr
      FROM accounts a
      LEFT JOIN groups g ON a.group_name = g.name AND g.company_id = a.company_id
      LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
      LEFT JOIN totals t ON t.id = a.id
      WHERE a.company_id = ?1
    `, [companyId]);
  }

  async getAccountsByPrimaryGroup(companyId: string, primaryGroupName: string): Promise<{ id: string; name: string }[]> {
    const db = await getDb();
    return db.all(`
      SELECT a.id, a.name
      FROM accounts a
      LEFT JOIN groups g ON a.group_name = g.name AND g.company_id = a.company_id
      LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
      WHERE a.company_id = ? AND pg.name = ?
      ORDER BY a.name ASC
    `, [companyId, primaryGroupName]);
  }

  async getAccountWithPrimaryGroup(companyId: string, accountId: string): Promise<any | null> {
    const db = await getDb();
    const row = await db.get(`
      SELECT a.*, pg.name AS primary_group_name
      FROM accounts a
      LEFT JOIN groups g ON a.group_name = g.name AND g.company_id = a.company_id
      LEFT JOIN primary_groups pg ON g.primary_group_id = pg.id
      WHERE a.id = ? AND a.company_id = ?
    `, [accountId, companyId]);
    return row || null;
  }

  /** Every posting to one account, oldest first, in the same Dr/Cr sense as the trial balance. */
  async getAccountPostings(companyId: string, accountId: string): Promise<any[]> {
    const db = await getDb();
    return db.all(`
      SELECT * FROM (
        SELECT id, date, 'Sales' AS voucherType, CAST(invoice_number AS TEXT) AS voucherNo,
               'Sales Invoice: ' || invoice_number AS particulars, total_amount AS debit, 0 AS credit, 1 AS ord
          FROM sales WHERE company_id = ?1 AND customer_id = ?2
        UNION ALL
        SELECT id, date, 'Purchase', CAST(entry_no AS TEXT),
               'Purchase Bill: ' || COALESCE(NULLIF(purchase_number, ''), entry_no), 0, total_amount, 2
          FROM purchases WHERE company_id = ?1 AND supplier_id = ?2
        UNION ALL
        SELECT id, date, 'Payment', '-',
               'Payment Mode: ' || payment_mode || COALESCE(' (' || reference_number || ')', ''), amount, 0, 3
          FROM payments WHERE company_id = ?1 AND account_id = ?2
        UNION ALL
        SELECT id, date, 'Receipt', '-',
               'Receipt Mode: ' || payment_mode || COALESCE(' (' || reference_number || ')', ''), 0, amount, 4
          FROM receipts WHERE company_id = ?1 AND account_id = ?2
        UNION ALL
        SELECT id, date, 'Journal', voucher_no,
               'Journal ' || voucher_no || COALESCE(': ' || NULLIF(particulars, ''), ''),
               COALESCE(debit_amount, 0), COALESCE(credit_amount, 0), 5
          FROM journal_vouchers WHERE company_id = ?1 AND account_id = ?2
      ) ORDER BY date, ord
    `, [companyId, accountId]);
  }
}
export const reportsRepository = new ReportsRepository();
