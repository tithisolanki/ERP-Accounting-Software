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
  // plain string, like every other field here - this form never renders/submits this field today
  // (see CompanyMasterPage.tsx); z.coerce.number() would need useForm's input/output generics split
  // apart (z.input<> vs z.output<>) to type-check with zodResolver, which isn't worth it for an unused field
  credit_interest_rate: z.string().optional().or(z.literal(''))
});

export type CompanyFormValues = z.infer<typeof CompanyFormSchema>;
