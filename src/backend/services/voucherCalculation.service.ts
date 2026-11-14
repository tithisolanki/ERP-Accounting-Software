export function calculateItemTotals(quantity: number, rate: number, gstPercentage: number) {
  const taxable = quantity * rate;
  const gst = (taxable * gstPercentage) / 100;
  const total = taxable + gst;
  return { taxable, gst, total };
}

export function calculateVoucherTotals(items: { taxable: number; gst: number; total: number }[]) {
  let totalTaxable = 0;
  let totalGst = 0;
  let totalAmount = 0;
  for (const item of items) {
    totalTaxable += item.taxable;
    totalGst += item.gst;
    totalAmount += item.total;
  }
  return { totalTaxable, totalGst, totalAmount };
}

/** Rounds money to paise so float noise (10699.999999) never reaches the books. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Document numbers are stored as INTEGER columns, so only accept whole positive numbers. */
export function parseDocNumber(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} must be a whole number greater than 0 (got "${value}").`);
  }
  return n;
}
