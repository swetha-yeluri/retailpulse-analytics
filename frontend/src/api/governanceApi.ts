import axiosClient from "./axiosClient";

export interface GovernanceDashboard {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_roles: number;
  pending_access_requests: number;
  elevated_permission_users: number;
  recent_permission_changes: number;
  last_review_date: string | null;
}

export interface MatrixRow {
  module: string;
  permissions: Record<string, string>;
}

export interface PermissionMatrix {
  roles: string[];
  rows: MatrixRow[];
}

export interface UserAccess {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  last_updated: string | null;
}

export interface AccessRequest {
  id: number;
  requested_by: string;
  current_role: string | null;
  requested_role: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  review_comment: string | null;
  created_at: string;
}

export interface AccessReview {
  id: number;
  user_email: string;
  user_role: string | null;
  review_status: string;
  review_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PermissionHistoryItem {
  id: number;
  target_user: string;
  previous_role: string | null;
  new_role: string | null;
  changed_by: string;
  reason: string | null;
  timestamp: string;
}

export const governanceApi = {
  dashboard: (): Promise<GovernanceDashboard> =>
    axiosClient.get("/api/governance/dashboard").then((r) => r.data),

  matrix: (): Promise<PermissionMatrix> =>
    axiosClient.get("/api/governance/matrix").then((r) => r.data),

  users: (): Promise<UserAccess[]> =>
    axiosClient.get("/api/governance/users").then((r) => r.data),

  updateRole: (userId: number, new_role: string, reason: string): Promise<any> =>
    axiosClient.put(`/api/governance/users/${userId}/role`, { new_role, reason }).then((r) => r.data),

  toggleStatus: (userId: number): Promise<any> =>
    axiosClient.patch(`/api/governance/users/${userId}/toggle-status`).then((r) => r.data),

  listRequests: (filters: any = {}): Promise<AccessRequest[]> =>
    axiosClient.get("/api/governance/requests", { params: filters }).then((r) => r.data),

  createRequest: (requested_role: string, reason: string): Promise<AccessRequest> =>
    axiosClient.post("/api/governance/requests", { requested_role, reason }).then((r) => r.data),

  approveRequest: (id: number, comment: string): Promise<AccessRequest> =>
    axiosClient.post(`/api/governance/requests/${id}/approve`, { comment }).then((r) => r.data),

  rejectRequest: (id: number, comment: string): Promise<AccessRequest> =>
    axiosClient.post(`/api/governance/requests/${id}/reject`, { comment }).then((r) => r.data),

  cancelRequest: (id: number): Promise<AccessRequest> =>
    axiosClient.post(`/api/governance/requests/${id}/cancel`).then((r) => r.data),

  listReviews: (): Promise<AccessReview[]> =>
    axiosClient.get("/api/governance/reviews").then((r) => r.data),

  createReview: (user_email: string, review_status: string, review_comment: string): Promise<AccessReview> =>
    axiosClient.post("/api/governance/reviews", { user_email, review_status, review_comment }).then((r) => r.data),

  history: (): Promise<PermissionHistoryItem[]> =>
    axiosClient.get("/api/governance/history").then((r) => r.data),
};