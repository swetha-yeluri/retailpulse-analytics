import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Grid, Button, CircularProgress,
} from "@mui/material";
import { Refresh, People } from "@mui/icons-material";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { customerAnalyticsApi, type CustomerAnalyticsData } from "../api/customerAnalyticsApi";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];

export default function CustomerAnalyticsPage() {
  const [data, setData] = useState<CustomerAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setData(await customerAnalyticsApi.get());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const kpi = data?.kpis;
  const kpiCards = [
    { label: "Total Customers", value: kpi?.total_customers, money: false, color: "#6366f1" },
    { label: "Active Customers", value: kpi?.active_customers, money: false, color: "#10b981" },
    { label: "New This Month", value: kpi?.new_this_month, money: false, color: "#3b82f6" },
    { label: "Returning Customers", value: kpi?.returning_customers, money: false, color: "#8b5cf6" },
    { label: "Avg Customer Spend", value: kpi?.average_spend, money: true, color: "#f59e0b" },
    { label: "Total Revenue", value: kpi?.total_revenue, money: true, color: "#10b981" },
    { label: "Avg Purchase Frequency", value: kpi?.average_frequency, money: false, color: "#ec4899" },
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
          <People sx={{ color: "#6366f1" }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">Customer Analytics</Typography>
            <Typography color="text.secondary">Customer insights and purchase behavior.</Typography>
          </Box>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={load}>Refresh</Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      ) : !data ? (
        <Typography color="text.secondary">No data available.</Typography>
      ) : (
        <>
          {/* KPI CARDS */}
          <Grid container spacing={2.5} mb={4}>
            {kpiCards.map((c) => (
              <Grid item xs={12} sm={6} md={3} key={c.label}>
                <Paper sx={{ p: 2.5, borderRadius: 3, borderLeft: `4px solid ${c.color}` }}>
                  <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                  <Typography variant="h5" fontWeight="bold" mt={0.5}>
                    {c.value === undefined ? "—"
                      : c.money ? `₹${Number(c.value).toLocaleString()}`
                      : c.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* CHARTS */}
          <Grid container spacing={3}>
            {/* Growth trend */}
            <ChartBox title="Customer Growth Trend">
              {data.growth_trend.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.growth_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} name="New Customers" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Revenue trend */}
            <ChartBox title="Revenue Trend">
              {data.revenue_trend.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.revenue_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Customers by segment */}
            <ChartBox title="Customers by Segment">
              {data.customers_by_segment.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.customers_by_segment} dataKey="value" nameKey="label"
                      cx="50%" cy="50%" outerRadius={90} label>
                      {data.customers_by_segment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Revenue by type */}
            <ChartBox title="Revenue by Customer Type">
              {data.revenue_by_type.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.revenue_by_type}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#6366f1" maxBarSize={80} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Top customers */}
            <ChartBox title="Top 10 Customers">
              {data.top_customers.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.top_customers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis type="category" dataKey="label" fontSize={11} width={90} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" maxBarSize={20} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* New vs Returning */}
            <ChartBox title="New vs Returning">
              {data.new_vs_returning.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.new_vs_returning} dataKey="value" nameKey="label"
                      cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
                      {data.new_vs_returning.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Customers by city */}
            <ChartBox title="Customers by City">
              {data.customers_by_city.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.customers_by_city}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" maxBarSize={60} name="Customers" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartBox>

            {/* Customers by channel */}
            <ChartBox title="Customers by Preferred Channel">
              {data.customers_by_channel.length === 0 ? <Typography color="text.secondary">No data</Typography> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={data.customers_by_channel} dataKey="value" nameKey="label"
                      cx="50%" cy="50%" outerRadius={90} label>
                      {data.customers_by_channel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartBox>
          </Grid>
        </>
      )}
    </DashboardLayout>
  );
}