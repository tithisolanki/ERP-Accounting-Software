import { insertAuditLog } from '../db/index';

export class AuditService {
  async log(
    companyId: string | null,
    userId: string,
    username: string,
    action: string,
    details: string
  ): Promise<void> {
    await insertAuditLog(companyId, userId, username, action, details);
  }
}
export const auditService = new AuditService();
