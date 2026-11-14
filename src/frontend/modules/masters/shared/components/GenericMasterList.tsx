import React from 'react';
import { Card } from '../../../../components/Card';
import { Table } from '../../../../components/Table';
import { Button } from '../../../../components/Button';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface GenericMasterListProps {
  title: string;
  subtitle: string;
  addButtonLabel: string;
  tableHeaderLabel: string;
  loading: boolean;
  items: { id: string; name: string }[];
  canModify: boolean;
  onAddClick: () => void;
  onEditClick: (item: { id: string; name: string }) => void;
  onDeleteClick: (id: string) => void;
}

export const GenericMasterList: React.FC<GenericMasterListProps> = ({
  title,
  subtitle,
  addButtonLabel,
  tableHeaderLabel,
  loading,
  items,
  canModify,
  onAddClick,
  onEditClick,
  onDeleteClick,
}) => {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      headerAction={
        canModify && (
          <Button size="sm" onClick={onAddClick} className="cursor-pointer">
            <Plus className="w-3.5 h-3.5 mr-1" /> {addButtonLabel}
          </Button>
        )
      }
    >
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm font-semibold animate-pulse">
          Loading {title.toLowerCase()}...
        </div>
      ) : items.length > 0 ? (
        <Table headers={[tableHeaderLabel, 'Actions']} className="max-h-[500px]">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3 text-sm font-bold text-slate-700">{item.name}</td>
              <td className="px-4 py-3 text-sm flex gap-2">
                {canModify && (
                  <Button size="sm" variant="ghost" onClick={() => onEditClick(item)} className="cursor-pointer">
                    <Edit2 className="w-3.5 h-3.5 mr-1 text-indigo-650 inline" /> Edit
                  </Button>
                )}
                {canModify && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="!text-red-500 hover:!bg-red-50 cursor-pointer"
                    onClick={() => onDeleteClick(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1 inline" /> Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm">
          No entries found. Click {addButtonLabel} to start.
        </div>
      )}
    </Card>
  );
};
