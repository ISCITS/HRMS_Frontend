"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { type InputHTMLAttributes, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import type { StatutoryReportCode, StatutoryReportRow } from "@/features/payroll/types";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Calculated" | "Approved" | "Published" | "Paid";
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
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getStatutoryReportRows(objFilters));
      setBlnHasLoadedRows(true);
      setSetSelectedRowIDs(new Set());
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load statutory report.");
    } finally {
      setBlnLoading(false);
    }
  }

  const lstFilteredRows = lstRows;
  const dicTotals = useMemo(() => lstFilteredRows.reduce((dicAccumulator, dicRow) => ({
    decBasis: dicAccumulator.decBasis + (dicRow.decBasisAmount || 0),
    decEmployee: dicAccumulator.decEmployee + (dicRow.decEmployeeAmount || 0),
    decEmployer: dicAccumulator.decEmployer + (dicRow.decEmployerAmount || 0),
    decTotal: dicAccumulator.decTotal + (dicRow.decTotalAmount || 0),
  }), { decBasis: 0, decEmployee: 0, decEmployer: 0, decTotal: 0 }), [lstFilteredRows]);
  const blnSummaryReport = dicSearchApplied.strStatutoryCode === "ALL";
  const lstSummaryRows = useMemo(() => buildSummaryRows(lstFilteredRows), [lstFilteredRows]);
  const lstPagedSourceRows = blnSummaryReport ? lstSummaryRows : lstFilteredRows;
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
  const intPageCount = Math.max(1, Math.ceil(lstPagedSourceRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const lstVisibleSummaryRows = lstSummaryRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const lstExportRows = setSelectedRowIDs.size > 0 ? lstFilteredRows.filter((dicRow) => setSelectedRowIDs.has(dicRow.intID)) : lstFilteredRows;
  const blnAllVisibleSelected = lstVisibleRows.length > 0 && lstVisibleRows.every((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const blnSomeVisibleSelected = lstVisibleRows.some((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const dicReportMeta = getReportMeta(dicSearchApplied.strStatutoryCode);

  function toggleVisibleRows(blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      lstVisibleRows.forEach((dicRow) => blnChecked ? setNext.add(dicRow.intID) : setNext.delete(dicRow.intID));
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
    setLstRows([]);
    setSetSelectedRowIDs(new Set());
    setStrError("");
    setBlnHasLoadedRows(false);
    setIntPage(1);
  }

  if (blnRightsLoading || (blnLoading && !blnHasLoadedRows)) {
    return <BlockingLoader blnOpen strLabel="Loading statutory reports..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Reports / Statutory</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box>
            <Typography className={styles.title}>Statutory Reports</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.4 }}>PF, ESI, professional tax, labour welfare fund, summary, challan, payment, and return-ready statutory payroll data.</Typography>
          </Box>
        </Box>
        <Box className={styles.statutorySearchPanel}>
          <Box className={styles.statutorySearchLinePrimary}>
            <TextField select value={dicSearchDraft.strStatutoryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatutoryCode: objEvent.target.value as StatutoryReportCode }))} fullWidth controlId="reports.statutory.report-type.select">
              {lstReportTypes.map((dicType) => <MenuItem key={dicType.strCode} value={dicType.strCode}>{dicType.strLabel}</MenuItem>)}
            </TextField>
            <TextField value={dicSearchDraft.strSearchEmployee} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: objEvent.target.value }))} placeholder="Search by employee code or name" fullWidth controlId="reports.statutory.employee-search.input" />
            <TextField value={dicSearchDraft.strSearchRun} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: objEvent.target.value }))} placeholder="Payroll period or run" fullWidth controlId="reports.statutory.run-search.input" />
            <TextField type="month" value={dicSearchDraft.strPayrollMonth} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))} label="Payroll Month" fullWidth InputLabelProps={{ shrink: true }} controlId="reports.statutory.payroll-month.input" />
            <TextField value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} placeholder="Department" fullWidth controlId="reports.statutory.department.input" />
          </Box>
          <Box className={styles.statutorySearchLinePrimary}>
            <TextField value={dicSearchDraft.strLocation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))} placeholder="Location" fullWidth controlId="reports.statutory.location.input" />
            <TextField select label="Status" value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth controlId="reports.statutory.status.select">
              <MenuItem value="All">All Statuses</MenuItem><MenuItem value="Calculated">Calculated</MenuItem><MenuItem value="Approved">Approved</MenuItem><MenuItem value="Published">Published</MenuItem><MenuItem value="Paid">Paid</MenuItem>
            </TextField>
            <Box className={styles.searchActions}>
              <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} controlId="reports.statutory.search.button">Search</Button>
              <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reports.statutory.clear.button">Clear</Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Statutory report view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(`${dicReportMeta.strFile}.csv`, lstExportRows)} controlId="reports.statutory.export-excel.button">Export Excel</Button> : null}
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicReportMeta.strLabel, lstExportRows)} controlId="reports.statutory.download-pdf.button">Download PDF</Button> : null}
            {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
          </Box>
          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>Rows per page</Typography>
              <TextField select size="small" value={intRowsPerPage} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect} sx={{ width: 92 }} controlId="reports.statutory.rows-per-page.select">{lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={intOption}>{intOption}</MenuItem>)}</TextField>
              <Typography className={styles.paginationRange}>{lstPagedSourceRows.length === 0 ? "0 of 0" : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstPagedSourceRows.length)} of ${lstPagedSourceRows.length}`}</Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" showFirstButton showLastButton />
          </Box>
        </Box>
        <Box className={styles.tableWrap}>
          {blnSummaryReport ? <table className={styles.table}>
            <thead><tr><th>Payroll Period</th><th>Employee Code</th><th>Employee Name</th><th>PF Employee</th><th>PF Employer</th><th>ESI Employee</th><th>ESI Employer</th><th>PT</th><th>LWF</th><th>Gratuity Employer</th><th>Total Employee</th><th>Total Employer</th><th>Grand Total</th><th>Status</th></tr></thead>
            <tbody>
              {lstVisibleSummaryRows.length === 0 ? <tr><td colSpan={14} className={styles.emptyState}>No statutory report rows found for the current filters.</td></tr> : null}
              {lstVisibleSummaryRows.map((dicRow) => <tr key={dicRow.intID}><td>{formatMonth(dicRow.dtPayrollMonth)}</td><td>{dicRow.strEmployeeCode}</td><td>{dicRow.strEmployeeName}</td><td>{formatCurrency(dicRow.decPfEmployee)}</td><td>{formatCurrency(dicRow.decPfEmployer)}</td><td>{formatCurrency(dicRow.decEsiEmployee)}</td><td>{formatCurrency(dicRow.decEsiEmployer)}</td><td>{formatCurrency(dicRow.decPtEmployee)}</td><td>{formatCurrency(dicRow.decLwfEmployee)}</td><td>{formatCurrency(dicRow.decGratuityEmployer)}</td><td>{formatCurrency(dicRow.decTotalEmployee)}</td><td>{formatCurrency(dicRow.decTotalEmployer)}</td><td>{formatCurrency(dicRow.decGrandTotal)}</td><td>{dicRow.strStatus}</td></tr>)}
              {lstSummaryRows.length > 0 ? <tr><td colSpan={3}><strong>Total</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decPfEmployee)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decPfEmployer)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decEsiEmployee)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decEsiEmployer)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decPtEmployee)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decLwfEmployee)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decGratuityEmployer)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decTotalEmployee)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decTotalEmployer)}</strong></td><td><strong>{formatCurrency(dicSummaryTotals.decGrandTotal)}</strong></td><td /></tr> : null}
            </tbody>
          </table> : <table className={styles.table}>
            <thead><tr><th><Checkbox size="small" checked={blnAllVisibleSelected} indeterminate={!blnAllVisibleSelected && blnSomeVisibleSelected} onChange={(objEvent) => toggleVisibleRows(objEvent.target.checked)} inputProps={{ "controlId": "reports.statutory.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>} /></th><th>Payroll Period</th><th>Employee Code</th><th>Employee Name</th><th>Statutory</th><th>Basis</th><th>Employee Rate</th><th>Employer Rate</th><th>Employee Amount</th><th>Employer Amount</th><th>Total</th><th>Ceiling</th><th>Mode</th><th>Status</th></tr></thead>
            <tbody>
              {lstVisibleRows.length === 0 ? <tr><td colSpan={14} className={styles.emptyState}>No statutory report rows found for the current filters.</td></tr> : null}
              {lstVisibleRows.map((dicRow) => <tr key={dicRow.intID}><td><Checkbox size="small" checked={setSelectedRowIDs.has(dicRow.intID)} onChange={(objEvent) => setSetSelectedRowIDs((setPrevious) => { const setNext = new Set(setPrevious); objEvent.target.checked ? setNext.add(dicRow.intID) : setNext.delete(dicRow.intID); return setNext; })} inputProps={{ "controlId": "reports.statutory.row.select.checkbox", "data-row-key": dicRow.intID } as InputHTMLAttributes<HTMLInputElement>} /></td><td>{formatMonth(dicRow.dtPayrollMonth)}</td><td>{dicRow.strEmployeeCode}</td><td>{dicRow.strEmployeeName}</td><td>{dicRow.strStatutoryName}</td><td>{formatCurrency(dicRow.decBasisAmount)}</td><td>{formatPercent(dicRow.decEmployeeRatePercent)}</td><td>{formatPercent(dicRow.decEmployerRatePercent)}</td><td>{formatCurrency(dicRow.decEmployeeAmount)}</td><td>{formatCurrency(dicRow.decEmployerAmount)}</td><td>{formatCurrency(dicRow.decTotalAmount)}</td><td>{dicRow.decCeilingAmount === null ? "-" : formatCurrency(dicRow.decCeilingAmount)}</td><td>{dicRow.strCalculationMode || "-"}</td><td>{dicRow.strStatus}</td></tr>)}
              {lstFilteredRows.length > 0 ? <tr><td colSpan={5}><strong>Total</strong></td><td><strong>{formatCurrency(dicTotals.decBasis)}</strong></td><td /><td /><td><strong>{formatCurrency(dicTotals.decEmployee)}</strong></td><td><strong>{formatCurrency(dicTotals.decEmployer)}</strong></td><td><strong>{formatCurrency(dicTotals.decTotal)}</strong></td><td /><td /><td /></tr> : null}
            </tbody>
          </table>}
        </Box>
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
