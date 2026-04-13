import { Button, Paper, Typography } from "@mui/material";
import { ReactNode } from "react";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import dicConstant from "@/constants/Constant.json";

const leaveRequests = [
  { id: "L001", employee: "Ava Johnson", type: "Sick Leave", status: "Pending" },
  { id: "L002", employee: "Liam Smith", type: "Casual Leave", status: "Approved" }
];

export default function LeavePage() {
  const columns: CommonTableColumn<(typeof leaveRequests)[number] & { action: ReactNode }>[] = [
    { field: "id", headerName: dicConstant.leave.grid.id },
    { field: "employee", headerName: dicConstant.leave.grid.employee },
    { field: "type", headerName: dicConstant.leave.grid.type },
    { field: "status", headerName: dicConstant.leave.grid.status },
    { field: "action", headerName: dicConstant.leave.grid.action, sortable: false, filterable: false, exportable: false }
  ];

  const rows = leaveRequests.map((request) => ({
    ...request,
    action: (
      <Button size="small" variant="outlined">
        {dicConstant.leave.actionApprove}
      </Button>
    )
  }));

  return (
    <>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {dicConstant.leave.pageTitle}
      </Typography>
      <Paper sx={{ p: 3 }}>
        <CommonTable
          columns={columns}
          rows={rows}
          rowIdField="id"
          withPaper={false}
          toolbarLeft={
            <Button variant="contained" href="/leave/apply">
              {dicConstant.leave.applyButton}
            </Button>
          }
        />
      </Paper>
    </>
  );
}

