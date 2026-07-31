import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Grid, Button, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Chip, ToggleButton, ToggleButtonGroup,
} from "@mui/material";
import { Refresh, TrendingUp } from "@mui/icons-material";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { forecastApi, type ForecastData } from "../api/forecastApi";

const PERIODS = ["7 Days", "30 Days", "90 Days"];

const REC_COLOR: Record<string, "default" | "success" | "warning" | "error"> = {
  "Stock Level Healthy": "success",
  "Reorder Soon": "warning",
  "Overstock Risk": "default",
  "Immediate Restock Required": "error",
};

export default function ForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30 Days");

  const load = async (p: string) => {
    setLoading(true);
    try {
      setData(await forecastApi.get(p));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  const kpi = data?.kpis;
  const kpiCards = [
    { label: "Total Predicted Demand", value: kpi?.total_predicted_demand, color: "#6366f1" },
    { label: "Products Running Out", value: kpi?.products_expected_to_run_out, color: "#ef4444" },
    { label: "High Growth Products", value: kpi?.high_growth_products, color: "#10b981" },
    { label: "Slow Moving Products", value: kpi?.slow_moving_products, color: "#f59e0b" },
    { label: "Forecast Accuracy", value: kpi?.forecast_accuracy, color: "#8b5cf6", percent: true },
  ];

  const ChartBox = ({ title, children }: any) => (
    <Grid item xs={12} md={6}>
      <Paper sx={{ p: 3, borderRadius: 3, height: 340 }}>
        <Typography fontWeight={600} mb={2}>{title}</Typography>
        {children}
      </Paper>
    </Grid>
  );

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TrendingUp sx={{ color: "#6366f1" }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Demand Forecasting</Typography>
            <Typography color="text.secondary">Predict future product demand from sales history.</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {/* Period selector */}
          <ToggleButtonGroup value={period} exclusive size="small"
            onChange={(_, v) => v && setPeriod(v)}>
            {PERIODS.map((p) => <ToggleButton key={p} value={p}>{p}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<Refresh />} onClick={() => load(period)}>Refresh</Button>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : !data ? (
        <Typography color="text.secondary">No data available.</Typography>
      ) : data.product_forecasts.length === 0 ? (
        <Paper sx={{ p: 6, borderRadius: 3, textAlign: "center" }}>
          <Typography color="text.secondary">
            No forecast data. Add products and record some sales first — forecasts need sales history.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* KPI CARDS */}
          <Grid container spacing={2.5} mb={4}>
            {kpiCards.map((c) => (
              <Grid item xs={12} sm={6} md={2.4} key={c.label}>
                <Paper sx={{ p: 2.5, borderRadius: 3, borderLeft: `4px solid ${c.color}` }}>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                  <Typography variant="h5" fontWeight="bold" mt={0.5}>
                    {c.value === undefined ? "—" : c.percent ? `${c.value}%` : c.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* PRODUCT FORECAST TABLE */}
          <Paper sx={{ borderRadius: 3, overflow: "hidden", mb: 4 }}>
            <Typography fontWeight={600} sx={{ p: 2 }}>Product-Level Forecast</Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Current Stock</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Historical Sales</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Predicted Demand</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Confidence</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Recommendation</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.product_forecasts.map((p) => (
                    <TableRow key={p.product_id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{p.product_name}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{p.category_name}</TableCell>
                      <TableCell align="right">{p.current_stock}</TableCell>
                      <TableCell align="right">{p.historical_sales}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{p.predicted_demand}</TableCell>
                      <TableCell align="right">{p.confidence_level}%</TableCell>
                      <TableCell>
                        <Chip label={p.recommendation} size="small" color={REC_COLOR[p.recommendation] || "default"} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* CATEGORY FORECAST TABLE */}
          <Paper sx={{ borderRadius: 3, overflow: "hidden", mb: 4 }}>
            <Typography fontWeight={600} sx={{ p: 2 }}>Category-Level Forecast</Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Historical Sales</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Predicted Demand</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="right">Expected Growth</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.category_forecasts.map((c) => (
                    <TableRow key={c.category_name} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{c.category_name}</TableCell>
                      <TableCell align="right">{c.total_historical_sales}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{c.predicted_demand}</TableCell>
                      <TableCell align="right" sx={{ color: c.expected_growth >= 0 ? "#10b981" : "#ef4444" }}>
                        {c.expected_growth >= 0 ? "+" : ""}{c.expected_growth}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* CHARTS */}
          <Grid container spacing={3}>
            <ChartBox title="Historical Sales vs Forecast">
              {data.historical_vs_forecast.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.historical_vs_forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={10} angle={-20} textAnchor="end" height={60} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Product Demand Trend">
              {data.product_demand_trend.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.product_demand_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Predicted" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Category Demand Trend">
              {data.category_demand_trend.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.category_demand_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" maxBarSize={60} name="Predicted" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            <ChartBox title="Top Predicted Products">
              {data.top_predicted_products.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.top_predicted_products} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="label" fontSize={11} width={90} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" maxBarSize={20} name="Predicted Demand" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>
          </Grid>
        </>
      )}
    </DashboardLayout>
  );
}