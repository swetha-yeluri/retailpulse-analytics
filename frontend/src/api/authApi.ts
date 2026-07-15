import axiosClient from "./axiosClient";

export interface RegisterData {
  company_name: string;
  industry: string;
  company_email: string;
  company_address: string;
  company_phone: string;
  owner_name: string;
  owner_email: string;
  password: string;
  confirm_password: string;
  role: string;
}

export const authApi = {
  register: (data: RegisterData) =>
    axiosClient.post("/api/auth/register", data).then((r) => r.data),

  login: (email: string, password: string) =>
    axiosClient.post("/api/auth/login", { email, password }).then((r) => r.data),

  getProfile: () => axiosClient.get("/api/me").then((r) => r.data),

  logout: () => axiosClient.post("/api/auth/logout").then((r) => r.data),

  forgotPassword: (email: string, new_password: string, confirm_password: string) =>
    axiosClient.post("/api/auth/forgot-password", { email, new_password, confirm_password }).then((r) => r.data),

  getAuditLogs: () => axiosClient.get("/api/audit-logs").then((r) => r.data),
};