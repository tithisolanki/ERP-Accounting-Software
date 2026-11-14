import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  companyService,
  userService,
  accountService,
  standardMasterService,
  qualityService,
  descriptionService,
  hsnService,
  primaryGroupService
} from '../services/masters.service';
import { dropdownRepository } from '../repositories/dropdown.repository';

export class CompanyController {
  async getCompanies(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const result = await companyService.getCompanies(req.user?.role || '', companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async createCompany(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only ADMIN can create companies.' });
    }
    try {
      const result = await companyService.createCompany(req.user, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateCompany(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (req.user.role !== 'ADMIN' || req.user.company_id !== id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    try {
      const result = await companyService.updateCompany(id, req.user, req.body);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export class UserController {
  async getUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await userService.getUsers(req.user?.role || '', req.user?.company_id || null);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async createUser(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    try {
      const result = await userService.createUser(req.user, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    try {
      await userService.deleteUser(id, req.user);
      return res.json({ success: true, message: 'User deleted.' });
    } catch (error: any) {
      const status = error.message.includes('Permission') || error.message.includes('Access denied') ? 403 : 400;
      return res.status(status).json({ error: error.message });
    }
  }
}

export class AccountController {
  async getAccounts(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const result = await accountService.getAccounts(companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async createAccount(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const result = await accountService.createAccount(companyId, req.user, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateAccount(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const result = await accountService.updateAccount(id, companyId, req.user, req.body);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      await accountService.deleteAccount(id, companyId, req.user);
      return res.json({ success: true, message: 'Account deleted successfully.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export class StandardMasterController {
  private tableMap: Record<string, { table: string; label: string }> = {
    groups: { table: 'groups', label: 'Group' },
    categories: { table: 'categories', label: 'Category' },
    brokers: { table: 'brokers', label: 'Broker' },
    cities: { table: 'cities', label: 'City' },
    states: { table: 'states', label: 'State' },
    transports: { table: 'transports', label: 'Transport' },
    'journal-voucher-types': { table: 'journal_voucher_types', label: 'Journal Voucher Type' }
  };

  private getInfo(path: string) {
    const info = this.tableMap[path];
    if (!info) throw new Error('Invalid master path.');
    return info;
  }

  async getItems(req: AuthenticatedRequest, res: Response, path: string) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const info = this.getInfo(path);
      const result = await standardMasterService.getItems(info.table, companyId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async createItem(req: AuthenticatedRequest, res: Response, path: string) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const info = this.getInfo(path);
      const result = await standardMasterService.createItem(info.table, info.label, companyId, req.user, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async updateItem(req: AuthenticatedRequest, res: Response, path: string) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const info = this.getInfo(path);
      const result = await standardMasterService.updateItem(info.table, info.label, id, companyId, req.user, req.body);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteItem(req: AuthenticatedRequest, res: Response, path: string) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    const companyId = req.user.company_id;
    const { id } = req.params;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      const info = this.getInfo(path);
      await standardMasterService.deleteItem(info.table, info.label, id, companyId, req.user);
      const action = info.table === 'categories' ? 'deactivated' : 'deleted';
      return res.json({ success: true, message: `${info.label} ${action} successfully.` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

function createMasterController(
  service: any,
  methods: { getAll: string; create: string; update: string; delete: string },
  label: string
) {
  return {
    async getAll(req: AuthenticatedRequest, res: Response) {
      const companyId = req.user?.company_id;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      try {
        const result = await service[methods.getAll](companyId);
        return res.json(result);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    },
    async create(req: AuthenticatedRequest, res: Response) {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const companyId = req.user.company_id;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      try {
        const result = await service[methods.create](companyId, req.user, req.body);
        return res.status(201).json(result);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    },
    async update(req: AuthenticatedRequest, res: Response) {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const companyId = req.user.company_id;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      try {
        const result = await service[methods.update](id, companyId, req.user, req.body);
        return res.json(result);
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    },
    async delete(req: AuthenticatedRequest, res: Response) {
      if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
      const companyId = req.user.company_id;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
      try {
        await service[methods.delete](id, companyId, req.user);
        return res.json({ success: true, message: `${label} deactivated successfully.` });
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    }
  };
}

export class DropdownController {
  async getDropdownCategories(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      return res.json(await dropdownRepository.getCategories(companyId));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDropdownQualities(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    const { category_id } = req.query;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    if (!category_id) return res.status(400).json({ error: 'category_id required.' });
    try {
      return res.json(await dropdownRepository.getQualities(companyId, category_id as string));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDropdownDescriptions(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      return res.json(await dropdownRepository.getDescriptions(companyId));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getDropdownHsnCodes(req: AuthenticatedRequest, res: Response) {
    const companyId = req.user?.company_id;
    if (!companyId) return res.status(400).json({ error: 'Company scope required.' });
    try {
      return res.json(await dropdownRepository.getHsnCodes(companyId));
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export class PrimaryGroupController {
  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await primaryGroupService.getAll();
      return res.json(result);
    } catch (error: any) {
      console.error('Error fetching primary groups:', error);
      return res.status(500).json({ error: error.message });

    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    return res.status(400).json({ error: 'Primary groups are fixed predefined structures and cannot be added.' });
  }

  async update(req: AuthenticatedRequest, res: Response) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized.' });
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Access denied. Only ADMIN can manage primary groups.' });
    const { id } = req.params;
    try {
      await primaryGroupService.update(id, req.user, req.body);
      return res.json({ success: true, message: 'Primary group updated.' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    return res.status(400).json({ error: 'Primary groups are fixed predefined structures and cannot be deleted.' });
  }
}

export const companyController = new CompanyController();
export const userController = new UserController();
export const accountController = new AccountController();
export const standardMasterController = new StandardMasterController();
export const qualityController = createMasterController(
  qualityService,
  { getAll: 'getQualities', create: 'createQuality', update: 'updateQuality', delete: 'deleteQuality' },
  'Quality'
);
export const descriptionController = createMasterController(
  descriptionService,
  { getAll: 'getDescriptions', create: 'createDescription', update: 'updateDescription', delete: 'deleteDescription' },
  'Description'
);
export const hsnController = createMasterController(
  hsnService,
  { getAll: 'getHsnCodes', create: 'createHsnCode', update: 'updateHsnCode', delete: 'deleteHsnCode' },
  'HSN Code'
);
export const dropdownController = new DropdownController();
export const primaryGroupController = new PrimaryGroupController();
