import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/index';
import {
  companyRepository,
  userRepository,
  accountRepository,
  standardMasterRepository,
  qualityRepository,
  descriptionRepository,
  hsnRepository
} from '../repositories/masters.repository';
import { auditService } from './audit.service';
import { Company, UserMaster, Product, Account, StandardMaster, Quality, Description, HsnCode } from '../types/Masters';

export class CompanyService {
  async getCompanies(userRole: string, companyId: string): Promise<Company[]> {
    const company = await companyRepository.findById(companyId);
    return company ? [company] : [];
  }

  async createCompany(user: { id: string; username: string }, body: any): Promise<Company> {
    const { name, code, gst_number, pan_number, address, phone, email } = body;
    if (!name || !code) {
      throw new Error('Company Name and Code are required.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const company: Company = {
      id,
      name,
      code,
      gst_number,
      pan_number,
      address,
      phone,
      email,
      updated_at: now
    };

    await companyRepository.create(company);
    
    await auditService.log(null, user.id, user.username, 'Company Created', `Created company ${name} (${code})`);
    
    const newCompany = await companyRepository.findById(id);
    if (!newCompany) throw new Error('Failed to retrieve newly created company.');
    return newCompany;
  }

  async updateCompany(id: string, user: { id: string; username: string; company_id: string | null }, body: any): Promise<Company> {
    const { name, gst_number, pan_number, address, phone, email } = body;
    const now = new Date().toISOString();

    const company: Company = {
      id,
      name,
      code: '', // Not updated
      gst_number,
      pan_number,
      address,
      phone,
      email,
      updated_at: now
    };

    await companyRepository.update(id, company);
    await auditService.log(user.company_id, user.id, user.username, 'Company Updated', `Updated company data for: ${name}`);

    const updated = await companyRepository.findById(id);
    if (!updated) throw new Error('Failed to retrieve updated company.');
    return updated;
  }
}

export class UserService {
  async getUsers(userRole: string, companyId: string | null): Promise<UserMaster[]> {
    return userRepository.findAllForCompany(companyId || '');
  }

  async createUser(user: { id: string; username: string; company_id: string | null; role: string }, body: any): Promise<UserMaster> {
    const { username, password, role, name } = body;
    const companyId = user.company_id;

    if (!companyId) {
      throw new Error('Company scope required.');
    }

    if (!username || !password || !role || !name) {
      throw new Error('Missing required user parameters.');
    }

    if (role !== 'ADMIN' && role !== 'USER') {
      throw new Error('Invalid role specified. Only ADMIN or USER roles are supported.');
    }

    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    await userRepository.create({
      id,
      companyId,
      username,
      passwordHash: hash,
      role,
      name,
      now
    });

    await auditService.log(user.company_id, user.id, user.username, 'User Created', `Created user ${username} with role ${role}`);

    return { id, company_id: companyId, username, role, name };
  }

  async deleteUser(id: string, user: { id: string; username: string; company_id: string | null; role: string }): Promise<void> {
    if (user.id === id) {
      throw new Error('Cannot delete your own active user session.');
    }

    const userToDelete = await userRepository.findById(id);
    if (!userToDelete) {
      throw new Error('User not found.');
    }

    if (user.role === 'ADMIN' && userToDelete.company_id !== user.company_id) {
      throw new Error('Access denied to delete user from another company.');
    }

    await userRepository.delete(id);
    await auditService.log(user.company_id, user.id, user.username, 'User Deleted', `Deleted user: ${userToDelete.username}`);
  }
}

export function getGroupConfig(groupName: string | null) {
  const isDebtor = groupName === 'Sundry Debtors';
  const isCreditor = groupName === 'Sundry Creditors';
  const isBank = groupName === 'Bank Account';

  return {
    showMailingDetails: isDebtor || isCreditor,
    showStatutoryDetails: isDebtor || isCreditor,
    showBankingDetails: isBank,
    showTDSDetails: isCreditor,
  };
}

export class AccountService {
  async getAccounts(companyId: string): Promise<Account[]> {
    return accountRepository.findAll(companyId);
  }

  async createAccount(companyId: string, user: { id: string; username: string }, body: any): Promise<Account> {
    const {
      name, gst_number, contact_person, mobile_number, address, state, opening_balance, group_name, city,
      pin_code, dist_taluka, telephone_no, email, credit_days, pan_no, vat_tin_no, cst_tin_no, account_type, broker,
      tds_rate, tds_ledger, bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_holder
    } = body;

    if (!name) {
      throw new Error("Account Name is required.");
    }



    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const account: Account = {
      id,
      company_id: companyId,
      name,
      gst_number: gst_number || null,
      contact_person: contact_person || null,
      mobile_number: mobile_number || null,
      address: address || null,
      state: state || null,
      opening_balance: Number(opening_balance || 0),
      group_name: group_name || null,
      city: city || null,
      pin_code: pin_code || null,
      dist_taluka: dist_taluka || null,
      telephone_no: telephone_no || null,
      email: email || null,
      credit_days: Number(credit_days || 0),
      pan_no: pan_no || null,
      vat_tin_no: vat_tin_no || null,
      cst_tin_no: cst_tin_no || null,
      account_type: account_type || null,
      broker: broker || null,
      tds_rate: Number(tds_rate || 0),
      tds_ledger: tds_ledger || null,
      bank_name: bank_name || null,
      bank_branch: bank_branch || null,
      bank_account_no: bank_account_no || null,
      bank_ifsc: bank_ifsc || null,
      bank_account_holder: bank_account_holder || null,
      updated_at: now
    };

    await accountRepository.create(account);
    await auditService.log(companyId, user.id, user.username, 'Account Created', `Created Account ${name}`);

    const newAccount = await accountRepository.findById(id, companyId);
    if (!newAccount) throw new Error('Failed to retrieve newly created account.');
    return newAccount;
  }

  async updateAccount(id: string, companyId: string, user: { id: string; username: string }, body: any): Promise<Account> {
    const {
      name, gst_number, contact_person, mobile_number, address, state, opening_balance, group_name, city,
      pin_code, dist_taluka, telephone_no, email, credit_days, pan_no, vat_tin_no, cst_tin_no, account_type, broker,
      tds_rate, tds_ledger, bank_name, bank_branch, bank_account_no, bank_ifsc, bank_account_holder
    } = body;

    const account = await accountRepository.findById(id, companyId);
    if (!account) throw new Error('Account not found.');



    const now = new Date().toISOString();
    const updatedAccount: Account = {
      id,
      company_id: companyId,
      name,
      gst_number: gst_number || null,
      contact_person: contact_person || null,
      mobile_number: mobile_number || null,
      address: address || null,
      state: state || null,
      opening_balance: Number(opening_balance || 0),
      group_name: group_name || null,
      city: city || null,
      pin_code: pin_code || null,
      dist_taluka: dist_taluka || null,
      telephone_no: telephone_no || null,
      email: email || null,
      credit_days: Number(credit_days || 0),
      pan_no: pan_no || null,
      vat_tin_no: vat_tin_no || null,
      cst_tin_no: cst_tin_no || null,
      account_type: account_type || null,
      broker: broker || null,
      tds_rate: Number(tds_rate || 0),
      tds_ledger: tds_ledger || null,
      bank_name: bank_name || null,
      bank_branch: bank_branch || null,
      bank_account_no: bank_account_no || null,
      bank_ifsc: bank_ifsc || null,
      bank_account_holder: bank_account_holder || null,
      updated_at: now
    };

    await accountRepository.update(id, companyId, updatedAccount);
    await auditService.log(companyId, user.id, user.username, 'Account Updated', `Updated account details for ${name}`);

    const updated = await accountRepository.findById(id, companyId);
    if (!updated) throw new Error('Failed to retrieve updated account.');
    return updated;
  }

  async deleteAccount(id: string, companyId: string, user: { id: string; username: string }): Promise<void> {
    const account = await accountRepository.findById(id, companyId);
    if (!account) throw new Error('Account not found.');

    // Sales, purchases, payments, receipts and journal lines all reference accounts
    // with ON DELETE RESTRICT, so SQLite itself refuses to delete a used account.
    try {
      await accountRepository.delete(id);
    } catch (err: any) {
      if (String(err.message).includes('FOREIGN KEY')) {
        throw new Error('Cannot delete account with active transaction records.');
      }
      throw err;
    }
    await auditService.log(companyId, user.id, user.username, 'Account Deleted', `Deleted account: ${account.name}`);
  }
}

export class StandardMasterService {
  async getItems(table: string, companyId: string): Promise<StandardMaster[]> {
    return standardMasterRepository.findAll(table, companyId);
  }

  async createItem(table: string, label: string, companyId: string, user: { id: string; username: string }, body: any): Promise<StandardMaster> {
    const { name } = body;
    if (!name) throw new Error(`${label} Name is required.`);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const item: StandardMaster = {
      id,
      company_id: companyId,
      name,
      primary_group_id: body.primary_group_id || null,
      created_at: now,
      updated_at: now
    };

    await standardMasterRepository.create(table, item, table === 'categories');
    await auditService.log(companyId, user.id, user.username, `${label} Created`, `Created ${label}: ${name}`);

    const newItem = await standardMasterRepository.findById(table, id, companyId);
    if (!newItem) throw new Error(`Failed to retrieve newly created ${label}.`);
    return newItem;
  }

  async updateItem(table: string, label: string, id: string, companyId: string, user: { id: string; username: string }, body: any): Promise<StandardMaster> {
    const { name, is_active } = body;
    if (!name && is_active === undefined && body.primary_group_id === undefined) throw new Error('Name, Status, or Primary Group is required.');

    const item = await standardMasterRepository.findById(table, id, companyId);
    if (!item) throw new Error(`${label} not found.`);

    const now = new Date().toISOString();
    const updatedName = name !== undefined ? name : item.name;
    const updatedActive = is_active !== undefined ? Number(is_active) : (item.is_active !== undefined ? item.is_active : 1);

    await standardMasterRepository.update(table, id, companyId, updatedName, updatedActive, table === 'categories', now, body.primary_group_id);
    await auditService.log(companyId, user.id, user.username, `${label} Updated`, `Updated ${label} to ${updatedName}`);

    const updated = await standardMasterRepository.findById(table, id, companyId);
    if (!updated) throw new Error(`Failed to retrieve updated ${label}.`);
    return updated;
  }

  async deleteItem(table: string, label: string, id: string, companyId: string, user: { id: string; username: string }): Promise<void> {
    const item = await standardMasterRepository.findById(table, id, companyId);

    if (!item) throw new Error(`${label} not found.`);

    if (table === 'categories') {
      const now = new Date().toISOString();
      await standardMasterRepository.deactivateCategory(id, now);
      await auditService.log(companyId, user.id, user.username, `${label} Deactivated`, `Deactivated ${label}: ${item.name}`);
    } else {
      await standardMasterRepository.delete(table, id);
      await auditService.log(companyId, user.id, user.username, `${label} Deleted`, `Deleted ${label}: ${item.name}`);
    }
  }
}

export class QualityService {
  async getQualities(companyId: string): Promise<Quality[]> {
    return qualityRepository.findAll(companyId);
  }

  async createQuality(companyId: string, user: { id: string; username: string }, body: any): Promise<Quality> {
    const { category_id, name } = body;
    if (!category_id || !name) {
      throw new Error('Category and Quality Name are required.');
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const quality: Quality = {
      id,
      company_id: companyId,
      category_id,
      name,
      created_at: now,
      updated_at: now
    };

    await qualityRepository.create(quality);
    await auditService.log(companyId, user.id, user.username, 'Quality Created', `Created Quality ${name}`);

    const newItem = await qualityRepository.getJoinedResult(id);
    if (!newItem) throw new Error('Failed to retrieve newly created quality.');
    return newItem;
  }

  async updateQuality(id: string, companyId: string, user: { id: string; username: string }, body: any): Promise<Quality> {
    const { category_id, name, is_active } = body;
    if (!category_id || !name) {
      throw new Error('Category and Quality Name are required.');
    }

    const quality = await qualityRepository.findById(id, companyId);
    if (!quality) throw new Error('Quality not found.');

    const now = new Date().toISOString();
    const updatedName = name !== undefined ? name : quality.name;
    const updatedActive = is_active !== undefined ? Number(is_active) : (quality.is_active !== undefined ? quality.is_active : 1);

    const qualityToUpdate: Quality = {
      id,
      company_id: companyId,
      category_id,
      name: updatedName,
      is_active: updatedActive,
      updated_at: now
    };

    await qualityRepository.update(id, qualityToUpdate);
    await auditService.log(companyId, user.id, user.username, 'Quality Updated', `Updated Quality ${name}`);

    const updated = await qualityRepository.getJoinedResult(id);
    if (!updated) throw new Error('Failed to retrieve updated quality.');
    return updated;
  }

  async deleteQuality(id: string, companyId: string, user: { id: string; username: string }): Promise<void> {
    const quality = await qualityRepository.findById(id, companyId);
    if (!quality) throw new Error('Quality not found.');

    const now = new Date().toISOString();
    await qualityRepository.deactivate(id, now);
    await auditService.log(companyId, user.id, user.username, 'Quality Deactivated', `Deactivated Quality ${quality.name}`);
  }
}

function createSimpleMasterService<T extends { id: string; company_id: string; is_active?: number }>(
  repository: any,
  label: string,
  methods: { getAll: string; create: string; update: string; delete: string },
  validateAndBuild: (body: any, companyId: string, id: string, now: string) => T,
  getDisplayName: (item: T) => string
) {
  return {
    async [methods.getAll](companyId: string): Promise<T[]> {
      return repository.findAll(companyId);
    },

    async [methods.create](companyId: string, user: { id: string; username: string }, body: any): Promise<T> {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const item = validateAndBuild(body, companyId, id, now);
      await repository.create(item);
      await auditService.log(companyId, user.id, user.username, `${label} Created`, `Created ${label} ${getDisplayName(item)}`);

      const newItem = await repository.findById(id, companyId);
      if (!newItem) throw new Error(`Failed to retrieve newly created ${label.toLowerCase()}.`);
      return newItem;
    },

    async [methods.update](id: string, companyId: string, user: { id: string; username: string }, body: any): Promise<T> {
      const existing = await repository.findById(id, companyId);
      if (!existing) throw new Error(`${label} not found.`);

      const now = new Date().toISOString();
      const updatedFields = validateAndBuild({ ...existing, ...body }, companyId, id, now);

      if (body.is_active !== undefined) {
        updatedFields.is_active = Number(body.is_active);
      } else {
        updatedFields.is_active = existing.is_active !== undefined ? existing.is_active : 1;
      }

      await repository.update(id, updatedFields);
      await auditService.log(companyId, user.id, user.username, `${label} Updated`, `Updated ${label} ${getDisplayName(updatedFields)}`);

      const updated = await repository.findById(id, companyId);
      if (!updated) throw new Error(`Failed to retrieve updated ${label.toLowerCase()}.`);
      return updated;
    },

    async [methods.delete](id: string, companyId: string, user: { id: string; username: string }): Promise<void> {
      const existing = await repository.findById(id, companyId);
      if (!existing) throw new Error(`${label} not found.`);

      const now = new Date().toISOString();
      await repository.deactivate(id, now);
      await auditService.log(companyId, user.id, user.username, `${label} Deactivated`, `Deactivated ${label} ${getDisplayName(existing)}`);
    }
  };
}

export const descriptionService = createSimpleMasterService<Description>(
  descriptionRepository,
  'Description',
  { getAll: 'getDescriptions', create: 'createDescription', update: 'updateDescription', delete: 'deleteDescription' },
  (body, companyId, id, now) => {
    const { name } = body;
    if (!name) throw new Error('Description Name is required.');
    return {
      id,
      company_id: companyId,
      name,
      created_at: now,
      updated_at: now
    };
  },
  (item) => item.name
);

export const hsnService = createSimpleMasterService<HsnCode>(
  hsnRepository,
  'HSN Code',
  { getAll: 'getHsnCodes', create: 'createHsnCode', update: 'updateHsnCode', delete: 'deleteHsnCode' },
  (body, companyId, id, now) => {
    const { hsn_code, gst_percentage } = body;
    if (!hsn_code || gst_percentage === undefined) {
      throw new Error('HSN Code and GST Percentage are required.');
    }
    return {
      id,
      company_id: companyId,
      hsn_code: Number(hsn_code),
      gst_percentage: Number(gst_percentage),
      created_at: now,
      updated_at: now
    };
  },
  (item) => `${item.hsn_code} (${item.gst_percentage}%)`
);

export class PrimaryGroupService {
  async getAll(): Promise<any[]> {
    const db = await getDb();
    const templates = await db.all('SELECT * FROM primary_groups ORDER BY name ASC');
    return templates;
  }

  async create(user: { id: string; username: string }, body: any): Promise<any> {
    const { name, show_mailing, show_statutory, show_banking, show_tds } = body;
    if (!name) throw new Error('Primary Group Name is required.');

    const db = await getDb();
    const existing = await db.get('SELECT * FROM primary_groups WHERE name = ?', [name]);
    if (existing) throw new Error(`Primary group with name "${name}" already exists.`);

    const id = crypto.randomUUID();

    await db.run(
      `INSERT INTO primary_groups (id, name, show_mailing, show_statutory, show_banking, show_tds) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        show_mailing !== undefined ? Number(show_mailing) : 1,
        show_statutory !== undefined ? Number(show_statutory) : 1,
        show_banking !== undefined ? Number(show_banking) : 1,
        show_tds !== undefined ? Number(show_tds) : 1
      ]
    );

    await auditService.log(null, user.id, user.username, 'Primary Group Created', `Created Primary Group ${name}`);
    return { id, name };
  }

  async update(id: string, user: { id: string; username: string }, body: any): Promise<void> {
    const { name, show_mailing, show_statutory, show_banking, show_tds } = body;
    if (!name) throw new Error('Primary Group Name is required.');

    const db = await getDb();
    const template = await db.get('SELECT * FROM primary_groups WHERE id = ?', [id]);
    if (!template) throw new Error('Primary group not found.');

    await db.run(
      `UPDATE primary_groups SET name = ?, show_mailing = ?, show_statutory = ?, show_banking = ?, show_tds = ? WHERE id = ?`,
      [
        name,
        show_mailing !== undefined ? Number(show_mailing) : 1,
        show_statutory !== undefined ? Number(show_statutory) : 1,
        show_banking !== undefined ? Number(show_banking) : 1,
        show_tds !== undefined ? Number(show_tds) : 1,
        id
      ]
    );
    await auditService.log(null, user.id, user.username, 'Primary Group Updated', `Updated Primary Group ${name}`);
  }

  async delete(id: string, user: { id: string; username: string }): Promise<void> {
    const db = await getDb();
    const template = await db.get('SELECT * FROM primary_groups WHERE id = ?', [id]);
    if (!template) throw new Error('Primary group not found.');

    await db.run('DELETE FROM primary_groups WHERE id = ?', [id]);
    await auditService.log(null, user.id, user.username, 'Primary Group Deleted', `Deleted Primary Group ${template.name}`);
  }
}

export const companyService = new CompanyService();
export const userService = new UserService();
export const accountService = new AccountService();
export const standardMasterService = new StandardMasterService();
export const qualityService = new QualityService();
export const primaryGroupService = new PrimaryGroupService();
