"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Grid, IconButton, MenuItem, Paper, Stack, Tab, Tabs, TextField,
} from "@mui/material";
import { useMemo, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";

import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import WorkHolidayDetailDrawer from "@/features/work-on-holiday/components/WorkHolidayDetailDrawer";
import { useWorkHolidayDetail, useWorkHolidayList } from "@/features/work-on-holiday/hooks/useWorkHoliday";
import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import { WORK_HOLIDAY_ACTION_ALIASES as dicActionAliases } from "@/features/work-on-holiday/types/WorkHolidayTypes";
import { WORK_HOLIDAY_MODULE_CODES as lstModuleCodes } from "@/features/work-on-holiday/types/WorkHolidayTypes";
import type { WorkHolidayRequest } from "@/features/work-on-holiday/types/WorkHolidayTypes";

type WorkHolidayWorkbenchRow = Record<string, ReactNode> & { intID: number };
const strTabStorageKey = "hrms:work-on-holiday:workbench-tab";
const strFilterStorageKey = "hrms:work-on-holiday:workbench-filter";

function calculateHours(strStart: string, strEnd: string) {
  if (!strStart || !strEnd) return 0;
  const [intStartHour, intStartMinute] = strStart.split(":").map(Number);
  const [intEndHour, intEndMinute] = strEnd.split(":").map(Number);
  const intMinutes = (intEndHour * 60 + intEndMinute) - (intStartHour * 60 + intStartMinute);
  return Math.max(0, Number((intMinutes / 60).toFixed(2)));
}

export default function WorkHolidayRequestsPage({ blnEssManagerMode = false }: { blnEssManagerMode?: boolean }) {
  const { t } = useModuleLabels("work_on_holiday");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo } = useActionRights();
  const fnCan = (strAction: string) => lstModuleCodes.some((strModule) =>
    (dicActionAliases[strAction] ?? [strAction]).some((strAlias) => canDo(strModule, strAlias)),
  );
  // An ESS manager reaches this screen only because the backend already verified they are
  // the assigned line/reporting manager for the requests it returns, so approval actions and
  // the queue itself do not additionally require the HR-only WORK_ON_HOLIDAY_* RBAC rights.
  const blnCanApprove = blnEssManagerMode || fnCan("WORK_ON_HOLIDAY_APPROVE");
  const blnCanReject = blnEssManagerMode || fnCan("WORK_ON_HOLIDAY_REJECT");
  const blnCanSendBack = blnEssManagerMode || fnCan("WORK_ON_HOLIDAY_SEND_BACK");
  const blnCanVerify = !blnEssManagerMode && fnCan("WORK_ON_HOLIDAY_VERIFY");
  const blnCanViewAll = !blnEssManagerMode && (fnCan("WORK_ON_HOLIDAY_VIEW_ALL") || fnCan("WORK_ON_HOLIDAY_MANAGE"));
  const blnCanView = blnEssManagerMode || fnCan("WORK_ON_HOLIDAY_VIEW") || blnCanViewAll;
  const blnCanApprovalQueue = blnEssManagerMode || blnCanApprove || blnCanViewAll;
  const blnCanOnBehalf = !blnEssManagerMode && fnCan("WORK_ON_HOLIDAY_CREATE_ON_BEHALF");
  const blnCanPost = !blnEssManagerMode && fnCan("WORK_ON_HOLIDAY_POST");
  const blnCanReverse = !blnEssManagerMode && (fnCan("WORK_ON_HOLIDAY_REVERSE") || fnCan("WORK_ON_HOLIDAY_OVERRIDE"));
  const blnCanAct = blnCanApprove || blnCanReject || blnCanSendBack || blnCanVerify || blnCanPost || blnCanReverse;
  const lstTabs = useMemo(() => [
    { strCode: "approval", strLabel: t("tab_pending_my_approval", "Pending My Approval"), blnVisible: blnCanApprovalQueue },
    { strCode: "all", strLabel: t("tab_all_requests", "All Requests"), blnVisible: blnCanViewAll },
    { strCode: "history", strLabel: t("tab_completed_history", "Completed / History"), blnVisible: blnCanViewAll },
  ].filter((objTab) => objTab.blnVisible), [blnCanApprovalQueue, blnCanViewAll, t]);
  const [intTab, setIntTab] = useState(() => typeof window === "undefined" ? 0 : Number(sessionStorage.getItem(strTabStorageKey) ?? 0));
  const [strStatusFilter, setStrStatusFilter] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem(strFilterStorageKey) ?? "");
  const [strSearch, setStrSearch] = useState("");
  const [strAppliedStatusFilter, setStrAppliedStatusFilter] = useState(strStatusFilter);
  const [strAppliedSearch, setStrAppliedSearch] = useState("");
  const [strError, setStrError] = useState("");
  const [strNotice, setStrNotice] = useState("");
  const [blnOnBehalfOpen, setBlnOnBehalfOpen] = useState(false);
  const [blnActionMode, setBlnActionMode] = useState(false);
  const [objOnBehalf, setObjOnBehalf] = useState({
    intEmployeeID: "", dtWorkDate: "", strRequestedOutcomeCode: "COMPOFF",
    decRequestedCreditDays: 1, tmPlannedStartTime: "", tmPlannedEndTime: "",
    tmActualStartTime: "", tmActualEndTime: "", strWorkReason: "",
    strWorkDescription: "", strOnBehalfReason: "",
  });
  const strSelectedTab = lstTabs[Math.min(intTab, Math.max(lstTabs.length - 1, 0))]?.strCode ?? "approval";
  const strApiStatus = strSelectedTab === "history" ? (strAppliedStatusFilter || "POSTED")
    : strSelectedTab === "all" ? (strAppliedStatusFilter || undefined) : undefined;
  const strMode = strSelectedTab === "approval" ? (blnEssManagerMode ? "approvals" : "queue") : "all";
  const blnListEnabled = strMode === "all" ? blnCanViewAll : blnCanApprovalQueue;
  const { objList, blnLoading, strError: strListError, reload } = useWorkHolidayList(strMode, strApiStatus, 1, 100, blnListEnabled);
  const { objDetail, blnLoading: blnDetailLoading, loadDetail, setObjDetail } = useWorkHolidayDetail();

  function changeTab(_objEvent: SyntheticEvent, intValue: number) {
    setIntTab(intValue);
    sessionStorage.setItem(strTabStorageKey, String(intValue));
  }

  function searchRequests() {
    setStrAppliedSearch(strSearch);
    setStrAppliedStatusFilter(strStatusFilter);
    sessionStorage.setItem(strFilterStorageKey, strStatusFilter);
    void reload();
  }

  function clearRequestFilters() {
    setStrSearch("");
    setStrStatusFilter("");
    setStrAppliedSearch("");
    setStrAppliedStatusFilter("");
    sessionStorage.removeItem(strFilterStorageKey);
  }

  async function openRequestDetail(intRequestID: number) {
    setBlnActionMode(false);
    await loadDetail(intRequestID);
  }

  async function openRequestActions(intRequestID: number) {
    setBlnActionMode(true);
    await loadDetail(intRequestID);
  }

  function canActOnRequest(objRequest: WorkHolidayRequest) {
    return (
      (objRequest.strRequestStatus === "PENDING_APPROVAL" && !objRequest.blnApprovalDecisionTaken && (blnCanApprove || blnCanReject || blnCanSendBack))
      || (["APPROVED", "PENDING_ATTENDANCE_VERIFICATION"].includes(objRequest.strRequestStatus) && blnCanVerify)
      || (["READY", "FAILED", "PARTIAL"].includes(objRequest.strPostingStatus) && blnCanPost)
      || (objRequest.strPostingStatus === "POSTED" && blnCanReverse)
    );
  }

  function closeDetailDrawer() {
    setBlnActionMode(false);
    setObjDetail(null);
  }

  async function createOnBehalf() {
    if (
      !objOnBehalf.intEmployeeID || !objOnBehalf.dtWorkDate || !objOnBehalf.tmPlannedStartTime
      || !objOnBehalf.tmPlannedEndTime || objOnBehalf.strWorkReason.trim().length < 3
      || objOnBehalf.strOnBehalfReason.trim().length < 3
    ) {
      setStrError(t("validation_on_behalf", "Employee, date, planned timings, work reason and on-behalf reason are required."));
      return;
    }
    try {
      await workHolidayService.createOnBehalf({
        intEmployeeID: Number(objOnBehalf.intEmployeeID), dtWorkDate: objOnBehalf.dtWorkDate,
        strRequestedOutcomeCode: objOnBehalf.strRequestedOutcomeCode,
        tmPlannedStartTime: objOnBehalf.tmPlannedStartTime,
        tmPlannedEndTime: objOnBehalf.tmPlannedEndTime,
        tmActualStartTime: objOnBehalf.tmActualStartTime || null,
        tmActualEndTime: objOnBehalf.tmActualEndTime || null,
        decRequestedHours: calculateHours(objOnBehalf.tmPlannedStartTime, objOnBehalf.tmPlannedEndTime),
        decRequestedCreditDays: objOnBehalf.decRequestedCreditDays,
        strWorkReason: objOnBehalf.strWorkReason,
        strWorkDescription: objOnBehalf.strWorkDescription,
        intBackupEmployeeID: null, strOnBehalfReason: objOnBehalf.strOnBehalfReason,
      });
      setBlnOnBehalfOpen(false);
      setObjOnBehalf({
        intEmployeeID: "", dtWorkDate: "", strRequestedOutcomeCode: "COMPOFF",
        decRequestedCreditDays: 1, tmPlannedStartTime: "", tmPlannedEndTime: "",
        tmActualStartTime: "", tmActualEndTime: "", strWorkReason: "",
        strWorkDescription: "", strOnBehalfReason: "",
      });
      setStrNotice(t("on_behalf_created", "On-behalf draft created successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save request."));
    }
  }

  const lstColumns: DataGridColumn<WorkHolidayWorkbenchRow>[] = [
    { field: "action", headerName: t("actions", "Actions"), align: "left", width: 92, sortable: false, filterable: false, exportable: false },
    { field: "strRequestNumber", headerName: t("request_number", "Request Number"), width: 170 },
    { field: "strEmployeeName", headerName: t("requester", "Requester"), width: 190 },
    { field: "strOrganisationContext", headerName: t("organisation", "Organisation"), width: 180 },
    { field: "dtWorkDate", headerName: t("work_date", "Work Date"), width: 130 },
    { field: "strDayTypeCode", headerName: t("day_type", "Day Type"), width: 130 },
    { field: "strRequestedOutcomeCode", headerName: t("outcome", "Outcome"), width: 150 },
    { field: "strRequestStatus", headerName: t("status", "Status"), width: 170 },
    { field: "strCurrentApproverName", headerName: t("current_approver", "Current Approver"), width: 180 },
  ];
  const lstRows: WorkHolidayWorkbenchRow[] = objList.lstItems.filter((objRequest) => {
    if (strSelectedTab === "approval" && (objRequest.strRequestStatus !== "PENDING_APPROVAL" || objRequest.blnApprovalDecisionTaken)) {
      return false;
    }
    const strNeedle = strAppliedSearch.trim().toLowerCase();
    return !strNeedle || [objRequest.strRequestNumber, objRequest.strEmployeeName, objRequest.strEmployeeCode].some((strValue) => strValue?.toLowerCase().includes(strNeedle));
  }).map((objRequest) => ({
    intID: objRequest.intID,
    action: (
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: 64, justifyContent: "flex-start" }}>
        {blnCanView ? (
          <IconButton data-control-id={`work-on-holiday.workbench.${objRequest.intID}.view.button`} aria-label={t("view", "View")} color="primary" size="small" onClick={() => void openRequestDetail(objRequest.intID)}>
            <VisibilityRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}
        {blnCanAct && canActOnRequest(objRequest) ? (
          <IconButton data-control-id={`work-on-holiday.workbench.${objRequest.intID}.action.button`} aria-label={t("action", "Action")} color="primary" size="small" onClick={() => void openRequestActions(objRequest.intID)}>
            <PendingActionsRoundedIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Stack>
    ),
    strRequestNumber: objRequest.strRequestNumber ?? "—",
    strEmployeeName: objRequest.strEmployeeName ?? `${t("employee", "Employee")} ${objRequest.intEmployeeID}`,
    strOrganisationContext: [
      objRequest.intDepartmentID ? `${t("department", "Department")} ${objRequest.intDepartmentID}` : null,
      objRequest.intLocationID ? `${t("location", "Location")} ${objRequest.intLocationID}` : null,
    ].filter(Boolean).join(" · ") || "—",
    dtWorkDate: objRequest.dtWorkDate,
    strDayTypeCode: t(`day_type_${objRequest.strDayTypeCode.toLowerCase()}`, objRequest.strDayTypeCode),
    strRequestedOutcomeCode: t(`outcome_${objRequest.strRequestedOutcomeCode.toLowerCase()}`, objRequest.strRequestedOutcomeCode),
    strRequestStatus: <Chip size="small" label={t(`status_${objRequest.strRequestStatus.toLowerCase()}`, objRequest.strRequestStatus)} />,
    strCurrentApproverName: objRequest.strCurrentApproverName ?? (objRequest.intCurrentApproverUserID ? t("assigned_approver", "Assigned Approver") : "—"),
  }));

  if (blnRightsLoading) return <Box data-control-id="work-on-holiday.workbench.rights-loading.container" sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress aria-label={t("loading", "Loading")} /></Box>;
  if (!lstTabs.length && !blnCanOnBehalf) return <Alert data-control-id="work-on-holiday.workbench.unauthorized.alert" severity="warning">{strRightsError || t("unauthorized", "Work on Holiday Requests access is not available. Ask your administrator to assign manager or HR Work on Holiday rights.")}</Alert>;
  return (
    <Stack spacing={2}>
      {/* AppShell already provides the screen title, so the workbench starts with its status and tabs. */}
      {strNotice ? <Alert data-control-id="work-on-holiday.workbench.success.alert" severity="success" onClose={() => setStrNotice("")}>{strNotice}</Alert> : null}
      {strError || strListError ? <Alert data-control-id="work-on-holiday.workbench.error.alert" severity="error" onClose={() => setStrError("")}>{strError || strListError}</Alert> : null}
      <Paper className={styles.workbenchTabsCard}><Tabs value={Math.min(intTab, Math.max(lstTabs.length - 1, 0))} onChange={changeTab} variant="scrollable" aria-label={t("workbench_tabs", "Work on Holiday work queues")}>{lstTabs.map((objTab) => <Tab data-control-id={`work-on-holiday.workbench.${objTab.strCode}.tab`} key={objTab.strCode} label={objTab.strLabel} />)}</Tabs></Paper>
      <Paper className={styles.controlsCard}>
        <Box
          component="form"
          className={styles.searchRow}
          sx={{
            gridTemplateColumns: ["all", "history"].includes(strSelectedTab)
              ? "minmax(260px, 1fr) minmax(210px, .45fr) auto auto !important"
              : "minmax(280px, 1fr) auto auto !important",
          }}
          onSubmit={(objEvent) => {
            objEvent.preventDefault();
            searchRequests();
          }}
        >
          <TextField data-control-id="work-on-holiday.workbench.search.input" size="small" fullWidth label={t("search", "Search")} placeholder={t("search_requests_placeholder", "Request number, employee name or code")} value={strSearch} onChange={(objEvent) => setStrSearch(objEvent.target.value)} />
          {["all", "history"].includes(strSelectedTab) ? <TextField data-control-id="work-on-holiday.workbench.status.select" size="small" fullWidth select label={t("status", "Status")} value={strStatusFilter} onChange={(objEvent) => setStrStatusFilter(objEvent.target.value)}><MenuItem data-control-id="work-on-holiday.workbench.status.all.option" value="">{t("all_statuses", "All Statuses")}</MenuItem>{["APPROVED", "POSTED", "REJECTED", "WITHDRAWN", "REVERSED", "POSTING_FAILED"].map((strStatus) => <MenuItem data-control-id={`work-on-holiday.workbench.status.${strStatus.toLowerCase()}.option`} key={strStatus} value={strStatus}>{t(`status_${strStatus.toLowerCase()}`, strStatus)}</MenuItem>)}</TextField> : null}
          <Box className={styles.searchActions}><Button data-control-id="work-on-holiday.workbench.search.button" type="submit" className={styles.primaryButton} startIcon={<SearchRoundedIcon />}>{t("search", "Search")}</Button></Box>
          <Box className={styles.searchActions}><Button data-control-id="work-on-holiday.workbench.clear.button" type="button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearRequestFilters}>{t("clear", "Clear")}</Button></Box>
        </Box>
      </Paper>
      {blnLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress aria-label={t("loading", "Loading")} />
        </Box>
      ) : null}
      {blnListEnabled ? (
        <CommonDataGrid
          columns={lstColumns}
          rows={lstRows}
          rowIdField="intID"
          showExportOptions
          showPaginationSummary
          defaultPageSize={20}
          pageSizeOptions={[20, 50, 100]}
          exportFileName="work_on_holiday_requests"
          testIdPrefix="work-on-holiday-workbench"
          emptyMessage={t("empty_requests", "No matching requests found.")}
          toolbarLeft={blnCanOnBehalf ? (
            <Button
              data-control-id="work-on-holiday.workbench.on-behalf.open.button"
              className={styles.primaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={() => setBlnOnBehalfOpen(true)}
            >
              {t("create_on_behalf", "Create on Behalf")}
            </Button>
          ) : null}
        />
      ) : null}
      <WorkHolidayDetailDrawer objDetail={objDetail} blnOpen={Boolean(objDetail)} blnLoading={blnDetailLoading} blnCanApprove={blnCanApprove} blnCanReject={blnCanReject} blnCanSendBack={blnCanSendBack} blnCanVerify={blnCanVerify} blnCanPost={blnCanPost} blnCanReverse={blnCanReverse} blnActionMode={blnActionMode} fnOnClose={closeDetailDrawer} fnOnRefresh={async () => { await reload(); if (objDetail) await loadDetail(objDetail.intID); }} fnOnConflict={(strMessage) => setStrError(`${t("concurrency_conflict", "This request changed. The latest record has been loaded.")} ${strMessage}`)} />
      <Dialog data-control-id="work-on-holiday.on-behalf.dialog" open={blnOnBehalfOpen} onClose={() => setBlnOnBehalfOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ fontWeight: 800 }}>{t("create_on_behalf", "Create On Behalf")}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("work_on_holiday_on_behalf_hint", "Create a Work on Holiday draft for an employee. Eligibility is validated during approval.")}
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.employee.input"
                fullWidth
                required
                type="number"
                label={t("employee_id", "Employee ID")}
                value={objOnBehalf.intEmployeeID}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, intEmployeeID: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.date.input"
                fullWidth
                required
                type="date"
                label={t("work_date", "Work Date")}
                InputLabelProps={{ shrink: true }}
                value={objOnBehalf.dtWorkDate}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, dtWorkDate: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.outcome.select"
                select
                fullWidth
                label={t("requested_outcome", "Requested Outcome")}
                value={objOnBehalf.strRequestedOutcomeCode}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strRequestedOutcomeCode: objEvent.target.value }))}
              >
                <MenuItem value="COMPOFF">{t("comp_off", "Comp-Off")}</MenuItem>
                <MenuItem value="ATTENDANCE_CREDIT">{t("attendance_credit", "Attendance Credit")}</MenuItem>
                <MenuItem value="BOTH">{t("both", "Both")}</MenuItem>
                <MenuItem value="NONE">{t("none", "None")}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.credit.select"
                select
                fullWidth
                label={t("expected_credit", "Expected Credit")}
                value={objOnBehalf.decRequestedCreditDays}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, decRequestedCreditDays: Number(objEvent.target.value) }))}
              >
                <MenuItem value={0}>0</MenuItem>
                <MenuItem value={0.5}>0.5</MenuItem>
                <MenuItem value={1}>1</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.planned-start.input"
                fullWidth
                required
                type="time"
                label={t("planned_start", "Planned Start")}
                InputLabelProps={{ shrink: true }}
                value={objOnBehalf.tmPlannedStartTime}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, tmPlannedStartTime: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.planned-end.input"
                fullWidth
                required
                type="time"
                label={t("planned_end", "Planned End")}
                InputLabelProps={{ shrink: true }}
                value={objOnBehalf.tmPlannedEndTime}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, tmPlannedEndTime: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.hours.input"
                fullWidth
                label={t("calculated_requested_hours", "Calculated Requested Hours")}
                value={calculateHours(objOnBehalf.tmPlannedStartTime, objOnBehalf.tmPlannedEndTime)}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.actual-start.input"
                fullWidth
                type="time"
                label={t("actual_start", "Actual Start")}
                InputLabelProps={{ shrink: true }}
                value={objOnBehalf.tmActualStartTime}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, tmActualStartTime: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.actual-end.input"
                fullWidth
                type="time"
                label={t("actual_end", "Actual End")}
                InputLabelProps={{ shrink: true }}
                value={objOnBehalf.tmActualEndTime}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, tmActualEndTime: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.reason.input"
                fullWidth
                required
                multiline
                minRows={2}
                label={t("reason", "Reason")}
                value={objOnBehalf.strWorkReason}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strWorkReason: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.description.input"
                fullWidth
                multiline
                minRows={3}
                label={t("work_description", "Work Description")}
                value={objOnBehalf.strWorkDescription}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strWorkDescription: objEvent.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                data-control-id="work-on-holiday.on-behalf.hr-reason.input"
                fullWidth
                required
                multiline
                minRows={2}
                label={t("on_behalf_reason", "On-Behalf Reason")}
                value={objOnBehalf.strOnBehalfReason}
                onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strOnBehalfReason: objEvent.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            data-control-id="work-on-holiday.on-behalf.clear.button"
            variant="outlined"
            onClick={() => setObjOnBehalf({
              intEmployeeID: "",
              dtWorkDate: "",
              strRequestedOutcomeCode: "COMPOFF",
              decRequestedCreditDays: 1,
              tmPlannedStartTime: "",
              tmPlannedEndTime: "",
              tmActualStartTime: "",
              tmActualEndTime: "",
              strWorkReason: "",
              strWorkDescription: "",
              strOnBehalfReason: "",
            })}
          >
            {t("clear", "Clear")}
          </Button>
          <Button data-control-id="work-on-holiday.on-behalf.cancel.button" onClick={() => setBlnOnBehalfOpen(false)}>{t("cancel", "Cancel")}</Button>
          <Button data-control-id="work-on-holiday.on-behalf.create.button" variant="contained" onClick={() => void createOnBehalf()}>{t("create_draft", "Create Draft")}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
