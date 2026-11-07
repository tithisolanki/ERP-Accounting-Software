import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';

interface GridItem {
  categoryId: string;
  qualityId: string;
  descriptionId: string;
  descriptionName: string;
  hsnId: string;
  hsnCode: string;
  lotNumber: string;
  pcs: number;
  quantity: number;
  rate: number;
  gstPercentage: number;
  per: string;
  pieceMeters?: string;
}

interface ProductGridTableProps {
  items: GridItem[];
  qualities: any[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const ProductGridTable: React.FC<ProductGridTableProps> = ({
  items,
  qualities,
  onEdit,
  onDelete
}) => {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden select-none bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider select-none">
              <th className="px-4 py-3 border-r border-slate-100 text-center w-12">SRL</th>
              <th className="px-4 py-3 border-r border-slate-100 min-w-[150px]">QUALITY</th>
              <th className="px-4 py-3 border-r border-slate-100 min-w-[180px]">DESCRIPTION</th>
              <th className="px-4 py-3 border-r border-slate-100 min-w-[100px] text-center">HSN</th>
              <th className="px-4 py-3 border-r border-slate-100 text-right w-24">PCS</th>
              <th className="px-4 py-3 border-r border-slate-100 text-right w-24">METERS</th>
              <th className="px-4 py-3 border-r border-slate-100 text-right w-24">RATE</th>
              <th className="px-4 py-3 border-r border-slate-100 text-center w-20">PER</th>
              <th className="px-5 py-3 border-r border-slate-100 text-right w-32">AMOUNT</th>
              <th className="px-4 py-3 text-center w-28">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-slate-400 font-medium italic bg-white"
                >
                  No items added yet. Use the form above to add items.
                </td>
              </tr>
            ) : (
              items.map((item, index) => {
                const lineAmount = (item.quantity || 0) * (item.rate || 0);
                const qualityMatch = qualities.find(q => q.id === item.qualityId);
                const qualityName = qualityMatch ? qualityMatch.name : 'Unknown';

                return (
                  <tr
                    key={index}
                    className="hover:bg-slate-50/50 bg-white text-slate-800 transition-colors"
                  >
                    {/* Serial No */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-center select-none font-mono font-bold text-slate-400">
                      {index + 1}
                    </td>

                    {/* Quality */}
                    <td className="px-4 py-2.5 border-r border-slate-100 font-semibold text-slate-700">
                      {qualityName}
                    </td>

                    {/* Description */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-slate-700">
                      <div className="font-medium">{item.descriptionName}</div>
                      {item.pieceMeters && (
                        <div className="text-[11px] text-slate-450 font-mono mt-0.5" title="Piece-wise meters">
                          Pcs: {item.pieceMeters}
                        </div>
                      )}
                    </td>

                    {/* HSN */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-center font-mono text-slate-500">
                      {item.hsnCode}
                    </td>

                    {/* Pieces */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                      {item.pcs || 0}
                    </td>

                    {/* Meters (Qty) */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                      {(item.quantity || 0).toFixed(2)}
                    </td>

                    {/* Rate */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-right font-mono font-semibold text-slate-700">
                      {(item.rate || 0).toFixed(2)}
                    </td>

                    {/* Per */}
                    <td className="px-4 py-2.5 border-r border-slate-100 text-center text-slate-550 font-medium">
                      {item.per}
                    </td>

                    {/* Computed Row Amount */}
                    <td className="px-5 py-2.5 border-r border-slate-100 text-right font-mono font-bold text-slate-800">
                      {lineAmount > 0 ? lineAmount.toFixed(2) : '0.00'}
                    </td>

                    {/* Row Actions */}
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <div className="flex gap-3 justify-center items-center">
                        <button
                          type="button"
                          onClick={() => onEdit(index)}
                          title="Edit Item"
                          className="text-indigo-650 hover:text-indigo-850 transition-all cursor-pointer hover:scale-110 active:scale-95 p-1 hover:bg-indigo-50 rounded"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(index)}
                          title="Delete Item"
                          className="text-rose-600 hover:text-rose-800 transition-all cursor-pointer hover:scale-110 active:scale-95 p-1 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
