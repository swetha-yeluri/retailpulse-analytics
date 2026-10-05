import { useState } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, LinearProgress, Stepper, Step, StepLabel, Divider,
  useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  CloudUpload, Description, Delete, CheckCircle, Download, Refresh,
  Storage, GetApp, Cancel, Visibility,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  advancedImportApi, type ImportPreview, type ImportSummary, type ImportJob,
} from "../api/advancedImportApi";

const IMPORT_TYPES = ["Products", "Inventory", "Customers", "Sales"];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  "Uploaded": "info",
  "Validating": "info",
  "Processing": "warning",
  "Completed": "success",
  "Completed with Errors": "warning",
  "Failed": "error",
  "Cancelled": "default",
};

const STEPS = ["Upload", "Validate", "Process", "Complete"];

export default function AdvancedImportPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [importType, setImportType] = useState("Products");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [detailView, setDetailView] = useState<ImportSummary | null>(null);

  const activeStep = summary ? 3 : job ? 2 : preview ? 1 : 0;

  
  const { data: history = [], refetch: refetchHistory } = useQuery<ImportJob[]>({
    queryKey: ["advanced-import-history"],
    queryFn: () => advancedImportApi.history(),
    staleTime: 20 * 1000,
  });

  
  const downloadTemplate = async () => {
    const t = await advancedImportApi.getTemplate(importType);
    let csv = t.columns.join(",") + "\n";
    csv += t.columns.map((c) => t.sample_row[c] ?? "").join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError(""); setPreview(null); setJob(null); setSummary(null); setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) { setFileError("Only CSV files allowed"); return; }
    if (f.size > 10 * 1024 * 1024) { setFileError("File too large (max 10 MB)"); return; }
    setFile(f);
  };

  const removeFile = () => {
    setFile(null); setPreview(null); setJob(null); setSummary(null); setError("");
  };

  
  const doValidate = async () => {
    if (!file) return;
    setBusy("validate"); setError("");
    try {
      setPreview(await advancedImportApi.validate(importType, file));
      setJob(null); setSummary(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Validation failed");
    } finally { setBusy(""); }
  };


  const doImport = async () => {
    if (!file) return;
    setBusy("process"); setError("");
    try {
      const createdJob = await advancedImportApi.upload(importType, file);  // create job
      setJob(createdJob);
      const result = await advancedImportApi.process(createdJob.id);         // process
      setSummary(result);
      refetchHistory();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Import failed");
    } finally { setBusy(""); }
  };

  
  const downloadErrors = async (jobId: number) => {
    const errors = await advancedImportApi.getErrors(jobId);
    if (errors.length === 0) { alert("No error records."); return; }
    let csv = "Row,Record,Error Type,Error Message\n";
    errors.forEach((e) => {
      csv += `${e.row_number},"${e.record_info.replace(/"/g, "'")}","${e.error_type}","${e.error_message}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-${jobId}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  
  const viewDetail = async (jobId: number) => {
    const d = await advancedImportApi.getDetail(jobId);
    setDetailView(d);
  };

  const SectionCard = ({ title, children, right }: any) => (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4", mb: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography fontWeight={700} fontSize={16}>{title}</Typography>
        {right}
      </Box>
      {children}
    </Paper>
  );

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Storage sx={{ color: "#6366f1", fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Advanced Data Import</Typography>
            <Typography color="text.secondary" fontSize={15} mt={0.5}>
              Bulk import with validation, processing, and error reporting.
            </Typography>
          </Box>
        </Box>

        
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? "vertical" : "horizontal"}>
            {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

    
        <SectionCard title="1. Select Type & Upload"
          right={<Button startIcon={<GetApp />} onClick={downloadTemplate} size="small">Download Template</Button>}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label="Import Type" value={importType}
                onChange={(e) => { setImportType(e.target.value); removeFile(); }}>
                {IMPORT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={8}>
              {!file ? (
                <Button variant="outlined" component="label" startIcon={<CloudUpload />}
                  size="large" fullWidth sx={{ py: 1.5, borderStyle: "dashed" }}>
                  Choose CSV File
                  <input type="file" accept=".csv" hidden onChange={onFileSelect} />
                </Button>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                  <Description sx={{ color: "#6366f1" }} />
                  <Typography sx={{ flexGrow: 1 }} noWrap>{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={removeFile}>Remove</Button>
                </Box>
              )}
            </Grid>
          </Grid>

          {fileError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{fileError}</Alert>}

          <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap" }}>
            <Button variant="contained" onClick={doValidate} disabled={!file || busy !== ""}
              startIcon={busy === "validate" ? <CircularProgress size={18} /> : null}>
              Validate & Preview
            </Button>
          </Box>
        </SectionCard>

        
        {preview && (
          <SectionCard title="2. Validation Preview">
            {!preview.columns_valid ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Missing required columns: {preview.missing_columns.join(", ")}
              </Alert>
            ) : (
              <>
            
                <Grid container spacing={2.5} mb={3}>
                  {[
                    { label: "Total", value: preview.total_rows, color: "#6366f1" },
                    { label: "Valid", value: preview.valid_rows, color: "#10b981" },
                    { label: "Invalid", value: preview.invalid_rows, color: "#ef4444" },
                    { label: "Duplicates", value: preview.duplicate_rows, color: "#f59e0b" },
                  ].map((c) => (
                    <Grid item xs={6} sm={3} key={c.label}>
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                        <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                
                <Typography fontWeight={600} mb={1}>Sample Records</Typography>
                <TableContainer sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: "#f8fafc" }}>
                      <TableRow>{preview.columns.map((c) => <TableCell key={c} sx={{ fontWeight: 700 }}>{c}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {preview.sample_rows.map((row, i) => (
                        <TableRow key={i}>{preview.columns.map((c) => <TableCell key={c}>{row[c]}</TableCell>)}</TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

    
                {preview.errors.length > 0 && (
                  <>
                    <Typography fontWeight={600} mb={1}>Validation Errors ({preview.errors.length})</Typography>
                    <TableContainer sx={{ maxHeight: 250, mb: 3 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {preview.errors.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell>{e.row_number}</TableCell>
                              <TableCell><Chip label={e.error_type} size="small"
                                color={e.error_type === "Duplicate" ? "warning" : "error"} /></TableCell>
                              <TableCell sx={{ color: "#ef4444" }}>{e.error_message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

            
                <Button variant="contained" color="success" size="large"
                  onClick={doImport} disabled={busy !== "" || preview.valid_rows === 0}
                  startIcon={busy === "process" ? <CircularProgress size={18} /> : <CheckCircle />}>
                  {busy === "process" ? "Processing…" : `Import ${preview.valid_rows} Valid Records`}
                </Button>
              </>
            )}
          </SectionCard>
        )}

        
        {busy === "process" && (
          <SectionCard title="Processing...">
            <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
            <Typography color="text.secondary">Importing records, please wait…</Typography>
          </SectionCard>
        )}

        
        {summary && (
          <SectionCard title="Import Summary"
            right={<Chip label={summary.status} color={STATUS_COLOR[summary.status] || "default"} />}>
            <Alert severity={summary.status === "Completed" ? "success" : summary.status === "Failed" ? "error" : "warning"}
              sx={{ mb: 3, borderRadius: 2 }}>
              Import {summary.status} — {summary.successful_records} records added in {summary.processing_duration}s
            </Alert>
            <Grid container spacing={2.5} mb={2}>
              {[
                { label: "Total", value: summary.total_records, color: "#6366f1" },
                { label: "Success", value: summary.successful_records, color: "#10b981" },
                { label: "Failed", value: summary.failed_records, color: "#ef4444" },
                { label: "Skipped", value: summary.skipped_records, color: "#94a3b8" },
                { label: "Duplicates", value: summary.duplicate_records, color: "#f59e0b" },
              ].map((c) => (
                <Grid item xs={6} sm={2.4} key={c.label}>
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" color="text.secondary">
              Duration: {summary.processing_duration}s · Imported by {summary.uploaded_by}
            </Typography>
            {summary.errors.length > 0 && (
              <Button variant="outlined" startIcon={<Download />} sx={{ mt: 2 }}
                onClick={() => downloadErrors(summary.id)}>
                Download Error Report
              </Button>
            )}
          </SectionCard>
        )}

    
        <SectionCard title="Import History"
          right={<Button size="small" startIcon={<Refresh />} onClick={() => refetchHistory()}>Refresh</Button>}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Filename</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Success</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Failed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: "#94a3b8" }}>No imports yet.</TableCell></TableRow>
                ) : history.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{h.id}</TableCell>
                    <TableCell>{h.import_type}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{h.filename}</TableCell>
                    <TableCell align="right">{h.total_records}</TableCell>
                    <TableCell align="right" sx={{ color: "#10b981", fontWeight: 600 }}>{h.successful_records}</TableCell>
                    <TableCell align="right" sx={{ color: "#ef4444" }}>{h.failed_records}</TableCell>
                    <TableCell><Chip label={h.status} size="small" color={STATUS_COLOR[h.status] || "default"} /></TableCell>
                    <TableCell align="right">{h.processing_duration}s</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => viewDetail(h.id)}><Visibility fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        
        <Dialog open={detailView !== null} onClose={() => setDetailView(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Import Details #{detailView?.id}</DialogTitle>
          <DialogContent>
            {detailView && (
              <Box>
                <Grid container spacing={2} mb={2}>
                  {[
                    { label: "Type", value: detailView.import_type },
                    { label: "Status", value: detailView.status },
                    { label: "Total", value: detailView.total_records },
                    { label: "Success", value: detailView.successful_records },
                    { label: "Failed", value: detailView.failed_records },
                    { label: "Duration", value: `${detailView.processing_duration}s` },
                  ].map((f) => (
                    <Grid item xs={6} sm={4} key={f.label}>
                      <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                      <Typography variant="body2" fontWeight={500}>{f.value}</Typography>
                    </Grid>
                  ))}
                </Grid>
                {detailView.errors.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight={600} mb={1}>Failed Records</Typography>
                    <TableContainer sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {detailView.errors.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell>{e.row_number}</TableCell>
                              <TableCell>{e.error_type}</TableCell>
                              <TableCell sx={{ color: "#ef4444" }}>{e.error_message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Button variant="outlined" startIcon={<Download />} sx={{ mt: 2 }}
                      onClick={() => downloadErrors(detailView.id)}>Download Error CSV</Button>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDetailView(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}