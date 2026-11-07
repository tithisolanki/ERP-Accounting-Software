import { API_URL, apiFetch, getHeaders } from './client';

export interface SettingsItem {
  key: string;
  value: string;
}

export interface SettingsResponse {
  global: SettingsItem[];
  company?: SettingsItem[];
}

export const SettingsService = {
  async getAll(token: string): Promise<SettingsResponse> {
    return apiFetch('/api/settings', token);
  },

  async save(token: string, settings: { key: string; value: string; isGlobal?: boolean }[]): Promise<void> {
    await apiFetch('/api/settings', token, { method: 'POST', body: JSON.stringify({ settings }) });
  },

  async sync(token: string): Promise<{ message: string }> {
    return apiFetch('/api/settings/sync', token, { method: 'POST' });
  },

  async downloadBackup(token: string): Promise<Blob> {
    const res = await fetch(`${API_URL}/api/settings/backup`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error('Backup request failed.');
    return res.blob();
  },

  async restoreBackup(token: string, buffer: ArrayBuffer): Promise<void> {
    const res = await fetch(`${API_URL}/api/settings/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/zip', Authorization: `Bearer ${token}` },
      body: buffer
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || 'Restore failed');
  }
};
