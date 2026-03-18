import { Paper, Typography } from "@mui/material";
import PayrollRunForm from "@/features/payroll/components/PayrollRunForm";

export default function RunPayrollPage() {
  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Run Payroll
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Configure payroll cycle details and generate salary statements.
        </Typography>
        <PayrollRunForm />
      </Paper>
    </>
  );
}

