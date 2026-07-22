import { useEffect, useState } from "react";
import { Box, Paper, Typography, Grid, Chip, Avatar } from "@mui/material";
import {
  Inventory2, ShoppingCart, Payments, Receipt, TrendingUp,
  Warehouse, Warning, ReportProblem,
} from "@mui/icons-material";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { productApi, type Summary } from "../api/productApi";
import { salesApi, type SalesSummary } from "../api/salesApi";
import { inventoryApi, type InventorySummary, type Inventory } from "../api/inventoryApi";

const STATUS_COLORS: Record<string, string> = {
  "In Stock": "#10b981", "Low Stock": "#f59e0b", "Out of Stock": "#ef4444",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [prod, setProd] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [inv, setInv] = useState<InventorySummary | null>(null);
  const [invItems, setInvItems] = useState<Inventory[]>([]);

  useEffect(() => {
    productApi.summary().then(setProd).catch(() => {});
    salesApi.summary().then(setSales).catch(() => {});
    inventoryApi.summary().then(setInv).catch(() => {});
    inventoryApi.list().then(setInvItems).catch(() => {});
  }, []);

  if (!user) return null;

  const salesCards = [
    { label: "Total Sales", value: sales?.total_sales, icon: <ShoppingCart />, color: "#6366f1", money: false },
    { label: "Total Revenue", value: sales?.total_revenue, icon: <Payments />, color: "#10b981", money: true },
    { label: "Total Orders", value: sales?.total_orders, icon: <Receipt />, color: "#3b82f6", money: false },
    { label: "Avg Order Value", value: sales?.average_order_value, icon: <TrendingUp />, color: "#f59e0b", money: true },
  ];

  const invCards = [
    { label: "Total Products", value: inv?.total_products, icon: <Inventory2 />, color: "#6366f1", money: false },
    { label: "Total Inventory Qty", value: inv?.total_inventory_quantity, icon: <Warehouse />, color: "#8b5cf6", money: false },
    { label: "Low Stock", value: inv?.low_stock_products, icon: <Warning />, color: "#f59e0b", money: false },
    { label: "Out of Stock", value: inv?.out_of_stock_products, icon: <ReportProblem />, color: "#ef4444", money: false },
  ];

  const statusData = ["In Stock", "Low Stock", "Out of Stock"].map((s) => ({
    name: s,
    value: invItems.filter((i) => i.stock_status === s).length,
  })).filter((d) => d.value > 0);

  const catMap: Record<string, number> = {};
  invItems.forEach((i) => {
    catMap[i.category_name] = (catMap[i.category_name] || 0) + i.current_stock;
  });
  const categoryData = Object.entries(catMap).map(([name, qty]) => ({ name, qty }));

  const info = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Company", value: user.company_name },
    { label: "Status", value: user.status },
    { label: "Last Login", value: user.last_login ? new Date(user.last_login).toLocaleString() : "—" },
  ];

  const StatCard = ({ label, value, icon, color, money }: any) => (
    <Grid item xs={12} sm={6} md={3}>
      <Paper sx={{
        p: 3, borderRadius: 3, height: "100%", border: "1px solid #eef2f7",
        transition: "all 0.2s",
        "&:hover": { boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transform: "translateY(-2px)" },
      }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: 2.5, bgcolor: `${color}15`, color,
          display: "flex", alignItems: "center", justifyContent: "center", mb: 2,
        }}>{icon}</Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>{label}</Typography>
        <Typography variant="h4" fontWeight="bold" color="#0f172a">
          {value === undefined ? "—" : money ? `₹${Number(value).toLocaleString()}` : value}
        </Typography>
      </Paper>
    </Grid>
  );

  const SectionTitle = ({ children }: any) => (
    <Typography variant="overline" sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, display: "block", mb: 2 }}>
      {children}
    </Typography>
  );

  return (
    <DashboardLayout>
      {/* Page heading */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#0f172a" mb={0.5}>
          Dashboard
        </Typography>
        <Typography color="text.secondary">
          Welcome back, {user.name.split(" ")[0]}! Here's your business overview.
        </Typography>
      </Box>

      {/* Sales cards */}
      <SectionTitle>Sales Overview</SectionTitle>
      <Grid container spacing={3} mb={5}>
        {salesCards.map((c) => <StatCard key={c.label} {...c} />)}
      </Grid>

      {/* Inventory cards */}
      <SectionTitle>Inventory Overview</SectionTitle>
      <Grid container spacing={3} mb={4}>
        {invCards.map((c) => <StatCard key={c.label} {...c} />)}
      </Grid>

      {/* Charts — full width, spacious */}
      <SectionTitle>Analytics</SectionTitle>

      <Paper sx={{ p: 4, borderRadius: 3, border: "1px solid #eef2f7", mb: 3 }}>
        <Typography fontWeight={600} mb={0.3}>Stock Status Distribution</Typography>
        <Typography variant="caption" color="text.secondary">Products by stock status</Typography>
        {statusData.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 12, color: "#94a3b8" }}>No data yet</Box>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={90}
                outerRadius={150}
                paddingAngle={4}
                label={(e: any) => `${e.name}: ${e.value}`}
                labelLine={false}
              >
                {statusData.map((d) => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name]} stroke="#fff" strokeWidth={4} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" iconType="circle" height={40} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3, border: "1px solid #eef2f7", mb: 5 }}>
        <Typography fontWeight={600} mb={0.3}>Inventory by Category</Typography>
        <Typography variant="caption" color="text.secondary">Total stock quantity per category</Typography>
        {categoryData.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 12, color: "#94a3b8" }}>No data yet</Box>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={categoryData} margin={{ top: 30, right: 40, left: 10, bottom: 10 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={14} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} tick={{ fill: "#64748b" }} />
              <YAxis fontSize={13} tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
              <Bar dataKey="qty" fill="#6366f1" radius={[10, 10, 0, 0]} name="Stock Qty" maxBarSize={90} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Profile */}
      <SectionTitle>Account Details</SectionTitle>
      <Paper sx={{ p: 4, borderRadius: 3, border: "1px solid #eef2f7" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, mb: 3, pb: 3, borderBottom: "1px solid #f1f5f9" }}>
          <Avatar sx={{ width: 72, height: 72, bgcolor: "#6366f1", fontSize: 30, fontWeight: 600 }}>
            {user.name[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={600}>{user.name}</Typography>
            <Typography variant="body2" color="text.secondary" mb={0.5}>{user.email}</Typography>
            <Chip label={user.role} color="primary" size="small" />
          </Box>
        </Box>
        <Grid container spacing={3}>
          {info.map((item) => (
            <Grid item xs={12} sm={4} key={item.label}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
                {item.label}
              </Typography>
              <Typography variant="body1" fontWeight={500} mt={0.3}>{item.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </DashboardLayout>
  );
}