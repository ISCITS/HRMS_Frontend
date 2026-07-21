"use client";

import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as yup from "yup";

import { useEmployeeOptions } from "@/features/leave-plan/hooks/useEmployeeLeavePlan";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type SearchForm = { strSearch: string };
const objSchema = yup.object({ strSearch: yup.string().max(150).defined() });

export default function EmployeeLeaveAssignmentPanel() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee_leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const { lstEmployees, blnLoading, strError } = useEmployeeOptions();
  const { control, reset } = useForm<SearchForm>({ resolver: yupResolver(objSchema), defaultValues: { strSearch: "" } });
  const strSearch = (useWatch({ control, name: "strSearch" }) ?? "").trim().toLowerCase();
  const blnCanView = canDo("LEAVE", "LEAVE_VIEW") || canDo("LEAVE_MANAGEMENT", "LEAVE_VIEW");
  const lstFiltered = useMemo(() => lstEmployees.filter((objEmployee) => !strSearch || `${objEmployee.strEmployeeCode} ${objEmployee.strFullName} ${objEmployee.strDepartmentName ?? ""}`.toLowerCase().includes(strSearch)), [lstEmployees, strSearch]);

  return <Box sx={{ p: { xs: 1.5, md: 2.5 }, display: "grid", gap: 2 }}>
    <Box><Typography variant="h5" fontWeight={800}>{t("page_title", "Employee Leave Plan Assignment")}</Typography><Typography color="text.secondary">{t("page_subtitle", "Assign Leave Plans and maintain employee balances.")}</Typography></Box>
    {strError ? <Alert severity="error">{strError}</Alert> : null}
    <Paper sx={{ p: 2 }}><Box sx={{ display: "flex", gap: 1, maxWidth: 720 }}>
      <Controller name="strSearch" control={control} render={({ field }) => <TextField {...field} fullWidth size="small" label={t("employee_search", "Search employee by code, name, or department")} inputProps={{ "data-control-id": "employee-leave-plan.list.search.input" }} />} />
      <Button variant="outlined" startIcon={<SearchRoundedIcon />} onClick={() => reset({ strSearch: "" })} data-control-id="employee-leave-plan.list.clear.button">{t("clear", "Clear")}</Button>
    </Box></Paper>
    <Paper sx={{ p: 2 }}>{blnLoading || blnRightsLoading ? <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /><Typography>{t("loading", "Loading employees...")}</Typography></Box> : !blnCanView ? <Alert severity="warning">{t("access_denied", "Leave assignment access is not available for your user group.")}</Alert> : <TableContainer><Table size="small" sx={{ minWidth: 850 }}><TableHead><TableRow>{["actions", "employee_code", "employee_name", "department", "designation", "joining_date", "status"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`table_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>
      {!lstFiltered.length ? <TableRow><TableCell colSpan={7} align="center">{t("empty_message", "No employees found.")}</TableCell></TableRow> : lstFiltered.map((objEmployee) => <TableRow key={objEmployee.intID} hover><TableCell><Tooltip title={t("manage_assignment", "Manage Leave Plan")}><IconButton onClick={() => objRouter.push(`/leave/plan-assignments/${objEmployee.intID}`)} data-control-id={`employee-leave-plan.list.row.${objEmployee.intID}.manage.button`}><ManageAccountsRoundedIcon /></IconButton></Tooltip></TableCell><TableCell>{objEmployee.strEmployeeCode}</TableCell><TableCell>{objEmployee.strFullName}</TableCell><TableCell>{objEmployee.strDepartmentName ?? "—"}</TableCell><TableCell>{objEmployee.strDesignationName ?? "—"}</TableCell><TableCell>{objEmployee.dtDateOfJoining}</TableCell><TableCell>{objEmployee.strEmploymentStatus}</TableCell></TableRow>)}
    </TableBody></Table></TableContainer>}</Paper>
  </Box>;
}
