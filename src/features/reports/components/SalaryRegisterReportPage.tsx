"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FilterListRoundedIcon from "@mui/icons-material/FilterListRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Divider, IconButton, ListItemText, ListSubheader, MenuItem, Popover, TextField, Typography } from "@mui/material";
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

// Numeric export cell: null = explicitly unknown ("-"), missing/zero = blank, otherwise a real number
// so Excel can sum/format it.
function toExportNumber(decValue: number | null | undefined): number | string | null {
  if (decValue === null) return "-";
  const decNumber = Number(decValue ?? 0);
  if (!decNumber) return null;
  return Math.round(decNumber * 100) / 100;
}

async function downloadSalaryRegisterExcel(
  strFileName: string,
  lstRows: SalaryRegisterRow[],
  lstPaymentColumns: string[],
  lstRecoveryColumns: string[],
  strCompanyName: string,
  strMonthLabel: string
) {
  const { Workbook } = await import("exceljs");
  const strState = collapseValues(lstRows, (dicRow) => dicRow.strState, "All");
  const strAllocationEntity = collapseValues(lstRows, (dicRow) => dicRow.strAllocationEntity, "All");
  const strPayCycle = collapseValues(lstRows, (dicRow) => dicRow.strPayCycle, "Monthly");
  const strEmployeeCategory = collapseValues(lstRows, (dicRow) => dicRow.strEmployeeCategory, "All");

  // Excel layout mirrors the client's salary register sheet (Employee No before Employee Name).
  // Component columns keep our configured names. The on-screen grid is unchanged.
  const lstLeadingLabels = [
    "Sl No", "Employee No", "Employee Name", "Status", "Site", "Cost Center", "Grade", "Department",
    "Designation", "Location", "Category", "Payment Mode", "Bank Name", "Branch Name", "Bank Account No",
    "IFSC Code", "PAN No",
  ];
  const lstTrailingLabels = ["Salary Released For", "Employee UAN", "WorkGroup Name"];
  const lstColumnLabels = [
    ...lstLeadingLabels, "Payable Days", "Negative Salary Dtl",
    ...lstPaymentColumns, "Gross Earning",
    ...lstRecoveryColumns, "Gross Deduction", "Net Earning",
    ...lstTrailingLabels,
  ];
  const intColumnCount = lstColumnLabels.length;
  const intFirstNumericColumn = lstLeadingLabels.length + 1; // 1-based: Payable Days
  const intLastNumericColumn = intColumnCount - lstTrailingLabels.length;

  const objWorkbook = new Workbook();
  const objSheet = objWorkbook.addWorksheet("Salary Register");
  objSheet.columns = lstColumnLabels.map((_, intIndex) => ({
    width: intIndex === 0 ? 8 : intIndex === 2 ? 30 : intIndex < intFirstNumericColumn - 1 ? 22 : intIndex >= intLastNumericColumn ? 22 : 18,
  }));
  const objThinBorder = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };

  const fnTitleRow = (strText: string, intSize: number) => {
    const objRow = objSheet.addRow([strText]);
    objSheet.mergeCells(objRow.number, 1, objRow.number, intColumnCount);
    objRow.getCell(1).font = { bold: true, size: intSize };
    objRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  };
  fnTitleRow(strCompanyName, 14);
  fnTitleRow(`Salary register for the month ${strMonthLabel}`, 12);

  const fnMetaRow = (strLabel: string, strValue: string) => {
    const objRow = objSheet.addRow([strLabel, "", "", strValue]);
    objSheet.mergeCells(objRow.number, 1, objRow.number, 3);
    objSheet.mergeCells(objRow.number, 4, objRow.number, Math.max(4, intColumnCount));
    objRow.getCell(1).font = { bold: true };
    objRow.getCell(1).alignment = { horizontal: "left" };
    objRow.getCell(4).alignment = { horizontal: "left" };
  };
  fnMetaRow("Date And Time:", formatExportTimestamp(new Date()));
  fnMetaRow("State Name:", strState);
  fnMetaRow("Payroll Month:", strMonthLabel);
  fnMetaRow("Allocation Entity:", strAllocationEntity);
  fnMetaRow("Pay Cycle:", strPayCycle);
  fnMetaRow("Employee Category:", strEmployeeCategory);
  objSheet.addRow([]);

  const objHeaderRow = objSheet.addRow(lstColumnLabels);
  objHeaderRow.eachCell((objCell) => {
    objCell.font = { bold: true };
    objCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    objCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    objCell.border = objThinBorder;
  });

  const fnStyleDataRow = (objRow: ReturnType<typeof objSheet.addRow>, blnBold: boolean) => {
    for (let intColumn = 1; intColumn <= intColumnCount; intColumn += 1) {
      const objCell = objRow.getCell(intColumn);
      objCell.border = objThinBorder;
      objCell.font = { bold: blnBold };
      if (intColumn === 1) objCell.alignment = { horizontal: "center" };
      else if (intColumn < intFirstNumericColumn || intColumn > intLastNumericColumn) objCell.alignment = { horizontal: "left" };
      else {
        objCell.alignment = { horizontal: "right" };
        objCell.numFmt = "#,##0.00";
      }
    }
  };

  // Excel rows are listed alphabetically by Employee Name (Employee No breaks ties).
  const lstSortedRows = [...lstRows].sort((dicLeft, dicRight) =>
    dicLeft.strEmployeeName.trim().localeCompare(dicRight.strEmployeeName.trim(), undefined, { sensitivity: "base" })
    || dicLeft.strEmployeeCode.localeCompare(dicRight.strEmployeeCode, undefined, { numeric: true }));

  lstSortedRows.forEach((dicRow, intIndex) => {
    const objRow = objSheet.addRow([
      intIndex + 1,
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      dicRow.strEmploymentStatus ?? "",
      dicRow.strAllocationEntity ?? "",
      dicRow.strCostCenter ?? "",
      dicRow.strGrade ?? "",
      dicRow.strDepartment ?? "-",
      dicRow.strDesignation ?? "-",
      dicRow.strLocation ?? "-",
      dicRow.strEmployeeCategory ?? "",
      dicRow.strPaymentMode ?? "",
      dicRow.strBankName ?? "",
      dicRow.strBranchName ?? "",
      dicRow.strAccountNumber ?? "",
      dicRow.strIfscCode ?? "",
      dicRow.strPanNumber ?? "",
      toExportNumber(dicRow.decTotalPresentDays),
      // Only a processed, fully-computed negative net shows here; projected rows have no final net.
      !dicRow.blnStatutoryPending && dicRow.decNetEarning < 0 ? Math.round(dicRow.decNetEarning * 100) / 100 : null,
      ...lstPaymentColumns.map((strColumn) => toExportNumber(dicRow.dicPayments[strColumn])),
      toExportNumber(dicRow.decGrossEarning),
      ...lstRecoveryColumns.map((strColumn) => toExportNumber(dicRow.dicRecoveries[strColumn])),
      dicRow.blnStatutoryPending ? "Not yet computed" : toExportNumber(dicRow.decGrossDeduction),
      dicRow.blnStatutoryPending ? "Not yet computed" : toExportNumber(dicRow.decNetEarning),
      "", // Salary Released For: no source data yet
      dicRow.strUanNumber ?? "",
      dicRow.strWorkgroup ?? "",
    ]);
    fnStyleDataRow(objRow, false);
  });

  const fnSum = (fnValue: (dicRow: SalaryRegisterRow) => number | null) => lstRows.reduce((decTotal, dicRow) => decTotal + (fnValue(dicRow) || 0), 0);
  const objTotalRow = objSheet.addRow([
    "Grand Total", ...lstLeadingLabels.slice(1).map(() => ""),
    fnSum((dicRow) => dicRow.decTotalPresentDays),
    fnSum((dicRow) => (!dicRow.blnStatutoryPending && dicRow.decNetEarning < 0 ? dicRow.decNetEarning : 0)),
    ...lstPaymentColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicPayments[strColumn] || 0)),
    fnSum((dicRow) => dicRow.decGrossEarning),
    ...lstRecoveryColumns.map((strColumn) => fnSum((dicRow) => dicRow.dicRecoveries[strColumn] || 0)),
    fnSum((dicRow) => dicRow.decGrossDeduction),
    fnSum((dicRow) => dicRow.decNetEarning),
    ...lstTrailingLabels.map(() => ""),
  ]);
  objSheet.mergeCells(objTotalRow.number, 1, objTotalRow.number, lstLeadingLabels.length);
  fnStyleDataRow(objTotalRow, true);
  objTotalRow.getCell(1).alignment = { horizontal: "center" };

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

  const [dicSearch, setDicSearch] = useState<SearchForm>(getDefaultSearch());
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<SelectOption[]>([]);
  const [lstDepartmentOptions, setLstDepartmentOptions] = useState<SelectOption[]>([]);
  const [lstDesignationOptions, setLstDesignationOptions] = useState<SelectOption[]>([]);
  const [lstLocationOptions, setLstLocationOptions] = useState<SelectOption[]>([]);
  const [lstAllocationEntityOptions, setLstAllocationEntityOptions] = useState<SelectOption[]>([]);
  const [blnLoadingMasters, setBlnLoadingMasters] = useState(true);
  const [blnLoadingReport, setBlnLoadingReport] = useState(false);
  const [blnHasSearched, setBlnHasSearched] = useState(false);
  const [objMoreFiltersAnchor, setObjMoreFiltersAnchor] = useState<HTMLElement | null>(null);
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>({ strDesignationIDs: "", strLocationIDs: "" });
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
      const objEnvelope = await salaryRegisterReportService.getSalaryRegister({
        year: strYear,
        month: strMonth,
        employee_id: dicSearch.strEmployeeIDs,
        department_id: dicSearch.strDepartmentIDs,
        designation_id: dicSearch.strDesignationIDs,
        location_id: dicSearch.strLocationIDs,
        allocation_entity_id: dicSearch.strAllocationEntityIDs,
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
    { field: "strDepartment", headerName: "Department", width: 150 },
    { field: "strDesignation", headerName: "Designation", width: 230 },
    { field: "strLocation", headerName: "Location", width: 140 },
    { field: "decTotalPresentDays", headerName: "Payable Days", width: 130, align: "right" },
    ...lstPaymentColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossEarning", headerName: "Gross Earning", width: 140, align: "right" },
    ...lstRecoveryColumns.map((strColumn): CommonTableColumn<Record<string, ReactNode>> => ({ field: strColumn, headerName: strColumn, width: 150, align: "right" })),
    { field: "decGrossDeduction", headerName: "Gross Deduction", width: 140, align: "right" },
    { field: "decNetEarning", headerName: "Net Earning", width: 140, align: "right" },
  ], [lstPaymentColumns, lstRecoveryColumns]);

  const lstDisplayRows = useMemo(() => lstRows.map((dicRow, intIndex) => {
    const dicMapped: Record<string, ReactNode> = {
      __rowid: String(dicRow.intEmployeeID || intIndex),
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strDepartment: dicRow.strDepartment ?? "-",
      strDesignation: dicRow.strDesignation ?? "-",
      strLocation: dicRow.strLocation ?? "-",
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
    downloadSalaryRegisterExcel(`salary-register-${dicSearch.strPeriod}.xlsx`, lstRows, lstPaymentColumns, lstRecoveryColumns, strCompanyName, strMonthLabel)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to export the salary register."));
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

      <Box sx={{ alignItems: "center", backgroundColor: "#f8fbff", border: "1px solid rgba(191,219,254,0.7)", borderRadius: "16px", color: "#1f2937", display: "flex", gap: 1, px: 1.5, py: 1.25 }}>
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          Shows actual processed payroll figures when payroll has been run for the selected month; otherwise falls back to the employee's configured CTC/salary structure so a figure is always available.
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
