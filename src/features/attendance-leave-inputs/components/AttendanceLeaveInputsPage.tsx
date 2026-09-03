"use client";

import ImportExportRoundedIcon from "@mui/icons-material/ImportExportRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { loadAttendanceLeaveInputsForRun, attendanceLeaveInputsService } from "@/features/attendance-leave-inputs/services/attendanceLeaveInputsService";
import type { AttendanceLeaveInputRow, AttendanceLeaveInputsSummary } from "@/features/attendance-leave-inputs/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { AttendanceIntegrationStatusRecord, PayrollRunListRecord, PayrollRunDetailRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import masterStyles from "@/components/master/MasterScreen.module.css";

const lstAttendanceLeaveInputModuleCodes = [
  "PAYROLL_ATTENDANCE_INTEGRATION",
  "PAYROLL_ATTENDANCE",
  "ATTENDANCE_PAYROLL_INTEGRATION",
  // The actual dedicated menu, seeded 2026-08-26 - written speculatively before it existed.
  "ATTENDANCE_LEAVE_INPUTS",
  "ATTENDANCE_LEAVE_INPUT",
  "PAYROLL_RUN",
  "PAYROLL_RUNS",
];

function formatMonth(strDate: string | null) {
  if (!strDate) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(strDate));
}

function getReviewStatusTone(strStatus: AttendanceLeaveInputRow["strReviewStatus"]) {
  if (strStatus === "Blocked") {
    return { background: "#fef2f2", border: "#fecaca", color: "#dc2626" };
  }
  if (strStatus === "Warning") {
    return { background: "#fff7ed", border: "#fed7aa", color: "#ea580c" };
  }
  if (strStatus === "Ready") {
    return { background: "#ecfdf5", border: "#bbf7d0", color: "#15803d" };
  }
  return { background: "#f8fafc", border: "#e2e8f0", color: "#64748b" };
}

export default function AttendanceLeaveInputsPage() {
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { t } = useModuleLabels("attendance-leave-inputs");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstAttendanceLeaveInputModuleCodes);
  const [lstRuns, setLstRuns] = useState<PayrollRunListRecord[]>([]);
  // runId in the query string is the run's record_uuid, not its internal id. A legacy numeric link
  // still resolves (see fnFindRun), so old bookmarks keep working.
  const [strSelectedRunKey, setStrSelectedRunKey] = useState<string>(() => objSearchParams.get("runId") ?? "");
  const [objRun, setObjRun] = useState<PayrollRunDetailRecord | null>(null);
  const [lstRows, setLstRows] = useState<AttendanceLeaveInputRow[]>([]);
  const [objSummary, setObjSummary] = useState<AttendanceLeaveInputsSummary | null>(null);
  const [objIntegrationStatus, setObjIntegrationStatus] = useState<AttendanceIntegrationStatusRecord | null>(null);
  const [blnLoadingRuns, setBlnLoadingRuns] = useState(true);
  const [blnLoadingDetail, setBlnLoadingDetail] = useState(false);
  const [blnActionLoading, setBlnActionLoading] = useState(false);
  const [strActionLabel, setStrActionLabel] = useState("");
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnReopenDialogOpen, setBlnReopenDialogOpen] = useState(false);
  const [strReopenReason, setStrReopenReason] = useState("");

  // The picker's runs are the source of truth for the mapping; matching intID as well keeps a
  // pre-migration /payroll/attendance-leave-inputs?runId=36 link working.
  const objSelectedRun = useMemo(
    () => lstRuns.find((dicRun) => dicRun.strRecordUUID === strSelectedRunKey || String(dicRun.intID) === strSelectedRunKey) ?? null,
    [lstRuns, strSelectedRunKey],
  );
  // The payroll services address a run by its record_uuid, and so does this page's URL, so the
  // resolved run's public identifier is what everything downstream uses.
  const strSelectedRunUUID = objSelectedRun?.strRecordUUID ?? "";

  const blnCanView = canViewAny();
  const blnCanManage = canDoAny("manage") || canDoAny("edit");
  const blnCanOverride = canDoAny("override");

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) {
      setBlnLoadingRuns(false);
      return;
    }
    payrollRunService
      .getPayrollRuns()
      .then((lstResult) => setLstRuns(lstResult))
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : "Unable to load payroll runs."))
      .finally(() => setBlnLoadingRuns(false));
  }, [blnRightsLoading, blnCanView]);

  async function loadDetail(strRunID: string) {
    setBlnLoadingDetail(true);
    setStrError("");
    try {
      const {
        objRun: dicRun,
        lstRows: lstNewRows,
        objSummary: dicSummary,
        objIntegrationStatus: dicIntegrationStatus,
      } = await loadAttendanceLeaveInputsForRun(strRunID);
      setObjRun(dicRun);
      setLstRows(lstNewRows);
      setObjSummary(dicSummary);
      setObjIntegrationStatus(dicIntegrationStatus);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load attendance & leave inputs for this run.");
    } finally {
      setBlnLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (!strSelectedRunUUID) {
      setObjRun(null);
      setLstRows([]);
      setObjSummary(null);
      setObjIntegrationStatus(null);
      return;
    }
    loadDetail(strSelectedRunUUID).catch(() => undefined);
  }, [strSelectedRunUUID]);

  function selectRun(strRunKey: string) {
    setStrSelectedRunKey(strRunKey);
    const strTarget = strRunKey ? `/payroll/attendance-leave-inputs?runId=${strRunKey}` : "/payroll/attendance-leave-inputs";
    objRouter.replace(strTarget);
  }

  async function importOrRefresh() {
    if (!strSelectedRunUUID || !blnCanManage) {
      return;
    }
    setBlnActionLoading(true);
    setStrActionLabel(t("importing", "Importing from Attendance & Leave..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicImportResult = await attendanceLeaveInputsService.importOrRefresh(strSelectedRunUUID);
      await loadDetail(strSelectedRunUUID);
      if (dicImportResult.intTotalEmployees === 0) {
        setStrError(
          t(
            "import_no_employees",
            "No employees are in scope for this payroll run. Check the selected employee, payroll group, employment status, joining/exit dates, and payroll period."
          )
        );
        return;
      }
      if (dicImportResult.intAppliedCount === 0 && dicImportResult.intBlockedCount > 0) {
        setStrError(
          t(
            "import_blocked",
            "Attendance & leave data could not be imported because the selected employees have blocking attendance issues."
          )
        );
        return;
      }
      setStrSuccess(t("import_success", "Attendance & leave data imported successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to import attendance & leave data.");
    } finally {
      setBlnActionLoading(false);
      setStrActionLabel("");
    }
  }

  async function finalizeInputs() {
    if (!strSelectedRunUUID || !blnCanManage) {
      return;
    }
    setBlnActionLoading(true);
    setStrActionLabel(t("finalizing", "Finalizing attendance & leave inputs..."));
    setStrError("");
    setStrSuccess("");
    try {
      await attendanceLeaveInputsService.finalize(strSelectedRunUUID);
      await loadDetail(strSelectedRunUUID);
      setStrSuccess(t("finalize_success", "Attendance & leave inputs finalized successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to finalize attendance & leave inputs.");
    } finally {
      setBlnActionLoading(false);
      setStrActionLabel("");
    }
  }

  function openReopenDialog() {
    if (!blnCanOverride) {
      return;
    }
    setStrReopenReason("");
    setBlnReopenDialogOpen(true);
  }

  async function reopenAndRefresh() {
    const strReason = strReopenReason.trim();
    if (!strSelectedRunUUID || !blnCanOverride || !strReason) {
      return;
    }
    setBlnReopenDialogOpen(false);
    setBlnActionLoading(true);
    setStrActionLabel(t("reopening", "Reopening and refreshing..."));
    setStrError("");
    setStrSuccess("");
    try {
      const dicImportResult = await attendanceLeaveInputsService.reopenAndRefresh(strSelectedRunUUID, strReason);
      await loadDetail(strSelectedRunUUID);
      if (dicImportResult.intTotalEmployees === 0) {
        setStrError(
          t(
            "import_no_employees",
            "No employees are in scope for this payroll run. Check the selected employee, payroll group, employment status, joining/exit dates, and payroll period."
          )
        );
        return;
      }
      if (dicImportResult.intAppliedCount === 0 && dicImportResult.intBlockedCount > 0) {
        setStrError(
          t(
            "import_blocked",
            "Attendance & leave data could not be imported because the selected employees have blocking attendance issues."
          )
        );
        return;
      }
      setStrSuccess(t("reopen_success", "Attendance & leave inputs reopened and refreshed successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to reopen attendance & leave inputs.");
    } finally {
      setBlnActionLoading(false);
      setStrActionLabel("");
    }
  }

  const strRawIntegrationStatus = objIntegrationStatus?.strIntegrationStatus ?? "NOT_STARTED";
  const blnIntegrationNotStarted = strRawIntegrationStatus === "NOT_STARTED";
  const dicIntegrationStatusLabels: Record<AttendanceIntegrationStatusRecord["strIntegrationStatus"], string> = {
    NOT_STARTED: t("integration_status_not_started", "Not started"),
    IMPORTED: t("integration_status_imported", "Imported"),
    FINALIZED: t("integration_status_finalized", "Finalized"),
    REOPENED: t("integration_status_reopened", "Reopened"),
  };
  const strIntegrationStatus = dicIntegrationStatusLabels[strRawIntegrationStatus];
  const strIntegrationVersionSuffix =
    objIntegrationStatus?.intVersionNumber != null ? ` (v${objIntegrationStatus.intVersionNumber})` : "";

  const lstTableRows = useMemo(
    () =>
      lstRows.map((dicRow) => ({
        id: dicRow.intInputID ?? `validation-${dicRow.intEmployeeID}`,
        action: dicRow.intInputID ? (
          <Button
            size="small"
            startIcon={<VisibilityRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => objRouter.push(`/payroll/inputs/${dicRow.strInputRecordUUID}/edit`)}
            controlId="attendance-leave-inputs.list.row.view.button"
            data-row-key={dicRow.intInputID}
          >
            {t("view", "View")}
          </Button>
        ) : (
          <Typography sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>
            {t("no_input", "No input")}
          </Typography>
        ),
        strEmployeeCode: dicRow.strEmployeeCode,
        strEmployeeName: dicRow.strEmployeeName,
        strIssueMessage: dicRow.strIssueMessage ?? "-",
        decWorkingDays: dicRow.decWorkingDays ?? 0,
        decLwpDays: dicRow.decLwpDays ?? 0,
        decPayableDays: dicRow.decPayableDays ?? 0,
        decLopDays: dicRow.decLopDays ?? 0,
        intExceptionCount: dicRow.intExceptionCount,
        strReviewStatus: (
          <Chip
            size="small"
            label={dicRow.strReviewStatus}
            sx={{ ...getReviewStatusTone(dicRow.strReviewStatus), border: "1px solid", fontWeight: 800, height: 22 }}
          />
        ),
      })),
    [lstRows, objRouter, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      { field: "action", headerName: t("actions", "Action"), sortable: false, filterable: false, exportable: false, width: 100 },
      { field: "strEmployeeCode", headerName: t("employee_code", "Employee Code") },
      { field: "strEmployeeName", headerName: t("employee_name", "Employee Name") },
      { field: "strIssueMessage", headerName: t("issue", "Issue"), minWidth: 260 },
      { field: "decWorkingDays", headerName: t("working_days", "Working Days"), align: "right" },
      { field: "decPayableDays", headerName: t("payable_days", "Payable Days"), align: "right" },
      { field: "decLwpDays", headerName: t("lwp_days", "LWP"), align: "right" },
      { field: "decLopDays", headerName: t("lop_days", "LOP Days"), align: "right" },
      { field: "intExceptionCount", headerName: t("exceptions", "Exceptions"), align: "right" },
      { field: "strReviewStatus", headerName: t("review_status", "Review Status"), sortable: false, filterable: false },
    ],
    [t]
  );

  if (blnLoadingRuns || blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading", "Loading...")} />;
  }

  if (!blnCanView) {
    return (
      <Box className={masterStyles.page}>
        <Alert severity="warning">{t("access_denied", "Attendance & Leave Inputs access is not available for your user group.")}</Alert>
      </Box>
    );
  }

  return (
    <Box className={masterStyles.page}>
      <Typography className={masterStyles.breadcrumbs}>
        {t("breadcrumbs", "Payroll / Attendance & Leave Inputs")}
      </Typography>

      <Box className={masterStyles.controlsCard}>
        <Box className={masterStyles.searchRow}>
          <TextField
            select
            label={t("payroll_run", "Payroll Run")}
            value={objSelectedRun?.strRecordUUID ?? ""}
            onChange={(objEvent) => selectRun(objEvent.target.value)}
            controlId="attendance-leave-inputs.run-select.select"
            fullWidth
          >
            <MenuItem value="">{t("select_run", "Select a payroll run")}</MenuItem>
            {lstRuns.map((dicRunOption) => (
              <MenuItem key={dicRunOption.intID} value={dicRunOption.strRecordUUID}>
                {dicRunOption.strRunName}
              </MenuItem>
            ))}
          </TextField>
          <TextField label={t("payroll_period", "Payroll Period")} value={objRun ? formatMonth(objRun.dtPayrollMonth) : "-"} disabled fullWidth />
          <TextField label={t("payroll_group", "Payroll Group")} value={objRun?.strPayrollGroupName ?? "-"} disabled fullWidth />
          <TextField label={t("integration_status", "Integration Status")} value={strSelectedRunUUID ? `${strIntegrationStatus}${strIntegrationVersionSuffix}` : "-"} disabled fullWidth />
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}

      {/* A deep link names the run by uuid, which cannot be resolved until the run list arrives —
          so the "pick a run" prompt waits rather than flashing over a run that is about to load. */}
      {!strSelectedRunUUID && !(blnLoadingRuns && strSelectedRunKey) ? (
        <Alert severity="info">{t("select_run_prompt", "Select a payroll run to view or import its attendance & leave inputs.")}</Alert>
      ) : blnLoadingDetail ? (
        <BlockingLoader blnOpen strLabel={t("loading_run", "Loading run details...")} />
      ) : blnIntegrationNotStarted ? (
        <Alert severity="info">
          {t(
            "not_enabled_message",
            "Attendance & Leave integration has not been enabled for this payroll run. Payroll can continue using manual payroll inputs."
          )}
        </Alert>
      ) : null}

      {strSelectedRunUUID && !blnLoadingDetail ? (
        <>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {blnCanManage ? (
              <Button
                className={masterStyles.primaryButton}
                startIcon={<ImportExportRoundedIcon />}
                onClick={importOrRefresh}
                disabled={blnActionLoading}
                controlId="attendance-leave-inputs.import.button"
              >
                {t("import_refresh", "Import / Refresh")}
              </Button>
            ) : null}
            {blnCanManage ? (
              <Button
                className={masterStyles.secondaryButton}
                startIcon={<LockRoundedIcon />}
                onClick={finalizeInputs}
                disabled={blnActionLoading || lstRows.length === 0}
                controlId="attendance-leave-inputs.finalize.button"
              >
                {t("finalize_inputs", "Finalize Inputs")}
              </Button>
            ) : null}
            {blnCanOverride ? (
              <Button
                className={masterStyles.secondaryButton}
                startIcon={<RestartAltRoundedIcon />}
                onClick={openReopenDialog}
                disabled={blnActionLoading}
                controlId="attendance-leave-inputs.reopen.button"
              >
                {t("reopen_refresh", "Reopen & Refresh")}
              </Button>
            ) : null}
          </Box>

          {objSummary ? (
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "repeat(2, minmax(0,1fr))", md: "repeat(6, minmax(0,1fr))" },
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                p: 1.25,
                background: "#fff",
              }}
            >
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("employees", "Employees")}</Typography><Typography sx={{ fontWeight: 900 }}>{objSummary.intEmployees}</Typography></Stack>
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("finalized_source_days", "Finalized Source Days")}</Typography><Typography sx={{ fontWeight: 900 }}>{objSummary.decFinalizedSourceDays.toFixed(1)}</Typography></Stack>
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("lwp", "LWP")}</Typography><Typography sx={{ fontWeight: 900 }}>{objSummary.decTotalLwp.toFixed(1)}</Typography></Stack>
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("lop", "LOP")}</Typography><Typography sx={{ fontWeight: 900 }}>{objSummary.decTotalLop.toFixed(1)}</Typography></Stack>
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("open_exceptions", "Open Exceptions")}</Typography><Typography sx={{ fontWeight: 900, color: objSummary.intOpenExceptions > 0 ? "#dc2626" : "#0f172a" }}>{objSummary.intOpenExceptions}</Typography></Stack>
              <Stack><Typography sx={{ color: "#64748b", fontSize: "0.76rem", fontWeight: 700 }}>{t("warnings", "Warnings")}</Typography><Typography sx={{ fontWeight: 900, color: objSummary.intWarnings > 0 ? "#ea580c" : "#0f172a" }}>{objSummary.intWarnings}</Typography></Stack>
            </Box>
          ) : null}

          <Box className={masterStyles.tableCard}>
            <CommonTable
              columns={lstTableColumns}
              rows={lstTableRows}
              rowIdField="id"
              exportFileName="attendance-leave-inputs"
              testIdPrefix="attendance-leave-inputs.list"
              showPaginationSummary
              emptyMessage={t("no_records", "No payroll input records found for this run.")}
              sx={{ p: 0, boxShadow: "none", background: "transparent" }}
            />
          </Box>
        </>
      ) : null}

      <Dialog open={blnReopenDialogOpen} onClose={() => setBlnReopenDialogOpen(false)} maxWidth="sm" fullWidth controlId="attendance-leave-inputs.reopen.dialog">
        <DialogTitle>{t("reopen_reason_title", "Reason for reopening finalized inputs")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={strReopenReason}
            onChange={(objEvent) => setStrReopenReason(objEvent.target.value)}
            placeholder={t("reopen_reason_placeholder", "Enter the business reason for refreshing finalized attendance & leave inputs")}
            sx={{ mt: 1 }}
            controlId="attendance-leave-inputs.reopen.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={masterStyles.secondaryButton} onClick={() => setBlnReopenDialogOpen(false)} controlId="attendance-leave-inputs.reopen.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button
            className={masterStyles.primaryButton}
            onClick={reopenAndRefresh}
            disabled={!strReopenReason.trim()}
            controlId="attendance-leave-inputs.reopen.submit.button"
          >
            {t("reopen_refresh", "Reopen & Refresh")}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnActionLoading} strLabel={strActionLabel || t("processing", "Processing...")} />
    </Box>
  );
}
