import { Box, Typography, Avatar, IconButton, InputBase, Paper } from "@mui/material";
import { Logout, Search } from "@mui/icons-material";
import { type ReactNode } from "react";

import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";

const SIDEBAR_WIDTH = 250;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Box sx={{ bgcolor: "#f1f5f9", minHeight: "100vh", width: "100%" }}>
      <Sidebar />

      <Box
        sx={{
          ml: `${SIDEBAR_WIDTH}px`,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <Box
          sx={{
            height: 64,
            bgcolor: "white",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            px: 4,
            position: "sticky",
            top: 0,
            zIndex: 10,
            width: "100%",
          }}
        >
          <Typography variant="h6" fontWeight="bold" color="#0f172a">
            Dashboard
          </Typography>

          <Paper
            elevation={0}
            sx={{ ml: 4, px: 2, py: 0.6, display: "flex", alignItems: "center", gap: 1, bgcolor: "#f1f5f9", borderRadius: 2, width: 340 }}
          >
            <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
            <InputBase placeholder="Search anything..." sx={{ fontSize: 14, flexGrow: 1 }} />
          </Paper>

          <Box sx={{ flexGrow: 1 }} />

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

        {/* Page content */}
        <Box sx={{ flexGrow: 1, p: 4, width: "100%" }}>{children}</Box>
      </Box>
    </Box>
  );
}