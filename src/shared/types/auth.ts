export interface User {
  id: string;
  username: string;
  role: string;
  company_id: string | null;
  name: string;
}

export interface UserMaster {
  id: string;
  company_id: string | null;
  username: string;
  role: string;
  name: string;
  company_name?: string;
}

export interface CreateUserPayload {
  username: string;
  password?: string;
  role: string;
  name: string;
  targetCompanyId: string;
}
