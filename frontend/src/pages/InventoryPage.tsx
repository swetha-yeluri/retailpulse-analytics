import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment, Grid, TableContainer,
} from "@mui/material";
import { Search, SwapVert, History, Edit } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { inventoryApi, type Inventory, type StockAdjustData, type Movement } from "../api/inventoryApi";
import { categoryApi, type Category } from "../api/categoryApi";

const ADJUST_TYPES = ["Stock In", "Stock Out", "Manual Adjustment"];
const STATUSES = ["In Stock", "Low Stock", "Out of Stock"];

const statusColor = (s: string): "success" | "warning" | "error" | "default" => {
  if (s === "In Stock") return "success";
  if (s === "Low Stock") return "warning";
  if (s === "Out of Stock") return "error";
  return "default";
};

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [brand, setBrand] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<Inventory | null>(null);
  const [adjustForm, setAdjustForm] = useState<StockAdjustData>({
    product_id: 0, adjustment_type: "Stock In", quantity: 0, reason: "", remarks: "",
  });
  const [error, setError] = useState("");

  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderProduct, setReorderProduct] = useState<Inventory | null>(null);
  const [reorderValue, setReorderValue] = useState(0);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [historyProduct, setHistoryProduct] = useState<Inventory | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const filters: any = { search, status: statusFilter, brand, sort_by: sortBy };
      if (categoryFilter) filters.category_id = categoryFilter;
      setItems(await inventoryApi.list(filters));
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => {});
    load();
  }, []);

  useEffect(() => { load(); }, [categoryFilter, statusFilter, sortBy]);

  const openAdjust = (inv: Inventory) => {
    setAdjustProduct(inv);
    setAdjustForm({ product_id: inv.product_id, adjustment_type: "Stock In", quantity: 0, reason: "", remarks: "" });
    setError("");
    setAdjustOpen(true);
  };

  const saveAdjust = async () => {
    setError("");
    if (adjustForm.quantity <= 0) { setError("Quantity must be greater than zero"); return; }
    if (!adjustForm.reason.trim()) { setError("Reason is required"); return; }
    try {
      await inventoryApi.adjust(adjustForm);
      setAdjustOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Adjustment failed");
    }
  };

  const openReorder = (inv: Inventory) => {
    setReorderProduct(inv);
    setReorderValue(inv.reorder_level);
    setReorderOpen(true);
  };

  const saveReorder = async () => {
    if (!reorderProduct) return;
    try {
      await inventoryApi.updateReorder(reorderProduct.product_id, reorderValue);
      setReorderOpen(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed");
    }
  };

  const openHistory = async (inv: Inventory) => {
    setHistoryProduct(inv);
    setHistoryOpen(true);
    try {
      setMovements(await inventoryApi.movements(inv.product_id));
    } catch {
      setMovements([]);
    }
  };

  const setAdj = (k: keyof StockAdjustData) => (e: any) => {
    const num = ["quantity", "product_id"].includes(k);
    const raw = e.target.value;
    setAdjustForm({ ...adjustForm, [k]: num ? (raw === "" ? 0 : Number(raw)) : raw });
  };

  return (
    <DashboardLayout>
      <Box mb={3}>
        <Typography variant="h5" fontWeight="bold">Inventory</Typography>
        <Typography color="text.secondary">Monitor and manage product stock levels.</Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <TextField placeholder="Search product, SKU..." size="small" value={search}
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

        <TextField select size="small" label="Stock Status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)} sx={{ width: 160 }}>
          <MenuItem value="">All Status</MenuItem>
          {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>

        <TextField placeholder="Brand" size="small" value={brand}
          onChange={(e) => setBrand(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()} sx={{ width: 140 }} />

        <TextField select size="small" label="Sort By" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)} sx={{ width: 170 }}>
          <MenuItem value="name">Product Name</MenuItem>
          <MenuItem value="stock">Current Stock</MenuItem>
          <MenuItem value="recent">Recently Updated</MenuItem>
        </TextField>

        <Button variant="outlined" onClick={() => load()}>Search</Button>
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <TableContainer>
          <Table sx={{ minWidth: 1000 }}>
            <TableHead sx={{ bgcolor: "#f8fafc" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Current</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Available</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Reorder</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} align="center">Loading...</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                  No inventory found. Add products first.
                </TableCell></TableRow>
              ) : (
                items.map((inv) => (
                  <TableRow key={inv.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{inv.product_name}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>{inv.sku}</TableCell>
                    <TableCell>{inv.category_name}</TableCell>
                    <TableCell align="right">{inv.current_stock}</TableCell>
                    <TableCell align="right">{inv.available_stock}</TableCell>
                    <TableCell align="right">{inv.reorder_level}</TableCell>
                    <TableCell>
                      <Chip label={inv.stock_status} size="small" color={statusColor(inv.stock_status)} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => openAdjust(inv)} title="Adjust Stock"><SwapVert fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openReorder(inv)} title="Reorder Level"><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => openHistory(inv)} title="History"><History fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ADJUST STOCK dialog */}
      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Adjust Stock — {adjustProduct?.product_name}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {adjustProduct && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Current Stock: {adjustProduct.current_stock} | Available: {adjustProduct.available_stock}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Adjustment Type" select fullWidth value={adjustForm.adjustment_type}
                onChange={setAdj("adjustment_type")}>
                {ADJUST_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Quantity *" type="number" fullWidth
                value={adjustForm.quantity || ""} onChange={setAdj("quantity")}
                inputProps={{ min: 1 }}
                helperText={adjustForm.adjustment_type === "Manual Adjustment" ? "New total stock" : "Amount to add/remove"} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Reason *" fullWidth value={adjustForm.reason} onChange={setAdj("reason")}
                placeholder="e.g. New shipment, Damaged goods, Stock correction" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Remarks" fullWidth multiline rows={2}
                value={adjustForm.remarks} onChange={setAdj("remarks")} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveAdjust}>Apply Adjustment</Button>
        </DialogActions>
      </Dialog>

      {/* REORDER dialog */}
      <Dialog open={reorderOpen} onClose={() => setReorderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Reorder Level</DialogTitle>
        <DialogContent>
          <TextField label="Reorder Level" type="number" fullWidth margin="normal"
            value={reorderValue || ""} onChange={(e) => setReorderValue(Number(e.target.value) || 0)}
            inputProps={{ min: 0 }}
            helperText="Alert when stock reaches this level" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReorderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveReorder}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* MOVEMENT HISTORY dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Stock Movement History — {historyProduct?.product_name}</DialogTitle>
        <DialogContent>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }} align="right">Prev</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }} align="right">Changed</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }} align="right">Updated</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>By</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f8fafc" }}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: "#94a3b8" }}>No movements yet.</TableCell></TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><Chip label={m.movement_type} size="small" variant="outlined" /></TableCell>
                      <TableCell align="right">{m.previous_quantity}</TableCell>
                      <TableCell align="right">{m.quantity_changed}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{m.updated_quantity}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{m.reason || "—"}</TableCell>
                      <TableCell sx={{ color: "#64748b" }}>{m.performed_by || "—"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}