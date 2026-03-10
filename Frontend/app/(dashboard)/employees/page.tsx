"use client";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import Link from "next/link";
import { ReactNode } from "react";
import CommonDataGrid, { DataGridColumn } from "@/components/common/CommonDataGrid";
import dicConstant from "@/constants/Constant.json";

const employees = [
  { id: "E001", name: "Ava Johnson", department: "Engineering", role: "Frontend Developer" },
  { id: "E002", name: "Liam Smith", department: "HR", role: "HR Executive" },
  { id: "E003", name: "Noah Davis", department: "Finance", role: "Accountant" }
];

type EmployeeRow = {
  id: ReactNode;
  name: ReactNode;
  department: ReactNode;
  role: ReactNode;
  action: ReactNode;
  rowId: string;
};

export default function EmployeesPage() {
  const columns: DataGridColumn<EmployeeRow>[] = [
    { field: "id", headerName: dicConstant.employees.grid.id },
    { field: "name", headerName: dicConstant.employees.grid.name },
    { field: "department", headerName: dicConstant.employees.grid.department },
    { field: "role", headerName: dicConstant.employees.grid.role },
    {
      field: "action",
      headerName: dicConstant.employees.grid.action,
      sortable: false,
      filterable: false,
      exportable: false,
      align: "center"
    }
  ];

  const rows: EmployeeRow[] = employees.map((dicEmployee) => ({
    id: <Typography sx={{ color: "#94a3b8", fontWeight: 500 }}>{dicEmployee.id}</Typography>,
    name: <Typography sx={{ color: "#0f172a", fontWeight: 600 }}>{dicEmployee.name}</Typography>,
    department: <Typography sx={{ color: "#64748b" }}>{dicEmployee.department}</Typography>,
    role: <Typography sx={{ color: "#64748b" }}>{dicEmployee.role}</Typography>,
    action: (
      <Tooltip title="View details" arrow>
        <IconButton
          component={Link}
          href={`/employees/${dicEmployee.id}`}
          aria-label="View details"
          size="small"
          sx={{
            width: 34,
            height: 34,
            transition: "all 0.2s ease",
            "&:hover": { backgroundColor: "rgba(37,99,235,0.08)" }
          }}
        >
          <VisibilityOutlinedIcon sx={{ fontSize: 20, color: "#475569" }} />
        </IconButton>
      </Tooltip>
    ),
    rowId: dicEmployee.id
  }));

  return (
    <Stack
      spacing={4}
      sx={{
        animation: "employeesFadeIn 200ms ease-out",
        "@keyframes employeesFadeIn": {
          from: { opacity: 0, transform: "translateY(8px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        }
      }}
    >
      <Box>
        <Typography sx={{ fontSize: { xs: 30, md: 34 }, fontWeight: 700, lineHeight: 1.15 }}>
          {dicConstant.employees.pageTitle}
        </Typography>
        <Typography sx={{ color: "#64748b", mt: 1 }}>Manage and monitor your workforce.</Typography>
      </Box>

      <CommonDataGrid
        columns={columns}
        rows={rows}
        rowIdField="rowId"
        toolbarLeft={
          <Button
            variant="contained"
            href="/employees/new"
            sx={{
              height: 48,
              px: 2.5,
              borderRadius: "14px",
              backgroundColor: "#2563eb",
              boxShadow: "0 6px 16px rgba(37,99,235,0.35)",
              transition: "all 0.15s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                backgroundColor: "#1d4ed8"
              }
            }}
          >
            {dicConstant.employees.addButton}
          </Button>
        }
        showExportOptions
        exportFileName="employees-list"
        withPaper={true}
      />
    </Stack>
  );
}
