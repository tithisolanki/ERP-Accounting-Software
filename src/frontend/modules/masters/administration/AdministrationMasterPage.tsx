import React, { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { LookupService } from '../../../services/api';
import { StandardMasterItem } from '@shared/types';
import { GenericMasterList } from '../shared/components/GenericMasterList';
import { MasterModal } from '../shared/components/MasterModal';
import { ERPInput } from '../shared/components/ERPInput';
import { Button } from '../../../components/Button';
import { X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface AdministrationMasterPageProps {
  activeTab: 'brokers' | 'cities' | 'states' | 'transports' | 'journal-voucher-types';
}

const AdminItemSchema = z.object({
  name: z.string().min(1, 'Name is required')
});

type AdminItemFormValues = z.infer<typeof AdminItemSchema>;

export const AdministrationMasterPage: React.FC<AdministrationMasterPageProps> = ({
  activeTab
}) => {
  const { token, addNotification, user, confirm } = useStore();
  const [items, setItems] = useState<StandardMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<StandardMasterItem | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AdminItemFormValues>({
    resolver: zodResolver(AdminItemSchema)
  });

  const getLabels = () => {
    switch (activeTab) {
      case 'brokers':
        return { title: 'Broker Master', cleanLabel: 'Broker', placeholder: 'e.g. SELF / broker name' };
      case 'cities':
        return { title: 'City Master', cleanLabel: 'City', placeholder: 'e.g. ERODE' };
      case 'states':
        return { title: 'State Master', cleanLabel: 'State', placeholder: 'e.g. TAMIL NADU' };
      case 'transports':
        return { title: 'Transport Master', cleanLabel: 'Transport', placeholder: 'e.g. VRL Logistics' };
      case 'journal-voucher-types':
        return { title: 'Journal Voucher Type Master', cleanLabel: 'Journal Voucher Type', placeholder: 'e.g. GST adjustment' };
      default:
        return { title: 'Master', cleanLabel: 'Master', placeholder: '' };
    }
  };

  const labels = getLabels();

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await LookupService.getGenericItems(activeTab, token);
      setItems(data);
    } catch (err: any) {
      addNotification('error', err.message || `Failed to fetch items from ${activeTab}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [token, activeTab]);

  const handleAddClick = () => {
    setEditItem(null);
    reset({ name: '' });
    setModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditItem(item);
    reset({ name: item.name });
    setModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (user?.role === 'USER') {
      addNotification('error', 'Standard users cannot modify master entries.');
      return;
    }
    if (!(await confirm({ message: `Are you sure you want to delete this ${labels.cleanLabel.toLowerCase()}? This cannot be undone.`, danger: true, confirmLabel: 'Delete' }))) {
      return;
    }
    try {
      await LookupService.deleteGenericItem(activeTab, id, token);
      addNotification('success', `${labels.cleanLabel} deleted successfully.`);
      fetchItems();
    } catch (err: any) {
      addNotification('error', err.message || `Failed to delete ${labels.cleanLabel.toLowerCase()}.`);
    }
  };

  const handleFormSubmit = async (values: AdminItemFormValues) => {
    if (!token) return;
    try {
      if (editItem) {
        await LookupService.updateGenericItem(activeTab, editItem.id, values, token);
        addNotification('success', `${labels.cleanLabel} updated successfully.`);
      } else {
        await LookupService.createGenericItem(activeTab, values, token);
        addNotification('success', `${labels.cleanLabel} created successfully.`);
      }
      setModalOpen(false);
      setEditItem(null);
      fetchItems();
    } catch (err: any) {
      addNotification('error', err.message || `Failed to save ${labels.cleanLabel.toLowerCase()}.`);
    }
  };

  const canModify = user?.role !== 'USER';

  return (
    <>
      <GenericMasterList
        title={labels.title}
        subtitle="Configure options dynamically for transactions selection"
        addButtonLabel={`Add ${labels.cleanLabel}`}
        tableHeaderLabel="Name"
        loading={loading}
        items={items}
        canModify={canModify}
        onAddClick={handleAddClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <MasterModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditItem(null);
        }}
        title={editItem ? `Edit ${labels.cleanLabel}` : `New ${labels.cleanLabel}`}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 text-xs">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm">
            <ERPInput
              label={`${labels.cleanLabel} Name`}
              required
              placeholder={labels.placeholder}
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
