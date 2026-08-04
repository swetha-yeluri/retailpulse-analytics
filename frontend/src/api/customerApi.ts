import axiosClient from "./axiosClient";

export interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  status: string;
  created_at: string;
  
  total_orders: number;
  total_revenue: number;
  last_purchase_date: string | null;
  segment: string;                  
}

export interface CustomerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
}

export interface CustomerFilters {
  search?: string;
  segment?: string;
  status?: string;
}

export const customerApi = {
  list: (filters: CustomerFilters = {}) =>               
    axiosClient.get("/api/customers", { params: filters }).then((r) => r.data),
  create: (data: CustomerData) =>                         
    axiosClient.post("/api/customers", data).then((r) => r.data),
  get: (id: number): Promise<Customer> =>                 
    axiosClient.get(`/api/customers/${id}`).then((r) => r.data),
  update: (id: number, data: Partial<CustomerData>) =>     
    axiosClient.put(`/api/customers/${id}`, data).then((r) => r.data),
  remove: (id: number) =>                                  
    axiosClient.delete(`/api/customers/${id}`).then((r) => r.data),
};