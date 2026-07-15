import { Navigate } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { type ReactNode } from "react";

import { useAuth } from "../context/AuthContext";

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // role not allowed → show "access denied"
  if (!allowedRoles.includes(user.role)) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", bgcolor: "#f1f5f9" }}>
        <Typography variant="h4" fontWeight="bold" color="#ef4444" mb={1}>
          Access Denied
        </Typography>
        <Typography color="text.secondary">
          You don't have permission to view this page. (Your role: {user.role})
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}