import { useEffect, useState } from "react";
import {
  Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip,
  TableContainer,
} from "@mui/material";

import DashboardLayout from "../layouts/DashboardLayout";
import { authApi } from "../api/authApi";

interface AuditLog {
  id: number;
  user_email: string | null;
  action: string;
  target_name: string | null;
  ip_address: string | null;
  browser: string | null;
  created_at: string;
}

function actionColor(action: string): "success" | "info" | "warning" | "error" | "default" {
  if (action.includes("Created") || action.includes("Registered") || action.includes("Activated")) return "success";
  if (action.includes("Deleted") || action.includes("Deactivated")) return "error";
  if (action.includes("Updated") || action.includes("Password")) return "warning";
  if (action.includes("Login")) return "info";
  return "default";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getAuditLogs()
      .then((data) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <Typography variant="h5" fontWeight="bold" mb={0.5}>
        Audit Logs
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Security and activity history for your company.
      </Typography>

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Performed By</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Browser</TableCell>
                <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} align="center">Loading...</TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                  No audit logs yet.
                </TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.user_email || "—"}</TableCell>
                    <TableCell>
                      <Chip label={log.action} size="small" color={actionColor(log.action)} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{log.target_name || "—"}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{log.ip_address || "—"}</TableCell>
                    <TableCell sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }}>
                      {log.browser || "—"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </DashboardLayout>
  );
}