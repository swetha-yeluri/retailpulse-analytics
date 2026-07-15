import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Chip,
} from "@mui/material";

import DashboardLayout from "../layouts/DashboardLayout";
import { authApi } from "../api/authApi";

interface AuditLog {
  id: number;
  user_email: string | null;
  action: string;
  ip_address: string | null;
  browser: string | null;
  created_at: string;
}

const ACTION_COLOR: Record<string, "success" | "info" | "warning" | "error" | "default"> = {
  "Company Registered": "success",
  "User Login": "info",
  "User Logout": "default",
  "Password Changed": "warning",
};

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
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Browser</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "#94a3b8" }}>No audit logs yet.</TableCell></TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{log.user_email || "—"}</TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" color={ACTION_COLOR[log.action] || "default"} />
                  </TableCell>
                  <TableCell>{log.ip_address || "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.browser || "—"}
                  </TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </DashboardLayout>
  );
}