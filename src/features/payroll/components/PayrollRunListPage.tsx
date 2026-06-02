"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Pagination,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { PayrollRunListRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type SearchForm = {
  strSearch: string;
  strSearchMonth: string;
  strStatus: "All" | "Open" | "Submitted" | "Approved" | "Processed" | "Closed";
};

const dicEmptySearch: SearchForm = {
  strSearch: "",
  strSearchMonth: "",
  strStatus: "All",
};
const lstPayrollRunModuleCodes = ["PAYROLL_RUN", "PAYROLL_RUNS", "PAYROLL_PROCESS", "PAYROLL_PROCESSES"];
const lstRowsPerPageOptions = [10, 20, 50];

function formatMonth(strDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
  }).format(new Date(strDate));
}

function getStatusPillSx(strStatus: string) {
  const dicToneByStatus: Record<string, { background: string; color: string }> = {
    Open: { background: "#2563eb", color: "#fff" },
    Submitted: { background: "#ea580c", color: "#fff" },
    Approved: { background: "#16a34a", color: "#fff" },
    Processed: { background: "#0f766e", color: "#fff" },
    Closed: { background: "#475569", color: "#fff" },
  };
  return dicToneByStatus[strStatus] ?? { background: "#2563eb", color: "#fff" };
}

function downloadCsv(strFileName: string, lstRows: PayrollRunListRecord[]) {
  const lstHeaders = [
    "Run Code",
    "Run Name",
    "Payroll Month",
    "Status",
    "Locked",
    "Inputs",
    "Submitted",
  ];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.strRunCode,
        dicRow.strRunName,
        dicRow.dtPayrollMonth,
        dicRow.strRunStatus,
        dicRow.blnIsLocked ? "Yes" : "No",
        dicRow.dicSummary.intInputCount,
        dicRow.dicSummary.intSubmittedCount,
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

function exportPdf(strTitle: string, lstRows: PayrollRunListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1200,height=800");
  if (!objWindow) {
    return;
  }
  const strRows = lstRows
    .map(
      (dicRow) => `
    <tr>
      <td>${dicRow.strRunCode}</td>
      <td>${dicRow.strRunName}</td>
      <td>${dicRow.dtPayrollMonth}</td>
      <td>${dicRow.strRunStatus}</td>
      <td>${dicRow.blnIsLocked ? "Yes" : "No"}</td>
      <td>${dicRow.dicSummary.intInputCount}</td>
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
              <th>Run Code</th>
              <th>Run Name</th>
              <th>Payroll Month</th>
              <th>Status</th>
              <th>Locked</th>
              <th>Inputs</th>
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

export default function PayrollRunListPage() {
  const objRouter = useRouter();
  const { t } = useModuleLabels("payroll-runs");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstPayrollRunModuleCodes);
  const [lstRuns, setLstRuns] = useState<PayrollRunListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [dicSearchDraft, setDicSearchDraft] = useState<SearchForm>(dicEmptySearch);
  const [dicSearchApplied, setDicSearchApplied] =
    useState<SearchForm>(dicEmptySearch);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const blnCanView = canViewAny() || canDoAny("list");
  const blnCanAdd = canDoAny("add");
  const blnCanExport = canDoAny("export");

  async function loadRuns(objFilters: SearchForm = dicSearchApplied) {
    if (!blnCanView) {
      setLstRuns([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    setStrError("");
    try {
      setLstRuns(await payrollRunService.getPayrollRuns(objFilters));
      setIntPage(1);
    } catch (objError) {
      setStrError(
        objError instanceof Error
          ? objError.message
          : "Unable to load payroll runs."
      );
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadRuns().catch(() => undefined);
  }, [blnRightsLoading, blnCanView]);

  const lstFilteredRows = useMemo(() => {
      const strSearch = dicSearchApplied.strSearch.trim().toLowerCase();
      const strMonthSearch = dicSearchApplied.strSearchMonth.trim().toLowerCase();
    return lstRuns.filter((dicRow) => {
      const blnSearchMatch =
        !strSearch ||
        dicRow.strRunCode.toLowerCase().includes(strSearch) ||
        dicRow.strRunName.toLowerCase().includes(strSearch);
      const blnMonthMatch =
        !strMonthSearch ||
        formatMonth(dicRow.dtPayrollMonth).toLowerCase().includes(strMonthSearch);
      const blnStatusMatch =
        dicSearchApplied.strStatus === "All" ||
        dicRow.strRunStatus === dicSearchApplied.strStatus;
      return blnSearchMatch && blnMonthMatch && blnStatusMatch;
    });
  }, [dicSearchApplied, lstRuns]);

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

  if (blnLoading || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_runs", "Loading payroll runs...")} />;
  }

  return (
    <Box className={styles.page}>
      <Typography className={`${styles.breadcrumbs} ${styles.hiddenHeader}`}>
        {t("breadcrumbs", "Payroll / Payroll Runs")}
      </Typography>

      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow}>
          <TextField
            data-testid="payroll-runs.list.search.input"
            value={dicSearchDraft.strSearch}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearch: objEvent.target.value,
              }))
            }
            placeholder={t("search_placeholder", "Search by run code or name")}
            fullWidth
          />
          <TextField
            value={dicSearchDraft.strSearchMonth}
            onChange={(objEvent) =>
              setDicSearchDraft((dicPrevious) => ({
                ...dicPrevious,
                strSearchMonth: objEvent.target.value,
              }))
            }
            placeholder={t("month_placeholder", "Search payroll month")}
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
            <MenuItem value="All">{t("status_all", "All")}</MenuItem>
            <MenuItem value="Open">{t("status_open", "Open")}</MenuItem>
            <MenuItem value="Submitted">{t("status_submitted", "Submitted")}</MenuItem>
            <MenuItem value="Approved">{t("status_approved", "Approved")}</MenuItem>
            <MenuItem value="Processed">{t("status_processed", "Processed")}</MenuItem>
            <MenuItem value="Closed">{t("status_closed", "Closed")}</MenuItem>
          </TextField>
          <Box className={styles.searchActions}>
            <Button
              data-testid="payroll-runs.list.search.button"
              className={styles.primaryButton}
              startIcon={<SearchRoundedIcon />}
              onClick={() => {
                setDicSearchApplied(dicSearchDraft);
                loadRuns(dicSearchDraft).catch(() => undefined);
              }}
            >
              {t("search", "Search")}
            </Button>
            <Button
              data-testid="payroll-runs.list.clear.button"
              className={styles.secondaryButton}
              startIcon={<ClearRoundedIcon />}
              onClick={() => {
                setDicSearchDraft(dicEmptySearch);
                setDicSearchApplied(dicEmptySearch);
                loadRuns(dicEmptySearch).catch(() => undefined);
              }}
            >
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={styles.tableCard}>
        <Box className={styles.listUtilityBar}>
          <Box className={styles.listUtilityActions}>
            {blnCanAdd ? <Button
              data-testid="payroll-runs.list.add.button"
              className={styles.primaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={() => objRouter.push("/payroll/runs/new")}
            >
              {t("add_button", "Add Payroll Run")}
            </Button> : null}
            {blnCanExport ? <Button
              data-testid="payroll-runs.list.export-excel.button"
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => downloadCsv("payroll-runs.csv", lstFilteredRows)}
            >
              {t("export_excel", "Export Excel")}
            </Button> : null}
            {blnCanExport ? <Button
              data-testid="payroll-runs.list.export-pdf.button"
              className={styles.secondaryButton}
              startIcon={<DownloadRoundedIcon />}
              onClick={() => exportPdf("Payroll Runs", lstFilteredRows)}
            >
              {t("export_pdf", "Export PDF")}
            </Button> : null}
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

        {strRightsError ? <Alert severity="warning" sx={{ mb: 1.5 }}>{strRightsError}</Alert> : null}
        {strError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strError}</Alert> : null}
        {!blnCanView ? (
          <Box className={styles.emptyState}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{t("access_denied", "Payroll run access is not available for your user group.")}</Typography>
            <Typography sx={{ mt: 1, color: "#64748b" }}>{t("access_denied_help", "Contact your administrator if you need payroll run visibility.")}</Typography>
          </Box>
        ) : null}
        {blnCanView ? <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.actionsColumn}>{t("actions", "Actions")}</th>
                <th>{t("run_code", "Run Code")}</th>
                <th>{t("run_name", "Run Name")}</th>
                <th>{t("payroll_month", "Payroll Month")}</th>
                <th>{t("status", "Status")}</th>
                <th>{t("locked", "Locked")}</th>
                <th>{t("inputs", "Inputs")}</th>
                <th>{t("submitted", "Submitted")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.emptyState}>
                    {t("empty_message", "No payroll runs found for the current filters.")}
                  </td>
                </tr>
              ) : null}
              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td className={styles.actionsColumn}>
                    <Box className={styles.actionCell}>
                      <CommonRowActions
                        testIdPrefix="payroll-runs.list.row"
                        rowKey={dicRow.intID}
                        blnCanView={blnCanView}
                        onView={() => objRouter.push(`/payroll/runs/${dicRow.intID}`)}
                      />
                    </Box>
                  </td>
                  <td>{dicRow.strRunCode}</td>
                  <td>{dicRow.strRunName}</td>
                  <td>{formatMonth(dicRow.dtPayrollMonth)}</td>
                  <td>
                    <span
                      className={styles.statusPill}
                      style={getStatusPillSx(dicRow.strRunStatus)}
                    >
                      {dicRow.strRunStatus}
                    </span>
                  </td>
                  <td>{dicRow.blnIsLocked ? t("yes", "Yes") : t("no", "No")}</td>
                  <td>{dicRow.dicSummary.intInputCount}</td>
                  <td>{dicRow.dicSummary.intSubmittedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box> : null}
      </Box>
    </Box>
  );
}
