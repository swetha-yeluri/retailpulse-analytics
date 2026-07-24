import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider,
} from "@mui/material";
import {
  Dashboard, Analytics, Category, Inventory2, PointOfSale, Warehouse, History,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";

const NAV = [
  { label: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
  { label: "Analytics", icon: <Analytics />, path: "/analytics" },
  { label: "Categories", icon: <Category />, path: "/categories" },
  { label: "Products", icon: <Inventory2 />, path: "/products" },
  { label: "Sales", icon: <PointOfSale />, path: "/sales" },
  { label: "Inventory", icon: <Warehouse />, path: "/inventory" },
  { label: "Audit Logs", icon: <History />, path: "/audit-logs" },
];

const SIDEBAR_WIDTH = 250;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        bgcolor: "#0f172a",
        color: "#cbd5e1",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 1, py: 2, mb: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "10px", bgcolor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="white" fontWeight="bold">R</Typography>
        </Box>
        <Box>
          <Typography fontWeight="bold" color="white" lineHeight={1.2}>RetailPulse</Typography>
          <Typography variant="caption" color="#64748b">Analytics</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#1e293b", mb: 1.5 }} />

      <List sx={{ flexGrow: 1 }}>
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1,
                bgcolor: active ? "#6366f1" : "transparent",
                color: active ? "white" : "#cbd5e1",
                "&:hover": { bgcolor: active ? "#6366f1" : "#1e293b" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 38 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}