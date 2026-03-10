import { Paper, Typography } from "@mui/material";
import LeaveForm from "@/components/leave/LeaveForm";

export default function ApplyLeavePage() {
  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Apply for Leave
      </Typography>
      <Paper sx={{ p: 3 }}>
        <LeaveForm />
      </Paper>
    </>
  );
}
