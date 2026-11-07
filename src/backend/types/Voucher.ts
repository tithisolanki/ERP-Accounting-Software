export interface Payment {
  id: string;
  company_id: string;
  account_id: string;
  amount: number;
  date: string;
  payment_mode: string;
  reference_number?: string | null;
  notes?: string | null;
  
  // Joined fields
  account_name?: string;
}

export interface Receipt {
  id: string;
  company_id: string;
  account_id: string;
  amount: number;
  date: string;
  payment_mode: string;
  reference_number?: string | null;
  notes?: string | null;
  
  // Joined fields
  account_name?: string;
}

export interface BankVoucherLine {
  id?: string;
  accountId: string;
  accountName?: string;
  amount: number;
  particulars: string;
}

export interface BankVoucher {
  voucherNo: string;
  date: string;
  chequeNo: string;
  bankAccountName: string;
  drawnOn: string;
  lines: BankVoucherLine[];
}

export interface JournalVoucherLine {
  id?: string;
  accountId: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
  particulars: string;
}

export interface JournalVoucher {
  voucherNo: string;
  date: string;
  voucherType: string;
  lines: JournalVoucherLine[];
}
