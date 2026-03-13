import { Paper, Typography } from "@mui/material";

export default function ReportsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Reports
      </Typography>
      <Typography color="text.secondary">
        Reporting dashboards will be organized here as the analytics module expands.
      </Typography>
    </Paper>
  );
}
