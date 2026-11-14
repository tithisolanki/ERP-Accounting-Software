import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompanyFormSchema, CompanyFormValues } from './CompanyTypes';
import { Company } from '@shared/types';
import { CompanyService } from '../../../services/api';
import { useStore } from '../../../store/useStore';
import { Card } from '../../../components/Card';
import { Table } from '../../../components/Table';
import { Button } from '../../../components/Button';
import { Plus, Edit2, Save, X } from 'lucide-react';
import { MasterModal } from '../shared/components/MasterModal';
import { ERPInput } from '../shared/components/ERPInput';

export const CompanyMasterPage: React.FC = () => {
  const { token, addNotification, user } = useStore();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState<Company | null>(null);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Company | null>(null);

  const isSuperAdmin = false;
  const isAdmin = user?.role === 'ADMIN';

  // React Hook Form for Company
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(CompanyFormSchema)
  });

  const fetchCompanies = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await CompanyService.getAll(token);
      setCompanies(data);
      if (data.length > 0) {
        const ownComp = data[0];
        setSelectedComp(ownComp);
        setValue('name', ownComp.name);
        setValue('code', ownComp.code);
        setValue('gst_number', ownComp.gst_number || '');
        setValue('pan_number', ownComp.pan_number || '');
        setValue('address', ownComp.address || '');
        setValue('phone', ownComp.phone || '');
        setValue('email', ownComp.email || '');
      }
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to fetch companies list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [token]);

  const openAddModal = () => {
    setEditItem(null);
    reset({
      name: '',
      code: '',
      gst_number: '',
      pan_number: '',
      address: '',
      phone: '',
      email: ''
    });
    setEditModalOpen(true);
  };

  const openEditModal = (item: Company) => {
    setEditItem(item);
    reset({
      name: item.name,
      code: item.code,
      gst_number: item.gst_number || '',
      pan_number: item.pan_number || '',
      address: item.address || '',
      phone: item.phone || '',
      email: item.email || ''
    });
    setEditModalOpen(true);
  };

  const handleCompanySubmit = async (values: CompanyFormValues) => {
    if (!token) return;
    // credit_interest_rate is a plain string in the form (this page doesn't render a field for
    // it today) but a number on the Company type - convert here rather than in the Zod schema.
    const payload = { ...values, credit_interest_rate: values.credit_interest_rate ? Number(values.credit_interest_rate) : undefined };
    try {
      if (editItem) {
        await CompanyService.update(editItem.id, payload, token);
        addNotification('success', 'Company details updated successfully.');
      } else {
        await CompanyService.create(payload, token);
        addNotification('success', 'Company registered successfully.');
      }
      setEditModalOpen(false);
      setEditItem(null);
      fetchCompanies();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save company details.');
    }
  };



  const handleOwnProfileSubmit = async (values: CompanyFormValues) => {
    if (!token || !selectedComp) return;
    const payload = { ...values, credit_interest_rate: values.credit_interest_rate ? Number(values.credit_interest_rate) : undefined };
    try {
      await CompanyService.update(selectedComp.id, payload, token);
      addNotification('success', 'Your company profile details have been saved.');
      fetchCompanies();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to update profile details.');
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card title="Own Company Profile" subtitle="Verify and edit firm credentials printed on invoices">
        {selectedComp ? (
          <form onSubmit={handleSubmit(handleOwnProfileSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2 text-xs">
            <ERPInput label="Company Name" required disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.name?.message} {...register('name')} />
            <ERPInput label="Company Code" disabled className="bg-slate-100" error={errors.code?.message} {...register('code')} />
            <ERPInput label="GST Number" disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.gst_number?.message} {...register('gst_number')} />
            <ERPInput label="PAN Number" disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.pan_number?.message} {...register('pan_number')} />
            <ERPInput label="Phone Number" disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.phone?.message} {...register('phone')} />
            <ERPInput label="Email Address" type="email" disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.email?.message} {...register('email')} />
            <div className="md:col-span-2">
              <ERPInput label="Billing/Operating Address" disabled={!isAdmin} className={!isAdmin ? 'bg-slate-100' : ''} error={errors.address?.message} {...register('address')} />
            </div>
            {isAdmin && (
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" variant="primary" className="cursor-pointer">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              </div>
            )}
          </form>
        ) : (
          <div className="py-10 text-center text-slate-400">Failed to load company profile.</div>
        )}
      </Card>
    );
  }

  return (
    <>
      <Card 
        title="Registered Companies" 
        subtitle="Super Admin - Manage all client firms" 
        headerAction={
          <Button size="sm" onClick={openAddModal} className="cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1" /> Register Company
          </Button>
        }
      >
        {loading ? (
          <div className="py-10 text-center text-slate-400">Loading companies...</div>
        ) : companies.length > 0 ? (
          <Table headers={['Company Name', 'Code', 'GSTIN', 'PAN', 'Phone', 'Email', 'Actions']}>
            {companies.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{c.name}</td>
                <td className="px-4 py-3 text-sm font-mono text-blue-600 font-bold">{c.code}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-mono">{c.gst_number || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-mono">{c.pan_number || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.phone || '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.email || '-'}</td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => openEditModal(c)} className="cursor-pointer">
                    <Edit2 className="w-3 h-3 mr-1 text-indigo-650 inline" /> Edit Details
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-center text-slate-400 py-10">No companies registered.</p>
        )}
      </Card>

      {/* Edit/Create Modal */}
      <MasterModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Company Details' : 'Register New Company'}
        size="md"
      >
        <form onSubmit={handleSubmit(handleCompanySubmit)} className="flex flex-col gap-4 text-xs">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4 animate-slide-in">
            <div className="sm:col-span-2">
              <ERPInput label="Company Name" required error={errors.name?.message} {...register('name')} />
            </div>
            <ERPInput label="Unique Company Code" required disabled={!!editItem} className={editItem ? 'bg-slate-100' : ''} error={errors.code?.message} {...register('code')} />
            <ERPInput label="GST Number" error={errors.gst_number?.message} {...register('gst_number')} />
            <ERPInput label="PAN Number" error={errors.pan_number?.message} {...register('pan_number')} />
            <ERPInput label="Phone Number" error={errors.phone?.message} {...register('phone')} />
            <ERPInput label="Email Address" type="email" error={errors.email?.message} {...register('email')} />
            <div className="sm:col-span-2">
              <ERPInput label="Office Address" error={errors.address?.message} {...register('address')} />
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)} className="cursor-pointer">
              <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </Button>
            <Button type="submit" variant="primary" className="cursor-pointer">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Record
            </Button>
          </div>
        </form>
      </MasterModal>
    </>
  );
};
