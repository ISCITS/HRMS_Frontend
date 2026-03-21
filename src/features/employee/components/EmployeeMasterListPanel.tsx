"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Alert, Box, Button, Checkbox, CircularProgress, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import dicConstant from "@/constants/Constant.json";
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
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(5);
  const [strFeedback, setStrFeedback] = useState("");
  const [strError, setStrError] = useState("");

  async function loadModuleData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const lstEmployeeData = await employeeService.getEmployees();
      setLstEmployees(lstEmployeeData);
      setLstSelectedIDs([]);
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load employee data.");
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
    setStrError("");
    try {
      await employeeService.bulkUpdateStatus(lstIDs, blnIsActive);
      setStrFeedback(dicConstant.employeeMaster.statusSuccess);
      await loadModuleData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update employee status.");
    } finally {
      setBlnSubmitting(false);
    }
  }

  async function deleteEmployees(lstIDs: number[], blnIsSingle = false) {
    if (!lstIDs.length) {
      return;
    }
    const blnConfirmed = window.confirm(blnIsSingle ? dicConstant.employeeMaster.confirmDeleteSingle : dicConstant.employeeMaster.confirmDeactivate);
    if (!blnConfirmed) {
      return;
    }
    setBlnSubmitting(true);
    setStrError("");
    try {
      await employeeService.bulkDelete(lstIDs);
      setStrFeedback(dicConstant.employeeMaster.deleteSuccess);
      await loadModuleData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to deactivate employee.");
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
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.employeeMaster.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Typography component="h1" className={styles.title}>{dicConstant.employeeMaster.pageTitle}</Typography>
          <Box className={styles.headerActions}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => objRouter.push("/masters/employee/add")} disabled={blnLoading || blnSubmitting}>
              {dicConstant.employeeMaster.addButton}
            </Button>
          </Box>
        </Box>

        {strFeedback ? <Alert severity="success" onClose={() => setStrFeedback("")} sx={{ mt: 1.5 }}>{strFeedback}</Alert> : null}
        {strError ? <Alert severity="error" onClose={() => setStrError("")} sx={{ mt: 1.5 }}>{strError}</Alert> : null}

        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.name} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, name: objEvent.target.value }))} placeholder={dicConstant.employeeMaster.search.namePlaceholder} fullWidth />
          <TextField value={dicSearchDraft.code} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, code: objEvent.target.value.toUpperCase() }))} placeholder={dicConstant.employeeMaster.search.codePlaceholder} fullWidth />
          <TextField select value={dicSearchDraft.status} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, status: objEvent.target.value as SearchForm["status"] }))} fullWidth>
            <MenuItem value="All">{dicConstant.employeeMaster.search.statusPlaceholder}</MenuItem>
            <MenuItem value="Active">{dicConstant.common.statusActive}</MenuItem>
            <MenuItem value="Inactive">{dicConstant.common.statusInactive}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {dicConstant.common.search}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); setIntPage(1); }} disabled={blnLoading || blnSubmitting}>
              {dicConstant.common.clear}
            </Button>
          </Box>
        </Box>

        {blnSubmitting ? (
          <Box className={styles.bulkBar}>
            <CircularProgress size={20} />
            <Typography className={styles.bulkCount}>Applying changes...</Typography>
          </Box>
        ) : lstSelectedIDs.length > 0 ? (
          <Box className={styles.bulkBar}>
            <Typography className={styles.bulkCount}>{lstSelectedIDs.length} row(s) selected</Typography>
            <Button className={styles.bulkActivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, true)}>Bulk Activate</Button>
            <Button className={styles.bulkDeactivate} onClick={() => updateEmployeeStatus(lstSelectedIDs, false)}>Bulk Deactivate</Button>
            <Button className={styles.bulkDelete} onClick={() => deleteEmployees(lstSelectedIDs)}>Bulk Deactivate</Button>
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
            <Typography sx={{ mt: 1 }}>{dicConstant.employeeMaster.loading}</Typography>
          </Box>
        ) : (
          <Box className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th><Checkbox checked={blnAllVisibleSelected} indeterminate={blnSomeVisibleSelected} onChange={toggleSelectAll} /></th>
                  <th>{dicConstant.employeeMaster.grid.employeeCode}</th>
                  <th>{dicConstant.employeeMaster.grid.fullName}</th>
                  <th>{dicConstant.employeeMaster.grid.workEmail}</th>
                  <th>{dicConstant.employeeMaster.grid.mobileNumber}</th>
                  <th>{dicConstant.employeeMaster.grid.department}</th>
                  <th>{dicConstant.employeeMaster.grid.designation}</th>
                  <th>{dicConstant.employeeMaster.grid.joiningDate}</th>
                  <th>{dicConstant.employeeMaster.grid.status}</th>
                  <th>{dicConstant.employeeMaster.grid.actions}</th>
                </tr>
              </thead>
              <tbody>
                {lstFilteredEmployees.length === 0 ? (
                  <tr><td className={styles.emptyState} colSpan={10}>{dicConstant.employeeMaster.emptyMessage}</td></tr>
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
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => objRouter.push(`/masters/employee/edit/${dicEmployee.intID}`)}><VisibilityOutlinedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => objRouter.push(`/masters/employee/edit/${dicEmployee.intID}`)}><EditOutlinedIcon fontSize="small" /></button>
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
    </Box>
  );
}
