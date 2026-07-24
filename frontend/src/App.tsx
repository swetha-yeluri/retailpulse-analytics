import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline } from "@mui/material";

import { AuthProvider, useAuth } from "./context/AuthContext";
import RoleRoute from "./routes/RoleRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ProductsPage from "./pages/ProductsPage";
import SalesPage from "./pages/SalesPage";
import InventoryPage from "./pages/InventoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";

const queryClient = new QueryClient();

const ADMIN_ROLES = ["Super Admin", "Company Admin"];

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      
      <Route
        path="/categories"
        element={
          <RoleRoute allowedRoles={ADMIN_ROLES}>
            <CategoriesPage />
          </RoleRoute>
        }
      />

      <Route
        path="/products"
        element={
          <RoleRoute allowedRoles={ADMIN_ROLES}>
            <ProductsPage />
          </RoleRoute>
        }
      />
     
     <Route
        path="/sales"
        element={
          <RoleRoute allowedRoles={["Super Admin", "Company Admin", "Analyst"]}>
            <SalesPage />
          </RoleRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <RoleRoute allowedRoles={["Super Admin", "Company Admin", "Analyst"]}>
            <InventoryPage />
          </RoleRoute>
        }
      />

      <Route
        path="/analytics"
        element={
          <RoleRoute allowedRoles={["Super Admin", "Company Admin", "Analyst"]}>
            <AnalyticsPage />
          </RoleRoute>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <RoleRoute allowedRoles={ADMIN_ROLES}>
            <AuditLogsPage />
          </RoleRoute>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CssBaseline />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}