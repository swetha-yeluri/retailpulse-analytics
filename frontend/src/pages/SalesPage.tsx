import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, TableContainer, Divider,
} from "@mui/material";
import { Add, Edit, Delete, Search, Visibility } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { salesApi, type Sale, type SaleData } from "../api/salesApi";
import { productApi, type Product } from "../api/productApi";
import { categoryApi, type Category } from "../api/categoryApi";

const CHANNELS = ["Retail Store", "Online Store", "Marketplace"];
const PAYMENTS = ["Cash", "Card", "UPI", "Bank Transfer"];

const EMPTY: SaleData = {
  customer_name: "", product_id: 0, quantity: 1, unit_price: 0,
  discount: 0, tax: 0, sales_channel: "Retail Store", payment_method: "Cash",
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [payment, setPayment] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SaleData>(EMPTY);
  const [error, setError] = useState("");

  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search, channel, payment, sort_by: sortBy };
      if (categoryFilter) filters.category_id = categoryFilter;
      setSales(await salesApi.list(filters));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productApi.list({ status: "Active" }).then(setProducts).catch(() => {});
    categoryApi.list().then(setCategories).catch(() => {});
    load();
  }, []);

  useEffect(() => { load(); }, [channel, payment, sortBy, categoryFilter]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (s: Sale) => {
    setForm({
      customer_name: s.customer_name, product_id: s.product_id, quantity: s.quantity,
      unit_price: s.unit_price, discount: s.discount, tax: s.tax,
      sales_channel: s.sales_channel, payment_method: s.payment_method,
    });
    setEditId(s.id);
    setError("");
    setOpen(true);
  };

  const set = (k: keyof SaleData) => (e: any) => {
    const num = ["product_id", "quantity", "unit_price", "discount", "tax"].includes(k);
    const raw = e.target.value;
    const value = num ? (raw === "" ? 0 : Number(raw)) : raw;
    const next = { ...form, [k]: value };
    if (k === "product_id") {
      const p = products.find((x) => x.id === value);
      if (p) next.unit_price = p.unit_price;
    }
    setForm(next);
  };

  const selectedProduct = products.find((p) => p.id === form.product_id);
  const computedTotal = form.unit_price * form.quantity - form.discount + form.tax;

  const save = async () => {
    setError("");
    if (!form.product_id) { setError("Product selection is mandatory"); return; }
    if (!form.customer_name.trim()) { setError("Customer name is required"); return; }
    if (form.quantity <= 0) { setError("Quantity must be greater than zero"); return; }
    if (form.unit_price < 0) { setError("Unit price cannot be negative"); return; }
    if (form.tax < 0) { setError("Tax cannot be negative"); return; }
    if (form.discount > form.unit_price * form.quantity) {
      setError("Discount cannot exceed total product value"); return;
    }
    if (!editId && selectedProduct && form.quantity > selectedProduct.stock_quantity) {
      setError(`Insufficient stock. Available: ${selectedProduct.stock_quantity}`); return;
    }

    try {
      if (editId) {
        await salesApi.update(editId, form);
      } else {
        const result = await salesApi.create(form);
        if (result.stock_alert) {
          alert("⚠️ " + result.stock_alert);
        }
      }
      setOpen(false);
      load();
      productApi.list({ status: "Active" }).then(setProducts).catch(() => {});
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (s: Sale) => {
    if (!window.confirm(`Delete sale "${s.invoice_number}"?`)) return;
    try {
      await salesApi.remove(s.id);
      load();
      productApi.list({ status: "Active" }).then(setProducts).catch(() => {});
    } catch (err: any) { alert(err.response?.data?.detail || "Delete failed"); }
  };

  const filteredSales = sales.filter((s) => {
    if (fromDate && new Date(s.sale_date) < new Date(fromDate)) return false;
    if (toDate && new Date(s.sale_date) > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Sales</Typography>
          <Typography color="text.secondary">Record and manage sales transactions.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>New Sale</Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        {/* Row 1 — search + dropdowns */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField placeholder="Search invoice, customer..." size="small" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            sx={{ width: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

          <TextField select size="small" label="Category" value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: 160 }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Channel" value={channel}
            onChange={(e) => setChannel(e.target.value)} sx={{ width: 160 }}>
            <MenuItem value="">All Channels</MenuItem>
            {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Payment" value={payment}
            onChange={(e) => setPayment(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="">All Payments</MenuItem>
            {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Sort By" value={sortBy}
            onChange={(e) => setSortBy(e.target.value)} sx={{ width: 160 }}>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="invoice">Invoice Number</MenuItem>
            <MenuItem value="amount">Total Amount</MenuItem>
          </TextField>
        </Box>

        {/* Row 2 — date range */}
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Date Range:
          </Typography>
          <TextField type="date" size="small" label="From Date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }} />
          <TextField type="date" size="small" label="To Date" value={toDate}
            onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }}
            sx={{ width: 180 }} />
          {(fromDate || toDate) && (
            <Button size="small" onClick={() => { setFromDate(""); setToDate(""); }}>
              Clear Dates
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={() => load()}>Search</Button>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Channel</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center">Loading...</TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                  No sales found.
                </TableCell></TableRow>
              ) : (
                filteredSales.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{s.invoice_number}</TableCell>
                    <TableCell>{s.customer_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{s.product_name}</TableCell>
                    <TableCell align="right">{s.quantity}</TableCell>
                    <TableCell><Chip label={s.sales_channel} size="small" variant="outlined" /></TableCell>
                    <TableCell>{s.payment_method}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>₹{s.total_amount.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => setViewSale(s)} title="View"><Visibility fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openEdit(s)} title="Edit"><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => remove(s)} sx={{ color: "#ef4444" }} title="Delete"><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* VIEW DETAILS dialog */}
      <Dialog open={!!viewSale} onClose={() => setViewSale(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Sale Details</DialogTitle>
        <DialogContent>
          {viewSale && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">{viewSale.invoice_number}</Typography>
                <Chip label={viewSale.sales_channel} size="small" variant="outlined" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: "Customer", value: viewSale.customer_name },
                  { label: "Date", value: new Date(viewSale.sale_date).toLocaleString() },
                  { label: "Product", value: viewSale.product_name },
                  { label: "Category", value: viewSale.category_name },
                  { label: "Quantity", value: viewSale.quantity },
                  { label: "Unit Price", value: `₹${viewSale.unit_price.toFixed(2)}` },
                  { label: "Discount", value: `₹${viewSale.discount.toFixed(2)}` },
                  { label: "Tax", value: `₹${viewSale.tax.toFixed(2)}` },
                  { label: "Payment Method", value: viewSale.payment_method },
                  { label: "Created By", value: viewSale.created_by || "—" },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="h6">Final Amount</Typography>
                <Typography variant="h6" fontWeight="bold" color="#6366f1">
                  ₹{viewSale.total_amount.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewSale(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Sale" : "New Sale"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Customer Name *" fullWidth value={form.customer_name}
                onChange={set("customer_name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Product *" select fullWidth value={form.product_id || ""}
                onChange={set("product_id")} disabled={!!editId}>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock_quantity})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {selectedProduct && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  Category: {selectedProduct.category_name} | Available Stock: {selectedProduct.stock_quantity} {selectedProduct.unit_of_measure}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField label="Quantity *" type="number" fullWidth
                value={form.quantity || ""} onChange={set("quantity")}
                inputProps={{ min: 1 }}
                helperText="Number of units sold" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Unit Price *" type="number" fullWidth
                value={form.unit_price || ""} onChange={set("unit_price")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText="Price per unit" />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Discount" type="number" fullWidth
                value={form.discount || ""} onChange={set("discount")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Tax" type="number" fullWidth
                value={form.tax || ""} onChange={set("tax")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Sales Channel" select fullWidth value={form.sales_channel}
                onChange={set("sales_channel")}>
                {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Payment Method" select fullWidth value={form.payment_method}
                onChange={set("payment_method")}>
                {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography fontWeight={600}>Total Amount</Typography>
                <Typography variant="h6" fontWeight="bold" color="#6366f1">₹{computedTotal.toFixed(2)}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>{editId ? "Update" : "Create Sale"}</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}