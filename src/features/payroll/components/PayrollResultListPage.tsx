"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import CommonPayrollDialog from "@/features/payroll/components/CommonPayrollDialog";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import { payslipService } from "@/features/payroll/services/payslipService";
import { authApiService } from "@/services";
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
} from "@/features/payroll/types";
import {
  buildPayslipFileName,
  downloadPayslipHtml,
  printPayslipHtml,
} from "@/features/payroll/utils/payslipDocument";

type PayrollResultListPageProps = {
  blnPayslipScreen?: boolean;
  blnSelfOnly?: boolean;
  blnEssMode?: boolean;
};

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Calculated" | "Approved" | "Published" | "Paid" | "Generated";
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
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function formatDateTime(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(strDate));
}

function formatCurrency(decValue: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decValue || 0);
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Calculated: { background: "#2563eb", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Published: { background: "#7c3aed", color: "#fff" },
    Paid: { background: "#0f766e", color: "#fff" },
    Generated: { background: "#0f766e", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#475569", color: "#fff" };
}

function downloadCsv(strFileName: string, lstRows: PayrollResultListRecord[]) {
  const lstHeaders = [
    "Employee Code",
    "Employee Name",
    "Payroll Run",
    "Payroll Month",
    "Gross",
    "Deductions",
    "Tax",
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
        dicRow.decGrossAmount,
        dicRow.decDeductionAmount,
        dicRow.decTaxAmount,
        dicRow.decNetPayAmount,
        dicRow.strStatus,
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  const objBlob = new Blob([lstLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
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
  const strRows = lstRows
    .map(
      (dicRow) => `
    <tr>
      <td>${dicRow.strEmployeeCode}</td>
      <td>${dicRow.strEmployeeName}</td>
      <td>${dicRow.strRunName}</td>
      <td>${dicRow.dtPayrollMonth ?? "-"}</td>
      <td>${dicRow.decGrossAmount}</td>
      <td>${dicRow.decDeductionAmount}</td>
      <td>${dicRow.decTaxAmount}</td>
      <td>${dicRow.decNetPayAmount}</td>
      <td>${dicRow.strStatus}</td>
    </tr>
  `
    )
    .join("");
  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
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
              <th>Payroll Run</th>
              <th>Payroll Month</th>
              <th>Gross</th>
              <th>Deductions</th>
              <th>Tax</th>
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

export default function PayrollResultListPage({
  blnPayslipScreen = false,
  blnSelfOnly = false,
  blnEssMode = false,
}: PayrollResultListPageProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } =
    useModuleActionAccess([
      "EMPLOYEE_PAYROLL_RESULTS",
      "EMPLOYEE_PAYROLL_RESULT",
      "PAYSLIPS",
      "PAYSLIP",
      "PAYROLL_RESULTS",
      "PAYROLL_RESULT",
      "PAYROLL_PAYSLIPS",
      "PAYROLL_PAYSLIP",
      "MY_PAYSLIPS",
      "MY_PAYSLIP",
    ]);
  const [lstResults, setLstResults] = useState<PayrollResultListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] =
    useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objPreviewRecord, setObjPreviewRecord] =
    useState<PayrollResultDetailRecord | null>(null);
  const [intPayslipActionID, setIntPayslipActionID] = useState<number | null>(null);
  const [intSelfEmployeeID, setIntSelfEmployeeID] = useState<number | null>(null);
  const blnCanAccessResults =
    canViewAny() || canDoAny("view") || canDoAny("list") || canDoAny("get");
  const strEssBackRoute = encodeURIComponent("/ess/my-payslips");

  async function loadResults(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstResults(
        await payrollResultService.getPayrollResults({
          ...objFilters,
          strStatus: blnPayslipScreen ? "All" : objFilters.strStatus,
          blnGeneratedPayslipsOnly: blnPayslipScreen,
        })
      );
      setIntPage(1);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll results."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    if (!blnSelfOnly) {
      loadResults().catch(() => undefined);
      return;
    }

    authApiService
      .getCurrentUser()
      .then((objUserResult) => {
        const intResolvedEmployeeID = objUserResult.Data.objUser.intEmployeeID ?? null;
        setIntSelfEmployeeID(intResolvedEmployeeID);
      })
      .catch(() => {
        setIntSelfEmployeeID(null);
      })
      .finally(() => {
        loadResults().catch(() => undefined);
      });
  }, [blnPayslipScreen, blnRightsLoading, blnSelfOnly]);

  const lstFilteredRows = useMemo(() => {
    const strEmployeeSearch = dicSearchApplied.strSearchEmployee.trim().toLowerCase();
    const strRunSearch = dicSearchApplied.strSearchRun.trim().toLowerCase();
    return lstResults.filter((dicRow) => {
      const blnSelfMatch = !blnSelfOnly || (intSelfEmployeeID !== null && dicRow.intEmployeeID === intSelfEmployeeID);
      const blnEmployeeMatch =
        !strEmployeeSearch ||
        dicRow.strEmployeeCode.toLowerCase().includes(strEmployeeSearch) ||
        dicRow.strEmployeeName.toLowerCase().includes(strEmployeeSearch);
      const blnRunMatch =
        !strRunSearch ||
        dicRow.strRunCode.toLowerCase().includes(strRunSearch) ||
        dicRow.strRunName.toLowerCase().includes(strRunSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        (blnPayslipScreen
          ? dicRow.strPayslipStatus === dicSearchApplied.strStatus
          : dicRow.strStatus === dicSearchApplied.strStatus);
      return blnSelfMatch && blnEmployeeMatch && blnRunMatch && blnStatusMatch;
    });
  }, [blnPayslipScreen, blnSelfOnly, dicSearchApplied, intSelfEmployeeID, lstResults]);

  const intPageCount = Math.max(1, Math.ceil(lstFilteredRows.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = lstFilteredRows.slice(
    intStartIndex,
    intStartIndex + intRowsPerPage
  );
  const strRangeLabel =
    lstFilteredRows.length === 0
      ? `0 ${t("pagination_separator", "of")} 0`
      : `${intStartIndex + 1}-${Math.min(intStartIndex + intRowsPerPage, lstFilteredRows.length)} ${t("pagination_separator", "of")} ${lstFilteredRows.length}`;

  async function openPreview(intResultID: number) {
    try {
      setObjPreviewRecord(
        await payrollResultService.getPayrollResultById(intResultID)
      );
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll result."
      );
    }
  }

  async function openPayslipDocument(dicRow: PayrollResultListRecord, blnPrint: boolean) {
    setIntPayslipActionID(dicRow.intID);
    setStrError("");
    try {
      const dicPayslip = await payslipService.getPayslipPreview(
        dicRow.intPayrollRunID,
        dicRow.intEmployeeID
      );
      const intPayslipID =
        dicRow.intPayslipID ??
        dicPayslip.intPayslipID ??
        (blnPayslipScreen
          ? null
          : (
              await payslipService.generatePayslip(
                dicRow.intPayrollRunID,
                dicRow.intEmployeeID
              )
            ).intPayslipID);
      if (!intPayslipID) {
        setStrError(t("payslip_not_generated", "Payslip could not be generated for this employee."));
        return;
      }
      const strHtml = await payslipService.getDownloadHtml(intPayslipID);
      if (blnPrint) {
        printPayslipHtml(strHtml);
      } else {
        downloadPayslipHtml(
          strHtml,
          buildPayslipFileName("payslip", dicRow.strPayslipNumber, dicRow.strEmployeeCode)
        );
      }
    } catch (objError) {
      setStrError(
        objError instanceof Error ? objError.message : "Unable to download payslip document."
      );
    } finally {
      setIntPayslipActionID(null);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <BlockingLoader blnOpen strLabel={t("loading_results", "Loading payroll results...")} />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {blnPayslipScreen
          ? t("payslip_breadcrumbs", "Payroll / Payslips")
          : t("breadcrumbs", "Payroll / Payroll Results")}
      </Typography>

      <Box className={`${styles.topBar} ${styles.hiddenHeader}`}>
        <Button
          className={styles.secondaryButton}
          startIcon={<ArrowBackRoundedIcon />}
          onClick={() => objRouter.push("/payroll")}
        >
          {t("back_button", "Back to Payroll")}
        </Button>
      </Box>

      <Box className={styles.controlsCard}>
        {!blnEssMode ? (
          <Box className={styles.controlsHeader} sx={{ mb: 1.25 }}>
            <Box>
              <Typography className={styles.title}>
                {blnPayslipScreen
                  ? t("payslips_title", "Payslips")
                  : t("payroll_results_title", "Payroll Results")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.4 }}>
                {blnPayslipScreen
                  ? t("payslips_help_generated", "View, download, print, or revise generated employee payslips.")
                  : t("payroll_results_help", "Review processed payroll calculations before generating payslips.")}
              </Typography>
            </Box>
          </Box>
        ) : null}
        <Box className={styles.searchRow}>
          <TextField
            value={dicSearchDraft.strSearchEmployee}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchEmployee: objEvent.target.value,
              }))
            }
            placeholder={t(
              "employee_search_placeholder",
              "Search by employee code or name"
            )}
            fullWidth
          />
          <TextField
            value={dicSearchDraft.strSearchRun}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchRun: objEvent.target.value,
              }))
            }
            placeholder={t("run_search_placeholder", "Search by payroll run")}
            fullWidth
          />
          <TextField
            select
            value={dicSearchDraft.strStatus}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strStatus: objEvent.target.value as SearchForm["strStatus"],
              }))
            }
            fullWidth
          >
            <MenuItem value="All">{t("status_all", "All statuses")}</MenuItem>
            {blnPayslipScreen ? (
              <MenuItem value="Generated">{t("status_generated", "Generated")}</MenuItem>
            ) : (
              [
                <MenuItem key="Calculated" value="Calculated">{t("status_calculated", "Calculated")}</MenuItem>,
                <MenuItem key="Approved" value="Approved">{t("status_approved", "Approved")}</MenuItem>,
                <MenuItem key="Published" value="Published">{t("status_published", "Published")}</MenuItem>,
                <MenuItem key="Paid" value="Paid">{t("status_paid", "Paid")}</MenuItem>,
              ]
            )}
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadResults(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadResults(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        {!blnCanAccessResults && !strError ? (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {t(
              "access_denied",
              "Payroll result view access is not available for your user group."
            )}
          </Alert>
        ) : null}

        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {canDoAny("export") ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() =>
                  downloadCsv(
                    blnPayslipScreen ? "payslips.csv" : "payroll-results.csv",
                    lstFilteredRows
                  )
                }
              >
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {canDoAny("export") ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() =>
                  exportPdf(
                    blnPayslipScreen ? "Payslips" : "Payroll Results",
                    lstFilteredRows
                  )
                }
              >
                {t("export_pdf", "Export PDF")}
              </Button>
            ) : null}
          </Box>

          <Box className={styles.paginationBar} sx={{ p: 0 }}>
            <Box className={styles.paginationInfo}>
              <Typography>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={intRowsPerPage}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
                sx={{ width: 92 }}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={intOption}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>{strRangeLabel}</Typography>
            </Box>
            <Pagination
              count={intPageCount}
              page={intCurrentPage}
              onChange={(_, intValue) => setIntPage(intValue)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
            />
          </Box>
        </Box>

        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.actionsColumn}>{t("actions", "Actions")}</th>
                <th>{t("employee_code", "Employee Code")}</th>
                <th>{t("employee_name", "Employee Name")}</th>
                {blnPayslipScreen ? <th>{t("payslip_no", "Payslip No.")}</th> : null}
                <th>{t("payroll_run", "Payroll Run")}</th>
                <th>{t("payroll_month", "Payroll Month")}</th>
                <th>{t("gross", "Gross")}</th>
                <th>{t("deductions", "Deductions")}</th>
                <th>{t("tax", "Tax")}</th>
                <th>{t("net_pay", "Net Pay")}</th>
                <th>{t("status", "Status")}</th>
                {blnPayslipScreen ? <th>{t("generated_on", "Generated On")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={blnPayslipScreen ? 12 : 10} className={styles.emptyState}>
                    {blnPayslipScreen
                      ? t(
                          "empty_generated_payslip_message",
                          "No generated payslips found. Generate payslips from a processed payroll run first."
                        )
                      : t(
                          "empty_message",
                          "No payroll results found for the current filters."
                        )}
                  </td>
                </tr>
              ) : (
                lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td className={styles.actionsColumn}>
                      <Box className={styles.actionCell} sx={{ gap: 0.75 }}>
                        <CommonRowActions
                          blnCanView
                          blnCanEdit={blnPayslipScreen}
                          onView={() =>
                            objRouter.push(
                              blnPayslipScreen
                                ? (blnEssMode
                                    ? `/payroll/payslips/${dicRow.intID}?backRoute=${strEssBackRoute}`
                                    : `/payroll/payslips/${dicRow.intID}`)
                                : `/payroll/results/${dicRow.intID}`
                            )
                          }
                          onEdit={() =>
                            objRouter.push(
                              dicRow.intEmployeePayrollInputID
                                ? (blnEssMode
                                    ? `/payroll/employee-payroll-inputs/${dicRow.intEmployeePayrollInputID}/edit?backRoute=${strEssBackRoute}`
                                    : `/payroll/employee-payroll-inputs/${dicRow.intEmployeePayrollInputID}/edit`)
                                : (blnEssMode
                                    ? `/payroll/payslips/${dicRow.intID}?backRoute=${strEssBackRoute}`
                                    : `/payroll/results/${dicRow.intID}`)
                            )
                          }
                        />
                        {blnPayslipScreen ? (
                          <>
                            <Button
                              className={styles.secondaryButton}
                              startIcon={<ReceiptLongRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, false)}
                              disabled={intPayslipActionID === dicRow.intID}
                            >
                              {t("download_payslip", "Download")}
                            </Button>
                            <Button
                              className={styles.secondaryButton}
                              startIcon={<PrintRoundedIcon />}
                              onClick={() => openPayslipDocument(dicRow, true)}
                              disabled={intPayslipActionID === dicRow.intID}
                            >
                              {t("print_payslip", "Print")}
                            </Button>
                          </>
                        ) : null}
                      </Box>
                    </td>
                    <td>{dicRow.strEmployeeCode}</td>
                    <td>{dicRow.strEmployeeName}</td>
                    {blnPayslipScreen ? <td>{dicRow.strPayslipNumber || "-"}</td> : null}
                    <td>{dicRow.strRunName}</td>
                    <td>{formatMonth(dicRow.dtPayrollMonth)}</td>
                    <td>{formatCurrency(dicRow.decGrossAmount)}</td>
                    <td>{formatCurrency(dicRow.decDeductionAmount)}</td>
                    <td>{formatCurrency(dicRow.decTaxAmount)}</td>
                    <td>{formatCurrency(dicRow.decNetPayAmount)}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={getStatusPillSx(
                          blnPayslipScreen
                            ? dicRow.strPayslipStatus || "Generated"
                            : dicRow.strStatus
                        )}
                      >
                        {blnPayslipScreen
                          ? dicRow.strPayslipStatus || t("status_generated", "Generated")
                          : dicRow.strStatus}
                      </span>
                    </td>
                    {blnPayslipScreen ? <td>{formatDateTime(dicRow.dtPayslipGeneratedOn)}</td> : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Box>
      </Box>

      <CommonPayrollDialog
        blnOpen={Boolean(objPreviewRecord)}
        onClose={() => setObjPreviewRecord(null)}
        strTitle={objPreviewRecord?.strEmployeeName ?? t("preview_title", "Payroll Result")}
        strSecondaryLabel={t("close", "Close")}
        blnHidePrimary
        maxWidth="lg"
        paperClassName={styles.dialogPaper}
        nodeContent={
          objPreviewRecord ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                }}
              >
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("employee", "Employee")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {objPreviewRecord.strEmployeeName} ({objPreviewRecord.strEmployeeCode})
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("payroll_run", "Payroll Run")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {objPreviewRecord.strRunName} ({objPreviewRecord.strRunCode})
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
                }}
              >
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("gross", "Gross")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decGrossAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("deductions", "Deductions")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decDeductionAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("tax", "Tax")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decTaxAmount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                    {t("net_pay", "Net Pay")}
                  </Typography>
                  <Typography sx={{ fontWeight: 700 }}>
                    {formatCurrency(objPreviewRecord.decNetPayAmount)}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("status", "Status")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strStatus}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                  {t("remarks", "Remarks")}
                </Typography>
                <Typography sx={{ fontWeight: 700 }}>
                  {objPreviewRecord.strRemarks || "-"}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mb: 0.75 }}>
                  {t("result_lines", "Result Lines")}
                </Typography>
                <Box sx={{ border: "1px solid #d9e6ef", borderRadius: 2, overflow: "hidden" }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{t("component", "Component")}</th>
                        <th>{t("category", "Category")}</th>
                        <th>{t("line_type", "Line Type")}</th>
                        <th>{t("amount", "Amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objPreviewRecord.lstLines.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyState}>
                            {t("no_lines", "No payroll result lines recorded.")}
                          </td>
                        </tr>
                      ) : null}
                      {objPreviewRecord.lstLines.map((dicLine) => (
                        <tr key={dicLine.intID}>
                          <td>{dicLine.strComponentName || dicLine.strComponentCode}</td>
                          <td>{dicLine.strComponentCategory || "-"}</td>
                          <td>{dicLine.strLineType || "-"}</td>
                          <td>{formatCurrency(dicLine.decAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>
              </Box>
            </Stack>
          ) : null
        }
      />
    </Box>
  );
}
