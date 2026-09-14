import axiosClient from "./axiosClient";

export interface ImportPreview {
  columns: string[];
  rows: Record<string, any>[];
  total_records: number;
  detected_columns: string[];
}

export interface RowError {
  row_number: number;
  error: string;
  data: Record<string, any>;
}

export interface ValidationResult {
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  errors: RowError[];
  columns_valid: boolean;
  missing_columns: string[];
}

export interface ImportResult {
  import_id: number;
  total_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: string;
  errors: RowError[];
}

export interface ImportHistoryItem {
  id: number;
  import_type: string;
  filename: string;
  uploaded_by: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: string;
  created_at: string;
  completed_at: string;
}


const formData = (importType: string, file: File) => {
  const fd = new FormData();
  fd.append("import_type", importType);
  fd.append("file", file);
  return fd;
};

export const importApi = {
  preview: (importType: string, file: File): Promise<ImportPreview> =>
    axiosClient.post("/api/import/preview", formData(importType, file))
      .then((r) => r.data),

  validate: (importType: string, file: File): Promise<ValidationResult> =>
    axiosClient.post("/api/import/validate", formData(importType, file))
      .then((r) => r.data),

  process: (importType: string, file: File): Promise<ImportResult> =>
    axiosClient.post("/api/import/process", formData(importType, file))
      .then((r) => r.data),

  history: (): Promise<ImportHistoryItem[]> =>
    axiosClient.get("/api/import/history").then((r) => r.data),

  getErrors: (importId: number): Promise<RowError[]> =>
    axiosClient.get(`/api/import/${importId}/errors`).then((r) => r.data),
};