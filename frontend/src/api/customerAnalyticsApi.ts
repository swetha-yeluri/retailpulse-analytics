import axiosClient from "./axiosClient";

export interface CustomerKPIs {
  total_customers: number;
  active_customers: number;
  new_this_month: number;
  returning_customers: number;
  average_spend: number;
  total_revenue: number;
  average_frequency: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface CustomerAnalyticsData {
  kpis: CustomerKPIs;
  growth_trend: ChartPoint[];
  revenue_by_type: ChartPoint[];
  customers_by_segment: ChartPoint[];
  top_customers: ChartPoint[];
  customers_by_city: ChartPoint[];
  new_vs_returning: ChartPoint[];
  customers_by_channel: ChartPoint[];
  revenue_trend: ChartPoint[];
}

export const customerAnalyticsApi = {
  get: (): Promise<CustomerAnalyticsData> =>
    axiosClient.get("/api/customer-analytics").then((r) => r.data),
};