import axiosClient from "./axiosClient";

export interface AuditLog {
  id: number;
  user_email: string | null;
  action: string;
  target_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  description: string | null;
  status: string | null;
  ip_address: string | null;
  browser: string | null;
  created_at: string;
}

export interface AuditLogDetail extends AuditLog {
  before_values: string | null;
  after_values: string | null;
}

export interface AuditLogList {
  total: number;
  page: number;
  limit: number;
  logs: AuditLog[];
}

export const auditApi = {
  list: (filters: any): Promise<AuditLogList> =>
    axiosClient.get("/api/audit-logs", { params: filters }).then((r) => r.data),

  getDetail: (id: number): Promise<AuditLogDetail> =>
    axiosClient.get(`/api/audit-logs/${id}`).then((r) => r.data),

  getFilters: () =>
    axiosClient.get("/api/audit-logs/filters").then((r) => r.data),
};