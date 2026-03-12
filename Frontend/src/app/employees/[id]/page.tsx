import { Button, Grid, Paper, Typography } from "@mui/material";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const employee = {
    id,
    name: "Ava Johnson",
    email: "ava.johnson@company.com",
    role: "Frontend Developer",
    department: "Engineering",
    status: "Active"
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Employee Details
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography><strong>ID:</strong> {employee.id}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography><strong>Name:</strong> {employee.name}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography><strong>Email:</strong> {employee.email}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography><strong>Role:</strong> {employee.role}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography><strong>Department:</strong> {employee.department}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography><strong>Status:</strong> {employee.status}</Typography>
        </Grid>
      </Grid>
      <Button variant="contained" href={`/employees/${employee.id}/edit`} sx={{ mt: 3 }}>
        Edit Employee
      </Button>
    </Paper>
  );
}
