import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { LookupService } from '../../../services/api';
import { HsnCode } from '@shared/types';
import { Card } from '../../../components/Card';
import { Table } from '../../../components/Table';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Plus, Edit2, X, Save } from 'lucide-react';
import { MasterModal } from '../shared/components/MasterModal';
import { ERPInput } from '../shared/components/ERPInput';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const HsnSchema = z.object({
  hsn_code: z.coerce.number().min(1, 'HSN Code is required'),
  gst_percentage: z.coerce.number().min(0, 'GST Percentage must be 0 or positive')
});

type HsnFormValues = z.infer<typeof HsnSchema>;

export const HSNMasterPage: React.FC = () => {
  const { token, addNotification, user } = useStore();
  const [hsnCodes, setHsnCodes] = useState<HsnCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<HsnCode | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof HsnSchema>, any, HsnFormValues>({
    resolver: zodResolver(HsnSchema)
  });

  const fetchHsnCodes = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await LookupService.getHsnCodes(token);
      setHsnCodes(data);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to fetch HSN codes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHsnCodes();
  }, [token]);

  const handleAddClick = () => {
    setEditItem(null);
    reset({
      hsn_code: 0,
      gst_percentage: 5
    });
    setModalOpen(true);
  };

  const handleEditClick = (item: HsnCode) => {
    setEditItem(item);
    reset({
      hsn_code: item.hsn_code,
      gst_percentage: item.gst_percentage
    });
    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (user?.role === 'USER') {
      addNotification('error', 'Standard users cannot modify master entries.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this HSN mapping? This cannot be undone.')) {
      return;
    }
    try {
      await LookupService.deleteGenericItem('hsn-codes', id, token);
      addNotification('success', 'HSN mapping deleted successfully.');
      fetchHsnCodes();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete HSN mapping.');
    }
  };

  const handleFormSubmit = async (values: HsnFormValues) => {
    if (!token) return;
    try {
      if (editItem) {
        await LookupService.updateGenericItem('hsn-codes', editItem.id, values, token);
        addNotification('success', 'HSN mapping updated successfully.');
      } else {
        await LookupService.createGenericItem('hsn-codes', values, token);
        addNotification('success', 'HSN mapping created successfully.');
      }
      setModalOpen(false);
      setEditItem(null);
      fetchHsnCodes();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save HSN mapping.');
    }
  };

  const canModify = user?.role !== 'USER';

  return (
    <>
      <Card
        title="HSN Code Master"
        subtitle="Define independent HSN codes and GST percentages"
        headerAction={
          canModify && (
            <Button size="sm" onClick={handleAddClick} className="cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add HSN Code
            </Button>
          )
        }
      >
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold animate-pulse">
            Loading HSN codes...
          </div>
        ) : hsnCodes.length > 0 ? (
          <Table headers={['HSN Code', 'GST %', 'Status', 'Actions']}>
            {hsnCodes.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-mono text-slate-700">{m.hsn_code}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-700">{m.gst_percentage}%</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={m.is_active === 1 ? 'success' : 'slate'}>
                    {m.is_active === 1 ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditClick(m)} className="cursor-pointer">
                    <Edit2 className="w-3 h-3 mr-1 text-indigo-650 inline" /> Edit
                  </Button>
                  {canModify && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="!text-red-500 hover:!bg-red-50 cursor-pointer"
                      onClick={() => handleDeleteClick(m.id)}
                    >
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="py-20 text-center text-slate-400 text-sm">
            No HSN codes configured. Click 'Add HSN Code' to start.
          </div>
        )}
      </Card>

      <MasterModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit HSN Code' : 'New HSN Code'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 text-xs">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <ERPInput
              label="HSN Code"
              required
              type="number"
              placeholder="e.g. 5407"
              error={errors.hsn_code?.message}
              {...register('hsn_code')}
            />
            <ERPInput
              label="GST Percentage (%)"
              required
              type="number"
              step="0.01"
              placeholder="e.g. 5.0"
              error={errors.gst_percentage?.message}
              {...register('gst_percentage')}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="cursor-pointer">
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
