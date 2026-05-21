import Link from "next/link";
import { Box, Paper, Typography } from "@mui/material";

const lstReports = [
  {
    strTitle: "Payroll Register",
    strDescription: "Employee-wise earnings, deductions, tax, gross pay, and net pay.",
    strHref: "/reports/payroll-register",
  },
  {
    strTitle: "Bank File",
    strDescription: "Payment-ready net salary report for approved, published, or paid payroll.",
    strHref: "/reports/bank-file",
  },
  {
    strTitle: "Payslips",
    strDescription: "View, generate, download, and print employee payslips.",
    strHref: "/reports/payslips",
  },
  {
    strTitle: "Statutory Reports",
    strDescription: "PF, ESI, professional tax, labour welfare fund, summary, challan, payment, and returns.",
    strHref: "/reports/statutory",
  },
];

export default function ReportsPage() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Reports
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }, mt: 2 }}>
        {lstReports.map((dicReport) => (
          <Link
            key={dicReport.strHref}
            href={dicReport.strHref}
            style={{
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <Box
              sx={{
                border: "1px solid rgba(187, 213, 232, 0.7)",
                borderRadius: 2,
                p: 2,
                height: "100%",
                "&:hover": { borderColor: "primary.main", backgroundColor: "rgba(29, 93, 150, 0.04)" },
              }}
            >
              <Typography fontWeight={700}>{dicReport.strTitle}</Typography>
              <Typography color="text.secondary" sx={{ fontSize: "0.9rem", mt: 0.5 }}>
                {dicReport.strDescription}
              </Typography>
            </Box>
          </Link>
        ))}
      </Box>
    </Paper>
  );
}
