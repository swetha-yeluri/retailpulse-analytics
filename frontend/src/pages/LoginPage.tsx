import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Box, Paper, TextField, Button, Typography, Alert, Checkbox, FormControlLabel,
} from "@mui/material";

import { useAuth } from "../context/AuthContext";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    setError("");
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f172a" }}>
      <Paper sx={{ p: 4, width: 380, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Welcome Back
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in to your account
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label="Email"
            fullWidth
            margin="normal"
            {...register("email", { required: "Email is required" })}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            {...register("password", { required: "Password is required" })}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <FormControlLabel control={<Checkbox />} label="Remember me" />
            <Link to="/forgot-password" style={{ fontSize: 14 }}>Forgot Password?</Link>
          </Box>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ mt: 2, mb: 2 }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <Typography variant="body2" textAlign="center">
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </Typography>
      </Paper>
    </Box>
  );
}