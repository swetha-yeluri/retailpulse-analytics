import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Divider, Stack, Pagination, Skeleton, useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  AccountTree, Add, Visibility, CheckCircle, Cancel, Refresh,
} from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  workflowApi, type Request, type RequestDetail, type Config,
} from "../api/workflowApi";

const REQUEST_TYPES = [
  "Stock Adjustment", "Product Deactivation", "Product Price Change",
  "Customer Information Change", "Inventory Import Approval",
];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
  "Draft": "default", "Submitted": "info", "Pending Approval": "warning",
  "Approved": "success", "Rejected": "error", "Cancelled": "default",
};

export default function WorkflowPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuth();
  const isAdmin = user?.role === "Super Admin" || user?.role === "Company Admin";

  const [tab, setTab] = useState(0);   // 0=Approval Queue, 1=My Requests, 2=Config
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");

  // create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({ request_type: "Stock Adjustment", related_record: "", related_id: "", reason: "", requested_values: "" });
  const [createError, setCreateError] = useState("");

  const limit = 25;
  const myRequests = tab === 1;

  const filters = useMemo(() => {
    const f: any = { page, limit, my_requests: myRequests };
    if (statusFilter) f.status = statusFilter;
    if (typeFilter) f.request_type = typeFilter;
    return f;
  }, [statusFilter, typeFilter, page, myRequests]);

  // pending count (badge)
  const { data: pending } = useQuery({
    queryKey: ["wf-pending"],
    queryFn: () => workflowApi.pendingCount(),
    staleTime: 20 * 1000,
  });

  // requests
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["wf-requests", filters],
    queryFn: () => workflowApi.listRequests(filters),
    staleTime: 15 * 1000,
    placeholderData: (prev) => prev,
  });

  // detail
  const { data: detail, refetch: refetchDetail } = useQuery<RequestDetail>({
    queryKey: ["wf-detail", selected],
    queryFn: () => workflowApi.getDetail(selected!),
    enabled: selected !== null,
  });

  // config
  const { data: configs = [], refetch: refetchConfig } = useQuery<Config[]>({
    queryKey: ["wf-config"],
    queryFn: () => workflowApi.listConfig(),
    staleTime: 60 * 1000,
  });

  const requests = data?.requests || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const parseJson = (s?: string | null) => {
    if (!s) return {};
    try { return JSON.parse(s); } catch { return {}; }
  };

  const refreshAll = () => { refetch(); refetchDetail(); };

  // ---- Approve ----
  const doApprove = async () => {
    if (selected === null) return;
    try {
      await workflowApi.approve(selected, reviewComment);
      setSelected(null); setReviewComment("");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Approve failed");
    }
  };

  // ---- Reject ----
  const doReject = async () => {
    if (selected === null) return;
    if (!reviewComment.trim()) { alert("Rejection reason required"); return; }
    try {
      await workflowApi.reject(selected, reviewComment);
      setSelected(null); setReviewComment("");
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reject failed");
    }
  };

  // ---- Cancel ----
  const doCancel = async (id: number) => {
    if (!window.confirm("Cancel this request?")) return;
    await workflowApi.cancel(id);
    setSelected(null);
    refetch();
  };

  // ---- Create request ----
  const doCreate = async () => {
    setCreateError("");
    if (!form.reason.trim()) { setCreateError("Reason is required"); return; }
    let requestedValues: any = {};
    try {
      requestedValues = form.requested_values ? JSON.parse(form.requested_values) : {};
    } catch {
      setCreateError('Requested values must be valid JSON, e.g. {"stock_quantity": 150}');
      return;
    }
    try {
      await workflowApi.create({
        request_type: form.request_type,
        related_record: form.related_record,
        related_id: form.related_id ? Number(form.related_id) : undefined,
        requested_values: requestedValues,
        reason: form.reason,
      });
      setCreateOpen(false);
      setForm({ request_type: "Stock Adjustment", related_record: "", related_id: "", reason: "", requested_values: "" });
      refetch();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || "Create failed");
    }
  };

  const SectionCard = ({ children }: any) => (
    <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4", mb: 3 }}>
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
              <AccountTree sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Workflows & Approvals</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Submit, review, and approve business requests.
                {pending && pending.pending_count > 0 && (
                  <Chip label={`${pending.pending_count} pending`} size="small" color="warning" sx={{ ml: 1.5 }} />
                )}
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>New Request</Button>
        </Box>

        {/* TABS */}
        <Paper elevation={0} sx={{ mb: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ px: 2 }}>
            <Tab label="Approval Queue" />
            <Tab label="My Requests" />
            {isAdmin && <Tab label="Configuration" />}
          </Tabs>
        </Paper>

        {/* ===== TAB 0 & 1: REQUESTS ===== */}
        {tab !== 2 && (
          <>
            {/* Filters */}
            <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 3, borderRadius: 4, border: "1px solid #eef0f4", display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <TextField select size="small" label="Status" value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} sx={{ width: { xs: "100%", sm: 180 } }}>
                <MenuItem value="">All Status</MenuItem>
                {["Pending Approval", "Approved", "Rejected", "Cancelled"].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Type" value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} sx={{ width: { xs: "100%", sm: 220 } }}>
                <MenuItem value="">All Types</MenuItem>
                {REQUEST_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <Button size="small" startIcon={<Refresh />} onClick={() => refetch()} sx={{ ml: "auto" }}>Refresh</Button>
            </Paper>

            {/* Table */}
            <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef0f4", overflow: "hidden" }}>
              <TableContainer>
                <Table sx={{ minWidth: 850 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Requested By</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Related</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading ? (
                      [...Array(5)].map((_, i) => (
                        <TableRow key={i}>{[...Array(8)].map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                      ))
                    ) : requests.length === 0 ? (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                        No requests found.
                      </TableCell></TableRow>
                    ) : requests.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.id}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{r.request_type}</TableCell>
                        <TableCell sx={{ color: "#64748b" }}>{r.requested_by}</TableCell>
                        <TableCell sx={{ color: "#64748b" }}>{r.related_record || "—"}</TableCell>
                        <TableCell>{r.priority}</TableCell>
                        <TableCell><Chip label={r.status} size="small" color={STATUS_COLOR[r.status] || "default"} /></TableCell>
                        <TableCell sx={{ fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => { setSelected(r.id); setReviewComment(""); }}><Visibility fontSize="small" /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {total > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3, flexWrap: "wrap", gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </Typography>
                <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
              </Box>
            )}
          </>
        )}

        {/* ===== TAB 2: CONFIG ===== */}
        {tab === 2 && isAdmin && (
          <SectionCard>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography fontWeight={700} fontSize={16}>Workflow Configuration</Typography>
              <Button size="small" startIcon={<Refresh />} onClick={() => refetchConfig()}>Refresh</Button>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Configure which request types require approval and the approver role.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Request Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Approver Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Approval Required</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: "#94a3b8" }}>No configurations. Default: all types require Company Admin approval.</TableCell></TableRow>
                  ) : configs.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>{c.request_type}</TableCell>
                      <TableCell>{c.approver_role}</TableCell>
                      <TableCell>{c.approval_required ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Chip label={c.is_active ? "Active" : "Inactive"} size="small"
                          color={c.is_active ? "success" : "default"}
                          onClick={() => workflowApi.toggleConfig(c.id).then(() => refetchConfig())} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        )}

        {/* ===== DETAIL dialog ===== */}
        <Dialog open={selected !== null} onClose={() => setSelected(null)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            Request #{detail?.id} — {detail?.request_type}
            {detail && <Chip label={detail.status} size="small" color={STATUS_COLOR[detail.status] || "default"} sx={{ ml: 1.5 }} />}
          </DialogTitle>
          <DialogContent>
            {detail && (
              <Box>
                {/* Info */}
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">Requested By</Typography><Typography variant="body2" fontWeight={500}>{detail.requested_by}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="caption" color="text.secondary">Related Record</Typography><Typography variant="body2" fontWeight={500}>{detail.related_record || "—"}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="caption" color="text.secondary">Reason</Typography><Typography variant="body2">{detail.reason || "—"}</Typography></Grid>
                </Grid>

                {/* CHANGE DIFF (current vs requested) */}
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600} mb={1}>Requested Changes</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: "#fef2f2", borderRadius: 2 }}>
                      <Typography variant="caption" color="error" fontWeight={600}>Current</Typography>
                      <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(parseJson(detail.current_values), null, 2)}</pre>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: "#f0fdf4", borderRadius: 2 }}>
                      <Typography variant="caption" color="success.main" fontWeight={600}>Requested</Typography>
                      <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(parseJson(detail.requested_values), null, 2)}</pre>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Review result (approved/rejected) */}
                {detail.reviewed_by && (
                  <Alert severity={detail.status === "Approved" ? "success" : "error"} sx={{ mt: 2, borderRadius: 2 }}>
                    {detail.status} by {detail.reviewed_by} — {detail.review_comment || "No comment"}
                  </Alert>
                )}

                {/* TIMELINE */}
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={600} mb={1}>Approval History</Typography>
                <Stack spacing={1}>
                  {detail.history.map((h, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#6366f1", mt: 0.8 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{h.action}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {h.performed_by} · {new Date(h.timestamp).toLocaleString()}
                          {h.comment ? ` · ${h.comment}` : ""}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>

                {/* APPROVE / REJECT (pending + not own + admin) */}
                {detail.status === "Pending Approval" && isAdmin && detail.requested_by !== user?.email && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <TextField label="Comment (required for reject)" value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)} fullWidth multiline rows={2} sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={2}>
                      <Button variant="contained" color="success" startIcon={<CheckCircle />} onClick={doApprove}>Approve</Button>
                      <Button variant="contained" color="error" startIcon={<Cancel />} onClick={doReject}>Reject</Button>
                    </Stack>
                  </>
                )}

                {/* CANCEL (own + pending) */}
                {detail.status === "Pending Approval" && detail.requested_by === user?.email && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Button variant="outlined" color="error" onClick={() => doCancel(detail.id)}>Cancel Request</Button>
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelected(null)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* ===== CREATE dialog ===== */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>New Approval Request</DialogTitle>
          <DialogContent>
            {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{createError}</Alert>}
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Request Type" value={form.request_type}
                onChange={(e) => setForm({ ...form, request_type: e.target.value })} fullWidth>
                {REQUEST_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
              <TextField label="Related Record (name)" value={form.related_record}
                onChange={(e) => setForm({ ...form, related_record: e.target.value })} fullWidth
                placeholder="e.g. iPhone 15" />
              <TextField label="Related ID (product/customer id)" value={form.related_id}
                onChange={(e) => setForm({ ...form, related_id: e.target.value })} fullWidth type="number"
                placeholder="e.g. 5" />
              <TextField label="Requested Values (JSON)" value={form.requested_values}
                onChange={(e) => setForm({ ...form, requested_values: e.target.value })} fullWidth multiline rows={2}
                placeholder='e.g. {"stock_quantity": 150}' />
              <TextField label="Reason" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })} fullWidth multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={doCreate}>Submit Request</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}