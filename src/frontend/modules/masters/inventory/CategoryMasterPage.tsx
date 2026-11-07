import React from 'react';
import { LookupService } from '../../../services/api';
import { GenericMasterList } from '../shared/components/GenericMasterList';
import { MasterModal } from '../shared/components/MasterModal';
import { ERPInput } from '../shared/components/ERPInput';
import { Button } from '../../../components/Button';
import { X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSimpleMaster } from './hooks/useSimpleMaster';

const CategorySchema = z.object({
  name: z.string().min(1, 'Category Name is required')
});

type CategoryFormValues = z.infer<typeof CategorySchema>;

export const CategoryMasterPage: React.FC = () => {
  const {
    items, loading, modalOpen, editItem, canModify,
    handleAddClick, handleEditClick, handleCloseModal,
    handleDeleteClick, handleFormSubmit
  } = useSimpleMaster({
    fetchFn: (token) => LookupService.getCategories(token),
    createEndpoint: 'categories',
    updateEndpoint: 'categories',
    deleteEndpoint: 'categories',
    entityLabel: 'Category'
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema)
  });

  const onAddClick = () => {
    reset({ name: '' });
    handleAddClick();
  };

  const onEditClick = (item: { id: string; name: string }) => {
    reset({ name: item.name });
    handleEditClick(item as any);
  };

  return (
    <>
      <GenericMasterList
        title="Category Master"
        subtitle="Configure fabric groups dynamically"
        addButtonLabel="Add Category"
        tableHeaderLabel="Category Name"
        loading={loading}
        items={items}
        canModify={canModify}
        onAddClick={onAddClick}
        onEditClick={onEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <MasterModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editItem ? 'Edit Category' : 'New Category'}
      >
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4 text-xs">
          <div className="bg-white border border-slate-200/85 rounded-xl p-5 shadow-sm">
            <ERPInput
              label="Category Name"
              required
              placeholder="e.g. FINISH"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="cursor-pointer">
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
