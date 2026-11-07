import { z } from 'zod';

export function getGroupConfig(groupName: string | null) {
  const isDebtor = groupName === 'Sundry Debtors';
  const isCreditor = groupName === 'Sundry Creditors';
  const isBank = groupName === 'Bank Account';

  return {
    showMailingDetails: isDebtor || isCreditor,
    showStatutoryDetails: isDebtor || isCreditor,
    showBankingDetails: isBank || isDebtor || isCreditor,
    showTDSDetails: isCreditor,
  };
}

export function createAccountSchema(_groupName: string | null) {
  return z.object({
    name: z.string().min(1, 'Account Name is required'),
    group_name: z.string().min(1, 'Under Group is required'),
    account_type: z.string().min(1, 'Account Type is required'),
    
    // Address Fields
    addressLine1: z.string().optional().or(z.literal('')),
    addressLine2: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    pin_code: z.string().optional().or(z.literal('')),
    dist_taluka: z.string().optional().or(z.literal('')),

    // Contact Fields
    contact_person: z.string().optional().or(z.literal('')),
    mobile_number: z.string().optional().or(z.literal('')),
    telephone_no: z.string().optional().or(z.literal('')),
    email: z.string().optional().or(z.literal('')),

    // Statutory Fields
    gst_number: z.string().optional().or(z.literal('')),
    pan_no: z.string().optional().or(z.literal('')),
    vat_tin_no: z.string().optional().or(z.literal('')),
    cst_tin_no: z.string().optional().or(z.literal('')),

    // Financial / Settings Fields
    opening_balance: z.coerce.number().default(0),
    credit_days: z.coerce.number().default(0),
    broker: z.string().optional().or(z.literal('')),

    // Bank Details
    bank_name: z.string().optional().or(z.literal('')),
    bank_branch: z.string().optional().or(z.literal('')),
    bank_account_no: z.string().optional().or(z.literal('')),
    bank_ifsc: z.string().optional().or(z.literal('')),
    bank_account_holder: z.string().optional().or(z.literal('')),

    // TDS Details
    tds_rate: z.coerce.number().default(0),
    tds_ledger: z.string().optional().or(z.literal('')),
    print_order: z.string().optional().or(z.literal(''))
  });
}
