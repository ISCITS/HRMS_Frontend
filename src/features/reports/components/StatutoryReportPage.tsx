"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

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
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strStatutoryCode: "ALL",
};
const lstRowsPerPageOptions = [10, 20, 50];
const lstReportTypes: Array<{ strCode: StatutoryReportCode; strLabel: string; strFile: string }> = [
  { strCode: "ALL", strLabel: "Statutory Summary Report", strFile: "statutory-summary" },
  { strCode: "PF", strLabel: "PF Report / PF ECR Report", strFile: "pf-ecr-report" },
  { strCode: "ESI", strLabel: "ESI Report / ESI Contribution Report", strFile: "esi-contribution-report" },
  { strCode: "PT", strLabel: "Professional Tax Report", strFile: "professional-tax-report" },
  { strCode: "LWF", strLabel: "Labour Welfare Fund Report", strFile: "labour-welfare-fund-report" },
];

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
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] = useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getStatutoryReportRows(objFilters));
      setSetSelectedRowIDs(new Set());
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load statutory report.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (!blnRightsLoading) {
      loadRows().catch(() => undefined);
    }
  }, [blnRightsLoading]);

  const lstFilteredRows = useMemo(() => {
    const strEmployeeSearch = dicSearchApplied.strSearchEmployee.trim().toLowerCase();
    const strRunSearch = dicSearchApplied.strSearchRun.trim().toLowerCase();
    return lstRows.filter((dicRow) => {
      const blnEmployeeMatch = !strEmployeeSearch || dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) || dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch = !strRunSearch || dicRow.strRunCode.toLowerCase().includes(strRunSearch) || dicRow.strRunName.toLowerCase().includes(strRunSearch);
      const blnStatusMatch = dicSearchApplied.strStatus === "All" || dicRow.strStatus === dicSearchApplied.strStatus;
      const blnStatutoryMatch = dicSearchApplied.strStatutoryCode === "ALL" || dicRow.strStatutoryCode.toUpperCase() === dicSearchApplied.strStatutoryCode;
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch && blnStatutoryMatch;
    });
  }, [dicSearchApplied, lstRows]);
  const dicTotals = useMemo(() => lstFilteredRows.reduce((dicAccumulator, dicRow) => ({
    decBasis: dicAccumulator.decBasis + (dicRow.decBasisAmount || 0),
    decEmployee: dicAccumulator.decEmployee + (dicRow.decEmployeeAmount || 0),
    decEmployer: dicAccumulator.decEmployer + (dicRow.decEmployerAmount || 0),
    decTotal: dicAccumulator.decTotal + (dicRow.decTotalAmount || 0),
  }), { decBasis: 0, decEmployee: 0, decEmployer: 0, decTotal: 0 }), [lstFilteredRows]);
  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
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

  if (blnLoading || blnRightsLoading) {
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
        <Box className={styles.searchRow}>
          <TextField select value={dicSearchDraft.strStatutoryCode} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatutoryCode: objEvent.target.value as StatutoryReportCode }))} fullWidth>
            {lstReportTypes.map((dicType) => <MenuItem key={dicType.strCode} value={dicType.strCode}>{dicType.strLabel}</MenuItem>)}
          </TextField>
          <TextField value={dicSearchDraft.strSearchEmployee} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: objEvent.target.value }))} placeholder="Search by employee code or name" fullWidth />
          <TextField value={dicSearchDraft.strSearchRun} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: objEvent.target.value }))} placeholder="Payroll period or run" fullWidth />
          <TextField select value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth>
            <MenuItem value="All">All statuses</MenuItem><MenuItem value="Calculated">Calculated</MenuItem><MenuItem value="Approved">Approved</MenuItem><MenuItem value="Published">Published</MenuItem><MenuItem value="Paid">Paid</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); loadRows(dicSearchDraft).catch(() => undefined); }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); loadRows(dicEmptySearch).catch(() => undefined); }}>Clear</Button>
          </Box>
        </Box>
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Statutory report view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv(`${dicReportMeta.strFile}.csv`, lstExportRows)}>Export Excel</Button> : null}
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf(dicReportMeta.strLabel, lstExportRows)}>Download PDF</Button> : null}
            {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
          </Box>
          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>Rows per page</Typography>
              <TextField select size="small" value={intRowsPerPage} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect} sx={{ width: 92 }}>{lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={intOption}>{intOption}</MenuItem>)}</TextField>
              <Typography className={styles.paginationRange}>{lstFilteredRows.length === 0 ? "0 of 0" : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of ${lstFilteredRows.length}`}</Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" showFirstButton showLastButton />
          </Box>
        </Box>
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th><Checkbox size="small" checked={blnAllVisibleSelected} indeterminate={!blnAllVisibleSelected && blnSomeVisibleSelected} onChange={(objEvent) => toggleVisibleRows(objEvent.target.checked)} /></th><th>Payroll Period</th><th>Employee Code</th><th>Employee Name</th><th>Statutory</th><th>Basis</th><th>Employee Rate</th><th>Employer Rate</th><th>Employee Amount</th><th>Employer Amount</th><th>Total</th><th>Ceiling</th><th>Mode</th><th>Status</th></tr></thead>
            <tbody>
              {lstVisibleRows.length === 0 ? <tr><td colSpan={14} className={styles.emptyState}>No statutory report rows found for the current filters.</td></tr> : null}
              {lstVisibleRows.map((dicRow) => <tr key={dicRow.intID}><td><Checkbox size="small" checked={setSelectedRowIDs.has(dicRow.intID)} onChange={(objEvent) => setSetSelectedRowIDs((setPrevious) => { const setNext = new Set(setPrevious); objEvent.target.checked ? setNext.add(dicRow.intID) : setNext.delete(dicRow.intID); return setNext; })} /></td><td>{formatMonth(dicRow.dtPayrollMonth)}</td><td>{dicRow.strEmployeeCode}</td><td>{dicRow.strEmployeeName}</td><td>{dicRow.strStatutoryName}</td><td>{formatCurrency(dicRow.decBasisAmount)}</td><td>{formatPercent(dicRow.decEmployeeRatePercent)}</td><td>{formatPercent(dicRow.decEmployerRatePercent)}</td><td>{formatCurrency(dicRow.decEmployeeAmount)}</td><td>{formatCurrency(dicRow.decEmployerAmount)}</td><td>{formatCurrency(dicRow.decTotalAmount)}</td><td>{dicRow.decCeilingAmount === null ? "-" : formatCurrency(dicRow.decCeilingAmount)}</td><td>{dicRow.strCalculationMode || "-"}</td><td>{dicRow.strStatus}</td></tr>)}
              {lstFilteredRows.length > 0 ? <tr><td colSpan={5}><strong>Total</strong></td><td><strong>{formatCurrency(dicTotals.decBasis)}</strong></td><td /><td /><td><strong>{formatCurrency(dicTotals.decEmployee)}</strong></td><td><strong>{formatCurrency(dicTotals.decEmployer)}</strong></td><td><strong>{formatCurrency(dicTotals.decTotal)}</strong></td><td /><td /><td /></tr> : null}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}
