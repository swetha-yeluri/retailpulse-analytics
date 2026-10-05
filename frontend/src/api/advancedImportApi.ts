import axiosClient from "./axiosClient";

export interface RowError {
  row_number: number;
  record_info: string;
  error_type: string;
  error_message: string;
}

export interface ImportPreview {
  columns: string[];
  sample_rows: Record<string, any>[];
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  errors: RowError[];
  columns_valid: boolean;
  missing_columns: string[];
}

export interface ImportJob {
  id: number;
  import_type: string;
  filename: string;
  uploaded_by: string;
  status: string;
  progress: number;
  total_records: number;
  successful_records: number;
  failed_records: number;
  skipped_records: number;
  duplicate_records: number;
  processing_duration: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ImportSummary extends ImportJob {
  errors: RowError[];
}

export interface Template {
  import_type: string;
  columns: string[];
  sample_row: Record<string, any>;
}

const formData = (importType: string, file: File) => {
  const fd = new FormData();
  fd.append("import_type", importType);
  fd.append("file", file);
  return fd;
};

export const advancedImportApi = {
  getTemplate: (importType: string): Promise<Template> =>
    axiosClient.get(`/api/advanced-import/template/${importType}`).then((r) => r.data),

  validate: (importType: string, file: File): Promise<ImportPreview> =>
    axiosClient.post("/api/advanced-import/validate", formData(importType, file)).then((r) => r.data),

  upload: (importType: string, file: File): Promise<ImportJob> =>
    axiosClient.post("/api/advanced-import/upload", formData(importType, file)).then((r) => r.data),

  process: (jobId: number): Promise<ImportSummary> =>
    axiosClient.post(`/api/advanced-import/process/${jobId}`).then((r) => r.data),

  getStatus: (jobId: number): Promise<ImportJob> =>
    axiosClient.get(`/api/advanced-import/status/${jobId}`).then((r) => r.data),

  getDetail: (jobId: number): Promise<ImportSummary> =>
    axiosClient.get(`/api/advanced-import/detail/${jobId}`).then((r) => r.data),

  getErrors: (jobId: number): Promise<RowError[]> =>
    axiosClient.get(`/api/advanced-import/errors/${jobId}`).then((r) => r.data),

  cancel: (jobId: number): Promise<ImportJob> =>
    axiosClient.post(`/api/advanced-import/cancel/${jobId}`).then((r) => r.data),

  history: (): Promise<ImportJob[]> =>
    axiosClient.get("/api/advanced-import/history").then((r) => r.data),
};