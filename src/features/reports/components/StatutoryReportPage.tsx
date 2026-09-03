"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { type InputHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import type { StatutoryReportCode, StatutoryReportRow } from "@/features/payroll/types";
import ReportMultiSelectField, { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: string;
  strStatutoryCode: StatutoryReportCode;
  strDepartment: string;
  strLocation: string;
  strPayrollMonth: string;
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strStatutoryCode: "ALL",
  strDepartment: "",
  strLocation: "",
  strPayrollMonth: "",
};
const lstRowsPerPageOptions = [10, 20, 50];
const lstReportTypes: Array<{ strCode: StatutoryReportCode; strLabel: string; strFile: string }> = [
  { strCode: "ALL", strLabel: "Statutory Summary Report", strFile: "statutory-summary" },
  { strCode: "PF", strLabel: "PF Report / PF ECR Report", strFile: "pf-ecr-report" },
  { strCode: "ESI", strLabel: "ESI Report / ESI Contribution Report", strFile: "esi-contribution-report" },
  { strCode: "PT", strLabel: "Professional Tax Report", strFile: "professional-tax-report" },
  { strCode: "LWF", strLabel: "Labour Welfare Fund Report", strFile: "labour-welfare-fund-report" },
];

type StatutorySummaryRow = {
  intID: number;
  dtPayrollMonth: string | null;
  strEmployeeCode: string;
  strEmployeeName: string;
  strStatus: string;
  decPfBasis: number;
  decPfEmployee: number;
  decPfEmployer: number;
  decEsiBasis: number;
  decEsiEmployee: number;
  decEsiEmployer: number;
  decPtEmployee: number;
  decLwfEmployee: number;
  decGratuityBasis: number;
  decGratuityEmployer: number;
  decTotalEmployee: number;
  decTotalEmployer: number;
  decGrandTotal: number;
};

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(decValue || 0);
}

function formatPercent(decValue: number | null) {
  return decValue === null || decValue === undefined ? "-" : `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 }).format(decValue)}%`;
}

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function getReportMeta(strCode: StatutoryReportCode) {
  return lstReportTypes.find((dicType) => dicType.strCode === strCode) ?? lstReportTypes[0];
}

function getSummaryKey(dicRow: StatutoryReportRow) {
  return `${dicRow.intEmployeePayrollResultID}:${dicRow.intEmployeeID}:${dicRow.dtPayrollMonth ?? ""}`;
}

function buildSummaryRows(lstRows: StatutoryReportRow[]): StatutorySummaryRow[] {
  const mapRows = new Map<string, StatutorySummaryRow>();
  lstRows.forEach((dicRow) => {
    const strKey = getSummaryKey(dicRow);
    const dicSummary = mapRows.get(strKey) ?? {
      intID: dicRow.intEmployeePayrollResultID,
      dtPayrollMonth: dicRow.dtPayrollMonth,
      strEmployeeCode: dicRow.strEmployeeCode,
      strEmployeeName: dicRow.strEmployeeName,
      strStatus: dicRow.strStatus,
      decPfBasis: 0,
      decPfEmployee: 0,
      decPfEmployer: 0,
      decEsiBasis: 0,
      decEsiEmployee: 0,
      decEsiEmployer: 0,
      decPtEmployee: 0,
      decLwfEmployee: 0,
      decGratuityBasis: 0,
      decGratuityEmployer: 0,
      decTotalEmployee: 0,
      decTotalEmployer: 0,
      decGrandTotal: 0,
    };
    const strCode = dicRow.strStatutoryCode.toUpperCase();
    if (strCode === "PF") {
      dicSummary.decPfBasis += dicRow.decBasisAmount || 0;
      dicSummary.decPfEmployee += dicRow.decEmployeeAmount || 0;
      dicSummary.decPfEmployer += dicRow.decEmployerAmount || 0;
    } else if (strCode === "ESI") {
      dicSummary.decEsiBasis += dicRow.decBasisAmount || 0;
      dicSummary.decEsiEmployee += dicRow.decEmployeeAmount || 0;
      dicSummary.decEsiEmployer += dicRow.decEmployerAmount || 0;
    } else if (strCode === "PT") {
      dicSummary.decPtEmployee += dicRow.decEmployeeAmount || 0;
    } else if (strCode === "LWF") {
      dicSummary.decLwfEmployee += dicRow.decEmployeeAmount || 0;
    } else if (strCode === "GRATUITY") {
      dicSummary.decGratuityBasis += dicRow.decBasisAmount || 0;
      dicSummary.decGratuityEmployer += dicRow.decEmployerAmount || 0;
    }
    dicSummary.decTotalEmployee += dicRow.decEmployeeAmount || 0;
    dicSummary.decTotalEmployer += dicRow.decEmployerAmount || 0;
    dicSummary.decGrandTotal += dicRow.decTotalAmount || 0;
    mapRows.set(strKey, dicSummary);
  });
  return Array.from(mapRows.values());
}

function downloadCsv(strFileName: string, lstRows: StatutoryReportRow[]) {
  const lstHeaders = ["Payroll Period", "Employee Code", "Employee Name", "Statutory", "Basis", "Employee Rate", "Employer Rate", "Employee Amount", "Employer Amount", "Total", "Ceiling", "Mode", "Status", "Remarks"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) => [
      dicRow.dtPayrollMonth ?? "",
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      dicRow.strStatutoryName,
      dicRow.decBasisAmount,
      dicRow.decEmployeeRatePercent ?? "",
      dicRow.decEmployerRatePercent ?? "",
      dicRow.decEmployeeAmount,
      dicRow.decEmployerAmount,
      dicRow.decTotalAmount,
      dicRow.decCeilingAmount ?? "",
      dicRow.strCalculationMode ?? "",
      dicRow.strStatus,
      dicRow.strRemarks ?? "",
    ].map(toCsvValue).join(",")),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: StatutoryReportRow[]) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${formatMonth(dicRow.dtPayrollMonth)}</td><td>${dicRow.strEmployeeCode}</td><td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strStatutoryName}</td><td>${formatCurrency(dicRow.decBasisAmount)}</td><td>${formatPercent(dicRow.decEmployeeRatePercent)}</td>
      <td>${formatPercent(dicRow.decEmployerRatePercent)}</td><td>${formatCurrency(dicRow.decEmployeeAmount)}</td>
      <td>${formatCurrency(dicRow.decEmployerAmount)}</td><td>${formatCurrency(dicRow.decTotalAmount)}</td><td>${dicRow.strStatus}</td>
    </tr>`).join("");
  objWindow.document.write(`<html><head><title>${strTitle}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 16px;font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>${strTitle}</h1><table><thead><tr><th>Payroll Period</th><th>Employee Code</th><th>Employee Name</th><th>Statutory</th><th>Basis</th><th>Employee Rate</th><th>Employer Rate</th><th>Employee Amount</th><th>Employer Amount</th><th>Total</th><th>Status</th></tr></thead><tbody>${strRows}</tbody></table></body></html>`);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function StatutoryReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["REPORTS", "STATUTORY_REPORT", "REPORT_STATUTORY", "PAYROLL_RESULTS", "PAYROLL_RESULT"]);
  const [lstRows, setLstRows] = useState<StatutoryReportRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [blnFilterDialogOpen, setBlnFilterDialogOpen] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getStatutoryReportRows(objFilters));
      setBlnHasLoadedRows(true);
      setSetSelectedRowIDs(new Set());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load statutory report.");
    } finally {
      setBlnLoading(false);
    }
  }

  const lstFilteredRows = lstRows;
  const dicFilterOptions = useMemo(() => ({
    lstEmployees: getUniqueOptions(lstRows.flatMap((dicRow) => [
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      `${dicRow.strEmployeeCode} - ${dicRow.strEmployeeName}`,
    ])),
    lstRuns: getUniqueOptions(lstRows.flatMap((dicRow) => [dicRow.strRunCode, dicRow.strRunName])),
    lstMonths: getUniqueOptions(lstRows.map((dicRow) => dicRow.dtPayrollMonth?.slice(0, 7))),
    lstDepartments: getUniqueOptions(lstRows.map((dicRow) => dicRow.strDepartmentName)),
    lstLocations: getUniqueOptions(lstRows.map((dicRow) => dicRow.strLocationName)),
    lstStatuses: getUniqueOptions(lstRows.map((dicRow) => dicRow.strStatus)),
  }), [lstRows]);
  const dicTotals = useMemo(() => lstFilteredRows.reduce((dicAccumulator, dicRow) => ({
    decBasis: dicAccumulator.decBasis + (dicRow.decBasisAmount || 0),
    decEmployee: dicAccumulator.decEmployee + (dicRow.decEmployeeAmount || 0),
    decEmployer: dicAccumulator.decEmployer + (dicRow.decEmployerAmount || 0),
    decTotal: dicAccumulator.decTotal + (dicRow.decTotalAmount || 0),
  }), { decBasis: 0, decEmployee: 0, decEmployer: 0, decTotal: 0 }), [lstFilteredRows]);
  const blnSummaryReport = dicSearchApplied.strStatutoryCode === "ALL";
  const lstSummaryRows = useMemo(() => buildSummaryRows(lstFilteredRows), [lstFilteredRows]);
  const dicSummaryTotals = useMemo(() => lstSummaryRows.reduce((dicAccumulator, dicRow) => ({
    decPfEmployee: dicAccumulator.decPfEmployee + dicRow.decPfEmployee,
    decPfEmployer: dicAccumulator.decPfEmployer + dicRow.decPfEmployer,
    decEsiEmployee: dicAccumulator.decEsiEmployee + dicRow.decEsiEmployee,
    decEsiEmployer: dicAccumulator.decEsiEmployer + dicRow.decEsiEmployer,
    decPtEmployee: dicAccumulator.decPtEmployee + dicRow.decPtEmployee,
    decLwfEmployee: dicAccumulator.decLwfEmployee + dicRow.decLwfEmployee,
    decGratuityEmployer: dicAccumulator.decGratuityEmployer + dicRow.decGratuityEmployer,
    decTotalEmployee: dicAccumulator.decTotalEmployee + dicRow.decTotalEmployee,
    decTotalEmployer: dicAccumulator.decTotalEmployer + dicRow.decTotalEmployer,
    decGrandTotal: dicAccumulator.decGrandTotal + dicRow.decGrandTotal,
  }), { decPfEmployee: 0, decPfEmployer: 0, decEsiEmployee: 0, decEsiEmployer: 0, decPtEmployee: 0, decLwfEmployee: 0, decGratuityEmployer: 0, decTotalEmployee: 0, decTotalEmployer: 0, decGrandTotal: 0 }), [lstSummaryRows]);
  const lstExportRows = setSelectedRowIDs.size > 0 ? lstFilteredRows.filter((dicRow) => setSelectedRowIDs.has(dicRow.intID)) : lstFilteredRows;
  const blnAllFilteredSelected = lstFilteredRows.length > 0 && lstFilteredRows.every((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const blnSomeFilteredSelected = lstFilteredRows.some((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const dicReportMeta = getReportMeta(dicSearchApplied.strStatutoryCode);

  function toggleFilteredRows(blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      lstFilteredRows.forEach((dicRow) => blnChecked ? setNext.add(dicRow.intID) : setNext.delete(dicRow.intID));
      return setNext;
    });
  }

  function applyFilters(dicFilters: SearchForm) {
    setDicSearchDraft(dicFilters);
    setDicSearchApplied(dicFilters);
    setBlnFilterDialogOpen(false);
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    setDicSearchApplied(dicEmptySearch);
    loadRows(dicEmptySearch).catch(() => undefined);
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    setDicSearchApplied(dicEmptySearch);
    loadRows(dicEmptySearch).catch(() => undefined);
  }, [blnCanView]);

  const lstDetailTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        intID: dicRow.intID,
        select: (
          <Checkbox
            size="small"
            checked={setSelectedRowIDs.has(dicRow.intID)}
            onChange={(objEvent) =>
              setSetSelectedRowIDs((setPrevious) => {
                const setNext = new Set(setPrevious);
                if (objEvent.target.checked) {
                  setNext.add(dicRow.intID);
                } else {
                  setNext.delete(dicRow.intID);
                }
                return setNext;
              })
            }
            inputProps={{ "controlId": "reports.statutory.row.select.checkbox", "data-row-key": dicRow.intID } as InputHTMLAttributes<HTMLInputElement>}
          />
        ),
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strStatutoryName: dicRow.strStatutoryName,
        decBasisAmount: formatCurrency(dicRow.decBasisAmount),
        decBasisAmountSortValue: Number(dicRow.decBasisAmount ?? 0),
        decEmployeeRatePercent: formatPercent(dicRow.decEmployeeRatePercent),
        decEmployeeRatePercentSortValue: Number(dicRow.decEmployeeRatePercent ?? 0),
        decEmployerRatePercent: formatPercent(dicRow.decEmployerRatePercent),
        decEmployerRatePercentSortValue: Number(dicRow.decEmployerRatePercent ?? 0),
        decEmployeeAmount: formatCurrency(dicRow.decEmployeeAmount),
        decEmployeeAmountSortValue: Number(dicRow.decEmployeeAmount ?? 0),
        decEmployerAmount: formatCurrency(dicRow.decEmployerAmount),
        decEmployerAmountSortValue: Number(dicRow.decEmployerAmount ?? 0),
        decTotalAmount: formatCurrency(dicRow.decTotalAmount),
        decTotalAmountSortValue: Number(dicRow.decTotalAmount ?? 0),
        decCeilingAmount: dicRow.decCeilingAmount === null ? "-" : formatCurrency(dicRow.decCeilingAmount),
        decCeilingAmountSortValue: Number(dicRow.decCeilingAmount ?? 0),
        strCalculationMode: dicRow.strCalculationMode || "-",
        strStatus: dicRow.strStatus,
      })),
    [lstFilteredRows, setSelectedRowIDs],
  );

  const lstDetailTableColumns = useMemo<CommonTableColumn<(typeof lstDetailTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            size="small"
            checked={blnAllFilteredSelected}
            indeterminate={!blnAllFilteredSelected && blnSomeFilteredSelected}
            onChange={(objEvent) => toggleFilteredRows(objEvent.target.checked)}
            inputProps={{ "controlId": "reports.statutory.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
            disabled={lstFilteredRows.length === 0}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "strPayrollPeriod", headerName: "Payroll Period", width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 140 },
      { field: "strEmployeeName", headerName: "Employee Name", width: 220 },
      { field: "strStatutoryName", headerName: "Statutory", width: 170 },
      { field: "decBasisAmount", headerName: "Basis", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decBasisAmountSortValue },
      { field: "decEmployeeRatePercent", headerName: "Employee Rate", width: 130, align: "right", sortAccessor: (dicRow) => dicRow.decEmployeeRatePercentSortValue },
      { field: "decEmployerRatePercent", headerName: "Employer Rate", width: 130, align: "right", sortAccessor: (dicRow) => dicRow.decEmployerRatePercentSortValue },
      { field: "decEmployeeAmount", headerName: "Employee Amount", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decEmployeeAmountSortValue },
      { field: "decEmployerAmount", headerName: "Employer Amount", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decEmployerAmountSortValue },
      { field: "decTotalAmount", headerName: "Total", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decTotalAmountSortValue },
      { field: "decCeilingAmount", headerName: "Ceiling", width: 130, align: "right", sortAccessor: (dicRow) => dicRow.decCeilingAmountSortValue },
      { field: "strCalculationMode", headerName: "Mode", width: 140 },
      { field: "strStatus", headerName: "Status", width: 120 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, lstDetailTableRows, lstFilteredRows.length],
  );

  const lstSummaryTableRows = useMemo(
    () =>
      lstSummaryRows.map((dicRow) => ({
        intID: dicRow.intID,
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        decPfEmployee: formatCurrency(dicRow.decPfEmployee),
        decPfEmployeeSortValue: Number(dicRow.decPfEmployee ?? 0),
        decPfEmployer: formatCurrency(dicRow.decPfEmployer),
        decPfEmployerSortValue: Number(dicRow.decPfEmployer ?? 0),
        decEsiEmployee: formatCurrency(dicRow.decEsiEmployee),
        decEsiEmployeeSortValue: Number(dicRow.decEsiEmployee ?? 0),
        decEsiEmployer: formatCurrency(dicRow.decEsiEmployer),
        decEsiEmployerSortValue: Number(dicRow.decEsiEmployer ?? 0),
        decPtEmployee: formatCurrency(dicRow.decPtEmployee),
        decPtEmployeeSortValue: Number(dicRow.decPtEmployee ?? 0),
        decLwfEmployee: formatCurrency(dicRow.decLwfEmployee),
        decLwfEmployeeSortValue: Number(dicRow.decLwfEmployee ?? 0),
        decGratuityEmployer: formatCurrency(dicRow.decGratuityEmployer),
        decGratuityEmployerSortValue: Number(dicRow.decGratuityEmployer ?? 0),
        decTotalEmployee: formatCurrency(dicRow.decTotalEmployee),
        decTotalEmployeeSortValue: Number(dicRow.decTotalEmployee ?? 0),
        decTotalEmployer: formatCurrency(dicRow.decTotalEmployer),
        decTotalEmployerSortValue: Number(dicRow.decTotalEmployer ?? 0),
        decGrandTotal: formatCurrency(dicRow.decGrandTotal),
        decGrandTotalSortValue: Number(dicRow.decGrandTotal ?? 0),
        strStatus: dicRow.strStatus,
      })),
    [lstSummaryRows],
  );

  const lstSummaryTableColumns = useMemo<CommonTableColumn<(typeof lstSummaryTableRows)[number]>[]>(
    () => [
      { field: "strPayrollPeriod", headerName: "Payroll Period", width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 140 },
      { field: "strEmployeeName", headerName: "Employee Name", width: 220 },
      { field: "decPfEmployee", headerName: "PF Employee", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decPfEmployeeSortValue },
      { field: "decPfEmployer", headerName: "PF Employer", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decPfEmployerSortValue },
      { field: "decEsiEmployee", headerName: "ESI Employee", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decEsiEmployeeSortValue },
      { field: "decEsiEmployer", headerName: "ESI Employer", width: 140, align: "right", sortAccessor: (dicRow) => dicRow.decEsiEmployerSortValue },
      { field: "decPtEmployee", headerName: "PT", width: 110, align: "right", sortAccessor: (dicRow) => dicRow.decPtEmployeeSortValue },
      { field: "decLwfEmployee", headerName: "LWF", width: 110, align: "right", sortAccessor: (dicRow) => dicRow.decLwfEmployeeSortValue },
      { field: "decGratuityEmployer", headerName: "Gratuity Employer", width: 170, align: "right", sortAccessor: (dicRow) => dicRow.decGratuityEmployerSortValue },
      { field: "decTotalEmployee", headerName: "Total Employee", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decTotalEmployeeSortValue },
      { field: "decTotalEmployer", headerName: "Total Employer", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decTotalEmployerSortValue },
      { field: "decGrandTotal", headerName: "Grand Total", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decGrandTotalSortValue },
      { field: "strStatus", headerName: "Status", width: 120 },
    ],
    [lstSummaryTableRows],
  );

  if (blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel="Loading statutory reports..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Statutory Reports</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box />
        </Box>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField}>
            <TextField select value={dicSearchDraft.strStatutoryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatutoryCode: objEvent.target.value as StatutoryReportCode }))} fullWidth controlId="reports.statutory.report-type.select">
              {lstReportTypes.map((dicType) => <MenuItem key={dicType.strCode} value={dicType.strCode}>{dicType.strLabel}</MenuItem>)}
            </TextField>
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchEmployee} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} options={dicFilterOptions.lstEmployees} placeholder="Search by employee code or name" controlId="reports.statutory.employee-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchRun} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} options={dicFilterOptions.lstRuns} placeholder="Payroll period or run" controlId="reports.statutory.run-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strPayrollMonth} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} options={dicFilterOptions.lstMonths} label="Payroll Month" placeholder="Payroll Month" controlId="reports.statutory.payroll-month.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField value={dicSearchDraft.strDepartment} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} options={dicFilterOptions.lstDepartments} placeholder="Department" controlId="reports.statutory.department.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField value={dicSearchDraft.strLocation} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} options={dicFilterOptions.lstLocations} placeholder="Location" controlId="reports.statutory.location.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField label="Status" value={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} options={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} placeholder="All Statuses" controlId="reports.statutory.status.select" />
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} controlId="reports.statutory.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reports.statutory.clear.button">Clear</Button>
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          alignItems: "center",
          backgroundColor: "#f8fbff",
          border: "1px solid rgba(191,219,254,0.7)",
          borderRadius: "16px",
          color: "#1f2937",
          display: "flex",
          gap: 1,
          px: 1.5,
          py: 1.25,
        }}
      >
        <InfoOutlinedIcon sx={{ color: "#2b6cb0", fontSize: 20 }} />
        <Typography sx={{ color: "inherit", lineHeight: 1.5 }}>
          PF, ESI, professional tax, labour welfare fund, summary, challan, payment, and return-ready statutory payroll data.
        </Typography>
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Statutory report view access is not available for your user group.</Alert> : null}
        <BlockingLoader blnOpen={blnLoading} strLabel="Loading statutory report rows..." />
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={(blnSummaryReport ? lstSummaryTableColumns : lstDetailTableColumns) as unknown as CommonTableColumn<Record<string, ReactNode>>[]}
          rows={(blnSummaryReport ? lstSummaryTableRows : lstDetailTableRows) as unknown as Record<string, ReactNode>[]}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage="No statutory report rows found for the current filters."
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.statutory"
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(`${dicReportMeta.strFile}.csv`, lstExportRows)} controlId="reports.statutory.export-excel.button">Export Excel</Button> : null}
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicReportMeta.strLabel, lstExportRows)} controlId="reports.statutory.download-pdf.button">Download PDF</Button> : null}
              {!blnSummaryReport && setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
            </Box>
          )}
          footerContent={
            blnSummaryReport ? (
              lstSummaryRows.length > 0 ? (
                <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
                  <Box sx={{ minWidth: 2030, display: "grid", gridTemplateColumns: "140px 140px 220px 140px 140px 140px 140px 110px 110px 170px 150px 150px 150px 120px", alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 3" }}>Total</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decPfEmployee)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decPfEmployer)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decEsiEmployee)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decEsiEmployer)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decPtEmployee)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decLwfEmployee)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decGratuityEmployer)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decTotalEmployee)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decTotalEmployer)}</Typography>
                    <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicSummaryTotals.decGrandTotal)}</Typography>
                    <Box />
                  </Box>
                </Box>
              ) : null
            ) : lstFilteredRows.length > 0 ? (
              <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
                <Box sx={{ minWidth: 1936, display: "grid", gridTemplateColumns: "56px 140px 140px 220px 170px 140px 130px 130px 150px 150px 140px 130px 140px 120px", alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 5" }}>Total</Typography>
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decBasis)}</Typography>
                  <Box />
                  <Box />
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decEmployee)}</Typography>
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decEmployer)}</Typography>
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decTotal)}</Typography>
                  <Box />
                  <Box />
                  <Box />
                </Box>
              </Box>
            ) : null
          }
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
      <Dialog open={blnFilterDialogOpen} maxWidth="sm" fullWidth controlId="reports.statutory.filter.dialog">
        <DialogTitle>Statutory Reports</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            <TextField label="Report Type" select value={dicSearchDraft.strStatutoryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatutoryCode: objEvent.target.value as StatutoryReportCode }))} fullWidth>
              {lstReportTypes.map((dicType) => <MenuItem key={dicType.strCode} value={dicType.strCode}>{dicType.strLabel}</MenuItem>)}
            </TextField>
            <TextField label="Payroll Month" type="month" value={dicSearchDraft.strPayrollMonth} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Department" value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} fullWidth />
            <TextField label="Location" value={dicSearchDraft.strLocation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))} fullWidth />
            <TextField label="Status" select value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth>
              <MenuItem value="All">All</MenuItem><MenuItem value="Calculated">Calculated</MenuItem><MenuItem value="Approved">Approved</MenuItem><MenuItem value="Published">Published</MenuItem><MenuItem value="Paid">Paid</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => setDicSearchDraft(dicEmptySearch)} controlId="reports.statutory.filter.reset.button">Reset</Button>
          {blnHasLoadedRows ? <Button className={styles.secondaryButton} onClick={() => setBlnFilterDialogOpen(false)} controlId="reports.statutory.filter.close.button">Close</Button> : null}
          <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnLoading} controlId="reports.statutory.filter.show-report.button">Show Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
