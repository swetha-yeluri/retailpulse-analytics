import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, TableContainer,
  Divider, CircularProgress,
} from "@mui/material";
import { Add, Edit, Delete, Search, Visibility } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { customerApi, type Customer, type CustomerData } from "../api/customerApi";

const SEGMENTS = ["New", "Regular", "Loyal", "VIP"];

const SEGMENT_COLOR: Record<string, "default" | "primary" | "success" | "warning"> = {
  New: "default",       
  Regular: "primary",   
  Loyal: "success",  
  VIP: "warning",       
};

const EMPTY: CustomerData = {
  first_name: "", last_name: "", email: "", phone: "",
  address: "", city: "", state: "", country: "", postal_code: "",
};


const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone = (v: string) => /^[0-9+\-\s]{7,15}$/.test(v);

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerData>(EMPTY);
  const [error, setError] = useState("");

  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search };
      if (segmentFilter) filters.segment = segmentFilter;
      if (statusFilter) filters.status = statusFilter;
      setCustomers(await customerApi.list(filters));
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [segmentFilter, statusFilter]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (c: Customer) => {
    setForm({
      first_name: c.first_name, last_name: c.last_name, email: c.email, phone: c.phone,
      address: c.address || "", city: c.city || "", state: c.state || "",
      country: c.country || "", postal_code: c.postal_code || "",
    });
    setEditId(c.id);
    setError("");
    setOpen(true);
  };

  const set = (k: keyof CustomerData) => (e: any) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError("");
  
    if (!form.first_name.trim()) return setError("First Name is required");
    if (!form.last_name.trim()) return setError("Last Name is required");
    if (!form.email.trim()) return setError("Email is required");
    if (!isEmail(form.email)) return setError("Please enter a valid email address");
    if (!form.phone.trim()) return setError("Phone Number is required");
    if (!isPhone(form.phone)) return setError("Please enter a valid phone number");

    try {
      if (editId) await customerApi.update(editId, form);
      else await customerApi.create(form);
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save customer");
    }
  };

  const remove = async (c: Customer) => {
    if (!window.confirm(`Delete customer "${c.first_name} ${c.last_name}"?`)) return;
    try { await customerApi.remove(c.id); load(); }
    catch (err: any) { alert(err.response?.data?.detail || "Delete failed"); }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Customers</Typography>
          <Typography color="text.secondary">Manage your customer database.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Customer</Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField placeholder="Search by name or email..." size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

        <TextField select size="small" label="Segment" value={segmentFilter}
          onChange={(e) => setSegmentFilter(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">All Segments</MenuItem>
          {SEGMENTS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        <TextField select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={() => load()}>Search</Button>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Customer Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Segment</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total Purchases</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total Spend</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: "#94a3b8" }}>
                  No customers found. Click "Add Customer" to create one.
                </TableCell></TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{c.first_name} {c.last_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{c.email}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{c.phone}</TableCell>
                    <TableCell>
                      <Chip label={c.segment} size="small" color={SEGMENT_COLOR[c.segment] || "default"} />
                    </TableCell>
                    <TableCell align="right">{c.total_orders}</TableCell>
                    <TableCell align="right">₹{c.total_revenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={c.status} size="small"
                        color={c.status === "Active" ? "success" : "default"} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => setViewCustomer(c)} title="View"><Visibility fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(c)} title="Edit"><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => remove(c)} sx={{ color: "#ef4444" }} title="Delete"><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* DETAILS dialog */}
      <Dialog open={!!viewCustomer} onClose={() => setViewCustomer(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Customer Details</DialogTitle>
        <DialogContent>
          {viewCustomer && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">{viewCustomer.first_name} {viewCustomer.last_name}</Typography>
                <Chip label={viewCustomer.segment} size="small" color={SEGMENT_COLOR[viewCustomer.segment] || "default"} />
                <Chip label={viewCustomer.status} size="small"
                  color={viewCustomer.status === "Active" ? "success" : "default"} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: "Customer Code", value: viewCustomer.customer_code },
                  { label: "Email", value: viewCustomer.email },
                  { label: "Phone", value: viewCustomer.phone },
                  { label: "Address", value: viewCustomer.address || "—" },
                  { label: "City", value: viewCustomer.city || "—" },
                  { label: "State", value: viewCustomer.state || "—" },
                  { label: "Country", value: viewCustomer.country || "—" },
                  { label: "Postal Code", value: viewCustomer.postal_code || "—" },
                  { label: "Total Orders", value: viewCustomer.total_orders },
                  { label: "Total Spend", value: `₹${viewCustomer.total_revenue.toFixed(2)}` },
                  { label: "Last Purchase", value: viewCustomer.last_purchase_date ? new Date(viewCustomer.last_purchase_date).toLocaleDateString() : "—" },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary">Recent Purchase History</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {viewCustomer.total_orders === 0 ? "No purchases yet." : `${viewCustomer.total_orders} order(s) recorded.`}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewCustomer(null)}>Close</Button>
          {viewCustomer && (
            <Button variant="contained" onClick={() => { openEdit(viewCustomer); setViewCustomer(null); }}>Edit</Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Customer" : "Add Customer"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="First Name *" fullWidth value={form.first_name} onChange={set("first_name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Last Name *" fullWidth value={form.last_name} onChange={set("last_name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email *" fullWidth value={form.email} onChange={set("email")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone *" fullWidth value={form.phone} onChange={set("phone")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" fullWidth value={form.address} onChange={set("address")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="City" fullWidth value={form.city} onChange={set("city")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="State" fullWidth value={form.state} onChange={set("state")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Country" fullWidth value={form.country} onChange={set("country")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Postal Code" fullWidth value={form.postal_code} onChange={set("postal_code")} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>{editId ? "Update" : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}