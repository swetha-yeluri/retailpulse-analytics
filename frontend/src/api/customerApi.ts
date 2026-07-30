import axiosClient from "./axiosClient";

export interface Customer {
  id: number;
  customer_code: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  customer_type: string;
  preferred_sales_channel: string | null;
  status: string;
  created_at: string;
  
  total_orders: number;
  total_revenue: number;
  total_products_purchased: number;
  average_order_value: number;
  last_purchase_date: string | null;
  first_purchase_date: string | null;
  segment: string;
}

export interface CustomerData {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  customer_type: string;
  preferred_sales_channel?: string;
  status: string;
}

export interface CustomerFilters {
  search?: string;
  customer_type?: string;
  status?: string;
  city?: string;
  sort_by?: string;
}

export interface CustomerSummary {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  returning_customers: number;
  average_customer_spend: number;
  total_revenue_generated: number;
  average_purchase_frequency: number;
}

export const customerApi = {
  list: (filters: CustomerFilters = {}) =>
    axiosClient.get("/api/customers", { params: filters }).then((r) => r.data),

  create: (data: CustomerData) =>
    axiosClient.post("/api/customers", data).then((r) => r.data),

  update: (id: number, data: Partial<CustomerData>) =>
    axiosClient.put(`/api/customers/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    axiosClient.delete(`/api/customers/${id}`).then((r) => r.data),

  get: (id: number): Promise<Customer> =>
    axiosClient.get(`/api/customers/${id}`).then((r) => r.data),

  toggleStatus: (id: number) =>
    axiosClient.patch(`/api/customers/${id}/toggle-status`).then((r) => r.data),

  summary: (): Promise<CustomerSummary> =>
    axiosClient.get("/api/customers/summary").then((r) => r.data),
};