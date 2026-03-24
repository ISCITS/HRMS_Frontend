"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Box, Button, Checkbox, CircularProgress, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import AlertDialog from "@/components/common/AlertDialog";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { useEmployeeLabels } from "@/features/employee/hooks/useEmployeeLabels";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord, EmployeeStatus } from "@/features/employee/types";

type SearchForm = {
  name: string;
  code: string;
  status: "All" | EmployeeStatus;
};

const dicEmptySearch: SearchForm = { name: "", code: "", status: "All" };
const lstRowsPerPageOptions = [5, 10, 20];

function formatDisplayDate(strDate: string | null): string {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(strDate));
}

export default function EmployeeMasterListPanel() {
  const objRouter = useRouter();
  const { strLabelError, t } = useEmployeeLabels();
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
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

  async function loadModuleData() {
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
    loadModuleData().catch(() => undefined);
  }, []);

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
    const blnConfirmed = window.confirm(blnIsSingle ? t("confirm_delete_single", dicConstant.employeeMaster.confirmDeleteSingle) : t("confirm_deactivate", dicConstant.employeeMaster.confirmDeactivate));
    if (!blnConfirmed) {
      return;
    }
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

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{t("page_title", dicConstant.employeeMaster.pageTitle)}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/employees/add")} disabled={blnLoading || blnSubmitting}>
              {t("add_button", dicConstant.employeeMaster.addButton)}
            </Button>
          </Box>
        </Box>
        {strLabelError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strLabelError}</Typography>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={t("search_name_placeholder", dicConstant.employeeMaster.search.namePlaceholder)} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={t("search_code_placeholder", dicConstant.employeeMaster.search.codePlaceholder)} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{t("search_status_placeholder", dicConstant.employeeMaster.search.statusPlaceholder)}</MenuItem>
            <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {t("search_button", dicConstant.common.search)}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {t("clear_button", dicConstant.common.clear)}
            </Button>
          </Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>{t("bulk_applying_changes", "Applying changes...")}</Typography>
          </Box>
        ) : lstSelectedIDs.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIDs.length} {t("bulk_rows_selected", "row(s) selected")}</Typography>
            <Button className={styles.bulkActivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, true)}>{t("bulk_activate", "Bulk Activate")}</Button>
            <Button className={styles.bulkDeactivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, false)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
            <Button className={styles.bulkDelete} onClick={() => deleteEmployees(lstSelectedIDs)}>{t("bulk_deactivate", "Bulk Deactivate")}</Button>
          </Box>
        ) : null}
      </Box>

      <Box className={styles.tableCard}>
        {!blnLoading && lstFilteredEmployees.length > 0 ? (
          <Box className={styles.paginationBar}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicConstant.common.rowsPerPage}</Typography>
              <TextField select size="small" value={String(intRowsPerPage)} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect}>
                {lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>)}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstFilteredEmployees.length)} {dicConstant.common.paginationSeparator} {lstFilteredEmployees.length}
              </Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intNextPage) => setIntPage(intNextPage)} size="small" color="primary" showFirstButton showLastButton />
          </Box>
        ) : null}

        {blnLoading ? (
          <Box className={styles.emptyState}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>{t("loading", dicConstant.employeeMaster.loading)}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{t("grid_employee_code", dicConstant.employeeMaster.grid.employeeCode)}</th>
                  <th>{t("grid_full_name", dicConstant.employeeMaster.grid.fullName)}</th>
                  <th>{t("grid_work_email", dicConstant.employeeMaster.grid.workEmail)}</th>
                  <th>{t("grid_mobile_number", dicConstant.employeeMaster.grid.mobileNumber)}</th>
                  <th>{t("grid_department", dicConstant.employeeMaster.grid.department)}</th>
                  <th>{t("grid_designation", dicConstant.employeeMaster.grid.designation)}</th>
                  <th>{t("grid_joining_date", dicConstant.employeeMaster.grid.joiningDate)}</th>
                  <th>{t("grid_status", dicConstant.employeeMaster.grid.status)}</th>
                  <th>{t("grid_actions", dicConstant.employeeMaster.grid.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredEmployees.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={10}>{t("empty_message", dicConstant.employeeMaster.emptyMessage)}</td></tr>
                ) : lstVisibleEmployees.map((dicEmployee) => {
                  const blnSelected = lstSelectedIDs.includes(dicEmployee.intID);
                  return (
                    <tr key={dicEmployee.intID} className={blnSelected ? styles.selectedRow : undefined}>
                      <td><Checkbox checked={blnSelected} onChange={() => toggleSelection(dicEmployee.intID)} /></td>
                      <td>{dicEmployee.strEmployeeCode}</td>
                      <td>{dicEmployee.strFullName}</td>
                      <td>{dicEmployee.strWorkEmail || "-"}</td>
                      <td>{dicEmployee.strMobileNumber || "-"}</td>
                      <td>{dicEmployee.strDepartmentName || "-"}</td>
                      <td>{dicEmployee.strDesignationName || "-"}</td>
                      <td>{formatDisplayDate(dicEmployee.dtDateOfJoining)}</td>
                      <td><span className={`${styles.statusPill} ${dicEmployee.strEmploymentStatus === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicEmployee.strEmploymentStatus}</span></td>
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => objRouter.push(`/employees/view/${dicEmployee.intID}`)}><VisibilityOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => objRouter.push(`/employees/edit/${dicEmployee.intID}`)}><EditOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteEmployees([dicEmployee.intID], true)}><DeleteOutlineRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => updateEmployeeStatus([dicEmployee.intID], dicEmployee.strEmploymentStatus !== "Active")}><ToggleOnRoundedIcon fontSize="small" /></button>
                        </Box>
                      </td>
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
      />
      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? "Loading..." : "Processing..."} intZIndex={1400} />
    </Box>
  );
}
