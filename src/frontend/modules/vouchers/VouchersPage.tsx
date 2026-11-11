import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { VoucherHeaders } from './components/VoucherHeaders';
import { ItemEntryForm } from './components/ItemEntryForm';
import { ProductGridTable } from './components/ProductGridTable';
import { VoucherTotals } from './components/VoucherTotals';
import { RecentSearchModal } from './components/RecentSearchModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { PieceMetersModal } from './components/PieceMetersModal';
import { LookupService, TransactionsService, AccountService } from '../../services/api';
import { Plus, Save, X, Edit3, Trash2, Search, Printer, LogOut, FileText, ClipboardList, ShoppingCart } from 'lucide-react';

export const Vouchers: React.FC<{ initialType?: 'purchase' | 'sale' | 'challan' }> = ({ initialType = 'challan' }) => {
  const { token, addNotification, financialYear, loginDate } = useStore();
  const [activeType, setActiveType] = useState<'purchase' | 'sale' | 'challan'>(initialType);

  // Vouchers mode: 'new' | 'view' | 'edit'
  const [mode, setMode] = useState<'new' | 'view' | 'edit'>('new');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Masters lists
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [qualities, setQualities] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<any[]>([]);
  const [hsnMappings, setHsnMappings] = useState<any[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [transports, setTransports] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Modals state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [pieceModalOpen, setPieceModalOpen] = useState(false);
  const [activePieceIndex, setActivePieceIndex] = useState<number | null>(null);
  const [tempPieceText, setTempPieceText] = useState('');

  // FORM STATES (Header & Totals)
  const [docNumber, setDocNumber] = useState('');
  const [docDate, setDocDate] = useState(loginDate);
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState(loginDate);
  const [creditDays, setCreditDays] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [baleNo, setBaleNo] = useState('565*5');
  const [orderNo, setOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState(loginDate);
  const [salesType, setSalesType] = useState('Finish Sales');
  const [purchaseType, setPurchaseType] = useState('Finish Purchase');
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState(loginDate);
  const [transport, setTransport] = useState('');
  const [deliveryAt, setDeliveryAt] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [remark, setRemark] = useState('');
  const [creditAccount, setCreditAccount] = useState('SALES');
  const [creditAccountsList, setCreditAccountsList] = useState<string[]>([]);
  const [debitAccount, setDebitAccount] = useState('PURCHASES');
  const [lotNumber, setLotNumber] = useState<string | number>('');
  const [addLotNumber, setAddLotNumber] = useState(false);

  // Items Grid
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
  const [items, setItems] = useState<GridItem[]>([]);
  const [currentItem, setCurrentItem] = useState<GridItem>({
    categoryId: '',
    qualityId: '',
    descriptionId: '',
    descriptionName: '',
    hsnId: '',
    hsnCode: '',
    lotNumber: '',
    pcs: 0,
    quantity: 0,
    rate: 0,
    gstPercentage: 5,
    per: 'Mtr',
    pieceMeters: ''
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Bottom totals state
  const [cartage, setCartage] = useState(0);
  const [postage, setPostage] = useState(0);
  const [lessValue, setLessValue] = useState(0);
  const [addValue, setAddValue] = useState(0);
  const [gstSelect, setGstSelect] = useState(5);

  // PDF Preview
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [printId, setPrintId] = useState<string | null>(null);
  const [selectedCopies, setSelectedCopies] = useState<string[]>(['original', 'duplicate', 'triplicate', 'quadruplicate']);

  // Purchase entry_no
  const [entryNo, setEntryNo] = useState('');

  // Sync type from tab header
  useEffect(() => {
    if (initialType) {
      setActiveType(initialType);
      handleNew();
    }
  }, [initialType]);

  // Load masters on load
  useEffect(() => {
    fetchMasters();
  }, [activeType]);

  useEffect(() => {
  if (mode === 'new') {
    setBaleNo('565*5');
  }
}, [mode]);

  // Auto-fetch Delivery Challan details if an invoice number matches a saved Challan
  useEffect(() => {
    if (activeType !== 'sale' || mode !== 'new' || !docNumber) return;

    const autoFetchLinkedChallan = async () => {
      try {
        const data = await TransactionsService.findChallanByNumber(docNumber, token!, financialYear) as Record<string, unknown> & {
          items: Record<string, unknown>[];
          challan_number: string;
          date: string;
          broker_name?: string;
          bale_number?: string;
          order_number?: string;
          order_date?: string;
          sales_type?: string;
          lr_number?: string;
          lr_date?: string;
          transport?: string;
          delivery_at?: string;
          vehicle_number?: string;
          remark?: string;
          customer_id: string;
        };
        if (data) {
          // Populate the Sales Invoice form automatically
          setChallanNo(data.challan_number);
          setChallanDate(data.date);
          setBrokerName(data.broker_name || '');
          setBaleNo(data.bale_number || '');
          setOrderNo(data.order_number || '');
          setOrderDate(data.order_date || '');
          setSalesType(data.sales_type || 'Finish Sales');
          setLrNo(data.lr_number || '');
          setLrDate(data.lr_date || '');
          setTransport(data.transport || '');
          setDeliveryAt(data.delivery_at || '');
          setVehicleNo(data.vehicle_number || '');
          setRemark(data.remark || '');
          setSelectedAccountId(data.customer_id);

          const mappedItems: GridItem[] = data.items.map((item: any) => ({
            categoryId: item.category_id,
            qualityId: item.quality_id,
            descriptionId: item.description_id,
            descriptionName: item.description_name || '',
            hsnId: item.hsn_id,
            hsnCode: item.hsn_code ? String(item.hsn_code) : '',
            lotNumber: String(item.lot_number || ''),
            pcs: item.pcs || 0,
            quantity: item.meters || item.quantity || 0,
            rate: item.rate,
            gstPercentage: item.gst_percentage,
            per: item.per || 'Mtr',
            pieceMeters: item.piece_meters || ''
          }));
          setItems(mappedItems);
          if (data.items.length) {
            setGstSelect(Number(data.items[0].gst_percentage) || 0);
          }
          addNotification('info', `Automatically fetched details from linked Delivery Challan No. ${docNumber}`);
        }
      } catch (err) {
        console.error('Auto-fetch challan failed:', err);
      }
    };

    autoFetchLinkedChallan();
  }, [docNumber, activeType, mode]);

  const fetchCreditAccounts = async () => {
    if (!token) return;
    try {
      setCreditAccountsList(await TransactionsService.getSalesCreditAccounts(token));
    } catch (err) {
      console.error('Failed to fetch credit accounts:', err);
    }
  };

  const fetchMasters = async () => {
    if (!token) return;
    try {
      const [pData, catData, qualData, descData, hsnData, bData, tData, cData] = await Promise.all([
        AccountService.getAll(token),
        LookupService.getCategories(token),
        LookupService.getQualities(token),
        LookupService.getDropdownDescriptions(token),
        LookupService.getDropdownHsnCodes(token),
        LookupService.getBrokers(token),
        LookupService.getTransports(token),
        LookupService.getCities(token)
      ]);

      setAccounts(pData);
      setCategories(catData);
      setQualities(qualData.filter((q: any) => q.is_active === 1));
      setDescriptions(descData);
      setHsnMappings(hsnData);
      setBrokers(bData);
      setTransports(tData);
      setCities(cData);

      const filtered = pData.filter((p: any) => {
        if (activeType === 'purchase') return p.group_name === 'Sundry Creditors';
        if (activeType === 'sale' || activeType === 'challan') return p.group_name === 'Sundry Debtors';
        return true;
      });

      if (filtered.length > 0) {
        setSelectedAccountId(filtered[0].id);
        if (mode === 'new') {
          setDeliveryAt(filtered[0].name);
        }
      } else {
        setSelectedAccountId('');
        if (mode === 'new') {
          setDeliveryAt('');
        }
      }

      if (mode === 'new') {
        if (bData.length > 0) setBrokerName(bData[0].name);
        if (tData.length > 0) setTransport(tData[0].name);
      }
      
      fetchCreditAccounts();
      fetchNextNumber();
    } catch (err: any) {
      addNotification('error', err.message);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedAccountId(accountId);
    if (mode !== 'view') {
      const selectedAccount = accounts.find(a => a.id === accountId);
      if (selectedAccount) {
        setDeliveryAt(selectedAccount.name);
      }
    }
  };

  const fetchNextNumber = async () => {
    if (activeType !== 'sale' && activeType !== 'purchase' && activeType !== 'challan') return;
    try {


      const data = await TransactionsService.getNextNumber(activeType, token!, financialYear);
      setDocNumber(String(data.nextNumber));
    } catch (err) {
      console.error('Failed to load next number:', err);
    }
  };

  const handleEnquiry = async () => {
    if (!docNumber) {
      alert('Please enter a document number to query.');
      return;
    }

    try {


      const data = await TransactionsService.findByNumber(activeType, docNumber, token!, financialYear);
      loadVoucherIntoForm(data);
      addNotification('success', `${activeType.toUpperCase()} voucher ${docNumber} loaded.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const loadVoucherIntoForm = (data: any) => {
    setActiveId(data.id);
    setMode('view');
    setDocDate(data.date);

    if (activeType === 'sale') {
      setDocNumber(data.invoice_number);
      setChallanNo(data.challan_number || '');
      setChallanDate(data.challan_date || '');
      setCreditDays(data.credit_days || 0);
      setSelectedAccountId(data.customer_id);
      setBrokerName(data.broker_name || '');
      setBaleNo(data.bale_number || '');
      setOrderNo(data.order_number || '');
      setOrderDate(data.order_date || '');
      setSalesType(data.sales_type || 'Finish Sales');
      setLrNo(data.lr_number || '');
      setLrDate(data.lr_date || '');
      setTransport(data.transport || '');
      setDeliveryAt(data.delivery_at || '');
      setVehicleNo(data.vehicle_number || '');
      setRemark(data.remark || '');
      setCreditAccount(data.credit_account || 'SALES');
      setCartage(data.cartage || 0);
      setPostage(data.postage || 0);
      setLessValue(data.less || 0);
      setAddValue(data.less_add || 0);
    } else if (activeType === 'challan') {
      setDocNumber(data.challan_number);
      setSelectedAccountId(data.customer_id);
      setBrokerName(data.broker_name || '');
      setBaleNo(data.bale_number || '');
      setOrderNo(data.order_number || '');
      setOrderDate(data.order_date || '');
      setSalesType(data.sales_type || 'Finish Sales');
      setLrNo(data.lr_number || '');
      setLrDate(data.lr_date || '');
      setTransport(data.transport || '');
      setDeliveryAt(data.delivery_at || '');
      setVehicleNo(data.vehicle_number || '');
      setRemark(data.remark || '');
      setAddValue(data.rounded_off || 0);
    } else {
      setDocNumber(data.purchase_number);
      setEntryNo(data.entry_no || '');
      setCreditDays(data.credit_days || 0);
      setSelectedAccountId(data.supplier_id);
      setBrokerName(data.broker_name || '');
      setChallanNo(data.challan_number || '');
      setChallanDate(data.challan_date || '');
      setPurchaseType(data.purchase_type || 'Finish Purchase');
      setLrNo(data.lr_number || '');
      setLrDate(data.lr_date || '');
      setTransport(data.transport || '');
      setRemark(data.remark || '');
      setDebitAccount(data.debit_account || 'PURCHASES');
      setAddValue(data.add_value || 0);
      setLessValue(data.less_value || 0);
      setLotNumber(data.lot_number || '');
      setAddLotNumber(!!data.lot_number);
    }

    const mappedItems: GridItem[] = data.items.map((item: any) => ({
      categoryId: item.category_id,
      qualityId: item.quality_id,
      descriptionId: item.description_id,
      descriptionName: item.description_name || '',
      hsnId: item.hsn_id,
      hsnCode: item.hsn_code ? String(item.hsn_code) : '',
      lotNumber: String(item.lot_number || ''),
      pcs: item.pcs || 0,
      quantity: item.meters || item.quantity || 0,
      rate: item.rate,
      gstPercentage: item.gst_percentage || 0 ,
      per: item.per || 'Mtr',
      pieceMeters: item.piece_meters || ''
    }));
    setItems(mappedItems);
    
    if (data.items.length) {
      setGstSelect(data.items[0].gst_percentage || 0);
    }
  };

  const openPieceModal = (index: number) => {
    setActivePieceIndex(index);
    if (index === -1) {
      setTempPieceText(currentItem.pieceMeters || '');
    } else {
      setTempPieceText(items[index].pieceMeters || '');
    }
    setPieceModalOpen(true);
  };

  const handleSavePieceMeters = (overrideText?: string) => {
    if (activePieceIndex === null) return;
    const textToUse = typeof overrideText === 'string' ? overrideText : tempPieceText;
    const numbers = textToUse
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n) && n > 0);
    const totalPcs = numbers.length;
    const totalMeters = parseFloat(numbers.reduce((s, v) => s + v, 0).toFixed(2));
    const pieceMetersStr = numbers.map(n => n.toFixed(2)).join(', ');

    if (activePieceIndex === -1) {
      setCurrentItem(prev => ({
        ...prev,
        pcs: totalPcs,
        quantity: totalMeters,
        pieceMeters: pieceMetersStr
      }));
    } else {
      const updated = [...items];
      updated[activePieceIndex].pcs = totalPcs;
      updated[activePieceIndex].quantity = totalMeters;
      updated[activePieceIndex].pieceMeters = pieceMetersStr;
      setItems(updated);
    }
    
    setPieceModalOpen(false);
    setActivePieceIndex(null);
    addNotification('info', `Meters set: ${totalPcs} pieces, Total ${totalMeters} Mtr.`);
  };

  const handleFetchChallan = async () => {
    if (!challanNo) {
      alert('Please enter a Challan number to fetch.');
      return;
    }
    try {
      const data = await TransactionsService.findChallanByNumber(challanNo, token!, financialYear) as Record<string, unknown> & {
        items: Record<string, unknown>[];
        date: string;
        broker_name?: string;
        bale_number?: string;
        order_number?: string;
        order_date?: string;
        sales_type?: string;
        lr_number?: string;
        lr_date?: string;
        transport?: string;
        delivery_at?: string;
        vehicle_number?: string;
        remark?: string;
        customer_id: string;
        challan_number: string;
      };
      setChallanDate(data.date);
      setBrokerName(data.broker_name || '');
      setBaleNo(data.bale_number || '');
      setOrderNo(data.order_number || '');
      setOrderDate(data.order_date || '');
      setSalesType(data.sales_type || 'Finish Sales');
      setLrNo(data.lr_number || '');
      setLrDate(data.lr_date || '');
      setTransport(data.transport || '');
      setDeliveryAt(data.delivery_at || '');
      setVehicleNo(data.vehicle_number || '');
      setRemark(data.remark || '');
      setSelectedAccountId(data.customer_id);
      setDocNumber(data.challan_number);

      const mappedItems: GridItem[] = data.items.map((item: any) => ({
        categoryId: item.category_id,
        qualityId: item.quality_id,
        descriptionId: item.description_id,
        descriptionName: item.description_name || '',
        hsnId: item.hsn_id,
        hsnCode: item.hsn_code ? String(item.hsn_code) : '',
        lotNumber: String(item.lot_number || ''),
        pcs: item.pcs || 0,
        quantity: item.meters || item.quantity || 0,
        rate: item.rate,
        gstPercentage: item.gst_percentage,
        per: item.per || 'Mtr',
        pieceMeters: item.piece_meters || ''
      }));
      setItems(mappedItems);
      if (data.items.length) {
        setGstSelect(Number(data.items[0].gst_percentage) || 0);
      }
      addNotification('success', `Details for Challan No. ${challanNo} successfully fetched!`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddOrUpdateItem = () => {
    if (!currentItem.qualityId) {
      alert('Please select a Quality.');
      return;
    }
    if (!currentItem.descriptionName?.trim()) {
      alert('Please enter a Description.');
      return;
    }
    if (!currentItem.hsnCode?.trim()) {
      alert('Please enter an HSN Code.');
      return;
    }

    const activeCategoryId = getActiveCategoryId();
    const itemToSave = {
      ...currentItem,
      categoryId: activeCategoryId
    };

    if (editingIndex === null) {
      setItems([...items, itemToSave]);
    } else {
      const updated = [...items];
      updated[editingIndex] = itemToSave;
      setItems(updated);
      setEditingIndex(null);
    }

    // Reset form
    setCurrentItem({
      categoryId: activeCategoryId,
      qualityId: '',
      descriptionId: '',
      descriptionName: '',
      hsnId: '',
      hsnCode: '',
      lotNumber: '',
      pcs: 0,
      quantity: 0,
      rate: 0,
      gstPercentage: gstSelect,
      per: 'Mtr',
      pieceMeters: ''
    });

    // Focus first field
    setTimeout(() => {
      const selectEl = document.getElementById('item-quality-select');
      if (selectEl) selectEl.focus();
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setCurrentItem({
      categoryId: getActiveCategoryId(),
      qualityId: '',
      descriptionId: '',
      descriptionName: '',
      hsnId: '',
      hsnCode: '',
      lotNumber: '',
      pcs: 0,
      quantity: 0,
      rate: 0,
      gstPercentage: gstSelect,
      per: 'Mtr',
      pieceMeters: ''
    });
  };

  const handleEditItem = (index: number) => {
    setEditingIndex(index);
    setCurrentItem(items[index]);
  };

  const handleDeleteItem = (index: number) => {
    if (confirm('Are you sure you want to delete this item?')) {
      const updated = items.filter((_, i) => i !== index);
      setItems(updated);
      if (editingIndex === index) {
        setEditingIndex(null);
        setCurrentItem({
          categoryId: getActiveCategoryId(),
          qualityId: '',
          descriptionId: '',
          descriptionName: '',
          hsnId: '',
          hsnCode: '',
          lotNumber: '',
          pcs: 0,
          quantity: 0,
          rate: 0,
          gstPercentage: gstSelect,
          per: 'Mtr',
          pieceMeters: ''
        });
      } else if (editingIndex !== null && editingIndex > index) {
        setEditingIndex(editingIndex - 1);
      }
    }
  };

  const handleGstSelectChange = (newGst: number) => {
    setGstSelect(newGst);
    if (mode === 'view') return;
    const updated = items.map(item => ({ ...item, gstPercentage: newGst }));
    setItems(updated);
  };

  const calculateTotals = () => {
    let totalPcs = 0;
    let totalMeters = 0;
    let grossAmount = 0;

    items.forEach(item => {
      totalPcs += item.pcs || 0;
      totalMeters += item.quantity || 0;
      grossAmount += (item.quantity || 0) * (item.rate || 0);
    });

    const gstAmt = (grossAmount * gstSelect) / 100;
    let subtotal = 0;

    if (activeType === 'sale') {
      subtotal = grossAmount + Number(cartage || 0) + Number(postage || 0) - Number(lessValue || 0) + gstAmt + Number(addValue || 0);
    } else if (activeType === 'challan') {
      subtotal = grossAmount + gstAmt;
    } else {
      subtotal = grossAmount + Number(addValue || 0) - Number(lessValue || 0) + gstAmt;
    }

    const grandTotal = Math.round(subtotal);
    const roundedOff = Number((grandTotal - subtotal).toFixed(2));

    return {
      totalPcs,
      totalMeters,
      grossAmount: Number(grossAmount.toFixed(2)),
      gstAmount: Number(gstAmt.toFixed(2)),
      roundedOff,
      grandTotal
    };
  };

  const totals = calculateTotals();

  const handleNew = () => {
    setActiveId(null);
    setMode('new');
    setDocDate(loginDate);
    setChallanNo('');
    setChallanDate(loginDate);
    setCreditDays(activeType === 'sale' ? 90 : 0);
    setBrokerName(brokers.length > 0 ? brokers[0].name : '');
    setBaleNo('');
    setOrderNo('');
    setOrderDate(loginDate);
    setSalesType('Finish Sales');
    setPurchaseType('Finish Purchase');
    setLotNumber('');
    setAddLotNumber(false);
    setLrNo('');
    setLrDate(loginDate);
    setTransport(transports.length > 0 ? transports[0].name : '');
    const filtered = accounts.filter(p => {
      if (activeType === 'purchase') return p.group_name === 'Sundry Creditors';
      if (activeType === 'sale' || activeType === 'challan') return p.group_name === 'Sundry Debtors';
      return true;
    });
    const currentAccount = filtered.find(acc => acc.id === selectedAccountId) || filtered[0];
    setSelectedAccountId(currentAccount ? currentAccount.id : '');
    setDeliveryAt(currentAccount ? currentAccount.name : '');
    setVehicleNo('');
    setRemark('');
    setCreditAccount('SALES');
    setDebitAccount('PURCHASES');
    setCartage(0);
    setPostage(0);
    setLessValue(0);
    setAddValue(0);
    setGstSelect(5);
    setEntryNo('');
    setItems([]);
    setEditingIndex(null);
    setCurrentItem({
      categoryId: '',
      qualityId: '',
      descriptionId: '',
      descriptionName: '',
      hsnId: '',
      hsnCode: '',
      lotNumber: '',
      pcs: 0,
      quantity: 0,
      rate: 0,
      gstPercentage: 5,
      per: 'Mtr',
      pieceMeters: ''
    });

    fetchNextNumber();
  };

  const handleModify = () => {
    if (!activeId) {
      alert('Load a record first by typing the number and clicking Enquiry.');
      return;
    }
    setMode('edit');
  };

  const handleCancel = () => {
    if (confirm('Discard edits and reset form?')) {
      handleNew();
    }
  };

  const handleDelete = async () => {
    if (!activeId) {
      alert('Load a record first.');
      return;
    }

    let docTypeName = 'invoice';
    if (activeType === 'purchase') docTypeName = 'bill';
    else if (activeType === 'challan') docTypeName = 'challan';

    if (!confirm(`Are you sure you want to delete ${docTypeName} ${docNumber}?`)) {
      return;
    }

    try {
      await TransactionsService.delete(activeType, activeId, token!);

      addNotification('success', 'Document deleted successfully.');
      handleNew();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePrint = () => {
    if (!activeId) {
      alert('Load a saved transaction to print.');
      return;
    }
    if (activeType === 'challan') {
      setSelectedCopies(['original', 'duplicate']);
    } else {
      setSelectedCopies(['original', 'duplicate', 'triplicate', 'quadruplicate']);
    }
    setPrintId(activeId);
    setPdfModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const activeCategoryId = getActiveCategoryId();
    if (!activeCategoryId) {
      alert('Validation Error: Active Category ID is missing/empty. Please check categories master data.');
      return;
    }
    const invalidRow = items.find(item => !item.qualityId || !item.descriptionName?.trim() || !item.hsnCode?.trim());
    if (invalidRow) {
      alert('Validation Error: Please select or enter all columns.');
      return;
    }

    if (activeType === 'purchase' && (purchaseType === 'Grey Purchase' || (purchaseType === 'Dyeing Charges' && addLotNumber))) {
      if (!lotNumber) {
        alert('Please enter a Lot Number in the header.');
        return;
      }
    }

    try {
      const body: any = {
        date: docDate,
        financialYear,
        items: items.map(item => ({
          categoryId: activeCategoryId,
          qualityId: item.qualityId,
          descriptionId: item.descriptionId || null,
          descriptionName: item.descriptionName,
          hsnId: item.hsnId || null,
          hsnCode: item.hsnCode,
          lotNumber: item.lotNumber ? Number(item.lotNumber) : null,
          pcs: item.pcs,
          meters: item.quantity,
          rate: item.rate,
          gstPercentage: item.gstPercentage,
          per: item.per,
          pieceMeters: item.pieceMeters || null
        }))
      };

      if (activeType === 'sale') {
        body.invoiceNumber = docNumber;
        body.customerId = selectedAccountId;
        body.challanNumber = challanNo;
        body.challanDate = challanDate;
        body.creditDays = creditDays;
        body.brokerName = brokerName;
        body.baleNumber = baleNo;
        body.orderNumber = orderNo;
        body.orderDate = orderDate;
        body.salesType = salesType;
        body.lrNumber = lrNo;
        body.lrDate = lrDate;
        body.transport = transport;
        body.deliveryAt = deliveryAt;
        body.vehicleNumber = vehicleNo;
        body.remark = remark;
        body.creditAccount = creditAccount;
        body.cartage = cartage;
        body.postage = postage;
        body.less = lessValue;
        body.lessAdd = addValue;
        body.roundedOff = totals.roundedOff;
      } else if (activeType === 'challan') {
        body.challanNumber = docNumber;
        body.customerId = selectedAccountId;
        body.brokerName = brokerName;
        body.baleNumber = baleNo;
        body.orderNumber = orderNo;
        body.orderDate = orderDate;
        body.salesType = salesType;
        body.lrNumber = lrNo;
        body.lrDate = lrDate;
        body.transport = transport;
        body.deliveryAt = deliveryAt;
        body.vehicleNumber = vehicleNo;
        body.remark = remark;
        body.roundedOff = totals.roundedOff;
      } else {
        body.purchaseNumber = docNumber;
        body.supplierId = selectedAccountId;
        body.entryNo = entryNo;
        body.creditDays = creditDays;
        body.brokerName = brokerName;
        body.challanNumber = challanNo;
        body.challanDate = challanDate;
        body.purchaseType = purchaseType;
        if (purchaseType === 'Grey Purchase' || (purchaseType === 'Dyeing Charges' && addLotNumber)) {
          body.lotNumber = lotNumber ? Number(lotNumber) : null;
        } else {
          body.lotNumber = null;
        }
        body.lrNumber = lrNo;
        body.lrDate = lrDate;
        body.transport = transport;
        body.remark = remark;
        body.debitAccount = debitAccount;
        body.addValue = addValue;
        body.lessValue = lessValue;
        body.roundedOff = totals.roundedOff;
      }

      const data = mode === 'new'
        ? await TransactionsService.create(activeType, body, token!) as Record<string, unknown>
        : await TransactionsService.update(activeType, activeId!, body, token!) as Record<string, unknown>;

      addNotification('success', `${activeType.toUpperCase()} saved successfully.`);
      
      if (activeType === 'sale' || activeType === 'challan') {
        const savedId = mode === 'new' 
          ? String(activeType === 'sale' ? data.salesId : data.challanId) 
          : activeId;
        if (activeType === 'challan') {
          setSelectedCopies(['original', 'duplicate']);
        } else {
          setSelectedCopies(['original', 'duplicate', 'triplicate', 'quadruplicate']);
        }
        setPrintId(savedId);
        setPdfModalOpen(true);
      }

      fetchCreditAccounts();
      handleNew();
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    }
  };

  const openSearch = async () => {
    try {
      const data = await TransactionsService.list(activeType, token!) as unknown[];
      setRecentVouchers(data.slice(0, 50));
      setSearchModalOpen(true);
    } catch (err) {
      alert('Search fail: ' + err);
    }
  };

  const filteredAccounts = accounts.filter(p => {
    if (activeType === 'purchase') return p.group_name === 'Sundry Creditors';
    if (activeType === 'sale' || activeType === 'challan') return p.group_name === 'Sundry Debtors';
    return true;
  });

  const handleExit = (): void => {
    // Implement exit logic, e.g., navigate away or close modal
    window.location.href = '/';
  };
  const getActiveCategoryId = () => {
    if (activeType === 'sale' || activeType === 'challan') {
      const match = categories.find(c => {
        const displayName = c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase();
        return `${displayName} Sales` === salesType;
      });
      if (match) return match.id;
    } else if (activeType === 'purchase') {
      const match = categories.find(c => {
        const displayName = c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase();
        return `${displayName} Purchase` === purchaseType;
      });
      if (match) return match.id;
    }

    // Fallback logic
    let catName = 'FINISH';
    if (activeType === 'sale' || activeType === 'challan') {
      catName = salesType === 'Grey Sales' ? 'GREY' : 'FINISH';
    } else if (activeType === 'purchase') {
      catName = purchaseType === 'Grey Purchase' ? 'GREY' : 'FINISH';
    }
    const match = categories.find(c => c.name === catName);
    return match ? match.id : '';
  };

  return (
    <div className="flex flex-col gap-4 text-xs">
      
      {/* Tab select header */}
      <div className="flex bg-slate-100/80 p-1 border border-slate-200/80 rounded-xl gap-1 shrink-0 self-start select-none text-xs">
        <button
          type="button"
          onClick={() => { setActiveType('challan'); handleNew(); }}
          className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center ${activeType === 'challan' ? 'bg-white text-indigo-600 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-650 hover:text-indigo-600 hover:bg-white/50'}`}
        >
          <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> Delivery Challan
        </button>
        <button
          type="button"
          onClick={() => { setActiveType('sale'); handleNew(); }}
          className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center ${activeType === 'sale' ? 'bg-white text-indigo-600 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-650 hover:text-indigo-600 hover:bg-white/50'}`}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" /> Sales Invoice
        </button>
        <button
          type="button"
          onClick={() => { setActiveType('purchase'); handleNew(); }}
          className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all cursor-pointer flex items-center ${activeType === 'purchase' ? 'bg-white text-indigo-600 font-bold border border-slate-200/50 shadow-sm' : 'text-slate-650 hover:text-indigo-600 hover:bg-white/50'}`}
        >
          <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Purchase Voucher
        </button>
      </div>

      {/* Main Form container */}
      <form onSubmit={handleSave} className="flex flex-col gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm select-none">
        
        <VoucherHeaders
          activeType={activeType}
          mode={mode}
          docNumber={docNumber}
          setDocNumber={setDocNumber}
          docDate={docDate}
          setDocDate={setDocDate}
          challanNo={challanNo}
          setChallanNo={setChallanNo}
          challanDate={challanDate}
          setChallanDate={setChallanDate}
          creditDays={creditDays}
          setCreditDays={setCreditDays}
          selectedAccountId={selectedAccountId}
          setSelectedAccountId={handleAccountChange}
          filteredAccounts={filteredAccounts}
          brokerName={brokerName}
          setBrokerName={setBrokerName}
          brokersList={brokers}
          baleNo={baleNo}
          setBaleNo={setBaleNo}
          orderNo={orderNo}
          setOrderNo={setOrderNo}
          orderDate={orderDate}
          setOrderDate={setOrderDate}
          salesType={salesType}
          setSalesType={setSalesType}
          creditAccount={creditAccount}
          setCreditAccount={setCreditAccount}
          creditAccountsList={creditAccountsList}
          purchaseType={purchaseType}
          setPurchaseType={setPurchaseType}
          lotNumber={lotNumber}
          setLotNumber={setLotNumber}
          addLotNumber={addLotNumber}
          setAddLotNumber={setAddLotNumber}
          debitAccount={debitAccount}
          setDebitAccount={setDebitAccount}
          entryNo={entryNo}
          setEntryNo={setEntryNo}
          handleEnquiry={handleEnquiry}
          handleFetchChallan={handleFetchChallan}
          categories={categories}
        />

        <ItemEntryForm
          currentItem={currentItem}
          setCurrentItem={setCurrentItem}
          editingIndex={editingIndex}
          onAddOrUpdate={handleAddOrUpdateItem}
          onCancelEdit={handleCancelEdit}
          qualities={qualities}
          descriptions={descriptions}
          hsnMappings={hsnMappings}
          activeCategoryId={getActiveCategoryId()}
          openPieceModal={openPieceModal}
          setGstSelect={setGstSelect}
          isFirstItem={items.length === 0 || (editingIndex === 0)}
          mode={mode}
        />

        <ProductGridTable
          items={items}
          qualities={qualities}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
        />

        <VoucherTotals
          activeType={activeType}
          mode={mode}
          lrNo={lrNo}
          setLrNo={setLrNo}
          lrDate={lrDate}
          setLrDate={setLrDate}
          transport={transport}
          setTransport={setTransport}
          transportsList={transports}
          deliveryAt={deliveryAt}
          setDeliveryAt={setDeliveryAt}
          filteredAccounts={filteredAccounts}
          citiesList={cities}
          vehicleNo={vehicleNo}
          setVehicleNo={setVehicleNo}
          remark={remark}
          setRemark={setRemark}
          totals={totals}
          cartage={cartage}
          setCartage={setCartage}
          postage={postage}
          setPostage={setPostage}
          lessValue={lessValue}
          setLessValue={setLessValue}
          addValue={addValue}
          setAddValue={setAddValue}
          gstSelect={gstSelect}
          handleGstSelectChange={handleGstSelectChange}
        />

        {/* BOTTOM ACTION BUTTON BAR */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mt-4 flex justify-between items-center gap-2 select-none">
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleNew}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> New
            </button>
            
            <button
              type="submit"
              disabled={mode === 'view'}
              className="px-5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-slate-650 border border-cyan-350 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center disabled:opacity-50 disabled:pointer-events-none"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
            >
              <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
            </button>

            <button
              type="button"
              onClick={handleModify}
              disabled={mode !== 'view'}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Modify
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={mode !== 'view'}
              className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
            </button>

            <button
              type="button"
              onClick={openSearch}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 border border-slate-200 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" /> Search
            </button>

            {(activeType === 'sale' || activeType === 'challan') && (
              <button
                type="button"
                onClick={handlePrint}
                disabled={!activeId}
                className="px-4 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200/50 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer flex items-center"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleExit()}
            className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200/50 rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-[0.98] cursor-pointer flex items-center"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" /> Exit
          </button>
        </div>

      </form>

      <RecentSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        activeType={activeType}
        recentVouchers={recentVouchers}
        loadVoucherIntoForm={loadVoucherIntoForm}
      />

      <PdfPreviewModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        printId={printId}
        activeType={activeType}
        selectedCopies={selectedCopies}
        setSelectedCopies={setSelectedCopies}
        docNumber={docNumber}
        token={token}
      />

      <PieceMetersModal
        isOpen={pieceModalOpen}
        onClose={() => { setPieceModalOpen(false); setActivePieceIndex(null); }}
        tempPieceText={tempPieceText}
        setTempPieceText={setTempPieceText}
        mode={mode}
        handleSavePieceMeters={handleSavePieceMeters}
      />

    </div>
  );
};
