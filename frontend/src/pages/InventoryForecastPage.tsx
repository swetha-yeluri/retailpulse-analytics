import { useState, useMemo } from "react";
import {
  Box, Paper, Typography, Grid, Button, CircularProgress, Alert, Skeleton,
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  TextField, MenuItem, Chip, Stack, useMediaQuery, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, FormControlLabel, Switch,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Refresh, Inventory2, Visibility, TrendingUp } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import {
  inventoryForecastApi, type InventoryForecastData, type ComparisonPanel,
} from "../api/inventoryForecastApi";
import { categoryApi, type Category } from "../api/categoryApi";

const RISKS = ["Out of Stock", "Stockout Risk", "Low Stock", "Healthy", "Overstock"];

const RISK_COLOR: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  "Out of Stock": "error",
  "Stockout Risk": "error",
  "Low Stock": "warning",
  "Healthy": "success",
  "Overstock": "info",
};

export default function InventoryForecastPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [risk, setRisk] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [reorderOnly, setReorderOnly] = useState(false);
  const [sortBy, setSortBy] = useState("risk");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);


  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => categoryApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const filters = useMemo(() => {
    const f: any = { sort_by: sortBy };
    if (risk) f.risk = risk;
    if (categoryId) f.category_id = categoryId;
    if (reorderOnly) f.reorder_only = true;
    return f;
  }, [risk, categoryId, reorderOnly, sortBy]);

  
  const {
    data, isLoading, isError, error, refetch, isFetching,
  } = useQuery<InventoryForecastData>({
    queryKey: ["inventory-forecast", filters],
    queryFn: () => inventoryForecastApi.get(filters),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  
  const { data: comparison, isLoading: compLoading } = useQuery<ComparisonPanel>({
    queryKey: ["inventory-recommendation", selectedProduct],
    queryFn: () => inventoryForecastApi.getRecommendation(selectedProduct!),
    enabled: selectedProduct !== null,
    staleTime: 60 * 1000,
  });

  const summary = data?.summary;
  const summaryCards = [
    { label: "Requiring Reorder", value: summary?.products_requiring_reorder ?? "—", color: "#f59e0b" },
    { label: "Stockout Risk", value: summary?.products_at_stockout_risk ?? "—", color: "#ef4444" },
    { label: "Overstocked", value: summary?.overstocked_products ?? "—", color: "#3b82f6" },
    { label: "Healthy", value: summary?.healthy_products ?? "—", color: "#10b981" },
  ];

  const noData = data && data.forecasts.length === 0;

  const SectionCard = ({ title, right, children, minHeight = 420 }: any) => (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, borderRadius: 4, border: "1px solid #eef0f4", height: "100%", minHeight, display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
        <Typography fontWeight={700} fontSize={16}>{title}</Typography>
        {right}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
    </Paper>
  );

  return (
    <DashboardLayout>
      <Box sx={{ px: { xs: 0, md: 1 }, py: { xs: 1, md: 2 } }}>
        {/* HEADER */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, mb: 5, flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: 3, bgcolor: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Inventory2 sx={{ color: "#6366f1", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold" fontSize={{ xs: 24, md: 28 }}>Inventory Forecast</Typography>
              <Typography color="text.secondary" fontSize={15} mt={0.5}>
                Smart replenishment recommendations from sales history.
              </Typography>
            </Box>
          </Box>
          <Button fullWidth={isMobile} variant="contained" size="large" startIcon={<Refresh />} onClick={() => refetch()}>Refresh</Button>
        </Box>

        {/* SUMMARY CARDS */}
        <Grid container spacing={3} mb={5}>
          {summaryCards.map((c) => (
            <Grid item xs={12} sm={6} md={3} key={c.label}>
              <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #eef0f4", borderLeft: `4px solid ${c.color}`, transition: "box-shadow .2s, transform .2s", "&:hover": { boxShadow: "0 10px 30px rgba(0,0,0,.07)", transform: "translateY(-3px)" } }}>
                <Typography variant="body2" color="text.secondary" fontSize={13.5}>{c.label}</Typography>
                <Typography variant="h4" fontWeight="bold" mt={1.5} sx={{ color: c.color }}>{c.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* FILTERS */}
        <Paper elevation={0} sx={{ p: { xs: 3, md: 3.5 }, mb: 5, borderRadius: 4, border: "1px solid #eef0f4", display: "flex", gap: 2.5, flexWrap: "wrap", alignItems: "center" }}>
          <TextField select size="small" label="Stock Risk" value={risk}
            onChange={(e) => setRisk(e.target.value)} sx={{ width: { xs: "100%", sm: 170 } }}>
            <MenuItem value="">All Risks</MenuItem>
            {RISKS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Category" value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ width: { xs: "100%", sm: 170 } }}>
            <MenuItem value="">All Categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Sort By" value={sortBy}
            onChange={(e) => setSortBy(e.target.value)} sx={{ width: { xs: "100%", sm: 200 } }}>
            <MenuItem value="risk">Risk Level</MenuItem>
            <MenuItem value="current_stock">Current Stock</MenuItem>
            <MenuItem value="forecasted_demand">Forecasted Demand</MenuItem>
            <MenuItem value="days_remaining">Days Remaining</MenuItem>
            <MenuItem value="recommended_quantity">Recommended Qty</MenuItem>
          </TextField>

          <FormControlLabel
            control={<Switch checked={reorderOnly} onChange={(e) => setReorderOnly(e.target.checked)} />}
            label="Reorder Required Only"
          />

          {isFetching && !isLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary", ml: "auto" }}>
              <CircularProgress size={16} />
              <Typography fontSize={13}>Updating…</Typography>
            </Box>
          )}
        </Paper>

        {isError && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3, py: 1.5 }}>
            {(error as any)?.response?.data?.detail || "Failed to load inventory forecast."}
          </Alert>
        )}

        {isLoading ? (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #eef0f4" }}>
            <Skeleton width="30%" height={28} />
            {[...Array(5)].map((_, i) => <Skeleton key={i} height={44} sx={{ mt: 1.5 }} />)}
          </Paper>
        ) : noData ? (
          <Paper elevation={0} sx={{ p: 10, borderRadius: 4, border: "1px solid #eef0f4", textAlign: "center" }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>No inventory data available</Typography>
            <Typography color="text.secondary" fontSize={15}>
              No products match the selected filters, or there is no sales history yet.
            </Typography>
          </Paper>
        ) : !data ? null : (
          <>
            {/* DEMAND CHART */}
            <Box mb={5}>
              <SectionCard title="Historical vs Forecasted Demand (Top Products)" minHeight={380}>
                {data.demand_chart.length === 0 ? (
                  <Typography color="text.secondary">No demand data.</Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.demand_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" />
                      <XAxis dataKey="label" fontSize={11} tickLine={false} angle={-15} textAnchor="end" height={60} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="historical" fill="#94a3b8" name="Historical (30d)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="forecasted" fill="#6366f1" name="Forecasted (30d)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>
            </Box>

            {/* FORECAST TABLE */}
            <Paper elevation={0} sx={{ borderRadius: 4, border: "1px solid #eef0f4", overflow: "hidden", mb: 5 }}>
              <Typography fontWeight={700} fontSize={16} sx={{ p: 3, pb: 2 }}>Product Forecast & Replenishment</Typography>
              <TableContainer>
                <Table sx={{ minWidth: 1100 }}>
                  <TableHead sx={{ bgcolor: "#f8fafc" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Stock</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Daily Sales</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Forecast</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Days Left</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Reorder Pt</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Rec. Qty</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>Risk</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="center">View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.forecasts.map((r) => (
                      <TableRow key={r.product_id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>{r.product_name}</TableCell>
                        <TableCell sx={{ color: "#64748b" }}>{r.sku}</TableCell>
                        <TableCell align="right">{r.current_stock}</TableCell>
                        <TableCell align="right">{r.average_daily_sales}</TableCell>
                        <TableCell align="right">{r.forecasted_demand}</TableCell>
                        <TableCell align="right">
                          {r.days_of_stock_remaining >= 999 ? "∞" : r.days_of_stock_remaining}
                        </TableCell>
                        <TableCell align="right">{r.reorder_point}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: r.recommended_reorder_quantity > 0 ? "#f59e0b" : "#94a3b8" }}>
                          {r.recommended_reorder_quantity > 0 ? r.recommended_reorder_quantity : "—"}
                        </TableCell>
                        <TableCell>
                          <Chip label={r.stock_risk} size="small" color={RISK_COLOR[r.stock_risk] || "default"} />
                        </TableCell>
                        <TableCell align="center">
                          <Button size="small" startIcon={<Visibility fontSize="small" />}
                            onClick={() => setSelectedProduct(r.product_id)}>
                            Compare
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </>
        )}

        {/* COMPARISON PANEL dialog */}
        <Dialog open={selectedProduct !== null} onClose={() => setSelectedProduct(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {comparison ? `Recommendation — ${comparison.product_name}` : "Recommendation"}
          </DialogTitle>
          <DialogContent>
            {compLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>
            ) : comparison ? (
              <Box>
                {/* Notes (highlighted) */}
                <Stack spacing={1} mb={3}>
                  {comparison.notes.map((n, i) => (
                    <Alert key={i} severity={n.includes("healthy") ? "success" : n.includes("Overstock") ? "info" : "warning"} sx={{ borderRadius: 2, py: 0.5 }}>
                      {n}
                    </Alert>
                  ))}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                {/* Comparison table */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, color: "#64748b" }}>Metric</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Current</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#64748b" }} align="right">Recommended</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparison.metrics.map((m, i) => (
                        <TableRow key={i} sx={{ bgcolor: m.action_needed ? "#fff7ed" : "transparent" }}>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {m.metric}
                            {m.action_needed && <Chip label="Action" size="small" color="warning" sx={{ ml: 1, height: 20 }} />}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: m.action_needed ? 700 : 400, color: m.action_needed ? "#ea580c" : "inherit" }}>{m.current}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>{m.recommended}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ) : (
              <Typography color="text.secondary">No data.</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSelectedProduct(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}