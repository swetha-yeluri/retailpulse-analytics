import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, TableContainer, TextField, MenuItem, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Divider, Skeleton, Alert, Stack,
  Pagination, IconButton, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Search, Download, PictureAsPdf, Refresh, Visibility, History as HistoryIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import { auditApi, type AuditLog, type AuditLogDetail } from "../api/auditApi";

function actionColor(action: string): "success" | "info" | "warning" | "error" | "default" {
  const a = action.toLowerCase();
  if (a.includes("creat") || a.includes("added") || a.includes("registered") || a.includes("activated")) return "success";
  if (a.includes("delet") || a.includes("deactivat") || a.includes("removed")) return "error";
  if (a.includes("updat") || a.includes("password") || a.includes("adjust")) return "warning";
  if (a.includes("login") || a.includes("view")) return "info";
  return "default";
}

export default function AuditLogsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [user, setUser] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const limit = 25;

  
  const { data: options } = useQuery({
    queryKey: ["audit-filters"],
    queryFn: () => auditApi.getFilters(),
    staleTime: 60 * 1000,
  });

  const filters = useMemo(() => ({
    user, action, resource_type: resourceType, search,
    date_from: dateFrom || undefined, date_to: dateTo || undefined,
    sort, page, limit,
  }), [user, action, resourceType, search, dateFrom, dateTo, sort, page]);

  
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => auditApi.list(filters),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  
  const { data: detail } = useQuery<AuditLogDetail>({
    queryKey: ["audit-detail", selected],
    queryFn: () => auditApi.getDetail(selected!),
    enabled: selected !== null,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const applySearch = () => { setSearch(searchInput); setPage(1); };

  const parseJson = (s?: string | null) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  };

  
  const exportCSV = () => {
    if (logs.length === 0) return;
    let csv = "User,Action,Resource,Resource ID,Description,IP,Status,Timestamp\n";
    logs.forEach((l) => {
      csv += `"${l.user_email || ""}","${l.action}","${l.resource_type || ""}","${l.resource_id || ""}","${(l.description || "").replace(/"/g, "'")}","${l.ip_address || ""}","${l.status || ""}","${new Date(l.created_at).toLocaleString()}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit-logs.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  
  const exportPDF = async () => {
    if (logs.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text("Audit Logs Report", 14, 18);
    doc.setFontSize(9);
    let y = 30;
    logs.forEach((l) => {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(`${new Date(l.created_at).toLocaleString()} | ${l.user_email || "-"} | ${l.action} | ${l.resource_type || "-"}`, 14, y);
      y += 6;
    });
    doc.save("audit-logs.pdf");
  };

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HistoryIcon sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Audit Logs</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>Activity history for your company.</Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<Download />} onClick={exportCSV} disabled={logs.length === 0}>CSV</Button>
            <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPDF} disabled={logs.length === 0}>PDF</Button>
            <Button variant="contained" startIcon={<Refresh />} onClick={() => refetch()}>Refresh</Button>
          </Stack>
        </Box>

        {/* FILTERS */}
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 4, border: "1px solid #eef0f4", display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField placeholder="Search..." size="small" value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            sx={{ width: { xs: "100%", sm: 220 } }}
            InputProps={{ endAdornment: <IconButton size="small" onClick={applySearch}><Search fontSize="small" /></IconButton> }} />

          <TextField select size="small" label="User" value={user}
            onChange={(e) => { setUser(e.target.value); setPage(1); }} sx={{ width: { xs: "100%", sm: 160 } }}>
            <MenuItem value="">All Users</MenuItem>
            {options?.users.map((u: string) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Action" value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }} sx={{ width: { xs: "100%", sm: 160 } }}>
            <MenuItem value="">All Actions</MenuItem>
            {options?.actions.map((a: string) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Resource" value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); setPage(1); }} sx={{ width: { xs: "100%", sm: 150 } }}>
            <MenuItem value="">All Resources</MenuItem>
            {options?.resources.map((r: string) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField type="date" size="small" label="From" value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />
          <TextField type="date" size="small" label="To" value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }} InputLabelProps={{ shrink: true }} sx={{ width: 150 }} />

          <TextField select size="small" label="Sort" value={sort}
            onChange={(e) => setSort(e.target.value)} sx={{ width: 140 }}>
            <MenuItem value="newest">Newest First</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
          </TextField>

          {isFetching && !isLoading && <Typography fontSize={12} color="text.secondary">Updating…</Typography>}
        </Paper>

        {isError && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>Failed to load audit logs.</Alert>}

        {/* TABLE */}
        <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef0f4", overflow: "hidden" }}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Resource</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                    No activity found for the selected filters.
                  </TableCell></TableRow>
                ) : logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.user_email || "—"}</TableCell>
                    <TableCell><Chip label={log.action} size="small" color={actionColor(log.action)} /></TableCell>
                    <TableCell>{log.resource_type || "—"}{log.resource_id ? ` #${log.resource_id}` : ""}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }}>
                      {log.description || log.target_name || "—"}
                    </TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{log.ip_address || "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 13 }}>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => setSelected(log.id)}><Visibility fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* PAGINATION */}
        {total > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3, flexWrap: "wrap", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
          </Box>
        )}

        {/* DETAIL dialog */}
        <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Audit Log Details</DialogTitle>
          <DialogContent>
            {detail && (
              <Box>
                <Grid container spacing={2}>
                  {[
                    { label: "User", value: detail.user_email },
                    { label: "Action", value: detail.action },
                    { label: "Resource", value: detail.resource_type },
                    { label: "Resource ID", value: detail.resource_id },
                    { label: "Status", value: detail.status },
                    { label: "IP Address", value: detail.ip_address },
                    { label: "Browser", value: detail.browser },
                    { label: "Timestamp", value: new Date(detail.created_at).toLocaleString() },
                  ].map((f) => (
                    <Grid item xs={6} key={f.label}>
                      <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                      <Typography variant="body2" fontWeight={500}>{f.value || "—"}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{detail.description || "—"}</Typography>
                  </Grid>
                </Grid>

                {(parseJson(detail.before_values) || parseJson(detail.after_values)) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight={600} mb={1}>Changes</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, bgcolor: "#fef2f2", borderRadius: 2 }}>
                          <Typography variant="caption" color="error" fontWeight={600}>Before</Typography>
                          <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(parseJson(detail.before_values), null, 2)}
                          </pre>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 2 }}>
                          <Typography variant="caption" color="success.main" fontWeight={600}>After</Typography>
                          <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(parseJson(detail.after_values), null, 2)}
                          </pre>
                        </Paper>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}