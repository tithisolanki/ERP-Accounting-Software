export const exportToCSV = (
  activeRegister: 'sales' | 'purchases' | 'journal' | 'sales_returns',
  startDate: string,
  endDate: string,
  filteredSales: any[],
  salesRegisterType: 'summarised' | 'detailed',
  filteredPurchases: any[],
  purchaseRegisterType: 'summarised' | 'detailed',
  filteredJournals: any[],
  filteredSalesReturns: any[] = []
) => {
  let headers: string[] = [];
  let rows: any[] = [];
  let filename = '';

  if (activeRegister === 'sales') {
    filename = `Sales_Register_${startDate}_to_${endDate}.csv`;
    if (salesRegisterType === 'summarised') {
      headers = ['Date', 'Invoice No', 'Customer Name', 'Sales Type', 'Credit Account', 'Taxable Val', 'GST Amt', 'Grand Total'];
      rows = filteredSales.map(s => [
        s.date,
        s.invoice_number,
        s.customer_name,
        s.sales_type || '',
        s.credit_account || '',
        s.taxable_value,
        s.gst_amount,
        s.total_amount
      ]);
    } else {
      headers = ['Date', 'Invoice No', 'Customer Name', 'Fabric Quality', 'Description', 'HSN', 'Pcs', 'Meters', 'Rate', 'GST %', 'Taxable Val', 'GST Amt', 'Line Total'];
      filteredSales.forEach(s => {
        if (s.items && s.items.length > 0) {
          s.items.forEach((item: any) => {
            rows.push([
              s.date,
              s.invoice_number,
              s.customer_name,
              item.quality_name || item.product_name || '',
              item.description_name || item.description || '',
              item.hsn_code || '',
              item.pcs || 0,
              item.meters || item.quantity || 0,
              item.rate,
              item.gst_percentage,
              item.taxable_value,
              item.gst_amount,
              item.total_amount
            ]);
          });
        } else {
          rows.push([
            s.date,
            s.invoice_number,
            s.customer_name,
            '-', '-', '-', 0, 0, 0, 0, 0, 0, s.total_amount
          ]);
        }
      });
    }
  } else if (activeRegister === 'purchases') {
    filename = `Purchase_Register_${startDate}_to_${endDate}.csv`;
    if (purchaseRegisterType === 'summarised') {
      headers = ['Date', 'Entry No', 'Bill No', 'Supplier Name', 'Purchase Type', 'Debit Account', 'Taxable Val', 'GST Amt', 'Grand Total'];
      rows = filteredPurchases.map(p => [
        p.date,
        p.purchase_number,
        p.entry_no || '',
        p.supplier_name,
        p.purchase_type || '',
        p.debit_account || '',
        p.taxable_value,
        p.gst_amount,
        p.total_amount
      ]);
    } else {
      headers = ['Date', 'Entry No', 'Bill No', 'Supplier Name', 'Category', 'Fabric Quality', 'Description', 'HSN', 'Pcs', 'Meters', 'Rate', 'GST %', 'Taxable Val', 'GST Amt', 'Line Total'];
      filteredPurchases.forEach(p => {
        if (p.items && p.items.length > 0) {
          p.items.forEach((item: any) => {
            rows.push([
              p.date,
              p.purchase_number,
              p.entry_no || '',
              p.supplier_name,
              item.category_name || '',
              item.quality_name || '',
              item.description_name || item.description || '',
              item.hsn_code || '',
              item.pcs || 0,
              item.meters || item.quantity || 0,
              item.rate,
              item.gst_percentage,
              item.taxable_value,
              item.gst_amount,
              item.total_amount
            ]);
          });
        } else {
          rows.push([
            p.date,
            p.purchase_number,
            p.entry_no || '',
            p.supplier_name,
            '-', '-', '-', '-', 0, 0, 0, 0, 0, 0, p.total_amount
          ]);
        }
      });
    }
  } else if (activeRegister === 'journal') {
    filename = `Journal_Register_${startDate}_to_${endDate}.csv`;
    headers = ['Date', 'Voucher No', 'Voucher Type', 'Account Name', 'Debit Amount (Dr)', 'Credit Amount (Cr)', 'Particulars'];
    filteredJournals.forEach(v => {
      if (v.lines && v.lines.length > 0) {
        v.lines.forEach((line: any) => {
          rows.push([
            v.date,
            v.voucherNo,
            v.voucherType,
            line.accountName,
            line.debitAmount || 0,
            line.creditAmount || 0,
            line.particulars || ''
          ]);
        });
      }
    });
  } else if (activeRegister === 'sales_returns') {
    filename = `Sales_Return_Register_${startDate}_to_${endDate}.csv`;
    headers = ['Date', 'Return No', 'Customer Name', 'Return Type', 'Taxable Val', 'GST Amt', 'Grand Total'];
    rows = filteredSalesReturns.map(r => [
      r.date,
      r.return_number,
      r.customer_name,
      r.return_type || '',
      r.taxable_value,
      r.gst_amount,
      r.total_amount
    ]);
  }

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map((val: any) => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
