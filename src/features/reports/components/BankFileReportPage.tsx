"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Box, Breadcrumbs, Button, Checkbox, Typography } from "@mui/material";
import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { ReportMoreFilters, SingleSelectFilter } from "@/features/reports/components/ReportFilterUi";
import { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
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
type MoreFiltersForm = Pick<SearchForm, "strDepartment" | "strLocation">;
const dicEmptyMoreFilters: MoreFiltersForm = { strDepartment: "", strLocation: "" };

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
  const [dicMoreFiltersDraft, setDicMoreFiltersDraft] = useState<MoreFiltersForm>(dicEmptyMoreFilters);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [setSelectedRowIDs, setSetSelectedRowIDs] = useState<Set<number>>(new Set());
  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnPageLoading = blnRightsLoading || blnLoading;

  async function loadRows(objFilters: SearchForm) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstRows(await payrollReportService.getBankFileRows(objFilters));
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
    loadRows(dicFilters).catch(() => undefined);
  }

  function clearFilters() {
    setDicSearchDraft(dicEmptySearch);
    setDicMoreFiltersDraft(dicEmptyMoreFilters);
    loadRows(dicEmptySearch).catch(() => undefined);
  }

  function applyMoreFilters() {
    applyFilters({ ...dicSearchDraft, ...dicMoreFiltersDraft });
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
      { field: "strEmployeeName", headerName: "Employee Name", width: 220 },
      { field: "strEmployeeCode", headerName: "Employee Code", width: 150 },
      { field: "strPayrollPeriod", headerName: "Payroll Period", width: 140, sortAccessor: (dicRow) => dicRow.strPayrollPeriodSortValue },
      { field: "strBankName", headerName: "Bank Name", width: 180 },
      { field: "strBankAccountMasked", headerName: "Account Number", width: 180 },
      { field: "strIfscCode", headerName: "IFSC/Routing Code", width: 160 },
      { field: "decNetPayAmount", headerName: "Net Pay", width: 150, align: "right", sortAccessor: (dicRow) => dicRow.decNetPayAmountSortValue },
      { field: "strPaymentStatus", headerName: "Payment Status", width: 160 },
    ],
    [blnAllFilteredSelected, blnSomeFilteredSelected, lstFilteredRows.length]
  );

  return (
    <Box className={styles.page}>
      <Breadcrumbs className="app-breadcrumbs" aria-label="breadcrumb" separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} sx={{ ml: "3px" }}>
        <Typography sx={{ fontSize: "inherit", color: "text.secondary" }}>Reports</Typography>
        <Typography component="h1" className="app-breadcrumb-heading" aria-current="page">Bank File</Typography>
      </Breadcrumbs>
      <Box className={styles.controlsCard} sx={{ p: "12px !important", borderRadius: "10px !important", boxShadow: "none" }}>
        <Box className={styles.reportSearchPanelRow} sx={{ py: "0 !important" }}>
          <Box className={styles.reportSearchField} sx={{ flex: "2 1 340px", minWidth: { xs: "100%", md: 320 } }}>
            <SingleSelectFilter strLabel="Employee" strValue={dicSearchDraft.strSearchEmployee} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchEmployee: strValue }))} lstOptions={dicFilterOptions.lstEmployees} strPlaceholder="Search by employee code or name" strControlId="reports.bank-file.employee-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Period / Run" strValue={dicSearchDraft.strSearchRun} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strSearchRun: strValue }))} lstOptions={dicFilterOptions.lstRuns} strPlaceholder="Payroll period or run" strControlId="reports.bank-file.run-search.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField}>
            <SingleSelectFilter strLabel="Payroll Month" strValue={dicSearchDraft.strPayrollMonth} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strPayrollMonth: strValue }))} lstOptions={dicFilterOptions.lstMonths} strPlaceholder="Payroll Month" strControlId="reports.bank-file.payroll-month.input" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.reportSearchField} sx={{ flexBasis: 160, minWidth: 160 }}>
            <SingleSelectFilter strLabel="Status" strValue={dicSearchDraft.strStatus === "All" ? "" : dicSearchDraft.strStatus} fnOnChange={(strValue) => setDicSearchDraft((dicPrevious) => ({ ...dicPrevious, strStatus: strValue || "All" }))} lstOptions={dicFilterOptions.lstStatuses.length ? dicFilterOptions.lstStatuses : ["Calculated", "Approved", "Published", "Paid"]} strPlaceholder="All Statuses" strControlId="reports.bank-file.status.select" blnDisabled={blnPageLoading} />
          </Box>
          <Box className={styles.searchActions}>
            <ReportMoreFilters
              strControlPrefix="reports.bank-file"
              intActiveCount={(dicSearchDraft.strDepartment ? 1 : 0) + (dicSearchDraft.strLocation ? 1 : 0)}
              blnDisabled={blnPageLoading}
              onOpen={() => setDicMoreFiltersDraft({ strDepartment: dicSearchDraft.strDepartment, strLocation: dicSearchDraft.strLocation })}
              onApply={applyMoreFilters}
              onClearAll={() => setDicMoreFiltersDraft(dicEmptyMoreFilters)}
            >
              <SingleSelectFilter strLabel="Department" strValue={dicMoreFiltersDraft.strDepartment} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strDepartment: strValue }))} lstOptions={dicFilterOptions.lstDepartments} strPlaceholder="All" strControlId="reports.bank-file.department.input" blnDisabled={blnPageLoading} />
              <SingleSelectFilter strLabel="Location" strValue={dicMoreFiltersDraft.strLocation} fnOnChange={(strValue) => setDicMoreFiltersDraft((dicPrevious) => ({ ...dicPrevious, strLocation: strValue }))} lstOptions={dicFilterOptions.lstLocations} strPlaceholder="All" strControlId="reports.bank-file.location.input" blnDisabled={blnPageLoading} />
            </ReportMoreFilters>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => applyFilters(dicSearchDraft)} disabled={blnPageLoading} data-controlid="reports.bank-file.search.button">Search</Button>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters} disabled={blnPageLoading} data-controlid="reports.bank-file.clear.button">Clear</Button>
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

      <Box className={styles.tableCard} sx={{ p: "0 !important", borderRadius: "10px !important", boxShadow: "none" }}>
        {!blnRightsLoading && !blnCanView && !strError ? <Alert severity="warning" sx={{ mb: 1.5 }}>Bank file view access is not available for your user group.</Alert> : null}
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
          loading={blnPageLoading}
          loadingHeaderSkeleton
          skeletonRowCount={10}
          hideRowClickHint
          onRowClick={() => undefined}
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
    </Box>
  );
}
