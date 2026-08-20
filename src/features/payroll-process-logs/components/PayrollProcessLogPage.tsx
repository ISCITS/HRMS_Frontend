"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import CommonRowActions from "@/components/master/CommonRowActions";
import styles from "@/components/master/MasterScreen.module.css";
import BlockingLoader from "@/components/shared/BlockingLoader";
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
      showToast(objError instanceof Error ? objError.message : t("load_filter_options_failed", "Unable to load payroll process log filter options."), "error");
    }
  }

  async function loadLogs(dicFilters: PayrollProcessLogFilters) {
    if (!blnCanView) {
      setLstLogs([]);
      setBlnLoading(false);
      return;
    }

    setBlnLoading(true);
    try {
      setLstLogs(await payrollProcessLogService.getPayrollProcessLogs(dicFilters));
    } catch (objError) {
      showToast(objError instanceof Error ? objError.message : t("load_logs_failed", "Unable to load payroll process logs."), "error");
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

  const lstTableRows = useMemo(
    () => lstLogs.map((dicRow) => ({
      id: dicRow.intID,
      action: (
        <CommonRowActions
          testIdPrefix="payroll-process-logs.list.row"
          rowKey={dicRow.intID}
          blnCanView
          onView={() => objRouter.push(`/payroll/process-log/run/${dicRow.intPayrollRunID}`)}
        />
      ),
      employee: (
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
      ),
      strProcessStage: dicRow.strProcessStage,
      strProcessStatus: (
        <span className={`${styles.statusPill} ${dicRow.strProcessStatus.toLowerCase().includes("success") ? styles.statusActive : styles.statusInactive}`}>
          {dicRow.strProcessStatus}
        </span>
      ),
      entity: dicRow.strEntityName ? `${dicRow.strEntityName}${dicRow.intEntityID ? ` #${dicRow.intEntityID}` : ""}` : "-",
      message: (
        <Box sx={{ whiteSpace: "normal", minWidth: 320, maxWidth: 540, lineHeight: 1.45 }}>
          {dicRow.strMessageText}
        </Box>
      ),
      dtAddedOn: formatDateTime(dicRow.dtAddedOn),
      dtAddedOnSortValue: dicRow.dtAddedOn ? new Date(dicRow.dtAddedOn).getTime() : 0
    })),
    [lstLogs, objRouter]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Actions"), sortable: false, filterable: false, exportable: false, width: 110 },
      { field: "employee", headerName: t("employee", "Employee"), sortable: false, filterable: false, width: 220 },
      { field: "strProcessStage", headerName: t("process_stage", "Process Stage") },
      { field: "strProcessStatus", headerName: t("process_status", "Process Status"), sortable: false, filterable: false, width: 150 },
      { field: "entity", headerName: t("entity", "Entity"), sortable: false, filterable: false, width: 220 },
      { field: "message", headerName: t("message_text", "Message"), sortable: false, filterable: false, width: 420 },
      { field: "dtAddedOn", headerName: t("logged_on", "Logged On"), sortAccessor: (dicRow) => dicRow.dtAddedOnSortValue }
    ],
    [lstTableRows, t]
  );

  function applySearch() {
    loadLogs(dicFiltersDraft).catch(() => undefined);
  }

  function clearFilters() {
    const dicReset = dicInitialFilters;
    setDicFiltersDraft(dicReset);
    loadLogs(dicReset).catch(() => undefined);
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
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      {blnRunScoped ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            data-controlid="payroll-process-logs.view.back.button"
            className={styles.secondaryButton}
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => objRouter.push("/payroll/process-log")}
          >
            {t("back_to_list", "Back to List")}
          </Button>
        </Box>
      ) : null}

      <Box className={styles.controlsCard}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
          }}
        >
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
            sx={{ flex: { xs: "1 1 100%", md: "1 1 220px" }, minWidth: { md: 220 }, maxWidth: { md: 320 } }}
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
            sx={{ flex: { xs: "1 1 100%", md: "1 1 210px" }, minWidth: { md: 210 }, maxWidth: { md: 280 } }}
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
            sx={{ flex: { xs: "1 1 100%", md: "1 1 210px" }, minWidth: { md: 210 }, maxWidth: { md: 280 } }}
          >
            <MenuItem value="">{t("all_statuses", "All Statuses")}</MenuItem>
            {dicOptions.lstProcessStatuses.map((strStatus) => (
              <MenuItem key={strStatus} value={strStatus}>
                {strStatus}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            data-controlid="payroll-process-logs.list.search-text.input"
            inputProps={{ "data-controlid": "payroll-process-logs.list.search-text.input" }}
            label={t("search_text", "Search Text")}
            value={dicFiltersDraft.strSearchText}
            onChange={(objEvent) => setDicFiltersDraft((dicPrevious) => ({ ...dicPrevious, strSearchText: objEvent.target.value }))}
            size="small"
            sx={{ flex: { xs: "1 1 100%", md: "1 1 280px" }, minWidth: { md: 260 }, maxWidth: { md: 360 } }}
          />
          <Box className={styles.searchActions} sx={{ ml: { md: "auto" } }}>
            <Button data-controlid="payroll-process-logs.list.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={applySearch}>
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
        <CommonTable
          columns={lstTableColumns}
          rows={lstTableRows}
          rowIdField="id"
          exportFileName="payroll_process_logs"
          showExportOptions={blnCanExport}
          showPaginationSummary
          emptyMessage={t("empty_message", "No payroll process logs found for the selected filters.")}
          testIdPrefix="payroll-process-logs.list"
          hideToolbar
          withPaper={false}
          sx={{ p: 0, boxShadow: "none", background: "transparent" }}
        />
      </Box>

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel={t("loading_payroll_process_logs", "Loading payroll process logs...")} />
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
