import axiosClient from "./axiosClient";

export interface Inventory {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category_name: string;
  brand: string | null;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_level: number;
  stock_status: string;
}

export interface StockAdjustData {
  product_id: number;
  adjustment_type: string;   
  quantity: number;
  reason: string;
  remarks: string;
}

export interface Movement {
  id: number;
  movement_type: string;
  quantity_changed: number;
  previous_quantity: number;
  updated_quantity: number;
  reason: string | null;
  remarks: string | null;
  performed_by: string | null;
  created_at: string;
}

export interface InventoryFilters {
  search?: string;
  category_id?: number;
  status?: string;
  brand?: string;
  sort_by?: string;
}

export interface InventorySummary {
  total_products: number;
  total_inventory_quantity: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export const inventoryApi = {
  list: (filters: InventoryFilters = {}) =>
    axiosClient.get("/api/inventory", { params: filters }).then((r) => r.data),

  summary: (): Promise<InventorySummary> =>
    axiosClient.get("/api/inventory/summary").then((r) => r.data),

  adjust: (data: StockAdjustData) =>
    axiosClient.post("/api/inventory/adjust", data).then((r) => r.data),

  updateReorder: (productId: number, reorder_level: number) =>
    axiosClient.put(`/api/inventory/reorder/${productId}`, { reorder_level }).then((r) => r.data),

  movements: (productId: number): Promise<Movement[]> =>
    axiosClient.get(`/api/inventory/movements/${productId}`).then((r) => r.data),
};