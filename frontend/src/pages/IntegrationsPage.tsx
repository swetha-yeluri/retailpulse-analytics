import { useState } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Stack, Tooltip, CircularProgress,
} from "@mui/material";
import {
  Hub, Add, Edit, Delete, PowerSettingsNew, Sync, WifiTethering,
  Schedule as ScheduleIcon, Visibility, Refresh, Download,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  integrationApi, type IntegrationDashboard, type Integration,
  type TargetField, type Mapping, type SyncHistory, type FailedRecord, type Schedule,
} from "../api/integrationApi";

const SOURCE_TYPES = ["CSV", "PostgreSQL", "REST API"];
const MODULES = ["Products", "Inventory", "Sales", "Customers"];
const AUTH_METHODS = ["None", "Basic", "API Key"];
const FREQUENCIES = ["Manual", "Daily", "Weekly"];
const STRATEGIES = ["Insert", "Update", "Skip Duplicates"];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default" | "info"> = {
  Active: "success", Inactive: "default", Failed: "error",
  Pending: "warning", Running: "info", Completed: "success",
  "Completed with Errors": "warning", Cancelled: "default",
};

const EMPTY_FORM = {
  name: "", source_type: "CSV", target_module: "Products",
  auth_method: "None", sync_frequency: "Manual",
  config: { file_path: "" } as Record<string, any>, secret: "",
};

export default function IntegrationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Super Admin" || user?.role === "Company Admin";

  const [tab, setTab] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const [mapOpen, setMapOpen] = useState<Integration | null>(null);
  const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);

  const [syncOpen, setSyncOpen] = useState<Integration | null>(null);
  const [strategy, setStrategy] = useState("Insert");
  const [syncing, setSyncing] = useState(false);

  const [testResult, setTestResult] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  const [failedOpen, setFailedOpen] = useState<SyncHistory | null>(null);
  const [failedRows, setFailedRows] = useState<FailedRecord[]>([]);

  const [schedOpen, setSchedOpen] = useState(false);
  const [schedForm, setSchedForm] = useState({ integration_id: 0, frequency: "Daily", execution_time: "09:00", is_active: true });

  // ---------- Queries ----------
  const { data: dash, refetch: refetchDash } = useQuery<IntegrationDashboard>({
    queryKey: ["integ-dash"], queryFn: () => integrationApi.dashboard(), staleTime: 15000,
  });
  const { data: integrations = [], refetch: refetchList } = useQuery<Integration[]>({
    queryKey: ["integ-list"], queryFn: () => integrationApi.list(), staleTime: 10000,
  });
  const { data: history = [], refetch: refetchHistory } = useQuery<SyncHistory[]>({
    queryKey: ["integ-history"], queryFn: () => integrationApi.history(), staleTime: 10000,
  });
  const { data: schedules = [], refetch: refetchSched } = useQuery<Schedule[]>({
    queryKey: ["integ-sched"], queryFn: () => integrationApi.listSchedules(), staleTime: 10000,
  });

  const kpis = [
    { label: "Total", value: dash?.total_integrations ?? "—", color: "#6366f1" },
    { label: "Active", value: dash?.active_integrations ?? "—", color: "#10b981" },
    { label: "Inactive", value: dash?.inactive_integrations ?? "—", color: "#94a3b8" },
    { label: "Failed", value: dash?.failed_integrations ?? "—", color: "#ef4444" },
    { label: "Pending Jobs", value: dash?.pending_jobs ?? "—", color: "#f59e0b" },
    { label: "Records Synced", value: dash?.records_synced ?? "—", color: "#3b82f6" },
    { label: "Records Failed", value: dash?.records_failed ?? "—", color: "#f97316" },
    { label: "Last Sync", value: dash?.last_sync_at ? new Date(dash.last_sync_at).toLocaleDateString() : "—", color: "#8b5cf6" },
  ];

  const refetchAll = () => { refetchDash(); refetchList(); refetchHistory(); refetchSched(); };

  // ---------- Actions ----------
  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setFormOpen(true); };
  const openEdit = (i: Integration) => {
    setEditId(i.id);
    setForm({ name: i.name, source_type: i.source_type, target_module: i.target_module,
      auth_method: i.auth_method, sync_frequency: i.sync_frequency, config: i.config || {}, secret: "" });
    setFormOpen(true);
  };

  const saveForm = async () => {
    try {
      if (editId) await integrationApi.update(editId, form);
      else await integrationApi.create(form);
      setFormOpen(false); refetchAll();
    } catch (e: any) { alert(e.response?.data?.detail || "Save failed"); }
  };

  const toggleInteg = async (id: number) => {
    try { await integrationApi.toggle(id); refetchAll(); }
    catch (e: any) { alert(e.response?.data?.detail || "Failed"); }
  };

  const deleteInteg = async (id: number) => {
    if (!window.confirm("Delete this integration?")) return;
    try { await integrationApi.remove(id); refetchAll(); }
    catch (e: any) { alert(e.response?.data?.detail || "Failed"); }
  };

  const testConn = async (i: Integration) => {
    setTestResult({ id: i.id, msg: "Testing...", ok: false });
    try {
      const res = await integrationApi.testConnection(i.id);
      setTestResult({ id: i.id, msg: `${res.message}${res.details ? " — " + res.details : ""}`, ok: res.success });
    } catch (e: any) {
      setTestResult({ id: i.id, msg: e.response?.data?.detail || "Test failed", ok: false });
    }
  };

  const openMapping = async (i: Integration) => {
    setMapOpen(i);
    try {
      const [tf, existing] = await Promise.all([
        integrationApi.targetFields(i.target_module),
        integrationApi.getMappings(i.id),
      ]);
      setTargetFields(tf);
      setMappings(existing.length ? existing
        : tf.map((t) => ({ source_field: "", target_field: t.field, is_required: t.required, data_type: t.type })));
    } catch { setTargetFields([]); setMappings([]); }
  };

  const saveMapping = async () => {
    if (!mapOpen) return;
    const filled = mappings.filter((m) => m.source_field.trim());
    try {
      await integrationApi.saveMappings(mapOpen.id, filled);
      setMapOpen(null); alert("Mappings saved");
    } catch (e: any) { alert(e.response?.data?.detail || "Failed"); }
  };

  const doSync = async () => {
    if (!syncOpen) return;
    setSyncing(true);
    try {
      const res = await integrationApi.runSync(syncOpen.id, "Manual", strategy);
      setSyncOpen(null);
      alert(`Sync ${res.status}: ${res.summary}`);
      refetchAll();
    } catch (e: any) { alert(e.response?.data?.detail || "Sync failed"); }
    finally { setSyncing(false); }
  };

  const openFailed = async (h: SyncHistory) => {
    setFailedOpen(h);
    try { setFailedRows(await integrationApi.failedRecords(h.id)); }
    catch { setFailedRows([]); }
  };

  const retryFailed = async (syncId: number) => {
    try {
      const res = await integrationApi.retryFailed(syncId);
      alert(`${res.resolved} of ${res.retried} records resolved`);
      setFailedOpen(null); refetchAll();
    } catch (e: any) { alert(e.response?.data?.detail || "Retry failed"); }
  };

  const downloadFailedCSV = () => {
    if (!failedRows.length) return;
    let csv = "Row,Source ID,Category,Error,Status\n";
    failedRows.forEach((f) => {
      csv += `${f.row_number},"${f.source_identifier}","${f.error_category}","${f.error_message}","${f.processing_status}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "failed_records.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveSchedule = async () => {
    try {
      await integrationApi.createSchedule(schedForm);
      setSchedOpen(false); refetchSched();
    } catch (e: any) { alert(e.response?.data?.detail || "Failed"); }
  };

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Hub sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Data Integration</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Configure connectors, map fields, and synchronize external data.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1.5}>
            {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={openCreate}>New Integration</Button>}
            <Button variant="outlined" startIcon={<Refresh />} onClick={refetchAll}>Refresh</Button>
          </Stack>
        </Box>

        {/* KPI cards - single line */}
        <Grid container spacing={2} mb={4}>
          {kpis.map((c) => (
            <Grid item xs={6} sm={3} md={1.5} key={c.label}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Tabs */}
        <Paper elevation={0} sx={{ mb: 3, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
            <Tab label="Integrations" />
            <Tab label="Sync History" />
            <Tab label="Schedules" />
          </Tabs>
        </Paper>

        {/* TAB 0 - Integrations */}
        {tab === 0 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            {testResult && (
              <Alert severity={testResult.ok ? "success" : "error"} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setTestResult(null)}>
                {testResult.msg}
              </Alert>
            )}
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last Sync</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {integrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5, color: "#94a3b8" }}>
                        No integrations yet. Click "New Integration" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    integrations.map((i) => (
                      <TableRow key={i.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{i.name}</TableCell>
                        <TableCell><Chip label={i.source_type} size="small" variant="outlined" /></TableCell>
                        <TableCell>{i.target_module}</TableCell>
                        <TableCell>{i.sync_frequency}</TableCell>
                        <TableCell><Chip label={i.status} size="small" color={STATUS_COLOR[i.status] || "default"} /></TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#64748b" }}>
                          {i.last_sync_at ? new Date(i.last_sync_at).toLocaleString() : "Never"}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Test Connection">
                            <IconButton size="small" onClick={() => testConn(i)}><WifiTethering fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Field Mapping">
                            <IconButton size="small" onClick={() => openMapping(i)}><Hub fontSize="small" /></IconButton>
                          </Tooltip>
                          {isAdmin && (
                            <>
                              <Tooltip title="Sync Now">
                                <IconButton size="small" color="primary" onClick={() => { setSyncOpen(i); setStrategy("Insert"); }}><Sync fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => openEdit(i)}><Edit fontSize="small" /></IconButton>
                              </Tooltip>
                              <Tooltip title={i.status === "Active" ? "Disable" : "Enable"}>
                                <IconButton size="small" onClick={() => toggleInteg(i.id)}><PowerSettingsNew fontSize="small" color={i.status === "Active" ? "success" : "disabled"} /></IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small" color="error" onClick={() => deleteInteg(i.id)}><Delete fontSize="small" /></IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* TAB 1 - Sync History */}
        {tab === 1 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Integration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Processed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Inserted</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Updated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Skipped</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Failed</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 5, color: "#94a3b8" }}>No sync runs yet.</TableCell>
                    </TableRow>
                  ) : (
                    history.map((h) => (
                      <TableRow key={h.id} hover>
                        <TableCell>#{h.id}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{h.integration_name}</TableCell>
                        <TableCell>{h.sync_type}</TableCell>
                        <TableCell align="center">{h.records_processed}</TableCell>
                        <TableCell align="center" sx={{ color: "#10b981" }}>{h.records_inserted}</TableCell>
                        <TableCell align="center" sx={{ color: "#3b82f6" }}>{h.records_updated}</TableCell>
                        <TableCell align="center" sx={{ color: "#94a3b8" }}>{h.records_skipped}</TableCell>
                        <TableCell align="center" sx={{ color: "#ef4444" }}>{h.records_failed}</TableCell>
                        <TableCell><Chip label={h.status} size="small" color={STATUS_COLOR[h.status] || "default"} /></TableCell>
                        <TableCell align="center">
                          {h.records_failed > 0 && (
                            <IconButton size="small" onClick={() => openFailed(h)}><Visibility fontSize="small" /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* TAB 2 - Schedules */}
        {tab === 2 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              {isAdmin && (
                <Button variant="outlined" startIcon={<ScheduleIcon />}
                  onClick={() => { setSchedForm({ integration_id: integrations[0]?.id || 0, frequency: "Daily", execution_time: "09:00", is_active: true }); setSchedOpen(true); }}>
                  New Schedule
                </Button>
              )}
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Integration</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Next Run</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last Result</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 5, color: "#94a3b8" }}>No schedules configured.</TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((s) => {
                      const integ = integrations.find((i) => i.id === s.integration_id);
                      return (
                        <TableRow key={s.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>{integ?.name || `#${s.integration_id}`}</TableCell>
                          <TableCell>{s.frequency}</TableCell>
                          <TableCell>{s.execution_time}</TableCell>
                          <TableCell sx={{ fontSize: 13 }}>{s.next_run ? new Date(s.next_run).toLocaleString() : "—"}</TableCell>
                          <TableCell>{s.last_result || "—"}</TableCell>
                          <TableCell><Chip label={s.is_active ? "Active" : "Inactive"} size="small" color={s.is_active ? "success" : "default"} /></TableCell>
                          {isAdmin && (
                            <TableCell align="center">
                              <IconButton size="small" onClick={() => integrationApi.toggleSchedule(s.id).then(refetchSched)}><PowerSettingsNew fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => integrationApi.deleteSchedule(s.id).then(refetchSched)}><Delete fontSize="small" /></IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ===== Create/Edit Dialog ===== */}
        <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{editId ? "Edit Integration" : "New Integration"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField label="Integration Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
              <TextField select label="Source Type" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} fullWidth>
                {SOURCE_TYPES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select label="Target Module" value={form.target_module} onChange={(e) => setForm({ ...form, target_module: e.target.value })} fullWidth>
                {MODULES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>

              {form.source_type === "CSV" && (
                <TextField label="CSV File Path" value={form.config.file_path || ""} onChange={(e) => setForm({ ...form, config: { ...form.config, file_path: e.target.value } })} fullWidth placeholder="C:\data\products.csv" />
              )}
              {form.source_type === "PostgreSQL" && (
                <>
                  <TextField label="Host" value={form.config.host || ""} onChange={(e) => setForm({ ...form, config: { ...form.config, host: e.target.value } })} fullWidth />
                  <TextField label="Database" value={form.config.database || ""} onChange={(e) => setForm({ ...form, config: { ...form.config, database: e.target.value } })} fullWidth />
                </>
              )}
              {form.source_type === "REST API" && (
                <TextField label="API URL" value={form.config.url || ""} onChange={(e) => setForm({ ...form, config: { ...form.config, url: e.target.value } })} fullWidth />
              )}

              <TextField select label="Auth Method" value={form.auth_method} onChange={(e) => setForm({ ...form, auth_method: e.target.value })} fullWidth>
                {AUTH_METHODS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </TextField>
              {form.auth_method !== "None" && (
                <TextField label="Secret (password / API key)" type="password" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} fullWidth
                  helperText={editId ? "Leave blank to keep existing secret" : "Stored securely, never displayed again"} />
              )}
              <TextField select label="Sync Frequency" value={form.sync_frequency} onChange={(e) => setForm({ ...form, sync_frequency: e.target.value })} fullWidth>
                {FREQUENCIES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveForm}>{editId ? "Update" : "Create"}</Button>
          </DialogActions>
        </Dialog>

        {/* ===== Mapping Dialog ===== */}
        <Dialog open={mapOpen !== null} onClose={() => setMapOpen(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Field Mapping — {mapOpen?.name}</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Map your source columns to RetailPulse {mapOpen?.target_module} fields. Required fields must be mapped.
            </Alert>
            <Stack spacing={2}>
              {targetFields.map((t, idx) => (
                <Box key={t.field} sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    label={`Source → ${t.label}${t.required ? " *" : ""}`}
                    value={mappings[idx]?.source_field || ""}
                    onChange={(e) => {
                      const copy = [...mappings];
                      copy[idx] = { source_field: e.target.value, target_field: t.field, is_required: t.required, data_type: t.type };
                      setMappings(copy);
                    }}
                    fullWidth size="small" placeholder="e.g. product_code"
                  />
                  <Chip label={t.type} size="small" variant="outlined" />
                </Box>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setMapOpen(null)}>Cancel</Button>
            <Button variant="contained" onClick={saveMapping}>Save Mapping</Button>
          </DialogActions>
        </Dialog>

        {/* ===== Sync Dialog ===== */}
        <Dialog open={syncOpen !== null} onClose={() => !syncing && setSyncOpen(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Synchronize — {syncOpen?.name}</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              This reads from the source and writes to {syncOpen?.target_module}. Duplicate handling follows the strategy below.
            </Alert>
            <TextField select label="Duplicate Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)} fullWidth sx={{ mt: 1 }}>
              {STRATEGIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSyncOpen(null)} disabled={syncing}>Cancel</Button>
            <Button variant="contained" onClick={doSync} disabled={syncing} startIcon={syncing ? <CircularProgress size={16} /> : <Sync />}>
              {syncing ? "Syncing..." : "Start Sync"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ===== Failed Records Dialog ===== */}
        <Dialog open={failedOpen !== null} onClose={() => setFailedOpen(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Failed Records — Sync #{failedOpen?.id}
            <Typography variant="caption" display="block" color="text.secondary">{failedOpen?.records_failed} failed records</Typography>
          </DialogTitle>
          <DialogContent>
            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<Download />} onClick={downloadFailedCSV}>Download CSV</Button>
              {isAdmin && <Button size="small" variant="contained" startIcon={<Refresh />} onClick={() => failedOpen && retryFailed(failedOpen.id)}>Retry Eligible</Button>}
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Source ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {failedRows.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>{f.row_number}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{f.source_identifier || "—"}</TableCell>
                      <TableCell><Chip label={f.error_category} size="small" color="error" variant="outlined" /></TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{f.error_message}</TableCell>
                      <TableCell><Chip label={f.processing_status} size="small" color={f.processing_status === "Resolved" ? "success" : "default"} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setFailedOpen(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* ===== Schedule Dialog ===== */}
        <Dialog open={schedOpen} onClose={() => setSchedOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>New Schedule</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Integration" value={schedForm.integration_id} onChange={(e) => setSchedForm({ ...schedForm, integration_id: Number(e.target.value) })} fullWidth>
                {integrations.map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
              </TextField>
              <TextField select label="Frequency" value={schedForm.frequency} onChange={(e) => setSchedForm({ ...schedForm, frequency: e.target.value })} fullWidth>
                <MenuItem value="Daily">Daily</MenuItem>
                <MenuItem value="Weekly">Weekly</MenuItem>
              </TextField>
              <TextField type="time" label="Execution Time" value={schedForm.execution_time} onChange={(e) => setSchedForm({ ...schedForm, execution_time: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSchedOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveSchedule}>Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}