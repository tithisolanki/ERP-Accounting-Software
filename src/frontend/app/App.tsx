import React, { useState, useEffect} from 'react';
import { useStore } from '../store/useStore';
import { Login } from '../pages/Login';
import logo from '../../../assets/logo.png';
import { Masters } from '../pages/Masters';
import { Vouchers, BankVouchers, CashVouchers, JournalVouchers } from '../modules/vouchers';
import { Registers } from '../modules/registers';
import { Settings } from '../pages/Settings';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { BackupRestore } from '../pages/BackupRestore';
import { Home } from '../pages/Home';
import {
  searchTargets,
  navItems,
  voucherSidebarItems,
  accountVoucherItems,
  registerSidebarItems,
  reportsSidebarItems,
  misreportsSidebarItems,
  quickAccessItems,
  formatLoginDate,
  accountsSidebarItems,
  inventorySidebarItems,
  brokersSidebarItems,
  companySidebarItems,
  openingBalanceSidebarItems,
} from './config';
import { AccountOpeningBalancePage } from '../modules/opening/AccountOpeningBalancePage';
import { StockOpeningBalancePage } from '../modules/opening/StockOpeningBalancePage';
import { TrialBalancePage } from '../modules/reports/trial-balance';
import { PartyLedgerPage } from '../modules/reports/party-ledger';
import { OutstandingLedgerPage } from '../modules/reports/outstanding-ledger';
import { CloseFinancialYearPage } from '../modules/reports/close-financial-year';
import { 
  FolderClosed, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  Download, 
  Upload, 
  Info, 
  LogOut, 
  Palette, 
  Search,
  ChevronDown,
  Layers,
  CheckCircle,
  XCircle
} from 'lucide-react';
import "./../index.css";

export const App: React.FC = () => {
  const store = useStore();
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [mastersSubTab, setMastersSubTab] = useState<string>('accounts');
  const [voucherType, setVoucherType] = useState<'purchase' | 'sale' | 'challan'>('sale');
  const [registerType, setRegisterType] = useState<'sales' | 'purchases' | 'journal'>('sales');
  const [reportType, setReportType] = useState<'party_ledger' | 'outstanding_ledger'>('party_ledger');
  const [misReportType, setMisReportType] = useState<'trial_balance'>('trial_balance');

  const handleTabSwitch = (targetTab: string | null, targetSubTab?: string | null) => {
    if ((window as any).isMastersDirty) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
      (window as any).isMastersDirty = false;
    }
    setActiveTab(targetTab);
    if (targetTab === 'masters' && targetSubTab) {
      setMastersSubTab(targetSubTab);
    }
    if (targetTab === 'vouchers' && targetSubTab) {
      setVoucherType(targetSubTab as any);
    }
    if (targetTab === 'registers' && targetSubTab) {
      setRegisterType(targetSubTab as any);
    }
    if (targetTab === 'reports' && targetSubTab) {
      setReportType(targetSubTab as any);
    }
    if (targetTab === 'misreports' && targetSubTab) {
      setMisReportType(targetSubTab as any);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [, setCapsLockActive] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Wallpaper settings (applied as workspace background or shell styling)
  const [desktopBg, setDesktopBg] = useState<string>(() => {
    return localStorage.getItem('ac-plus-desktop-bg') || 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)';
  });
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Keyboard modifiers listener (Caps Lock)
  useEffect(() => {
    const handleKeyState = (e: KeyboardEvent) => {
      setCapsLockActive(e.getModifierState('CapsLock'));
    };
    window.addEventListener('keydown', handleKeyState);
    window.addEventListener('keyup', handleKeyState);

    return () => {
      window.removeEventListener('keydown', handleKeyState);
      window.removeEventListener('keyup', handleKeyState);
    };
  }, []);

  // Global F-key shortcuts (AC_PLUS muscle memory) - fire regardless of focus
  useEffect(() => {
    const handleFKeyShortcuts = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          handleTabSwitch('bank_receipt');
          break;
        case 'F3':
          e.preventDefault();
          handleTabSwitch('cash_receipt');
          break;
        case 'F5':
          e.preventDefault();
          handleTabSwitch('bank_payment');
          break;
        case 'F6':
          e.preventDefault();
          handleTabSwitch('cash_payment');
          break;
        case 'F7':
          e.preventDefault();
          handleTabSwitch('vouchers', 'purchase');
          break;
        case 'F8':
          e.preventDefault();
          handleTabSwitch('vouchers', 'sale');
          break;
        case 'F9':
          e.preventDefault();
          handleTabSwitch('vouchers', 'challan');
          break;
      }
    };
    window.addEventListener('keydown', handleFKeyShortcuts);

    return () => {
      window.removeEventListener('keydown', handleFKeyShortcuts);
    };
  }, []);

  // Auto-clear Notifications Stack
  useEffect(() => {
    const unread = store.notifications.filter(n => !n.read);
    if (unread.length > 0) {
      const timers = unread.map(n => 
        setTimeout(() => {
          store.markAsRead(n.id);
        }, 2000)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [store.notifications, store]);

  // Background change handler
  const handleBgChange = (value: string) => {
    setDesktopBg(value);
    localStorage.setItem('ac-plus-desktop-bg', value);
    store.addNotification('success', 'Workspace background theme updated.');
  };

  const applyCustomUrl = () => {
    if (!customUrl.trim()) return;
    handleBgChange(customUrl.trim());
    setCustomUrl('');
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      store.addNotification('error', 'File size is too large (Limit is 2MB for local browser persistence). Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (typeof result === 'string') {
        handleBgChange(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Format YYYY-MM-DD to DD/MM/YYYY — see formatLoginDate in ./config

  // Route wrapper to render active window component
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'masters':
        return <Masters activeSubTab={mastersSubTab} onChangeSubTab={setMastersSubTab} />;
      case 'vouchers':
        return <Vouchers initialType={voucherType} />;
      case 'bank_payment':
        return <BankVouchers type="payment" />;
      case 'bank_receipt':
        return <BankVouchers type="receipt" />;
      case 'cash_payment':
        return <CashVouchers type="payment" />;
      case 'cash_receipt':
        return <CashVouchers type="receipt" />;
      case 'journal_voucher':
        return <JournalVouchers />;
      case 'close_financial_year':
        return <CloseFinancialYearPage />;
      case 'backup':
        return <BackupRestore />;
      case 'registers':
        return <Registers initialRegister={registerType} />;
      case 'settings':
        return <Settings />;
      case 'reports':
        if (reportType === 'party_ledger') {
          return <PartyLedgerPage />;
        }
        if (reportType === 'outstanding_ledger') {
          return <OutstandingLedgerPage />;
        }
        return null;
      case 'misreports':
        if (misReportType === 'trial_balance') {
          return <TrialBalancePage />;
        }
        return null;
      case 'account_opening':
        return <AccountOpeningBalancePage />;
      case 'stock_opening':
        return <StockOpeningBalancePage />;
      case null:
        return <Home />;
      default:
        return null;
    }
  };

  // Search-driven menu navigation uses shared config (searchTargets from ./config)

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const filtered = searchTargets.filter(t => 
      t.name.toLowerCase().includes(query.toLowerCase()) || 
      t.keywords.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const handleSearchResultClick = (target: any) => {
    handleTabSwitch(target.tab, target.sub);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Render Login Page if not authenticated
  if (!store.token || !store.user) {
    return <Login />;
  }

  const bgStyle = desktopBg.startsWith('linear-gradient') || desktopBg.startsWith('rgb') || desktopBg.startsWith('#')
    ? { background: desktopBg }
    : { backgroundImage: `url(${desktopBg})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-sans text-slate-800 select-none bg-slate-50">

      {/* 2. Top Navigation Bar (Header) */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-30 shadow-sm relative">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img src={logo} alt="TexFin Logo" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-bold text-slate-800 text-base tracking-wider leading-none">TexFin <span className="text-indigo-600">Ledger</span></h1>
            <p className="text-[11px] text-slate-400 font-bold tracking-wider uppercase mt-1">Accounting & Inventory</p>
          </div>
        </div>

        {/* Horizontal Nav Links */}
        <nav className="hidden md:flex items-center gap-1 ml-6 min-w-0 overflow-x-auto scrollbar-none">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabSwitch(item.id)}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === item.id || (item.id === 'vouchers' && (activeTab === 'bank_payment' || activeTab === 'bank_receipt' || activeTab === 'cash_payment' || activeTab === 'cash_receipt' || activeTab === 'close_financial_year'))
                  ? 'bg-slate-100/80 text-indigo-650 font-extrabold border border-slate-200/50 shadow-inner' 
                  : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
              }`}
            >
              {item.name}
            </button>
          ))}
        </nav>

        {/* Center-Right Search Menu & Profile info */}
        <div className="flex items-center gap-4 shrink-0 ml-auto">
          {/* Search bar */}
          <div className="relative hidden xl:block w-40 2xl:w-56">
            <div className="relative">
              <input
                type="text"
                placeholder="Search menus..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none transition-all text-slate-800 h-8 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            </div>
            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute right-0 top-9 w-60 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 p-2 animate-slide-in select-none">
                <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">Menus & Actions</div>
                {searchResults.map((res, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSearchResultClick(res)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all cursor-pointer"
                  >
                    {res.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* User profile dropdown & Theme Customizer */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 px-2 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-200/50 rounded-xl transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-700">
                {store.user.username[0].toUpperCase()}
              </div>
              <div className="text-left hidden 2xl:block">
                <div className="font-bold text-xs text-slate-800 leading-none">{store.user.username.toUpperCase()}</div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{store.user.role || 'Admin'}</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 p-2 select-none animate-slide-in">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="font-bold text-xs text-slate-850 truncate">{store.company?.name || 'K.CHANDRAKANT'}</div>
                  <div className="text-[11px] text-slate-450 font-bold uppercase tracking-wider mt-0.5 font-mono">FY: {store.financialYear}</div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => { setCustomizerOpen(!customizerOpen); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-650 flex items-center gap-2 rounded-lg cursor-pointer"
                  >
                    <Palette className="w-4 h-4 text-slate-450" /> Personalize Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAboutModalOpen(true); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-650 flex items-center gap-2 rounded-lg cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-slate-450" /> About System
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (confirm('Are you sure you want to change company or log out?')) {
                        store.logout();
                      }
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-650 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" /> Log Out Session
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Body Context Grid */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        
        {/* Context Left Sidebar */}
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 p-4.5 flex flex-col justify-between text-slate-600 select-none z-20 shadow-sm">
          <div className="flex flex-col gap-5">
            {/* Context Header info */}
            {activeTab === null && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>Quick Access Home</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Quick Access
                </h3>
                <div className="flex flex-col gap-1">
                  {quickAccessItems.map((item) => (
                    <button
                      key={item.sub}
                      type="button"
                      onClick={() => handleTabSwitch(item.tab, item.sub)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold text-slate-650 hover:bg-slate-50 hover:text-indigo-650 transition-all text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'masters' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <FolderClosed className="w-4 h-4 shrink-0" />
                  <span>Masters Setup</span>
                </div>
                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Account
                </h3>
                <div className="flex flex-col gap-0.5 mb-2">
                  {accountsSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('masters', item.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'masters' && mastersSubTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Inventory
                </h3>
                <div className="flex flex-col gap-0.5 mb-2">
                  {inventorySidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('masters', item.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'masters' && mastersSubTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Brokers & Transport
                </h3>
                <div className="flex flex-col gap-0.5 mb-2">
                  {brokersSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('masters', item.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'masters' && mastersSubTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Company
                </h3>
                <div className="flex flex-col gap-0.5 mb-2">
                  {companySidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('masters', item.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === 'masters' && mastersSubTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'masters' && mastersSubTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === 'vouchers' || activeTab === 'bank_payment' || activeTab === 'bank_receipt' || activeTab === 'cash_payment' || activeTab === 'cash_receipt' || activeTab === 'journal_voucher' || activeTab === 'close_financial_year' || activeTab === 'account_opening' || activeTab === 'stock_opening') && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Data Entry</span>
                </div>
                
                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Transaction Invoices
                </h3>
                <div className="flex flex-col gap-0.5 mb-4">
                  {voucherSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('vouchers', item.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === 'vouchers' && voucherType === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'vouchers' && voucherType === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Account Vouchers
                </h3>
                <div className="flex flex-col gap-0.5 mb-4">
                  {accountVoucherItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch(item.id as any)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>

                <h3 className="px-3 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Opening Balance
                </h3>
                <div className="flex flex-col gap-0.5">
                  {openingBalanceSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch(item.id as any)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${activeTab === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'registers' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Register Books</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Transactions
                </h3>
                <div className="flex flex-col gap-1">
                  {registerSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('registers', item.id)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${registerType === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${registerType  === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>Reports</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Ledgers
                </h3>
                <div className="flex flex-col gap-1">
                  {reportsSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('reports', item.id)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${reportType === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${reportType === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'misreports' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>M.I.S. Reports</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Accounting
                </h3>
                <div className="flex flex-col gap-1">
                  {misreportsSidebarItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabSwitch('misreports', item.id)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${misReportType === item.id ? 'bg-indigo-50/50 text-indigo-650 font-bold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${misReportType === item.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <SettingsIcon className="w-4 h-4 shrink-0" />
                  <span>Configurations</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Administration
                </h3>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-indigo-50/50 text-indigo-650 font-bold text-xs text-left cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>System Settings</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold mb-3.5 text-xs shadow-sm">
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Backup & Restore</span>
                </div>
                <h3 className="px-3 mb-3 text-[11px] font-black uppercase tracking-wider text-slate-400 select-none">
                  Maintenance
                </h3>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-indigo-50/50 text-indigo-650 font-bold text-xs text-left cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    <span>System Database</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Quick Database Backup/Restore Tools */}
          <div className="flex flex-col border-t border-slate-100 pt-3 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handleTabSwitch('backup')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-all text-left cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" /> Backup DB
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('backup')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-slate-450 hover:bg-slate-50 hover:text-slate-700 transition-all text-left cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" /> Restore DB
            </button>
          </div>
        </aside>

        {/* Content Workspace Area */}
        <main 
          className="flex-1 overflow-y-auto p-6 transition-all duration-300 relative"
          style={bgStyle}
        >
          {/* Active component rendered directly in workspace */}
          <div className="relative z-10 w-full">
            {renderActiveTab()}
          </div>

          {/* Developer Watermark */}
          <div className="absolute bottom-6 right-8 text-right z-0 pointer-events-none select-none opacity-10">
            <p className="text-xl md:text-3xl font-black text-slate-800 tracking-tight font-mono">
              Developed by TITHI SOLANKI. (Mobile : 7021206907)
            </p>
          </div>
        </main>

      </div>

      {/* 4. Sleek Status Bar (Bottom Panel) */}
      <footer className="h-7 shrink-0 bg-white border-t border-slate-200/80 flex items-center justify-between px-4 text-[12px] text-slate-500 font-semibold select-none z-20 shadow-inner">
        <div className="flex items-center gap-3 shrink-0">
          <span>{store.company?.name || 'K.CHANDRAKANT'} [{store.company?.code || '01'}]</span>
          <span className="text-slate-300">|</span>
          <span>Financial Year {store.financialYear}</span>
          <span className="text-slate-300">|</span>
          <span>Date: {formatLoginDate(store.loginDate)}</span>
          <span className="text-slate-300">|</span>
          <span className="text-indigo-650 font-bold">(user : {store.user.username.toUpperCase()})</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 ml-4">
          <span className="hidden lg:inline text-slate-450 font-medium truncate">
            Designed & Developed by TITHI SOLANKI (Mobile - 7021206907) - All Rights Reserved by TITHI SOLANKI. 2026.
          </span>
        </div>
      </footer>

      {/* WALLPAPER CUSTOMIZER MODAL */}
      <Modal
        isOpen={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        title="Personalize Desktop Workspace"
        size="sm"
      >
        <div className="flex flex-col gap-4 text-xs select-none">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Workspace Background Theme</h4>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Select a solid color, gradient, or custom URL image for your desktop workspace.</p>
          </div>
          
          {/* Presets Grid */}
          <div className="grid grid-cols-5 gap-3">
            <button
              type="button"
              title="Sleek Light Slate"
              onClick={() => handleBgChange('linear-gradient(to bottom right, #f8fafc, #f1f5f9)')}
              className="w-10 h-10 rounded-xl border border-slate-250 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)' }}
            />
            <button
              type="button"
              title="Cosmic Ocean"
              onClick={() => handleBgChange('linear-gradient(to bottom right, #0f172a, #1e3a8a, #020617)')}
              className="w-10 h-10 rounded-xl border border-slate-250 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(to bottom right, #0f172a, #1e3a8a, #020617)' }}
            />
            <button
              type="button"
              title="Sunset Rose"
              onClick={() => handleBgChange('linear-gradient(to bottom right, #801a00, #b33600, #4d0d00)')}
              className="w-10 h-10 rounded-xl border border-slate-250 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(to bottom right, #801a00, #b33600, #4d0d00)' }}
            />
            <button
              type="button"
              title="Forest Mist"
              onClick={() => handleBgChange('linear-gradient(to bottom right, #064e3b, #022c22, #065f46)')}
              className="w-10 h-10 rounded-xl border border-slate-250 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(to bottom right, #064e3b, #022c22, #065f46)' }}
            />
            <button
              type="button"
              title="Dark Carbon"
              onClick={() => handleBgChange('linear-gradient(to bottom right, #1e293b, #0f172a, #334155)')}
              className="w-10 h-10 rounded-xl border border-slate-250 shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(to bottom right, #1e293b, #0f172a, #334155)' }}
            />
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Custom Image URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Custom Background Image URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs text-slate-800 focus:border-indigo-500 shadow-inner"
              />
              <button
                type="button"
                onClick={applyCustomUrl}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Upload Local Image */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upload Local Wallpaper File</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLocalUpload}
              className="text-xs text-slate-600 w-full cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-200 bg-slate-50 p-3 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCustomizerOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* ABOUT MODAL */}
      <Modal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        title="About TexFin - Ledger"
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4 text-xs select-none">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg flex items-center justify-center text-white font-extrabold text-xl">TF</div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">TexFin - Ledger (Multiuser Accounting System)</h3>
            <p className="text-[12px] text-slate-450 font-bold mt-1">Version 1.0.0 (TexFin Release)</p>
          </div>
          <div className="text-xs text-slate-650 leading-relaxed font-semibold">
            <p>Specifically tuned for Textile Trading & Invoice Registers.</p>
            <p className="mt-3 text-indigo-650 font-black">Designed & Developed by TITHI SOLANKI</p>
            <p className="text-slate-500 font-bold font-mono">Mobile: 7021206907</p>
            <p className="mt-4 text-[11px] text-slate-400 font-bold uppercase tracking-wider">All Rights Reserved by TITHI SOLANKI. 2026.</p>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold leading-relaxed border-t border-slate-200 pt-3 w-full">
            <p className="text-slate-600 font-bold mb-1">Keyboard Shortcuts</p>
            <p>F2 Cheque Receipt &bull; F3 Cash Receipt &bull; F5 Cheque Payment &bull; F6 Cash Payment &bull; F7 Purchase Bill &bull; F8 Sales Invoice &bull; F9 Delivery Challan</p>
          </div>
          <div className="flex justify-center mt-2 w-full">
            <Button
              type="button"
              variant="primary"
              onClick={() => setAboutModalOpen(false)}
              className="w-24 font-bold"
            >
              OK
            </Button>
          </div>
        </div>
      </Modal>

      {/* Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none select-none">
        {store.notifications.filter(n => !n.read).map((notif) => (
          <div
            key={notif.id}
            className={`pointer-events-auto p-3.5 rounded-xl shadow-xl flex items-center justify-between gap-4 text-xs font-bold border transition-all animate-slide-in min-w-[280px] max-w-[360px] ${
              notif.type === 'success' ? 'bg-emerald-50 border-emerald-250 text-emerald-800' :
              notif.type === 'error' ? 'bg-rose-50 border-rose-250 text-rose-800' :
              notif.type === 'warning' ? 'bg-amber-50 border-amber-250 text-amber-800' :
              'bg-indigo-50 border-indigo-250 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {notif.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> :
               notif.type === 'error' ? <XCircle className="w-4 h-4 text-rose-500 shrink-0" /> :
               null}
              <span className="truncate">{notif.message}</span>
            </div>
            <button
              type="button"
              onClick={() => store.markAsRead(notif.id)}
              className="text-slate-400 hover:text-slate-650 font-bold transition-all text-xs h-4 w-4 flex items-center justify-center rounded-full hover:bg-slate-200/50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

