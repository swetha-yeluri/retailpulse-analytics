import axiosClient from "./axiosClient";


export interface IntegrationDashboard {
  total_integrations: number;
  active_integrations: number;
  inactive_integrations: number;
  failed_integrations: number;
  last_sync_at: string | null;
  pending_jobs: number;
  records_synced: number;
  records_failed: number;
}

export interface Integration {
  id: number;
  name: string;
  source_type: string;
  target_module: string;
  auth_method: string;
  sync_frequency: string;
  config: Record<string, any>;
  has_secret: boolean;
  status: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_by: string;
  created_at: string;
}

export interface TargetField {
  field: string;
  label: string;
  required: boolean;
  type: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: string;
}

export interface Mapping {
  id?: number;
  source_field: string;
  target_field: string;
  is_required: boolean;
  data_type: string;
}

export interface SyncHistory {
  id: number;
  integration_id: number;
  integration_name: string;
  triggered_by: string;
  sync_type: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number;
  records_processed: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  status: string;
  summary?: string;
}

export interface FailedRecord {
  id: number;
  sync_id: number;
  source_identifier: string | null;
  row_number: number | null;
  error_category: string | null;
  error_message: string | null;
  processing_status: string;
}

export interface Schedule {
  id: number;
  integration_id: number;
  frequency: string;
  execution_time: string;
  is_active: boolean;
  next_run: string | null;
  last_run: string | null;
  last_result: string | null;
}


export const integrationApi = {
  dashboard: async (): Promise<IntegrationDashboard> =>
    (await axiosClient.get("/api/integrations/dashboard")).data,

  targetFields: async (module: string): Promise<TargetField[]> =>
    (await axiosClient.get(`/api/integrations/target-fields/${module}`)).data,

  list: async (): Promise<Integration[]> =>
    (await axiosClient.get("/api/integrations")).data,

  get: async (id: number): Promise<Integration> =>
    (await axiosClient.get(`/api/integrations/${id}`)).data,

  create: async (data: any): Promise<Integration> =>
    (await axiosClient.post("/api/integrations", data)).data,

  update: async (id: number, data: any): Promise<Integration> =>
    (await axiosClient.put(`/api/integrations/${id}`, data)).data,

  toggle: async (id: number): Promise<Integration> =>
    (await axiosClient.patch(`/api/integrations/${id}/toggle`)).data,

  remove: async (id: number): Promise<any> =>
    (await axiosClient.delete(`/api/integrations/${id}`)).data,

  testConnection: async (id: number): Promise<ConnectionTestResult> =>
    (await axiosClient.post(`/api/integrations/${id}/test`)).data,

  getMappings: async (id: number): Promise<Mapping[]> =>
    (await axiosClient.get(`/api/integrations/${id}/mappings`)).data,

  saveMappings: async (id: number, mappings: Mapping[]): Promise<Mapping[]> =>
    (await axiosClient.post(`/api/integrations/${id}/mappings`, { mappings })).data,

  runSync: async (id: number, sync_type = "Manual", strategy = "Insert"): Promise<SyncHistory> =>
    (await axiosClient.post(`/api/integrations/${id}/sync`, { sync_type, strategy })).data,

  history: async (integId?: number): Promise<SyncHistory[]> =>
    (await axiosClient.get("/api/integrations/history/all", {
      params: integId ? { integ_id: integId } : {},
    })).data,

  historyDetail: async (syncId: number): Promise<SyncHistory> =>
    (await axiosClient.get(`/api/integrations/history/${syncId}`)).data,

  failedRecords: async (syncId: number): Promise<FailedRecord[]> =>
    (await axiosClient.get(`/api/integrations/history/${syncId}/failed`)).data,

  retryFailed: async (syncId: number): Promise<any> =>
    (await axiosClient.post(`/api/integrations/history/${syncId}/retry`)).data,

  listSchedules: async (): Promise<Schedule[]> =>
    (await axiosClient.get("/api/integrations/schedules/all")).data,

  createSchedule: async (data: any): Promise<Schedule> =>
    (await axiosClient.post("/api/integrations/schedules", data)).data,

  toggleSchedule: async (id: number): Promise<Schedule> =>
    (await axiosClient.patch(`/api/integrations/schedules/${id}/toggle`)).data,

  deleteSchedule: async (id: number): Promise<any> =>
    (await axiosClient.delete(`/api/integrations/schedules/${id}`)).data,
};