import axiosClient from "./axiosClient";

export interface ForecastRow {
  product_id: number;
  product_name: string;
  sku: string;
  category_name: string;
  current_stock: number;
  average_daily_sales: number;
  forecasted_demand: number;
  days_of_stock_remaining: number;
  reorder_point: number;
  recommended_reorder_quantity: number;
  safety_stock: number;
  stock_risk: string;                
  recommendation: string;
}

export interface ForecastSummary {
  products_requiring_reorder: number;
  products_at_stockout_risk: number;
  overstocked_products: number;
  healthy_products: number;
}

export interface ChartPoint {
  label: string;
  historical: number;
  forecasted: number;
}

export interface InventoryForecastData {
  summary: ForecastSummary;
  forecasts: ForecastRow[];
  demand_chart: ChartPoint[];
}

export interface ComparisonMetric {
  metric: string;
  current: number;
  recommended: number;
  action_needed: boolean;
}

export interface ComparisonPanel {
  product_id: number;
  product_name: string;
  metrics: ComparisonMetric[];
  notes: string[];
}

export interface ForecastFilters {
  risk?: string;
  category_id?: number;
  reorder_only?: boolean;
  sort_by?: string;
}

export const inventoryForecastApi = {
  get: (filters: ForecastFilters = {}): Promise<InventoryForecastData> =>
    axiosClient.get("/api/inventory/forecast", { params: filters }).then((r) => r.data),

  getRecommendation: (productId: number): Promise<ComparisonPanel> =>
    axiosClient.get(`/api/inventory/forecast/recommendations/${productId}`).then((r) => r.data),
};