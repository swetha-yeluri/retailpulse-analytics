import axiosClient from "./axiosClient";

export interface KPICards {
  total_revenue: number;
  total_orders: number;
  total_products_sold: number;
  average_order_value: number;
  total_inventory_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_categories: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface AnalyticsData {
  kpis: KPICards;
  revenue_trend: ChartPoint[];
  top_products: ChartPoint[];
  top_categories: ChartPoint[];
  sales_by_payment: ChartPoint[];
  sales_by_channel: ChartPoint[];
  inventory_by_category: ChartPoint[];
  stock_status: ChartPoint[];
  inventory_value_by_category: ChartPoint[];
}

export interface AnalyticsFilters {
  from_date?: string;
  to_date?: string;
  category_id?: number;
  channel?: string;
  payment?: string;
}

export const analyticsApi = {
  get: (filters: AnalyticsFilters = {}): Promise<AnalyticsData> =>
    axiosClient.get("/api/analytics", { params: filters }).then((r) => r.data),

  export: (): Promise<AnalyticsData> =>
    axiosClient.get("/api/analytics/export").then((r) => r.data),
};