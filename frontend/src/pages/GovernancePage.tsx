import { useState } from "react";
import {
  Box, Paper, Typography, Grid, Button, MenuItem, TextField, Alert, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Stack, Switch,
} from "@mui/material";
import { AdminPanelSettings, Add, Edit, CheckCircle, Cancel, Refresh } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import {
  governanceApi, type GovernanceDashboard, type PermissionMatrix,
  type UserAccess, type AccessRequest, type AccessReview, type PermissionHistoryItem,
} from "../api/governanceApi";

const ROLES = ["Super Admin", "Company Admin", "Analyst", "Viewer"];

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  Active: "success", Inactive: "default",
  Pending: "warning", Approved: "success", Rejected: "error", Cancelled: "default",
  Reviewed: "success", Flagged: "error",
};

function accessColor(level: string): string {
  if (level === "Full" || level === "Manage") return "#10b981";
  if (level === "No Access") return "#ef4444";
  return "#f59e0b";
}

export default function GovernancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Super Admin" || user?.role === "Company Admin";

  const [tab, setTab] = useState(0);

  const [roleDialog, setRoleDialog] = useState<UserAccess | null>(null);
  const [newRole, setNewRole] = useState("");
  const [roleReason, setRoleReason] = useState("");

  const [reqDialog, setReqDialog] = useState(false);
  const [reqRole, setReqRole] = useState("Company Admin");
  const [reqReason, setReqReason] = useState("");

  const [reviewDialog, setReviewDialog] = useState<UserAccess | null>(null);
  const [reviewStatus, setReviewStatus] = useState("Reviewed");
  const [reviewComment, setReviewComment] = useState("");

  const { data: dashboard, refetch: refetchDash } = useQuery<GovernanceDashboard>({
    queryKey: ["gov-dashboard"], queryFn: () => governanceApi.dashboard(), staleTime: 30000,
  });
  const { data: matrix } = useQuery<PermissionMatrix>({
    queryKey: ["gov-matrix"], queryFn: () => governanceApi.matrix(), staleTime: 300000,
  });
  const { data: users = [], refetch: refetchUsers } = useQuery<UserAccess[]>({
    queryKey: ["gov-users"], queryFn: () => governanceApi.users(), staleTime: 15000,
  });
  const { data: requests = [], refetch: refetchReqs } = useQuery<AccessRequest[]>({
    queryKey: ["gov-requests"], queryFn: () => governanceApi.listRequests(), staleTime: 15000,
  });
  const { data: reviews = [], refetch: refetchReviews } = useQuery<AccessReview[]>({
    queryKey: ["gov-reviews"], queryFn: () => governanceApi.listReviews(), staleTime: 15000,
  });
  const { data: history = [] } = useQuery<PermissionHistoryItem[]>({
    queryKey: ["gov-history"], queryFn: () => governanceApi.history(), staleTime: 15000,
  });

  const kpiCards = [
    { label: "Total Users", value: dashboard?.total_users ?? "—", color: "#6366f1" },
    { label: "Active", value: dashboard?.active_users ?? "—", color: "#10b981" },
    { label: "Inactive", value: dashboard?.inactive_users ?? "—", color: "#94a3b8" },
    { label: "Admins", value: dashboard?.elevated_permission_users ?? "—", color: "#f59e0b" },
    { label: "Pending Requests", value: dashboard?.pending_access_requests ?? "—", color: "#8b5cf6" },
    { label: "Permission Changes", value: dashboard?.recent_permission_changes ?? "—", color: "#3b82f6" },
  ];

  const doRoleChange = async () => {
    if (!roleDialog) return;
    try {
      await governanceApi.updateRole(roleDialog.id, newRole, roleReason);
      setRoleDialog(null); setRoleReason("");
      refetchUsers(); refetchDash();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Role change failed");
    }
  };

  const toggleStatus = async (u: UserAccess) => {
    if (!window.confirm(`${u.status === "Active" ? "Deactivate" : "Activate"} ${u.email}?`)) return;
    try {
      await governanceApi.toggleStatus(u.id);
      refetchUsers(); refetchDash();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const doCreateReq = async () => {
    try {
      await governanceApi.createRequest(reqRole, reqReason);
      setReqDialog(false); setReqReason("");
      refetchReqs(); refetchDash();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const approveReq = async (id: number) => {
    const comment = prompt("Approval comment (optional):") || "";
    try {
      await governanceApi.approveRequest(id, comment);
      refetchReqs(); refetchUsers(); refetchDash();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  const rejectReq = async (id: number) => {
    const comment = prompt("Rejection reason (required):");
    if (!comment) return;
    try {
      await governanceApi.rejectRequest(id, comment);
      refetchReqs(); refetchDash();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  const doReview = async () => {
    if (!reviewDialog) return;
    try {
      await governanceApi.createReview(reviewDialog.email, reviewStatus, reviewComment);
      setReviewDialog(null); setReviewComment("");
      refetchReviews(); refetchDash();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 4, flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AdminPanelSettings sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Data Governance</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Manage roles, permissions, and access control.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" startIcon={<Add />} onClick={() => setReqDialog(true)}>Request Access</Button>
            <Button variant="contained" startIcon={<Refresh />} onClick={() => { refetchDash(); refetchUsers(); refetchReqs(); refetchReviews(); }}>Refresh</Button>
          </Stack>
        </Box>

        <Grid container spacing={2.5} mb={4}>
          {kpiCards.map((c) => (
            <Grid item xs={6} sm={4} md={2} key={c.label}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, textAlign: "center" }}>
                <Typography variant="h5" fontWeight="bold" sx={{ color: c.color }}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Paper elevation={0} sx={{ mb: 3, borderRadius: 4, border: "1px solid #eef0f4" }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
            <Tab label="Permission Matrix" />
            <Tab label="User Access" />
            <Tab label="Access Requests" />
            <Tab label="Access Review" />
            <Tab label="Change History" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Typography fontWeight={700} fontSize={16} mb={2}>Permission Matrix</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                    {matrix?.roles.map((r) => (
                      <TableCell key={r} sx={{ fontWeight: 700 }} align="center">{r}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {matrix?.rows.map((row) => (
                    <TableRow key={row.module} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{row.module}</TableCell>
                      {matrix.roles.map((r) => (
                        <TableCell key={r} align="center">
                          <Chip label={row.permissions[r] || "—"} size="small"
                            sx={{ bgcolor: accessColor(row.permissions[r]), color: "white", fontSize: 11 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tab === 1 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Typography fontWeight={700} fontSize={16} mb={2}>User Access Management</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "#94a3b8" }}>No users.</TableCell></TableRow>
                  ) : users.map((u) => (
                    <TableRow key={u.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{u.email}</TableCell>
                      <TableCell><Chip label={u.role} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell><Chip label={u.status} size="small" color={STATUS_COLOR[u.status] || "default"} /></TableCell>
                      {isAdmin && (
                        <TableCell align="center">
                          <IconButton size="small" title="Change Role"
                            onClick={() => { setRoleDialog(u); setNewRole(u.role); setRoleReason(""); }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <Switch size="small" checked={u.status === "Active"} onChange={() => toggleStatus(u)} />
                          <Button size="small" onClick={() => { setReviewDialog(u); setReviewStatus("Reviewed"); setReviewComment(""); }}>Review</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tab === 2 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Typography fontWeight={700} fontSize={16} mb={2}>Access Requests</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Requested By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Requested</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    {isAdmin && <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: "#94a3b8" }}>No requests.</TableCell></TableRow>
                  ) : requests.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.id}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{r.requested_by}</TableCell>
                      <TableCell>{r.current_role || "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{r.requested_role}</TableCell>
                      <TableCell sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#64748b" }}>{r.reason}</TableCell>
                      <TableCell><Chip label={r.status} size="small" color={STATUS_COLOR[r.status] || "default"} /></TableCell>
                      {isAdmin && (
                        <TableCell align="center">
                          {r.status === "Pending" && r.requested_by !== user?.email && (
                            <>
                              <IconButton size="small" color="success" onClick={() => approveReq(r.id)}><CheckCircle fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => rejectReq(r.id)}><Cancel fontSize="small" /></IconButton>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tab === 3 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Typography fontWeight={700} fontSize={16} mb={2}>Access Review History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Comment</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reviewed By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>No reviews yet. Use the Review button in User Access tab.</TableCell></TableRow>
                  ) : reviews.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{r.user_email}</TableCell>
                      <TableCell>{r.user_role || "—"}</TableCell>
                      <TableCell><Chip label={r.review_status} size="small" color={STATUS_COLOR[r.review_status] || "default"} /></TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{r.review_comment || "—"}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{r.reviewed_by || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {tab === 4 && (
          <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Typography fontWeight={700} fontSize={16} mb={2}>Permission Change History</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Previous Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>New Role</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Changed By</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: "#94a3b8" }}>No changes yet.</TableCell></TableRow>
                  ) : history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{h.target_user}</TableCell>
                      <TableCell><Chip label={h.previous_role || "—"} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={h.new_role || "—"} size="small" color="primary" /></TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{h.changed_by}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{h.reason || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 13 }}>{new Date(h.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        <Dialog open={roleDialog !== null} onClose={() => setRoleDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Change Role</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Changing this user's role affects their access immediately.
            </Alert>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="New Role" value={newRole} onChange={(e) => setNewRole(e.target.value)} fullWidth>
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField label="Reason" value={roleReason} onChange={(e) => setRoleReason(e.target.value)} fullWidth multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setRoleDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={doRoleChange}>Update Role</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={reqDialog} onClose={() => setReqDialog(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Request Access</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Submitting a request does not grant access. An admin must approve it.
            </Alert>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Requested Role" value={reqRole} onChange={(e) => setReqRole(e.target.value)} fullWidth>
                {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField label="Business Reason" value={reqReason} onChange={(e) => setReqReason(e.target.value)} fullWidth multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setReqDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={doCreateReq}>Submit Request</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={reviewDialog !== null} onClose={() => setReviewDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Review Access</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField select label="Review Status" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)} fullWidth>
                <MenuItem value="Reviewed">Reviewed</MenuItem>
                <MenuItem value="Flagged">Flagged (unnecessary permissions)</MenuItem>
              </TextField>
              <TextField label="Review Comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} fullWidth multiline rows={2} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button variant="contained" onClick={doReview}>Submit Review</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}