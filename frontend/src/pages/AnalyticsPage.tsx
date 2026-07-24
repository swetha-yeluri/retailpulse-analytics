import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Grid, TextField, MenuItem, Button, IconButton,
} from "@mui/material";
import { Refresh, Download, PictureAsPdf } from "@mui/icons-material";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { analyticsApi, type AnalyticsData } from "../api/analyticsApi";
import { categoryApi, type Category } from "../api/categoryApi";

const CHANNELS = ["Retail Store", "Online Store", "Marketplace"];
const PAYMENTS = ["Cash", "Card", "UPI", "Bank Transfer"];
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899"];
const STATUS_COLORS: Record<string, string> = {
  "In Stock": "#10b981", "Low Stock": "#f59e0b", "Out of Stock": "#ef4444",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [channel, setChannel] = useState("");
  const [payment, setPayment] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { channel, payment };
      if (fromDate) filters.from_date = fromDate;
      if (toDate) filters.to_date = toDate;
      if (categoryId) filters.category_id = categoryId;
      setData(await analyticsApi.get(filters));
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
    load();
  }, []);

  const clearFilters = () => {
    setFromDate(""); setToDate(""); setCategoryId(""); setChannel(""); setPayment("");
    setTimeout(load, 0);
  };

  
  const exportCSV = async () => {
    const d = await analyticsApi.export();
    let csv = "RetailPulse Analytics Report\n\nKPIs\n";
    csv += `Total Revenue,${d.kpis.total_revenue}\n`;
    csv += `Total Orders,${d.kpis.total_orders}\n`;
    csv += `Products Sold,${d.kpis.total_products_sold}\n`;
    csv += `Avg Order Value,${d.kpis.average_order_value}\n`;
    csv += `Inventory Value,${d.kpis.total_inventory_value}\n`;
    csv += `Low Stock,${d.kpis.low_stock_products}\n`;
    csv += `Out of Stock,${d.kpis.out_of_stock_products}\n`;
    csv += `Total Categories,${d.kpis.total_categories}\n\n`;
    csv += "Top Products,Revenue\n";
    d.top_products.forEach((p) => { csv += `${p.label},${p.value}\n`; });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "analytics-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // ---- PDF export ----
  const exportPDF = async () => {
    const d = await analyticsApi.export();
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("RetailPulse Analytics Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    let y = 42;
    doc.setFontSize(14); doc.text("Key Metrics", 14, y); y += 8;
    doc.setFontSize(11);
    const kpiLines = [
      `Total Revenue: Rs.${d.kpis.total_revenue.toLocaleString()}`,
      `Total Orders: ${d.kpis.total_orders}`,
      `Products Sold: ${d.kpis.total_products_sold}`,
      `Avg Order Value: Rs.${d.kpis.average_order_value.toLocaleString()}`,
      `Inventory Value: Rs.${d.kpis.total_inventory_value.toLocaleString()}`,
      `Low Stock: ${d.kpis.low_stock_products}`,
      `Out of Stock: ${d.kpis.out_of_stock_products}`,
      `Total Categories: ${d.kpis.total_categories}`,
    ];
    kpiLines.forEach((line) => { doc.text(line, 14, y); y += 7; });
    y += 5;
    doc.setFontSize(14); doc.text("Top Products", 14, y); y += 8;
    doc.setFontSize(11);
    d.top_products.slice(0, 10).forEach((p) => {
      doc.text(`${p.label}: Rs.${p.value.toLocaleString()}`, 14, y); y += 7;
    });
    doc.save("analytics-report.pdf");
  };

  const kpi = data?.kpis;

  const kpiCards = [
    { label: "Total Revenue", value: kpi?.total_revenue, money: true, color: "#6366f1" },
    { label: "Total Orders", value: kpi?.total_orders, money: false, color: "#10b981" },
    { label: "Products Sold", value: kpi?.total_products_sold, money: false, color: "#3b82f6" },
    { label: "Avg Order Value", value: kpi?.average_order_value, money: true, color: "#f59e0b" },
    { label: "Inventory Value", value: kpi?.total_inventory_value, money: true, color: "#8b5cf6" },
    { label: "Low Stock", value: kpi?.low_stock_products, money: false, color: "#f59e0b" },
    { label: "Out of Stock", value: kpi?.out_of_stock_products, money: false, color: "#ef4444" },
    { label: "Categories", value: kpi?.total_categories, money: false, color: "#ec4899" },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="#0f172a">Analytics</Typography>
          <Typography color="text.secondary">Business insights and performance metrics.</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={load}>Refresh</Button>
          <Button variant="outlined" startIcon={<Download />} onClick={exportCSV}>CSV</Button>
          <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPDF}>PDF</Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary">Filters:</Typography>
        <TextField type="date" size="small" label="From" value={fromDate}
          onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        <TextField type="date" size="small" label="To" value={toDate}
          onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
        <TextField select size="small" label="Category" value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))} sx={{ width: 150 }}>
          <MenuItem value="">All</MenuItem>
          {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Channel" value={channel}
          onChange={(e) => setChannel(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">All</MenuItem>
          {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Payment" value={payment}
          onChange={(e) => setPayment(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">All</MenuItem>
          {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <Button variant="contained" onClick={load}>Apply</Button>
        <Button onClick={clearFilters}>Clear</Button>
      </Paper>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : !data ? (
        <Typography color="text.secondary">No data available.</Typography>
      ) : (
        <>
          {/* KPI cards */}
          <Grid container spacing={2.5} mb={4}>
            {kpiCards.map((c) => (
              <Grid item xs={12} sm={6} md={3} key={c.label}>
                <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef2f7", borderLeft: `4px solid ${c.color}` }}>
                  <Typography variant="body2" color="text.secondary" mb={0.5}>{c.label}</Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {c.value === undefined ? "—" : c.money ? `₹${Number(c.value).toLocaleString()}` : c.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Revenue Trend */}
          <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", mb: 3 }}>
            <Typography fontWeight={600} mb={2}>Revenue Trend</Typography>
            {data.revenue_trend.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.revenue_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} name="Revenue" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>

          <Grid container spacing={3} mb={3}>
            {/* Top Products */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Top 10 Products (Revenue)</Typography>
                {data.top_products.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.top_products} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" fontSize={11} />
                      <YAxis type="category" dataKey="label" fontSize={11} width={100} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 6, 6, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Top Categories */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Top Categories (Revenue)</Typography>
                {data.top_categories.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.top_categories}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Sales by Payment */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Sales by Payment Method</Typography>
                {data.sales_by_payment.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={data.sales_by_payment} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} label>
                        {data.sales_by_payment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Sales by Channel */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Sales by Channel</Typography>
                {data.sales_by_channel.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={data.sales_by_channel} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={110} label>
                        {data.sales_by_channel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Inventory by Category */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Inventory by Category</Typography>
                {data.inventory_by_category.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.inventory_by_category}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Stock Qty" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Stock Status */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, border: "1px solid #eef2f7", height: 380 }}>
                <Typography fontWeight={600} mb={2}>Stock Status Distribution</Typography>
                {data.stock_status.length === 0 ? <Box sx={{ py: 6, textAlign: "center", color: "#94a3b8" }}>No data</Box> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={data.stock_status} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={110} label>
                        {data.stock_status.map((d, i) => <Cell key={i} fill={STATUS_COLORS[d.label] || COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </DashboardLayout>
  );
}