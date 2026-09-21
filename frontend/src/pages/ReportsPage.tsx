import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Skeleton, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Switch, Stack, Pagination, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Assessment, Download, PictureAsPdf, Refresh, Add, Delete, Edit,
  PlayArrow, Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  reportApi, type ReportResult, type ReportHistoryItem,
  type Schedule, type ScheduleData,
} from "../api/reportApi";
import { categoryApi, type Category } from "../api/categoryApi";

const REPORT_TYPES = ["Sales", "Inventory", "Customer", "Product Performance", "Stock Movement"];
const FREQUENCIES = ["Daily", "Weekly", "Monthly"];

const STATUS_COLOR: Record<string, "success" | "error" | "warning" | "default"> = {
  Completed: "success", Failed: "error", Pending: "warning",
};

const EMPTY_SCHEDULE: ScheduleData = {
  report_type: "Sales", schedule_name: "", frequency: "Daily",
  execution_time: "09:00", recipients: "", export_format: "PDF", is_active: true,
};

export default function ReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [tab, setTab] = useState(0);   // 0=Generate, 1=Schedules, 2=History

  
  const [reportType, setReportType] = useState("Sales");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [report, setReport] = useState<ReportResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleData>(EMPTY_SCHEDULE);

  
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    staleTime: 5 * 60 * 1000,
  });


  const { data: history = [], refetch: refetchHistory } = useQuery<ReportHistoryItem[]>({
    queryKey: ["report-history"],
    queryFn: () => reportApi.history(),
    staleTime: 30 * 1000,
  });

  
  const { data: schedules = [], refetch: refetchSchedules } = useQuery<Schedule[]>({
    queryKey: ["schedules"],
    queryFn: () => reportApi.listSchedules(),
    staleTime: 30 * 1000,
  });

  
  const buildFilters = () => {
    const f: any = {};
    if (dateFrom) f.date_from = dateFrom;
    if (dateTo) f.date_to = dateTo;
    if (categoryId) f.category_id = categoryId;
    if (statusFilter) f.status = statusFilter;
    if (statusFilter && reportType === "Sales") f.payment_status = statusFilter;
    if (stockStatus) f.stock_status = stockStatus;
    return f;
  };

  const doGenerate = async () => {
    setGenerating(true); setError(""); setPage(1);
    try {
      const res = await reportApi.generate(reportType, buildFilters());
      setReport(res);
      refetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Report generation failed");
    } finally { setGenerating(false); }
  };

  
  const paginatedRows = useMemo(() => {
    if (!report) return [];
    const start = (page - 1) * rowsPerPage;
    return report.rows.slice(start, start + rowsPerPage);
  }, [report, page]);

  const totalPages = report ? Math.ceil(report.rows.length / rowsPerPage) : 0;

  
  const exportCSV = () => {
    if (!report) return;
    let csv = `${report.report_name}\n`;
    csv += `Generated: ${new Date(report.generated_at).toLocaleString()}\n`;
    csv += `Filters: ${JSON.stringify(report.filters_applied)}\n\n`;
    csv += report.columns.join(",") + "\n";
    report.rows.forEach((row) => {
      csv += report.columns.map((c) => `"${row[c] ?? ""}"`).join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${reportType}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  
  const exportPDF = async () => {
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(report.report_name, 14, 18);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date(report.generated_at).toLocaleString()}`, 14, 26);
    doc.text(`Total Records: ${report.total_records}`, 14, 32);
    let y = 42;
    doc.setFontSize(8);
    doc.text(report.columns.join(" | "), 14, y); y += 6;
    report.rows.slice(0, 40).forEach((row) => {
      if (y > 285) { doc.addPage(); y = 20; }
      doc.text(report.columns.map((c) => String(row[c] ?? "")).join(" | ").slice(0, 90), 14, y);
      y += 5;
    });
    doc.save(`${reportType}-report.pdf`);
  };

  
  const openCreateSchedule = () => {
    setScheduleForm({ ...EMPTY_SCHEDULE, report_type: reportType });
    setEditId(null); setScheduleOpen(true);
  };

  const openEditSchedule = (s: Schedule) => {
    setScheduleForm({
      report_type: s.report_type, schedule_name: s.schedule_name,
      frequency: s.frequency, execution_time: s.execution_time || "09:00",
      recipients: s.recipients || "", export_format: s.export_format,
      is_active: s.is_active,
    });
    setEditId(s.id); setScheduleOpen(true);
  };

  const saveSchedule = async () => {
    if (!scheduleForm.schedule_name.trim()) { alert("Schedule name required"); return; }
    try {
      if (editId) await reportApi.updateSchedule(editId, scheduleForm);
      else await reportApi.createSchedule(scheduleForm);
      setScheduleOpen(false);
      refetchSchedules();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Save failed");
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!window.confirm("Delete this schedule?")) return;
    await reportApi.deleteSchedule(id);
    refetchSchedules();
  };

  const toggleSchedule = async (id: number) => {
    await reportApi.toggleSchedule(id);
    refetchSchedules();
  };

  const runSchedule = async (id: number) => {
    await reportApi.runSchedule(id);
    refetchSchedules();
    refetchHistory();
  };

  const setSF = (k: keyof ScheduleData) => (e: any) =>
    setScheduleForm({ ...scheduleForm, [k]: e.target.value });

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Assessment sx={{ color: "#6366f1", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Reports</Typography>
            <Typography color="text.secondary" fontSize={15} mt={0.5}>
              Generate, export, and schedule business reports.
            </Typography>
          </Box>
        </Box>

        {/* TABS */}
        <Paper elevation={0} sx={{ mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }}>
            <Tab label="Generate Report" />
            <Tab label="Scheduled Reports" />
            <Tab label="Report History" />
          </Tabs>
        </Paper>

        {/* ============ TAB 0: GENERATE ============ */}
        {tab === 0 && (
          <>
            <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
              <Typography fontWeight={700} fontSize={16} mb={3}>Report Configuration</Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={4}>
                  <TextField select fullWidth label="Report Type" value={reportType}
                    onChange={(e) => { setReportType(e.target.value); setReport(null); }}>
                    {REPORT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField type="date" fullWidth label="From Date" value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField type="date" fullWidth label="To Date" value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>

                {reportType === "Inventory" && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <TextField select fullWidth label="Category" value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}>
                        <MenuItem value="">All Categories</MenuItem>
                        {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                      </TextField>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField select fullWidth label="Stock Status" value={stockStatus}
                        onChange={(e) => setStockStatus(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="low">Low Stock</MenuItem>
                        <MenuItem value="out">Out of Stock</MenuItem>
                      </TextField>
                    </Grid>
                  </>
                )}

                {reportType === "Sales" && (
                  <Grid item xs={12} sm={4}>
                    <TextField select fullWidth label="Payment Status" value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="Paid">Paid</MenuItem>
                      <MenuItem value="Pending">Pending</MenuItem>
                    </TextField>
                  </Grid>
                )}

                {reportType === "Customer" && (
                  <Grid item xs={12} sm={4}>
                    <TextField select fullWidth label="Status" value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}>
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </TextField>
                  </Grid>
                )}
              </Grid>

              <Button variant="contained" size="large" sx={{ mt: 3 }} onClick={doGenerate}
                disabled={generating} startIcon={generating ? <CircularProgress size={18} /> : <Assessment />}>
                Generate Report
              </Button>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

            {/* Report result */}
            {generating ? (
              <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
                <Skeleton width="30%" height={28} />
                {[...Array(5)].map((_, i) => <Skeleton key={i} height={40} sx={{ mt: 1 }} />)}
              </Paper>
            ) : report ? (
              <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef0f4", overflow: "hidden" }}>
                <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                  <Box>
                    <Typography fontWeight={700} fontSize={16}>{report.report_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {report.total_records} records · Generated {new Date(report.generated_at).toLocaleString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" startIcon={<Download />} onClick={exportCSV}>CSV</Button>
                    <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={exportPDF}>PDF</Button>
                  </Stack>
                </Box>

                {report.rows.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: "center", color: "#94a3b8" }}>
                    No data found for the selected filters.
                  </Box>
                ) : (
                  <>
                    <TableContainer>
                      <Table>
                        <TableHead sx={{ bgcolor: "#f8fafc" }}>
                          <TableRow>
                            {report.columns.map((c) => (
                              <TableCell key={c} sx={{ fontWeight: 700 }}>{c}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedRows.map((row, i) => (
                            <TableRow key={i} hover>
                              {report.columns.map((c) => (
                                <TableCell key={c}>{String(row[c] ?? "—")}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {totalPages > 1 && (
                      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                        <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            ) : null}
          </>
        )}

        {/* ============ TAB 1: SCHEDULES ============ */}
        {tab === 1 && (
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography fontWeight={700} fontSize={16}>Scheduled Reports</Typography>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateSchedule}>New Schedule</Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Format</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last Run</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                      No scheduled reports.
                    </TableCell></TableRow>
                  ) : schedules.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{s.schedule_name}</TableCell>
                      <TableCell>{s.report_type}</TableCell>
                      <TableCell>{s.frequency}</TableCell>
                      <TableCell>{s.execution_time || "—"}</TableCell>
                      <TableCell>{s.export_format}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>
                        {s.last_run ? (
                          <>
                            {new Date(s.last_run).toLocaleDateString()}
                            <Chip label={s.last_status} size="small" sx={{ ml: 1 }}
                              color={STATUS_COLOR[s.last_status || ""] || "default"} />
                          </>
                        ) : "Never"}
                      </TableCell>
                      <TableCell>
                        <Switch checked={s.is_active} onChange={() => toggleSchedule(s.id)} size="small" />
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>
                        <IconButton size="small" onClick={() => runSchedule(s.id)} title="Run now"><PlayArrow fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => openEditSchedule(s)} title="Edit"><Edit fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => deleteSchedule(s.id)} sx={{ color: "#ef4444" }} title="Delete"><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* ============ TAB 2: HISTORY ============ */}
        {tab === 2 && (
          <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography fontWeight={700} fontSize={16}>Report History</Typography>
              <Button size="small" startIcon={<Refresh />} onClick={() => refetchHistory()}>Refresh</Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Report</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Generated By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Records</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Format</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                      No reports generated yet.
                    </TableCell></TableRow>
                  ) : history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{h.report_name}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{h.generated_by}</TableCell>
                      <TableCell align="right">{h.total_records}</TableCell>
                      <TableCell>{h.format}</TableCell>
                      <TableCell>
                        <Chip label={h.status} size="small" color={STATUS_COLOR[h.status] || "default"} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{new Date(h.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* SCHEDULE dialog */}
        <Dialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{editId ? "Edit Schedule" : "New Schedule"}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2.5} sx={{ mt: 0 }}>
              <Grid item xs={12}>
                <TextField label="Schedule Name" fullWidth value={scheduleForm.schedule_name}
                  onChange={setSF("schedule_name")} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Report Type" fullWidth value={scheduleForm.report_type}
                  onChange={setSF("report_type")}>
                  {REPORT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Frequency" fullWidth value={scheduleForm.frequency}
                  onChange={setSF("frequency")}>
                  {FREQUENCIES.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField type="time" label="Execution Time" fullWidth value={scheduleForm.execution_time}
                  onChange={setSF("execution_time")} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select label="Export Format" fullWidth value={scheduleForm.export_format}
                  onChange={setSF("export_format")}>
                  <MenuItem value="PDF">PDF</MenuItem>
                  <MenuItem value="CSV">CSV</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField label="Recipients (comma-separated emails)" fullWidth value={scheduleForm.recipients}
                  onChange={setSF("recipients")} placeholder="admin@company.com, manager@company.com" />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={saveSchedule}>{editId ? "Update" : "Create"}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}