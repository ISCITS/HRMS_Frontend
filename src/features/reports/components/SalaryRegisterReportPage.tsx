"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Autocomplete, Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import type { PayrollResultDetailRecord, PayrollResultLineRecord, PayrollResultListRecord } from "@/features/payroll/types";

type SearchForm = {
  intEmployeeID: number | "";
  intFinancialYearStart: number;
  strStatus: string;
};

type MonthColumn = {
  intMonth: number;
  intYear: number;
  strKey: string;
  strLabel: string;
};

type SalaryRegisterLine = {
  strKey: string;
  strComponent: string;
  strSection: "earnings" | "deductions" | "employer" | "summary";
  intOrder: number;
  dicAmounts: Record<string, number>;
  blnSummary?: boolean;
};

const lstStatusOptions = ["All", "Calculated", "Approved", "Published", "Paid"];
const lstMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getCurrentFinancialYearStart() {
  const objDate = new Date();
  return objDate.getMonth() + 1 >= 4 ? objDate.getFullYear() : objDate.getFullYear() - 1;
}

function buildMonthColumns(intFinancialYearStart: number): MonthColumn[] {
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((intMonth) => {
    const intYear = intMonth >= 4 ? intFinancialYearStart : intFinancialYearStart + 1;
    return {
      intMonth,
      intYear,
      strKey: `${intYear}-${String(intMonth).padStart(2, "0")}`,
      strLabel: lstMonthNames[intMonth - 1],
    };
  });
}

function getFinancialYearStart(strDate: string | null | undefined) {
  if (!strDate) return null;
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return null;
  return objDate.getMonth() + 1 >= 4 ? objDate.getFullYear() : objDate.getFullYear() - 1;
}

function getNumber(decValue: number | null | undefined) {
  return Number(decValue ?? 0);
}

function formatAmount(decValue: number) {
  if (!decValue) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(decValue);
}

function getLineSection(dicLine: PayrollResultLineRecord): SalaryRegisterLine["strSection"] {
  const strLineType = String(dicLine.strLineType ?? "").toLowerCase();
  const strCategory = String(dicLine.strComponentCategory ?? "").toLowerCase();
  if (dicLine.blnIsEmployerContribution || strLineType.includes("employer")) return "employer";
  if (dicLine.blnIsEmployeeDeduction || dicLine.blnIsTaxLine || strLineType.includes("deduction") || strLineType.includes("tax") || strCategory.includes("deduction")) {
    return "deductions";
  }
  return "earnings";
}

function addAmount(dicAmounts: Record<string, number>, strMonthKey: string, decAmount: number) {
  dicAmounts[strMonthKey] = getNumber(dicAmounts[strMonthKey]) + getNumber(decAmount);
}

function buildSalaryRegisterLines(lstDetails: PayrollResultDetailRecord[], lstMonths: MonthColumn[]) {
  const mapLines = new Map<string, SalaryRegisterLine>();
  const dicGross: Record<string, number> = {};
  const dicDeduction: Record<string, number> = {};
  const dicNet: Record<string, number> = {};

  lstDetails.forEach((dicDetail) => {
    const strMonthKey = String(dicDetail.dtPayrollMonth ?? "").slice(0, 7);
    if (!lstMonths.some((dicMonth) => dicMonth.strKey === strMonthKey)) return;

    addAmount(dicGross, strMonthKey, getNumber(dicDetail.decGrossEarningsAmount ?? dicDetail.decGrossAmount));
    addAmount(dicDeduction, strMonthKey, getNumber(dicDetail.decEmployeeDeductionTotal ?? dicDetail.decDeductionAmount) + getNumber(dicDetail.decTaxTotal ?? dicDetail.decTaxAmount));
    addAmount(dicNet, strMonthKey, getNumber(dicDetail.decNetPayAmount));

    dicDetail.lstLines?.forEach((dicLine) => {
      if (!dicLine.blnIncludeInPayslip && !dicLine.blnIncludeInGross && !dicLine.blnIncludeInNetPay && !dicLine.blnIsEmployerContribution) return;
      const strSection = getLineSection(dicLine);
      const strKey = `${strSection}:${dicLine.strComponentCode || dicLine.intSalaryComponentID}:${dicLine.strComponentName}`;
      const dicExisting = mapLines.get(strKey) ?? {
        strKey,
        strComponent: dicLine.strComponentName || dicLine.strComponentCode || "Salary Component",
        strSection,
        intOrder: strSection === "earnings" ? 10 : strSection === "deductions" ? 30 : 50,
        dicAmounts: {},
      };
      addAmount(dicExisting.dicAmounts, strMonthKey, getNumber(dicLine.decAmount));
      mapLines.set(strKey, dicExisting);
    });
  });

  const lstRows = Array.from(mapLines.values())
    .filter((dicLine) => lstMonths.some((dicMonth) => getNumber(dicLine.dicAmounts[dicMonth.strKey]) !== 0))
    .sort((dicLeft, dicRight) => dicLeft.intOrder - dicRight.intOrder || dicLeft.strComponent.localeCompare(dicRight.strComponent));

  const intFirstDeductionIndex = lstRows.findIndex((dicLine) => dicLine.strSection === "deductions");
  const intFirstEmployerIndex = lstRows.findIndex((dicLine) => dicLine.strSection === "employer");
  const dicGrossRow: SalaryRegisterLine = { strKey: "summary:gross", strComponent: "Gross Pay", strSection: "summary", intOrder: 20, dicAmounts: dicGross, blnSummary: true };
  const dicDeductionRow: SalaryRegisterLine = { strKey: "summary:deduction", strComponent: "Gross Deduction", strSection: "summary", intOrder: 40, dicAmounts: dicDeduction, blnSummary: true };
  const dicNetRow: SalaryRegisterLine = { strKey: "summary:net", strComponent: "Net Pay", strSection: "summary", intOrder: 45, dicAmounts: dicNet, blnSummary: true };

  const lstWithSummaries = [...lstRows];
  lstWithSummaries.splice(intFirstDeductionIndex === -1 ? lstWithSummaries.length : intFirstDeductionIndex, 0, dicGrossRow);
  const intDeductionInsertIndex = intFirstEmployerIndex === -1 ? lstWithSummaries.length : lstWithSummaries.findIndex((dicLine) => dicLine.strSection === "employer");
  lstWithSummaries.splice(deduplicateIndex(intDeductionInsertIndex, lstWithSummaries.length), 0, dicDeductionRow, dicNetRow);
  return lstWithSummaries;
}

function deduplicateIndex(intIndex: number, intFallback: number) {
  return intIndex < 0 ? intFallback : intIndex;
}

function getRowTotal(dicLine: SalaryRegisterLine, lstMonths: MonthColumn[]) {
  return lstMonths.reduce((decTotal, dicMonth) => decTotal + getNumber(dicLine.dicAmounts[dicMonth.strKey]), 0);
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

function printReport(strHtml: string) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) return;
  objWindow.document.write(strHtml);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function SalaryRegisterReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "SALARY_REGISTER",
    "REPORT_SALARY_REGISTER",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [lstPayrollRows, setLstPayrollRows] = useState<PayrollResultListRecord[]>([]);
  const [lstDetails, setLstDetails] = useState<PayrollResultDetailRecord[]>([]);
  const [blnLoadingMasters, setBlnLoadingMasters] = useState(true);
  const [blnLoadingReport, setBlnLoadingReport] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearch, setDicSearch] = useState<SearchForm>({
    intEmployeeID: "",
    intFinancialYearStart: getCurrentFinancialYearStart(),
    strStatus: "All",
  });

  useEffect(() => {
    if (!blnCanView) return;
    let blnActive = true;
    setBlnLoadingMasters(true);
    Promise.all([employeeService.getEmployees(), payrollReportService.getPayrollRegisterRows({})])
      .then(([lstEmployeeRows, lstResultRows]) => {
        if (!blnActive) return;
        setLstEmployees(lstEmployeeRows.filter((dicEmployee) => !dicEmployee.blnIsPartialSave));
        setLstPayrollRows(lstResultRows);
        const intLatestFinancialYear = lstResultRows
          .map((dicRow) => getFinancialYearStart(dicRow.dtPayrollMonth))
          .filter((intYear): intYear is number => intYear !== null)
          .sort((intLeft, intRight) => intRight - intLeft)[0];
        if (intLatestFinancialYear) {
          setDicSearch((dicPrevious) => ({ ...dicPrevious, intFinancialYearStart: intLatestFinancialYear }));
        }
      })
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load salary register filters."))
      .finally(() => {
        if (blnActive) setBlnLoadingMasters(false);
      });
    return () => {
      blnActive = false;
    };
  }, [blnCanView]);

  const mapEmployeeByID = useMemo(() => new Map(lstEmployees.map((dicEmployee) => [dicEmployee.intID, dicEmployee])), [lstEmployees]);
  const lstMonths = useMemo(() => buildMonthColumns(dicSearch.intFinancialYearStart), [dicSearch.intFinancialYearStart]);
  const lstFinancialYears = useMemo(() => {
    const lstYears = getUniqueOptions([
      ...lstPayrollRows.map((dicRow) => String(getFinancialYearStart(dicRow.dtPayrollMonth) ?? "")),
      String(getCurrentFinancialYearStart()),
    ]).map(Number).filter(Boolean);
    return lstYears.sort((intLeft, intRight) => intRight - intLeft);
  }, [lstPayrollRows]);
  const dicSelectedEmployee = dicSearch.intEmployeeID ? mapEmployeeByID.get(dicSearch.intEmployeeID) : null;
  const lstRegisterLines = useMemo(() => buildSalaryRegisterLines(lstDetails, lstMonths), [lstDetails, lstMonths]);

  function getFilteredPayrollRows() {
    return lstPayrollRows.filter((dicRow) => {
      const dicEmployee = mapEmployeeByID.get(dicRow.intEmployeeID);
      const blnMatchesEmployee = dicSearch.intEmployeeID ? dicRow.intEmployeeID === dicSearch.intEmployeeID : false;
      return blnMatchesEmployee
        && getFinancialYearStart(dicRow.dtPayrollMonth) === dicSearch.intFinancialYearStart
        && Boolean(dicEmployee)
        && (dicSearch.strStatus === "All" || dicRow.strStatus === dicSearch.strStatus);
    });
  }

  async function loadReport() {
    setStrError("");
    setLstDetails([]);
    if (!dicSearch.intEmployeeID) {
      setStrError("Select an employee to generate the Salary register.");
      return;
    }
    const lstRows = getFilteredPayrollRows();
    if (!lstRows.length) {
      setStrError("No payroll results found for the selected employee and filters.");
      return;
    }
    setBlnLoadingReport(true);
    try {
      const lstDetailRows = await Promise.all(lstRows.map((dicRow) => payrollResultService.getPayrollResultById(dicRow.intID)));
      setLstDetails(lstDetailRows);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load Salary register.");
    } finally {
      setBlnLoadingReport(false);
    }
  }

  function clearFilters() {
    setDicSearch({
      intEmployeeID: "",
      intFinancialYearStart: getCurrentFinancialYearStart(),
      strStatus: "All",
    });
    setLstDetails([]);
    setStrError("");
  }

  const strFinancialYearLabel = `${dicSearch.intFinancialYearStart}-${String(dicSearch.intFinancialYearStart + 1).slice(-2)}`;
  const strReportMarkup = useMemo(() => {
    const strRows = lstRegisterLines.map((dicLine) => `
      <tr class="${dicLine.blnSummary ? "summary" : ""}">
        <td>${dicLine.strComponent}</td>
        ${lstMonths.map((dicMonth) => `<td>${formatAmount(getNumber(dicLine.dicAmounts[dicMonth.strKey]))}</td>`).join("")}
        <td>${formatAmount(getRowTotal(dicLine, lstMonths))}</td>
      </tr>
    `).join("");
    return `
      <html>
        <head>
          <title>Salary register</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            .report { border: 1px solid #4b5563; }
            h1 { font-size: 22px; text-align: center; margin: 8px 0 18px; }
            h2 { font-size: 16px; text-align: center; margin: 0; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid #6b7280; }
            .meta div { padding: 5px 8px; }
            .meta b { display: inline-block; min-width: 150px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #6b7280; padding: 5px 6px; }
            th { text-align: center; }
            td:not(:first-child) { text-align: right; }
            .summary { background: #c9c9c9; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="report">
            <h1>Salary register</h1>
            <h2>YTD Salary Statement as on March ${dicSearch.intFinancialYearStart + 1}</h2>
            <div class="meta">
              <div><b>Employee ID</b>${dicSelectedEmployee?.strEmployeeCode ?? "-"}</div>
              <div><b>Department</b>${dicSelectedEmployee?.strDepartmentName ?? "-"}</div>
              <div><b>Name</b>${dicSelectedEmployee?.strFullName ?? "-"}</div>
              <div><b>Location</b>${dicSelectedEmployee?.strLocationName ?? "-"}</div>
              <div><b>Designation</b>${dicSelectedEmployee?.strDesignationName ?? "-"}</div>
              <div><b>Financial Year</b>${strFinancialYearLabel}</div>
            </div>
            <table>
              <thead><tr><th>Component</th>${lstMonths.map((dicMonth) => `<th>${dicMonth.strLabel}</th>`).join("")}<th>Total</th></tr></thead>
              <tbody>${strRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  }, [dicSearch.intFinancialYearStart, dicSelectedEmployee, lstMonths, lstRegisterLines, strFinancialYearLabel]);

  if (blnRightsLoading || blnLoadingMasters) {
    return <BlockingLoader blnOpen strLabel="Loading salary register..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Salary register</Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField} sx={{ flex: "1 1 320px", minWidth: 260 }}>
            <Autocomplete
              options={lstEmployees}
              value={dicSelectedEmployee ?? null}
              getOptionLabel={(dicEmployee) => `${dicEmployee.strEmployeeCode} - ${dicEmployee.strFullName}`}
              onChange={(_, dicEmployee) => setDicSearch((dicPrevious) => ({ ...dicPrevious, intEmployeeID: dicEmployee?.intID ?? "" }))}
              renderInput={(objParams) => <TextField {...objParams} label="Employee Name" placeholder="Select employee" />}
            />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 230px", minWidth: 190 }}>
            <TextField select label="Financial Year" value={dicSearch.intFinancialYearStart} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, intFinancialYearStart: Number(objEvent.target.value) }))} fullWidth>
              {lstFinancialYears.map((intYear) => <MenuItem key={intYear} value={intYear}>{intYear}-{String(intYear + 1).slice(-2)}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField} sx={{ flex: "0 1 230px", minWidth: 190 }}>
            <TextField select label="Status" value={dicSearch.strStatus} onChange={(objEvent) => setDicSearch((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value }))} fullWidth>
              {lstStatusOptions.map((strStatus) => <MenuItem key={strStatus} value={strStatus}>{strStatus === "All" ? "All statuses" : strStatus}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.searchActions} sx={{ flex: "0 0 auto", ml: "auto" }}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={loadReport} disabled={blnLoadingReport} sx={{ whiteSpace: "nowrap" }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnLoadingReport} sx={{ whiteSpace: "nowrap" }}>Clear</Button>
          </Box>
        </Box>
      </Box>

      {!blnCanView && !strError ? <Alert severity="warning">Salary register view access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Box className={styles.tableCard}>
        <Box sx={{ alignItems: "center", display: "flex", flex: "0 0 auto", justifyContent: "space-between", gap: 2, mb: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>Salary register</Typography>
          <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 1 }}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadExcel(`salary-register-${strFinancialYearLabel}.xls`, strReportMarkup)} disabled={!lstRegisterLines.length} sx={{ whiteSpace: "nowrap" }}>Export Excel</Button> : null}
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => printReport(strReportMarkup)} disabled={!lstRegisterLines.length} sx={{ whiteSpace: "nowrap" }}>Download PDF</Button> : null}
          </Box>
        </Box>

        <Box sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", pr: 0.5, scrollbarGutter: "stable" }}>
          {blnLoadingReport ? (
            <Box sx={{ alignItems: "center", display: "flex", gap: 1.5, justifyContent: "center", minHeight: 220 }}>
              <CircularProgress size={24} />
              <Typography>Building salary register...</Typography>
            </Box>
          ) : (
            <Box sx={{ border: "1px solid #4b5563", minWidth: 1280 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, textAlign: "center", py: 1 }}>Salary register</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 700, textAlign: "center", mt: 2, pb: 1 }}>YTD Salary Statement as on March {dicSearch.intFinancialYearStart + 1}</Typography>
              <Box sx={{ borderTop: "1px solid #6b7280", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                <Box sx={{ p: 0.75 }}><b>Employee ID</b><Box component="span" sx={{ ml: 8 }}>{dicSelectedEmployee?.strEmployeeCode ?? "-"}</Box></Box>
                <Box sx={{ p: 0.75 }}><b>Department</b><Box component="span" sx={{ ml: 8 }}>{dicSelectedEmployee?.strDepartmentName ?? "-"}</Box></Box>
                <Box sx={{ p: 0.75 }}><b>Name</b><Box component="span" sx={{ ml: 13 }}>{dicSelectedEmployee?.strFullName ?? "-"}</Box></Box>
                <Box sx={{ p: 0.75 }}><b>Location</b><Box component="span" sx={{ ml: 10 }}>{dicSelectedEmployee?.strLocationName ?? "-"}</Box></Box>
                <Box sx={{ p: 0.75 }}><b>Designation</b><Box component="span" sx={{ ml: 8 }}>{dicSelectedEmployee?.strDesignationName ?? "-"}</Box></Box>
                <Box sx={{ p: 0.75 }}><b>Financial Year</b><Box component="span" sx={{ ml: 6 }}>{strFinancialYearLabel}</Box></Box>
              </Box>
              <Box component="table" sx={{ borderCollapse: "collapse", width: "100%", "& th, & td": { border: "1px solid #6b7280", fontSize: 13, p: "4px 5px" }, "& th": { fontWeight: 700 }, "& td:not(:first-of-type)": { textAlign: "right" } }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Component</th>
                    {lstMonths.map((dicMonth) => <th key={dicMonth.strKey}>{dicMonth.strLabel}</th>)}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lstRegisterLines.length ? lstRegisterLines.map((dicLine) => (
                    <tr key={dicLine.strKey} style={dicLine.blnSummary ? { background: "#c9c9c9", fontWeight: 700 } : undefined}>
                      <td>{dicLine.strComponent}</td>
                      {lstMonths.map((dicMonth) => <td key={dicMonth.strKey}>{formatAmount(getNumber(dicLine.dicAmounts[dicMonth.strKey]))}</td>)}
                      <td>{formatAmount(getRowTotal(dicLine, lstMonths))}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={14} style={{ textAlign: "center", padding: 24 }}>Select filters and search to generate the Salary register.</td>
                    </tr>
                  )}
                </tbody>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
