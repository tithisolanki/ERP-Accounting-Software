import { z } from 'zod';

export const CompanyFormSchema = z.object({
  name: z.string().min(1, 'Company Name is required'),
  code: z.string().min(1, 'Company Code is required'),
  gst_number: z.string().optional().or(z.literal('')),
  pan_number: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  bank1_name: z.string().optional().or(z.literal('')),
  bank1_account_no: z.string().optional().or(z.literal('')),
  bank1_ifsc: z.string().optional().or(z.literal('')),
  bank2_name: z.string().optional().or(z.literal('')),
  bank2_account_no: z.string().optional().or(z.literal('')),
  bank2_ifsc: z.string().optional().or(z.literal('')),
  credit_interest_rate: z.coerce.number().optional()
});

export type CompanyFormValues = z.infer<typeof CompanyFormSchema>;
