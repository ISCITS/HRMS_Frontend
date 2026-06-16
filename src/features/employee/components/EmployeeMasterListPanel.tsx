"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import type { InputHTMLAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AlertDialog from "@/Common/components/AlertDialog";
import { handleSingleDialogActionEnter } from "@/Common/utils/dialogKeyboard";
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
  status: "All" | EmployeeStatus;
};

const dicEmptySearch: SearchForm = { name: "", code: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

type ConfirmDialogState = {
  strTitle: string;
  strMessage: string;
  strConfirmLabel: string;
  fnOnConfirm: () => Promise<void>;
};

function formatDisplayDate(strDate: string | null): string {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(strDate));
}

function toCsvCell(strValue: string) {
  return `"${strValue.replace(/"/g, '""')}"`;
}

function getWorkerTypeLabel(blnIsWorker: boolean, t: (strKey: string, strFallback?: string) => string) {
  return blnIsWorker
    ? t("field_worker", "Worker")
    : t("field_non_worker", "Non Worker");
}

function getPartialSaveLabel(blnIsPartialSave: boolean, t: (strKey: string, strFallback?: string) => string) {
  return blnIsPartialSave ? t("partial_save_yes", "Yes") : t("partial_save_no", "No");
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
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
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
      setIntPage(1);
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

  const lstFilteredEmployees = useMemo(() => lstEmployees.filter((dicEmployee) => {
    const blnNameMatch = !dicSearchApplied.name || dicEmployee.strFullName.toLowerCase().includes(dicSearchApplied.name.toLowerCase());
    const blnCodeMatch = !dicSearchApplied.code || dicEmployee.strEmployeeCode.toLowerCase().includes(dicSearchApplied.code.toLowerCase());
    const blnStatusMatch = dicSearchApplied.status === "All" || dicEmployee.strEmploymentStatus === dicSearchApplied.status;
    return blnNameMatch && blnCodeMatch && blnStatusMatch;
  }), [dicSearchApplied, lstEmployees]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredEmployees.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleEmployees = lstFilteredEmployees.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const blnAllVisibleSelected = lstVisibleEmployees.length > 0 && lstVisibleEmployees.every((dicEmployee) => lstSelectedIDs.includes(dicEmployee.intID));
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIDs.some((intID) => lstVisibleEmployees.some((dicEmployee) => dicEmployee.intID === intID));

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
    if (blnAllVisibleSelected) {
      setLstSelectedIDs((lstPrevious) => lstPrevious.filter((intID) => !lstVisibleEmployees.some((dicEmployee) => dicEmployee.intID === intID)));
      return;
    }
    setLstSelectedIDs((lstPrevious) => [...new Set([...lstPrevious, ...lstVisibleEmployees.map((dicEmployee) => dicEmployee.intID)])]);
  }

  function handleExportExcel() {
    const lstHeaders = [
      t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode),
      t("grid_full_name", dicConstant.employeeMaster.grid.fullName),
      t("grid_work_email", dicConstant.employeeMaster.grid.workEmail),
      t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber),
      t("grid_department", dicConstant.employeeMaster.grid.department),
      t("grid_designation", dicConstant.employeeMaster.grid.designation),
      t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate),
      t("field_worker", "Worker"),
      t("grid_partial_save", "Partial Save"),
      t("grid_status", dicConstant.employeeMaster.grid.status)
    ];

    const strCsvContent = [
      lstHeaders.map(toCsvCell).join(","),
      ...lstFilteredEmployees.map((dicEmployee) =>
        [
          dicEmployee.strEmployeeCode,
          dicEmployee.strFullName,
          dicEmployee.strWorkEmail || "-",
          dicEmployee.strMobileNumber || "-",
          dicEmployee.strDepartmentName || "-",
          dicEmployee.strDesignationName || "-",
          formatDisplayDate(dicEmployee.dtDateOfJoining),
          getWorkerTypeLabel(dicEmployee.blnIsWorker, t),
          getPartialSaveLabel(dicEmployee.blnIsPartialSave, t),
          dicEmployee.strEmploymentStatus
        ].map((strValue) => toCsvCell(String(strValue))).join(",")
      )
    ].join("\n");

    const objBlob = new Blob([`\uFEFF${strCsvContent}`], { type: "text/csv;charset=utf-8;" });
    const strUrl = URL.createObjectURL(objBlob);
    const objLink = document.createElement("a");
    objLink.href = strUrl;
    objLink.download = "employee-master.csv";
    objLink.click();
    URL.revokeObjectURL(strUrl);
  }

  function handleExportPdf() {
    const dicPrintWindow = window.open("", "_blank", "width=1100,height=720");
    if (!dicPrintWindow) {
      return;
    }

    const strTableRows = lstFilteredEmployees
      .map(
        (dicEmployee) => `
          <tr>
            <td>${dicEmployee.strEmployeeCode}</td>
            <td>${dicEmployee.strFullName}</td>
            <td>${dicEmployee.strWorkEmail || "-"}</td>
            <td>${dicEmployee.strMobileNumber || "-"}</td>
            <td>${dicEmployee.strDepartmentName || "-"}</td>
            <td>${dicEmployee.strDesignationName || "-"}</td>
            <td>${formatDisplayDate(dicEmployee.dtDateOfJoining)}</td>
            <td>${getWorkerTypeLabel(dicEmployee.blnIsWorker, t)}</td>
            <td>${getPartialSaveLabel(dicEmployee.blnIsPartialSave, t)}</td>
            <td>${dicEmployee.strEmploymentStatus}</td>
          </tr>
        `
      )
      .join("");

    dicPrintWindow.document.write(`
      <html>
        <head>
          <title>Employee Master</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h2 { margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #dbe4ee; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>${t("page_title", dicConstant.employeeMaster.pageTitle)}</h2>
          <table>
            <thead>
              <tr>
                <th>${t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode)}</th>
                <th>${t("grid_full_name", dicConstant.employeeMaster.grid.fullName)}</th>
                <th>${t("grid_work_email", dicConstant.employeeMaster.grid.workEmail)}</th>
                <th>${t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber)}</th>
                <th>${t("grid_department", dicConstant.employeeMaster.grid.department)}</th>
                <th>${t("grid_designation", dicConstant.employeeMaster.grid.designation)}</th>
                <th>${t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate)}</th>
                <th>${t("field_worker", "Worker")}</th>
                <th>${t("grid_partial_save", "Partial Save")}</th>
                <th>${t("grid_status", dicConstant.employeeMaster.grid.status)}</th>
              </tr>
            </thead>
            <tbody>${strTableRows}</tbody>
          </table>
        </body>
      </html>
    `);
    dicPrintWindow.document.close();
    dicPrintWindow.focus();
    dicPrintWindow.print();
  }

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
        <Box className={styles.searchRow}>
          <TextField data-testid="employee.master-list.search.name.input" inputProps={{ "data-testid": "employee.master-list.search.name.input" }} value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={t("search_name_placeholder", dicConstant.employeeMaster.search.namePlaceholder)} fullWidth />
          <TextField data-testid="employee.master-list.search.code.input" inputProps={{ "data-testid": "employee.master-list.search.code.input" }} value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={t("search_code_placeholder", dicConstant.employeeMaster.search.codePlaceholder)} fullWidth />
            <TextField data-testid="employee.master-list.search.status.select" inputProps={{ "data-testid": "employee.master-list.search.status.select" }} select label={t("search_status_placeholder", dicConstant.employeeMaster.search.statusPlaceholder)} value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
              <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
            </TextField>
          <Box className={styles.searchActions}>
            <Button data-testid="employee.master-list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {t("search_button", dicConstant.common.search)}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button data-testid="employee.master-list.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
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
              <Button data-testid="employee.master-list.bulk-activate.button" className={styles.bulkActivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, true)}>{t("bulk_activate", "Bulk Activate")}</Button>
            ) : null}
            {blnCanChangeStatus ? (
              <Button data-testid="employee.master-list.bulk-deactivate.button" className={styles.bulkDeactivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, false)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            ) : null}
            {blnCanDelete ? (
              <Button data-testid="employee.master-list.bulk-delete.button" className={styles.bulkDelete} onClick={() => deleteEmployees(lstSelectedIDs)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            ) : null}
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 1.25,
            flexWrap: "wrap",
            pb: 1
          }}
        >
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanAdd ? (
              <Button data-testid="employee.master-list.add.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/employees/add")} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("emp_add_button", dicConstant.employeeMaster.addButton)}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button data-testid="employee.master-list.export-excel.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportExcel} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_excel", dicConstant.common.exportExcel)}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button data-testid="employee.master-list.export-pdf.button" className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={handleExportPdf} disabled={blnLoading || blnSubmitting || blnRightsLoading}>
                {t("export_pdf", dicConstant.common.exportPdf)}
              </Button>
            ) : null}
          </Box>

          {!blnLoading && lstFilteredEmployees.length > 0 ? (
            <Box className={styles.paginationBar} sx={{ p: 0, justifyContent: { xs: "flex-start", md: "flex-end" } }}>
              <Box className={styles.paginationInfo}>
                <Typography className={styles.paginationLabel}>{dicConstant.common.rowsPerPage}</Typography>
                <TextField data-testid="employee.master-list.rows-per-page.select" inputProps={{ "data-testid": "employee.master-list.rows-per-page.select" }} select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>
                  {lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}
                </TextField>
                <Typography className={styles.paginationRange}>
                  {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredEmployees.length)} {dicConstant.common.paginationSeparator} {lstFilteredEmployees.length}
                </Typography>
              </Box>
              <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
            </Box>
          ) : null}
        </Box>

        {blnRightsLoading || blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading", dicConstant.employeeMaster.loading)}</Typography>
          </Box>
        ) : !blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Employee access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>
              {t("access_denied_help", "Contact your administrator if you need employee visibility.")}
            </Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} inputProps={{ "data-testid": "employee.master-list.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} /></th>
                  <th>{t("grid_actions", dicConstant.employeeMaster.grid.actions)}</th>
                  <th>{t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode)}</th>
                  <th>{t("grid_full_name", dicConstant.employeeMaster.grid.fullName)}</th>
                  <th>{t("grid_work_email", dicConstant.employeeMaster.grid.workEmail)}</th>
                  <th>{t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber)}</th>
                  <th>{t("grid_department", dicConstant.employeeMaster.grid.department)}</th>
                  <th>{t("grid_designation", dicConstant.employeeMaster.grid.designation)}</th>
                  <th>{t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate)}</th>
                  <th>{t("field_worker", "Worker")}</th>
                  <th>{t("grid_partial_save", "Partial Save")}</th>
                  <th>{t("grid_status", dicConstant.employeeMaster.grid.status)}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredEmployees.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={12}>{t("empty_message", dicConstant.employeeMaster.emptyMessage)}</td></tr>
                ) : lstVisibleEmployees.map((dicEmployee) => {
                  const blnSelected = lstSelectedIDs.includes(dicEmployee.intID);
                  return (
                    <tr key={dicEmployee.intID} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicEmployee.intID)} inputProps={{ "data-testid": "employee.master-list.row.select.checkbox", "data-row-key": dicEmployee.intID } as InputHTMLAttributes<HTMLInputElement>} /></td>
                      <td>
                        <Box className={styles.actionCell}>
                          {blnCanView ? (
                            <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => objRouter.push(`/employees/view/${dicEmployee.intID}`)} data-testid="employee.master-list.row.view.button" data-row-key={dicEmployee.intID}><VisibilityRoundedIcon fontSize="small" /></button>
                          ) : null}
                          {blnCanEdit ? (
                            <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => objRouter.push(`/employees/edit/${dicEmployee.intID}`)} data-testid="employee.master-list.row.edit.button" data-row-key={dicEmployee.intID}><EditRoundedIcon fontSize="small" /></button>
                          ) : null}
                          {blnCanDelete ? (
                            <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteEmployees([dicEmployee.intID], true)} data-testid="employee.master-list.row.delete.button" data-row-key={dicEmployee.intID}><DeleteRoundedIcon fontSize="small" /></button>
                          ) : null}
                        </Box>
                      </td>
                      <td>{dicEmployee.strEmployeeCode}</td>
                      <td>{dicEmployee.strFullName}</td>
                      <td>{dicEmployee.strWorkEmail || "-"}</td>
                      <td>{dicEmployee.strMobileNumber || "-"}</td>
                      <td>{dicEmployee.strDepartmentName || "-"}</td>
                      <td>{dicEmployee.strDesignationName || "-"}</td>
                      <td>{formatDisplayDate(dicEmployee.dtDateOfJoining)}</td>
                      <td>{getWorkerTypeLabel(dicEmployee.blnIsWorker, t)}</td>
                      <td><span className={`${styles.statusPill} ${styles.statusNeutral}`}>{getPartialSaveLabel(dicEmployee.blnIsPartialSave, t)}</span></td>
                      <td><span className={`${styles.statusPill} ${dicEmployee.strEmploymentStatus === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicEmployee.strEmploymentStatus === "Active" ? dicConstant.common.statusActive : dicConstant.common.statusInactive}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
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
      <Dialog open={Boolean(objConfirmDialog)} onClose={closeConfirmDialog} onKeyDown={handleSingleDialogActionEnter} PaperProps={{ className: styles.confirmDialogPaper, "data-testid": "employee.master-list.confirm.dialog" }}>
        <DialogTitle className={styles.confirmDialogTitle}>{objConfirmDialog?.strTitle}</DialogTitle>
        <DialogContent className={styles.confirmDialogContent}>
          <Typography className={styles.confirmDialogMessage}>{objConfirmDialog?.strMessage}</Typography>
        </DialogContent>
        <DialogActions className={styles.confirmDialogActions}>
          <Button data-testid="employee.master-list.confirm.cancel.button" className={styles.textAction} onClick={closeConfirmDialog}>
            {dicConstant.common.cancel}
          </Button>
          <Button data-testid="employee.master-list.confirm.confirm.button" className={styles.primaryButton} onClick={executeConfirmedAction} disabled={blnSubmitting}>
            {objConfirmDialog?.strConfirmLabel ?? t("confirm_button", "Confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnSubmitting} strLabel={blnLoading || blnRightsLoading ? "Loading..." : "Processing..."} intZIndex={1400} />
    </Box>
  );
}
