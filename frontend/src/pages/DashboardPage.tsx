import { Box, Paper, Typography, Grid, Chip, Avatar } from "@mui/material";
import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const info = [
    { label: "Name", value: user.name },
    { label: "Email", value: user.email },
    { label: "Role", value: user.role },
    { label: "Company", value: user.company_name },
    { label: "Status", value: user.status },
    { label: "Last Login", value: user.last_login ? new Date(user.last_login).toLocaleString() : "—" },
  ];

  return (
    <DashboardLayout>
      <Typography variant="h5" fontWeight="bold" mb={0.5}>
        Welcome back, {user.name}!
      </Typography>
      <Typography color="text.secondary" mb={3}>
        Here's your account overview.
      </Typography>

      <Paper sx={{ p: 4, borderRadius: 3, maxWidth: 760 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "#6366f1", fontSize: 28 }}>
            {user.name[0]?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6">{user.name}</Typography>
            <Chip label={user.role} color="primary" size="small" sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Grid container spacing={3}>
          {info.map((item) => (
            <Grid item xs={12} sm={6} key={item.label}>
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              <Typography variant="body1" fontWeight={500}>{item.value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </DashboardLayout>
  );
}