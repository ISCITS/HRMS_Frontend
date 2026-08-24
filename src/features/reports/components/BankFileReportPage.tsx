"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import ReportMultiSelectField, { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import { payrollReportService } from "@/features/reports/services/payrollReportService";
import type { PayrollResultListRecord } from "@/features/payroll/types";

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

function displayValue(strValue: string | null | undefined) {
  return strValue?.trim() || "-";
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
        dicRow.strBankName ?? "",
        dicRow.strBankAccountMasked ?? "",
        dicRow.strIfscCode ?? "",
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
      <td>${displayValue(dicRow.strBankName)}</td>
      <td>${displayValue(dicRow.strBankAccountMasked)}</td>
      <td>${displayValue(dicRow.strIfscCode)}</td>
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
  const [blnLoading, setBlnLoading] = useState(false);
  const [blnHasLoadedRows, setBlnHasLoadedRows] = useState(false);
  const [blnFilterDialogOpen, setBlnFilterDialogOpen] = useState(false);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getBankFileRows(objFilters));
      setBlnHasLoadedRows(true);
      setSetSelectedRowIDs(new Set());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load bank file rows.");
    } finally {
      setBlnLoading(false);
    }
  }
  const lstFilteredRows = useMemo(() => lstRows.filter((dicRow) => dicRow.decNetPayAmount > 0), [lstRows]);
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
  const decNetTotal = lstFilteredRows.reduce((decTotal, dicRow) => decTotal + (dicRow.decNetPayAmount || 0), 0);
  const lstExportRows = setSelectedRowIDs.size > 0
    ? lstFilteredRows.filter((dicRow) => setSelectedRowIDs.has(dicRow.intID))
    : lstFilteredRows;
  const blnAllFilteredSelected = lstFilteredRows.length > 0 && lstFilteredRows.every((dicRow) => setSelectedRowIDs.has(dicRow.intID));
  const blnSomeFilteredSelected = !blnAllFilteredSelected && lstFilteredRows.some((dicRow) => setSelectedRowIDs.has(dicRow.intID));

  function toggleFilteredRows(blnChecked: boolean) {
    setSetSelectedRowIDs((setPrevious) => {
      const setNext = new Set(setPrevious);
      lstFilteredRows.forEach((dicRow) => {
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
    setStrError("");
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
  }, [blnCanView]);

  const lstTableRows = useMemo(
    () =>
      lstFilteredRows.map((dicRow) => ({
        intID: dicRow.intID,
        select: (
          <Checkbox
            inputProps={{ "controlId": "reports.bank-file.row.select.checkbox", "data-row-key": String(dicRow.intID) } as InputHTMLAttributes<HTMLInputElement>}
            size="small"
            checked={setSelectedRowIDs.has(dicRow.intID)}
            onChange={(objEvent) => toggleRow(dicRow.intID, objEvent.target.checked)}
          />
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strPayrollPeriod: formatMonth(dicRow.dtPayrollMonth),
        strPayrollPeriodSortValue: dicRow.dtPayrollMonth ? new Date(dicRow.dtPayrollMonth).getTime() : 0,
        strBankName: displayValue(dicRow.strBankName),
        strBankAccountMasked: displayValue(dicRow.strBankAccountMasked),
        strIfscCode: displayValue(dicRow.strIfscCode),
        decNetPayAmount: formatCurrency(dicRow.decNetPayAmount),
        decNetPayAmountSortValue: Number(dicRow.decNetPayAmount ?? 0),
        strPaymentStatus: dicRow.strStatus === "Paid" ? "Paid" : "Payment Required",
      })),
    [lstFilteredRows, setSelectedRowIDs]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "select",
        headerName: (
          <Checkbox
            inputProps={{ "controlId": "reports.bank-file.select-all.checkbox" } as InputHTMLAttributes<HTMLInputElement>}
            size="small"
            checked={blnAllFilteredSelected}
            indeterminate={blnSomeFilteredSelected}
            onChange={(objEvent) => toggleFilteredRows(objEvent.target.checked)}
            disabled={lstFilteredRows.length === 0}
          />
        ),
        sortable: false,
        filterable: false,
        exportable: false,
        width: 56,
      },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 150 },
      { field: "strEmployeeName", headerName: "Employee Name", width: 220 },
      { field: "strPayrollPeriod", headerName: "Payroll Period", width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "strBankName", headerName: "Bank Name", width: 180 },
      { field: "strBankAccountMasked", headerName: "Account Number", width: 180 },
      { field: "strIfscCode", headerName: "IFSC/Routing Code", width: 160 },
      { field: "decNetPayAmount", headerName: "Net Pay", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decNetPayAmountSortValue },
      { field: "strPaymentStatus", headerName: "Payment Status", width: 160 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, lstFilteredRows.length]
  );

  if (blnRightsLoading || (blnLoading && !blnHasLoadedRows)) {
    return <BlockingLoader blnOpen strLabel="Loading bank file..." />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>Bank File</Typography>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
          <Box />
        </Box>
        <Box className={styles.reportSearchPanelRow}>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchEmployee} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} options={dicFilterOptions.lstEmployees} placeholder="Search by employee code or name" controlId="reports.bank-file.employee-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strSearchRun} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} options={dicFilterOptions.lstRuns} placeholder="Payroll period or run" controlId="reports.bank-file.run-search.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strPayrollMonth} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} options={dicFilterOptions.lstMonths} label="Payroll Month" placeholder="Payroll Month" controlId="reports.bank-file.payroll-month.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strDepartment} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} options={dicFilterOptions.lstDepartments} placeholder="Department" controlId="reports.bank-file.department.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField value={dicSearchDraft.strLocation} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} options={dicFilterOptions.lstLocations} placeholder="Location" controlId="reports.bank-file.location.input" />
          </Box>
          <Box className={styles.reportSearchField}>
            <ReportMultiSelectField label="Status" value={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} onChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} options={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} placeholder="All" controlId="reports.bank-file.status.select" />
          </Box>
          <Box className={`${styles.searchActions} ${styles.reportBottomRightActions}`}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} controlId="reports.bank-file.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} controlId="reports.bank-file.clear.button">Clear</Button>
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
          Payment-required net salary data for approved, published, or paid payroll results.
        </Typography>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Bank file view access is not available for your user group.</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="intID"
          defaultPageSize={lstRowsPerPageOptions[0]}
          pageSizeOptions={lstRowsPerPageOptions}
          emptyMessage="No eligible bank file rows found for the current filters."
          showPaginationSummary
          withPaper={false}
          testIdPrefix="reports.bank-file"
          toolbarLeft={(
            <Box className={styles.listUtilityActions}>
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => downloadCsv("bank-file.csv", lstExportRows)} data-controlid="reports.bank-file.generate.button">Generate Bank File</Button> : null}
              {canDoAny("export") ? <Button className={styles.secondaryButton} startIcon={<DownloadRoundedIcon />} onClick={() => exportPdf("Bank File", lstExportRows)} data-controlid="reports.bank-file.download-pdf.button">Download PDF</Button> : null}
              {setSelectedRowIDs.size > 0 ? <Typography sx={{ color: "#64748b", alignSelf: "center" }}>{setSelectedRowIDs.size} selected</Typography> : null}
            </Box>
          )}
          footerContent={lstFilteredRows.length > 0 ? (
            <Box sx={{ px: 1.5, py: 1.25, borderTop: "1px solid #e2e8f0" }}>
              <Box sx={{ minWidth: 1256, display: "grid", gridTemplateColumns: "56px 150px 220px 140px 180px 180px 160px 150px 160px", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700, gridColumn: "1 / span 7" }}>Total</Typography>
                <Typography sx={{ fontWeight: 700, textAlign: "right" }}>{formatCurrency(decNetTotal)}</Typography>
                <Box />
              </Box>
            </Box>
          ) : null}
          getRowSx={(dicRow) => setSelectedRowIDs.has(dicRow.intID) ? { backgroundColor: "rgba(37, 99, 235, 0.08)" } : undefined}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <Dialog open={blnFilterDialogOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Bank File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, pt: 1 }}>
            <TextField label="Payroll Month" type="month" value={dicSearchDraft.strPayrollMonth} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: objEvent.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Department" value={dicSearchDraft.strDepartment} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: objEvent.target.value }))} fullWidth />
            <TextField label="Location" value={dicSearchDraft.strLocation} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strLocation: objEvent.target.value }))} fullWidth />
            <TextField label="Status" select value={dicSearchDraft.strStatus} onChange={(objEvent) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: objEvent.target.value as SearchForm["strStatus"] }))} fullWidth>
              <MenuItem value="All">Eligible statuses</MenuItem>
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
