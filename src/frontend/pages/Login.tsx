import React, { useState, useEffect } from 'react';
import logo from '../../../assets/logo.png';
import { useStore } from '../store/useStore';
import { AuthService } from '../services/api';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { 
  LogIn, 
  LogOut, 
  Server, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

interface CompanyItem {
  id: string;
  name: string;
  code: string;
  gst_number?: string | null;
  pan_number?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

interface UserItem {
  id: string;
  username: string;
  name: string;
  role: string;
  company_id: string | null;
}

export const Login: React.FC = () => {
  const store = useStore();

  // Master Lists loaded dynamically
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Form Fields
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');
  const [password, setPassword] = useState('');
  const [financialYear, setFinancialYear] = useState('2026-27');
  const [loginDate, setLoginDate] = useState(new Date().toISOString().split('T')[0]);

  // Status & Auth State
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Set when the user logged in with a default password and must choose a new one.
  const [forcedChange, setForcedChange] = useState<{ token: string; companyCode: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const checkDb = async () => {
      try {
        await AuthService.healthCheck();
        setDbStatus('online');
      } catch {
        setDbStatus('offline');
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 15000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Companies on Load
  const loadCompanies = async () => {
    try {
      const data = await AuthService.getCompanies();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
      setCompanies([]);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // Fetch Users when Company Selection changes
  useEffect(() => {
    const loadUsers = async () => {
      if (!selectedCompanyId) {
        setUsers([]);
        setSelectedUsername('');
        return;
      }

      try {
        const data = await AuthService.getCompanyUsers(selectedCompanyId);
        setUsers(data);
        if (data.length > 0) {
          setSelectedUsername(data[0].username);
        } else {
          setSelectedUsername('');
        }
      } catch (err) {
        console.error('Failed to load users:', err);
        setUsers([]);
      }
    };
    loadUsers();
  }, [selectedCompanyId]);

  // Auto-clear Notifications Stack
  useEffect(() => {
    const unread = store.notifications.filter(n => !n.read);
    if (unread.length > 0) {
      const timers = unread.map(n => 
        setTimeout(() => {
          store.markAsRead(n.id);
        }, 4000)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [store.notifications, store]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dbStatus === 'offline') {
      store.addNotification('error', 'Database system is offline. Check server connection.');
      return;
    }

    setError(null);
    setLoading(true);

    const activeCompany = companies.find(c => c.id === selectedCompanyId);
    if (!activeCompany) {
      setError('Selected company not found.');
      setLoading(false);
      return;
    }

    try {
      const data = await AuthService.login({
        companyCode: activeCompany.code,
        username: selectedUsername,
        password,
        financialYear
      });

      if (data.mustChangePassword) {
        setForcedChange({ token: data.token, companyCode: activeCompany.code });
        return;
      }

      store.login(data.token, data.user, data.company, data.financialYear, loginDate);
      store.addNotification('success', `Logged in successfully: ${data.user.name}`);
    } catch (err: any) {
      setError(err.message);
      store.addNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Default-password users: change it, then log in again with the new one.
  const handleForcedChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forcedChange) return;
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await AuthService.changePassword(forcedChange.token, { currentPassword: password, newPassword });
      const data = await AuthService.login({
        companyCode: forcedChange.companyCode,
        username: selectedUsername,
        password: newPassword,
        financialYear
      });
      setForcedChange(null);
      setPassword('');
      store.login(data.token, data.user, data.company, data.financialYear, loginDate);
      store.addNotification('success', 'Password changed. Logged in successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Exit App handler
  const handleExit = async () => {
    if ((window as any).electronAPI && (window as any).electronAPI.closeApp) {
      (window as any).electronAPI.closeApp();
    } else {
      if (await store.confirm({ message: 'Close application?' })) {
        window.close();
      }
    }
  };

  // Every year from 2016-17 (the oldest AC_PLUS data) to next year, newest first.
  const years = Array.from({ length: new Date().getFullYear() - 2016 + 2 }, (_, i) => {
    const y = new Date().getFullYear() + 1 - i;
    return { value: `${y}-${String(y + 1).slice(2)}`, label: `${y}-${y + 1}` };
  });

  return (
    <div className="min-h-screen w-full relative flex font-sans overflow-hidden bg-slate-950 select-none">
      <style>{`
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        .animate-pulse-scale {
          animation: pulseScale 4s infinite ease-in-out;
        }
      `}</style>
      
      {/* Decorative Blur Spheres for ambient glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Modern Split Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 z-10 w-full">
        
        {/* Left Side: Brand Panel */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-12 bg-slate-900 border-r border-slate-900 relative animate-slide-in">
          
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 shadow-lg shadow-slate-300/20 p-3 rounded-xl bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
            <img src={logo} alt="TexFin Logo" className="w-20 h-20 shadow-md" />
            <div>
              <h1 className="font-black text-slate-100 text-lg tracking-wide leading-none">TexFin</h1>
              <p className="text-[11px] text-slate-500 font-extrabold tracking-wider uppercase mt-1">Textile Trading Accounting System</p>
            </div>
          </div>

          {/* Central ERP Value Statements */}
          <div className="flex flex-col gap-6 max-w-sm">
            <div>
              <h2 className="text-3xl font-black text-white leading-tight">
                Enterprise Accounting<br />
                <span className="text-blue-500">Built for Scale</span>
              </h2>
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-3 my-2">
              {[
                'Multi Company',
                'GST Compliance',
                'Inventory Management',
                'Financial Reports',
                'Voucher System'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs font-bold text-slate-300 hover:text-white transition-colors duration-200">
                  <span className="text-emerald-500 font-extrabold">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            {/* Connection Health Monitor */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/100 self-start shadow-sm mt-2">
              <Server className="w-4 h-4 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">Database Connection</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    dbStatus === 'online' ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 
                    dbStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-[11px] text-white font-bold text-slate-350 capitalize leading-none">
                    {dbStatus === 'checking' ? 'Checking...' : dbStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left Footer Info */}
          <div className="text-[11px] text-slate-600 font-bold uppercase tracking-widest leading-none select-none">
            Developed by Tithi Solanki • 7021206907
          </div>
        </div>

        {/* Right Side: Operations Panel */}
        <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 bg-slate-50 relative">
          
          {/* Floating Login Card */}
          <div className="w-full max-w-[430px] bg-white rounded-2xl p-8 shadow-2xl transition-all duration-300">
            
            {/* STANDARD USER LOGIN FORM */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Welcome Back</h2>
                <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider mt-1.5">Enter credentials to unlock account</p>
              </div>

              {error && (
                <div className="px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Select
                  label="Company Profile"
                  value={selectedCompanyId}
                  disabled={loadingLists || loading}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  options={companies.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.code})`
                  }))}
                />

                <Select
                  label="Username"
                  value={selectedUsername}
                  disabled={loadingLists || users.length === 0 || loading}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  options={users.map((u) => ({
                    value: u.username,
                    label: `${u.name} [${u.username}]`
                  }))}
                />

                <Input
                  label="Security Password"
                  type="password"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Financial Year"
                    value={financialYear}
                    disabled={loading}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    options={years}
                  />

                  <Input
                    label="Session Date"
                    type="date"
                    value={loginDate}
                    disabled={loading}
                    onChange={(e) => setLoginDate(e.target.value)}
                    required
                  />
                </div>

                <div className="flex gap-4 mt-4">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="flex-1 font-bold h-9.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 cursor-pointer" 
                    disabled={loading || loadingLists}
                  >
                    <LogIn className="w-4 h-4 mr-2" /> {loading ? 'Unlocking...' : 'Sign In'}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={handleExit} 
                    className="font-bold h-9.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Exit
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {forcedChange && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50">
          <form onSubmit={handleForcedChange} className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Choose a new password</h2>
            <p className="text-xs text-slate-600">
              You are using the default password that ships with TexFin. Please set your own password to continue.
            </p>
            <Input type="password" placeholder="New password (min 6 characters)" value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)} />
            <Input type="password" placeholder="Repeat new password" value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)} />
            {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setForcedChange(null)}>Cancel</Button>
              <Button type="submit" disabled={loading}>Save and log in</Button>
            </div>
          </form>
        </div>
      )}

      {/* Notification Toast Stack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none select-none">
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
              className="text-gray-600 hover:text-slate-650 font-bold transition-all text-xs h-4 w-4 flex items-center justify-center rounded-full hover:bg-slate-200/50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};
