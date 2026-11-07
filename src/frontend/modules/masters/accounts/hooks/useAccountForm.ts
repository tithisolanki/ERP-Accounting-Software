import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccountFormValues } from '../AccountTypes';
import { createAccountSchema } from '../AccountValidation';

export function useAccountForm(
  initialValues: Partial<AccountFormValues>
) {
  // Custom resolver that dynamically resolves Zod schema based on the current group selection
  const resolver = (values: any, context: any, options: any) => {
    const selectedGroup = values.group_name;
    const schema = createAccountSchema(selectedGroup);
    return zodResolver(schema)(values, context, options);
  };

  const form = useForm<AccountFormValues>({
    defaultValues: initialValues as AccountFormValues,
    resolver: resolver as any
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    (window as any).isMastersDirty = isDirty;
    return () => {
      (window as any).isMastersDirty = false;
    };
  }, [isDirty]);

  return form;
}
