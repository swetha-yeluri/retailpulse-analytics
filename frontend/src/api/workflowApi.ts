import axiosClient from "./axiosClient";

export interface Request {
  id: number;
  request_type: string;
  requested_by: string;
  related_record: string | null;
  status: string;
  priority: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface HistoryItem {
  action: string;
  performed_by: string;
  comment: string | null;
  timestamp: string;
}

export interface RequestDetail extends Request {
  current_values: string | null;
  requested_values: string | null;
  reviewed_by: string | null;
  review_comment: string | null;
  reviewed_at: string | null;
  related_id: number | null;
  history: HistoryItem[];
}

export interface RequestList {
  total: number;
  page: number;
  limit: number;
  requests: Request[];
}

export interface Config {
  id: number;
  request_type: string;
  approver_role: string;
  approval_required: boolean;
  is_active: boolean;
}

export interface RequestCreate {
  request_type: string;
  related_record?: string;
  related_id?: number;
  current_values?: Record<string, any>;
  requested_values: Record<string, any>;
  reason?: string;
  priority?: string;
}

export const workflowApi = {
  pendingCount: (): Promise<{ pending_count: number }> =>
    axiosClient.get("/api/workflow/pending-count").then((r) => r.data),

  listRequests: (filters: any = {}): Promise<RequestList> =>
    axiosClient.get("/api/workflow/requests", { params: filters }).then((r) => r.data),

  getDetail: (id: number): Promise<RequestDetail> =>
    axiosClient.get(`/api/workflow/requests/${id}`).then((r) => r.data),

  create: (data: RequestCreate): Promise<Request> =>
    axiosClient.post("/api/workflow/requests", data).then((r) => r.data),

  approve: (id: number, comment: string): Promise<RequestDetail> =>
    axiosClient.post(`/api/workflow/requests/${id}/approve`, { comment }).then((r) => r.data),

  reject: (id: number, comment: string): Promise<RequestDetail> =>
    axiosClient.post(`/api/workflow/requests/${id}/reject`, { comment }).then((r) => r.data),

  cancel: (id: number): Promise<RequestDetail> =>
    axiosClient.post(`/api/workflow/requests/${id}/cancel`).then((r) => r.data),

  listConfig: (): Promise<Config[]> =>
    axiosClient.get("/api/workflow/config").then((r) => r.data),

  createConfig: (data: any): Promise<Config> =>
    axiosClient.post("/api/workflow/config", data).then((r) => r.data),

  toggleConfig: (id: number): Promise<Config> =>
    axiosClient.patch(`/api/workflow/config/${id}/toggle`).then((r) => r.data),
};