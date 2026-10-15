import axiosClient from "./axiosClient";

export interface ComponentHealth {
  component: string;
  status: string;
  detail: string | null;
}

export interface HealthResponse {
  overall_status: string;
  components: ComponentHealth[];
  last_checked: string;
}

export interface HealthDashboard {
  overall_status: string;
  api_available: boolean;
  avg_response_time: number;
  failed_api_requests: number;
  jobs_completed: number;
  jobs_failed: number;
  active_pending_jobs: number;
  recent_errors: number;
  last_health_check: string;
}

export interface Job {
  job_id: string;
  job_type: string;
  triggered_by: string;
  started_at: string | null;
  completed_at: string | null;
  duration: number;
  status: string;
  retry_count: number;
  failure_reason: string | null;
}

export interface SystemErrorItem {
  id: number;
  error_category: string;
  affected_component: string;
  source: string | null;
  severity: string;
  message: string;
  occurrence_count: number;
  status: string;
  first_seen: string;
  last_seen: string;
}

export interface IncidentHistoryItem {
  action: string;
  performed_by: string;
  note: string | null;
  timestamp: string;
}

export interface Incident {
  id: number;
  title: string;
  affected_component: string | null;
  severity: string;
  status: string;
  description: string | null;
  investigation_notes: string | null;
  resolution: string | null;
  created_by: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface IncidentDetail extends Incident {
  history: IncidentHistoryItem[];
}

export const monitoringApi = {
  health: (): Promise<HealthResponse> =>
    axiosClient.get("/api/monitoring/health").then((r) => r.data),

  dashboard: (): Promise<HealthDashboard> =>
    axiosClient.get("/api/monitoring/dashboard").then((r) => r.data),

  jobs: (filters: any = {}): Promise<Job[]> =>
    axiosClient.get("/api/monitoring/jobs", { params: filters }).then((r) => r.data),

  errors: (filters: any = {}): Promise<SystemErrorItem[]> =>
    axiosClient.get("/api/monitoring/errors", { params: filters }).then((r) => r.data),

  updateError: (id: number, status: string): Promise<any> =>
    axiosClient.put(`/api/monitoring/errors/${id}/status`, null, { params: { status } }).then((r) => r.data),

  listIncidents: (status = ""): Promise<Incident[]> =>
    axiosClient.get("/api/monitoring/incidents", { params: { status } }).then((r) => r.data),

  createIncident: (data: any): Promise<Incident> =>
    axiosClient.post("/api/monitoring/incidents", data).then((r) => r.data),

  getIncident: (id: number): Promise<IncidentDetail> =>
    axiosClient.get(`/api/monitoring/incidents/${id}`).then((r) => r.data),

  updateIncident: (id: number, data: any): Promise<IncidentDetail> =>
    axiosClient.put(`/api/monitoring/incidents/${id}`, data).then((r) => r.data),
};