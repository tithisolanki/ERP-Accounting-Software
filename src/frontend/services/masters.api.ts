import {
  Account,
  PrimaryGroup,
  Company,
  Broker,
  City,
  State,
  Category,
  Quality,
  Description,
  HsnCode,
  JournalVoucherType,
  StandardMasterItem,
  UserMaster,
  CreateUserPayload
} from '@shared/types';
import { apiFetch } from './client';

export const AccountService = {
  async getAll(token: string): Promise<Account[]> {
    return apiFetch('/api/masters/accounts', token);
  },
  async create(account: Omit<Account, 'id'>, token: string): Promise<Account> {
    return apiFetch('/api/masters/accounts', token, { method: 'POST', body: JSON.stringify(account) });
  },
  async update(id: string, account: Partial<Account>, token: string): Promise<Account> {
    return apiFetch(`/api/masters/accounts/${id}`, token, { method: 'PUT', body: JSON.stringify(account) });
  },
  async delete(id: string, token: string): Promise<void> {
    await apiFetch(`/api/masters/accounts/${id}`, token, { method: 'DELETE' });
  }
};

export const GroupService = {
  async getAllTemplates(token: string): Promise<PrimaryGroup[]> {
    return apiFetch('/api/masters/primary-groups', token);
  },
  async createTemplate(template: Partial<PrimaryGroup>, token: string): Promise<PrimaryGroup> {
    return apiFetch('/api/masters/primary-groups', token, { method: 'POST', body: JSON.stringify(template) });
  },
  async updateTemplate(id: string, template: Partial<PrimaryGroup>, token: string): Promise<PrimaryGroup> {
    return apiFetch(`/api/masters/primary-groups/${id}`, token, { method: 'PUT', body: JSON.stringify(template) });
  },
  async deleteTemplate(id: string, token: string): Promise<void> {
    await apiFetch(`/api/masters/primary-groups/${id}`, token, { method: 'DELETE' });
  },
  async getCompanyGroups(token: string): Promise<PrimaryGroup[]> {
    return apiFetch('/api/masters/company-groups', token);
  },
  async getGroups(token: string): Promise<StandardMasterItem[]> {
    return apiFetch('/api/masters/groups', token);
  },
  async createGroup(group: { name: string; primary_group_id: string }, token: string): Promise<StandardMasterItem> {
    return apiFetch('/api/masters/groups', token, { method: 'POST', body: JSON.stringify(group) });
  },
  async updateGroup(id: string, group: { name: string; primary_group_id: string }, token: string): Promise<StandardMasterItem> {
    return apiFetch(`/api/masters/groups/${id}`, token, { method: 'PUT', body: JSON.stringify(group) });
  },
  async deleteGroup(id: string, token: string): Promise<void> {
    await apiFetch(`/api/masters/groups/${id}`, token, { method: 'DELETE' });
  }
};

export const CompanyService = {
  async getAll(token: string): Promise<Company[]> {
    return apiFetch('/api/masters/companies', token);
  },
  async create(company: Omit<Company, 'id'>, token: string): Promise<Company> {
    return apiFetch('/api/masters/companies', token, { method: 'POST', body: JSON.stringify(company) });
  },
  async update(id: string, company: Partial<Company>, token: string): Promise<Company> {
    return apiFetch(`/api/masters/companies/${id}`, token, { method: 'PUT', body: JSON.stringify(company) });
  },
  async getUsers(token: string): Promise<UserMaster[]> {
    return apiFetch('/api/masters/users', token);
  },

  async createUser(user: CreateUserPayload, token: string): Promise<UserMaster> {
    return apiFetch('/api/masters/users', token, { method: 'POST', body: JSON.stringify(user) });
  },
  async deleteUser(id: string, token: string): Promise<void> {
    await apiFetch(`/api/masters/users/${id}`, token, { method: 'DELETE' });
  }
};

export const LookupService = {
  async getCities(token: string): Promise<City[]> {
    return apiFetch('/api/masters/cities', token);
  },
  async getStates(token: string): Promise<State[]> {
    return apiFetch('/api/masters/states', token);
  },
  async getBrokers(token: string): Promise<Broker[]> {
    return apiFetch('/api/masters/brokers', token);
  },
  async getCategories(token: string): Promise<Category[]> {
    return apiFetch('/api/masters/categories', token);
  },
  async getQualities(token: string): Promise<Quality[]> {
    return apiFetch('/api/masters/qualities', token);
  },
  async getDescriptions(token: string): Promise<Description[]> {
    return apiFetch('/api/masters/descriptions', token);
  },
  async getHsnCodes(token: string): Promise<HsnCode[]> {
    return apiFetch('/api/masters/hsn-codes', token);
  },
  async getJournalVoucherTypes(token: string): Promise<JournalVoucherType[]> {
    return apiFetch('/api/masters/journal-voucher-types', token);
  },
  async getDropdownDescriptions(token: string): Promise<Description[]> {
    return apiFetch('/api/masters/dropdown/descriptions', token);
  },
  async getDropdownHsnCodes(token: string): Promise<HsnCode[]> {
    return apiFetch('/api/masters/dropdown/hsn-codes', token);
  },
  async getTransports(token: string): Promise<StandardMasterItem[]> {
    return apiFetch('/api/masters/transports', token);
  },
  async getGenericItems(endpoint: string, token: string): Promise<StandardMasterItem[]> {
    return apiFetch(`/api/masters/${endpoint}`, token);
  },
  async createGenericItem(endpoint: string, item: Record<string, unknown>, token: string): Promise<unknown> {
    return apiFetch(`/api/masters/${endpoint}`, token, { method: 'POST', body: JSON.stringify(item) });
  },
  async updateGenericItem(endpoint: string, id: string, item: Record<string, unknown>, token: string): Promise<unknown> {
    return apiFetch(`/api/masters/${endpoint}/${id}`, token, { method: 'PUT', body: JSON.stringify(item) });
  },
  async deleteGenericItem(endpoint: string, id: string, token: string): Promise<void> {
    await apiFetch(`/api/masters/${endpoint}/${id}`, token, { method: 'DELETE' });
  }
};
