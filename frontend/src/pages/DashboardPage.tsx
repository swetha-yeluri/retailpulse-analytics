import { useEffect, useState } from "react";
import { Box, Paper, Typography, Grid, Chip, Avatar } from "@mui/material";
import { Inventory2, CheckCircle, Cancel, Category } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { productApi, type Summary } from "../api/productApi";

const CARDS = [
  { key: "total_products", label: "Total Products", icon: <Inventory2 />, color: "#6366f1" },
  { key: "active_products", label: "Active Products", icon: <CheckCircle />, color: "#10b981" },
  { key: "inactive_products", label: "Inactive Products", icon: <Cancel />, color: "#f59e0b" },
  { key: "total_categories", label: "Total Categories", icon: <Category />, color: "#8b5cf6" },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    productApi.summary().then(setSummary).catch(() => {});
  }, []);

  if (!user) return null;

  const info = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Company", value: user.company_name },
    { label: "Status", value: user.status },
    { label: "Last Login", value: user.last_login ? new Date(user.last_login).toLocaleString() : "—" },
  ];

  return (
    <DashboardLayout>
      <Typography variant="h5" fontWeight="bold" mb={0.5}>
        Welcome back, {user.name}!
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Here's your account overview.
      </Typography>

      {/* Summary cards (Task 2) */}
      <Grid container spacing={3} mb={4}>
        {CARDS.map((card) => (
          <Grid item xs={12} sm={6} md={3} key={card.key}>
            <Paper sx={{ p: 3, borderRadius: 3, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{
                width: 48, height: 48, borderRadius: 2, bgcolor: `${card.color}15`,
                color: card.color, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {card.icon}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                <Typography variant="h5" fontWeight="bold">
                  {summary ? summary[card.key] : "—"}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Profile card (Task 1) */}
      <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 760 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "#6366f1", fontSize: 28 }}>
            {user.name[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{user.name}</Typography>
            <Chip label={user.role} color="primary" size="small" sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Grid container spacing={3}>
          {info.map((item) => (
            <Grid item xs={12} sm={6} key={item.label}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="body1" fontWeight={500}>{item.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </DashboardLayout>
  );
}