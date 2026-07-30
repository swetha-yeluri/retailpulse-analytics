import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, Switch, Tooltip,
  TableContainer, Divider,
} from "@mui/material";
import { Add, Edit, Delete, Search, Visibility } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { customerApi, type Customer, type CustomerData } from "../api/customerApi";

const TYPES = ["Retail", "Wholesale", "Corporate"];
const CHANNELS = ["Retail Store", "Online Store", "Marketplace"];
const GENDERS = ["Male", "Female", "Other"];

const SEGMENT_COLOR: Record<string, "default" | "primary" | "success" | "warning"> = {
  "New Customer": "default",
  "Regular Customer": "primary",
  "Loyal Customer": "success",
  "VIP Customer": "warning",
};

const EMPTY: CustomerData = {
  full_name: "", email: "", phone: "", date_of_birth: "", gender: "",
  address: "", city: "", state: "", country: "",
  customer_type: "Retail", preferred_sales_channel: "Retail Store", status: "Active",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CustomerData>(EMPTY);
  const [error, setError] = useState("");

  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search, sort_by: sortBy };
      if (typeFilter) filters.customer_type = typeFilter;
      if (statusFilter) filters.status = statusFilter;
      setCustomers(await customerApi.list(filters));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [typeFilter, statusFilter, sortBy]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (c: Customer) => {
    setForm({
      full_name: c.full_name, email: c.email, phone: c.phone,
      date_of_birth: c.date_of_birth || "", gender: c.gender || "",
      address: c.address || "", city: c.city || "", state: c.state || "",
      country: c.country || "", customer_type: c.customer_type,
      preferred_sales_channel: c.preferred_sales_channel || "Retail Store",
      status: c.status,
    });
    setEditId(c.id);
    setError("");
    setOpen(true);
  };

  const set = (k: keyof CustomerData) => (e: any) =>
    setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    setError("");
    if (!form.full_name.trim()) { setError("Customer Name is required"); return; }
    if (!form.email.trim()) { setError("Email is required"); return; }
    if (!form.phone.trim()) { setError("Phone Number is required"); return; }
    if (!form.customer_type) { setError("Customer Type is required"); return; }

    try {
      if (editId) await customerApi.update(editId, form);
      else await customerApi.create(form);
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (c: Customer) => {
    if (!window.confirm(`Delete customer "${c.full_name}"?`)) return;
    try { await customerApi.remove(c.id); load(); }
    catch (err: any) { alert(err.response?.data?.detail || "Delete failed"); }
  };

  const toggleStatus = async (c: Customer) => {
    try { await customerApi.toggleStatus(c.id); load(); }
    catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Customers</Typography>
          <Typography color="text.secondary">Manage your customer records.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Customer</Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField placeholder="Search name, code, email, phone..." size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          sx={{ width: 280 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

        <TextField select size="small" label="Type" value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)} sx={{ width: 150 }}>
          <MenuItem value="">All Types</MenuItem>
          {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>

        <TextField select size="small" label="Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>

        <TextField select size="small" label="Sort By" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} sx={{ width: 160 }}>
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="spend">Total Spend</MenuItem>
          <MenuItem value="orders">Total Orders</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={() => load()}>Search</Button>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Segment</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Orders</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Revenue</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} align="center">Loading...</TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                  No customers found.
                </TableCell></TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell sx={{ color: "#64748b" }}>{c.customer_code}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{c.full_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{c.email}</TableCell>
                    <TableCell>{c.customer_type}</TableCell>
                    <TableCell>
                      <Chip label={c.segment} size="small" color={SEGMENT_COLOR[c.segment] || "default"} />
                    </TableCell>
                    <TableCell align="right">{c.total_orders}</TableCell>
                    <TableCell align="right">₹{c.total_revenue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Tooltip title={c.status === "Active" ? "Click to deactivate" : "Click to activate"}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Switch size="small" checked={c.status === "Active"}
                            onChange={() => toggleStatus(c)} />
                          <Chip label={c.status} size="small"
                            color={c.status === "Active" ? "success" : "default"} />
                        </Box>
                      </Tooltip>
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

      {/* VIEW PROFILE dialog */}
      <Dialog open={!!viewCustomer} onClose={() => setViewCustomer(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Customer Profile</DialogTitle>
        <DialogContent>
          {viewCustomer && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">{viewCustomer.full_name}</Typography>
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
                  { label: "Type", value: viewCustomer.customer_type },
                  { label: "City", value: viewCustomer.city || "—" },
                  { label: "Country", value: viewCustomer.country || "—" },
                  { label: "Total Orders", value: viewCustomer.total_orders },
                  { label: "Total Revenue", value: `₹${viewCustomer.total_revenue.toFixed(2)}` },
                  { label: "Avg Order Value", value: `₹${viewCustomer.average_order_value.toFixed(2)}` },
                  { label: "Last Purchase", value: viewCustomer.last_purchase_date ? new Date(viewCustomer.last_purchase_date).toLocaleDateString() : "—" },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
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
              <TextField label="Full Name *" fullWidth value={form.full_name} onChange={set("full_name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email *" fullWidth value={form.email} onChange={set("email")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone *" fullWidth value={form.phone} onChange={set("phone")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Birth" type="date" fullWidth
                value={form.date_of_birth} onChange={set("date_of_birth")}
                InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Gender" select fullWidth value={form.gender} onChange={set("gender")}>
                <MenuItem value="">—</MenuItem>
                {GENDERS.map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Customer Type *" select fullWidth
                value={form.customer_type} onChange={set("customer_type")}>
                {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" fullWidth value={form.address} onChange={set("address")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="City" fullWidth value={form.city} onChange={set("city")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="State" fullWidth value={form.state} onChange={set("state")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Country" fullWidth value={form.country} onChange={set("country")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Preferred Channel" select fullWidth
                value={form.preferred_sales_channel} onChange={set("preferred_sales_channel")}>
                {CHANNELS.map((ch) => <MenuItem key={ch} value={ch}>{ch}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Status" select fullWidth value={form.status} onChange={set("status")}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
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