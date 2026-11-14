import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

// Single app-wide confirm dialog, driven by store.confirmRequest (see store/useStore.ts).
// Replaces window.confirm() so destructive actions get the app's own themed modal
// instead of a native browser dialog. Call it with `await confirm({ message, danger? })`.
export const ConfirmModal: React.FC = () => {
  const { confirmRequest, resolveConfirm } = useStore();
  const [typed, setTyped] = useState('');

  if (!confirmRequest) return null;
  const { title, message, danger, confirmLabel, requireText } = confirmRequest;
  const canConfirm = !requireText || typed.trim() === requireText;

  const close = (ok: boolean) => {
    setTyped('');
    resolveConfirm(ok);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => close(false)} />
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 z-10 animate-slide-in select-none">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-800">{title || (danger ? 'Confirm Delete' : 'Please Confirm')}</h3>
            <p className="text-xs text-slate-600 font-medium mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>

        {requireText && (
          <div className="mt-4">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Type "{requireText}" to confirm
            </label>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full mt-1.5 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-lg outline-none transition-all"
            />
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button type="button" variant="secondary" onClick={() => close(false)}>Cancel</Button>
          <Button type="button" variant={danger ? 'danger' : 'primary'} disabled={!canConfirm} onClick={() => close(true)}>
            {confirmLabel || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
};
