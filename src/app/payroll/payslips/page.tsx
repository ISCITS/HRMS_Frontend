import { Button, Chip, Paper, Typography } from "@mui/material";
import { ReactNode } from "react";
import CommonDataGrid, { DataGridColumn } from "@/components/ui/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";

const payslipRows = [
  { id: "PS-2401", employee: "Ava Johnson", month: "March 2026", amount: "$5,800", status: "Sent" },
  { id: "PS-2402", employee: "Liam Smith", month: "March 2026", amount: "$4,900", status: "Pending" },
  { id: "PS-2403", employee: "Noah Davis", month: "March 2026", amount: "$5,250", status: "Sent" }
];

export default function PayslipsPage() {
  const columns: DataGridColumn<(typeof payslipRows)[number] & { statusNode: ReactNode; action: ReactNode }>[] = [
    { field: "id", headerName: dicConstant.payroll.payslips.grid.id },
    { field: "employee", headerName: dicConstant.payroll.payslips.grid.employee },
    { field: "month", headerName: dicConstant.payroll.payslips.grid.month },
    { field: "amount", headerName: dicConstant.payroll.payslips.grid.amount },
    { field: "statusNode", headerName: dicConstant.payroll.payslips.grid.status, sortable: false, filterable: false },
    { field: "action", headerName: dicConstant.payroll.payslips.grid.action, sortable: false, filterable: false, exportable: false }
  ];

  const rows = payslipRows.map((row) => ({
    ...row,
    statusNode: (
      <Chip
        size="small"
        label={row.status}
        color={row.status === "Sent" ? "success" : "warning"}
        variant="outlined"
      />
    ),
    action: (
      <Button size="small" variant="outlined">
        {dicConstant.payroll.payslips.download}
      </Button>
    )
  }));

  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {dicConstant.payroll.payslips.title}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <CommonDataGrid columns={columns} rows={rows} rowIdField="id" withPaper={false} />
      </Paper>
    </>
  );
}

