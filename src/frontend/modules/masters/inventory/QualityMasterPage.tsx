import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { LookupService } from '../../../services/api';
import { Quality, Category } from '@shared/types';
import { Card } from '../../../components/Card';
import { Table } from '../../../components/Table';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { Plus, Edit2, X, Save } from 'lucide-react';
import { MasterModal } from '../shared/components/MasterModal';
import { ERPInput } from '../shared/components/ERPInput';
import { ERPSelect } from '../shared/components/ERPSelect';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const QualitySchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Quality Name is required')
});

type QualityFormValues = z.infer<typeof QualitySchema>;

export const QualityMasterPage: React.FC = () => {
  const { token, addNotification, user, confirm } = useStore();
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Quality | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<QualityFormValues>({
    resolver: zodResolver(QualitySchema)
  });

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [qualitiesData, categoriesData] = await Promise.all([
        LookupService.getQualities(token),
        LookupService.getCategories(token)
      ]);
      setQualities(qualitiesData);
      setCategories(categoriesData);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to fetch qualities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddClick = () => {
    setEditItem(null);
    reset({
      category_id: categories[0]?.id || '',
      name: ''
    });
    setModalOpen(true);
  };

  const handleEditClick = (item: Quality) => {
    setEditItem(item);
    reset({
      category_id: item.category_id,
      name: item.name
    });
    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (user?.role === 'USER') {
      addNotification('error', 'Standard users cannot modify master entries.');
      return;
    }
    if (!(await confirm({ message: 'Are you sure you want to delete this quality? This cannot be undone.', danger: true, confirmLabel: 'Delete' }))) {
      return;
    }
    try {
      await LookupService.deleteGenericItem('qualities', id, token);
      addNotification('success', 'Quality deleted successfully.');
      fetchData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete quality.');
    }
  };

  const handleFormSubmit = async (values: QualityFormValues) => {
    if (!token) return;
    try {
      if (editItem) {
        await LookupService.updateGenericItem('qualities', editItem.id, values, token);
        addNotification('success', 'Quality updated successfully.');
      } else {
        await LookupService.createGenericItem('qualities', values, token);
        addNotification('success', 'Quality created successfully.');
      }
      setModalOpen(false);
      setEditItem(null);
      fetchData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save quality.');
    }
  };

  const canModify = user?.role !== 'USER';

  return (
    <>
      <Card
        title="Quality Master"
        subtitle="Define fabric qualities under categories"
        headerAction={
          canModify && (
            <Button size="sm" onClick={handleAddClick} className="cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Quality
            </Button>
          )
        }
      >
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm font-semibold animate-pulse">
            Loading qualities...
          </div>
        ) : qualities.length > 0 ? (
          <Table headers={['Quality Name', 'Category', 'Status', 'Actions']}>
            {qualities.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-sm font-bold text-slate-700">{q.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500 font-bold">{q.category_name}</td>
                <td className="px-4 py-3 text-sm">
                  <Badge variant={q.is_active === 1 ? 'success' : 'slate'}>
                    {q.is_active === 1 ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleEditClick(q)} className="cursor-pointer">
                    <Edit2 className="w-3 h-3 mr-1 text-indigo-650 inline" /> Edit
                  </Button>
                  {canModify && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="!text-red-500 hover:!bg-red-50 cursor-pointer"
                      onClick={() => handleDeleteClick(q.id)}
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
            No qualities configured. Click 'Add Quality' to start.
          </div>
        )}
      </Card>

      <MasterModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? 'Edit Quality' : 'New Quality'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 text-xs">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm flex flex-col gap-4">
            <ERPSelect
              label="Category"
              required
              options={[
                { value: '', label: '-- Select Category --' },
                ...categories.map((c) => ({ value: c.id, label: c.name }))
              ]}
              error={errors.category_id?.message}
              {...register('category_id')}
            />
            <ERPInput
              label="Quality Name"
              required
              placeholder="e.g. SHIRTING"
              error={errors.name?.message}
              {...register('name')}
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
