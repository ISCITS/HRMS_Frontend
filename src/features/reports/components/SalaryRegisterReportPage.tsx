"use client";

import PayrollDataChangedNotice from "@/features/payroll/components/PayrollDataChangedNotice";
import { usePayrollDataFreshness } from "@/features/payroll/hooks/usePayrollDataFreshness";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Box, Button, Checkbox, Divider, FormControlLabel, IconButton, ListItemText, ListSubheader, MenuItem, Popover, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useEffect, useMemo, useState, type ChangeEventHandler, type ReactNode } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import CommonTable from "@/Common/components/CommonTable";
import PageNotices from "@/Common/components/PageNotices";
import { employeeService } from "@/features/employee/services/employeeService";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { salaryRegisterReportService, type SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import ArrearRegisterReport from "@/features/reports/components/ArrearRegisterReport";
import { buildSalaryRegisterArrearLayout, type SalaryRegisterArrearLayout } from "@/features/reports/utils/salaryRegisterArrearLayout";
import { buildSalaryRegisterWorkbook, formatDateOfJoining } from "@/features/reports/utils/salaryRegisterExcel";

const ARREAR_REGISTER_RIGHT = "report_arrear_register";
// Per-user browser preference for the "Arrear columns separately" toggle.
const SHOW_ARREAR_COLUMNS_STORAGE_KEY = "hrms.salaryRegister.showArrearColumns";

function readShowArrearColumnsPreference() {
  try {
    return window.localStorage.getItem(SHOW_ARREAR_COLUMNS_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeShowArrearColumnsPreference(blnValue: boolean) {
  try {
    window.localStorage.setItem(SHOW_ARREAR_COLUMNS_STORAGE_KEY, String(blnValue));
  } catch {
    // Storage unavailable: the toggle still works for this visit.
  }
}

type SelectOption = { strValue: string; strLabel: string };

type SearchForm = {
  strPeriod: string;
  strEmployeeIDs: string;
  strDepartmentIDs: string;
  strDesignationIDs: string;
  strLocationIDs: string;
  strAllocationEntityIDs: string;
  strEmploymentStatus: string;
};

const lstEmploymentStatusOptions = ["Active", "Inactive", "All"];
type MoreFiltersForm = Pick<SearchForm, "strDesignationIDs" | "strLocationIDs">;

function getCurrentPeriod() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}`;
}

function getDefaultSearch(): SearchForm {
  return {
    strPeriod: getCurrentPeriod(),
    strEmployeeIDs: "",
    strDepartmentIDs: "",
    strDesignationIDs: "",
    strLocationIDs: "",
    strAllocationEntityIDs: "",
    strEmploymentStatus: "Active",
  };
}

function formatBodyAmount(decValue: number | null | undefined) {
  if (decValue === null) return "-"; // explicitly unknown (e.g. Payable Days with no attendance source)
  const decNumber = Number(decValue ?? 0); // undefined = component not present for this row
  if (!decNumber) return "";
  return Number.isInteger(decNumber) ? String(decNumber) : decNumber.toFixed(2);
}

async function downloadSalaryRegisterExcel(
  strFileName: string,
  lstRows: SalaryRegisterRow[],
  objLayout: SalaryRegisterArrearLayout,
  strCompanyName: string,
  strMonthLabel: string
) {
  const objWorkbook = await buildSalaryRegisterWorkbook(lstRows, objLayout, strCompanyName, strMonthLabel);
  const objBuffer = await objWorkbook.xlsx.writeBuffer();
  const objBlob = new Blob([objBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

const SELECT_ALL_SENTINEL = "__ALL__";

// A checkbox dropdown (search box + Select All + checkbox list) whose CLOSED field stays a
// fixed single line showing a comma-joined summary, unlike a Chip-based Autocomplete which grows
// taller as more items are selected.
function CheckboxMultiSelectFilter(objProps: {
  strLabel: string;
  strValue: string;
  lstOptions: SelectOption[];
  fnOnChange: (strValue: string) => void;
  blnDisabled?: boolean;
}) {
  const [strSearch, setStrSearch] = useState("");
  const lstSelectedValues = useMemo(() => (objProps.strValue ? objProps.strValue.split(",").filter(Boolean) : []), [objProps.strValue]);
  const mapLabelByValue = useMemo(() => new Map(objProps.lstOptions.map((objOption) => [objOption.strValue, objOption.strLabel])), [objProps.lstOptions]);
  const lstFilteredOptions = useMemo(() => {
    const strNeedle = strSearch.trim().toLowerCase();
    if (!strNeedle) return objProps.lstOptions;
    return objProps.lstOptions.filter((objOption) => objOption.strLabel.toLowerCase().includes(strNeedle));
  }, [objProps.lstOptions, strSearch]);
  const blnAllFilteredSelected = lstFilteredOptions.length > 0 && lstFilteredOptions.every((objOption) => lstSelectedValues.includes(objOption.strValue));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredOptions.some((objOption) => lstSelectedValues.includes(objOption.strValue));

  function handleChange(objEvent: SelectChangeEvent<string[]>) {
    const lstNext = (typeof objEvent.target.value === "string" ? objEvent.target.value.split(",") : objEvent.target.value) as string[];
    if (lstNext.includes(SELECT_ALL_SENTINEL)) {
      const setFilteredValues = new Set(lstFilteredOptions.map((objOption) => objOption.strValue));
      if (blnAllFilteredSelected) {
        objProps.fnOnChange(lstSelectedValues.filter((strValue) => !setFilteredValues.has(strValue)).join(","));
      } else {
        objProps.fnOnChange(Array.from(new Set([...lstSelectedValues, ...setFilteredValues])).join(","));
      }
      return;
    }
    objProps.fnOnChange(lstNext.join(","));
  }

  return (
    <TextField
      className="app-mui-text-field"
      select
      size="small"
      label={objProps.strLabel}
      value={lstSelectedValues}
      onChange={handleChange as unknown as ChangeEventHandler<HTMLInputElement>}
      disabled={objProps.blnDisabled}
      fullWidth
      InputLabelProps={{ shrink: true }}
      SelectProps={{
        multiple: true,
        displayEmpty: true,
        renderValue: (objSelected) => {
          const lstSelected = objSelected as string[];
          if (!lstSelected.length) return <Box component="span" sx={{ color: "text.disabled" }}>{objProps.strLabel}</Box>;
          return lstSelected.map((strValue) => mapLabelByValue.get(strValue) ?? strValue).join(", ");
        },
        MenuProps: { autoFocus: false, PaperProps: { style: { maxHeight: 340 } } },
      }}
      sx={{ minWidth: 200, flex: "1 1 200px" }}
    >
      <ListSubheader sx={{ lineHeight: "normal", py: 1 }} onClickCapture={(objEvent) => objEvent.stopPropagation()}>
        <TextField
          className="app-mui-text-field"
          size="small"
          autoFocus
          fullWidth
          placeholder="Search here"
          value={strSearch}
          onChange={(objEvent) => setStrSearch(objEvent.target.value)}
          onKeyDown={(objEvent) => { if (objEvent.key !== "Escape") objEvent.stopPropagation(); }}
        />
      </ListSubheader>
      <MenuItem value={SELECT_ALL_SENTINEL} disabled={!lstFilteredOptions.length}>
        <Checkbox size="small" checked={blnAllFilteredSelected} indeterminate={blnSomeFilteredSelected} />
        <ListItemText primary="Select All" />
      </MenuItem>
      {lstFilteredOptions.map((objOption) => (
        <MenuItem key={objOption.strValue} value={objOption.strValue}>
          <Checkbox size="small" checked={lstSelectedValues.includes(objOption.strValue)} />
          <ListItemText primary={objOption.strLabel} />
        </MenuItem>
      ))}
      {!lstFilteredOptions.length ? <MenuItem disabled>No matches</MenuItem> : null}
    </TextField>
  );
}

export default function SalaryRegisterReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS", "SALARY_REGISTER", "REPORT_SALARY_REGISTER", "PAYROLL_RESULTS", "PAYROLL_RESULT",
  ]);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  // Arrear Register lives here as a second tab (no menu row of its own): right
  // "report_arrear_register" on the Salary Register menu.
  const { canDo: canDoAction, blnLoading: blnActionRightsLoading } = useActionRights();
  const blnCanArrearRegister = canDoAction("salary_register", ARREAR_REGISTER_RIGHT);
  const [strView, setStrView] = useState<"salary" | "arrear">("salary");
  const strEffectiveView: "salary" | "arrear" = !blnCanArrearRegister
    ? "salary"
    : !blnRightsLoading && !blnActionRightsLoading && !blnCanView
      ? "arrear"
      : strView;

  const [dicSearch, setDicSearch] = useState<SearchForm>(getDefaultSearch());
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<SelectOption[]>([]);
  const [lstDepartmentOptions, setLstDepartmentOptions] = useState<SelectOption[]>([]);
  const [lstDesignationOptions, setLstDesignationOptions] = useState<SelectOption[]>([]);
  const [lstLocationOptions, setLstLocationOptions] = useState<SelectOption[]>([]);
  const [lstAllocationEntityOptions, setLstAllocationEntityOptions] = useState<SelectOption[]>([]);
  const [blnLoadingMasters, setBlnLoadingMasters] = useState(true);
  const [blnLoadingReport, setBlnLoadingReport] = useState(false);
  const objPayrollFreshness = usePayrollDataFreshness(blnCanView);
  const [blnHasSearched, setBlnHasSearched] = useState(false);
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>({ strDesignationIDs: "", strLocationIDs: "" });
  const [strError, setStrError] = useState("");

  const [lstRows, setLstRows] = useState<SalaryRegisterRow[]>([]);
  const [lstAllPaymentColumns, setLstPaymentColumns] = useState<string[]>([]);
  const [lstAllRecoveryColumns, setLstRecoveryColumns] = useState<string[]>([]);
  const [lstArrearColumns, setLstArrearColumns] = useState<string[]>([]);
  // On: arrear lines get their own columns and Gross excludes them. Off: those columns are
  // hidden and the arrear amounts are added into Gross Earning / Gross Deduction.
  const [blnShowArrearColumns, setBlnShowArrearColumns] = useState(true);
  useEffect(() => { setBlnShowArrearColumns(readShowArrearColumnsPreference()); }, []);
  // ON: arrear columns after Gross, Gross = regular salary only. OFF: arrears folded into Gross.
  const objArrearLayout = useMemo(
    () => buildSalaryRegisterArrearLayout(lstAllPaymentColumns, lstAllRecoveryColumns, lstArrearColumns, blnShowArrearColumns),
    [blnShowArrearColumns, lstAllPaymentColumns, lstAllRecoveryColumns, lstArrearColumns],
  );
  const { lstPaymentColumns, lstArrearPaymentColumns, lstRecoveryColumns, lstArrearRecoveryColumns } = objArrearLayout;
  const [strCompanyName, setStrCompanyName] = useState("");
  const [strMonthLabel, setStrMonthLabel] = useState("");
  const blnPageLoading = blnRightsLoading || blnLoadingMasters || blnLoadingReport;
  const blnMoreFiltersOpen = Boolean(objMoreFiltersAnchor);

  useEffect(() => {
    if (blnRightsLoading) return;
    if (!blnCanView) {
      setBlnLoadingMasters(false);
      return;
    }
    let blnActive = true;
    setBlnLoadingMasters(true);
    Promise.all([employeeService.getEmployees(), employeeService.getFormOptions()])
      .then(([lstEmployees, dicOptions]) => {
        if (!blnActive) return;
        setLstEmployeeOptions(lstEmployees.filter((dicEmployee) => !dicEmployee.blnIsPartialSave).map((dicEmployee) => ({
          strValue: String(dicEmployee.intID), strLabel: `${dicEmployee.strEmployeeCode} - ${dicEmployee.strFullName}`,
        })));
        setLstDepartmentOptions(dicOptions.lstDepartments.map((objDept) => ({ strValue: String(objDept.intID), strLabel: objDept.strLabel })));
        setLstDesignationOptions(dicOptions.lstDesignations.map((objDesignation) => ({ strValue: String(objDesignation.intID), strLabel: objDesignation.strLabel })));
        setLstLocationOptions(dicOptions.lstLocations.map((objLocation) => ({ strValue: String(objLocation.intID), strLabel: objLocation.strLabel })));
        setLstAllocationEntityOptions((dicOptions.lstAllocationEntities ?? []).map((objEntity) => ({ strValue: String(objEntity.intID), strLabel: objEntity.strLabel })));
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load salary register filters."))
      .finally(() => { if (blnActive) setBlnLoadingMasters(false); });
    return () => { blnActive = false; };
  }, [blnCanView, blnRightsLoading]);

  async function loadReport() {
    setStrError("");
    setBlnLoadingReport(true);
    try {
      const [strYear, strMonth] = dicSearch.strPeriod.split("-");
      // Remembers the figures' version so a later reprocess shows the Refresh notice.
      const objEnvelope = await objPayrollFreshness.trackLoad(() => salaryRegisterReportService.getSalaryRegister({
        year: strYear,
        month: strMonth,
        employee_id: dicSearch.strEmployeeIDs,
        department_id: dicSearch.strDepartmentIDs,
        designation_id: dicSearch.strDesignationIDs,
        location_id: dicSearch.strLocationIDs,
        allocation_entity_id: dicSearch.strAllocationEntityIDs,
        employment_status: dicSearch.strEmploymentStatus,
      }), dicSearch.strPeriod, loadReport);
      setLstRows(objEnvelope.lstItems);
      setLstPaymentColumns(objEnvelope.lstPaymentColumns);
      setLstRecoveryColumns(objEnvelope.lstRecoveryColumns);
      setLstArrearColumns(objEnvelope.lstArrearColumns ?? []);
      setStrCompanyName(objEnvelope.strCompanyName);
      setStrMonthLabel(objEnvelope.strMonthLabel);
      setBlnHasSearched(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load the salary register.");
      setLstRows([]);
    } finally {
      setBlnLoadingReport(false);
    }
  }

  function clearFilters() {
    setDicSearch(getDefaultSearch());
    setDicMoreFiltersDraft({ strDesignationIDs: "", strLocationIDs: "" });
    setObjMoreFiltersAnchor(null);
    setLstRows([]);
    setBlnHasSearched(false);
    setStrError("");
  }

  function clearMoreFilters() {
    setDicMoreFiltersDraft({ strDesignationIDs: "", strLocationIDs: "" });
  }

  function applyMoreFilters() {
    setDicSearch((dicPrevious) => ({ ...dicPrevious, ...dicMoreFiltersDraft }));
    setObjMoreFiltersAnchor(null);
  }

  const lstColumns = useMemo<CommonTableColumn<Record<string, ReactNode>>[]>(() => [
    { field: "strEmployeeName", headerName: "Employee Name", width: 190 },
    { field: "strEmployeeCode", headerName: "Employee No", width: 120 },
    { field: "strDateOfJoining", headerName: "Date of Joining", width: 130 },
    { field: "strDepartment", headerName: "Department", width: 150 },
    { field: "strDesignation", headerName: "Designation", width: 230 },
    { field: "strLocation", headerName: "Location", width: 140 },
    { field: "decTotalPresentDays", headerName: "Payable Days", width: 130, align: "right" },
    ...lstPaymentColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossEarning", headerName: "Gross Earning", width: 140, align: "right" },
    ...lstArrearPaymentColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    ...lstRecoveryColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossDeduction", headerName: "Gross Deduction", width: 140, align: "right" },
    ...lstArrearRecoveryColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decNetEarning", headerName: "Net Earning", width: 140, align: "right" },
    { field: "decSystemTds", headerName: "System TDS", width: 130, align: "right" },
    { field: "strTdsSource", headerName: "TDS Source", width: 170 },
  ], [lstPaymentColumns, lstArrearPaymentColumns, lstRecoveryColumns, lstArrearRecoveryColumns]);

  const lstDisplayRows = useMemo(() => lstRows.map((dicRow, intIndex) => {
    const dicMapped: Record<string, ReactNode> = {
      __rowid: String(dicRow.intEmployeeID || intIndex),
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strDateOfJoining: formatDateOfJoining(dicRow.dtDateOfJoining) || "-",
      strDepartment: dicRow.strDepartment ?? "-",
      strDesignation: dicRow.strDesignation ?? "-",
      strLocation: dicRow.strLocation ?? "-",
      decTotalPresentDays: formatBodyAmount(dicRow.decTotalPresentDays),
      decGrossEarning: formatBodyAmount(objArrearLayout.fnGrossEarning(dicRow)),
      decGrossDeduction: dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(objArrearLayout.fnGrossDeduction(dicRow)),
      decNetEarning: dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(dicRow.decNetEarning),
      decSystemTds: dicRow.decSystemTds === null || dicRow.decSystemTds === undefined ? "-" : formatBodyAmount(dicRow.decSystemTds),
      strTdsSource: dicRow.strTdsSource ?? "-",
    };
    [...lstPaymentColumns, ...lstArrearPaymentColumns].forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicPayments[strColumn]); });
    [...lstRecoveryColumns, ...lstArrearRecoveryColumns].forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicRecoveries[strColumn]); });
    return dicMapped;
  }), [lstRows, objArrearLayout, lstPaymentColumns, lstArrearPaymentColumns, lstRecoveryColumns, lstArrearRecoveryColumns]);

  function exportExcel() {
    downloadSalaryRegisterExcel(`salary-register-${dicSearch.strPeriod}.xlsx`, lstRows, objArrearLayout, strCompanyName, strMonthLabel)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to export the salary register."));
  }

  const objViewTabs = blnCanArrearRegister ? (
    <Tabs
      value={strEffectiveView}
      onChange={(_objEvent, strNext: "salary" | "arrear") => setStrView(strNext)}
      sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 700 } }}
    >
      {blnCanView ? <Tab value="salary" label="Salary Register" data-controlid="reports.salary-register.tab.salary" /> : null}
      <Tab value="arrear" label="Arrear Register" data-controlid="reports.salary-register.tab.arrear" />
    </Tabs>
  ) : null;

  if (strEffectiveView === "arrear") {
    return (
      <Box className={styles.page}>
        <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Arrear Register</Typography>
        {objViewTabs}
        <ArrearRegisterReport />
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Salary Register</Typography>
      {objViewTabs}

      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 190px", minWidth: 170 }}>
            <TextField
              className="app-mui-text-field"
              type="month"
              label="Month"
              value={dicSearch.strPeriod}
              onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strPeriod: objEvent.target.value }))}
              disabled={blnPageLoading}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 220px", minWidth: 200 }}>
            <CheckboxMultiSelectFilter strLabel="Employee" strValue={dicSearch.strEmployeeIDs} lstOptions={lstEmployeeOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strEmployeeIDs: strValue }))} blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Department" strValue={dicSearch.strDepartmentIDs} lstOptions={lstDepartmentOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strDepartmentIDs: strValue }))} blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Allocation Entity" strValue={dicSearch.strAllocationEntityIDs} lstOptions={lstAllocationEntityOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strAllocationEntityIDs: strValue }))} blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 160px", minWidth: 150 }}>
            <TextField className="app-mui-text-field" select label="Employment Status" value={dicSearch.strEmploymentStatus} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strEmploymentStatus: objEvent.target.value }))} disabled={blnPageLoading} fullWidth>
              {lstEmploymentStatusOptions.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.searchActions} sx={{ flex: "0 0 auto", ml: "auto" }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<FilterListRoundedIcon />}
              onClick={(objEvent) => {
                setDicMoreFiltersDraft({
                  strDesignationIDs: dicSearch.strDesignationIDs,
                  strLocationIDs: dicSearch.strLocationIDs,
                });
                setObjMoreFiltersAnchor(objEvent.currentTarget);
              }}
              aria-expanded={blnMoreFiltersOpen}
              aria-haspopup="dialog"
              disabled={blnPageLoading}
              sx={{ whiteSpace: "nowrap" }}
            >
              More filters
            </Button>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={loadReport} disabled={blnPageLoading} sx={{ whiteSpace: "nowrap" }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} sx={{ whiteSpace: "nowrap" }}>Clear</Button>
            {/* Page title is hidden on this screen, so the notices icon sits with the search actions. */}
            <PageNotices
              strControlId="reports.salary-register.notices"
              lstNotices={[
                !blnCanView && !strError ? { strKey: "rights", strSeverity: "warning", objMessage: "Salary register view access is not available for your user group." } : null,
                { strKey: "error", strSeverity: "error", objMessage: strError, fnDismiss: () => setStrError("") },
              ]}
            />
          </Box>
        </Box>
        <Popover
          open={blnMoreFiltersOpen}
          anchorEl={objMoreFiltersAnchor}
          onClose={() => setObjMoreFiltersAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                width: 374,
                maxWidth: "calc(100vw - 24px)",
                border: "1px solid #d8e2ef",
                borderRadius: "22px",
                boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
                overflow: "hidden",
              },
            },
          }}
        >
          <Box data-controlid="reports.salary-register.more-filters.panel">
            <Box sx={{ px: 2.5, pt: 2.25, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>More filters</Typography>
              <IconButton size="small" onClick={() => setObjMoreFiltersAnchor(null)} aria-label="Close more filters" data-controlid="reports.salary-register.more-filters.close.button" sx={{ color: "#64748b" }}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ px: 2.5, pb: 2, display: "grid", gap: 1.5 }}>
              <CheckboxMultiSelectFilter strLabel="Designation" strValue={dicMoreFiltersDraft.strDesignationIDs} lstOptions={lstDesignationOptions} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strDesignationIDs: strValue }))} blnDisabled={blnPageLoading} />
              <CheckboxMultiSelectFilter strLabel="Location" strValue={dicMoreFiltersDraft.strLocationIDs} lstOptions={lstLocationOptions} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strLocationIDs: strValue }))} blnDisabled={blnPageLoading} />
            </Box>
            <Divider />
            <Box sx={{ px: 2.5, py: 1.75, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.25 }}>
              <Button onClick={clearMoreFilters} disabled={blnPageLoading} data-controlid="reports.salary-register.more-filters.clear-all.button" sx={{ px: 0, minWidth: 0, fontWeight: 700, textTransform: "none", color: "var(--app-primary-color)", "&:hover": { backgroundColor: "var(--app-primary-soft)" } }}>
                Clear all
              </Button>
              <Box sx={{ display: "flex", gap: 1.25 }}>
                <Button className={styles.secondaryButton} onClick={() => setObjMoreFiltersAnchor(null)} disabled={blnPageLoading} data-controlid="reports.salary-register.more-filters.cancel.button">Cancel</Button>
                <Button className={styles.primaryButton} onClick={applyMoreFilters} disabled={blnPageLoading} data-controlid="reports.salary-register.more-filters.apply.button">Apply</Button>
              </Box>
            </Box>
          </Box>
        </Popover>
      </Box>

      <PayrollDataChangedNotice objFreshness={objPayrollFreshness} blnRefreshing={blnLoadingReport} />

      <Box className={styles.tableCard} sx={{ position: "relative", p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <CommonTable
          columns={lstColumns}
          rows={lstDisplayRows}
          rowIdField="__rowid"
          defaultPageSize={20}
          pageSizeOptions={[20, 50, 100]}
          emptyMessage={blnHasSearched ? "No employees with a processed payroll result or a configured salary structure found for the selected month and filters." : "Select filters and search to generate the salary register."}
          showPaginationSummary
          withPaper={false}
          wrapColumnHeaders
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
          toolbarLeft={(
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              {canDoAny("export") ? (
                <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportExcel} disabled={!lstRows.length} sx={{ whiteSpace: "nowrap" }}>Export Excel</Button>
              ) : null}
              <FormControlLabel
                data-controlid="reports.salary-register.arrear-columns.toggle"
                control={(
                  <Switch
                    size="small"
                    checked={blnShowArrearColumns}
                    onChange={(objEvent) => {
                      setBlnShowArrearColumns(objEvent.target.checked);
                      writeShowArrearColumnsPreference(objEvent.target.checked);
                    }}
                  />
                )}
                label="Show arrear columns separately"
                sx={{ m: 0, gap: 0.75, "& .MuiFormControlLabel-label": { fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" } }}
              />
            </Box>
          )}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
