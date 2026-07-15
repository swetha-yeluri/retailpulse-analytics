import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Box, Paper, TextField, Button, Typography, Alert, Grid, MenuItem,
} from "@mui/material";

import { authApi, type RegisterData } from "../api/authApi";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterData>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RegisterData) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await authApi.register(data);
      setSuccess("Company registered successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f172a", py: 4 }}>
      <Paper sx={{ p: 4, width: 600, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Register Your Company
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Create your company account
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Company Name" fullWidth
                {...register("company_name", { required: "Required" })}
                error={!!errors.company_name} helperText={errors.company_name?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Industry" fullWidth {...register("industry")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Company Email" fullWidth
                {...register("company_email", { required: "Required" })}
                error={!!errors.company_email} helperText={errors.company_email?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Company Phone" fullWidth {...register("company_phone")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Company Address" fullWidth {...register("company_address")} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField label="Owner Name" fullWidth
                {...register("owner_name", { required: "Required" })}
                error={!!errors.owner_name} helperText={errors.owner_name?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Owner Email" fullWidth
                {...register("owner_email", { required: "Required" })}
                error={!!errors.owner_email} helperText={errors.owner_email?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Password" type="password" fullWidth
                {...register("password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })}
                error={!!errors.password} helperText={errors.password?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Confirm Password" type="password" fullWidth
                {...register("confirm_password", {
                  required: "Required",
                  validate: (v) => v === watch("password") || "Passwords do not match",
                })}
                error={!!errors.confirm_password} helperText={errors.confirm_password?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Role" select fullWidth defaultValue="Company Admin"
                {...register("role", { required: "Required" })}>
                <MenuItem value="Super Admin">Super Admin</MenuItem>
                <MenuItem value="Company Admin">Company Admin</MenuItem>
                <MenuItem value="Analyst">Analyst</MenuItem>
                <MenuItem value="Viewer">Viewer</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          <Button type="submit" variant="contained" fullWidth size="large"
            disabled={loading} sx={{ mt: 3, mb: 2 }}>
            {loading ? "Registering..." : "Register Company"}
          </Button>
        </form>

        <Typography variant="body2" textAlign="center">
          Already have an account? <Link to="/login">Sign In</Link>
        </Typography>
      </Paper>
    </Box>
  );
}