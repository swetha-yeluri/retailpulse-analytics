import axiosClient from "./axiosClient";

export interface Product {
  id: number;
  name: string;
  sku: string;
  category_id: number;
  category_name: string;
  brand: string | null;
  description: string | null;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  unit_of_measure: string;
  status: string;
}

export interface ProductData {
  name: string;
  sku: string;
  category_id: number;
  brand: string;
  description: string;
  unit_price: number;
  cost_price: number;
  stock_quantity: number;
  unit_of_measure: string;
  status: string;
}

export interface ProductFilters {
  search?: string;
  category_id?: number;
  status?: string;
  brand?: string;
  sort_by?: string;
}

export interface Summary {
  total_products: number;
  active_products: number;
  inactive_products: number;
  total_categories: number;
}

export const productApi = {
  list: (filters: ProductFilters = {}) =>
    axiosClient.get("/api/products", { params: filters }).then((r) => r.data),

  create: (data: ProductData) =>
    axiosClient.post("/api/products", data).then((r) => r.data),

  update: (id: number, data: Partial<ProductData>) =>
    axiosClient.put(`/api/products/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    axiosClient.delete(`/api/products/${id}`).then((r) => r.data),

  summary: (): Promise<Summary> =>
    axiosClient.get("/api/products/summary").then((r) => r.data),
};