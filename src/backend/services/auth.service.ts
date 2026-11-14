import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { authRepository } from '../repositories/auth.repository';
import { auditService } from './audit.service';

// Passwords the seed script ships with (db/seed/seeds.ts). Anyone can read them in the
// source, so a user who still has one must pick a new password before doing anything else.
const DEFAULT_PASSWORDS = ['company123', 'user123'];

export class AuthService {
  async login(body: any) {
    const { companyCode, username, password, financialYear } = body;
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    let user = null;
    let company = null;

    if (!companyCode) {
      throw new Error('Company code is required.');
    }
    company = await authRepository.findCompanyByCode(companyCode);
    if (!company) {
      throw new Error('Company not found with specified code.');
    }
    user = await authRepository.findUserByUsernameAndCompany(username, company.id);

    if (!user) {
      throw new Error('Invalid credentials.');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('Invalid credentials.');
    }

    const mustChangePassword = DEFAULT_PASSWORDS.includes(password);

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        company_id: user.company_id,
        name: user.name,
        mustChangePassword
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await auditService.log(
      user.company_id,
      user.id,
      user.username,
      'User Login',
      `Logged in successfully for FY: ${financialYear || 'N/A'}`
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        company_id: user.company_id,
        name: user.name
      },
      company: company || { name: 'TexFin Administration', code: 'SUPER' },
      financialYear: financialYear || '2026-27',
      mustChangePassword
    };
  }

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error('User not found.');
    if (!user.company_id) throw new Error('User has no company context.');

    const company = await authRepository.findCompanyById(user.company_id);
    if (!company) throw new Error('Company not found.');

    return {
      user: {
        id: user.id,
        company_id: user.company_id,
        username: user.username,
        role: user.role,
        name: user.name
      },
      company
    };
  }

  async changePassword(userId: string, userObj: any, body: any) {
    const { currentPassword, newPassword } = body;
    if (!newPassword || String(newPassword).length < 6) throw new Error('New password must be at least 6 characters.');
    if (DEFAULT_PASSWORDS.includes(newPassword)) throw new Error('Please choose a password other than the default one.');
    const user = await authRepository.findUserById(userId);
    if (!user) throw new Error('User not found.');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new Error('Incorrect current password.');

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();
    await authRepository.updatePassword(userId, newHash, now);

    await auditService.log(
      userObj.company_id,
      userObj.id,
      userObj.username,
      'Change Password',
      'Password updated successfully'
    );
  }

  async getCompanies() {
    return authRepository.findAllCompanies();
  }

  async getUsersForCompany(companyId: string) {
    return authRepository.findUsersByCompanyId(companyId);
  }
}

export const authService = new AuthService();
