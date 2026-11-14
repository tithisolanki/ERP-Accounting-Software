import { create } from 'zustand';
import type { User, Company } from '@shared/types';

export type { User, Company };

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  // If set, the user must type this exact text before the Confirm button enables
  // (used for the few actions destructive enough that a click alone isn't enough friction).
  requireText?: string;
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

interface StoreState {
  token: string | null;
  user: User | null;
  company: Company | null;
  financialYear: string;
  loginDate: string;
  notifications: Notification[];
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncMessage: string | null;
  confirmRequest: ConfirmRequest | null;

  login: (token: string, user: User, company: Company, financialYear: string, loginDate: string) => void;
  logout: () => void;
  setLoginDate: (date: string) => void;
  addNotification: (type: Notification['type'], message: string) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
  setOnlineStatus: (status: boolean) => void;
  setSyncStatus: (status: StoreState['syncStatus'], message?: string | null) => void;
  // Replaces window.confirm with the app's own themed dialog; resolves true/false
  // once the user picks Confirm/Cancel (see <ConfirmModal/>, rendered once in App.tsx).
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
}

export const useStore = create<StoreState>((set, get) => {
  const cachedToken = sessionStorage.getItem('texfin_token');
  const cachedUser = sessionStorage.getItem('texfin_user');
  const cachedCompany = sessionStorage.getItem('texfin_company');
  const cachedFY = sessionStorage.getItem('texfin_fy') || '2026-27';
  const cachedDate = sessionStorage.getItem('texfin_date') || new Date().toISOString().split('T')[0];

  return {
    token: cachedToken,
    user: cachedUser ? JSON.parse(cachedUser) : null,
    company: cachedCompany ? JSON.parse(cachedCompany) : null,
    financialYear: cachedFY,
    loginDate: cachedDate,
    notifications: [],
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    syncMessage: null,
    confirmRequest: null,

    login: (token, user, company, financialYear, loginDate) => {
      sessionStorage.setItem('texfin_token', token);
      sessionStorage.setItem('texfin_user', JSON.stringify(user));
      sessionStorage.setItem('texfin_company', JSON.stringify(company));
      sessionStorage.setItem('texfin_fy', financialYear);
      sessionStorage.setItem('texfin_date', loginDate);
      set({ token, user, company, financialYear, loginDate });
    },

    logout: () => {
      sessionStorage.removeItem('texfin_token');
      sessionStorage.removeItem('texfin_user');
      sessionStorage.removeItem('texfin_company');
      sessionStorage.removeItem('texfin_fy');
      sessionStorage.removeItem('texfin_date');
      set({ token: null, user: null, company: null, financialYear: '2026-27', loginDate: new Date().toISOString().split('T')[0] });
    },

    setLoginDate: (loginDate) => {
      sessionStorage.setItem('texfin_date', loginDate);
      set({ loginDate });
    },

    addNotification: (type, message) => {
      const id = String(Math.random());
      const newNotification: Notification = {
        id,
        type,
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: false
      };
      set((state) => ({
        notifications: [newNotification, ...state.notifications].slice(0, 50)
      }));
    },

    markAsRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      }));
    },

    clearNotifications: () => set({ notifications: [] }),
    setOnlineStatus: (isOnline) => set({ isOnline }),
    setSyncStatus: (syncStatus, syncMessage = null) => set({ syncStatus, syncMessage }),

    confirm: (options) => new Promise<boolean>((resolve) => {
      set({ confirmRequest: { ...options, resolve } });
    }),
    resolveConfirm: (ok) => {
      get().confirmRequest?.resolve(ok);
      set({ confirmRequest: null });
    }
  };
});
