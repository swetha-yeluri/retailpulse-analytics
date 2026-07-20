import axiosClient from "./axiosClient";

export interface Sale {
  id: number;
  invoice_number: string;
  customer_name: string;
  sale_date: string;
  sales_channel: string;
  payment_method: string;
  total_amount: number;
  created_by: string | null;
  product_id: number;
  product_name: string;
  category_id: number;
  category_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  remaining_stock: number;
  stock_alert: string;
}

export interface SaleData {
  customer_name: string;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount: number;
  tax: number;
  sales_channel: string;
  payment_method: string;
}

export interface SaleFilters {
  search?: string;
  category_id?: number;
  channel?: string;
  payment?: string;
  sort_by?: string;
}

export interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
}

export const salesApi = {
  list: (filters: SaleFilters = {}) =>
    axiosClient.get("/api/sales", { params: filters }).then((r) => r.data),

  create: (data: SaleData) =>
    axiosClient.post("/api/sales", data).then((r) => r.data),

  update: (id: number, data: Partial<SaleData>) =>
    axiosClient.put(`/api/sales/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    axiosClient.delete(`/api/sales/${id}`).then((r) => r.data),

  get: (id: number): Promise<Sale> =>
    axiosClient.get(`/api/sales/${id}`).then((r) => r.data),

  summary: (): Promise<SalesSummary> =>
    axiosClient.get("/api/sales/summary").then((r) => r.data),
};