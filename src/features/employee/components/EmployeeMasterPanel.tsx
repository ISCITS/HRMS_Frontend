"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Pagination,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
import dicConstant from "@/constants/Constant.json";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeDetailRecord, EmployeeFormOptions, EmployeeFormValues, EmployeeListRecord, EmployeeStatus } from "@/features/employee/types";

type EmployeeMode = "add" | "edit" | "view";
type SearchForm = {
  name: string;
  code: string;
  status: "All" | EmployeeStatus;
};

const dicEmptySearch: SearchForm = { name: "", code: "", status: "All" };
const lstRowsPerPageOptions = [10, 20, 50];

const dicEmptyForm: EmployeeFormValues = {
  strEmployeeCode: "",
  strTitle: "",
  strFirstName: "",
  strMiddleName: "",
  strLastName: "",
  dtDateOfBirth: "",
  dtDateOfJoining: "",
  intEmploymentTypeID: "",
  intDepartmentID: "",
  intDesignationID: "",
  intGradeID: "",
  intCostCenterID: "",
  intLocationID: "",
  intPayrollGroupID: "",
  intManagerEmployeeID: "",
  strWorkEmail: "",
  strPersonalEmail: "",
  strMobileNumber: "",
  strGender: "",
  intPreferredLanguageID: "",
  strEmploymentStatus: "Active",
  dtDateOfExit: "",
  blnIsEssEnabled: true
};

function toFormValues(dicRecord: EmployeeDetailRecord): EmployeeFormValues {
  return {
    strEmployeeCode: dicRecord.strEmployeeCode ?? "",
    strTitle: dicRecord.strTitle ?? "",
    strFirstName: dicRecord.strFirstName ?? "",
    strMiddleName: dicRecord.strMiddleName ?? "",
    strLastName: dicRecord.strLastName ?? "",
    dtDateOfBirth: dicRecord.dtDateOfBirth ?? "",
    dtDateOfJoining: dicRecord.dtDateOfJoining ?? "",
    intEmploymentTypeID: dicRecord.intEmploymentTypeID ?? "",
    intDepartmentID: dicRecord.intDepartmentID ?? "",
    intDesignationID: dicRecord.intDesignationID ?? "",
    intGradeID: dicRecord.intGradeID ?? "",
    intCostCenterID: dicRecord.intCostCenterID ?? "",
    intLocationID: dicRecord.intLocationID ?? "",
    intPayrollGroupID: dicRecord.intPayrollGroupID ?? "",
    intManagerEmployeeID: dicRecord.intManagerEmployeeID ?? "",
    strWorkEmail: dicRecord.strWorkEmail ?? "",
    strPersonalEmail: dicRecord.strPersonalEmail ?? "",
    strMobileNumber: dicRecord.strMobileNumber ?? "",
    strGender: dicRecord.strGender ?? "",
    intPreferredLanguageID: dicRecord.intPreferredLanguageID ?? "",
    strEmploymentStatus: dicRecord.strEmploymentStatus,
    dtDateOfExit: dicRecord.dtDateOfExit ?? "",
    blnIsEssEnabled: dicRecord.blnIsEssEnabled
  };
}

function formatDisplayDate(strDate: string | null): string {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(strDate));
}

function isEmailValid(strValue: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue);
}

export default function EmployeeMasterPanel() {
  const objRouter = useRouter();
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [objFormOptions, setObjFormOptions] = useState<EmployeeFormOptions | null>(null);
  const [strMode, setStrMode] = useState<EmployeeMode>("add");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [intEditingEmployeeID, setIntEditingEmployeeID] = useState<number | null>(null);
  const [dicForm, setDicForm] = useState<EmployeeFormValues>(dicEmptyForm);
  const [dicErrors, setDicErrors] = useState<Partial<Record<keyof EmployeeFormValues, string>>>({});
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [lstSelectedIDs, setLstSelectedIDs] = useState<number[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSubmitting, setBlnSubmitting] = useState(false);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [strFeedback, setStrFeedback] = useState("");
  const [strError, setStrError] = useState("");

  async function loadModuleData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const [lstEmployeeData, dicOptionData] = await Promise.all([
        employeeService.getEmployees(),
        employeeService.getFormOptions()
      ]);
      setLstEmployees(lstEmployeeData);
      setObjFormOptions(dicOptionData);
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
  const blnSomeVisibleSelected = !blnAllVisibleSelected && lstSelectedIDs.some((intID) => lstVisibleEmployees.some((dicEmployee) => dicEmployee.intID == intID));

  const lstManagerOptions = useMemo(() => (objFormOptions?.lstManagers ?? []).filter((dicOption) => dicOption.intID !== intEditingEmployeeID), [intEditingEmployeeID, objFormOptions]);

  function resetDialog() {
    setIntEditingEmployeeID(null);
    setDicForm(dicEmptyForm);
    setDicErrors({});
    setStrError("");
  }

  async function openDialog(strNextMode: EmployeeMode, intEmployeeID?: number) {
    setStrMode(strNextMode);
    setDicErrors({});
    setStrError("");
    if (!intEmployeeID) {
      setIntEditingEmployeeID(null);
      setDicForm(dicEmptyForm);
      setBlnDialogOpen(true);
      return;
    }

    setBlnSubmitting(true);
    try {
      const dicEmployee = await employeeService.getEmployeeById(intEmployeeID);
      setIntEditingEmployeeID(intEmployeeID);
      setDicForm(toFormValues(dicEmployee));
      setBlnDialogOpen(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load employee details.");
    } finally {
      setBlnSubmitting(false);
    }
  }

  function closeDialog() {
    setBlnDialogOpen(false);
    resetDialog();
  }

  function updateField<TKey extends keyof EmployeeFormValues>(strField: TKey, objValue: EmployeeFormValues[TKey]) {
    setDicErrors((dicPrevious) => ({ ...dicPrevious, [strField]: undefined }));
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function validateForm(): boolean {
    const dicNextErrors: Partial<Record<keyof EmployeeFormValues, string>> = {};
    const strEmployeeCode = dicForm.strEmployeeCode.trim().toUpperCase();
    const strWorkEmail = dicForm.strWorkEmail.trim();
    const strPersonalEmail = dicForm.strPersonalEmail.trim();
    const dtBirthDate = dicForm.dtDateOfBirth ? new Date(dicForm.dtDateOfBirth) : null;
    const dtJoiningDate = dicForm.dtDateOfJoining ? new Date(dicForm.dtDateOfJoining) : null;
    const dtExitDate = dicForm.dtDateOfExit ? new Date(dicForm.dtDateOfExit) : null;

    if (!strEmployeeCode) {
      dicNextErrors.strEmployeeCode = dicConstant.employeeMaster.validation.employeeCodeRequired;
    } else if (!/^[A-Z0-9/_-]{2,50}$/.test(strEmployeeCode)) {
      dicNextErrors.strEmployeeCode = dicConstant.employeeMaster.validation.employeeCodeFormat;
    } else if (lstEmployees.some((dicEmployee) => dicEmployee.strEmployeeCode.toUpperCase() === strEmployeeCode && dicEmployee.intID !== intEditingEmployeeID)) {
      dicNextErrors.strEmployeeCode = dicConstant.employeeMaster.validation.employeeCodeDuplicate;
    }

    if (!dicForm.strFirstName.trim()) {
      dicNextErrors.strFirstName = dicConstant.employeeMaster.validation.firstNameRequired;
    }

    if (!dicForm.dtDateOfJoining) {
      dicNextErrors.dtDateOfJoining = dicConstant.employeeMaster.validation.joiningDateRequired;
    }

    if (dicForm.intEmploymentTypeID === "") {
      dicNextErrors.intEmploymentTypeID = dicConstant.employeeMaster.validation.employmentTypeRequired;
    }

    if (dicForm.intLocationID === "") {
      dicNextErrors.intLocationID = dicConstant.employeeMaster.validation.locationRequired;
    }

    if (strWorkEmail && !isEmailValid(strWorkEmail)) {
      dicNextErrors.strWorkEmail = dicConstant.employeeMaster.validation.workEmailInvalid;
    }

    if (strPersonalEmail && !isEmailValid(strPersonalEmail)) {
      dicNextErrors.strPersonalEmail = dicConstant.employeeMaster.validation.personalEmailInvalid;
    }

    if (dicForm.strMobileNumber && !/^[0-9+\- ]+$/.test(dicForm.strMobileNumber)) {
      dicNextErrors.strMobileNumber = dicConstant.employeeMaster.validation.mobileNumberInvalid;
    }

    if (dtBirthDate && dtJoiningDate && dtBirthDate >= dtJoiningDate) {
      dicNextErrors.dtDateOfBirth = dicConstant.employeeMaster.validation.birthDateInvalid;
    }

    if (dtExitDate && dtJoiningDate && dtExitDate < dtJoiningDate) {
      dicNextErrors.dtDateOfExit = dicConstant.employeeMaster.validation.exitDateInvalid;
    }

    setDicErrors(dicNextErrors);
    return Object.keys(dicNextErrors).length === 0;
  }

  async function saveEmployee() {
    if (!validateForm()) {
      return;
    }

    setBlnSubmitting(true);
    setStrError("");
    try {
      if (strMode === "add") {
        await employeeService.createEmployee(dicForm);
        setStrFeedback(dicConstant.employeeMaster.saveSuccess);
      } else if (intEditingEmployeeID) {
        await employeeService.updateEmployee(intEditingEmployeeID, dicForm);
        setStrFeedback(dicConstant.employeeMaster.updateSuccess);
      }
      closeDialog();
      await loadModuleData();
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save employee.");
    } finally {
      setBlnSubmitting(false);
    }
  }

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

  function renderOptionField(strLabel: string, strField: keyof EmployeeFormValues, lstOptions: Array<{ intID: number; strLabel: string; strCode?: string }>, blnDisabled = false) {
    return (
      <TextField
        select
        label={strLabel}
        value={dicForm[strField]}
        disabled={blnDisabled || strMode === "view"}
        onChange={(objEvent) => updateField(strField, (objEvent.target.value ? Number(objEvent.target.value) : "") as EmployeeFormValues[typeof strField])}
        error={Boolean(dicErrors[strField])}
        helperText={dicErrors[strField]}
        fullWidth
      >
        <MenuItem value="">Select</MenuItem>
        {lstOptions.map((dicOption) => (
          <MenuItem key={dicOption.intID} value={dicOption.intID}>
            {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.topBar}>
        <Button className={styles.backButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.back()}>{dicConstant.employeeMaster.backButton}</Button>
      </Box>

      <Box className={styles.controlsCard}>
        {strFeedback ? <Alert severity="success" onClose={() => setStrFeedback("")} sx={{ mt: 1.5 }}>{strFeedback}</Alert> : null}
        {strError && !blnDialogOpen ? <Alert severity="error" onClose={() => setStrError("")} sx={{ mt: 1.5 }}>{strError}</Alert> : null}

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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => openDialog("add")} disabled={blnLoading || blnSubmitting || !objFormOptions}>
              {dicConstant.employeeMaster.addButton}
            </Button>
          </Box>
        </Box>
        {!blnLoading && lstFilteredEmployees.length > 0 ? (
          <Box className={styles.paginationBar}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{dicConstant.common.rowsPerPage}</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>{intOption}</MenuItem>
                ))}
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
                  <th>{dicConstant.employeeMaster.grid.actions}</th>
                  <th>{dicConstant.employeeMaster.grid.employeeCode}</th>
                  <th>{dicConstant.employeeMaster.grid.fullName}</th>
                  <th>{dicConstant.employeeMaster.grid.workEmail}</th>
                  <th>{dicConstant.employeeMaster.grid.mobileNumber}</th>
                  <th>{dicConstant.employeeMaster.grid.department}</th>
                  <th>{dicConstant.employeeMaster.grid.designation}</th>
                  <th>{dicConstant.employeeMaster.grid.joiningDate}</th>
                  <th>{dicConstant.employeeMaster.grid.status}</th>
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
                      <td>
                        <Box className={styles.actionCell}>
                          <button className={`${styles.iconButton} ${styles.viewIcon}`} type="button" onClick={() => openDialog("view", dicEmployee.intID)}><VisibilityRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.editIcon}`} type="button" onClick={() => openDialog("edit", dicEmployee.intID)}><EditRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.deleteIcon}`} type="button" onClick={() => deleteEmployees([dicEmployee.intID], true)}><DeleteRoundedIcon fontSize="small" /></button>
                          <button className={`${styles.iconButton} ${styles.toggleIcon}`} type="button" onClick={() => updateEmployeeStatus([dicEmployee.intID], dicEmployee.strEmploymentStatus !== "Active")}><ToggleOnRoundedIcon fontSize="small" /></button>
                        </Box>
                      </td>
                      <td>{dicEmployee.strEmployeeCode}</td>
                      <td>{dicEmployee.strFullName}</td>
                      <td>{dicEmployee.strWorkEmail || "-"}</td>
                      <td>{dicEmployee.strMobileNumber || "-"}</td>
                      <td>{dicEmployee.strDepartmentName || "-"}</td>
                      <td>{dicEmployee.strDesignationName || "-"}</td>
                      <td>{formatDisplayDate(dicEmployee.dtDateOfJoining)}</td>
                      <td><span className={`${styles.statusPill} ${dicEmployee.strEmploymentStatus === "Active" ? styles.statusActive : styles.statusInactive}`}>{dicEmployee.strEmploymentStatus}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Box>

      <Dialog open={blnDialogOpen} onClose={closeDialog} PaperProps={{ className: styles.dialogPaper }}>
        <DialogTitle className={styles.dialogTitle}>
          {strMode === "add" ? dicConstant.employeeMaster.dialogAddTitle : strMode === "edit" ? dicConstant.employeeMaster.dialogEditTitle : dicConstant.employeeMaster.dialogViewTitle}
        </DialogTitle>
        <DialogContent className={styles.dialogContent}>
          {strError ? <Alert severity="error" sx={{ mb: 2 }}>{strError}</Alert> : null}
          <Typography className={styles.sectionBar}>Identity & Employment</Typography>
          <Box className={styles.dialogGrid}>
            <TextField label={`${dicConstant.employeeMaster.fields.employeeCode} *`} value={dicForm.strEmployeeCode} disabled={strMode === "view"} onChange={(objEvent) => updateField("strEmployeeCode", objEvent.target.value.toUpperCase())} error={Boolean(dicErrors.strEmployeeCode)} helperText={dicErrors.strEmployeeCode} fullWidth />
            <TextField select label={dicConstant.employeeMaster.fields.title} value={dicForm.strTitle} disabled={strMode === "view"} onChange={(objEvent) => updateField("strTitle", objEvent.target.value)} fullWidth>
              <MenuItem value="">Select</MenuItem>
              {(objFormOptions?.lstTitles ?? []).map((strTitle) => <MenuItem key={strTitle} value={strTitle}>{strTitle}</MenuItem>)}
            </TextField>
            <TextField label={`${dicConstant.employeeMaster.fields.firstName} *`} value={dicForm.strFirstName} disabled={strMode === "view"} onChange={(objEvent) => updateField("strFirstName", objEvent.target.value)} error={Boolean(dicErrors.strFirstName)} helperText={dicErrors.strFirstName} fullWidth />
            <TextField label={dicConstant.employeeMaster.fields.middleName} value={dicForm.strMiddleName} disabled={strMode === "view"} onChange={(objEvent) => updateField("strMiddleName", objEvent.target.value)} fullWidth />
            <TextField label={dicConstant.employeeMaster.fields.lastName} value={dicForm.strLastName} disabled={strMode === "view"} onChange={(objEvent) => updateField("strLastName", objEvent.target.value)} fullWidth />
            <TextField type="date" label={dicConstant.employeeMaster.fields.dateOfBirth} value={dicForm.dtDateOfBirth} disabled={strMode === "view"} onChange={(objEvent) => updateField("dtDateOfBirth", objEvent.target.value)} error={Boolean(dicErrors.dtDateOfBirth)} helperText={dicErrors.dtDateOfBirth} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField type="date" label={`${dicConstant.employeeMaster.fields.dateOfJoining} *`} value={dicForm.dtDateOfJoining} disabled={strMode === "view"} onChange={(objEvent) => updateField("dtDateOfJoining", objEvent.target.value)} error={Boolean(dicErrors.dtDateOfJoining)} helperText={dicErrors.dtDateOfJoining} InputLabelProps={{ shrink: true }} fullWidth />
            {renderOptionField(`${dicConstant.employeeMaster.fields.employmentType} *`, "intEmploymentTypeID", objFormOptions?.lstEmploymentTypes ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.department, "intDepartmentID", objFormOptions?.lstDepartments ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.designation, "intDesignationID", objFormOptions?.lstDesignations ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.grade, "intGradeID", objFormOptions?.lstGrades ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.costCenter, "intCostCenterID", objFormOptions?.lstCostCenters ?? [])}
            {renderOptionField(`${dicConstant.employeeMaster.fields.location} *`, "intLocationID", objFormOptions?.lstLocations ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.payrollGroup, "intPayrollGroupID", objFormOptions?.lstPayrollGroups ?? [])}
            {renderOptionField(dicConstant.employeeMaster.fields.manager, "intManagerEmployeeID", lstManagerOptions)}
          </Box>

          <Typography className={styles.sectionBar}>Contact & Preferences</Typography>
          <Box className={styles.dialogGrid}>
            <TextField label={dicConstant.employeeMaster.fields.workEmail} value={dicForm.strWorkEmail} disabled={strMode === "view"} onChange={(objEvent) => updateField("strWorkEmail", objEvent.target.value)} error={Boolean(dicErrors.strWorkEmail)} helperText={dicErrors.strWorkEmail} fullWidth />
            <TextField label={dicConstant.employeeMaster.fields.personalEmail} value={dicForm.strPersonalEmail} disabled={strMode === "view"} onChange={(objEvent) => updateField("strPersonalEmail", objEvent.target.value)} error={Boolean(dicErrors.strPersonalEmail)} helperText={dicErrors.strPersonalEmail} fullWidth />
            <TextField label={dicConstant.employeeMaster.fields.mobileNumber} value={dicForm.strMobileNumber} disabled={strMode === "view"} onChange={(objEvent) => updateField("strMobileNumber", objEvent.target.value)} error={Boolean(dicErrors.strMobileNumber)} helperText={dicErrors.strMobileNumber} fullWidth />
            <TextField select label={dicConstant.employeeMaster.fields.gender} value={dicForm.strGender} disabled={strMode === "view"} onChange={(objEvent) => updateField("strGender", objEvent.target.value)} fullWidth>
              <MenuItem value="">Select</MenuItem>
              {(objFormOptions?.lstGenders ?? []).map((strGender) => <MenuItem key={strGender} value={strGender}>{strGender}</MenuItem>)}
            </TextField>
            {renderOptionField(dicConstant.employeeMaster.fields.preferredLanguage, "intPreferredLanguageID", objFormOptions?.lstLanguages ?? [])}
            <TextField select label={dicConstant.employeeMaster.fields.employmentStatus} value={dicForm.strEmploymentStatus} disabled={strMode === "view"} onChange={(objEvent) => updateField("strEmploymentStatus", objEvent.target.value as EmployeeStatus)} fullWidth>
              {(objFormOptions?.lstEmploymentStatuses ?? []).map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus}</MenuItem>)}
            </TextField>
            <TextField type="date" label={dicConstant.employeeMaster.fields.dateOfExit} value={dicForm.dtDateOfExit} disabled={strMode === "view" || dicForm.strEmploymentStatus === "Active"} onChange={(objEvent) => updateField("dtDateOfExit", objEvent.target.value)} error={Boolean(dicErrors.dtDateOfExit)} helperText={dicErrors.dtDateOfExit} InputLabelProps={{ shrink: true }} fullWidth />
          </Box>

          <Typography className={styles.sectionBar}>Access</Typography>
          <Box className={styles.switchRow}>
            <Switch checked={dicForm.blnIsEssEnabled} disabled={strMode === "view"} onChange={(_, blnChecked) => updateField("blnIsEssEnabled", blnChecked)} />
            <Typography className={styles.switchLabel}>{dicConstant.employeeMaster.fields.essEnabled}</Typography>
          </Box>
        </DialogContent>
        <Box className={styles.dialogFooter}>
          {strMode === "view" ? (
            <Button className={styles.textAction} onClick={closeDialog}>{dicConstant.common.close}</Button>
          ) : (
            <>
              <Button className={styles.textAction} onClick={() => setDicForm(dicEmptyForm)}>{dicConstant.common.reset}</Button>
              <Button className={styles.textAction} onClick={closeDialog}>{dicConstant.common.cancel}</Button>
              <Button className={styles.primaryButton} onClick={saveEmployee} disabled={blnSubmitting}>
                {blnSubmitting ? "Saving..." : dicConstant.common.save}
              </Button>
            </>
          )}
        </Box>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnSubmitting} strLabel={blnLoading ? "Loading..." : "Processing..."} intZIndex={1400} />
    </Box>
  );
}
