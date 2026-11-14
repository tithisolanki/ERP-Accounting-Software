import { Company, User } from '@shared/types';
import { API_URL, apiFetch } from './client';

export const AuthService = {
  async healthCheck(): Promise<{ status: string }> {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error('Server unreachable');
    return res.json();
  },

  async getCompanies(): Promise<Company[]> {
    const res = await fetch(`${API_URL}/api/auth/companies`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },

  async getCompanyUsers(companyId: string): Promise<User[]> {
    const res = await fetch(`${API_URL}/api/auth/companies/${companyId}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(payload: Record<string, unknown>): Promise<{
    token: string;
    user: User;
    company: Company;
    financialYear: string;
    loginDate: string;
    mustChangePassword?: boolean;
  }> {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },

  async changePassword(token: string, payload: Record<string, unknown>): Promise<void> {
    await apiFetch('/api/auth/change-password', token, { method: 'POST', body: JSON.stringify(payload) });
  }
};
