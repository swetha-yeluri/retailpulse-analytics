import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Skeleton, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Stack, Divider, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  VerifiedUser, PlayArrow, Refresh, Visibility, CheckCircle,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  dataQualityApi, type QualityDashboard, type Issue, type IssueDetail,
  type ReconciliationHistoryItem,
} from "../api/dataQualityApi";

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info" | "default"> = {
  Error: "error", Warning: "warning", Info: "info",
};

const STATUS_COLOR: Record<string, "error" | "warning" | "success" | "default"> = {
  Open: "error", Investigating: "warning", Resolved: "success", Ignored: "default",
};

const MODULES = ["Sales", "Inventory", "Product", "Customer"];
const SEVERITIES = ["Error", "Warning", "Info"];
const STATUSES = ["Open", "Investigating", "Resolved", "Ignored"];

export default function DataQualityPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [tab, setTab] = useState(0);   

  
  const [severity, setSeverity] = useState("");
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<any>(null);

  
  const [selected, setSelected] = useState<number | null>(null);
  const [resolveStatus, setResolveStatus] = useState("Resolved");
  const [resolveNote, setResolveNote] = useState("");

  
  const { data: dashboard, refetch: refetchDashboard } = useQuery<QualityDashboard>({
    queryKey: ["dq-dashboard"],
    queryFn: () => dataQualityApi.dashboard(),
    staleTime: 30 * 1000,
  });

  const filters = useMemo(() => {
    const f: any = {};
    if (severity) f.severity = severity;
    if (module) f.module = module;
    if (status) f.status = status;
    if (search) f.search = search;
    return f;
  }, [severity, module, status, search]);

  
  const { data: issues = [], isLoading, refetch: refetchIssues } = useQuery<Issue[]>({
    queryKey: ["dq-issues", filters],
    queryFn: () => dataQualityApi.listIssues(filters),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  });

  
  const { data: detail } = useQuery<IssueDetail>({
    queryKey: ["dq-issue-detail", selected],
    queryFn: () => dataQualityApi.getIssue(selected!),
    enabled: selected !== null,
  });

  
  const { data: history = [], refetch: refetchHistory } = useQuery<ReconciliationHistoryItem[]>({
    queryKey: ["dq-history"],
    queryFn: () => dataQualityApi.history(),
    staleTime: 30 * 1000,
  });

  const applySearch = () => setSearch(searchInput);

  
  const runReconcile = async () => {
    setReconciling(true); setReconcileResult(null);
    try {
      const res = await dataQualityApi.reconcile();
      setReconcileResult(res);
      refetchDashboard();
      refetchIssues();
      refetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reconciliation failed");
    } finally { setReconciling(false); }
  };

  
  const doResolve = async () => {
    if (selected === null) return;
    try {
      await dataQualityApi.resolveIssue(selected, resolveStatus, resolveNote);
      setSelected(null); setResolveNote("");
      refetchIssues(); refetchDashboard();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const parseDetails = (s?: string | null) => {
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  };

  const kpiCards = [
    { label: "Records Checked", value: dashboard?.total_records_checked ?? "—", color: "#6366f1" },
    { label: "Valid Records", value: dashboard?.valid_records ?? "—", color: "#10b981" },
    { label: "Warnings", value: dashboard?.warnings ?? "—", color: "#f59e0b" },
    { label: "Errors", value: dashboard?.errors ?? "—", color: "#ef4444" },
    { label: "Unresolved", value: dashboard?.unresolved_issues ?? "—", color: "#8b5cf6" },
  ];

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <VerifiedUser sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Data Quality</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Detect and resolve data inconsistencies.
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" size="large" onClick={runReconcile} disabled={reconciling}
            startIcon={reconciling ? <CircularProgress size={18} /> : <PlayArrow />}>
            {reconciling ? "Running…" : "Run Reconciliation"}
          </Button>
        </Box>

        {/* Reconcile result */}
        {reconcileResult && (
          <Alert severity={reconcileResult.issues_detected > 0 ? "warning" : "success"}
            sx={{ mb: 3, borderRadius: 3 }} onClose={() => setReconcileResult(null)}>
            Reconciliation {reconcileResult.status} — {reconcileResult.records_checked} records checked,
            {" "}{reconcileResult.issues_detected} new issues detected.
          </Alert>
        )}

        {/* KPI CARDS */}
        <Grid container spacing={2.5} mb={4}>
          {kpiCards.map((c) => (
            <Grid item xs={6} sm={4} md={2.4} key={c.label}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                <Typography variant="h4" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                <Typography variant="body2" color="text.secondary" mt={0.5}>{c.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {dashboard?.last_reconciliation && (
          <Typography variant="body2" color="text.secondary" mb={3}>
            Last reconciliation: {new Date(dashboard.last_reconciliation).toLocaleString()}
          </Typography>
        )}

        {/* TABS */}
        <Paper elevation={0} sx={{ mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
            <Tab label="Issues" />
            <Tab label="Reconciliation History" />
          </Tabs>
        </Paper>

        {/* ============ TAB 0: ISSUES ============ */}
        {tab === 0 && (
          <>
            {/* Filters */}
            <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 4, border: "1px solid #eef0f4", display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <TextField placeholder="Search issues..." size="small" value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                sx={{ width: { xs: "100%", sm: 220 } }} />
              <TextField select size="small" label="Severity" value={severity}
                onChange={(e) => setSeverity(e.target.value)} sx={{ width: { xs: "100%", sm: 140 } }}>
                <MenuItem value="">All</MenuItem>
                {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Module" value={module}
                onChange={(e) => setModule(e.target.value)} sx={{ width: { xs: "100%", sm: 150 } }}>
                <MenuItem value="">All</MenuItem>
                {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Status" value={status}
                onChange={(e) => setStatus(e.target.value)} sx={{ width: { xs: "100%", sm: 150 } }}>
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <Button variant="outlined" onClick={applySearch}>Search</Button>
            </Paper>

            {/* Issues table */}
            <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef0f4", overflow: "hidden" }}>
              <TableContainer>
                <Table sx={{ minWidth: 900 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Record</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                      ))
                    ) : issues.length === 0 ? (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                        No data quality issues found. Run reconciliation to check.
                      </TableCell></TableRow>
                    ) : issues.map((i) => (
                      <TableRow key={i.id} hover>
                        <TableCell>{i.id}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{i.issue_type}</TableCell>
                        <TableCell><Chip label={i.severity} size="small" color={SEVERITY_COLOR[i.severity] || "default"} /></TableCell>
                        <TableCell>{i.affected_module}</TableCell>
                        <TableCell sx={{ color: "#64748b" }}>{i.affected_record || "—"}</TableCell>
                        <TableCell sx={{ maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }}>
                          {i.description}
                        </TableCell>
                        <TableCell><Chip label={i.status} size="small" color={STATUS_COLOR[i.status] || "default"} /></TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => { setSelected(i.id); setResolveStatus("Resolved"); setResolveNote(""); }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* ============ TAB 1: HISTORY ============ */}
        {tab === 1 && (
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography fontWeight={700} fontSize={16}>Reconciliation History</Typography>
              <Button size="small" startIcon={<Refresh />} onClick={() => refetchHistory()}>Refresh</Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Triggered By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Checked</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Detected</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                      No reconciliation runs yet.
                    </TableCell></TableRow>
                  ) : history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.id}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{h.triggered_by}</TableCell>
                      <TableCell align="right">{h.records_checked}</TableCell>
                      <TableCell align="right" sx={{ color: h.issues_detected > 0 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                        {h.issues_detected}
                      </TableCell>
                      <TableCell><Chip label={h.status} size="small"
                        color={h.status === "Completed" ? "success" : "warning"} /></TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{new Date(h.started_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ISSUE DETAIL + RESOLVE dialog */}
        <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Issue Details</DialogTitle>
          <DialogContent>
            {detail && (
              <Box>
                <Grid container spacing={2}>
                  {[
                    { label: "Type", value: detail.issue_type },
                    { label: "Severity", value: detail.severity },
                    { label: "Module", value: detail.affected_module },
                    { label: "Record", value: detail.affected_record },
                    { label: "Status", value: detail.status },
                    { label: "Detected", value: new Date(detail.detected_at).toLocaleString() },
                  ].map((f) => (
                    <Grid item xs={6} key={f.label}>
                      <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                      <Typography variant="body2" fontWeight={500}>{f.value || "—"}</Typography>
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2">{detail.description}</Typography>
                  </Grid>
                </Grid>

                {parseDetails(detail.details) && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight={600} mb={1}>Details</Typography>
                    <Paper sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                      <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
                        {JSON.stringify(parseDetails(detail.details), null, 2)}
                      </pre>
                    </Paper>
                  </>
                )}

                {detail.resolved_by && (
                  <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                    Resolved by {detail.resolved_by} — {detail.resolution_note || "No note"}
                  </Alert>
                )}

                {/* Resolve form (open/investigating issues) */}
                {detail.status !== "Resolved" && detail.status !== "Ignored" && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight={600} mb={1.5}>Update Status</Typography>
                    <Stack spacing={2}>
                      <TextField select label="New Status" value={resolveStatus}
                        onChange={(e) => setResolveStatus(e.target.value)} fullWidth size="small">
                        <MenuItem value="Investigating">Investigating</MenuItem>
                        <MenuItem value="Resolved">Resolved</MenuItem>
                        <MenuItem value="Ignored">Ignored</MenuItem>
                      </TextField>
                      <TextField label="Resolution Note" value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)} fullWidth multiline rows={2} />
                    </Stack>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelected(null)}>Close</Button>
            {detail && detail.status !== "Resolved" && detail.status !== "Ignored" && (
              <Button variant="contained" startIcon={<CheckCircle />} onClick={doResolve}>Update</Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}