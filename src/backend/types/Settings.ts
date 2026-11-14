export interface SettingItem {
  key: string;
  value: string;
  isGlobal?: boolean;
}

export interface SettingsPayload {
  settings: SettingItem[];
}

export interface AuditLogItem {
  id: string;
  company_id: string | null;
  user_id: string;
  username: string;
  action: string;
  details: string | null;
  timestamp: string;
  is_dirty: number;
  updated_at: string;
}
