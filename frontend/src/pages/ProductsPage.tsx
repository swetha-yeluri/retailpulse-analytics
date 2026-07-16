import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, Switch, Tooltip,
  TableContainer, Divider,
} from "@mui/material";
import { Add, Edit, Delete, Search, Visibility } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { productApi, type Product, type ProductData } from "../api/productApi";
import { categoryApi, type Category } from "../api/categoryApi";

const UNITS = ["Piece", "Kg", "Litre", "Box", "Pack"];

const EMPTY: ProductData = {
  name: "", sku: "", category_id: 0, brand: "", description: "",
  unit_price: 0, cost_price: 0, stock_quantity: 0,
  unit_of_measure: "Piece", status: "Active",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState("recent");

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductData>(EMPTY);
  const [error, setError] = useState("");

  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search, status, brand, sort_by: sortBy };
      if (categoryId) filters.category_id = categoryId;
      setProducts(await productApi.list(filters));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
    load();
  }, []);

  useEffect(() => { load(); }, [categoryId, status, sortBy]);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (p: Product) => {
    setForm({
      name: p.name, sku: p.sku, category_id: p.category_id, brand: p.brand || "",
      description: p.description || "", unit_price: p.unit_price, cost_price: p.cost_price,
      stock_quantity: p.stock_quantity, unit_of_measure: p.unit_of_measure, status: p.status,
    });
    setEditId(p.id);
    setError("");
    setOpen(true);
  };

  const set = (k: keyof ProductData) => (e: any) => {
    const num = ["unit_price", "cost_price", "stock_quantity", "category_id"].includes(k);
    setForm({ ...form, [k]: num ? Number(e.target.value) : e.target.value });
  };

  const save = async () => {
    setError("");
    if (!form.name.trim()) { setError("Product Name is required"); return; }
    if (!form.sku.trim()) { setError("SKU is required"); return; }
    if (!form.category_id) { setError("Category is required"); return; }
    if (form.unit_price <= 0) { setError("Unit Price must be greater than zero"); return; }
    if (form.cost_price > form.unit_price) { setError("Cost Price cannot exceed Unit Price"); return; }
    if (form.stock_quantity < 0) { setError("Stock Quantity cannot be negative"); return; }

    try {
      if (editId) await productApi.update(editId, form);
      else await productApi.create(form);
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    try { await productApi.remove(p.id); load(); }
    catch (err: any) { alert(err.response?.data?.detail || "Delete failed"); }
  };

  const toggleStatus = async (p: Product) => {
    try {
      await productApi.update(p.id, { status: p.status === "Active" ? "Inactive" : "Active" });
      load();
    } catch (err: any) { alert(err.response?.data?.detail || "Failed"); }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Products</Typography>
          <Typography color="text.secondary">Manage your product master data.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Add Product</Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField placeholder="Search name, SKU, brand..." size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          sx={{ width: 260 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }} />

        <TextField select size="small" label="Category" value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
          sx={{ width: 170 }}>
          <MenuItem value="">All Categories</MenuItem>
          {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>

        <TextField select size="small" label="Status" value={status}
          onChange={(e) => setStatus(e.target.value)} sx={{ width: 140 }}>
          <MenuItem value="">All Status</MenuItem>
          <MenuItem value="Active">Active</MenuItem>
          <MenuItem value="Inactive">Inactive</MenuItem>
        </TextField>

        <TextField placeholder="Brand" size="small" value={brand}
          onChange={(e) => setBrand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} sx={{ width: 140 }} />

        <TextField select size="small" label="Sort By" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} sx={{ width: 160 }}>
          <MenuItem value="recent">Recently Added</MenuItem>
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="price">Price</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={() => load()}>Search</Button>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Brand</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Price</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Stock</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center">Loading...</TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                  No products found.
                </TableCell></TableRow>
              ) : (
                products.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{p.sku}</TableCell>
                    <TableCell>{p.category_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{p.brand || "—"}</TableCell>
                    <TableCell align="right">₹{p.unit_price.toFixed(2)}</TableCell>
                    <TableCell align="right">{p.stock_quantity} {p.unit_of_measure}</TableCell>
                    <TableCell>
                      <Tooltip title={p.status === "Active" ? "Click to deactivate" : "Click to activate"}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Switch size="small" checked={p.status === "Active"}
                            onChange={() => toggleStatus(p)} />
                          <Chip label={p.status} size="small"
                            color={p.status === "Active" ? "success" : "default"} />
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => setViewProduct(p)} title="View details">
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => openEdit(p)} title="Edit">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => remove(p)} sx={{ color: "#ef4444" }} title="Delete">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* VIEW DETAILS dialog */}
      <Dialog open={!!viewProduct} onClose={() => setViewProduct(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {viewProduct && (
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Typography variant="h6">{viewProduct.name}</Typography>
                <Chip label={viewProduct.status} size="small"
                  color={viewProduct.status === "Active" ? "success" : "default"} />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: "SKU", value: viewProduct.sku },
                  { label: "Category", value: viewProduct.category_name },
                  { label: "Brand", value: viewProduct.brand || "—" },
                  { label: "Unit of Measure", value: viewProduct.unit_of_measure },
                  { label: "Unit Price", value: `₹${viewProduct.unit_price.toFixed(2)}` },
                  { label: "Cost Price", value: `₹${viewProduct.cost_price.toFixed(2)}` },
                  { label: "Stock Quantity", value: `${viewProduct.stock_quantity} ${viewProduct.unit_of_measure}` },
                  { label: "Margin", value: `₹${(viewProduct.unit_price - viewProduct.cost_price).toFixed(2)}` },
                ].map((f) => (
                  <Grid item xs={6} key={f.label}>
                    <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                    <Typography variant="body1" fontWeight={500}>{f.value}</Typography>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{viewProduct.description || "—"}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewProduct(null)}>Close</Button>
          {viewProduct && (
            <Button variant="contained" onClick={() => { openEdit(viewProduct); setViewProduct(null); }}>
              Edit
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={12} sm={6}>
              <TextField label="Product Name *" fullWidth value={form.name} onChange={set("name")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="SKU *" fullWidth value={form.sku} onChange={set("sku")}
                placeholder="RTL-10001" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Category *" select fullWidth value={form.category_id || ""}
                onChange={set("category_id")}>
                {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Brand" fullWidth value={form.brand} onChange={set("brand")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={2}
                value={form.description} onChange={set("description")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Unit Price *" type="number" fullWidth
                value={form.unit_price} onChange={set("unit_price")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Cost Price" type="number" fullWidth
                value={form.cost_price} onChange={set("cost_price")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Stock Quantity" type="number" fullWidth
                value={form.stock_quantity} onChange={set("stock_quantity")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Unit of Measure" select fullWidth
                value={form.unit_of_measure} onChange={set("unit_of_measure")}>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
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