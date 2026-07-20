import { useEffect, useState, type ReactNode } from "react";
import {
  Box, Typography, Avatar, IconButton, InputBase, Paper, Badge, Menu, Divider,
} from "@mui/material";
import { Logout, Search, Notifications } from "@mui/icons-material";

import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";
import { productApi, type Product } from "../api/productApi";

const SIDEBAR_WIDTH = 250;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    productApi.list().then((products: Product[]) => {
      const low = products.filter(
        (p) => p.stock_quantity === 0 || p.stock_quantity < 10
      );
      setAlerts(low);
    }).catch(() => {});
  }, []);

  return (
    <Box sx={{ bgcolor: "#f1f5f9", minHeight: "100vh", width: "100%" }}>
      <Sidebar />

      <Box sx={{ ml: `${SIDEBAR_WIDTH}px`, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <Box
          sx={{
            height: 64, bgcolor: "white", borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", px: 4,
            position: "sticky", top: 0, zIndex: 10, width: "100%",
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="#0f172a">Dashboard</Typography>

          <Paper elevation={0}
            sx={{ ml: 4, px: 2, py: 0.6, display: "flex", alignItems: "center", gap: 1, bgcolor: "#f1f5f9", borderRadius: 2, width: 320 }}>
            <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
            <InputBase placeholder="Search anything..." sx={{ fontSize: 14, flexGrow: 1 }} />
          </Paper>

          <Box sx={{ flexGrow: 1 }} />

          {/* Notification bell */}
          <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
            <Badge badgeContent={alerts.length} color="error">
              <Notifications sx={{ color: "#64748b" }} />
            </Badge>
          </IconButton>

          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}
            PaperProps={{ sx: { width: 340, maxHeight: 420 } }}>
            <Typography sx={{ px: 2, py: 1.5, fontWeight: 600 }}>Notifications</Typography>
            <Divider />
            {alerts.length === 0 ? (
              <Box sx={{ px: 2, py: 3, textAlign: "center", color: "#94a3b8" }}>
                <Typography variant="body2">No stock alerts</Typography>
              </Box>
            ) : (
              alerts.map((p) => (
                <Box key={p.id} sx={{ px: 2, py: 1.2, borderBottom: "1px solid #f1f5f9" }}>
                  <Typography variant="body2" fontWeight={600}
                    color={p.stock_quantity === 0 ? "#ef4444" : "#f59e0b"}>
                    {p.stock_quantity === 0 ? "⚠️ Out of Stock" : "⚠️ Low Stock"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.name} — {p.stock_quantity} {p.unit_of_measure} left
                  </Typography>
                </Box>
              ))
            )}
          </Menu>

          {/* User */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 2 }}>
            <Avatar sx={{ bgcolor: "#6366f1", width: 38, height: 38 }}>
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="body2" fontWeight={600} color="#0f172a" lineHeight={1.2}>
                {user?.name}
              </Typography>
              <Typography variant="caption" color="#64748b">{user?.role}</Typography>
            </Box>
            <IconButton onClick={logout} title="Logout" sx={{ ml: 1 }}>
              <Logout sx={{ color: "#64748b" }} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1, p: 4, width: "100%" }}>{children}</Box>
      </Box>
    </Box>
  );
}