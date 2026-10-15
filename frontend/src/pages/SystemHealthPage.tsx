import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Divider, Stack, Skeleton, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  MonitorHeart, Refresh, Add, Visibility, CheckCircle, Circle,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  monitoringApi, type HealthResponse, type HealthDashboard,
  type Job, type SystemErrorItem, type Incident, type IncidentDetail,
} from "../api/monitoringApi";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  "Healthy": "success", "Degraded": "warning", "Unavailable": "error",
  "Completed": "success", "Completed with Errors": "warning",
  "Failed": "error", "Running": "warning", "Processing": "warning",
  "Pending": "default", "Uploaded": "default", "Cancelled": "default",
  "Open": "error", "Investigating": "warning", "Resolved": "success",
};

const SEVERITY_COLOR: Record<string, "error" | "warning" | "info" | "default"> = {
  "Critical": "error", "High": "error", "Medium": "warning", "Low": "info",
};

export default function SystemHealthPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const isAdmin = user?.role === "Super Admin" || user?.role === "Company Admin";

  const [tab, setTab] = useState(0);   // 0=Overview, 1=Jobs, 2=Errors, 3=Incidents

  const [jobStatusFilter, setJobStatusFilter] = useState("");
  const [errorSeverity, setErrorSeverity] = useState("");
  const [incidentStatus, setIncidentStatus] = useState("");

  const [selectedIncident, setSelectedIncident] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [incForm, setIncForm] = useState({ title: "", affected_component: "", severity: "Medium", description: "" });
  const [updateNote, setUpdateNote] = useState("");

  
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ["mon-health"],
    queryFn: () => monitoringApi.health(),
    refetchInterval: 30 * 1000,   
  });

  
  const { data: dashboard, refetch: refetchDash } = useQuery<HealthDashboard>({
    queryKey: ["mon-dashboard"],
    queryFn: () => monitoringApi.dashboard(),
    refetchInterval: 30 * 1000,
  });

  
  const { data: jobs = [], refetch: refetchJobs } = useQuery<Job[]>({
    queryKey: ["mon-jobs", jobStatusFilter],
    queryFn: () => monitoringApi.jobs(jobStatusFilter ? { status: jobStatusFilter } : {}),
    staleTime: 15 * 1000,
  });


  const { data: errors = [], refetch: refetchErrors } = useQuery<SystemErrorItem[]>({
    queryKey: ["mon-errors", errorSeverity],
    queryFn: () => monitoringApi.errors(errorSeverity ? { severity: errorSeverity } : {}),
    staleTime: 15 * 1000,
  });

  
  const { data: incidents = [], refetch: refetchIncidents } = useQuery<Incident[]>({
    queryKey: ["mon-incidents", incidentStatus],
    queryFn: () => monitoringApi.listIncidents(incidentStatus),
    staleTime: 15 * 1000,
  });

  
  const { data: incDetail } = useQuery<IncidentDetail>({
    queryKey: ["mon-incident-detail", selectedIncident],
    queryFn: () => monitoringApi.getIncident(selectedIncident!),
    enabled: selectedIncident !== null,
  });

  const overallColor = dashboard?.overall_status === "Healthy" ? "#10b981"
    : dashboard?.overall_status === "Degraded" ? "#f59e0b" : "#ef4444";

  const kpiCards = [
    { label: "Avg Response", value: dashboard ? `${dashboard.avg_response_time} ms` : "—", color: "#6366f1" },
    { label: "Jobs Completed", value: dashboard?.jobs_completed ?? "—", color: "#10b981" },
    { label: "Jobs Failed", value: dashboard?.jobs_failed ?? "—", color: "#ef4444" },
    { label: "Active/Pending", value: dashboard?.active_pending_jobs ?? "—", color: "#f59e0b" },
    { label: "Recent Errors", value: dashboard?.recent_errors ?? "—", color: "#8b5cf6" },
  ];

  const refreshAll = () => { refetchDash(); refetchJobs(); refetchErrors(); refetchIncidents(); };

  
  const doCreate = async () => {
    if (!incForm.title.trim()) { alert("Title required"); return; }
    await monitoringApi.createIncident(incForm);
    setCreateOpen(false);
    setIncForm({ title: "", affected_component: "", severity: "Medium", description: "" });
    refetchIncidents();
  };

  
  const doUpdateIncident = async (status: string) => {
    if (selectedIncident === null) return;
    await monitoringApi.updateIncident(selectedIncident, { status, note: updateNote, resolution: updateNote });
    setUpdateNote("");
    refetchIncidents();
    // refetch detail
    monitoringApi.getIncident(selectedIncident);
  };

  
  const resolveError = async (id: number, status: string) => {
    await monitoringApi.updateError(id, status);
    refetchErrors();
  };

  const SectionCard = ({ children, title, right }: any) => (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4", mb: 3 }}>
      {title && (
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography fontWeight={700} fontSize={16}>{title}</Typography>
          {right}
        </Box>
      )}
      {children}
    </Paper>
  );

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MonitorHeart sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>System Health</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Monitor application health, jobs, and incidents.
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<Refresh />} onClick={refreshAll}>Refresh</Button>
        </Box>

        {/* OVERALL STATUS banner */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 4, border: "1px solid #eef0f4", borderLeft: `6px solid ${overallColor}`, display: "flex", alignItems: "center", gap: 2 }}>
          <Circle sx={{ color: overallColor, fontSize: 18 }} />
          <Box>
            <Typography fontWeight={700} fontSize={18}>
              System Status: {dashboard?.overall_status || "Checking…"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last checked: {dashboard ? new Date(dashboard.last_health_check).toLocaleString() : "—"}
            </Typography>
          </Box>
        </Paper>

        {/* COMPONENT HEALTH */}
        <Grid container spacing={2.5} mb={4}>
          {health?.components.map((c) => {
            const col = c.status === "Healthy" ? "#10b981" : c.status === "Degraded" ? "#f59e0b" : "#ef4444";
            return (
              <Grid item xs={12} sm={4} key={c.component}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                    <Circle sx={{ color: col, fontSize: 12 }} />
                    <Typography fontWeight={600}>{c.component}</Typography>
                  </Box>
                  <Chip label={c.status} size="small" color={STATUS_COLOR[c.status] || "default"} sx={{ mb: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" display="block">{c.detail}</Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* KPI CARDS */}
        <Grid container spacing={2.5} mb={4}>
          {kpiCards.map((c) => (
            <Grid item xs={6} sm={4} md={2.4} key={c.label}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* TABS */}
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
            <Tab label="Background Jobs" />
            <Tab label="System Errors" />
            <Tab label="Incidents" />
          </Tabs>
        </Paper>

        {/* ===== TAB 0: JOBS ===== */}
        {tab === 0 && (
          <SectionCard title="Background Jobs"
            right={
              <TextField select size="small" label="Status" value={jobStatusFilter}
                onChange={(e) => setJobStatusFilter(e.target.value)} sx={{ width: 160 }}>
                <MenuItem value="">All</MenuItem>
                {["Completed", "Failed", "Processing", "Pending", "Cancelled"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            }>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Job ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Triggered By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>No jobs yet.</TableCell></TableRow>
                  ) : jobs.map((j) => (
                    <TableRow key={j.job_id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{j.job_id}</TableCell>
                      <TableCell>{j.job_type}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{j.triggered_by}</TableCell>
                      <TableCell align="right">{j.duration}s</TableCell>
                      <TableCell><Chip label={j.status} size="small" color={STATUS_COLOR[j.status] || "default"} /></TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{j.started_at ? new Date(j.started_at).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        )}

        {/* ===== TAB 1: ERRORS ===== */}
        {tab === 1 && (
          <SectionCard title="System Errors"
            right={
              <TextField select size="small" label="Severity" value={errorSeverity}
                onChange={(e) => setErrorSeverity(e.target.value)} sx={{ width: 160 }}>
                <MenuItem value="">All</MenuItem>
                {["Critical", "High", "Medium", "Low"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            }>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Count</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {errors.length === 0 ? (
                    <TableRow><TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 4, color: "#94a3b8" }}>No system errors. All healthy!</TableCell></TableRow>
                  ) : errors.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell>{e.error_category}</TableCell>
                      <TableCell>{e.affected_component}</TableCell>
                      <TableCell><Chip label={e.severity} size="small" color={SEVERITY_COLOR[e.severity] || "default"} /></TableCell>
                      <TableCell sx={{ maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }}>{e.message}</TableCell>
                      <TableCell align="right">{e.occurrence_count}</TableCell>
                      <TableCell><Chip label={e.status} size="small" color={STATUS_COLOR[e.status] || "default"} /></TableCell>
                      {isAdmin && (
                        <TableCell align="center">
                          {e.status !== "Resolved" && (
                            <Button size="small" onClick={() => resolveError(e.id, "Resolved")}>Resolve</Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        )}

        {/* ===== TAB 2: INCIDENTS ===== */}
        {tab === 2 && (
          <SectionCard title="Incidents"
            right={
              <Stack direction="row" spacing={1.5}>
                <TextField select size="small" label="Status" value={incidentStatus}
                  onChange={(e) => setIncidentStatus(e.target.value)} sx={{ width: 150 }}>
                  <MenuItem value="">All</MenuItem>
                  {["Open", "Investigating", "Resolved"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
                {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>New</Button>}
              </Stack>
            }>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {incidents.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: "#94a3b8" }}>No incidents.</TableCell></TableRow>
                  ) : incidents.map((i) => (
                    <TableRow key={i.id} hover>
                      <TableCell>{i.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{i.title}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{i.affected_component || "—"}</TableCell>
                      <TableCell><Chip label={i.severity} size="small" color={SEVERITY_COLOR[i.severity] || "default"} /></TableCell>
                      <TableCell><Chip label={i.status} size="small" color={STATUS_COLOR[i.status] || "default"} /></TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{new Date(i.created_at).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => { setSelectedIncident(i.id); setUpdateNote(""); }}><Visibility fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        )}

        {/* INCIDENT DETAIL dialog */}
        <Dialog open={selectedIncident !== null} onClose={() => setSelectedIncident(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {incDetail?.title}
            {incDetail && <Chip label={incDetail.status} size="small" color={STATUS_COLOR[incDetail.status] || "default"} sx={{ ml: 1.5 }} />}
          </DialogTitle>
          <DialogContent>
            {incDetail && (
              <Box>
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">Component</Typography><Typography variant="body2" fontWeight={500}>{incDetail.affected_component || "—"}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">Severity</Typography><Typography variant="body2" fontWeight={500}>{incDetail.severity}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">Description</Typography><Typography variant="body2">{incDetail.description || "—"}</Typography></Grid>
                </Grid>

                {incDetail.resolution && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Resolved: {incDetail.resolution}</Alert>
                )}

                {/* Timeline */}
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600} mb={1}>Incident Timeline</Typography>
                <Stack spacing={1}>
                  {incDetail.history.map((h, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#6366f1", mt: 0.8 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{h.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {h.performed_by} · {new Date(h.timestamp).toLocaleString()}{h.note ? ` · ${h.note}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* Update (admin + not resolved) */}
                {isAdmin && incDetail.status !== "Resolved" && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <TextField label="Note" value={updateNote} onChange={(e) => setUpdateNote(e.target.value)}
                      fullWidth multiline rows={2} sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={2}>
                      <Button variant="outlined" color="warning" onClick={() => doUpdateIncident("Investigating")}>Mark Investigating</Button>
                      <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={() => doUpdateIncident("Resolved")}>Resolve</Button>
                    </Stack>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelectedIncident(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* CREATE incident dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>New Incident</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Title" value={incForm.title} onChange={(e) => setIncForm({ ...incForm, title: e.target.value })} fullWidth />
              <TextField label="Affected Component" value={incForm.affected_component} onChange={(e) => setIncForm({ ...incForm, affected_component: e.target.value })} fullWidth />
              <TextField select label="Severity" value={incForm.severity} onChange={(e) => setIncForm({ ...incForm, severity: e.target.value })} fullWidth>
                {["Critical", "High", "Medium", "Low"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField label="Description" value={incForm.description} onChange={(e) => setIncForm({ ...incForm, description: e.target.value })} fullWidth multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={doCreate}>Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}