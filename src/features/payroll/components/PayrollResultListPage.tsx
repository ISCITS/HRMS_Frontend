"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
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
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
} from "@/features/payroll/types";

type SearchForm = {
  strSearchEmployee: string;
  strSearchRun: string;
  strStatus: "All" | "Calculated" | "Approved" | "Published" | "Paid";
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

export default function PayrollResultListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payslips");
  const { blnLoading: blnRightsLoading, canDoAny, canViewAny } =
    useModuleActionAccess([
      "PAYSLIPS",
      "PAYROLL_RESULTS",
      "PAYROLL_RESULT",
      "PAYROLL_PAYSLIPS",
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

  async function loadResults(objFilters: SearchForm = dicSearchApplied) {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstResults(await payrollResultService.getPayrollResults(objFilters));
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

    if (!canViewAny()) {
      setLstResults([]);
      setStrError("");
      setBlnLoading(false);
      return;
    }

    loadResults().catch(() => undefined);
  }, [blnRightsLoading]);

  const lstFilteredRows = useMemo(() => {
    const strEmployeeSearch = dicSearchApplied.strSearchEmployee.trim().toLowerCase();
    const strRunSearch = dicSearchApplied.strSearchRun.trim().toLowerCase();
    return lstResults.filter((dicRow) => {
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
        dicRow.strStatus === dicSearchApplied.strStatus;
      return blnEmployeeMatch && blnRunMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstResults]);

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

  if (blnLoading || blnRightsLoading) {
    return (
      <BlockingLoader strLabel={t("loading_results", "Loading payroll results...")} />
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Payroll Results")}
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
            <MenuItem value="Calculated">{t("status_calculated", "Calculated")}</MenuItem>
            <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
            <MenuItem value="Published">{t("status_published", "Published")}</MenuItem>
            <MenuItem value="Paid">{t("status_paid", "Paid")}</MenuItem>
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
        {!canViewAny() ? (
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
                onClick={() => downloadCsv("payroll-results.csv", lstFilteredRows)}
              >
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {canDoAny("export") ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => exportPdf("Payroll Results", lstFilteredRows)}
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
                <th>{t("payroll_run", "Payroll Run")}</th>
                <th>{t("payroll_month", "Payroll Month")}</th>
                <th>{t("gross", "Gross")}</th>
                <th>{t("deductions", "Deductions")}</th>
                <th>{t("tax", "Tax")}</th>
                <th>{t("net_pay", "Net Pay")}</th>
                <th>{t("status", "Status")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className={styles.emptyState}>
                    {t(
                      "empty_message",
                      "No payroll results found for the current filters."
                    )}
                  </td>
                </tr>
              ) : (
                lstVisibleRows.map((dicRow) => (
                  <tr key={dicRow.intID}>
                    <td className={styles.actionsColumn}>
                      <Box className={styles.actionCell}>
                        <CommonRowActions
                          blnCanView
                          onView={() => openPreview(dicRow.intID).catch(() => undefined)}
                        />
                      </Box>
                    </td>
                    <td>{dicRow.strEmployeeCode}</td>
                    <td>{dicRow.strEmployeeName}</td>
                    <td>{dicRow.strRunName}</td>
                    <td>{formatMonth(dicRow.dtPayrollMonth)}</td>
                    <td>{formatCurrency(dicRow.decGrossAmount)}</td>
                    <td>{formatCurrency(dicRow.decDeductionAmount)}</td>
                    <td>{formatCurrency(dicRow.decTaxAmount)}</td>
                    <td>{formatCurrency(dicRow.decNetPayAmount)}</td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={getStatusPillSx(dicRow.strStatus)}
                      >
                        {dicRow.strStatus}
                      </span>
                    </td>
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
