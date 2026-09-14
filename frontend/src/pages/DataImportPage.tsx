import { useState, useRef } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  CircularProgress, Stepper, Step, StepLabel, Divider, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  CloudUpload, Description, Delete, CheckCircle, Error as ErrorIcon,
  Download, Refresh, Storage,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  importApi, type ImportPreview, type ValidationResult, type ImportResult,
  type ImportHistoryItem,
} from "../api/importApi";

const IMPORT_TYPES = ["Products", "Customers", "Sales"];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  "Completed": "success",
  "Completed with Errors": "warning",
  "Failed": "error",
  "Pending": "default",
};

const STEPS = ["Select & Upload", "Preview", "Validate", "Import"];

export default function DataImportPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importType, setImportType] = useState("Products");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const [busy, setBusy] = useState("");   
  const [error, setError] = useState("");

  
  const activeStep = result ? 3 : validation ? 2 : preview ? 1 : 0;

  
  const { data: history = [], refetch: refetchHistory } = useQuery<ImportHistoryItem[]>({
    queryKey: ["import-history"],
    queryFn: () => importApi.history(),
    staleTime: 30 * 1000,
  });

  
  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    setPreview(null); setValidation(null); setResult(null); setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setFileError("Only CSV files are allowed");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setFileError("File too large (max 5 MB)");
      return;
    }
    setFile(f);
  };

  const removeFile = () => {
    setFile(null); setPreview(null); setValidation(null); setResult(null);
    setError(""); setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  
  const doPreview = async () => {
    if (!file) return;
    setBusy("preview"); setError("");
    try {
      setPreview(await importApi.preview(importType, file));
      setValidation(null); setResult(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Preview failed");
    } finally { setBusy(""); }
  };

  
  const doValidate = async () => {
    if (!file) return;
    setBusy("validate"); setError("");
    try {
      setValidation(await importApi.validate(importType, file));
      setResult(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Validation failed");
    } finally { setBusy(""); }
  };

  
  const doProcess = async () => {
    if (!file) return;
    setBusy("process"); setError("");
    try {
      const res = await importApi.process(importType, file);
      setResult(res);
      refetchHistory();   
    } catch (err: any) {
      setError(err.response?.data?.detail || "Import failed");
    } finally { setBusy(""); }
  };

  
  const downloadErrors = async (importId: number) => {
    const errors = await importApi.getErrors(importId);
    if (errors.length === 0) { alert("No error records."); return; }
    let csv = "Row Number,Error,Data\n";
    errors.forEach((e) => {
      csv += `${e.row_number},"${e.error}","${JSON.stringify(e.data).replace(/"/g, "'")}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `import-${importId}-errors.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SectionCard = ({ title, children }: any) => (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4", mb: 4 }}>
      <Typography fontWeight={700} fontSize={16} mb={3}>{title}</Typography>
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
            <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Data Import</Typography>
            <Typography color="text.secondary" fontSize={15} mt={0.5}>
              Import Products, Customers, and Sales from CSV files.
            </Typography>
          </Box>
        </Box>

        {/* STEPPER */}
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Stepper activeStep={activeStep} alternativeLabel={!isMobile}
            orientation={isMobile ? "vertical" : "horizontal"}>
            {STEPS.map((s) => <Step key={s}><StepLabel>{s}</StepLabel></Step>)}
          </Stepper>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

        {/* SELECT + UPLOAD */}
        <SectionCard title="1. Select Type & Upload CSV">
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
                  <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={onFileSelect} />
                </Button>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                  <Description sx={{ color: "#6366f1" }} />
                  <Typography sx={{ flexGrow: 1 }} noWrap>{file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.size / 1024).toFixed(1)} KB
                  </Typography>
                  <Button size="small" color="error" startIcon={<Delete />} onClick={removeFile}>Remove</Button>
                </Box>
              )}
            </Grid>
          </Grid>

          {fileError && <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{fileError}</Alert>}

          <Box sx={{ display: "flex", gap: 2, mt: 3, flexWrap: "wrap" }}>
            <Button variant="contained" onClick={doPreview} disabled={!file || busy !== ""}
              startIcon={busy === "preview" ? <CircularProgress size={18} /> : null}>
              Preview
            </Button>
            <Button variant="outlined" onClick={doValidate} disabled={!file || busy !== ""}
              startIcon={busy === "validate" ? <CircularProgress size={18} /> : null}>
              Validate
            </Button>
          </Box>
        </SectionCard>

        {/* PREVIEW */}
        {preview && (
          <SectionCard title={`2. Preview (${preview.total_records} records)`}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Detected columns: {preview.detected_columns.join(", ")}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    {preview.columns.map((c) => (
                      <TableCell key={c} sx={{ fontWeight: 700 }}>{c}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.map((row, i) => (
                    <TableRow key={i} hover>
                      {preview.columns.map((c) => (
                        <TableCell key={c}>{row[c]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="caption" color="text.secondary" mt={1} display="block">
              Showing first {preview.rows.length} of {preview.total_records} records.
            </Typography>
          </SectionCard>
        )}

        {/* VALIDATION RESULT */}
        {validation && (
          <SectionCard title="3. Validation Result">
            {!validation.columns_valid ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                Missing required columns: {validation.missing_columns.join(", ")}
              </Alert>
            ) : (
              <>
                <Grid container spacing={2.5} mb={3}>
                  {[
                    { label: "Total", value: validation.total_records, color: "#6366f1" },
                    { label: "Valid", value: validation.valid_records, color: "#10b981" },
                    { label: "Invalid", value: validation.invalid_records, color: "#ef4444" },
                    { label: "Duplicates", value: validation.duplicate_records, color: "#f59e0b" },
                  ].map((c) => (
                    <Grid item xs={6} sm={3} key={c.label}>
                      <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                        <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                {validation.errors.length > 0 && (
                  <>
                    <Typography fontWeight={600} mb={1}>Problematic Records:</Typography>
                    <TableContainer sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Row</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Error</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validation.errors.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell>{e.row_number}</TableCell>
                              <TableCell sx={{ color: "#ef4444" }}>{e.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}

                <Button variant="contained" color="success" size="large" sx={{ mt: 3 }}
                  onClick={doProcess} disabled={busy !== "" || validation.valid_records === 0}
                  startIcon={busy === "process" ? <CircularProgress size={18} /> : <CheckCircle />}>
                  Import {validation.valid_records} Valid Records
                </Button>
              </>
            )}
          </SectionCard>
        )}

        {/* IMPORT RESULT */}
        {result && (
          <SectionCard title="4. Import Completed">
            <Alert severity={result.status === "Completed" ? "success" : result.status === "Failed" ? "error" : "warning"}
              sx={{ mb: 3, borderRadius: 2 }}>
              Import {result.status} — {result.successful_records} records added successfully.
            </Alert>
            <Grid container spacing={2.5}>
              {[
                { label: "Total", value: result.total_records, color: "#6366f1" },
                { label: "Added", value: result.successful_records, color: "#10b981" },
                { label: "Failed", value: result.failed_records, color: "#ef4444" },
                { label: "Duplicates", value: result.duplicate_records, color: "#f59e0b" },
              ].map((c) => (
                <Grid item xs={6} sm={3} key={c.label}>
                  <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                    <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {result.errors.length > 0 && (
              <Button variant="outlined" startIcon={<Download />} sx={{ mt: 3 }}
                onClick={() => downloadErrors(result.import_id)}>
                Download Failed Records
              </Button>
            )}
          </SectionCard>
        )}

        {/* IMPORT HISTORY */}
        <SectionCard title="Import History">
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
            <Button size="small" startIcon={<Refresh />} onClick={() => refetchHistory()}>Refresh</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: "#f8fafc" }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Filename</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>By</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Added</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Failed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Errors</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                    No imports yet.
                  </TableCell></TableRow>
                ) : history.map((h) => (
                  <TableRow key={h.id} hover>
                    <TableCell>{h.id}</TableCell>
                    <TableCell>{h.import_type}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{h.filename}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{h.uploaded_by}</TableCell>
                    <TableCell align="right">{h.total_records}</TableCell>
                    <TableCell align="right" sx={{ color: "#10b981", fontWeight: 600 }}>{h.successful_records}</TableCell>
                    <TableCell align="right" sx={{ color: "#ef4444" }}>{h.failed_records}</TableCell>
                    <TableCell>
                      <Chip label={h.status} size="small" color={STATUS_COLOR[h.status] || "default"} />
                    </TableCell>
                    <TableCell align="center">
                      {h.failed_records > 0 && (
                        <Button size="small" startIcon={<Download />}
                          onClick={() => downloadErrors(h.id)}>CSV</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Box>
    </DashboardLayout>
  );
}