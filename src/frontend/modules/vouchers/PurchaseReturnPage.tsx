import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { ItemEntryForm } from './components/ItemEntryForm';
import { ProductGridTable } from './components/ProductGridTable';
import { PieceMetersModal } from './components/PieceMetersModal';
import { AccountService, LookupService, AccVoucherService, PurchaseReturnService, OverReturnApiError } from '../../services/api';
import type { OutstandingBill } from '../../services/accvoucher.api';
import { API_URL } from '../../services/client';
import { Save, Printer, Trash2, Plus } from 'lucide-react';

const formatCurrency = (val: number) => (val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

const blankItem = (gst: number): GridItem => ({
  categoryId: '', qualityId: '', descriptionId: '', descriptionName: '', hsnId: '', hsnCode: '',
  lotNumber: '', pcs: 0, quantity: 0, rate: 0, gstPercentage: gst, per: 'Mtr', pieceMeters: ''
});

/**
 * Purchase Return (R3): AC_PLUS's "Purchase Return Entry" (Goods Debit Note), filed as a direct
 * sibling of Purchase Bill under Data Entry. Mirrors SalesReturnPage.tsx exactly, onto the
 * purchase side (Supplier/Against Purchase Bill in place of Customer/Against Sale Bill).
 */
export const PurchaseReturnPage: React.FC = () => {
  const { token, addNotification, financialYear, loginDate, confirm } = useStore();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [qualities, setQualities] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<any[]>([]);
  const [hsnMappings, setHsnMappings] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [savedReturns, setSavedReturns] = useState<any[]>([]);

  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(loginDate);
  const [supplierId, setSupplierId] = useState('');
  const [bills, setBills] = useState<OutstandingBill[]>([]);
  const [againstPurchaseId, setAgainstPurchaseId] = useState('');
  const [againstBillDate, setAgainstBillDate] = useState('');
  const [returnType, setReturnType] = useState<'Grey Return' | 'Finish Return'>('Finish Return');
  const [brokerName, setBrokerName] = useState('');
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [remark, setRemark] = useState('');

  const [items, setItems] = useState<GridItem[]>([]);
  const [currentItem, setCurrentItem] = useState<GridItem>(blankItem(5));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [gstSelect, setGstSelect] = useState(5);

  const [pieceModalOpen, setPieceModalOpen] = useState(false);
  const [activePieceIndex, setActivePieceIndex] = useState<number | null>(null);
  const [tempPieceText, setTempPieceText] = useState('');

  const [overageBalanceDue, setOverageBalanceDue] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    AccountService.getAll(token)
      .then((all: any[]) => setSuppliers(all.filter((a) => a.group_name === 'Sundry Creditors')))
      .catch(() => addNotification('error', 'Failed to load suppliers.'));
    LookupService.getCategories(token).then(setCategories).catch(() => {});
    LookupService.getQualities(token).then((q: any[]) => setQualities(q.filter((x: any) => x.is_active === 1))).catch(() => {});
    LookupService.getDropdownDescriptions(token).then(setDescriptions).catch(() => {});
    LookupService.getDropdownHsnCodes(token).then(setHsnMappings).catch(() => {});
    LookupService.getBrokers(token).then(setBrokers).catch(() => {});
    reloadReturns();
    fetchNextNumber();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reloadReturns = () => {
    if (!token) return;
    PurchaseReturnService.getAll(token).then(setSavedReturns).catch(() => addNotification('error', 'Failed to load purchase returns.'));
  };

  const fetchNextNumber = () => {
    if (!token) return;
    PurchaseReturnService.getNextNumber(token, financialYear)
      .then((d) => setReturnNo(String(d.nextNumber)))
      .catch(() => {});
  };

  useEffect(() => {
    if (!token || !supplierId) { setBills([]); return; }
    AccVoucherService.getOutstandingBills(supplierId, token)
      .then((rows) => setBills(rows.filter((b) => b.billType === 'purchase')))
      .catch(() => addNotification('error', 'Failed to load outstanding bills.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, supplierId]);

  const getActiveCategoryId = () => {
    const wantName = returnType === 'Grey Return' ? 'GREY' : 'FINISH';
    const match = categories.find((c) => c.name === wantName);
    return match ? match.id : '';
  };
  const activeCategoryId = getActiveCategoryId();

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    setAgainstPurchaseId('');
    setAgainstBillDate('');
  };

  const handleBillChange = (billId: string) => {
    setAgainstPurchaseId(billId);
    const bill = bills.find((b) => b.billId === billId);
    setAgainstBillDate(bill ? bill.date : '');
  };

  const openPieceModal = (index: number) => {
    setActivePieceIndex(index);
    setTempPieceText(index === -1 ? currentItem.pieceMeters || '' : items[index].pieceMeters || '');
    setPieceModalOpen(true);
  };

  const handleSavePieceMeters = (overrideText?: string) => {
    if (activePieceIndex === null) return;
    const textToUse = typeof overrideText === 'string' ? overrideText : tempPieceText;
    const numbers = textToUse.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    const totalPcs = numbers.length;
    const totalMeters = parseFloat(numbers.reduce((s, v) => s + v, 0).toFixed(2));
    const pieceMetersStr = numbers.map((n) => n.toFixed(2)).join(', ');

    if (activePieceIndex === -1) {
      setCurrentItem((prev) => ({ ...prev, pcs: totalPcs, quantity: totalMeters, pieceMeters: pieceMetersStr }));
    } else {
      const updated = [...items];
      updated[activePieceIndex].pcs = totalPcs;
      updated[activePieceIndex].quantity = totalMeters;
      updated[activePieceIndex].pieceMeters = pieceMetersStr;
      setItems(updated);
    }
    setPieceModalOpen(false);
    setActivePieceIndex(null);
  };

  const handleAddOrUpdateItem = () => {
    if (!currentItem.qualityId) { addNotification('error', 'Please select a Quality.'); return; }
    if (!currentItem.descriptionName?.trim()) { addNotification('error', 'Please enter a Description.'); return; }
    if (!currentItem.hsnCode?.trim()) { addNotification('error', 'Please enter an HSN Code.'); return; }

    const itemToSave = { ...currentItem, categoryId: activeCategoryId };
    if (editingIndex === null) {
      setItems([...items, itemToSave]);
    } else {
      const updated = [...items];
      updated[editingIndex] = itemToSave;
      setItems(updated);
      setEditingIndex(null);
    }
    setCurrentItem(blankItem(gstSelect));
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setCurrentItem(blankItem(gstSelect));
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setCurrentItem(items[index]);
  };

  const handleDeleteItem = async (index: number) => {
    if (await confirm({ message: 'Are you sure you want to delete this item?', danger: true, confirmLabel: 'Delete' })) {
      setItems(items.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setEditingIndex(null);
        setCurrentItem(blankItem(gstSelect));
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  const handleNew = () => {
    setReturnDate(loginDate);
    setSupplierId('');
    setBills([]);
    setAgainstPurchaseId('');
    setAgainstBillDate('');
    setReturnType('Finish Return');
    setBrokerName('');
    setChallanNo('');
    setChallanDate('');
    setLrNo('');
    setLrDate('');
    setRemark('');
    setItems([]);
    setEditingIndex(null);
    setGstSelect(5);
    setCurrentItem(blankItem(5));
    fetchNextNumber();
  };

  const buildPayload = (confirmOverage: boolean) => ({
    returnNumber: returnNo,
    date: returnDate,
    supplierId,
    financialYear,
    againstPurchaseId,
    againstBillDate,
    returnType,
    brokerName: brokerName || undefined,
    challanNumber: challanNo || undefined,
    challanDate: challanDate || undefined,
    lrNumber: lrNo || undefined,
    lrDate: lrDate || undefined,
    remark: remark || undefined,
    confirmOverage,
    items: items.map((item) => ({
      categoryId: activeCategoryId,
      qualityId: item.qualityId,
      descriptionId: item.descriptionId || null,
      descriptionName: item.descriptionName,
      hsnId: item.hsnId || null,
      hsnCode: item.hsnCode,
      pcs: item.pcs,
      meters: item.quantity,
      rate: item.rate,
      gstPercentage: item.gstPercentage
    }))
  });

  const handleSave = async (confirmOverage = false) => {
    if (!token) return;
    try {
      await PurchaseReturnService.create(buildPayload(confirmOverage), token);
      addNotification('success', `Purchase Return No. ${returnNo} saved.`);
      setOverageBalanceDue(null);
      handleNew();
      reloadReturns();
    } catch (err: any) {
      if (err instanceof OverReturnApiError) {
        setOverageBalanceDue(err.balanceDue);
        return;
      }
      addNotification('error', err.message || 'Failed to save purchase return.');
    }
  };

  const handleDelete = async (id: string, returnNumber: number) => {
    if (!token) return;
    const ok = await confirm({ message: `Delete Purchase Return No. ${returnNumber}? This cannot be undone.`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await PurchaseReturnService.delete(id, token);
      addNotification('success', `Purchase Return No. ${returnNumber} deleted.`);
      reloadReturns();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to delete purchase return.');
    }
  };

  const handlePrint = (id: string) => {
    if (!token) return;
    window.open(`${API_URL}/api/reports/purchase-return-pdf/${id}?token=${token}`, '_blank');
  };

  const validationReason = !supplierId ? 'Select a Supplier first.'
    : !activeCategoryId ? 'Return Type category is not configured -- check the Categories master.'
    : !returnNo ? 'Return No. is required.'
    : !againstPurchaseId ? 'Select the bill this return is against.'
    : items.length === 0 ? 'Add at least one item row.'
    : items.some((item) => !item.qualityId || !item.descriptionName?.trim() || !item.hsnCode?.trim())
      ? 'Every item row needs a Quality, Description and HSN Code.'
      : null;

  // Mirrors the backend's calculateItemTotals (taxable + taxable*gst%/100) so this figure --
  // shown here and in the over-return confirm dialog -- matches what's actually compared
  // against the bill's balanceDue server-side.
  const totalAmount = items.reduce((sum, item) => {
    const taxable = (item.quantity || 0) * (item.rate || 0);
    return sum + taxable + (taxable * (item.gstPercentage || 0)) / 100;
  }, 0);

  return (
    <div className="flex flex-col gap-5 select-none text-xs max-w-6xl">
      <Card title="Purchase Return Entry" subtitle="Goods Debit Note -- record goods sent back to a supplier against a purchase bill">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Return No.</label>
              <input type="text" value={returnNo} onChange={(e) => setReturnNo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Return Date</label>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Supplier</label>
              <select value={supplierId} onChange={(e) => handleSupplierChange(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer">
                <option value="">-- Select Supplier --</option>
                {suppliers.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Against (Purchase) Bill No.</label>
              <select value={againstPurchaseId} onChange={(e) => handleBillChange(e.target.value)} disabled={!supplierId}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold text-slate-800 h-8 text-xs cursor-pointer disabled:bg-slate-100 disabled:text-slate-400">
                <option value="">-- Select Bill --</option>
                {bills.map((b) => (
                  <option key={b.billId} value={b.billId}>
                    {b.billNumber} ({b.date}) -- Due {formatCurrency(b.balanceDue)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Bill Date</label>
              <input type="text" value={againstBillDate} disabled
                className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg outline-none text-slate-500 font-bold h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5 border border-slate-200 p-2 rounded-lg bg-white justify-center h-14">
              <span className="font-bold text-slate-500 text-[11px] uppercase tracking-wider mb-1 leading-none">Return Type</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="radio" name="returnType" checked={returnType === 'Grey Return'} onChange={() => setReturnType('Grey Return')} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Grey</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="radio" name="returnType" checked={returnType === 'Finish Return'} onChange={() => setReturnType('Finish Return')} className="w-3.5 h-3.5 accent-indigo-650 cursor-pointer" />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700">Finish</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Broker</label>
              <input type="text" list="return-brokers-datalist" value={brokerName} onChange={(e) => setBrokerName(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs" />
              <datalist id="return-brokers-datalist">
                {brokers.map((b) => <option key={b.id} value={b.name} />)}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Challan No.</label>
              <input type="text" value={challanNo} onChange={(e) => setChallanNo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">Challan Date</label>
              <input type="date" value={challanDate} onChange={(e) => setChallanDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">LR No.</label>
              <input type="text" value={lrNo} onChange={(e) => setLrNo(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase font-bold text-slate-500">LR Date</label>
              <input type="date" value={lrDate} onChange={(e) => setLrDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs cursor-pointer" />
            </div>
          </div>

          <ItemEntryForm
            currentItem={currentItem}
            setCurrentItem={setCurrentItem}
            editingIndex={editingIndex}
            onAddOrUpdate={handleAddOrUpdateItem}
            onCancelEdit={handleCancelEdit}
            qualities={qualities}
            descriptions={descriptions}
            hsnMappings={hsnMappings}
            activeCategoryId={activeCategoryId}
            openPieceModal={openPieceModal}
            setGstSelect={setGstSelect}
            isFirstItem={items.length === 0 || editingIndex === 0}
            mode="new"
          />

          <ProductGridTable items={items} qualities={qualities} onEdit={handleEditItem} onDelete={handleDeleteItem} />

          <div className="flex justify-end text-xs font-bold text-slate-700 -mt-2">
            Total Return Amount: <span className="ml-2 text-indigo-650 font-mono">{formatCurrency(totalAmount)}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase font-bold text-slate-500">Remark</label>
            <input type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-semibold text-slate-800 h-8 text-xs" />
          </div>

          <div className="flex justify-between items-center gap-3 border-t border-slate-100 pt-4 mt-2">
            <span className="text-rose-600 font-semibold">{validationReason}</span>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleNew} className="font-bold cursor-pointer">
                <Plus className="w-4 h-4 mr-1.5" /> New
              </Button>
              <Button type="button" variant="primary" onClick={() => handleSave(false)} disabled={!!validationReason} className="font-bold cursor-pointer">
                <Save className="w-4 h-4 mr-1.5" /> Save Purchase Return
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Saved Purchase Returns">
        <Table headers={['Return No.', 'Date', 'Supplier', 'Type', 'Amount', '']}>
          {savedReturns.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2 font-bold text-indigo-650">{r.return_number}</td>
              <td className="px-4 py-2">{r.date}</td>
              <td className="px-4 py-2">{r.supplier_name}</td>
              <td className="px-4 py-2">{r.return_type}</td>
              <td className="px-4 py-2">{formatCurrency(r.total_amount)}</td>
              <td className="px-4 py-2 text-right">
                <button onClick={() => handlePrint(r.id)} title="Print Goods Debit Note" className="w-7 h-7 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 inline-flex items-center justify-center cursor-pointer mr-1">
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(r.id, r.return_number)} title="Delete" className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 inline-flex items-center justify-center cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <PieceMetersModal
        isOpen={pieceModalOpen}
        onClose={() => { setPieceModalOpen(false); setActivePieceIndex(null); }}
        tempPieceText={tempPieceText}
        setTempPieceText={setTempPieceText}
        mode="new"
        handleSavePieceMeters={handleSavePieceMeters}
      />

      <Modal isOpen={overageBalanceDue !== null} onClose={() => setOverageBalanceDue(null)} title="Confirm Over-Return" size="sm">
        {overageBalanceDue !== null && (
          <div className="flex flex-col gap-4 text-xs">
            <p className="font-semibold text-slate-700">
              This return's total ({formatCurrency(totalAmount)}) exceeds the bill's remaining balance of{' '}
              <span className="font-bold text-rose-650">{formatCurrency(overageBalanceDue)}</span>. Continue anyway?
            </p>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setOverageBalanceDue(null)} className="font-bold cursor-pointer">Cancel</Button>
              <Button type="button" variant="primary" onClick={() => handleSave(true)} className="font-bold cursor-pointer">Confirm &amp; Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
