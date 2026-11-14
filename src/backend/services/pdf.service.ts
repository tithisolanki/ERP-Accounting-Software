import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';

interface InvoiceData {
  company: {
    name: string;
    gst_number?: string;
    pan_number?: string;
    address?: string;
    phone?: string;
    email?: string;
    bank1_name?: string;
    bank1_account_no?: string;
    bank1_ifsc?: string;
    bank2_name?: string;
    bank2_account_no?: string;
    bank2_ifsc?: string;
    credit_interest_rate?: number;
  };
  customer: {
    name: string;
    gst_number?: string;
    address?: string;
    state?: string;
    mobile_number?: string;
  };
  invoice_number: string;
  date: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  challan_number: string;
  challan_date: string;
  credit_days: number;
  broker_name: string;
  bale_number: string;
  order_number: string;
  order_date: string;
  sales_type: string;
  lr_number: string;
  lr_date: string;
  transport: string;
  delivery_at: string;
  vehicle_number: string;
  remark: string;
  credit_account: string;
  cartage: number;
  postage: number;
  less: number;
  less_add: number;
  rounded_off: number;
  items: Array<{
    product_name: string;
    hsn_code: string;
    cloth_type: string;
    pcs: number;
    quantity: number;
    rate: number;
    gst_percentage: number;
    taxable_value: number;
    gst_amount: number;
    total_amount: number;
  }>;
}

// Word wrapping utility
function wrapText(text: string, maxWidth: number, fontSize: number, fontObj: any): string[] {
  const words = (text || '').split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const testWidth = fontObj.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > maxWidth) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Helper to convert numbers to words in Indian System (Lakhs, Crores)
function numberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    const digit = n % 10;
    if (n < 100) return b[Math.floor(n / 10)] + (digit ? ' ' + a[digit] : '');
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    return a[hundred] + ' Hundred' + (rest ? ' and ' + convertLessThanOneThousand(rest) : '');
  };

  if (num === 0) return 'Zero';
  
  let str = '';
  let integerPart = Math.floor(num);
  
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    str += convertLessThanOneThousand(crores) + ' Crore ';
    integerPart %= 10000000;
  }
  if (integerPart >= 100000) {
    const lakhs = Math.floor(integerPart / 100000);
    str += convertLessThanOneThousand(lakhs) + ' Lakh ';
    integerPart %= 100000;
  }
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    str += convertLessThanOneThousand(thousands) + ' Thousand ';
    integerPart %= 1000;
  }
  if (integerPart > 0) {
    str += convertLessThanOneThousand(integerPart);
  }
  
  return str.trim();
}

function amountToWords(amount: number): string {
  const integerPart = Math.floor(amount);
  const paisePart = Math.round((amount - integerPart) * 100);
  
  const integerWords = numberToWords(integerPart);
  const paiseWords = paisePart > 0 ? numberToWords(paisePart) : 'Zero';
  
  return `${integerWords} and Paise ${paiseWords} Only`;
}

// Format date from YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export async function generateInvoicePdf(data: InvoiceData, copies: string[], title: string = 'TAX INVOICE'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const copyTitles: Record<string, string> = {
    original: 'ORIGINAL FOR CONSIGNEE',
    duplicate: 'DUPLICATE FOR TRANSPORTER',
    triplicate: 'TRIPLICATE FOR CONSIGNOR',
    quadruplicate: 'QUADRUPLICATE FOR AGENT'
  };

  // Generate a page for each selected copy
  for (const copyKey of copies) {
    const page = pdfDoc.addPage([595, 842]);

    // 1. Draw Top Header text (Outside the box)
    page.drawText('CHANDRAKANT-9322868681', { x: 20, y: 825, size: 7, font: boldFont });
    page.drawText('| SHREE SHANKESHWAR PARSHWANATHAY NAMAH |', { x: 190, y: 825, size: 7, font: boldFont });
    page.drawText('VIKRAM-9322611164', { x: 495, y: 825, size: 7, font: boldFont });
    
    page.drawText('SUBJECT TO MUMBAI JURISDICTION', { x: 228, y: 815, size: 7, font: boldFont });
    page.drawText(`email:kchandrakantmumbai@gmail.com`, { x: 440, y: 815, size: 7, font: boldFont });
    
    page.drawText(title, { x: 297.5 - boldFont.widthOfTextAtSize(title, 12) / 2, y: 802, size: 12, font: boldFont });
    page.drawText('(Under Section-31 of Goods and Service Tax Act-2017)', { x: 180, y: 792, size: 8, font: font });
    
    const copyTitleText = copyTitles[copyKey] || copyKey.toUpperCase();
    page.drawText(copyTitleText, { x: 575 - boldFont.widthOfTextAtSize(copyTitleText, 7), y: 792, size: 7, font: boldFont });

    // 2. Draw Main outer box (x: 20 to 575, y: 40 to 785)
    page.drawRectangle({
      x: 20,
      y: 40,
      width: 555,
      height: 745,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    // 3. Draw Row 1: Supplier Details vs Metadata Box (y: 670 to 785)
    page.drawLine({ start: { x: 20, y: 670 }, end: { x: 575, y: 670 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 670 }, end: { x: 310, y: 785 }, thickness: 1, color: rgb(0,0,0) });

    // Left Cell: Supplier Info (dynamic & centered within the 290pt cell width)
    const compName = data.company.name.toUpperCase();
    const nameX = 165 - boldFont.widthOfTextAtSize(compName, 12) / 2;
    page.drawText(compName, { x: nameX > 22 ? nameX : 22, y: 765, size: 12, font: boldFont });

    const exclusiveText = 'MFGRS.OF.EXCLUSIVE SHIRTINGS';
    const exclX = 165 - boldFont.widthOfTextAtSize(exclusiveText, 8) / 2;
    page.drawText(exclusiveText, { x: exclX > 22 ? exclX : 22, y: 753, size: 8, font: boldFont });

    // Wrap company address lines
    const compAddrLines = wrapText(data.company.address || '', 280, 7, font);
    let compAddrY = 741;
    compAddrLines.slice(0, 4).forEach(line => {
      const lineX = 165 - font.widthOfTextAtSize(line, 7) / 2;
      page.drawText(line, { x: lineX > 22 ? lineX : 22, y: compAddrY, size: 7, font: font });
      compAddrY -= 10;
    });

    // Right Cell: Metadata Grid Lines
    page.drawLine({ start: { x: 310, y: 765 }, end: { x: 575, y: 765 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 745 }, end: { x: 575, y: 745 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 725 }, end: { x: 575, y: 725 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 705 }, end: { x: 575, y: 705 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 685 }, end: { x: 575, y: 685 }, thickness: 1, color: rgb(0,0,0) });

    // Right Cell: Metadata values (safely sliced to prevent overlaps)
    page.drawText('INVOICE NO.  :', { x: 315, y: 772, size: 8, font: font });
    page.drawText(data.invoice_number.slice(0, 12), { x: 395, y: 772, size: 8, font: boldFont });
    page.drawText('DATE   :', { x: 465, y: 772, size: 8, font: font });
    page.drawText(formatDate(data.date), { x: 505, y: 772, size: 8, font: boldFont });

    page.drawText('CHALLAN NO  :', { x: 315, y: 752, size: 8, font: font });
    page.drawText(data.challan_number.slice(0, 12) || '-', { x: 395, y: 752, size: 8, font: boldFont });
    page.drawText('DATE   :', { x: 465, y: 752, size: 8, font: font });
    page.drawText(formatDate(data.challan_date) || '-', { x: 505, y: 752, size: 8, font: boldFont });

    page.drawText('ORDER NO.     :', { x: 315, y: 732, size: 8, font: font });
    page.drawText(data.order_number.slice(0, 12) || '-', { x: 395, y: 732, size: 8, font: boldFont });
    page.drawText('DATE   :', { x: 465, y: 732, size: 8, font: font });
    page.drawText(formatDate(data.order_date) || '-', { x: 505, y: 732, size: 8, font: boldFont });

    page.drawText('BALE NO.       :', { x: 315, y: 712, size: 8, font: font });
    page.drawText(data.bale_number.slice(0, 24) || '-', { x: 395, y: 712, size: 8, font: boldFont });

    page.drawText('L.R.NO.          :', { x: 315, y: 692, size: 8, font: font });
    page.drawText(data.lr_number.slice(0, 12) || '-', { x: 395, y: 692, size: 8, font: boldFont });
    page.drawText('DATE   :', { x: 465, y: 692, size: 8, font: font });
    page.drawText(formatDate(data.lr_date) || '-', { x: 505, y: 692, size: 8, font: boldFont });

    page.drawText('TRANSPORT   :', { x: 315, y: 674, size: 8, font: font });
    page.drawText(data.transport.slice(0, 30) || '-', { x: 395, y: 674, size: 8, font: boldFont });
    
    // 4. Draw Row 2: GSTIN and Broker Info (y: 650 to 670)
    page.drawLine({ start: { x: 20, y: 650 }, end: { x: 575, y: 650 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 650 }, end: { x: 310, y: 670 }, thickness: 1, color: rgb(0,0,0) });
    
    page.drawText('GSTN No.        :', { x: 25, y: 657, size: 8, font: font });
    page.drawText(data.company.gst_number || '-', { x: 95, y: 657, size: 8, font: boldFont });
    page.drawText('BROKER        :', { x: 315, y: 657, size: 8, font: font });
    page.drawText(data.broker_name.slice(0, 30) || '-', { x: 395, y: 657, size: 8, font: boldFont });

    // 5. Draw Row 3: Billed To vs Shipped To Box (y: 530 to 650)
    page.drawLine({ start: { x: 20, y: 530 }, end: { x: 575, y: 530 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 297, y: 530 }, end: { x: 297, y: 650 }, thickness: 1, color: rgb(0,0,0) });
    
    page.drawText('Billed to', { x: 130, y: 639, size: 8, font: boldFont });
    page.drawText('Shipped to', { x: 410, y: 639, size: 8, font: boldFont });
    page.drawLine({ start: { x: 20, y: 635 }, end: { x: 575, y: 635 }, thickness: 1, color: rgb(0,0,0) });

    // Address block drawer with automatic wrapping to prevent side partition overlaps
    const drawAddressBlock = (startX: number, name: string, address: string, gst: string, mobile: string) => {
      page.drawText(`M/s. ${name.toUpperCase().slice(0, 32)}`, { x: startX, y: 622, size: 9, font: boldFont });
      
      const wrappedAddressLines = wrapText(address, 260, 8, font);
      let yOffset = 610;
      wrappedAddressLines.slice(0, 4).forEach(line => {
        page.drawText(line, { x: startX + 5, y: yOffset, size: 8, font: font });
        yOffset -= 10;
      });

      page.drawText('Tel No.           :', { x: startX, y: 562, size: 8, font: font });
      page.drawText(mobile || '-', { x: startX + 70, y: 562, size: 8, font: boldFont });
      page.drawText('GSTN No.        :', { x: startX, y: 546, size: 8, font: font });
      page.drawText(gst || '-', { x: startX + 70, y: 546, size: 8, font: boldFont });
    };

    drawAddressBlock(25, data.customer.name, data.customer.address || '', data.customer.gst_number || '', data.customer.mobile_number || '');
    drawAddressBlock(302, data.customer.name, data.delivery_at || data.customer.address || '', data.customer.gst_number || '', data.customer.mobile_number || '');

    // 6. Draw Row 4: Items Table Columns (y: 185 to 530)
    page.drawLine({ start: { x: 20, y: 510 }, end: { x: 575, y: 510 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 20, y: 185 }, end: { x: 575, y: 185 }, thickness: 1, color: rgb(0,0,0) });
    
    // No line between Quality and Description. First line starts at HSN Code divider.
    const vLines = [245, 295, 340, 410, 455, 495];
    vLines.forEach(x => {
      page.drawLine({ start: { x, y: 170 }, end: { x, y: 530 }, thickness: 1, color: rgb(0, 0, 0) });
    });

    // Column Headers Text
    page.drawText('QUALITY', { x: 25, y: 518, size: 8, font: boldFont });
    page.drawText('DESCRIPTION', { x: 105, y: 518, size: 8, font: boldFont });
    page.drawText('HSN CODE', { x: 250, y: 518, size: 7, font: boldFont });
    page.drawText('PCS', { x: 310, y: 518, size: 8, font: boldFont });
    page.drawText('METERS', { x: 360, y: 518, size: 8, font: boldFont });
    page.drawText('RATE', { x: 420, y: 518, size: 8, font: boldFont });
    page.drawText('PER', { x: 465, y: 518, size: 8, font: boldFont });
    page.drawText('AMOUNT', { x: 520, y: 518, size: 8, font: boldFont });

    // Table Body products list
    page.drawText('FINISH SHIRTING', { x: 25, y: 496, size: 8, font: boldFont });
    page.drawLine({
      start: { x: 25, y: 494 },
      end: { x: 25 + boldFont.widthOfTextAtSize('FINISH SHIRTING', 8), y: 494 },
      thickness: 0.75,
      color: rgb(0, 0, 0)
    });
    
    let itemY = 480;
    let totalPcs = 0;
    let totalMeters = 0;

    data.items.forEach(item => {
      // 1. Quality column (aligned left at x = 25)
      const qText = (item.cloth_type || 'SHIRTING').toUpperCase().slice(0, 12);
      page.drawText(qText, { x: 25, y: itemY, size: 8, font: font });
      
      // 2. Description column (aligned left at x = 105, wrapped)
      const descText = item.product_name;
      const descLines = wrapText(descText, 130, 8, font);
      page.drawText(descLines[0] || '', { x: 105, y: itemY, size: 8, font: font });
      
      // 3. HSN Code (centered/aligned at x = 250)
      page.drawText(item.hsn_code ? String(item.hsn_code) : '-', { x: 250, y: itemY, size: 8, font: font });
      
      // 4. PCS (aligned right to x = 335)
      const pcsText = String(item.pcs || 0);
      page.drawText(pcsText, { x: 335 - font.widthOfTextAtSize(pcsText, 8), y: itemY, size: 8, font: font });
      
      // 5. Meters (Quantity) (aligned right to x = 405)
      const metersText = item.quantity.toFixed(2);
      page.drawText(metersText, { x: 405 - font.widthOfTextAtSize(metersText, 8), y: itemY, size: 8, font: font });
      
      // 6. Rate (aligned right to x = 450)
      const rateText = item.rate.toFixed(2);
      page.drawText(rateText, { x: 450 - font.widthOfTextAtSize(rateText, 8), y: itemY, size: 8, font: font });
      
      // 7. Per unit
      page.drawText('Mtr', { x: 462, y: itemY, size: 8, font: font });
      
      // 8. Amount (aligned right to x = 570)
      const amountText = item.total_amount.toFixed(2);
      page.drawText(amountText, { x: 570 - font.widthOfTextAtSize(amountText, 8), y: itemY, size: 8, font: boldFont });
      
      totalPcs += item.pcs || 0;
      totalMeters += item.quantity || 0;
      itemY -= 14;
    });

    // NETT RATE NO LESS Totals Row (y: 170 to 185)
    page.drawLine({ start: { x: 20, y: 170 }, end: { x: 575, y: 170 }, thickness: 1, color: rgb(0,0,0) });
    const nettRateLabel = (data.remark || '').trim().slice(0, 35) || 'NETT RATE NO LESS';
    page.drawText(nettRateLabel, { x: 25, y: 174, size: 8, font: boldFont });
    
    const totPcsStr = String(totalPcs);
    page.drawText(totPcsStr, { x: 335 - boldFont.widthOfTextAtSize(totPcsStr, 8), y: 174, size: 8, font: boldFont });
    
    const totMetersStr = totalMeters.toFixed(2);
    page.drawText(totMetersStr, { x: 405 - boldFont.widthOfTextAtSize(totMetersStr, 8), y: 174, size: 8, font: boldFont });

    // 7. Draw Row 7: Bank info vs Tax Totals Box (y: 40 to 170)
    page.drawLine({ start: { x: 350, y: 40 }, end: { x: 350, y: 170 }, thickness: 1, color: rgb(0,0,0) });
    
    page.drawLine({ start: { x: 20, y: 145 }, end: { x: 350, y: 145 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 20, y: 120 }, end: { x: 350, y: 120 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 20, y: 95 }, end: { x: 350, y: 95 }, thickness: 0.5, color: rgb(0,0,0) });

    // Bank details (from the company's own record, not hardcoded, so a second company's
    // customers don't pay into the first company's account)
    if (data.company.bank1_name || data.company.bank1_account_no) {
      page.drawText(`${data.company.bank1_name || ''}  A/C NO. - ${data.company.bank1_account_no || ''}`, { x: 25, y: 158, size: 7, font: boldFont });
      page.drawText(`IFSC NO.- ${data.company.bank1_ifsc || ''}`, { x: 215, y: 158, size: 7, font: boldFont });
    }
    if (data.company.bank2_name || data.company.bank2_account_no) {
      page.drawText(`${data.company.bank2_name || ''}  A/C NO. ${data.company.bank2_account_no || ''}`, { x: 25, y: 149, size: 7, font: boldFont });
      page.drawText(`IFSC NO.${data.company.bank2_ifsc || ''}`, { x: 215, y: 149, size: 7, font: boldFont });
    }

    // Invoice Value in Words (safely wrapped)
    page.drawText('Invoice Value in Words :', { x: 25, y: 132, size: 7, font: font });
    const grandWordsLines = wrapText(amountToWords(data.total_amount), 215, 7, boldFont);
    let gWordsY = 132;
    grandWordsLines.slice(0, 2).forEach(line => {
      page.drawText(line, { x: 125, y: gWordsY, size: 7, font: boldFont });
      gWordsY -= 8;
    });

    // Amount of GST (safely wrapped)
    page.drawText('Amount of GST            :', { x: 25, y: 106, size: 7, font: font });
    const gstWordsLines = wrapText(amountToWords(data.gst_amount), 215, 7, boldFont);
    let gstWordsY = 106;
    gstWordsLines.slice(0, 2).forEach(line => {
      page.drawText(line, { x: 125, y: gstWordsY, size: 7, font: boldFont });
      gstWordsY -= 8;
    });

    // Terms & Conditions
    page.drawText('1) Goods once sold cannot be taken back.', { x: 23, y: 78, size: 6, font: font });
    page.drawText('2) No claims for Shortage,Breakage and Damage in transit.', { x: 23, y: 70, size: 6, font: font });
    page.drawText('3) Our responsibility Ceases after goods leaves our premises.', { x: 23, y: 62, size: 6, font: font });
    const interestRate = data.company.credit_interest_rate ?? 24;
    page.drawText(`4) If the Bill is not paid within ${data.credit_days} days interest @ ${interestRate}% will be charged.`, { x: 23, y: 54, size: 6, font: font });

    // Right Box Subdivisions
    page.drawLine({ start: { x: 350, y: 145 }, end: { x: 575, y: 145 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 350, y: 120 }, end: { x: 575, y: 120 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 350, y: 95 }, end: { x: 575, y: 95 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 350, y: 70 }, end: { x: 575, y: 70 }, thickness: 0.5, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 350, y: 52 }, end: { x: 575, y: 52 }, thickness: 0.5, color: rgb(0,0,0) });

    const compState = (data.company.address || '').toLowerCase();
    const custState = (data.customer.state || '').toLowerCase();
    const isInterstate = custState && compState && !compState.includes(custState) && !custState.includes(compState);

    // Gross Amount
    page.drawText('GROSS AMOUNT', { x: 355, y: 154, size: 8, font: font });
    const grossValText = data.taxable_value.toFixed(2);
    page.drawText(grossValText, { x: 570 - font.widthOfTextAtSize(grossValText, 8), y: 154, size: 8, font: font });

    // Freight & adjustments (cartage + postage - less + add). Grand total already includes them.
    const adjustments = (data.cartage || 0) + (data.postage || 0) - (data.less || 0) + (data.less_add || 0);
    page.drawText('CARTAGE/POSTAGE/LESS (+/-)', { x: 355, y: 128, size: 8, font: font });
    const adjValText = adjustments.toFixed(2);
    page.drawText(adjValText, { x: 570 - font.widthOfTextAtSize(adjValText, 8), y: 128, size: 8, font: font });

    // GST Taxes rows (rows 95-120 and 70-95)
    const gstRate = data.items[0]?.gst_percentage || 5;
    if (isInterstate) {
      page.drawText(`IGST @  ${gstRate.toFixed(2)} %`, { x: 355, y: 102, size: 8, font: font });
      const igstValText = data.gst_amount.toFixed(2);
      page.drawText(igstValText, { x: 570 - font.widthOfTextAtSize(igstValText, 8), y: 102, size: 8, font: font });
    } else {
      const halfRate = gstRate / 2;
      const halfValText = (data.gst_amount / 2).toFixed(2);

      page.drawText(`CGST @  ${halfRate.toFixed(2)} %`, { x: 355, y: 102, size: 8, font: font });
      page.drawText(halfValText, { x: 570 - font.widthOfTextAtSize(halfValText, 8), y: 102, size: 8, font: font });

      page.drawText(`SGST @  ${halfRate.toFixed(2)} %`, { x: 355, y: 77, size: 8, font: font });
      page.drawText(halfValText, { x: 570 - font.widthOfTextAtSize(halfValText, 8), y: 77, size: 8, font: font });
    }

    // Rounded-off
    page.drawText('ROUNDED-OFF', { x: 355, y: 57, size: 8, font: font });
    const roundValText = data.rounded_off.toFixed(2);
    page.drawText(roundValText, { x: 570 - font.widthOfTextAtSize(roundValText, 8), y: 57, size: 8, font: font });

    // Grand Total
    page.drawText('GRAND TOTAL', { x: 355, y: 44, size: 8, font: boldFont });
    const grandValText = data.total_amount.toFixed(2);
    page.drawText(grandValText, { x: 570 - boldFont.widthOfTextAtSize(grandValText, 8), y: 44, size: 8, font: boldFont });

    // Signatures
    page.drawText('Certified that the particulars given above are true and correct and the amount', { x: 23, y: 28, size: 6, font: font });
    page.drawText('indicated represents the price actually and there is no flow additional consideration', { x: 23, y: 20, size: 6, font: font });
    page.drawText('directly from the buyer.', { x: 130, y: 12, size: 6, font: font });
    
    page.drawText('Prepared by :', { x: 200, y: 22, size: 7, font: font });
    page.drawText('Checked By :', { x: 360, y: 22, size: 7, font: font });
    
    page.drawText(`For ${compName.slice(0, 30)}`, { x: 480, y: 26, size: 8, font: boldFont });
    page.drawText('Proprietor/Authorised Signatory', { x: 460, y: 12, size: 7, font: font });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export interface SalesReturnPdfData {
  company: InvoiceData['company'];
  customer: InvoiceData['customer'];
  return_number: string;
  date: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  challan_number: string;
  challan_date: string;
  broker_name: string;
  lr_number: string;
  lr_date: string;
  remark: string;
  items: InvoiceData['items'];
}

/**
 * Goods Credit Note (R3): reuses generateInvoicePdf's layout (same box/table drawing, just a
 * different title), since a Sales Return has no credit-days/bale/order/vehicle/freight fields
 * a Sales Invoice does -- those are zeroed out rather than given their own drawing code.
 */
export async function generateSalesReturnPdf(data: SalesReturnPdfData, copies: string[]): Promise<Uint8Array> {
  const mapped: InvoiceData = {
    company: data.company,
    customer: data.customer,
    invoice_number: data.return_number,
    date: data.date,
    financial_year: data.financial_year,
    taxable_value: data.taxable_value,
    gst_amount: data.gst_amount,
    total_amount: data.total_amount,
    challan_number: data.challan_number || '',
    challan_date: data.challan_date || '',
    credit_days: 0,
    broker_name: data.broker_name || '',
    bale_number: '',
    order_number: '',
    order_date: '',
    sales_type: '',
    lr_number: data.lr_number || '',
    lr_date: data.lr_date || '',
    transport: '',
    delivery_at: '',
    vehicle_number: '',
    remark: data.remark || '',
    credit_account: '',
    cartage: 0,
    postage: 0,
    less: 0,
    less_add: 0,
    rounded_off: 0,
    items: data.items
  };
  return generateInvoicePdf(mapped, copies, 'GOODS CREDIT NOTE');
}

export interface PurchaseReturnPdfData {
  company: InvoiceData['company'];
  customer: InvoiceData['customer'];
  return_number: string;
  date: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  challan_number: string;
  challan_date: string;
  broker_name: string;
  lr_number: string;
  lr_date: string;
  remark: string;
  items: InvoiceData['items'];
}

/**
 * Goods Debit Note (R3): mirrors generateSalesReturnPdf onto the purchase side -- reuses
 * generateInvoicePdf's layout (same box/table drawing, just a different title), since a
 * Purchase Return has no credit-days/bale/order/vehicle/freight fields either.
 */
export async function generatePurchaseReturnPdf(data: PurchaseReturnPdfData, copies: string[]): Promise<Uint8Array> {
  const mapped: InvoiceData = {
    company: data.company,
    customer: data.customer,
    invoice_number: data.return_number,
    date: data.date,
    financial_year: data.financial_year,
    taxable_value: data.taxable_value,
    gst_amount: data.gst_amount,
    total_amount: data.total_amount,
    challan_number: data.challan_number || '',
    challan_date: data.challan_date || '',
    credit_days: 0,
    broker_name: data.broker_name || '',
    bale_number: '',
    order_number: '',
    order_date: '',
    sales_type: '',
    lr_number: data.lr_number || '',
    lr_date: data.lr_date || '',
    transport: '',
    delivery_at: '',
    vehicle_number: '',
    remark: data.remark || '',
    credit_account: '',
    cartage: 0,
    postage: 0,
    less: 0,
    less_add: 0,
    rounded_off: 0,
    items: data.items
  };
  return generateInvoicePdf(mapped, copies, 'GOODS DEBIT NOTE');
}

export interface ChallanData {
  company: {
    name: string;
    gst_number?: string;
    pan_number?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  customer: {
    name: string;
    gst_number?: string;
    address?: string;
    state?: string;
    mobile_number?: string;
  };
  challan_number: string;
  date: string;
  financial_year: string;
  taxable_value: number;
  gst_amount: number;
  total_amount: number;
  broker_name: string;
  bale_number: string;
  order_number: string;
  order_date: string;
  sales_type: string;
  lr_number: string;
  lr_date: string;
  transport: string;
  delivery_at: string;
  vehicle_number: string;
  remark: string;
  rounded_off: number;
  items: Array<{
    product_name: string;
    hsn_code: string;
    cloth_type: string;
    pcs: number;
    quantity: number;
    rate: number;
    gst_percentage: number;
    taxable_value: number;
    gst_amount: number;
    total_amount: number;
    piece_meters?: string;
  }>;
}

export async function generateChallanPdf(data: ChallanData, copies: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const copyTitles: Record<string, string> = {
    original: 'ORIGINAL FOR CONSIGNEE',
    duplicate: 'DUPLICATE FOR TRANSPORTER',
    triplicate: 'TRIPLICATE FOR CONSIGNOR',
    quadruplicate: 'QUADRUPLICATE FOR AGENT'
  };

  for (const copyKey of copies) {
    const page = pdfDoc.addPage([595, 842]);

    // 1. Top Headers
    page.drawText('CHANDRAKANT-9322868681', { x: 20, y: 825, size: 7, font: boldFont });
    page.drawText('|| SHREE SHANKESHWAR PARSHWANATHAY NAMAH ||', { x: 190, y: 825, size: 7, font: boldFont });
    page.drawText('VIKRAM-9322611164', { x: 495, y: 825, size: 7, font: boldFont });
    
    page.drawText('SUBJECT TO MUMBAI JURISDICTION', { x: 228, y: 815, size: 7, font: boldFont });
    page.drawText(`email:kchandrakantmumbai@gmail.com`, { x: 440, y: 815, size: 7, font: boldFont });
    
    page.drawText('DELIVERY CHALLAN', { x: 242, y: 800, size: 10, font: boldFont });
    page.drawLine({ start: { x: 242, y: 797 }, end: { x: 342, y: 797 }, thickness: 0.75, color: rgb(0,0,0) });
    
    const copyTitleText = copyTitles[copyKey] || copyKey.toUpperCase();
    page.drawText(copyTitleText, { x: 20, y: 790, size: 6, font: boldFont });
    page.drawText('Page 1 of 1', { x: 525, y: 800, size: 7, font: font });

    // 2. Main Outer Box
    page.drawRectangle({
      x: 20,
      y: 40,
      width: 555,
      height: 745,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    // 3. Row 1: Company Header (y: 670 to 785)
    page.drawLine({ start: { x: 20, y: 670 }, end: { x: 575, y: 670 }, thickness: 1, color: rgb(0,0,0) });
    
    const compName = data.company.name.toUpperCase();
    page.drawText(compName, { x: 297.5 - boldFont.widthOfTextAtSize(compName, 16) / 2, y: 748, size: 16, font: boldFont });

    // Wrap company address lines or draw standard lines
    const compAddr = data.company.address || 'SALES OFF:119,DADISETH AGIARY LANE,, 3rd FLOOR,R.NO.4 (BACKSIDE), MUMBAI - 400002';
    const compAddrLines = wrapText(compAddr, 500, 7.5, boldFont);
    let compY = 733;
    compAddrLines.slice(0, 2).forEach(line => {
      page.drawText(line, { x: 297.5 - boldFont.widthOfTextAtSize(line, 7.5) / 2, y: compY, size: 7.5, font: boldFont });
      compY -= 12;
    });
    
    const godownText = 'GODOWN:B/2-B,2ST FLOOR,GALA NO.238-39, ANJURPHATA, ANMOL TEXTILE MARKET,BHIWANDI-421302';
    page.drawText(godownText, { x: 297.5 - boldFont.widthOfTextAtSize(godownText, 7.5) / 2, y: 709, size: 7.5, font: boldFont });

    const gstNum = `GST No.: ${data.company.gst_number || '27AACPS8836Q1ZQ'}`;
    page.drawText(gstNum, { x: 297.5 - boldFont.widthOfTextAtSize(gstNum, 8) / 2, y: 694, size: 8, font: boldFont });

    // 4. Row 2: Customer and Metadata Box (y: 530 to 670)
    page.drawLine({ start: { x: 20, y: 530 }, end: { x: 575, y: 530 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 310, y: 530 }, end: { x: 310, y: 670 }, thickness: 1, color: rgb(0,0,0) });

    // Left Column: Customer details
    page.drawText(`M/s.  ${data.customer.name.toUpperCase()}`, { x: 25, y: 657, size: 9, font: boldFont });
    const wrappedAddr = wrapText(data.customer.address || '', 270, 8, font);
    let addrY = 643;
    wrappedAddr.slice(0, 4).forEach(line => {
      page.drawText(line, { x: 35, y: addrY, size: 8, font: font });
      addrY -= 11;
    });
    page.drawText(`Tel.No.   :  ${data.customer.mobile_number || ''}`, { x: 25, y: 560, size: 8, font: font });
    page.drawText(`GST No.   :  ${data.customer.gst_number || ''}`, { x: 25, y: 544, size: 8, font: font });

    // Right Column: Metadata details
    page.drawText('Challan No.', { x: 320, y: 657, size: 8.5, font: font });
    page.drawText(`:  ${data.challan_number}`, { x: 380, y: 657, size: 8.5, font: boldFont });
    page.drawText('Date', { x: 465, y: 657, size: 8.5, font: font });
    page.drawText(`:  ${formatDate(data.date)}`, { x: 495, y: 657, size: 8.5, font: boldFont });

    page.drawText('Bale No.', { x: 320, y: 641, size: 8.5, font: font });
    page.drawText(`:  ${data.bale_number || ''}`, { x: 380, y: 641, size: 8.5, font: boldFont });

    page.drawText('Order No.', { x: 320, y: 625, size: 8.5, font: font });
    page.drawText(`:  ${data.order_number || ''}`, { x: 380, y: 625, size: 8.5, font: boldFont });
    page.drawText('Date', { x: 465, y: 625, size: 8.5, font: font });
    page.drawText(`:  ${formatDate(data.order_date) || ''}`, { x: 495, y: 625, size: 8.5, font: boldFont });

    page.drawText('Transport', { x: 320, y: 609, size: 8.5, font: font });
    page.drawText(`:  ${data.transport || ''}`, { x: 380, y: 609, size: 8.5, font: boldFont });

    page.drawText('Delivery At', { x: 320, y: 593, size: 8.5, font: font });
    const delivAddr = data.delivery_at || '';
    const wrappedDeliv = wrapText(delivAddr, 180, 8, font);
    let delivY = 593;
    wrappedDeliv.slice(0, 3).forEach((line, idx) => {
      page.drawText(idx === 0 ? `:  ${line}` : `   ${line}`, { x: 380, y: delivY, size: 8, font: boldFont });
      delivY -= 11;
    });

    const brokerY = delivY - 5;
    page.drawText('Broker', { x: 320, y: brokerY, size: 8.5, font: font });
    page.drawText(`:  ${data.broker_name || ''}`, { x: 380, y: brokerY, size: 8.5, font: boldFont });

    // 5. Items Grid Header (y: 494 to 530)
    page.drawLine({ start: { x: 20, y: 512 }, end: { x: 575, y: 512 }, thickness: 1, color: rgb(0,0,0) });
    page.drawLine({ start: { x: 20, y: 494 }, end: { x: 575, y: 494 }, thickness: 1, color: rgb(0,0,0) });

    const colWidth = 138.75;
    
    // Draw 4 main columns headers
    for (let c = 0; c < 4; c++) {
      const colStart = 20 + c * colWidth;
      
      // Column vertical lines
      if (c > 0) {
        page.drawLine({ start: { x: colStart, y: 100 }, end: { x: colStart, y: 530 }, thickness: 1, color: rgb(0, 0, 0) });
      }

      // Draw inside columns line separators (Pcs at 22pt, Meters at 72pt)
      page.drawLine({ start: { x: colStart + 22, y: 100 }, end: { x: colStart + 22, y: 512 }, thickness: 0.5, color: rgb(0,0,0) });
      page.drawLine({ start: { x: colStart + 72, y: 100 }, end: { x: colStart + 72, y: 512 }, thickness: 0.5, color: rgb(0,0,0) });

      // Label "Quality / Design" centered
      const qdText = 'Quality / Design';
      const qdWidth = boldFont.widthOfTextAtSize(qdText, 7.5);
      page.drawText(qdText, { x: colStart + (colWidth - qdWidth) / 2, y: 518, size: 7.5, font: boldFont });

      // Labels "Pcs", "Meters", "Total Meters"
      page.drawText('Pcs', { x: colStart + 3, y: 501, size: 7.5, font: boldFont });
      page.drawText('Meters', { x: colStart + 30, y: 501, size: 7.5, font: boldFont });
      page.drawText('Total Meters', { x: colStart + 76, y: 501, size: 7.5, font: boldFont });
    }

    // 6. Generate the listing print lines
    interface PrintLine {
      type: 'quality' | 'design' | 'piece' | 'design_total';
      text?: string;
      pcs?: string;
      meters?: string;
      totalMeters?: string;
    }

    const lines: PrintLine[] = [];
    let lastQuality = '';
    let grandTotalPcs = 0;
    let grandTotalMeters = 0;

    data.items.forEach(item => {
      const qName = (item.cloth_type || 'SHIRTING').toUpperCase();
      if (qName !== lastQuality) {
        lines.push({ type: 'quality', text: qName });
        lastQuality = qName;
      }

      lines.push({ type: 'design', text: (item.product_name || '').toUpperCase() });

      let piecesList: number[] = [];
      if (item.piece_meters) {
        piecesList = item.piece_meters.split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0);
      }
      if (piecesList.length === 0) {
        if (item.pcs > 0) {
          const avg = item.quantity / item.pcs;
          for (let k = 0; k < item.pcs; k++) {
            piecesList.push(avg);
          }
        } else {
          piecesList.push(item.quantity);
        }
      }

      piecesList.forEach(val => {
        lines.push({
          type: 'piece',
          pcs: '1',
          meters: val.toFixed(2),
          totalMeters: val.toFixed(2)
        });
      });

      lines.push({
        type: 'design_total',
        pcs: String(item.pcs || piecesList.length),
        meters: item.quantity.toFixed(2)
      });

      grandTotalPcs += (item.pcs || piecesList.length);
      grandTotalMeters += item.quantity;
    });

    // Draw the lines flowing from column 1 to 4
    const maxLinesPerCol = 35;
    lines.forEach((line, index) => {
      const colIndex = Math.floor(index / maxLinesPerCol);
      if (colIndex >= 4) return; // Out of bounds for single page, cap it
      
      const lineIndex = index % maxLinesPerCol;
      const colStart = 20 + colIndex * colWidth;
      const lineY = 482 - lineIndex * 10.7; // line spacing

      if (line.type === 'quality' && line.text) {
        const textW = boldFont.widthOfTextAtSize(line.text, 7.5);
        page.drawText(line.text, { x: colStart + (colWidth - textW) / 2, y: lineY, size: 7.5, font: boldFont });
        page.drawLine({
          start: { x: colStart + (colWidth - textW) / 2, y: lineY - 1 },
          end: { x: colStart + (colWidth - textW) / 2 + textW, y: lineY - 1 },
          thickness: 0.5,
          color: rgb(0,0,0)
        });
      } else if (line.type === 'design' && line.text) {
        const textW = boldFont.widthOfTextAtSize(line.text, 7.5);
        page.drawText(line.text, { x: colStart + (colWidth - textW) / 2, y: lineY, size: 7.5, font: boldFont });
      } else if (line.type === 'piece') {
        const pcsW = font.widthOfTextAtSize(line.pcs || '', 7.5);
        page.drawText(line.pcs || '', { x: colStart + 18 - pcsW, y: lineY, size: 7.5, font: font });
        
        const metersW = font.widthOfTextAtSize(line.meters || '', 7.5);
        page.drawText(line.meters || '', { x: colStart + 67 - metersW, y: lineY, size: 7.5, font: font });
        
        const totW = font.widthOfTextAtSize(line.totalMeters || '', 7.5);
        page.drawText(line.totalMeters || '', { x: colStart + 132 - totW, y: lineY, size: 7.5, font: font });
      } else if (line.type === 'design_total') {
        page.drawLine({ start: { x: colStart + 3, y: lineY + 8.5 }, end: { x: colStart + 135, y: lineY + 8.5 }, thickness: 0.5, color: rgb(0,0,0) });
        
        const pcsW = boldFont.widthOfTextAtSize(line.pcs || '', 7.5);
        page.drawText(line.pcs || '', { x: colStart + 18 - pcsW, y: lineY, size: 7.5, font: boldFont });

        const metersW = boldFont.widthOfTextAtSize(line.meters || '', 7.5);
        page.drawText(line.meters || '', { x: colStart + 132 - metersW, y: lineY, size: 7.5, font: boldFont });
        
        page.drawLine({ start: { x: colStart + 3, y: lineY - 2.5 }, end: { x: colStart + 135, y: lineY - 2.5 }, thickness: 0.5, color: rgb(0,0,0) });
      }
    });

    // 7. Grand Total Row (y: 100 border, text centered at y: 88)
    page.drawLine({ start: { x: 20, y: 100 }, end: { x: 575, y: 100 }, thickness: 1, color: rgb(0,0,0) });
    
    page.drawText('TOTAL', { x: 375, y: 88, size: 8.5, font: boldFont });

    // Grand total pieces in column 4 pcs
    const gtPcsStr = String(grandTotalPcs);
    const gtPcsW = boldFont.widthOfTextAtSize(gtPcsStr, 8.5);
    page.drawText(gtPcsStr, { x: 436.25 + 18 - gtPcsW, y: 88, size: 8.5, font: boldFont });

    // Grand total meters in column 4 total meters
    const gtMetersStr = grandTotalMeters.toFixed(2);
    const gtMetersW = boldFont.widthOfTextAtSize(gtMetersStr, 8.5);
    page.drawText(gtMetersStr, { x: 575 - 7 - gtMetersW, y: 88, size: 8.5, font: boldFont });

    // 8. Signatures Block (y: 40 to 80)
    page.drawText(`For ${compName}`, { x: 440, y: 68, size: 8, font: boldFont });
    page.drawText("Receiver's Signature with Rubber Stamp.", { x: 25, y: 12, size: 7.5, font: font });
    page.drawText('Authorised Signatory', { x: 460, y: 12, size: 7.5, font: font });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

export interface AccountLedgerPdfData {
  account: { name: string };
  openingBalance: number;
  closingBalance: number;
  ledger: { date: string; particulars: string; debit: number; credit: number; balance: number }[];
}

export interface LedgerPdfData {
  company: { name: string; address?: string };
  accounts: AccountLedgerPdfData[];
  startDate: string;
  endDate: string;
}

const LEDGER_ROWS_PER_PAGE = 40;
const LEDGER_ROW_HEIGHT = 14;
const LEDGER_BOTTOM_MARGIN = 60;

/** Strips newlines and replaces characters the WinAnsi/Helvetica encoding can't represent
 * (e.g. ₹, Gujarati script) so a free-text narration never crashes PDF generation. */
function sanitizeForPdf(text: string): string {
  return (text || '')
    .replace(/\r?\n/g, ' ')
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\xFF]/g, '?');
}

/** Draws the header block (company/account/date-range/column headers), plus the
 * opening-balance row on the account's first page only. Returns the y to start rows at. */
function drawLedgerHeader(
  page: PDFPage, font: PDFFont, boldFont: PDFFont,
  company: { name: string }, accountData: AccountLedgerPdfData,
  startDate: string, endDate: string, isFirstPage: boolean
): number {
  page.drawText(sanitizeForPdf(company.name), { x: 25, y: 810, size: 12, font: boldFont });
  page.drawText('Account Ledger', { x: 25, y: 795, size: 10, font: boldFont });
  page.drawText(sanitizeForPdf(accountData.account.name) + (isFirstPage ? '' : ' (continued)'), { x: 25, y: 780, size: 10, font: boldFont });
  page.drawText(`${formatDate(startDate)} to ${formatDate(endDate)}`, { x: 25, y: 765, size: 8, font: font });

  let y = 745;
  page.drawText('Date', { x: 25, y, size: 8, font: boldFont });
  page.drawText('Particulars', { x: 100, y, size: 8, font: boldFont });
  page.drawText('Debit', { x: 350, y, size: 8, font: boldFont });
  page.drawText('Credit', { x: 430, y, size: 8, font: boldFont });
  page.drawText('Balance', { x: 510, y, size: 8, font: boldFont });
  y -= LEDGER_ROW_HEIGHT;

  if (isFirstPage) {
    page.drawText('Opening Balance', { x: 100, y, size: 8, font: font });
    page.drawText(accountData.openingBalance.toFixed(2), { x: 510, y, size: 8, font: boldFont });
    y -= LEDGER_ROW_HEIGHT;
  }

  return y;
}

/**
 * TexFin's first multi-page PDF: one or more accounts' ledgers, each starting on its
 * own page with its own page-number counter (AC_PLUS's "New Page per Account" +
 * "Reset Page No. per Account") rather than one document-wide page count.
 */
export async function generateLedgerPdf(data: LedgerPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const accountData of data.accounts) {
    let pageInAccount = 1;
    let page = pdfDoc.addPage([595, 842]);
    let y = drawLedgerHeader(page, font, boldFont, data.company, accountData, data.startDate, data.endDate, true);
    let rowsOnPage = 0;

    for (const row of accountData.ledger) {
      if (rowsOnPage === LEDGER_ROWS_PER_PAGE) {
        page.drawText(`Page ${pageInAccount}`, { x: 500, y: LEDGER_BOTTOM_MARGIN - 30, size: 8, font: font });
        pageInAccount += 1;
        page = pdfDoc.addPage([595, 842]);
        y = drawLedgerHeader(page, font, boldFont, data.company, accountData, data.startDate, data.endDate, false);
        rowsOnPage = 0;
      }

      // Particulars column runs x=100 to the Debit column at x=350: truncate to fit (reusing
      // the invoice PDF's own wrapText helper) and sanitize so a narration can never crash or
      // overlap the amount columns.
      const particulars = wrapText(sanitizeForPdf(row.particulars), 240, 8, font)[0] || '';
      page.drawText(formatDate(row.date), { x: 25, y, size: 8, font: font });
      page.drawText(particulars, { x: 100, y, size: 8, font: font });
      page.drawText(row.debit ? row.debit.toFixed(2) : '-', { x: 350, y, size: 8, font: font });
      page.drawText(row.credit ? row.credit.toFixed(2) : '-', { x: 430, y, size: 8, font: font });
      page.drawText(row.balance.toFixed(2), { x: 510, y, size: 8, font: boldFont });

      y -= LEDGER_ROW_HEIGHT;
      rowsOnPage += 1;
    }

    page.drawText(`Closing Balance: ${accountData.closingBalance.toFixed(2)}`, { x: 300, y, size: 8, font: boldFont });
    page.drawText(`Page ${pageInAccount}`, { x: 500, y: LEDGER_BOTTOM_MARGIN - 30, size: 8, font: font });
  }

  return pdfDoc.save();
}

/** One line of the Allocation Print. date/voucherLabel/voucherNo/voucherAmount are '' / null on
 * every row after a voucher's first (one settling voucher can span several bills), matching the
 * real printed report's merged-down presentation. */
export interface AllocationPrintRow {
  date: string;
  voucherLabel: string;
  voucherNo: string;
  voucherAmount: number | null;
  billDate: string;
  billType: 'sale' | 'purchase';
  billNumber: string | number;
  billAmount: number;
  adjustAmount: number;
  balanceAfter: number;
}

export interface AccountAllocationPdfData {
  account: { name: string };
  rows: AllocationPrintRow[];
  subtotal: { voucherTotal: number; billTotal: number; adjustTotal: number };
}

export interface AllocationPrintPdfData {
  company: { name: string; address?: string | null };
  side: 'debtor' | 'creditor';
  accounts: AccountAllocationPdfData[];
  startDate: string;
  endDate: string;
}

const ALLOC_ROWS_PER_PAGE = 32;
const ALLOC_ROW_HEIGHT = 12;
const ALLOC_PAGE = [842, 595] as const; // landscape: 10 columns need the width
const ALLOC_PAGE_MARGIN = 25;
const ALLOC_PAGE_RIGHT = ALLOC_PAGE[0] - ALLOC_PAGE_MARGIN;

function centeredX(text: string, size: number, font: PDFFont): number {
  return (ALLOC_PAGE[0] - font.widthOfTextAtSize(text, size)) / 2;
}

type AllocLineItem =
  | { kind: 'accountHeader'; accountName: string }
  | { kind: 'row'; row: AllocationPrintRow }
  | { kind: 'subtotal'; subtotal: AccountAllocationPdfData['subtotal'] };

/** Flattens all accounts into one continuous sequence of lines, then splits into pages of
 * ALLOC_ROWS_PER_PAGE lines each -- no per-account page reset (confirmed from a real printed
 * sample: an account's rows can start mid-page and a page break mid-account just repeats that
 * account's name header at the top of the next page before continuing its rows). */
function paginateAllocationPrint(accounts: AccountAllocationPdfData[]): AllocLineItem[][] {
  const flat: AllocLineItem[] = [];
  for (const acc of accounts) {
    flat.push({ kind: 'accountHeader', accountName: acc.account.name });
    for (const row of acc.rows) flat.push({ kind: 'row', row });
    flat.push({ kind: 'subtotal', subtotal: acc.subtotal });
  }

  const pages: AllocLineItem[][] = [];
  let current: AllocLineItem[] = [];
  let currentAccountName: string | null = null;
  for (const item of flat) {
    if (current.length === ALLOC_ROWS_PER_PAGE) {
      pages.push(current);
      current = [];
      if (currentAccountName && item.kind !== 'accountHeader') {
        current.push({ kind: 'accountHeader', accountName: currentAccountName });
      }
    }
    current.push(item);
    if (item.kind === 'accountHeader') currentAccountName = item.accountName;
    if (item.kind === 'subtotal') currentAccountName = null;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

const ALLOC_COLS = { date: 25, voucherLabel: 85, voucherNo: 165, voucherAmount: 235, billDate: 310, billType: 375, billNumber: 435, billAmount: 500, adjustAmount: 590, balanceAfter: 680 };

/** Draws the company letterhead, title + page number, and column header row, matching
 * AC_PLUS's own printed layout (centered letterhead, "Page No. N" beside the title, a ruled
 * line under the column headers) as closely as a hand-drawn PDF reasonably can. */
function drawAllocationPrintPageHeader(
  page: PDFPage, font: PDFFont, boldFont: PDFFont,
  company: { name: string; address?: string | null }, side: 'debtor' | 'creditor',
  startDate: string, endDate: string, pageNo: number
): number {
  let y = 565;
  const name = sanitizeForPdf(company.name);
  page.drawText(name, { x: centeredX(name, 14, boldFont), y, size: 14, font: boldFont });
  y -= 16;

  if (company.address) {
    const addressLines = wrapText(sanitizeForPdf(company.address), 700, 8, font);
    for (const line of addressLines.slice(0, 3)) {
      page.drawText(line, { x: centeredX(line, 8, font), y, size: 8, font });
      y -= 11;
    }
  }

  y -= 8;
  const title = side === 'debtor'
    ? `RECEIPT ALLOCATION FROM AS ON ${formatDate(startDate)} TO ${formatDate(endDate)}`
    : `PAYMENT ALLOCATION FROM AS ON ${formatDate(startDate)} TO ${formatDate(endDate)}`;
  page.drawText(title, { x: ALLOC_PAGE_MARGIN, y, size: 10, font: boldFont });
  const pageLabel = `Page No.   ${pageNo}`;
  page.drawText(pageLabel, { x: ALLOC_PAGE_RIGHT - boldFont.widthOfTextAtSize(pageLabel, 9), y, size: 9, font: boldFont });
  y -= 16;

  page.drawText('Account Name', { x: ALLOC_PAGE_MARGIN, y, size: 8, font });
  y -= 14;

  page.drawText('Date', { x: ALLOC_COLS.date, y, size: 7, font: boldFont });
  page.drawText('Vou.Type', { x: ALLOC_COLS.voucherLabel, y, size: 7, font: boldFont });
  page.drawText('Voucher No.', { x: ALLOC_COLS.voucherNo, y, size: 7, font: boldFont });
  page.drawText('Voucher Amt.', { x: ALLOC_COLS.voucherAmount, y, size: 7, font: boldFont });
  page.drawText('Bill Date', { x: ALLOC_COLS.billDate, y, size: 7, font: boldFont });
  page.drawText('Type', { x: ALLOC_COLS.billType, y, size: 7, font: boldFont });
  page.drawText('Bill No.', { x: ALLOC_COLS.billNumber, y, size: 7, font: boldFont });
  page.drawText('Balance Amt.', { x: ALLOC_COLS.billAmount, y, size: 7, font: boldFont });
  page.drawText('Adjust Amt.', { x: ALLOC_COLS.adjustAmount, y, size: 7, font: boldFont });
  page.drawText('Balance Amt.', { x: ALLOC_COLS.balanceAfter, y, size: 7, font: boldFont });
  y -= 5;
  page.drawLine({ start: { x: ALLOC_PAGE_MARGIN, y }, end: { x: ALLOC_PAGE_RIGHT, y }, thickness: 1, color: rgb(0, 0, 0) });
  y -= ALLOC_ROW_HEIGHT;
  return y;
}

/**
 * Print Allocation (R20): AC_PLUS's ADEBALOCPRNT/ACREALOCPRNT, confirmed from a real printed
 * sample ("PAYMENT ALLOCATION FROM AS ON ... TO ..."): one continuous document across every
 * selected account (no per-account page reset, unlike Party Ledger), each account's settling
 * vouchers listed bill-by-bill with a running "Balance Amt." and a per-account subtotal row.
 */
export async function generateAllocationPrintPdf(data: AllocationPrintPdfData): Promise<Uint8Array> {
  const pages = paginateAllocationPrint(data.accounts);
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  if (pages.length === 0) {
    const page = pdfDoc.addPage([...ALLOC_PAGE]);
    drawAllocationPrintPageHeader(page, font, boldFont, data.company, data.side, data.startDate, data.endDate, 1);
    page.drawText('No allocation activity found for the selected accounts and date range.', { x: ALLOC_PAGE_MARGIN, y: 400, size: 9, font });
    return pdfDoc.save();
  }

  pages.forEach((items, pageIndex) => {
    const page = pdfDoc.addPage([...ALLOC_PAGE]);
    let y = drawAllocationPrintPageHeader(page, font, boldFont, data.company, data.side, data.startDate, data.endDate, pageIndex + 1);
    const rule = (atY: number) => page.drawLine({ start: { x: ALLOC_PAGE_MARGIN, y: atY }, end: { x: ALLOC_PAGE_RIGHT, y: atY }, thickness: 0.5, color: rgb(0, 0, 0) });

    for (const item of items) {
      if (item.kind === 'accountHeader') {
        const name = sanitizeForPdf(item.accountName);
        page.drawText(name, { x: ALLOC_PAGE_MARGIN, y, size: 9, font: boldFont });
        page.drawLine({ start: { x: ALLOC_PAGE_MARGIN, y: y - 2 }, end: { x: ALLOC_PAGE_MARGIN + boldFont.widthOfTextAtSize(name, 9), y: y - 2 }, thickness: 0.5, color: rgb(0, 0, 0) });
      } else if (item.kind === 'row') {
        const r = item.row;
        if (r.date) page.drawText(formatDate(r.date), { x: ALLOC_COLS.date, y, size: 7, font });
        if (r.voucherLabel) page.drawText(sanitizeForPdf(r.voucherLabel), { x: ALLOC_COLS.voucherLabel, y, size: 7, font });
        if (r.voucherNo) page.drawText(sanitizeForPdf(r.voucherNo), { x: ALLOC_COLS.voucherNo, y, size: 7, font });
        if (r.voucherAmount != null) page.drawText(r.voucherAmount.toFixed(2), { x: ALLOC_COLS.voucherAmount, y, size: 7, font });
        page.drawText(formatDate(r.billDate), { x: ALLOC_COLS.billDate, y, size: 7, font });
        page.drawText(r.billType === 'sale' ? 'Sales Bill' : 'Pur.Bill', { x: ALLOC_COLS.billType, y, size: 7, font });
        page.drawText(String(r.billNumber), { x: ALLOC_COLS.billNumber, y, size: 7, font });
        page.drawText(r.billAmount.toFixed(2), { x: ALLOC_COLS.billAmount, y, size: 7, font });
        page.drawText(r.adjustAmount.toFixed(2), { x: ALLOC_COLS.adjustAmount, y, size: 7, font });
        page.drawText(r.balanceAfter.toFixed(2), { x: ALLOC_COLS.balanceAfter, y, size: 7, font: boldFont });
      } else {
        rule(y + 6);
        page.drawText(item.subtotal.voucherTotal.toFixed(2), { x: ALLOC_COLS.voucherAmount, y, size: 7, font: boldFont });
        page.drawText(item.subtotal.billTotal.toFixed(2), { x: ALLOC_COLS.billAmount, y, size: 7, font: boldFont });
        page.drawText(item.subtotal.adjustTotal.toFixed(2), { x: ALLOC_COLS.adjustAmount, y, size: 7, font: boldFont });
        rule(y - 4);
      }
      y -= ALLOC_ROW_HEIGHT;
    }

    const footer = `Page ${pageIndex + 1} of ${pages.length}`;
    page.drawText(footer, { x: ALLOC_PAGE_RIGHT - font.widthOfTextAtSize(footer, 8), y: 20, size: 8, font });
  });

  return pdfDoc.save();
}
