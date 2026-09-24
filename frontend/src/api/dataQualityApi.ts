import axiosClient from "./axiosClient";

export interface QualityDashboard {
  total_records_checked: number;
  valid_records: number;
  warnings: number;
  errors: number;
  unresolved_issues: number;
  last_reconciliation: string | null;
}

export interface Issue {
  id: number;
  issue_type: string;
  severity: string;
  affected_module: string;
  affected_record: string | null;
  description: string;
  status: string;
  detected_at: string;
}

export interface IssueDetail extends Issue {
  details: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  previous_status: string | null;
}

export interface ReconciliationResult {
  execution_id: number;
  records_checked: number;
  issues_detected: number;
  issues_resolved: number;
  failed_checks: number;
  status: string;
}

export interface ReconciliationHistoryItem {
  id: number;
  triggered_by: string;
  records_checked: number;
  issues_detected: number;
  issues_resolved: number;
  failed_checks: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface IssueFilters {
  issue_type?: string;
  severity?: string;
  module?: string;
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}

export const dataQualityApi = {
  dashboard: (): Promise<QualityDashboard> =>
    axiosClient.get("/api/data-quality/dashboard").then((r) => r.data),

  reconcile: (): Promise<ReconciliationResult> =>
    axiosClient.post("/api/data-quality/reconcile").then((r) => r.data),

  listIssues: (filters: IssueFilters = {}): Promise<Issue[]> =>
    axiosClient.get("/api/data-quality/issues", { params: filters }).then((r) => r.data),

  getIssue: (id: number): Promise<IssueDetail> =>
    axiosClient.get(`/api/data-quality/issues/${id}`).then((r) => r.data),

  resolveIssue: (id: number, status: string, resolution_note: string): Promise<IssueDetail> =>
    axiosClient.put(`/api/data-quality/issues/${id}/resolve`, { status, resolution_note }).then((r) => r.data),

  history: (): Promise<ReconciliationHistoryItem[]> =>
    axiosClient.get("/api/data-quality/history").then((r) => r.data),

  getFilters: () =>
    axiosClient.get("/api/data-quality/issues/filters").then((r) => r.data),
};