import axiosClient from "./axiosClient";

export interface ProductForecast {
  product_id: number;
  product_name: string;
  category_name: string;
  current_stock: number;
  historical_sales: number;
  predicted_demand: number;
  forecast_period: string;
  confidence_level: number;
  recommendation: string;              
}

export interface CategoryForecast {
  category_id: number;
  category_name: string;
  total_historical_sales: number;
  predicted_demand: number;
  expected_growth: number;             
}

export interface ForecastKPIs {
  total_predicted_demand: number;
  products_expected_to_run_out: number;
  high_growth_products: number;
  slow_moving_products: number;
  forecast_accuracy: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ForecastData {
  kpis: ForecastKPIs;
  product_forecasts: ProductForecast[];
  category_forecasts: CategoryForecast[];
  historical_vs_forecast: ChartPoint[];
  product_demand_trend: ChartPoint[];
  category_demand_trend: ChartPoint[];
  top_predicted_products: ChartPoint[];
}

export const forecastApi = {
  get: (period: string = "30 Days"): Promise<ForecastData> =>
    axiosClient.get("/api/forecast", { params: { period } }).then((r) => r.data),
};