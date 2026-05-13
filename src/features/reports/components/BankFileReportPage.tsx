"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, MenuItem, Pagination, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import type { PayrollResultListRecord } from "@/features/payroll/types";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Approved" | "Published" | "Paid";
};

const dicEmptySearch: SearchForm = {
  strSearchEmployee: "",
  strSearchRun: "",
  strStatus: "All",
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
    "Payroll Period",
    "Bank Name",
    "Account Number",
    "IFSC/Routing Code",
    "Net Pay",
    "Payment Status",
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strEmployeeCode,
        dicRow.strEmployeeName,
        dicRow.dtPayrollMonth ?? "",
        "",
        "",
        "",
        dicRow.decNetPayAmount,
        dicRow.strStatus === "Paid" ? "Paid" : "Payment Required",
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
      <td>-</td>
      <td>-</td>
      <td>-</td>
      <td>${formatCurrency(dicRow.decNetPayAmount)}</td>
      <td>${dicRow.strStatus === "Paid" ? "Paid" : "Payment Required"}</td>
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
              <th>Bank Name</th>
              <th>Account Number</th>
              <th>IFSC/Routing Code</th>
              <th>Net Pay</th>
              <th>Payment Status</th>
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

export default function BankFileReportPage() {
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } = useModuleActionAccess([
    "REPORTS",
    "BANK_FILE",
    "REPORT_BANK_FILE",
    "PAYROLL_RESULTS",
    "PAYROLL_RESULT",
  ]);
  const [lstRows, setLstRows] = useState<PayrollResultListRecord[]>([]);
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
      setLstRows(await payrollReportService.getBankFileRows(objFilters));
      setSetSelectedRowIDs(new Set());
      setIntPage(1);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load bank file rows.");
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
      const blnEmployeeMatch =
        !strEmployeeSearch ||
        dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) ||
        dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch =
        !strRunSearch ||
        dicRow.strRunCode.toLowerCase().includes(strRunSearch) ||
        dicRow.strRunName.toLowerCase().includes(strRunSearch);
      const blnStatusMatch = dicSearchApplied.strStatus === "All" || dicRow.strStatus === dicSearchApplied.strStatus;
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch && dicRow.decNetPayAmount > 0;
    });
  }, [dicSearchApplied, lstRows]);
  const decNetTotal = lstFilteredRows.reduce((decTotal, dicRow) => decTotal + (dicRow.decNetPayAmount || 0), 0);
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

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel="Loading bank file..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Reports / Bank File</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box>
            <Typography className={styles.title}>Bank File</Typography>
            <Typography sx={{ color: "#64748b", mt: 0.4 }}>
              Payment-required net salary data for approved, published, or paid payroll results.
            </Typography>
          </Box>
        </Box>
        <Box className={styles.searchRow}>
          <TextField value={dicSearchDraft.strSearchEmployee} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: objEvent.target.value }))} placeholder="Search by employee code or name" fullWidth />
          <TextField value={dicSearchDraft.strSearchRun} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: objEvent.target.value }))} placeholder="Payroll period or run" fullWidth />
          <TextField select value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth>
            <MenuItem value="All">Eligible statuses</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="Published">Published</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setDicSearchApplied(dicSearchDraft); loadRows(dicSearchDraft).catch(() => undefined); }}>Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setDicSearchDraft(dicEmptySearch); setDicSearchApplied(dicEmptySearch); loadRows(dicEmptySearch).catch(() => undefined); }}>Clear</Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Bank file view access is not available for your user group.</Alert> : null}
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Bank name, account number, and IFSC/routing code are not present on the existing payroll result API. The generated CSV keeps those columns blank until a backend bank-file endpoint joins employee bank details.
        </Alert>
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("bank-file.csv", lstExportRows)}>Generate Bank File</Button> : null}
            {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Bank File", lstExportRows)}>Download PDF</Button> : null}
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
                <th>Bank Name</th>
                <th>Account Number</th>
                <th>IFSC/Routing Code</th>
                <th>Net Pay</th>
                <th>Payment Status</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? <tr><td colSpan={9} className={styles.emptyState}>No eligible bank file rows found for the current filters.</td></tr> : null}
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
                  <td>-</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{formatCurrency(dicRow.decNetPayAmount)}</td>
                  <td>{dicRow.strStatus === "Paid" ? "Paid" : "Payment Required"}</td>
                </tr>
              ))}
              {lstFilteredRows.length > 0 ? (
                <tr>
                  <td colSpan={7}><strong>Total</strong></td>
                  <td><strong>{formatCurrency(decNetTotal)}</strong></td>
                  <td />
                </tr>
              ) : null}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}
