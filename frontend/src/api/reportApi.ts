import axiosClient from "./axiosClient";

export interface ReportResult {
  report_type: string;
  report_name: string;
  columns: string[];
  rows: Record<string, any>[];
  total_records: number;
  filters_applied: Record<string, any>;
  generated_at: string;
}

export interface ReportHistoryItem {
  id: number;
  report_type: string;
  report_name: string;
  generated_by: string;
  filters_applied: string | null;
  format: string;
  total_records: number;
  status: string;
  created_at: string;
}

export interface Schedule {
  id: number;
  report_type: string;
  schedule_name: string;
  filters: string | null;
  frequency: string;
  execution_time: string | null;
  recipients: string | null;
  export_format: string;
  is_active: boolean;
  created_by: string;
  last_run: string | null;
  last_status: string | null;
  created_at: string;
}

export interface ScheduleData {
  report_type: string;
  schedule_name: string;
  filters?: Record<string, any>;
  frequency: string;
  execution_time?: string;
  recipients?: string;
  export_format?: string;
  is_active?: boolean;
}

export const reportApi = {
  generate: (report_type: string, filters: Record<string, any>, format = "table"): Promise<ReportResult> =>
    axiosClient.post("/api/reports/generate", { report_type, filters, format }).then((r) => r.data),

  history: (): Promise<ReportHistoryItem[]> =>
    axiosClient.get("/api/reports/history").then((r) => r.data),

  listSchedules: (): Promise<Schedule[]> =>
    axiosClient.get("/api/reports/schedules").then((r) => r.data),

  createSchedule: (data: ScheduleData): Promise<Schedule> =>
    axiosClient.post("/api/reports/schedules", data).then((r) => r.data),

  updateSchedule: (id: number, data: Partial<ScheduleData>): Promise<Schedule> =>
    axiosClient.put(`/api/reports/schedules/${id}`, data).then((r) => r.data),

  deleteSchedule: (id: number): Promise<any> =>
    axiosClient.delete(`/api/reports/schedules/${id}`).then((r) => r.data),

  toggleSchedule: (id: number): Promise<Schedule> =>
    axiosClient.patch(`/api/reports/schedules/${id}/toggle`).then((r) => r.data),

  runSchedule: (id: number): Promise<Schedule> =>
    axiosClient.post(`/api/reports/schedules/${id}/run`).then((r) => r.data),
};