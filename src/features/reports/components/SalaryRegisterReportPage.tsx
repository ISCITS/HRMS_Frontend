"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Chip, Divider, IconButton, ListItemText, ListSubheader, MenuItem, Popover, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useEffect, useMemo, useState, type ChangeEventHandler, type ReactNode } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import CommonTable from "@/Common/components/CommonTable";
import { employeeService } from "@/features/employee/services/employeeService";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { salaryRegisterReportService, type SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SelectOption = { strValue: string; strLabel: string };

type SearchForm = {
  strPeriod: string;
  strEmployeeIDs: string;
  strDepartmentIDs: string;
  strDesignationIDs: string;
  strLocationIDs: string;
  strCostCenterIDs: string;
  strEmploymentStatus: string;
};

const lstEmploymentStatusOptions = ["Active", "Inactive", "All"];
type MoreFiltersForm = Pick<SearchForm, "strDesignationIDs" | "strLocationIDs" | "strCostCenterIDs">;

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
    strCostCenterIDs: "",
    strEmploymentStatus: "Active",
  };
}

function formatBodyAmount(decValue: number | null | undefined) {
  if (decValue === null) return "-"; // explicitly unknown (e.g. Total Present Days with no attendance source)
  const decNumber = Number(decValue ?? 0); // undefined = component not present for this row
  if (!decNumber) return "";
  return Number.isInteger(decNumber) ? String(decNumber) : decNumber.toFixed(2);
}

function formatTotalAmount(decValue: number) {
  return decValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function collapseValues(lstRows: SalaryRegisterRow[], fnGetValue: (dicRow: SalaryRegisterRow) => string | null | undefined, strFallback: string) {
  const setValues = new Set(lstRows.map((dicRow) => (fnGetValue(dicRow) || "").trim()).filter(Boolean));
  if (setValues.size === 1) return Array.from(setValues)[0];
  return strFallback;
}

function formatExportTimestamp(objDate: Date) {
  const fnPad = (intValue: number) => String(intValue).padStart(2, "0");
  let intHours = objDate.getHours();
  const strMeridiem = intHours >= 12 ? "PM" : "AM";
  intHours = intHours % 12 || 12;
  return `${fnPad(objDate.getMonth() + 1)}/${fnPad(objDate.getDate())}/${objDate.getFullYear()} ${fnPad(intHours)}:${fnPad(objDate.getMinutes())}:${fnPad(objDate.getSeconds())} ${strMeridiem}`;
}

function escapeHtml(strValue: string) {
  return strValue.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildExportHtml(
  lstRows: SalaryRegisterRow[],
  lstPaymentColumns: string[],
  lstRecoveryColumns: string[],
  strCompanyName: string,
  strMonthLabel: string
) {
  const strState = collapseValues(lstRows, (dicRow) => dicRow.strState, "All");
  const strCostCentre = collapseValues(lstRows, (dicRow) => dicRow.strCostCenter, "All");
  const strSite = collapseValues(lstRows, (dicRow) => dicRow.strLocation, "All");
  const strPayCycle = collapseValues(lstRows, (dicRow) => dicRow.strPayCycle, "Monthly");
  const strEmployeeCategory = collapseValues(lstRows, (dicRow) => dicRow.strEmployeeCategory, "All");

  // A single table (not separate meta/data tables) so Excel keeps one consistent set of column
  // widths across the header block and the data grid - two stacked tables share physical
  // spreadsheet columns anyway, but only a single table lets us size them deliberately via one
  // <colgroup> instead of Excel falling back to a default width that clips long labels.
  const lstColumnLabels = [
    "Sl No", "Employee No", "Employee Name", "Status", "Total Present Days",
    ...lstPaymentColumns, "Gross Earning",
    ...lstRecoveryColumns, "Gross Deduction", "Net Earning",
  ];
  const intColumnCount = lstColumnLabels.length;
  const strColGroup = lstColumnLabels.map((_, intIndex) => {
    const intWidth = intIndex === 0 ? 150 : intIndex === 1 ? 130 : intIndex === 2 ? 190 : 140;
    return `<col style="width:${intWidth}px" />`;
  }).join("");

  const strHeaderCells = lstColumnLabels.map((strLabel) => `<th>${escapeHtml(strLabel)}</th>`).join("");

  const strBodyRows = lstRows.map((dicRow, intIndex) => `<tr>
      <td>${intIndex + 1}</td><td>${escapeHtml(dicRow.strEmployeeCode)}</td><td class="text">${escapeHtml(dicRow.strEmployeeName)}</td>
      <td class="text">${dicRow.strDataSource === "Processed" ? "Processed" : "Projected"}</td>
      <td>${formatBodyAmount(dicRow.decTotalPresentDays)}</td>
      ${lstPaymentColumns.map((strColumn) => `<td>${formatBodyAmount(dicRow.dicPayments[strColumn])}</td>`).join("")}
      <td>${formatBodyAmount(dicRow.decGrossEarning)}</td>
      ${lstRecoveryColumns.map((strColumn) => `<td>${formatBodyAmount(dicRow.dicRecoveries[strColumn])}</td>`).join("")}
      <td class="text">${dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(dicRow.decGrossDeduction)}</td>
      <td class="text">${dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(dicRow.decNetEarning)}</td>
    </tr>`).join("");

  const fnSum = (fnValue: (dicRow: SalaryRegisterRow) => number | null) => lstRows.reduce((decTotal, dicRow) => decTotal + (fnValue(dicRow) || 0), 0);
  const strTotalRow = `<tr class="total">
    <td colspan="4" style="text-align:center">Grand Total</td>
    <td>${formatTotalAmount(fnSum((dicRow) => dicRow.decTotalPresentDays))}</td>
    ${lstPaymentColumns.map((strColumn) => `<td>${formatTotalAmount(fnSum((dicRow) => dicRow.dicPayments[strColumn] || 0))}</td>`).join("")}
    <td>${formatTotalAmount(fnSum((dicRow) => dicRow.decGrossEarning))}</td>
    ${lstRecoveryColumns.map((strColumn) => `<td>${formatTotalAmount(fnSum((dicRow) => dicRow.dicRecoveries[strColumn] || 0))}</td>`).join("")}
    <td>${formatTotalAmount(fnSum((dicRow) => dicRow.decGrossDeduction))}</td>
    <td>${formatTotalAmount(fnSum((dicRow) => dicRow.decNetEarning))}</td>
  </tr>`;

  const fnMetaRow = (strLabel: string, strValue: string) =>
    `<tr class="meta-row"><td class="label">${escapeHtml(strLabel)}</td><td colspan="${intColumnCount - 1}">${escapeHtml(strValue)}</td></tr>`;

  return `
    <html>
      <head>
        <title>Salary Register</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
          table.report { border-collapse: collapse; table-layout: fixed; }
          table.report td, table.report th { padding: 4px 6px; font-size: 12px; }
          .company td, .title td { text-align: center; border: none; }
          .company td { font-size: 18px; font-weight: 800; padding-top: 8px; }
          .title td { font-size: 15px; font-weight: 800; padding-bottom: 10px; }
          tr.meta-row td { border: none; vertical-align: top; }
          tr.meta-row td.label { font-weight: 700; white-space: nowrap; }
          tr.spacer td { border: none; padding: 4px; }
          thead th { border: 1px solid #000; text-align: center; font-weight: 700; background: #f3f4f6; }
          tbody td { border: 1px solid #000; text-align: right; }
          tbody td.text { text-align: left; }
          tr.total td { font-weight: 800; }
        </style>
      </head>
      <body>
        <table class="report">
          <colgroup>${strColGroup}</colgroup>
          <tbody>
            <tr class="company"><td colspan="${intColumnCount}">${escapeHtml(strCompanyName)}</td></tr>
            <tr class="title"><td colspan="${intColumnCount}">Salary register for the month ${escapeHtml(strMonthLabel)}</td></tr>
            ${fnMetaRow("Date And Time:", formatExportTimestamp(new Date()))}
            ${fnMetaRow("State Name:", strState)}
            ${fnMetaRow("Cost Centre:", strCostCentre)}
            ${fnMetaRow("Site:", strSite)}
            ${fnMetaRow("Pay Cycle:", strPayCycle)}
            ${fnMetaRow("Employee Category:", strEmployeeCategory)}
            <tr class="spacer"><td colspan="${intColumnCount}"></td></tr>
          </tbody>
          <thead><tr>${strHeaderCells}</tr></thead>
          <tbody>${strBodyRows}${strTotalRow}</tbody>
        </table>
      </body>
    </html>
  `;
}

function downloadExcel(strFileName: string, strHtml: string) {
  const objBlob = new Blob([strHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
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

  const [dicSearch, setDicSearch] = useState<SearchForm>(getDefaultSearch());
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<SelectOption[]>([]);
  const [lstDepartmentOptions, setLstDepartmentOptions] = useState<SelectOption[]>([]);
  const [lstDesignationOptions, setLstDesignationOptions] = useState<SelectOption[]>([]);
  const [lstLocationOptions, setLstLocationOptions] = useState<SelectOption[]>([]);
  const [lstCostCenterOptions, setLstCostCenterOptions] = useState<SelectOption[]>([]);
  const [blnLoadingMasters, setBlnLoadingMasters] = useState(true);
  const [blnLoadingReport, setBlnLoadingReport] = useState(false);
  const [blnHasSearched, setBlnHasSearched] = useState(false);
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>({ strDesignationIDs: "", strLocationIDs: "", strCostCenterIDs: "" });
  const [strError, setStrError] = useState("");

  const [lstRows, setLstRows] = useState<SalaryRegisterRow[]>([]);
  const [lstPaymentColumns, setLstPaymentColumns] = useState<string[]>([]);
  const [lstRecoveryColumns, setLstRecoveryColumns] = useState<string[]>([]);
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
        setLstCostCenterOptions(dicOptions.lstCostCenters.map((objCostCenter) => ({ strValue: String(objCostCenter.intID), strLabel: objCostCenter.strLabel })));
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
      const objEnvelope = await salaryRegisterReportService.getSalaryRegister({
        year: strYear,
        month: strMonth,
        employee_id: dicSearch.strEmployeeIDs,
        department_id: dicSearch.strDepartmentIDs,
        designation_id: dicSearch.strDesignationIDs,
        location_id: dicSearch.strLocationIDs,
        cost_center_id: dicSearch.strCostCenterIDs,
        employment_status: dicSearch.strEmploymentStatus,
      });
      setLstRows(objEnvelope.lstItems);
      setLstPaymentColumns(objEnvelope.lstPaymentColumns);
      setLstRecoveryColumns(objEnvelope.lstRecoveryColumns);
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
    setDicMoreFiltersDraft({ strDesignationIDs: "", strLocationIDs: "", strCostCenterIDs: "" });
    setObjMoreFiltersAnchor(null);
    setLstRows([]);
    setBlnHasSearched(false);
    setStrError("");
  }

  function clearMoreFilters() {
    setDicMoreFiltersDraft({ strDesignationIDs: "", strLocationIDs: "", strCostCenterIDs: "" });
  }

  function applyMoreFilters() {
    setDicSearch((dicPrevious) => ({ ...dicPrevious, ...dicMoreFiltersDraft }));
    setObjMoreFiltersAnchor(null);
  }

  const lstColumns = useMemo<CommonTableColumn<Record<string, ReactNode>>[]>(() => [
    { field: "strEmployeeCode", headerName: "Employee No", width: 120 },
    { field: "strEmployeeName", headerName: "Employee Name", width: 190 },
    { field: "strDepartment", headerName: "Department", width: 150 },
    { field: "strDesignation", headerName: "Designation", width: 150 },
    { field: "strLocation", headerName: "Location", width: 140 },
    { field: "strDataSource", headerName: "Status", width: 130 },
    { field: "decTotalPresentDays", headerName: "Total Present Days", width: 130, align: "right" },
    ...lstPaymentColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossEarning", headerName: "Gross Earning", width: 140, align: "right" },
    ...lstRecoveryColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossDeduction", headerName: "Gross Deduction", width: 140, align: "right" },
    { field: "decNetEarning", headerName: "Net Earning", width: 140, align: "right" },
  ], [lstPaymentColumns, lstRecoveryColumns]);

  const lstDisplayRows = useMemo(() => lstRows.map((dicRow, intIndex) => {
    const blnProcessed = dicRow.strDataSource === "Processed";
    const dicMapped: Record<string, ReactNode> = {
      __rowid: String(dicRow.intEmployeeID || intIndex),
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strDepartment: dicRow.strDepartment ?? "-",
      strDesignation: dicRow.strDesignation ?? "-",
      strLocation: dicRow.strLocation ?? "-",
      strDataSource: (
        <Chip
          size="small"
          label={blnProcessed ? "Processed" : "Projected"}
          sx={blnProcessed
            ? { backgroundColor: "rgba(22, 163, 74, 0.12)", color: "#166534", fontWeight: 700 }
            : { backgroundColor: "rgba(217, 119, 6, 0.12)", color: "#92400e", fontWeight: 700 }}
        />
      ),
      decTotalPresentDays: formatBodyAmount(dicRow.decTotalPresentDays),
      decGrossEarning: formatBodyAmount(dicRow.decGrossEarning),
      decGrossDeduction: dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(dicRow.decGrossDeduction),
      decNetEarning: dicRow.blnStatutoryPending ? "Not yet computed" : formatBodyAmount(dicRow.decNetEarning),
    };
    lstPaymentColumns.forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicPayments[strColumn]); });
    lstRecoveryColumns.forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicRecoveries[strColumn]); });
    return dicMapped;
  }), [lstRows, lstPaymentColumns, lstRecoveryColumns]);

  function exportExcel() {
    const strHtml = buildExportHtml(lstRows, lstPaymentColumns, lstRecoveryColumns, strCompanyName, strMonthLabel);
    downloadExcel(`salary-register-${dicSearch.strPeriod}.xls`, strHtml);
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Salary Register</Typography>

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
                  strCostCenterIDs: dicSearch.strCostCenterIDs,
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
              <CheckboxMultiSelectFilter strLabel="Cost Centre" strValue={dicMoreFiltersDraft.strCostCenterIDs} lstOptions={lstCostCenterOptions} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strCostCenterIDs: strValue }))} blnDisabled={blnPageLoading} />
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

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          Shows actual processed payroll figures ("Processed") when payroll has been run for the selected month; otherwise falls back to the employee's configured CTC/salary structure ("Projected") so a figure is always available.
        </Typography>
      </Box>

      {!blnCanView && !strError ? <Alert severity="warning">Salary register view access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

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
          toolbarLeft={canDoAny("export") ? (
            <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportExcel} disabled={!lstRows.length} sx={{ whiteSpace: "nowrap" }}>Export Excel</Button>
          ) : null}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
    </Box>
  );
}
