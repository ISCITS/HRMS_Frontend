import { Paper, Typography } from "@mui/material";
import AttendanceTable from "@/features/attendance/components/AttendanceTable";
import dicConstant from "@/constants/Constant.json";

export default function AttendancePage() {
  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {dicConstant.attendance.pageTitle}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <AttendanceTable />
      </Paper>
    </>
  );
}

