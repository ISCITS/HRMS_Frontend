"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Chip, CircularProgress, ListItemText, ListSubheader, MenuItem, TextField, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import type { CommonTableColumn } from "@/Common/components/CommonTable";
import CommonTable from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
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

// Columns hidden from the on-screen grid only (kept in the Excel export, which shows full
// detail) — a curated subset for at-a-glance viewing, per an explicit ask to declutter the list.
const SET_HIDDEN_GRID_COLUMNS = new Set(["hra payment", "bonus / ex gratia payment", "hostel fee payment"]);

function isColumnHiddenOnGrid(strColumnLabel: string) {
  const strLower = strColumnLabel.trim().toLowerCase();
  return strLower.includes("reimbursement") || SET_HIDDEN_GRID_COLUMNS.has(strLower);
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
    "Sl No", "Employee No", "Employee Name", "Total Present Days",
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
      <td>${formatBodyAmount(dicRow.decTotalPresentDays)}</td>
      ${lstPaymentColumns.map((strColumn) => `<td>${formatBodyAmount(dicRow.dicPayments[strColumn])}</td>`).join("")}
      <td>${formatBodyAmount(dicRow.decGrossEarning)}</td>
      ${lstRecoveryColumns.map((strColumn) => `<td>${formatBodyAmount(dicRow.dicRecoveries[strColumn])}</td>`).join("")}
      <td>${formatBodyAmount(dicRow.decGrossDeduction)}</td>
      <td>${formatBodyAmount(dicRow.decNetEarning)}</td>
    </tr>`).join("");

  const fnSum = (fnValue: (dicRow: SalaryRegisterRow) => number | null) => lstRows.reduce((decTotal, dicRow) => decTotal + (fnValue(dicRow) || 0), 0);
  const strTotalRow = `<tr class="total">
    <td colspan="3" style="text-align:center">Grand Total</td>
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
      select
      size="small"
      label={objProps.strLabel}
      value={lstSelectedValues}
      onChange={handleChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
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
  const [strError, setStrError] = useState("");

  const [lstRows, setLstRows] = useState<SalaryRegisterRow[]>([]);
  const [lstPaymentColumns, setLstPaymentColumns] = useState<string[]>([]);
  const [lstRecoveryColumns, setLstRecoveryColumns] = useState<string[]>([]);
  const [strCompanyName, setStrCompanyName] = useState("");
  const [strMonthLabel, setStrMonthLabel] = useState("");

  useEffect(() => {
    if (!blnCanView) return;
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
  }, [blnCanView]);

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
    setLstRows([]);
    setBlnHasSearched(false);
    setStrError("");
  }

  const lstVisiblePaymentColumns = useMemo(() => lstPaymentColumns.filter((strColumn) => !isColumnHiddenOnGrid(strColumn)), [lstPaymentColumns]);
  const lstVisibleRecoveryColumns = useMemo(() => lstRecoveryColumns.filter((strColumn) => !isColumnHiddenOnGrid(strColumn)), [lstRecoveryColumns]);

  const lstColumns = useMemo<CommonTableColumn<Record<string, React.ReactNode>>[]>(() => [
    { field: "strEmployeeCode", headerName: "Employee No", width: 120 },
    { field: "strEmployeeName", headerName: "Employee Name", width: 190 },
    { field: "strDepartment", headerName: "Department", width: 150 },
    { field: "strDesignation", headerName: "Designation", width: 150 },
    { field: "strLocation", headerName: "Location", width: 140 },
    { field: "strDataSource", headerName: "Status", width: 130 },
    { field: "decTotalPresentDays", headerName: "Total Present Days", width: 130, align: "right" },
    ...lstVisiblePaymentColumns.map((strColumn): CommonTableColumn<Record<string, React.ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossEarning", headerName: "Gross Earning", width: 140, align: "right" },
    ...lstVisibleRecoveryColumns.map((strColumn): CommonTableColumn<Record<string, React.ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossDeduction", headerName: "Gross Deduction", width: 140, align: "right" },
    { field: "decNetEarning", headerName: "Net Earning", width: 140, align: "right" },
  ], [lstVisiblePaymentColumns, lstVisibleRecoveryColumns]);

  const lstDisplayRows = useMemo(() => lstRows.map((dicRow, intIndex) => {
    const blnProcessed = dicRow.strDataSource === "Processed";
    const dicMapped: Record<string, React.ReactNode> = {
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
      decGrossDeduction: formatBodyAmount(dicRow.decGrossDeduction),
      decNetEarning: formatBodyAmount(dicRow.decNetEarning),
    };
    lstPaymentColumns.forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicPayments[strColumn]); });
    lstRecoveryColumns.forEach((strColumn) => { dicMapped[strColumn] = formatBodyAmount(dicRow.dicRecoveries[strColumn]); });
    return dicMapped;
  }), [lstRows, lstPaymentColumns, lstRecoveryColumns]);

  function exportExcel() {
    const strHtml = buildExportHtml(lstRows, lstPaymentColumns, lstRecoveryColumns, strCompanyName, strMonthLabel);
    downloadExcel(`salary-register-${dicSearch.strPeriod}.xls`, strHtml);
  }

  if (blnRightsLoading || blnLoadingMasters) {
    return <BlockingLoader blnOpen strLabel="Loading salary register..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Salary Register</Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 190px", minWidth: 170 }}>
            <TextField
              type="month"
              label="Month"
              value={dicSearch.strPeriod}
              onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strPeriod: objEvent.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 220px", minWidth: 200 }}>
            <CheckboxMultiSelectFilter strLabel="Employee" strValue={dicSearch.strEmployeeIDs} lstOptions={lstEmployeeOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strEmployeeIDs: strValue }))} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Department" strValue={dicSearch.strDepartmentIDs} lstOptions={lstDepartmentOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strDepartmentIDs: strValue }))} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Designation" strValue={dicSearch.strDesignationIDs} lstOptions={lstDesignationOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strDesignationIDs: strValue }))} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Location" strValue={dicSearch.strLocationIDs} lstOptions={lstLocationOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strLocationIDs: strValue }))} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 200px", minWidth: 180 }}>
            <CheckboxMultiSelectFilter strLabel="Cost Centre" strValue={dicSearch.strCostCenterIDs} lstOptions={lstCostCenterOptions} fnOnChange={(strValue) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strCostCenterIDs: strValue }))} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 160px", minWidth: 150 }}>
            <TextField select label="Employment Status" value={dicSearch.strEmploymentStatus} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strEmploymentStatus: objEvent.target.value }))} fullWidth>
              {lstEmploymentStatusOptions.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.searchActions} sx={{ flex: "0 0 auto", ml: "auto" }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={loadReport} disabled={blnLoadingReport} sx={{ whiteSpace: "nowrap" }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnLoadingReport} sx={{ whiteSpace: "nowrap" }}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          Shows actual processed payroll figures ("Processed") when payroll has been run for the selected month; otherwise falls back to the employee's configured CTC/salary structure ("Projected") so a figure is always available.
        </Typography>
      </Box>

      {!blnCanView && !strError ? <Alert severity="warning">Salary register view access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={styles.tableCard}>
        <Box sx={{ alignItems: "center", display: "flex", flex: "0 0 auto", justifyContent: "space-between", gap: 2, mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Salary Register{strMonthLabel ? ` - ${strMonthLabel}` : ""}</Typography>
          <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 1 }}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={exportExcel} disabled={!lstRows.length} sx={{ whiteSpace: "nowrap" }}>Export Excel</Button> : null}
          </Box>
        </Box>

        {blnLoadingReport ? (
          <Box sx={{ alignItems: "center", display: "flex", gap: 1.5, justifyContent: "center", minHeight: 220 }}>
            <CircularProgress size={24} />
            <Typography>Building salary register...</Typography>
          </Box>
        ) : (
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
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        )}
      </Box>
    </Box>
  );
}
