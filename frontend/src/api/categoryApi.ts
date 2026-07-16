import axiosClient from "./axiosClient";

export interface Category {
  id: number;
  name: string;
  description: string | null;
  status: string;
  product_count: number;
}

export interface CategoryData {
  name: string;
  description: string;
  status: string;
}

export const categoryApi = {
  list: (search = "") =>
    axiosClient.get("/api/categories", { params: { search } }).then((r) => r.data),

  create: (data: CategoryData) =>
    axiosClient.post("/api/categories", data).then((r) => r.data),

  update: (id: number, data: Partial<CategoryData>) =>
    axiosClient.put(`/api/categories/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    axiosClient.delete(`/api/categories/${id}`).then((r) => r.data),
};