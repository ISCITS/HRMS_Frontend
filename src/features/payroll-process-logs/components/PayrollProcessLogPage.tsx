"use client";

import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Pagination,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import { usePayrollProcessLogLabels } from "@/features/payroll-process-logs/hooks/usePayrollProcessLogLabels";
import {
  createInitialPayrollProcessLogFilters,
  payrollProcessLogService
} from "@/features/payroll-process-logs/services/payrollProcessLogService";
import type {
  PayrollProcessLogFilters,
  PayrollProcessLogFormOptions,
  PayrollProcessLogListRecord
} from "@/features/payroll-process-logs/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type ToastState = {
  blnOpen: boolean;
  strMessage: string;
  strSeverity: "success" | "error";
};

type PayrollProcessLogPageProps = {
  intInitialPayrollRunID?: number;
};

const lstModuleCodes = ["PAYROLL_PROCESS_LOG", "PAYROLL_PROCESS_LOGS", "MASTER_PAYROLL_PROCESS_LOG"];
const lstRowsPerPageOptions = [10, 20, 50];

const dicEmptyOptions: PayrollProcessLogFormOptions = {
  lstEmployees: [],
  lstProcessStages: [],
  lstProcessStatuses: []
};

function formatDateTime(strValue: string | null | undefined) {
  if (!strValue) {
    return "-";
  }

  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) {
    return strValue;
  }

  return objDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function downloadCsv(strFileName: string, lstRows: PayrollProcessLogListRecord[]) {
  const lstHeaders = ["Payroll Run ID", "Employee", "Stage", "Status", "Entity", "Message", "Logged On"];
  const lstLines = [
    lstHeaders.join(","),
    ...lstRows.map((dicRow) =>
      [
        dicRow.intPayrollRunID,
        dicRow.strEmployeeName ? `${dicRow.strEmployeeName}${dicRow.strEmployeeCode ? ` (${dicRow.strEmployeeCode})` : ""}` : "-",
        dicRow.strProcessStage,
        dicRow.strProcessStatus,
        dicRow.strEntityName ?? "-",
        dicRow.strMessageText,
        formatDateTime(dicRow.dtAddedOn)
      ]
        .map((strValue) => `"${String(strValue).replace(/"/g, '""')}"`)
        .join(",")
    )
  ];

  const objBlob = new Blob([lstLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const strUrl = URL.createObjectURL(objBlob);
  const objLink = document.createElement("a");
  objLink.href = strUrl;
  objLink.download = strFileName;
  objLink.click();
  URL.revokeObjectURL(strUrl);
}

function exportPdf(strTitle: string, lstRows: PayrollProcessLogListRecord[]) {
  const objWindow = window.open("", "_blank", "width=1280,height=860");
  if (!objWindow) {
    return;
  }

  const strRows = lstRows.map((dicRow) => `
    <tr>
      <td>${dicRow.intPayrollRunID}</td>
      <td>${dicRow.strEmployeeName ? `${dicRow.strEmployeeName}${dicRow.strEmployeeCode ? ` (${dicRow.strEmployeeCode})` : ""}` : "-"}</td>
      <td>${dicRow.strProcessStage}</td>
      <td>${dicRow.strProcessStatus}</td>
      <td>${dicRow.strEntityName ?? "-"}</td>
      <td>${dicRow.strMessageText}</td>
      <td>${formatDateTime(dicRow.dtAddedOn)}</td>
    </tr>
  `).join("");

  objWindow.document.write(`
    <html>
      <head>
        <title>${strTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <h1>${strTitle}</h1>
        <table>
          <thead>
            <tr>
              <th>Payroll Run ID</th>
              <th>Employee</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Entity</th>
              <th>Message</th>
              <th>Logged On</th>
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

export default function PayrollProcessLogPage({ intInitialPayrollRunID }: PayrollProcessLogPageProps) {
  const objRouter = useRouter();
  const { t } = usePayrollProcessLogLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny, isReadOnly } = useModuleActionAccess(lstModuleCodes);
  const dicInitialFilters = useMemo(
    () => createInitialPayrollProcessLogFilters(intInitialPayrollRunID),
    [intInitialPayrollRunID]
  );

  const [lstLogs, setLstLogs] = useState<PayrollProcessLogListRecord[]>([]);
  const [dicFiltersDraft, setDicFiltersDraft] = useState<PayrollProcessLogFilters>(dicInitialFilters);
  const [dicOptions, setDicOptions] = useState<PayrollProcessLogFormOptions>(dicEmptyOptions);
  const [blnLoading, setBlnLoading] = useState(true);
  const [intPage, setIntPage] = useState(1);
  const [intRowsPerPage, setIntRowsPerPage] = useState(10);
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const blnCanView = canViewAny();
  const blnCanExport = canDoAny("export");
  const blnReadOnly = isReadOnly();
  const blnRunScoped = typeof intInitialPayrollRunID === "number" && !Number.isNaN(intInitialPayrollRunID);

  function showToast(strMessage: string, strSeverity: ToastState["strSeverity"] = "success") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  async function loadFormOptions() {
    try {
      setDicOptions(await payrollProcessLogService.getFormOptions());
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load payroll process log filter options.", "error");
    }
  }

  async function loadLogs(dicFilters: PayrollProcessLogFilters) {
    if (!blnCanView) {
      setLstLogs([]);
      setIntPage(1);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    try {
      setLstLogs(await payrollProcessLogService.getPayrollProcessLogs(dicFilters));
      setIntPage(1);
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : "Unable to load payroll process logs.", "error");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    loadFormOptions().catch(() => undefined);
    loadLogs(dicInitialFilters).catch(() => undefined);
  }, [blnRightsLoading, dicInitialFilters]);

  const intPageCount = Math.max(1, Math.ceil(lstLogs.length / intRowsPerPage));
  const intCurrentPage = Math.min(intPage, intPageCount);
  const intStartIndex = (intCurrentPage - 1) * intRowsPerPage;
  const lstVisibleRows = useMemo(
    () => lstLogs.slice(intStartIndex, intStartIndex + intRowsPerPage),
    [intStartIndex, intRowsPerPage, lstLogs]
  );

  function applySearch() {
    loadLogs(dicFiltersDraft).catch(() => undefined);
  }

  function clearFilters() {
    const dicReset = dicInitialFilters;
    setDicFiltersDraft(dicReset);
    loadLogs(dicReset).catch(() => undefined);
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>
            {t("loading_payroll_process_logs", "Loading payroll process logs...")}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanView) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {t("access_denied", "Payroll process log access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need payroll process log visibility.")}
        </Typography>
        {strRightsError ? (
          <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Box className={styles.controlsCard}>
        <Box className={styles.searchRow} sx={{ gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr)) auto auto" } }}>
          <TextField
            label={t("payroll_run_id", "Payroll Run ID")}
            value={dicFiltersDraft.intPayrollRunID}
            onChange={(objEvent) => setDicFiltersDraft((dicPrevious) => ({ ...dicPrevious, intPayrollRunID: objEvent.target.value }))}
            size="small"
            disabled={blnRunScoped}
          />
          <TextField
            select
            label={t("employee", "Employee")}
            value={dicFiltersDraft.intEmployeeID}
            onChange={(objEvent) =>
              setDicFiltersDraft((dicPrevious) => ({
                ...dicPrevious,
                intEmployeeID: objEvent.target.value === "" ? "" : Number(objEvent.target.value)
              }))
            }
            size="small"
          >
            <MenuItem value="">{t("all_employees", "All Employees")}</MenuItem>
            {dicOptions.lstEmployees.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={String(dicOption.intID)}>
                {dicOption.strLabel}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("process_stage", "Process Stage")}
            value={dicFiltersDraft.strProcessStage}
            onChange={(objEvent) => setDicFiltersDraft((dicPrevious) => ({ ...dicPrevious, strProcessStage: objEvent.target.value }))}
            size="small"
          >
            <MenuItem value="">{t("all_stages", "All Stages")}</MenuItem>
            {dicOptions.lstProcessStages.map((strStage) => (
              <MenuItem key={strStage} value={strStage}>
                {strStage}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("process_status", "Process Status")}
            value={dicFiltersDraft.strProcessStatus}
            onChange={(objEvent) => setDicFiltersDraft((dicPrevious) => ({ ...dicPrevious, strProcessStatus: objEvent.target.value }))}
            size="small"
          >
            <MenuItem value="">{t("all_statuses", "All Statuses")}</MenuItem>
            {dicOptions.lstProcessStatuses.map((strStatus) => (
              <MenuItem key={strStatus} value={strStatus}>
                {strStatus}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("search_text", "Search Text")}
            value={dicFiltersDraft.strSearchText}
            onChange={(objEvent) => setDicFiltersDraft((dicPrevious) => ({ ...dicPrevious, strSearchText: objEvent.target.value }))}
            size="small"
          />
          <Box className={styles.searchActions}>
            <Button className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch}>
              {t("search", "Search")}
            </Button>
          </Box>
          <Box className={styles.searchActions}>
            <Button className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters}>
              {t("clear", "Clear")}
            </Button>
          </Box>
        </Box>
      </Box>

      {blnRunScoped ? (
        <Alert severity="info">
          {t("run_scoped_message", "Showing payroll process logs for the selected payroll run only.")}{" "}
          <strong>#{intInitialPayrollRunID}</strong>
        </Alert>
      ) : null}

      {blnReadOnly ? (
        <Alert severity="info">{t("read_only_mode", "You have view-only access for Payroll Process Logs.")}</Alert>
      ) : null}

      <Box className={styles.tableCard}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, gap: 1.25, flexWrap: "wrap", pb: 1 }}>
          <Typography sx={{ fontWeight: 800, color: "#17324d" }}>
            {t("log_records", "Process Log Records")} ({lstLogs.length})
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanExport ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => downloadCsv("payroll_process_logs.csv", lstLogs)}
              >
                {t("export_excel", "Export Excel")}
              </Button>
            ) : null}
            {blnCanExport ? (
              <Button
                className={styles.secondaryButton}
                startIcon={<DownloadRoundedIcon />}
                onClick={() => exportPdf(t("page_title", "Payroll Process Logs"), lstLogs)}
              >
                {t("export_pdf", "Export PDF")}
              </Button>
            ) : null}
          </Box>
        </Box>

        <Box className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("actions", "Actions")}</th>
                <th>{t("payroll_run_id", "Payroll Run ID")}</th>
                <th>{t("employee", "Employee")}</th>
                <th>{t("process_stage", "Process Stage")}</th>
                <th>{t("process_status", "Process Status")}</th>
                <th>{t("entity", "Entity")}</th>
                <th>{t("message_text", "Message")}</th>
                <th>{t("logged_on", "Logged On")}</th>
              </tr>
            </thead>
            <tbody>
              {lstVisibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <Box className={styles.emptyState}>
                      <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>
                        {t("empty_message", "No payroll process logs found for the selected filters.")}
                      </Typography>
                    </Box>
                  </td>
                </tr>
              ) : null}

              {lstVisibleRows.map((dicRow) => (
                <tr key={dicRow.intID}>
                  <td>
                    <CommonRowActions
                      blnCanView
                      onView={() => objRouter.push(`/payroll-process-logs/run/${dicRow.intPayrollRunID}`)}
                    />
                  </td>
                  <td>{dicRow.intPayrollRunID}</td>
                  <td>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                      <Typography sx={{ fontSize: "0.86rem", fontWeight: 700, color: "#1f2937" }}>
                        {dicRow.strEmployeeName ?? "-"}
                      </Typography>
                      {dicRow.strEmployeeCode ? (
                        <Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>
                          {dicRow.strEmployeeCode}
                        </Typography>
                      ) : null}
                    </Box>
                  </td>
                  <td>{dicRow.strProcessStage}</td>
                  <td>
                    <span className={`${styles.statusPill} ${dicRow.strProcessStatus.toLowerCase().includes("success") ? styles.statusActive : styles.statusInactive}`}>
                      {dicRow.strProcessStatus}
                    </span>
                  </td>
                  <td>{dicRow.strEntityName ? `${dicRow.strEntityName}${dicRow.intEntityID ? ` #${dicRow.intEntityID}` : ""}` : "-"}</td>
                  <td>
                    <Box sx={{ whiteSpace: "normal", minWidth: 320, maxWidth: 540, lineHeight: 1.45 }}>
                      {dicRow.strMessageText}
                    </Box>
                  </td>
                  <td>{formatDateTime(dicRow.dtAddedOn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {lstLogs.length > 0 ? (
          <Box className={styles.paginationBar} sx={{ py: 1.25 }}>
            <Box className={styles.paginationInfo}>
              <Typography className={styles.paginationLabel}>{t("rows_per_page", "Rows per page")}</Typography>
              <TextField
                select
                size="small"
                value={String(intRowsPerPage)}
                onChange={(objEvent) => {
                  setIntRowsPerPage(Number(objEvent.target.value));
                  setIntPage(1);
                }}
                className={styles.rowsPerPageSelect}
              >
                {lstRowsPerPageOptions.map((intOption) => (
                  <MenuItem key={intOption} value={String(intOption)}>
                    {intOption}
                  </MenuItem>
                ))}
              </TextField>
              <Typography className={styles.paginationRange}>
                {intStartIndex + 1}-{Math.min(intStartIndex + intRowsPerPage, lstLogs.length)} {t("pagination_separator", "of")} {lstLogs.length}
              </Typography>
            </Box>

            <Pagination
              count={intPageCount}
              page={intCurrentPage}
              onChange={(_objEvent, intValue) => setIntPage(intValue)}
              color="primary"
              shape="rounded"
            />
          </Box>
        ) : null}
      </Box>

      <Snackbar
        open={objToast.blnOpen}
        autoHideDuration={3500}
        onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setObjToast((objPrevious) => ({ ...objPrevious, blnOpen: false }))} severity={objToast.strSeverity} variant="filled">
          {objToast.strMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
