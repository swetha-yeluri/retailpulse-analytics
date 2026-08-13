import axiosClient from "./axiosClient";

export interface SalesKPIs {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_items_sold: number;
  total_discount: number;
  total_tax: number;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface ProductPerformance {
  product_name: string;
  units_sold: number;
  revenue: number;
}

export interface CustomerContribution {
  customer_name: string;
  orders: number;
  total_spend: number;
  average_order_value: number;
}

export interface PaymentMethodStat {
  method: string;
  transaction_count: number;
  revenue: number;
}

export interface SalesAnalyticsData {
  kpis: SalesKPIs;
  trend: TrendPoint[];
  top_products: ProductPerformance[];
  top_customers: CustomerContribution[];
  payment_methods: PaymentMethodStat[];
}

export interface AnalyticsFilters {
  date_filter?: string;      
  granularity?: string;     
  payment_method?: string;   
  category_id?: number;
  custom_from?: string;    
  custom_to?: string;
}

export const salesAnalyticsApi = {
  get: (filters: AnalyticsFilters = {}): Promise<SalesAnalyticsData> =>
    axiosClient.get("/api/analytics/sales", { params: filters }).then((r) => r.data),
};