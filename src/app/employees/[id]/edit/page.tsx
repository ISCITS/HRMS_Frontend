import { Paper, Typography } from "@mui/material";
import EmployeeForm from "@/features/employee/components/EmployeeForm";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Edit Employee ({id})
      </Typography>
      <EmployeeForm
        submitLabel="Save Changes"
        cancelHref="/employees"
        initialValues={{
          name: "Ava Johnson",
          email: "ava.johnson@company.com",
          role: "Frontend Developer",
          department: "Engineering",
          status: "Active"
        }}
      />
    </Paper>
  );
}

