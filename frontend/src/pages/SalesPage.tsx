import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, TableContainer,
  Divider, CircularProgress,
} from "@mui/material";
import { Add, Edit, Delete, Search, Visibility, PictureAsPdf, Download } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { salesApi, type Sale, type SaleData } from "../api/salesApi";
import { productApi, type Product } from "../api/productApi";
import { categoryApi, type Category } from "../api/categoryApi";
import { customerApi, type Customer } from "../api/customerApi";

const CHANNELS = ["Retail Store", "Online Store", "Marketplace"];
const PAYMENTS = ["Cash", "Card", "UPI", "Bank Transfer"];
const PAYMENT_STATUSES = ["Paid", "Pending"];

const EMPTY: SaleData = {
  customer_name: "", customer_id: undefined, product_id: 0, quantity: 1, unit_price: 0,
  discount: 0, tax: 0, sales_channel: "Retail Store", payment_method: "Cash",
  payment_status: "Paid", notes: "",
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [payment, setPayment] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<SaleData>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewSale, setViewSale] = useState<Sale | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search, channel, payment, payment_status: paymentStatus, sort_by: sortBy };
      if (categoryFilter) filters.category_id = categoryFilter;
      setSales(await salesApi.list(filters));
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productApi.list({ status: "Active" }).then(setProducts).catch(() => {});
    categoryApi.list().then(setCategories).catch(() => {});
    customerApi.list({ status: "Active" }).then(setCustomers).catch(() => {});
    load();
  }, []);

  useEffect(() => { load(); }, [channel, payment, paymentStatus, sortBy, categoryFilter]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (s: Sale) => {
    setForm({
      customer_name: s.customer_name, customer_id: s.customer_id ?? undefined,
      product_id: s.product_id, quantity: s.quantity,
      unit_price: s.unit_price, discount: s.discount, tax: s.tax,
      sales_channel: s.sales_channel, payment_method: s.payment_method,
      payment_status: s.payment_status || "Paid", notes: s.notes || "",
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
      if (p) next.unit_price = p.unit_price;   // auto-fill unit price
    }
    setForm(next);
  };

  const setCustomer = (e: any) => {
    const id = e.target.value === "" ? undefined : Number(e.target.value);
    const c = customers.find((x) => x.id === id);
    setForm({
      ...form, customer_id: id,
      customer_name: c ? `${c.first_name} ${c.last_name}` : form.customer_name,
    });
  };

  const selectedProduct = products.find((p) => p.id === form.product_id);

  
  const subtotal = form.unit_price * form.quantity;
  const grandTotal = subtotal - form.discount + form.tax;

  const save = async () => {
    setError("");
    if (!form.product_id) { setError("Product selection is mandatory"); return; }
    if (!form.customer_name.trim()) { setError("Customer name is required"); return; }
    if (form.quantity <= 0) { setError("Quantity must be greater than zero"); return; }
    if (form.unit_price < 0) { setError("Unit price cannot be negative"); return; }
    if (form.discount > subtotal) { setError("Discount cannot exceed subtotal"); return; }
    if (!editId && selectedProduct && form.quantity > selectedProduct.stock_quantity) {
      setError(`Insufficient stock. Available: ${selectedProduct.stock_quantity}`); return;
    }
    setSaving(true);
    try {
      if (editId) {
        await salesApi.update(editId, form);
      } else {
        const result = await salesApi.create(form);
        if (result.stock_alert) alert("⚠️ " + result.stock_alert);
      }
      setOpen(false);
      load();
      productApi.list({ status: "Active" }).then(setProducts).catch(() => {});
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
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

  
  const exportCSV = (s: Sale) => {
    let csv = "RetailPulse Invoice\n\n";
    csv += `Invoice Number,${s.invoice_number}\n`;
    csv += `Customer,${s.customer_name}\n`;
    csv += `Date,${new Date(s.sale_date).toLocaleString()}\n`;
    csv += `Payment Method,${s.payment_method}\n`;
    csv += `Payment Status,${s.payment_status}\n\n`;
    csv += "Product,SKU,Quantity,Unit Price,Line Total\n";
    csv += `${s.product_name},${s.product_sku},${s.quantity},${s.unit_price},${(s.unit_price * s.quantity).toFixed(2)}\n\n`;
    csv += `Subtotal,${(s.unit_price * s.quantity).toFixed(2)}\n`;
    csv += `Discount,${s.discount}\n`;
    csv += `Tax,${s.tax}\n`;
    csv += `Grand Total,${s.total_amount.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${s.invoice_number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  
  const exportPDF = async (s: Sale) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("INVOICE", 14, 20);
    doc.setFontSize(11);
    doc.text(`Invoice: ${s.invoice_number}`, 14, 32);
    doc.text(`Date: ${new Date(s.sale_date).toLocaleDateString()}`, 14, 39);
    doc.text(`Customer: ${s.customer_name}`, 14, 46);
    doc.text(`Payment: ${s.payment_method} (${s.payment_status})`, 14, 53);

    doc.line(14, 60, 196, 60);
    doc.text("Product", 14, 68);
    doc.text("Qty", 110, 68);
    doc.text("Price", 140, 68);
    doc.text("Total", 170, 68);
    doc.line(14, 71, 196, 71);

    doc.text(s.product_name, 14, 79);
    doc.text(String(s.quantity), 110, 79);
    doc.text(`Rs.${s.unit_price}`, 140, 79);
    doc.text(`Rs.${(s.unit_price * s.quantity).toFixed(2)}`, 170, 79);

    let y = 95;
    doc.text(`Subtotal: Rs.${(s.unit_price * s.quantity).toFixed(2)}`, 130, y); y += 7;
    doc.text(`Discount: Rs.${s.discount}`, 130, y); y += 7;
    doc.text(`Tax: Rs.${s.tax}`, 130, y); y += 7;
    doc.setFontSize(13);
    doc.text(`Grand Total: Rs.${s.total_amount.toFixed(2)}`, 130, y);

    doc.save(`invoice-${s.invoice_number}.pdf`);
  };

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
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <TextField placeholder="Search invoice, customer..." size="small" value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            sx={{ width: 220 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

          <TextField select size="small" label="Category" value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: 150 }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Payment" value={payment}
            onChange={(e) => setPayment(e.target.value)} sx={{ width: 140 }}>
            <MenuItem value="">All Payments</MenuItem>
            {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Status" value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)} sx={{ width: 130 }}>
            <MenuItem value="">All Status</MenuItem>
            {PAYMENT_STATUSES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Sort By" value={sortBy}
            onChange={(e) => setSortBy(e.target.value)} sx={{ width: 150 }}>
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="invoice">Invoice Number</MenuItem>
            <MenuItem value="amount">Total Amount</MenuItem>
            <MenuItem value="customer">Customer Name</MenuItem>
          </TextField>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Date Range:</Typography>
          <TextField type="date" size="small" label="From" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
          <TextField type="date" size="small" label="To" value={toDate}
            onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 170 }} />
          {(fromDate || toDate) && (
            <Button size="small" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="outlined" onClick={() => load()}>Search</Button>
        </Box>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Qty</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Payment</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "#94a3b8" }}>No sales found.</TableCell></TableRow>
              ) : (
                filteredSales.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{s.invoice_number}</TableCell>
                    <TableCell>{s.customer_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{s.product_name}</TableCell>
                    <TableCell align="right">{s.quantity}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>₹{s.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{s.payment_method}</TableCell>
                    <TableCell>
                      <Chip label={s.payment_status} size="small"
                        color={s.payment_status === "Paid" ? "success" : "warning"} />
                    </TableCell>
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

      {/* INVOICE PREVIEW / DETAILS dialog */}
      <Dialog open={!!viewSale} onClose={() => setViewSale(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Invoice Details</DialogTitle>
        <DialogContent>
          {viewSale && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">{viewSale.invoice_number}</Typography>
                <Chip label={viewSale.payment_status} size="small"
                  color={viewSale.payment_status === "Paid" ? "success" : "warning"} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: "Customer", value: viewSale.customer_name },
                  { label: "Date", value: new Date(viewSale.sale_date).toLocaleString() },
                  { label: "Product", value: viewSale.product_name },
                  { label: "SKU", value: viewSale.product_sku || "—" },
                  { label: "Category", value: viewSale.category_name },
                  { label: "Quantity", value: viewSale.quantity },
                  { label: "Unit Price", value: `₹${viewSale.unit_price.toFixed(2)}` },
                  { label: "Line Total", value: `₹${(viewSale.unit_price * viewSale.quantity).toFixed(2)}` },
                  { label: "Payment Method", value: viewSale.payment_method },
                  { label: "Salesperson", value: viewSale.created_by || "—" },
                  { label: "Notes", value: viewSale.notes || "—" },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              {/* Pricing summary */}
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary">Subtotal</Typography>
                <Typography>₹{(viewSale.unit_price * viewSale.quantity).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary">Discount</Typography>
                <Typography>₹{viewSale.discount.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography color="text.secondary">Tax</Typography>
                <Typography>₹{viewSale.tax.toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                <Typography variant="h6">Grand Total</Typography>
                <Typography variant="h6" fontWeight="bold" color="#6366f1">₹{viewSale.total_amount.toFixed(2)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {viewSale && (
            <>
              <Button startIcon={<Download />} onClick={() => exportCSV(viewSale)}>CSV</Button>
              <Button startIcon={<PictureAsPdf />} onClick={() => exportPDF(viewSale)}>PDF</Button>
            </>
          )}
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
              <TextField label="Customer" select fullWidth value={form.customer_id ?? ""}
                onChange={setCustomer} helperText="Select customer (optional)">
                <MenuItem value="">— Walk-in / Manual —</MenuItem>
                {customers.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.customer_code})</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Customer Name *" fullWidth value={form.customer_name} onChange={set("customer_name")} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Product *" select fullWidth value={form.product_id || ""}
                onChange={set("product_id")} disabled={!!editId}>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name} (Stock: {p.stock_quantity})</MenuItem>
                ))}
              </TextField>
            </Grid>
            {selectedProduct && (
              <Grid item xs={12} sm={6}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  SKU: {selectedProduct.sku} | {selectedProduct.category_name} | Stock: {selectedProduct.stock_quantity}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField label="Quantity *" type="number" fullWidth value={form.quantity || ""} onChange={set("quantity")}
                inputProps={{ min: 1 }} helperText="Units sold" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Unit Price *" type="number" fullWidth value={form.unit_price || ""} onChange={set("unit_price")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Discount" type="number" fullWidth value={form.discount || ""} onChange={set("discount")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Tax" type="number" fullWidth value={form.tax || ""} onChange={set("tax")}
                inputProps={{ min: 0 }}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField label="Sales Channel" select fullWidth value={form.sales_channel} onChange={set("sales_channel")}>
                {CHANNELS.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Payment Method" select fullWidth value={form.payment_method} onChange={set("payment_method")}>
                {PAYMENTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Payment Status" select fullWidth value={form.payment_status} onChange={set("payment_status")}>
                {PAYMENT_STATUSES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField label="Notes" fullWidth multiline rows={2} value={form.notes} onChange={set("notes")} />
            </Grid>

            {/* Billing summary */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, bgcolor: "#f8fafc" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography>₹{subtotal.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">Discount</Typography>
                  <Typography>− ₹{form.discount.toFixed(2)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                  <Typography color="text.secondary">Tax</Typography>
                  <Typography>+ ₹{form.tax.toFixed(2)}</Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography fontWeight={600}>Grand Total</Typography>
                  <Typography variant="h6" fontWeight="bold" color="#6366f1">₹{grandTotal.toFixed(2)}</Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving..." : editId ? "Update" : "Create Sale"}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}