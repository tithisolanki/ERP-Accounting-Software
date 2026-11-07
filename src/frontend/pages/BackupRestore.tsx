import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { SettingsService } from '../services/api';
import { Download, Upload, Cloud, Save, Wifi, WifiOff } from 'lucide-react';

export const BackupRestore: React.FC = () => {
  const { token, addNotification, company, isOnline, syncStatus, syncMessage, setSyncStatus } = useStore();
  const [restoring, setRestoring] = useState(false);

  // Supabase state
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const data = await SettingsService.getAll(token);
      const urlMatch = data.global.find((s) => s.key === 'supabase_url');
      const keyMatch = data.global.find((s) => s.key === 'supabase_key');
      if (urlMatch) setSupabaseUrl(urlMatch.value || '');
      if (keyMatch) setSupabaseKey(keyMatch.value || '');
    } catch {
      addNotification('error', 'Failed to load credentials.');
    }
  };

  const handleSaveSyncConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await SettingsService.save(token, [
        { key: 'supabase_url', value: supabaseUrl, isGlobal: true },
        { key: 'supabase_key', value: supabaseKey, isGlobal: true }
      ]);
      addNotification('success', 'Supabase configurations updated.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save config.';
      addNotification('error', message);
    }
  };

  const handleTriggerSync = async () => {
    if (!isOnline) {
      addNotification('warning', 'Device is currently offline. Syncing requires internet.');
      return;
    }
    if (!token) return;

    setSyncing(true);
    setSyncStatus('syncing');
    addNotification('info', 'Synchronizing data records with Supabase cloud...');

    try {
      const data = await SettingsService.sync(token);
      setSyncStatus('success', data.message);
      addNotification('success', data.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sync failed.';
      setSyncStatus('error', message);
      addNotification('error', message);
    } finally {
      setSyncing(false);
    }
  };

  const handleBackupClick = async () => {
    if (!token) return;
    try {
      const blob = await SettingsService.downloadBackup(token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `texfin_backup_${company?.code || 'backup'}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addNotification('success', 'Database backup downloaded successfully.');
    } catch (err: any) {
      addNotification('error', 'Backup failed: ' + err.message);
    }
  };

  // Database Restore File handler
  const handleRestoreDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('WARNING: Restoring the database will overwrite all your current offline transactions and log you out. Proceed?')) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    addNotification('info', 'Restoring database from file...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const buffer = reader.result;
        try {
          await SettingsService.restoreBackup(token!, buffer as ArrayBuffer);

          addNotification('success', 'System database restored successfully! Application will reload.');
          setTimeout(() => {
            sessionStorage.clear();
            window.location.reload();
          }, 1500);
        } catch (uploadErr: any) {
          addNotification('error', uploadErr.message);
        } finally {
          setRestoring(false);
        }
      };
      
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      addNotification('error', err.message);
      setRestoring(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 select-none text-xs">
      {/* Title */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">Database Backup, Restore & Sync</h1>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Secure your accounting logs via cloud synchronization and archives</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Cloud Sync Settings */}
        <Card title="Supabase Cloud Synchronization" subtitle="Configure sync credentials to merge local SQLite data to the cloud">
          <form onSubmit={handleSaveSyncConfig} className="flex flex-col gap-4">
            <div className="flex items-center justify-between border border-slate-150 bg-slate-50/50 p-3.5 rounded-xl text-xs select-none">
              <span className="text-slate-550 flex items-center font-semibold">
                {isOnline ? <Wifi className="w-4 h-4 mr-2 text-emerald-500" /> : <WifiOff className="w-4 h-4 mr-2 text-slate-400" />}
                Connection Status
              </span>
              <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-md border ${isOnline ? 'bg-emerald-50 border-emerald-150 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                {isOnline ? 'Internet Online' : 'Offline Mode'}
              </span>
            </div>

            <Input
              label="Supabase API URL"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xyz.supabase.co"
              type="url"
              required
            />
            <Input
              label="Supabase API Key (Service Role)"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              placeholder="eyJhbGciOi..."
              type="password"
              required
            />
            
            <div className="flex gap-3 justify-end mt-2">
              <Button type="submit" variant="secondary" className="cursor-pointer font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs py-1.5 px-4 h-9">
                <Save className="w-4 h-4 mr-1.5" /> Save Credentials
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleTriggerSync}
                disabled={syncing || !supabaseUrl || !supabaseKey}
                className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9"
              >
                <Cloud className="w-4 h-4 mr-1.5" /> {syncing ? 'Syncing...' : 'Sync Cloud Now'}
              </Button>
            </div>
            
            {syncStatus !== 'idle' && (
              <div className={`mt-2 p-3.5 rounded-xl border text-xs font-semibold ${
                syncStatus === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800' : 
                syncStatus === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-indigo-50 border-indigo-150 text-indigo-850'
              }`}>
                {syncStatus === 'syncing' && 'Running database merge algorithm...'}
                {syncStatus === 'success' && `Sync Succeeded: ${syncMessage}`}
                {syncStatus === 'error' && `Sync Error: ${syncMessage}`}
              </div>
            )}
          </form>
        </Card>

        {/* Right Column: Database Services (Backup and Restore) */}
        <div className="flex flex-col gap-6">
          {/* Download Backup */}
          <Card title="Download Database Backup" subtitle="Save a local copy of your accounting transactions">
            <div className="flex flex-col gap-4 py-2">
              <p className="text-slate-500 leading-relaxed font-semibold">
                This action compiles the offline SQLite database file (.sqlite) into a compressed ZIP archive. Keep this file in a secure location as a cold storage backup.
              </p>
              <div className="flex mt-2">
                <Button 
                  type="button" 
                  variant="primary" 
                  onClick={handleBackupClick}
                  className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Download ZIP Backup
                </Button>
              </div>
            </div>
          </Card>

          {/* Restore Backup */}
          <Card title="Restore Database Archive" subtitle="Restore local transactions from a backup ZIP file">
            <div className="flex flex-col gap-4 py-2">
              <p className="text-slate-500 leading-relaxed font-semibold">
                Select a previously downloaded `.zip` database backup file. 
                <span className="text-rose-600 font-bold block mt-1">WARNING: Restoring will completely overwrite all current transactions and reset the application.</span>
              </p>
              
              <div className="mt-2">
                <input
                  type="file"
                  accept=".zip"
                  onChange={handleRestoreDatabase}
                  disabled={restoring}
                  id="page-db-restore-input"
                  className="hidden"
                />
                <label htmlFor="page-db-restore-input">
                  <Button 
                    type="button"
                    variant="danger" 
                    disabled={restoring} 
                    className="cursor-pointer font-bold text-xs py-1.5 px-4 h-9"
                  >
                    <Upload className="w-4 h-4 mr-1.5" /> {restoring ? 'Restoring files...' : 'Select ZIP & Overwrite DB'}
                  </Button>
                </label>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
