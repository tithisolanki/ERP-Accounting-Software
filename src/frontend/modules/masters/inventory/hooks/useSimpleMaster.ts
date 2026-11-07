import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../../store/useStore';
import { LookupService } from '../../../../services/api';

interface UseSimpleMasterOptions<T> {
  fetchFn: (token: string) => Promise<T[]>;
  createEndpoint: string;
  updateEndpoint: string;
  deleteEndpoint: string;
  entityLabel: string;
}

export function useSimpleMaster<T extends { id: string; name: string }>(
  options: UseSimpleMasterOptions<T>
) {
  const { fetchFn, createEndpoint, updateEndpoint, deleteEndpoint, entityLabel } = options;
  const { token, addNotification, user } = useStore();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);

  const canModify = user?.role !== 'USER';

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchFn(token);
      setItems(data);
    } catch (err: any) {
      addNotification('error', err.message || `Failed to fetch ${entityLabel} entries.`);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddClick = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEditClick = (item: T) => {
    setEditItem(item);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditItem(null);
  };

  const handleDeleteClick = async (id: string) => {
    if (!token) return;
    if (!canModify) {
      addNotification('error', 'Operators cannot modify master entries.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete this ${entityLabel}? This cannot be undone.`)) {
      return;
    }
    try {
      await LookupService.deleteGenericItem(deleteEndpoint, id, token);
      addNotification('success', `${entityLabel} deleted successfully.`);
      fetchItems();
    } catch (err: any) {
      addNotification('error', err.message || `Failed to delete ${entityLabel}.`);
    }
  };

  const handleFormSubmit = async (values: Record<string, unknown>) => {
    if (!token) return;
    try {
      if (editItem) {
        await LookupService.updateGenericItem(updateEndpoint, editItem.id, values, token);
        addNotification('success', `${entityLabel} updated successfully.`);
      } else {
        await LookupService.createGenericItem(createEndpoint, values, token);
        addNotification('success', `${entityLabel} created successfully.`);
      }
      handleCloseModal();
      fetchItems();
    } catch (err: any) {
      addNotification('error', err.message || `Failed to save ${entityLabel}.`);
    }
  };

  return {
    items,
    loading,
    modalOpen,
    editItem,
    canModify,
    handleAddClick,
    handleEditClick,
    handleCloseModal,
    handleDeleteClick,
    handleFormSubmit
  };
}
