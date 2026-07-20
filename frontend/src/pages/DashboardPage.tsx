import { useEffect, useState } from "react";
import { Box, Paper, Typography, Grid, Chip, Avatar } from "@mui/material";
import {
  Inventory2, CheckCircle, Cancel, Category,
  ShoppingCart, Payments, Receipt, TrendingUp,
} from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { productApi, type Summary } from "../api/productApi";
import { salesApi, type SalesSummary } from "../api/salesApi";

export default function DashboardPage() {
  const { user } = useAuth();
  const [prod, setProd] = useState<Summary | null>(null);
  const [sales, setSales] = useState<SalesSummary | null>(null);

  useEffect(() => {
    productApi.summary().then(setProd).catch(() => {});
    salesApi.summary().then(setSales).catch(() => {});
  }, []);

  if (!user) return null;

  const salesCards = [
    { label: "Total Sales", value: sales?.total_sales, icon: <ShoppingCart />, color: "#6366f1", money: false },
    { label: "Total Revenue", value: sales?.total_revenue, icon: <Payments />, color: "#10b981", money: true },
    { label: "Total Orders", value: sales?.total_orders, icon: <Receipt />, color: "#3b82f6", money: false },
    { label: "Avg Order Value", value: sales?.average_order_value, icon: <TrendingUp />, color: "#f59e0b", money: true },
  ];

  const productCards = [
    { label: "Total Products", value: prod?.total_products, icon: <Inventory2 />, color: "#6366f1", money: false },
    { label: "Active Products", value: prod?.active_products, icon: <CheckCircle />, color: "#10b981", money: false },
    { label: "Inactive Products", value: prod?.inactive_products, icon: <Cancel />, color: "#ef4444", money: false },
    { label: "Total Categories", value: prod?.total_categories, icon: <Category />, color: "#8b5cf6", money: false },
  ];

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
      <Paper
        sx={{
          p: 2.5, borderRadius: 3, height: "100%",
          border: "1px solid #eef2f7",
          transition: "all 0.2s",
          "&:hover": { boxShadow: "0 8px 24px rgba(0,0,0,0.08)", transform: "translateY(-2px)" },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2.5, bgcolor: `${color}15`,
            color, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={0.5}>{label}</Typography>
        <Typography variant="h4" fontWeight="bold" color="#0f172a">
          {value === undefined ? "—" : money ? `₹${Number(value).toLocaleString()}` : value}
        </Typography>
      </Paper>
    </Grid>
  );

  const SectionTitle = ({ children }: any) => (
    <Typography
      variant="overline"
      sx={{ color: "#94a3b8", fontWeight: 700, letterSpacing: 1.2, display: "block", mb: 2 }}
    >
      {children}
    </Typography>
  );

  return (
    <DashboardLayout>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" color="#0f172a" mb={0.5}>
          Welcome back, {user.name.split(" ")[0]}! 👋
        </Typography>
        <Typography color="text.secondary">
          Here's what's happening with your business today.
        </Typography>
      </Box>

      {/* Sales section */}
      <SectionTitle>Sales Overview</SectionTitle>
      <Grid container spacing={2.5} mb={5}>
        {salesCards.map((c) => <StatCard key={c.label} {...c} />)}
      </Grid>

      {/* Inventory section */}
      <SectionTitle>Inventory Overview</SectionTitle>
      <Grid container spacing={2.5} mb={5}>
        {productCards.map((c) => <StatCard key={c.label} {...c} />)}
      </Grid>

      {/* Profile */}
      <SectionTitle>Account Details</SectionTitle>
      <Paper sx={{ p: 4, borderRadius: 3, border: "1px solid #eef2f7", maxWidth: 820 }}>
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