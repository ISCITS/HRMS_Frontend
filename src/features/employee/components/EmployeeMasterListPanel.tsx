"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import type { InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AlertDialog from "@/Common/components/AlertDialog";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";
import CommonRowActions from "@/components/master/CommonRowActions";
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

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
  fnOnConfirm: () => Promise<void>;
};

type EmployeeTableRow = {
  id: string;
  select: ReactNode;
  action: ReactNode;
  employeeCode: string;
  fullName: string;
  workEmail: string;
  mobileNumber: string;
  department: string;
  designation: string;
  joiningDate: string;
  joiningDateSortValue: number;
  workerType: string;
  partialSave: ReactNode;
  status: ReactNode;
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
  return blnIsPartialSave ? t("partial_save_yes", "Yes") : t("partial_save_no", "Partial");
}

export default function EmployeeMasterListPanel() {
  const objRouter = useRouter();
  const { strLabelError, t } = useEmployeeLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo, canViewModule, isReadOnlyModule } = useActionRights();
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [objConfirmDialog, setObjConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [objAlertDialog, setObjAlertDialog] = useState({
    blnOpen: false,
    strMessage: "",
    strSeverity: "success" as "success" | "error",
  });

  function openAlertDialog(strSeverity: "success" | "error", strMessage: string) {
    setObjAlertDialog({
      blnOpen: true,
      strMessage,
      strSeverity,
    });
  }

  function openConfirmDialog(objDialog: ConfirmDialogState) {
    setObjConfirmDialog(objDialog);
  }

  function closeConfirmDialog() {
    if (blnSubmitting) {
      return;
    }
    setObjConfirmDialog(null);
  }

  async function executeConfirmedAction() {
    if (!objConfirmDialog) {
      return;
    }

    try {
      await objConfirmDialog.fnOnConfirm();
    } finally {
      setObjConfirmDialog(null);
    }
  }

  async function loadModuleData() {
    if (!canViewModule("EMPLOYEE")) {
      setLstEmployees([]);
      setLstSelectedIDs([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    try {
      const lstEmployeeData = await employeeService.getEmployees();
      setLstEmployees(lstEmployeeData);
      setLstSelectedIDs([]);
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
      setLstSelectedIDs([]);
      setBlnLoading(false);
      return;
    }

    loadModuleData().catch(() => undefined);
  }, [blnRightsLoading]);

  const blnCanView = canViewModule("EMPLOYEE");
  const blnCanAdd = canDo("EMPLOYEE", "add");
  const blnCanEdit = canDo("EMPLOYEE", "edit");
  const blnCanDelete = canDo("EMPLOYEE", "delete");
  const blnCanExport = canDo("EMPLOYEE", "export");
  const blnReadOnly = isReadOnlyModule("EMPLOYEE");
  const blnCanChangeStatus = blnCanEdit;

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

  const lstFilteredEmployees = useMemo(() => lstEmployees.filter((dicEmployee) => {
    const blnNameMatch = !dicSearchApplied.name || dicEmployee.strFullName.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnCodeMatch = !dicSearchApplied.code || dicEmployee.strEmployeeCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnDepartmentMatch = dicSearchApplied.department === "All" || dicEmployee.strDepartmentName?.trim() === dicSearchApplied.department;
    const blnDesignationMatch = dicSearchApplied.designation === "All" || dicEmployee.strDesignationName?.trim() === dicSearchApplied.designation;
    const blnStatusMatch = dicSearchApplied.status === "All" || dicEmployee.strEmploymentStatus === dicSearchApplied.status;
    return blnNameMatch && blnCodeMatch && blnDepartmentMatch && blnDesignationMatch && blnStatusMatch;
  }), [dicSearchApplied, lstEmployees]);
  const blnAllFilteredSelected = lstFilteredEmployees.length > 0 && lstFilteredEmployees.every((dicEmployee) => lstSelectedIDs.includes(dicEmployee.intID));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredEmployees.some((dicEmployee) => lstSelectedIDs.includes(dicEmployee.intID));

  async function updateEmployeeStatus(lstIDs: number[], blnIsActive: boolean) {
    if (!lstIDs.length) {
      return;
    }
    setBlnSubmitting(true);
    try {
      await employeeService.bulkUpdateStatus(lstIDs, blnIsActive);
      openAlertDialog("success", t("status_success", dicConstant.employeeMaster.statusSuccess));
      await loadModuleData();
    } catch (objError) {
      openAlertDialog("error", objError instanceof Error ? objError.message : t("error_update_status", "Unable to update employee status."));
    } finally {
      setBlnSubmitting(false);
    }
  }

  async function deleteEmployees(lstIDs: number[], blnIsSingle = false) {
    if (!lstIDs.length) {
      return;
    }
    openConfirmDialog({
      strTitle: blnIsSingle ? t("confirm_delete_title", "Delete Employee") : t("confirm_deactivate_title", "Deactivate Employees"),
      strMessage: blnIsSingle ? t("confirm_delete_single", dicConstant.employeeMaster.confirmDeleteSingle) : t("confirm_deactivate", dicConstant.employeeMaster.confirmDeactivate),
      strConfirmLabel: blnIsSingle ? t("delete_button", "Delete") : t("deactivate_button", "Deactivate"),
      fnOnConfirm: async () => {
        setBlnSubmitting(true);
        try {
          await employeeService.bulkDelete(lstIDs);
          openAlertDialog("success", t("delete_success", dicConstant.employeeMaster.deleteSuccess));
          await loadModuleData();
        } catch (objError) {
          openAlertDialog("error", objError instanceof Error ? objError.message : t("error_deactivate", "Unable to deactivate employee."));
        } finally {
          setBlnSubmitting(false);
        }
      },
    });
  }

  function toggleSelection(intEmployeeID: number) {
    setLstSelectedIDs((lstPrevious) => lstPrevious.includes(intEmployeeID)
      ? lstPrevious.filter((intID) => intID !== intEmployeeID)
      : [...lstPrevious, intEmployeeID]);
  }

  function toggleSelectAll() {
    if (blnAllFilteredSelected) {
      setLstSelectedIDs((lstPrevious) => lstPrevious.filter((intID) => !lstFilteredEmployees.some((dicEmployee) => dicEmployee.intID === intID)));
      return;
    }
    setLstSelectedIDs((lstPrevious) => [...new Set([...lstPrevious, ...lstFilteredEmployees.map((dicEmployee) => dicEmployee.intID)])]);
  }

  const lstTableRows = useMemo<EmployeeTableRow[]>(() => lstFilteredEmployees.map((dicEmployee) => {
    const blnSelected = lstSelectedIDs.includes(dicEmployee.intID);
    return {
      id: String(dicEmployee.intID),
      select: (
        <Checkbox
          checked={blnSelected}
          onChange={() => toggleSelection(dicEmployee.intID)}
          inputProps={{ "controlId": "employee.master-list.row.select.checkbox", "data-row-key": dicEmployee.intID } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      action: (
        <CommonRowActions
          testIdPrefix="employee.master-list.row"
          rowKey={String(dicEmployee.intID)}
          blnCanView={blnCanView}
          blnCanEdit={blnCanEdit}
          blnCanDelete={blnCanDelete}
          onView={() => objRouter.push(`/employees/view/${dicEmployee.strRecordUUID}`)}
          onEdit={() => objRouter.push(`/employees/edit/${dicEmployee.strRecordUUID}`)}
          onDelete={() => deleteEmployees([dicEmployee.intID], true)}
        />
      ),
      employeeCode: dicEmployee.strEmployeeCode,
      fullName: dicEmployee.strFullName,
      workEmail: dicEmployee.strWorkEmail || "-",
      mobileNumber: dicEmployee.strMobileNumber || "-",
      department: dicEmployee.strDepartmentName || "-",
      designation: dicEmployee.strDesignationName || "-",
      joiningDate: formatDisplayDate(dicEmployee.dtDateOfJoining),
      joiningDateSortValue: dicEmployee.dtDateOfJoining ? new Date(dicEmployee.dtDateOfJoining).getTime() : 0,
      workerType: getWorkerTypeLabel(dicEmployee.blnIsWorker, t),
      partialSave: <span className={`${styles.statusPill} ${styles.statusNeutral}`}>{getPartialSaveLabel(dicEmployee.blnIsPartialSave, t)}</span>,
      status: <span className={`${styles.statusPill} ${dicEmployee.strEmploymentStatus === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicEmployee.strEmploymentStatus === "Active" ? dicConstant.common.statusActive : dicConstant.common.statusInactive}</span>
    };
  }), [blnCanDelete, blnCanEdit, blnCanView, lstFilteredEmployees, lstSelectedIDs, objRouter, t]);

  const lstTableColumns = useMemo<CommonTableColumn<EmployeeTableRow>[]>(() => [
    {
      field: "select",
      headerName: (
        <Checkbox
          checked={blnAllFilteredSelected}
          indeterminate={blnSomeFilteredSelected}
          onChange={toggleSelectAll}
          disabled={lstFilteredEmployees.length === 0}
          inputProps={{ "controlId": "employee.master-list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
        />
      ),
      sortable: false,
      filterable: false,
      exportable: false,
      width: 56
    },
    { field: "action", headerName: t("grid_actions", dicConstant.employeeMaster.grid.actions), sortable: false, filterable: false, exportable: false, width: 110 },
    { field: "employeeCode", headerName: t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode) },
    { field: "fullName", headerName: t("grid_full_name", dicConstant.employeeMaster.grid.fullName) },
    // Email addresses need additional space and must stay inside their cell beside the phone column.
    { field: "workEmail", headerName: t("grid_work_email", dicConstant.employeeMaster.grid.workEmail), width: 260, blnWrapText: true },
    { field: "mobileNumber", headerName: t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber) },
    { field: "department", headerName: t("grid_department", dicConstant.employeeMaster.grid.department) },
    { field: "designation", headerName: t("grid_designation", dicConstant.employeeMaster.grid.designation) },
    {
      field: "joiningDate",
      headerName: t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate),
      sortAccessor: (dicRow) => dicRow.joiningDateSortValue
    },
    { field: "workerType", headerName: t("grid_worker", "Worker Category") },
    { field: "partialSave", headerName: t("grid_partial_save", "Partial Save"), sortable: false, filterable: false, width: 140 },
    { field: "status", headerName: t("grid_status", dicConstant.employeeMaster.grid.status), sortable: false, filterable: false, width: 130 }
  ], [blnAllFilteredSelected, blnSomeFilteredSelected, lstFilteredEmployees.length, t]);

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
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
        <Box className={styles.employeeSearchRow}>
          <TextField data-controlid="employee.master-list.search.code.input" inputProps={{ "data-controlid": "employee.master-list.search.code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={t("search_code_placeholder", dicConstant.employeeMaster.search.codePlaceholder)} fullWidth />
          <TextField data-controlid="employee.master-list.search.name.input" inputProps={{ "data-controlid": "employee.master-list.search.name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={t("search_name_placeholder", dicConstant.employeeMaster.search.namePlaceholder)} fullWidth />
          <TextField data-controlid="employee.master-list.search.department.select" inputProps={{ "data-controlid": "employee.master-list.search.department.select" }} select label={t("field_department", dicConstant.employeeMaster.fields.department)} value={dicSearchDraft.department} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, department: objEvent.target.value }))} fullWidth>
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            {lstDepartmentOptions.map((strDepartment) => (
              <MenuItem key={strDepartment} value={strDepartment}>{strDepartment}</MenuItem>
            ))}
          </TextField>
          <TextField data-controlid="employee.master-list.search.designation.select" inputProps={{ "data-controlid": "employee.master-list.search.designation.select" }} select label={t("field_designation", dicConstant.employeeMaster.fields.designation)} value={dicSearchDraft.designation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, designation: objEvent.target.value }))} fullWidth>
            <MenuItem value="All">{t("all", "All")}</MenuItem>
            {lstDesignationOptions.map((strDesignation) => (
              <MenuItem key={strDesignation} value={strDesignation}>{strDesignation}</MenuItem>
            ))}
          </TextField>
          <TextField data-controlid="employee.master-list.search.status.select" inputProps={{ "data-controlid": "employee.master-list.search.status.select" }} select label={t("search_status_placeholder", dicConstant.employeeMaster.search.statusPlaceholder)} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button controlId="employee.master-list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); }} disabled={blnLoading || blnSubmitting}>
              {t("search_button", dicConstant.common.search)}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button controlId="employee.master-list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); }} disabled={blnLoading || blnSubmitting}>
              {t("clear_button", dicConstant.common.clear)}
            </Button>
          </Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
          </Box>
        ) : lstSelectedIDs.length > 0 && !blnReadOnly && (blnCanChangeStatus || blnCanDelete) ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIDs.length} {t("bulk_rows_selected", "row(s) selected")}</Typography>
            {blnCanChangeStatus ? (
              <Button controlId="employee.master-list.bulk-activate.button" className={styles.bulkActivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, true)}>{t("bulk_activate", "Bulk Activate")}</Button>
            ) : null}
            {blnCanChangeStatus ? (
              <Button controlId="employee.master-list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, false)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            ) : null}
            {blnCanDelete ? (
              <Button controlId="employee.master-list.bulk-delete.button" className={styles.bulkDelete} onClick={() => deleteEmployees(lstSelectedIDs)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
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
            rowIdField="id"
            defaultPageSize={20}
            pageSizeOptions={[10, 20, 50]}
            exportFileName="employee-master"
            showExportOptions={blnCanExport}
            testIdPrefix="employee.master-list"
            showPaginationSummary
            emptyMessage={t("empty_message", dicConstant.employeeMaster.emptyMessage)}
            toolbarLeft={(
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                {blnCanAdd ? (
                  <Button controlId="employee.master-list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/employees/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                    {t("emp_add_button", dicConstant.employeeMaster.addButton)}
                  </Button>
                ) : null}
              </Box>
            )}
            onRowDoubleClick={(dicRow) => {
              const strMode = blnCanEdit ? "edit" : "view";
              objRouter.push(`/employees/${strMode}/${dicRow.id}`);
            }}
            getRowSx={(dicRow) => lstSelectedIDs.includes(Number(dicRow.id)) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>

      <AlertDialog
        blnOpen={objAlertDialog.blnOpen}
        strMessage={objAlertDialog.strMessage}
        strSeverity={objAlertDialog.strSeverity}
        fnOnClose={() => setObjAlertDialog((objPrevious) => ({ ...objPrevious, blnOpen: false }))}
        rootTestId="employee.master-list.alert.dialog"
        closeButtonTestId="employee.master-list.alert.close.button"
      />
      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} onKeyDown={handleSingleDialogActionEnter} PaperProps={{ className: styles.confirmDialogPaper, "controlId": "employee.master-list.confirm.dialog" }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button controlId="employee.master-list.confirm.cancel.button" className={styles.textAction} onClick={closeConfirmDialog}>
            {dicConstant.common.cancel}
          </Button>
          <Button controlId="employee.master-list.confirm.confirm.button" className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? "Loading..." : "Processing..."} intZIndex={1400} />
    </Box>
  );
}
