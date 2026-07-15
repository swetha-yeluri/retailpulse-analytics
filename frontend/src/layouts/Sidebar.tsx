import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider,
} from "@mui/material";
import {
  Dashboard, Analytics, ShoppingCart, Inventory2, People,
  Warehouse, Assessment, NotificationsActive, Group, Settings,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";

const NAV = [
  { label: "Dashboard", icon: <Dashboard />, path: "/dashboard" },
  { label: "Analytics", icon: <Analytics />, path: "/analytics" },
  { label: "Sales", icon: <ShoppingCart />, path: "/sales" },
  { label: "Products", icon: <Inventory2 />, path: "/products" },
  { label: "Customers", icon: <People />, path: "/customers" },
  { label: "Inventory", icon: <Warehouse />, path: "/inventory" },
  { label: "Reports", icon: <Assessment />, path: "/reports" },
  { label: "Alerts", icon: <NotificationsActive />, path: "/alerts" },
  { label: "Users", icon: <Group />, path: "/users" },
  { label: "Settings", icon: <Settings />, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ width: 240, bgcolor: "#0f172a", color: "#cbd5e1", minHeight: "100vh", p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, py: 2 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "#6366f1" }} />
        <Box>
          <Typography fontWeight="bold" color="white">RetailPulse</Typography>
          <Typography variant="caption">Analytics</Typography>
        </Box>
      </Box>
      <Divider sx={{ borderColor: "#1e293b", mb: 1 }} />
      <List>
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2, mb: 0.5,
                bgcolor: active ? "#6366f1" : "transparent",
                color: active ? "white" : "#cbd5e1",
                "&:hover": { bgcolor: active ? "#6366f1" : "#1e293b" },
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}