"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import { Box, Breadcrumbs, Button, Checkbox, Drawer, IconButton, InputAdornment, Link, Menu, MenuItem, Popover, TextField, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

import AlertDialog from "@/Common/components/AlertDialog";
import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useEmployeeLabels } from "@/features/employee/hooks/useEmployeeLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord, EmployeeStatus } from "@/features/employee/types";

type SearchForm = {
  name: string;
  code: string;
  department: string;
  designation: string;
  status: "All" | EmployeeStatus;
};

const dicEmptySearch: SearchForm = {
  name: "",
  code: "",
  department: "All",
  designation: "All",
  status: "All",
};

type EmployeeTableRow = {
  id: string;
  details: ReactNode;
  employeeCode: string;
  fullName: ReactNode;
  fullNameSortValue: string;
  workEmail: string;
  mobileNumber: string;
  department: string;
  designation: string;
  joiningDate: string;
  joiningDateSortValue: number;
  workerType: string;
  partialSave: ReactNode;
  partialSaveSortValue: number;
  status: ReactNode;
  statusSortValue: string;
};

function formatDisplayDate(strDate: string | null): string {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(strDate));
}

function getWorkerTypeLabel(blnIsWorker: boolean, t: (strKey: string, strFallback?: string) => string) {
  return blnIsWorker
    ? t("field_worker", "Worker")
    : t("field_non_worker", "Non Worker");
}

function getPartialSaveLabel(blnIsPartialSave: boolean, t: (strKey: string, strFallback?: string) => string) {
  return blnIsPartialSave ? t("profile_status_pending", "Pending") : t("profile_status_verified", "Verified");
}

export default function EmployeeMasterListPanel() {
  const objRouter = useRouter();
  const { strLabelError, t } = useEmployeeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo, canViewModule, isReadOnlyModule } = useActionRights();
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [objColumnsAnchor, setObjColumnsAnchor] = useState<HTMLElement | null>(null);
  const [lstExtraColumns, setLstExtraColumns] = useState<string[]>([]);
  const [dicDrawerEmployee, setDicDrawerEmployee] = useState<EmployeeListRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [objAlertDialog, setObjAlertDialog] = useState({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success" as "success" | "error",
  });

  function closeMoreFilters() {
    setDicSearchDraft((dicPrevious) => ({
      ...dicPrevious,
      code: dicSearchApplied.code,
      designation: dicSearchApplied.designation,
    }));
    setObjMoreFiltersAnchor(null);
  }

  function openAlertDialog(strSeverity: "success" | "error", strMessage: string) {
    setObjAlertDialog({
      blnOpen: true,
      strMessage,
      strSeverity,
    });
  }

  async function loadModuleData() {
    if (!canViewModule("EMPLOYEE")) {
      setLstEmployees([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    try {
      const lstEmployeeData = await employeeService.getEmployees();
      setLstEmployees(lstEmployeeData);
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_load_list", "Unable to load employee data."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    if (!canViewModule("EMPLOYEE")) {
      setLstEmployees([]);
      setBlnLoading(false);
      return;
    }

    loadModuleData().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewModule("EMPLOYEE");
  const blnCanAdd = canDo("EMPLOYEE", "add");
  const blnCanEdit = canDo("EMPLOYEE", "edit");
  const blnCanExport = canDo("EMPLOYEE", "export");
  const blnReadOnly = isReadOnlyModule("EMPLOYEE");

  const lstDepartmentOptions = useMemo(() => Array.from(new Set(
    lstEmployees
      .map((dicEmployee) => dicEmployee.strDepartmentName?.trim())
      .filter((strDepartment): strDepartment is string => Boolean(strDepartment))
  )).sort((strFirst, strSecond) => strFirst.localeCompare(strSecond)), [lstEmployees]);

  const lstDesignationOptions = useMemo(() => Array.from(new Set(
    lstEmployees
      .map((dicEmployee) => dicEmployee.strDesignationName?.trim())
      .filter((strDesignation): strDesignation is string => Boolean(strDesignation))
  )).sort((strFirst, strSecond) => strFirst.localeCompare(strSecond)), [lstEmployees]);

  const lstDesignationSelectOptions = useMemo(
    () => lstDesignationOptions.map((strDesignation) => ({ intID: strDesignation, strLabel: strDesignation })),
    [lstDesignationOptions]
  );

  const lstFilteredEmployees = useMemo(() => lstEmployees.filter((dicEmployee) => {
    const strSearch = dicSearchApplied.name.trim().toLowerCase();
    const blnNameMatch = !strSearch || dicEmployee.strFullName.toLowerCase().includes(strSearch) || dicEmployee.strEmployeeCode.toLowerCase().includes(strSearch) || (dicEmployee.strDepartmentName ?? "").toLowerCase().includes(strSearch);
    const blnCodeMatch = !dicSearchApplied.code || dicEmployee.strEmployeeCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnDepartmentMatch = dicSearchApplied.department === "All" || dicEmployee.strDepartmentName?.trim() === dicSearchApplied.department;
    const blnDesignationMatch = dicSearchApplied.designation === "All" || dicEmployee.strDesignationName?.trim() === dicSearchApplied.designation;
    const blnStatusMatch = dicSearchApplied.status === "All" || dicEmployee.strEmploymentStatus === dicSearchApplied.status;
    return blnNameMatch && blnCodeMatch && blnDepartmentMatch && blnDesignationMatch && blnStatusMatch;
  }), [dicSearchApplied, lstEmployees]);
  const lstTableRows = useMemo<EmployeeTableRow[]>(() => lstFilteredEmployees.map((dicEmployee) => {
    return {
      id: String(dicEmployee.intID),
      details: <IconButton data-control-id={`employee.master-list.row.${dicEmployee.intID}.details.button`} aria-label={`${t("more_details", "More details")} ${dicEmployee.strFullName}`} size="small" onClick={() => setDicDrawerEmployee(dicEmployee)}><MoreHorizRoundedIcon fontSize="small" /></IconButton>,
      employeeCode: dicEmployee.strEmployeeCode,
      fullName: <Link component={NextLink} href={`/employees/${blnCanEdit ? "edit" : "view"}/${dicEmployee.strRecordUUID}`} data-control-id={`employee.master-list.row.${dicEmployee.intID}.name.link`} underline="hover" sx={{ color: "inherit", cursor: "pointer", font: "inherit", textAlign: "left", "&:hover": { color: "#0066df", textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid #0066df", outlineOffset: 3 } }}>{dicEmployee.strFullName}</Link>,
      fullNameSortValue: dicEmployee.strFullName,
      workEmail: dicEmployee.strWorkEmail || "-",
      mobileNumber: dicEmployee.strMobileNumber || "-",
      department: dicEmployee.strDepartmentName || "-",
      designation: dicEmployee.strDesignationName || "-",
      joiningDate: formatDisplayDate(dicEmployee.dtDateOfJoining),
      joiningDateSortValue: dicEmployee.dtDateOfJoining ? new Date(dicEmployee.dtDateOfJoining).getTime() : 0,
      workerType: getWorkerTypeLabel(dicEmployee.blnIsWorker, t),
      partialSaveSortValue: dicEmployee.blnIsPartialSave ? 1 : 0,
      partialSave: <span className={`${styles.statusPill} ${dicEmployee.blnIsPartialSave ? styles.employeeStatusPending : styles.employeeStatusVerified}`}>{getPartialSaveLabel(dicEmployee.blnIsPartialSave, t)}</span>,
      status: <span className={`${styles.statusPill} ${dicEmployee.strEmploymentStatus === "Active" ? styles.employeeStatusActive : styles.employeeStatusInactive}`}>{dicEmployee.strEmploymentStatus === "Active" ? dicConstant.common.statusActive : dicConstant.common.statusInactive}</span>,
      statusSortValue: dicEmployee.strEmploymentStatus
    };
  }), [blnCanEdit, lstFilteredEmployees, t]);

  const lstTableColumns = useMemo<CommonTableColumn<EmployeeTableRow>[]>(() => [
    { field: "fullName", headerName: t("grid_employee_name", "Employee Name"), width: 220, sortAccessor: (dicRow) => dicRow.fullNameSortValue },
    { field: "employeeCode", headerName: t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode), width: 95 },
    { field: "department", headerName: t("grid_department", dicConstant.employeeMaster.grid.department), width: 105 },
    { field: "designation", headerName: t("grid_designation", dicConstant.employeeMaster.grid.designation), width: 125 },
    {
      field: "joiningDate",
      headerName: t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate),
      width: 95,
      sortAccessor: (dicRow) => dicRow.joiningDateSortValue
    },
    { field: "workerType", headerName: t("grid_worker", "Worker Category"), width: 95 },
    {
      field: "partialSave",
      headerName: t("grid_partial_save", "Profile Status"),
      sortable: true,
      sortAccessor: (dicRow) => dicRow.partialSaveSortValue,
      filterable: false,
      width: 105
    },
    { field: "status", headerName: t("grid_status", dicConstant.employeeMaster.grid.status), sortAccessor: (dicRow) => dicRow.statusSortValue, filterable: false, width: 85 },
    { field: "details", headerName: "", sortable: false, filterable: false, exportable: false, width: 40 }
  ], [t]);

  return (
    <Box className={styles.page} sx={{ position: "relative" }}>
      <Breadcrumbs aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ fontSize: 13, py: 0.5, ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>{t("breadcrumb_masters", "Masters")}</Typography>
        <Typography component="h1" aria-current="page" sx={{ fontSize: "inherit", fontWeight: 700, color: "#243b53" }}>{t("breadcrumb_employees", "Employees")}</Typography>
      </Breadcrumbs>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {strLabelError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strLabelError}</Typography>
        ) : null}
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
        {!blnRightsLoading && blnCanView && blnReadOnly ? (
          <Typography sx={{ mt: 1, color: "#1d4ed8", fontSize: "0.85rem", fontWeight: 700 }}>
            {t("read_only_mode", "You have view-only access for Employee.")}
          </Typography>
        ) : null}
        <Box className={styles.employeeSearchRow} sx={{ alignItems: "end", "& .MuiButton-root": { height: "36px !important", minHeight: "36px !important", alignSelf: "flex-end" } }}>
          <TextField aria-label={t("search_name_code_department", "Search by name, code or department...")} data-control-id="employee.master-list.search.name.input" inputProps={{ "data-control-id": "employee.master-list.search.name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={t("search_name_code_department", "Search by name, code or department...")} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon sx={{ fontSize: 18, color: "#6474a1" }} /></InputAdornment> }} sx={{ alignSelf: "end" }} fullWidth size="small" />
          <Box className={styles.employeeSearchField}>
            <Typography component="label" htmlFor="employee-search-department" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{t("field_department", "Department")}</Typography>
            <TextField id="employee-search-department" data-control-id="employee.master-list.search.department.select" select value={dicSearchDraft.department} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, department: objEvent.target.value }))} fullWidth size="small">
              <MenuItem value="All">{t("select_department", "Select department")}</MenuItem>
              {lstDepartmentOptions.map((strDepartment) => <MenuItem key={strDepartment} value={strDepartment}>{strDepartment}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.employeeSearchField}>
            <Typography component="label" htmlFor="employee-search-status" sx={{ display: "block", mb: 0.75, fontSize: 12, fontWeight: 600 }}>{t("grid_status", "Status")}</Typography>
          <TextField id="employee-search-status" data-control-id="employee.master-list.search.status.select" inputProps={{ "data-control-id": "employee.master-list.search.status.select" }} select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth size="small" SelectProps={{ displayEmpty: true }}>
              <MenuItem data-control-id="employee.master-list.search.status.all.option" value="All">{t("select_status", "Select status")}</MenuItem>
              <MenuItem data-control-id="employee.master-list.search.status.active.option" value="Active">{dicConstant.common.statusActive}</MenuItem>
              <MenuItem data-control-id="employee.master-list.search.status.inactive.option" value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          </Box>
          <Button data-control-id="employee.master-list.more-filters.button" className={styles.secondaryButton} startIcon={<FilterListRoundedIcon />} onClick={(objEvent) => setObjMoreFiltersAnchor(objEvent.currentTarget)} aria-expanded={Boolean(objMoreFiltersAnchor)}>{t("more_filters", "More filters")}{dicSearchDraft.code || dicSearchDraft.designation !== "All" ? " •" : ""}</Button>
          <Box className={styles.searchActions}>
            <Button controlId="employee.master-list.search.button" data-control-id="employee.master-list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading}>
              {t("search_button", dicConstant.common.search)}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button controlId="employee.master-list.clear.button" data-control-id="employee.master-list.clear.button" className={styles.secondaryButton} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading}>
              {t("clear_button", dicConstant.common.clear)}
            </Button>
          </Box>
        </Box>
        <Popover open={Boolean(objMoreFiltersAnchor)} anchorEl={objMoreFiltersAnchor} onClose={closeMoreFilters} anchorOrigin={{ vertical: "bottom", horizontal: "left" }} PaperProps={{ className: styles.employeeMoreFilters, "data-control-id": "employee.master-list.more-filters.popover" }}>
          <Box className={styles.employeeMoreFiltersHeader}>
            <Typography fontWeight={700}>{t("more_filters", "More filters")}</Typography>
            <IconButton data-control-id="employee.master-list.more-filters.close.button" aria-label={t("close", "Close")} size="small" onClick={closeMoreFilters}><ClearRoundedIcon fontSize="small" /></IconButton>
          </Box>
          <TextField data-control-id="employee.master-list.search.code.input" inputProps={{ "data-control-id": "employee.master-list.search.code.input" }} label={t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode)} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} size="small" fullWidth />
          <CommonSearchableSelect controlId="employee.master-list.search.designation.select" label={t("field_designation", dicConstant.employeeMaster.fields.designation)} value={dicSearchDraft.designation === "All" ? "" : dicSearchDraft.designation} options={lstDesignationSelectOptions} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, designation: strValue === "" ? "All" : strValue }))} placeholder={t("all", "All")} size="small" fullWidth />
          <Box className={styles.employeeMoreFiltersActions}>
            <Button data-control-id="employee.master-list.more-filters.clear-all.button" className={styles.employeeMoreFiltersClear} onClick={() => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: "", designation: "All" }))}>{t("clear_all", "Clear all")}</Button>
            <Box className={styles.employeeMoreFiltersActionButtons}>
              <Button data-control-id="employee.master-list.more-filters.cancel.button" className={styles.secondaryButton} onClick={closeMoreFilters}>{t("cancel", "Cancel")}</Button>
              <Button data-control-id="employee.master-list.more-filters.apply.button" className={styles.primaryButton} onClick={() => { setDicSearchApplied(dicSearchDraft); setObjMoreFiltersAnchor(null); }}>{t("apply", "Apply")}</Button>
            </Box>
          </Box>
        </Popover>

      </Box>

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnCanView && !blnRightsLoading && !blnLoading ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Employee access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("access_denied_help", "Contact your administrator if you need employee visibility.")}
            </Typography>
          </Box>
        ) : (
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            minTableWidth={0}
            rowIdField="id"
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="employee-master"
            showExportOptions={blnCanExport}
            testIdPrefix="employee.master-list"
            showPaginationSummary
            hideRowClickHint
            emptyMessage={t("empty_message", dicConstant.employeeMaster.emptyMessage)}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button controlId="employee.master-list.add.button" data-control-id="employee.master-list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/employees/add")} disabled={blnLoading || blnRightsLoading}>
                    {t("emp_add_button", dicConstant.employeeMaster.addButton)}
                  </Button>
                ) : null}
              </Box>
            )}
            toolbarAfterExport={<Button data-control-id="employee.master-list.columns.button" className={styles.secondaryButton} startIcon={<ViewColumnRoundedIcon />} onClick={(objEvent) => setObjColumnsAnchor(objEvent.currentTarget)}>{t("add_columns", "Add columns")}</Button>}
            onRowClick={(dicRow) => {
              const dicEmployee = lstFilteredEmployees.find((objEmployee) => objEmployee.intID === Number(dicRow.id));
              if (!dicEmployee) return;
              objRouter.push(`/employees/${blnCanEdit ? "edit" : "view"}/${dicEmployee.strRecordUUID}`);
            }}
            getRowSx={() => ({ backgroundColor: "#fff", transition: "background-color 150ms ease", "&.MuiTableRow-hover:hover": { backgroundColor: "#f3f8ff" } })}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
      <Menu anchorEl={objColumnsAnchor} open={Boolean(objColumnsAnchor)} onClose={() => setObjColumnsAnchor(null)}>
        {(["workEmail", "mobileNumber"] as const).map((strField) => <MenuItem key={strField} data-control-id={`employee.master-list.columns.${strField}.option`} onClick={() => setLstExtraColumns((lstPrevious) => lstPrevious.includes(strField) ? lstPrevious.filter((strValue) => strValue !== strField) : [...lstPrevious, strField])}><Checkbox data-control-id={`employee.master-list.columns.${strField}.checkbox`} checked={lstExtraColumns.includes(strField)} size="small" />{strField === "workEmail" ? t("grid_work_email", dicConstant.employeeMaster.grid.workEmail) : t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber)}</MenuItem>)}
      </Menu>
      <Drawer anchor="right" open={Boolean(dicDrawerEmployee)} onClose={() => setDicDrawerEmployee(null)} PaperProps={{ className: styles.employeeDetailsDrawer, "data-control-id": "employee.master-list.details.drawer" }}>
        {dicDrawerEmployee ? <>
          <Box className={styles.employeeDetailsHeader}>
            <Box><Typography variant="h6" fontWeight={700}>{dicDrawerEmployee.strFullName}</Typography><Typography color="text.secondary">{dicDrawerEmployee.strEmployeeCode}</Typography></Box>
            <IconButton data-control-id="employee.master-list.details.close.button" aria-label={t("close", "Close")} onClick={() => setDicDrawerEmployee(null)}><ClearRoundedIcon /></IconButton>
          </Box>
          <Box className={styles.employeeDetailsContent}>
            {[
              ...(lstExtraColumns.includes("workEmail") ? [[t("grid_work_email", dicConstant.employeeMaster.grid.workEmail), dicDrawerEmployee.strWorkEmail]] : []),
              ...(lstExtraColumns.includes("mobileNumber") ? [[t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber), dicDrawerEmployee.strMobileNumber]] : []),
              [t("field_employment_type", "Employment Type"), dicDrawerEmployee.strEmploymentTypeName],
              [t("field_location", "Location"), dicDrawerEmployee.strLocationName],
              [t("field_manager", "Manager"), dicDrawerEmployee.strManagerName]
            ].map(([strLabel, strValue]) => <Box key={strLabel} className={styles.employeeDetailsField}><Typography color="text.secondary" variant="body2">{strLabel}</Typography><Typography>{strValue || "-"}</Typography></Box>)}
          </Box>
        </> : null}
      </Drawer>

      <AlertDialog
        blnOpen={objAlertDialog.blnOpen}
        strMessage={objAlertDialog.strMessage}
        strSeverity={objAlertDialog.strSeverity}
        fnOnClose={() => setObjAlertDialog((objPrevious) => ({ ...objPrevious, blnOpen: false }))}
        rootTestId="employee.master-list.alert.dialog"
        closeButtonTestId="employee.master-list.alert.close.button"
      />
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading..." intZIndex={1400} />
    </Box>
  );
}
