"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import type { PayrollResultListRecord } from "@/features/payroll/types";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Calculated" | "Approved" | "Published" | "Paid";
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function toCsvValue(objValue: unknown) {
  return `"${String(objValue ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(strFileName: string, lstRows: PayrollResultListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Payroll Run",
    "Payroll Month",
    "Paid Days",
    "LOP Days",
    "Earnings",
    "Deductions",
    "Statutory/Tax",
    "Gross Pay",
    "Net Pay",
    "Status",
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.strRunName,
        dicRow.dtPayrollMonth ?? "",
        dicRow.decPaidDays ?? "",
        dicRow.decLopDays ?? "",
        dicRow.decGrossAmount,
        dicRow.decDeductionAmount,
        dicRow.decTaxAmount,
        dicRow.decGrossAmount,
        dicRow.decNetPayAmount,
        dicRow.strStatus,
      ].map(toCsvValue).join(",")
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: PayrollResultListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1280,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${formatMonth(dicRow.dtPayrollMonth)}</td>
      <td>${dicRow.decPaidDays ?? "-"}</td>
      <td>${dicRow.decLopDays ?? "-"}</td>
      <td>${formatCurrency(dicRow.decGrossAmount)}</td>
      <td>${formatCurrency(dicRow.decDeductionAmount)}</td>
      <td>${formatCurrency(dicRow.decTaxAmount)}</td>
      <td>${formatCurrency(dicRow.decGrossAmount)}</td>
      <td>${formatCurrency(dicRow.decNetPayAmount)}</td>
      <td>${dicRow.strStatus}</td>
    </tr>
  `).join("");
  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          h1 { margin: 0 0 16px; font-size: 22px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Employee Code</th>
              <th>Employee Name</th>
              <th>Payroll Period</th>
              <th>Paid Days</th>
              <th>LOP Days</th>
              <th>Earnings</th>
              <th>Deductions</th>
              <th>Statutory/Tax</th>
              <th>Gross Pay</th>
              <th>Net Pay</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>${strRows}</tbody>
        </table>
      </body>
    </html>
  `);
  objWindow.document.close();
  objWindow.focus();
  objWindow.print();
}

export default function PayrollRegisterReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "PAYROLL_REGISTER",
    "REPORT_PAYROLL_REGISTER",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const [lstRows, setLstRows] = useState<PayrollResultListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [blnFilterDialogOpen, setBlnFilterDialogOpen] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getPayrollRegisterRows(objFilters));
      setBlnHasLoadedRows(true);
      setSetSelectedRowIDs(new Set());
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load payroll register.");
    } finally {
      setBlnLoading(false);
    }
  }

  const lstFilteredRows = useMemo(() => lstRows, [lstRows]);

  const dicTotals = useMemo(() => lstFilteredRows.reduce(
    (dicAccumulator, dicRow) => ({
      decGross: dicAccumulator.decGross + (dicRow.decGrossAmount || 0),
      decDeduction: dicAccumulator.decDeduction + (dicRow.decDeductionAmount || 0),
      decTax: dicAccumulator.decTax + (dicRow.decTaxAmount || 0),
      decNet: dicAccumulator.decNet + (dicRow.decNetPayAmount || 0),
    }),
    { decGross: 0, decDeduction: 0, decTax: 0, decNet: 0 },
  ), [lstFilteredRows]);
  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(intStartIndex, intStartIndex + intRowsPerPage);
  const lstExportRows = setSelectedRowIDs.size > 0
    ? lstFilteredRows.filter((dicRow) => setSelectedRowIDs.has(dicRow.intID))
    : lstFilteredRows;
  const blnAllVisibleSelected = lstVisibleRows.length > 0 && lstVisibleRows.every((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const blnSomeVisibleSelected = lstVisibleRows.some((dicRow) => setSelectedRowIDs.has(dicRow.intID));

  function toggleVisibleRows(blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      lstVisibleRows.forEach((dicRow) => {
        if (blnChecked) {
          setNext.add(dicRow.intID);
        } else {
          setNext.delete(dicRow.intID);
        }
      });
      return setNext;
    });
  }

  function toggleRow(intRowID: number, blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      if (blnChecked) {
        setNext.add(intRowID);
      } else {
        setNext.delete(intRowID);
      }
      return setNext;
    });
  }

  function applyFilters(dicFilters: SearchForm) {
    setDicSearchDraft(dicFilters);
    setBlnFilterDialogOpen(false);
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    setLstRows([]);
    setSetSelectedRowIDs(new Set());
    setStrError("");
    setBlnHasLoadedRows(false);
    setIntPage(1);
  }

  if (blnRightsLoading || (blnLoading && !blnHasLoadedRows)) {
    return <BlockingLoader blnOpen strLabel="Loading payroll register..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Reports / Payroll Register</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box>
            <Typography className={styles.title}>Payroll Register</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.4 }}>
              Employee-wise earnings, deductions, tax, gross pay, and net pay from processed payroll results.
            </Typography>
          </Box>
        </Box>
        <Box className={styles.payrollRegisterSearchPanel}>
          <Box className={styles.payrollRegisterSearchLinePrimary}>
            <TextField value={dicSearchDraft.strSearchEmployee} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: objEvent.target.value }))} placeholder="Search by employee code" fullWidth controlId="reports.payroll-register.employee-search.input" />
            <TextField value={dicSearchDraft.strSearchRun} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: objEvent.target.value }))} placeholder="Payroll period or run" fullWidth controlId="reports.payroll-register.run-search.input" />
            <TextField type="month" value={dicSearchDraft.strPayrollMonth} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))} label="Payroll Month" fullWidth InputLabelProps={{ shrink: true }} controlId="reports.payroll-register.payroll-month.input" />
            <TextField value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} placeholder="Department" fullWidth controlId="reports.payroll-register.department.input" />
            <TextField value={dicSearchDraft.strLocation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))} placeholder="Location" fullWidth controlId="reports.payroll-register.location.input" />
          </Box>
          <Box className={styles.payrollRegisterSearchLineSecondary}>
            <TextField select label="Status" value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth controlId="reports.payroll-register.status.select">
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Calculated">Calculated</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Published">Published</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
            </TextField>
            <Box className={styles.searchActions}>
              <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} controlId="reports.payroll-register.search.button">Search</Button>
              <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reports.payroll-register.clear.button">Clear</Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Payroll register view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("payroll-register.csv", lstExportRows)} controlId="reports.payroll-register.export-excel.button">Export Excel</Button> : null}
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Payroll Register", lstExportRows)} controlId="reports.payroll-register.download-pdf.button">Download PDF</Button> : null}
            {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
          </Box>
          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>Rows per page</Typography>
              <TextField select size="small" value={intRowsPerPage} onChange={(objEvent) => { setIntRowsPerPage(Number(objEvent.target.value)); setIntPage(1); }} className={styles.rowsPerPageSelect} sx={{ width: 92 }}>
                {lstRowsPerPageOptions.map((intOption) => <MenuItem key={intOption} value={intOption}>{intOption}</MenuItem>)}
              </TextField>
              <Typography className={styles.paginationRange}>{lstFilteredRows.length === 0 ? "0 of 0" : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} of ${lstFilteredRows.length}`}</Typography>
            </Box>
            <Pagination count={intPageCount} page={intCurrentPage} onChange={(_, intValue) => setIntPage(intValue)} color="primary" size="small" showFirstButton showLastButton />
          </Box>
        </Box>
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <Checkbox
                    size="small"
                    checked={blnAllVisibleSelected}
                    indeterminate={!blnAllVisibleSelected && blnSomeVisibleSelected}
                    onChange={(objEvent) => toggleVisibleRows(objEvent.target.checked)}
                  />
                </th>
                <th>Employee Code</th>
                <th>Employee Name</th>
                <th>Payroll Period</th>
                <th>Paid Days</th>
                <th>LOP Days</th>
                <th>Earnings</th>
                <th>Deductions</th>
                <th>Statutory/Tax</th>
                <th>Gross Pay</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? <tr><td colSpan={12} className={styles.emptyState}>No payroll register rows found for the current filters.</td></tr> : null}
              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td>
                    <Checkbox
                      size="small"
                      checked={setSelectedRowIDs.has(dicRow.intID)}
                      onChange={(objEvent) => toggleRow(dicRow.intID, objEvent.target.checked)}
                    />
                  </td>
                  <td>{dicRow.strEmployeeCode}</td>
                  <td>{dicRow.strEmployeeName}</td>
                  <td>{formatMonth(dicRow.dtPayrollMonth)}</td>
                  <td>{dicRow.decPaidDays ?? "-"}</td>
                  <td>{dicRow.decLopDays ?? "-"}</td>
                  <td>{formatCurrency(dicRow.decGrossAmount)}</td>
                  <td>{formatCurrency(dicRow.decDeductionAmount)}</td>
                  <td>{formatCurrency(dicRow.decTaxAmount)}</td>
                  <td>{formatCurrency(dicRow.decGrossAmount)}</td>
                  <td>{formatCurrency(dicRow.decNetPayAmount)}</td>
                  <td>{dicRow.strStatus}</td>
                </tr>
              ))}
              {lstFilteredRows.length > 0 ? (
                <tr>
                  <td colSpan={6}><strong>Total</strong></td>
                  <td><strong>{formatCurrency(dicTotals.decGross)}</strong></td>
                  <td><strong>{formatCurrency(dicTotals.decDeduction)}</strong></td>
                  <td><strong>{formatCurrency(dicTotals.decTax)}</strong></td>
                  <td><strong>{formatCurrency(dicTotals.decGross)}</strong></td>
                  <td><strong>{formatCurrency(dicTotals.decNet)}</strong></td>
                  <td />
                </tr>
              ) : null}
            </tbody>
          </table>
        </Box>
      </Box>

      <Dialog open={blnFilterDialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Payroll Register</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            <TextField
              label="Payroll Month"
              type="month"
              value={dicSearchDraft.strPayrollMonth}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Department"
              value={dicSearchDraft.strDepartment}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))}
              fullWidth
            />
            <TextField
              label="Location"
              value={dicSearchDraft.strLocation}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))}
              fullWidth
            />
            <TextField
              label="Status"
              select
              value={dicSearchDraft.strStatus}
              onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))}
              fullWidth
            >
              <MenuItem value="All">All statuses</MenuItem>
              <MenuItem value="Calculated">Calculated</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Published">Published</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => setDicSearchDraft(dicEmptySearch)}>Reset</Button>
          {blnHasLoadedRows ? <Button className={styles.secondaryButton} onClick={() => setBlnFilterDialogOpen(false)}>Close</Button> : null}
          <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnLoading}>Show Report</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
