"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import type { TdsReportRow } from "@/features/payroll/types";
import ReportMultiSelectField, { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: string;
  strDepartment: string;
  strLocation: string;
  strPayrollMonth: string;
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
  strDepartment: "",
  strLocation: "",
  strPayrollMonth: "",
};
const lstRowsPerPageOptions = [10, 20, 50];

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(decValue || 0);
}

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(strFileName: string, lstRows: TdsReportRow[]) {
  const lstHeaders = ["Payroll Period", "Employee Code", "Employee Name", "Financial Year", "Regime", "Net Taxable Income", "Total Tax Liability", "TDS This Month", "TDS Deducted YTD", "Status"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) => [
      dicRow.dtPayrollMonth ?? "",
      dicRow.strEmployeeCode,
      dicRow.strEmployeeName,
      dicRow.strFinancialYearCode ?? "",
      dicRow.strRegimeUsed ?? "",
      dicRow.decNetTaxableIncome,
      dicRow.decTotalTaxLiability,
      dicRow.decMonthlyTds,
      dicRow.decTaxDeductedYtd,
      dicRow.strStatus,
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

function exportPdf(strTitle: string, lstRows: TdsReportRow[]) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${formatMonth(dicRow.dtPayrollMonth)}</td><td>${dicRow.strEmployeeCode}</td><td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strFinancialYearCode ?? "-"}</td><td>${dicRow.strRegimeUsed ?? "-"}</td>
      <td>${formatCurrency(dicRow.decNetTaxableIncome)}</td><td>${formatCurrency(dicRow.decTotalTaxLiability)}</td>
      <td>${formatCurrency(dicRow.decMonthlyTds)}</td><td>${formatCurrency(dicRow.decTaxDeductedYtd)}</td><td>${dicRow.strStatus}</td>
    </tr>`).join("");
  objWindow.document.write(`<html><head><title>${strTitle}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 16px;font-size:22px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e2e8f0}</style></head><body><h1>${strTitle}</h1><table><thead><tr><th>Payroll Period</th><th>Employee Code</th><th>Employee Name</th><th>Financial Year</th><th>Regime</th><th>Net Taxable Income</th><th>Total Tax Liability</th><th>TDS This Month</th><th>TDS Deducted YTD</th><th>Status</th></tr></thead><tbody>${strRows}</tbody></table></body></html>`);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function TdsReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess(["REPORTS", "TDS_REPORT", "REPORT_TDS", "PAYROLL_RESULTS", "PAYROLL_RESULT"]);
  const [lstRows, setLstRows] = useState<TdsReportRow[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [blnFilterDialogOpen, setBlnFilterDialogOpen] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getTdsReportRows(objFilters));
      setBlnHasLoadedRows(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load TDS report.");
    } finally {
      setBlnLoading(false);
    }
  }

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

  const dicTotals = useMemo(() => lstRows.reduce((dicAccumulator, dicRow) => ({
    decTotalTaxLiability: dicAccumulator.decTotalTaxLiability + (dicRow.decTotalTaxLiability || 0),
    decMonthlyTds: dicAccumulator.decMonthlyTds + (dicRow.decMonthlyTds || 0),
    decTaxDeductedYtd: dicAccumulator.decTaxDeductedYtd + (dicRow.decTaxDeductedYtd || 0),
  }), { decTotalTaxLiability: 0, decMonthlyTds: 0, decTaxDeductedYtd: 0 }), [lstRows]);

  function applyFilters(dicFilters: SearchForm) {
    setDicSearchDraft(dicFilters);
    setBlnFilterDialogOpen(false);
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    loadRows(dicEmptySearch).catch(() => undefined);
  }

  useEffect(() => {
    if (!blnCanView) {
      return;
    }
    loadRows(dicEmptySearch).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blnCanView]);

  const lstTableRows = useMemo(
    () =>
      lstRows.map((dicRow) => ({
        intID: dicRow.intID,
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strFinancialYearCode: dicRow.strFinancialYearCode || "-",
        strRegimeUsed: dicRow.strRegimeUsed || "-",
        decNetTaxableIncome: formatCurrency(dicRow.decNetTaxableIncome),
        decNetTaxableIncomeSortValue: Number(dicRow.decNetTaxableIncome ?? 0),
        decTotalTaxLiability: formatCurrency(dicRow.decTotalTaxLiability),
        decTotalTaxLiabilitySortValue: Number(dicRow.decTotalTaxLiability ?? 0),
        decMonthlyTds: formatCurrency(dicRow.decMonthlyTds),
        decMonthlyTdsSortValue: Number(dicRow.decMonthlyTds ?? 0),
        decTaxDeductedYtd: formatCurrency(dicRow.decTaxDeductedYtd),
        decTaxDeductedYtdSortValue: Number(dicRow.decTaxDeductedYtd ?? 0),
        strStatus: dicRow.strStatus,
      })),
    [lstRows],
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "strPayrollPeriod", headerName: "Payroll Period", width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 140 },
      { field: "strEmployeeName", headerName: "Employee Name", width: 220 },
      { field: "strFinancialYearCode", headerName: "Financial Year", width: 130 },
      { field: "strRegimeUsed", headerName: "Regime", width: 110 },
      { field: "decNetTaxableIncome", headerName: "Net Taxable Income", width: 170, align: "right", sortAccessor: (dicRow) => dicRow.decNetTaxableIncomeSortValue },
      { field: "decTotalTaxLiability", headerName: "Total Tax Liability", width: 170, align: "right", sortAccessor: (dicRow) => dicRow.decTotalTaxLiabilitySortValue },
      { field: "decMonthlyTds", headerName: "TDS This Month", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decMonthlyTdsSortValue },
      { field: "decTaxDeductedYtd", headerName: "TDS Deducted YTD", width: 160, align: "right", sortAccessor: (dicRow) => dicRow.decTaxDeductedYtdSortValue },
      { field: "strStatus", headerName: "Status", width: 120 },
    ],
    [],
  );

  if (blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel="Loading TDS report..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>TDS / Income Tax Deduction Summary</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box />
        </Box>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchEmployee} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} options={dicFilterOptions.lstEmployees} placeholder="Search by employee code or name" controlId="reports.tds.employee-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchRun} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} options={dicFilterOptions.lstRuns} placeholder="Payroll period or run" controlId="reports.tds.run-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strPayrollMonth} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} options={dicFilterOptions.lstMonths} label="Payroll Month" placeholder="Payroll Month" controlId="reports.tds.payroll-month.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField value={dicSearchDraft.strDepartment} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} options={dicFilterOptions.lstDepartments} placeholder="Department" controlId="reports.tds.department.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField value={dicSearchDraft.strLocation} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} options={dicFilterOptions.lstLocations} placeholder="Location" controlId="reports.tds.location.input" />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <ReportMultiSelectField label="Status" value={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} options={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} placeholder="All Statuses" controlId="reports.tds.status.select" />
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} controlId="reports.tds.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reports.tds.clear.button">Clear</Button>
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
          Employee-wise monthly TDS deducted from salary, year-to-date TDS, and total tax liability for the selected financial year.
        </Typography>
      </Box>
      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>TDS report view access is not available for your user group.</Alert> : null}
        <BlockingLoader blnOpen={blnLoading} strLabel="Loading TDS report rows..." />
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={lstTableColumns as unknown as CommonTableColumn<Record<string, ReactNode>>[]}
          rows={lstTableRows as unknown as Record<string, ReactNode>[]}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage="No TDS report rows found for the current filters."
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.tds"
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("tds-deduction-summary.csv", lstRows)} controlId="reports.tds.export-excel.button">Export Excel</Button> : null}
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("TDS / Income Tax Deduction Summary", lstRows)} controlId="reports.tds.download-pdf.button">Download PDF</Button> : null}
            </Box>
          )}
          footerContent={
            lstRows.length > 0 ? (
              <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
                <Box sx={{ minWidth: 1400, display: "grid", gridTemplateColumns: "140px 140px 220px 130px 110px 170px 170px 150px 160px 120px", alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 5" }}>Total</Typography>
                  <Box />
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decTotalTaxLiability)}</Typography>
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decMonthlyTds)}</Typography>
                  <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(dicTotals.decTaxDeductedYtd)}</Typography>
                  <Box />
                </Box>
              </Box>
            ) : null
          }
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>
      <Dialog open={blnFilterDialogOpen} maxWidth="sm" fullWidth controlId="reports.tds.filter.dialog">
        <DialogTitle>TDS / Income Tax Deduction Summary</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            <TextField label="Payroll Month" type="month" value={dicSearchDraft.strPayrollMonth} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Department" value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} fullWidth />
            <TextField label="Location" value={dicSearchDraft.strLocation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))} fullWidth />
            <TextField label="Status" select value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth>
              <MenuItem value="All">All</MenuItem><MenuItem value="Calculated">Calculated</MenuItem><MenuItem value="Approved">Approved</MenuItem><MenuItem value="Published">Published</MenuItem><MenuItem value="Paid">Paid</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => setDicSearchDraft(dicEmptySearch)} controlId="reports.tds.filter.reset.button">Reset</Button>
          {blnHasLoadedRows ? <Button className={styles.secondaryButton} onClick={() => setBlnFilterDialogOpen(false)} controlId="reports.tds.filter.close.button">Close</Button> : null}
          <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnLoading} controlId="reports.tds.filter.show-report.button">Show Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
