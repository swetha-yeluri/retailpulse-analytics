import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Box, Paper, TextField, Button, Typography, Alert } from "@mui/material";
import { authApi } from "../api/authApi";

interface FormData {
  email: string;
  new_password: string;
  confirm_password: string;
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (data: FormData) => {
    setError(""); setSuccess("");
    try {
      await authApi.forgotPassword(data.email, data.new_password, data.confirm_password);
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Reset failed");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#0f172a" }}>
      <Paper sx={{ p: 4, width: 400, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>Reset Password</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>Enter your email and new password</Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)}>
          <TextField label="Email" fullWidth margin="normal"
            {...register("email", { required: "Email is required" })}
            error={!!errors.email} helperText={errors.email?.message} />
          <TextField label="New Password" type="password" fullWidth margin="normal"
            {...register("new_password", { required: "Required", minLength: { value: 8, message: "Min 8 characters" } })}
            error={!!errors.new_password} helperText={errors.new_password?.message} />
          <TextField label="Confirm Password" type="password" fullWidth margin="normal"
            {...register("confirm_password", {
              required: "Required",
              validate: (v) => v === watch("new_password") || "Passwords do not match",
            })}
            error={!!errors.confirm_password} helperText={errors.confirm_password?.message} />

          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2, mb: 2 }}>
            Reset Password
          </Button>
        </form>

        <Typography variant="body2" textAlign="center">
          Remember your password? <Link to="/login">Sign In</Link>
        </Typography>
      </Paper>
    </Box>
  );
}