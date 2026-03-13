import { Paper, Typography } from "@mui/material";
import EmployeeForm from "@/features/employee/components/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Add Employee
      </Typography>
      <Paper sx={{ p: 3 }}>
        <EmployeeForm submitLabel="Save" cancelHref="/employees" />
      </Paper>
    </>
  );
}

