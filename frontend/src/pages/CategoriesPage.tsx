import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Chip, IconButton, Alert, InputAdornment,
} from "@mui/material";
import { Add, Edit, Delete, Search } from "@mui/icons-material";

import DashboardLayout from "../layouts/DashboardLayout";
import { categoryApi, type Category, type CategoryData } from "../api/categoryApi";

const EMPTY: CategoryData = { name: "", description: "", status: "Active" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryData>(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (q = search) => {
    setLoading(true);
    try {
      setCategories(await categoryApi.list(q));
    } catch {
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  const openCreate = () => { setForm(EMPTY); setEditId(null); setError(""); setOpen(true); };
  const openEdit = (c: Category) => {
    setForm({ name: c.name, description: c.description || "", status: c.status });
    setEditId(c.id);
    setError("");
    setOpen(true);
  };

  const save = async () => {
    setError("");
    if (!form.name.trim()) { setError("Category name is required"); return; }
    try {
      if (editId) await categoryApi.update(editId, form);
      else await categoryApi.create(form);
      setOpen(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Save failed");
    }
  };

  const remove = async (c: Category) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await categoryApi.remove(c.id);
      load();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Delete failed");
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold">Categories</Typography>
          <Typography color="text.secondary">Manage your product categories.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={openCreate}>
          Add Category
        </Button>
      </Box>

      <TextField
        placeholder="Search categories..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load()}
        sx={{ mb: 2, width: 320, bgcolor: "white" }}
        InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
      />

      <Paper sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Products</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">Loading...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: "#94a3b8" }}>
                No categories yet. Click "Add Category" to create one.
              </TableCell></TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                  <TableCell sx={{ color: "#64748b" }}>{c.description || "—"}</TableCell>
                  <TableCell>
                    <Chip label={c.product_count} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip label={c.status} size="small"
                      color={c.status === "Active" ? "success" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(c)}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => remove(c)} sx={{ color: "#ef4444" }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Create / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? "Edit Category" : "Add Category"}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField label="Category Name *" fullWidth margin="normal"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Description" fullWidth margin="normal" multiline rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label="Status" select fullWidth margin="normal"
            value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>{editId ? "Update" : "Create"}</Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}