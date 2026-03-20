"use client";

import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import CommonDataGrid, { DataGridColumn } from "@/components/ui/CommonDataGrid";
import { employeeMasterService } from "@/features/employeeMaster/EmployeeMasterService";
import type { EmployeeListItem } from "@/features/employeeMaster/Types";

type EmployeeGridRow = {
  intID: number;
  strEmployeeCode: string;
  strFullName: string;
  strDepartmentName: string;
  strDesignationName: string;
  strWorkEmail: string;
  strEmploymentStatus: string;
  objActions: ReactNode;
};

export default function EmployeeMasterPage() {
  const [lstEmployees, setLstEmployees] = useState<EmployeeListItem[]>([]);
  const [blnIsLoading, setBlnIsLoading] = useState(true);
  const [strErrorMessage, setStrErrorMessage] = useState("");
  const [strBannerMessage, setStrBannerMessage] = useState("");

  useEffect(() => {
    let blnMounted = true;
    const loadEmployees = async () => {
      setBlnIsLoading(true);
      try {
        const lstRecords = await employeeMasterService.listEmployees();
        if (blnMounted) {
          setLstEmployees(lstRecords);
        }
      } catch (objError) {
        if (blnMounted) {
          setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to load employees.");
        }
      } finally {
        if (blnMounted) {
          setBlnIsLoading(false);
        }
      }
    };
    void loadEmployees();
    return () => {
      blnMounted = false;
    };
  }, []);

  const handleDeactivate = async (intEmployeeID: number) => {
    try {
      await employeeMasterService.deactivateEmployee(intEmployeeID);
      setLstEmployees((lstPrev) =>
        lstPrev.map((dicEmployee) =>
          dicEmployee.intID === intEmployeeID ? { ...dicEmployee, strEmploymentStatus: "Inactive" } : dicEmployee
        )
      );
      setStrBannerMessage("Employee deactivated successfully.");
    } catch (objError) {
      setStrErrorMessage(objError instanceof Error ? objError.message : "Unable to deactivate employee.");
    }
  };

  const lstColumns: DataGridColumn<EmployeeGridRow>[] = [
    { field: "strEmployeeCode", headerName: "Code" },
    { field: "strFullName", headerName: "Employee" },
    { field: "strDepartmentName", headerName: "Department" },
    { field: "strDesignationName", headerName: "Designation" },
    { field: "strWorkEmail", headerName: "Work Email" },
    { field: "strEmploymentStatus", headerName: "Status" },
    { field: "objActions", headerName: "Actions", sortable: false, filterable: false, exportable: false }
  ];

  const lstRows: EmployeeGridRow[] = lstEmployees.map((dicEmployee) => ({
    intID: dicEmployee.intID,
    strEmployeeCode: dicEmployee.strEmployeeCode,
    strFullName: dicEmployee.strFullName,
    strDepartmentName: dicEmployee.strDepartmentName || "Not assigned",
    strDesignationName: dicEmployee.strDesignationName || "Not assigned",
    strWorkEmail: dicEmployee.strWorkEmail || "Not available",
    strEmploymentStatus: dicEmployee.strEmploymentStatus,
    objActions: (
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Open employee profile">
          <IconButton component={Link} href={`/masters/employee/${dicEmployee.intID}`}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit employee">
          <IconButton component={Link} href={`/masters/employee/${dicEmployee.intID}`}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Deactivate employee">
          <IconButton color="error" onClick={() => handleDeactivate(dicEmployee.intID)}>
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    )
  }));

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Employee Master
          </Typography>
          <Typography color="text.secondary">
            Aggregate employee profile across basic info, addresses, bank details, and statutory records.
          </Typography>
        </Box>
        <Button component={Link} href="/masters/employee/new" variant="contained" sx={{ alignSelf: { md: "center" } }}>
          Add Employee
        </Button>
      </Stack>

      {strBannerMessage ? <Alert severity="success" onClose={() => setStrBannerMessage("")}>{strBannerMessage}</Alert> : null}
      {strErrorMessage ? <Alert severity="error" onClose={() => setStrErrorMessage("")}>{strErrorMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        {blnIsLoading ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={48} />
            <Skeleton variant="rounded" height={84} />
            <Skeleton variant="rounded" height={84} />
            <Skeleton variant="rounded" height={84} />
          </Stack>
        ) : (
          <CommonDataGrid
            columns={lstColumns}
            rows={lstRows}
            rowIdField="intID"
            showExportOptions
            exportFileName="employee-master"
            withPaper={false}
            emptyMessage="No employees found for the current tenant."
          />
        )}
      </Paper>
    </Stack>
  );
}
