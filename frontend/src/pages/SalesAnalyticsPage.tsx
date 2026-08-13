import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, CircularProgress, Alert, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  ToggleButton, ToggleButtonGroup, TextField, MenuItem, Chip, Stack, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Refresh, Download, PictureAsPdf, BarChart as BarIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { salesAnalyticsApi, type SalesAnalyticsData } from "../api/salesAnalyticsApi";
import { categoryApi, type Category } from "../api/categoryApi";

const DATE_FILTERS = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "custom", label: "Custom" },
];
const PAYMENTS = ["Cash", "Card", "UPI", "Bank Transfer"];
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6"];

export default function SalesAnalyticsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [dateFilter, setDateFilter] = useState("last_30_days");
  const [granularity, setGranularity] = useState("daily");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [productSort, setProductSort] = useState<"revenue" | "units_sold">("revenue");

  const customInvalid = dateFilter === "custom" && (!customFrom || !customTo);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const filters = useMemo(() => {
    const f: any = { date_filter: dateFilter, granularity };
    if (paymentMethod) f.payment_method = paymentMethod;
    if (categoryId) f.category_id = categoryId;
    if (dateFilter === "custom" && customFrom && customTo) {
      f.custom_from = customFrom;
      f.custom_to = customTo;
    }
    return f;
  }, [dateFilter, granularity, paymentMethod, categoryId, customFrom, customTo]);

  const {
    data, isLoading, isError, error, refetch, isFetching,
  } = useQuery<SalesAnalyticsData>({
    queryKey: ["sales-analytics", filters],
    queryFn: () => salesAnalyticsApi.get(filters),
    enabled: !customInvalid,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const kpi = data?.kpis;
  const money = (v?: number) =>
    v === undefined ? "—" : `₹${Number(v).toLocaleString("en-IN")}`;

  const kpiCards = [
    { label: "Total Revenue", value: money(kpi?.total_revenue), color: "#6366f1" },
    { label: "Total Orders", value: kpi?.total_orders ?? "—", color: "#10b981" },
    { label: "Avg Order Value", value: money(kpi?.average_order_value), color: "#f59e0b" },
    { label: "Total Items Sold", value: kpi?.total_items_sold ?? "—", color: "#3b82f6" },
    { label: "Total Discount", value: money(kpi?.total_discount), color: "#ef4444" },
    { label: "Total Tax", value: money(kpi?.total_tax), color: "#8b5cf6" },
  ];

  const sortedProducts = useMemo(() => {
    if (!data) return [];
    return [...data.top_products].sort((a, b) =>
      productSort === "revenue" ? b.revenue - a.revenue : b.units_sold - a.units_sold);
  }, [data, productSort]);

  const exportCSV = () => {
    if (!data) return;
    let csv = "RetailPulse Sales Analytics\n";
    csv += `Date Filter,${dateFilter}\n`;
    if (paymentMethod) csv += `Payment,${paymentMethod}\n`;
    csv += "\nKPIs\n";
    csv += `Total Revenue,${data.kpis.total_revenue}\n`;
    csv += `Total Orders,${data.kpis.total_orders}\n`;
    csv += `Avg Order Value,${data.kpis.average_order_value}\n`;
    csv += `Total Items Sold,${data.kpis.total_items_sold}\n`;
    csv += `Total Discount,${data.kpis.total_discount}\n`;
    csv += `Total Tax,${data.kpis.total_tax}\n\n`;
    csv += "Top Products\nProduct,Units Sold,Revenue\n";
    data.top_products.forEach((p) => { csv += `${p.product_name},${p.units_sold},${p.revenue}\n`; });
    csv += "\nTop Customers\nCustomer,Orders,Total Spend,Avg Order Value\n";
    data.top_customers.forEach((c) => { csv += `${c.customer_name},${c.orders},${c.total_spend},${c.average_order_value}\n`; });
    csv += "\nPayment Methods\nMethod,Transactions,Revenue\n";
    data.payment_methods.forEach((m) => { csv += `${m.method},${m.transaction_count},${m.revenue}\n`; });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-analytics-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!data) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Sales Analytics Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Filter: ${dateFilter}${paymentMethod ? " | " + paymentMethod : ""}`, 14, 26);
    let y = 38;
    doc.setFontSize(13); doc.text("KPIs", 14, y); y += 8;
    doc.setFontSize(10);
    doc.text(`Total Revenue: Rs.${data.kpis.total_revenue}`, 14, y); y += 6;
    doc.text(`Total Orders: ${data.kpis.total_orders}`, 14, y); y += 6;
    doc.text(`Avg Order Value: Rs.${data.kpis.average_order_value}`, 14, y); y += 6;
    doc.text(`Total Items Sold: ${data.kpis.total_items_sold}`, 14, y); y += 6;
    doc.text(`Total Discount: Rs.${data.kpis.total_discount}`, 14, y); y += 6;
    doc.text(`Total Tax: Rs.${data.kpis.total_tax}`, 14, y); y += 10;
    doc.setFontSize(13); doc.text("Top Products", 14, y); y += 7;
    doc.setFontSize(9);
    data.top_products.slice(0, 8).forEach((p) => {
      doc.text(`${p.product_name} — ${p.units_sold} units — Rs.${p.revenue}`, 14, y); y += 5;
    });
    y += 5;
    doc.setFontSize(13); doc.text("Top Customers", 14, y); y += 7;
    doc.setFontSize(9);
    data.top_customers.slice(0, 8).forEach((c) => {
      doc.text(`${c.customer_name} — ${c.orders} orders — Rs.${c.total_spend}`, 14, y); y += 5;
    });
    doc.save(`sales-analytics-${dateFilter}.pdf`);
  };

  const noData = data && data.kpis.total_orders === 0 && data.trend.length === 0;

  const SectionCard = ({ title, right, children, minHeight = 420 }: any) => (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        borderRadius: 4,
        border: "1px solid #eef0f4",
        height: "100%",
        minHeight,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
        <Typography fontWeight={700} fontSize={16}>{title}</Typography>
        {right}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            mb: 5,
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Sales Analytics</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Business intelligence from your sales data.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} sx={{ width: { xs: "100%", md: "auto" } }}>
            <Button fullWidth={isMobile} variant="outlined" size="large" startIcon={<Download />} onClick={exportCSV} disabled={!data}>CSV</Button>
            <Button fullWidth={isMobile} variant="outlined" size="large" startIcon={<PictureAsPdf />} onClick={exportPDF} disabled={!data}>PDF</Button>
            <Button fullWidth={isMobile} variant="contained" size="large" startIcon={<Refresh />} onClick={() => refetch()}>Refresh</Button>
          </Stack>
        </Box>

        {/* FILTERS */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 3.5 },
            mb: 5,
            borderRadius: 4,
            border: "1px solid #eef0f4",
            display: "flex",
            gap: 2.5,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField select size="small" label="Date Range" value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            sx={{ width: { xs: "100%", sm: 170 } }}>
            {DATE_FILTERS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
          </TextField>

          {dateFilter === "custom" && (
            <>
              <TextField type="date" size="small" label="From" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)} InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: "100%", sm: 170 } }} />
              <TextField type="date" size="small" label="To" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)} InputLabelProps={{ shrink: true }}
                sx={{ width: { xs: "100%", sm: 170 } }} />
            </>
          )}

          <TextField select size="small" label="Payment" value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            sx={{ width: { xs: "100%", sm: 160 } }}>
            <MenuItem value="">All Payments</MenuItem>
            {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Category" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: { xs: "100%", sm: 170 } }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          {isFetching && !isLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", ml: "auto" }}>
              <CircularProgress size={16} />
              <Typography fontSize={13}>Updating…</Typography>
            </Box>
          )}
        </Paper>

        {customInvalid && (
          <Alert severity="info" sx={{ mb: 4, borderRadius: 3, py: 1.5 }}>
            Please select both From and To dates to view custom-range analytics.
          </Alert>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3, py: 1.5 }}>
            {(error as any)?.response?.data?.detail || "Failed to load analytics. Please try again."}
          </Alert>
        )}

        {isLoading ? (
          <>
            <Grid container spacing={3} mb={5}>
              {[...Array(6)].map((_, i) => (
                <Grid item xs={12} sm={6} md={2} key={i}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #eef0f4" }}>
                    <Skeleton width="70%" height={22} />
                    <Skeleton width="50%" height={38} sx={{ mt: 1.5 }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Grid container spacing={4}>
              {[...Array(4)].map((_, i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #eef0f4", height: 420 }}>
                    <Skeleton width="40%" height={28} />
                    <Skeleton variant="rectangular" height={300} sx={{ mt: 3, borderRadius: 3 }} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        ) : noData ? (
          <Paper elevation={0} sx={{ p: 10, borderRadius: 4, border: "1px solid #eef0f4", textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>No sales data available</Typography>
            <Typography color="text.secondary" fontSize={15}>
              There are no sales for the selected period or filters. Try a different date range.
            </Typography>
          </Paper>
        ) : !data ? null : (
          <>
            {/* KPI CARDS */}
            <Grid container spacing={3} mb={5}>
              {kpiCards.map((c) => (
                <Grid item xs={12} sm={6} md={2} key={c.label}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3.5,
                      borderRadius: 4,
                      border: "1px solid #eef0f4",
                      borderLeft: `4px solid ${c.color}`,
                      height: "100%",
                      transition: "box-shadow .2s, transform .2s",
                      "&:hover": { boxShadow: "0 10px 30px rgba(0,0,0,.07)", transform: "translateY(-3px)" },
                    }}
                  >
                    <Typography variant="body2" color="text.secondary" noWrap fontSize={13.5}>{c.label}</Typography>
                    <Typography variant="h5" fontWeight="bold" mt={1.5} fontSize={22}>{c.value}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>

            {/* CHARTS + TABLES */}
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <SectionCard
                  title="Sales Overview (Revenue)"
                  right={
                    <ToggleButtonGroup value={granularity} exclusive size="small"
                      onChange={(_, v) => v && setGranularity(v)}>
                      <ToggleButton value="daily">Daily</ToggleButton>
                      <ToggleButton value="weekly">Weekly</ToggleButton>
                      <ToggleButton value="monthly">Monthly</ToggleButton>
                    </ToggleButtonGroup>
                  }
                >
                  {data.trend.length === 0 ? (
                    <Typography color="text.secondary">No data for this period.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} name="Revenue" />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <SectionCard title="Sales vs Orders">
                  {data.trend.length === 0 ? (
                    <Typography color="text.secondary">No data for this period.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" />
                        <XAxis dataKey="label" fontSize={12} tickLine={false} />
                        <YAxis yAxisId="left" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis yAxisId="right" orientation="right" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="revenue" fill="#6366f1" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={32} />
                        <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="Orders" radius={[6, 6, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <SectionCard
                  title="Top Products"
                  right={
                    <ToggleButtonGroup value={productSort} exclusive size="small"
                      onChange={(_, v) => v && setProductSort(v)}>
                      <ToggleButton value="revenue">Revenue</ToggleButton>
                      <ToggleButton value="units_sold">Qty</ToggleButton>
                    </ToggleButtonGroup>
                  }
                >
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }}>Product</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Units</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedProducts.length === 0 ? (
                          <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: "#94a3b8" }}>No products</TableCell></TableRow>
                        ) : sortedProducts.map((p, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 500, py: 2 }}>{p.product_name}</TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>{p.units_sold}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>₹{p.revenue.toLocaleString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <SectionCard title="Top Customers">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Orders</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Spend</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Avg</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.top_customers.length === 0 ? (
                          <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: "#94a3b8" }}>No customers</TableCell></TableRow>
                        ) : data.top_customers.map((c, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 500, py: 2 }}>{c.customer_name}</TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>{c.orders}</TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>₹{c.total_spend.toLocaleString("en-IN")}</TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>₹{c.average_order_value.toLocaleString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <SectionCard title="Payment Method Analysis">
                  {data.payment_methods.length === 0 ? (
                    <Typography color="text.secondary">No data for this period.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={data.payment_methods} dataKey="revenue" nameKey="method"
                          cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3}
                          label={(e: any) => e.method}>
                          {data.payment_methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>
              </Grid>

              <Grid item xs={12} md={6}>
                <SectionCard title="Payment Breakdown">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }}>Method</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Transactions</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: "#64748b", py: 2 }} align="right">Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.payment_methods.length === 0 ? (
                          <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4, color: "#94a3b8" }}>No data</TableCell></TableRow>
                        ) : data.payment_methods.map((m, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ py: 2 }}>
                              <Chip label={m.method} size="small" sx={{ bgcolor: COLORS[i % COLORS.length], color: "white", fontWeight: 600 }} />
                            </TableCell>
                            <TableCell align="right" sx={{ py: 2 }}>{m.transaction_count}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>₹{m.revenue.toLocaleString("en-IN")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </SectionCard>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </DashboardLayout>
  );
}