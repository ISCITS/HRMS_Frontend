"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import LookupChip, { lookupLabel } from "@/features/attendance-regularization/components/LookupChip";
import styles from "@/components/master/MasterScreen.module.css";
import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import type {
  RegularizationDetail, RegularizationFormValues, RegularizationLookups, RegularizationRequest,
} from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";

const strStatusDomain = "ATTENDANCE_REGULARIZATION_STATUS";
const strTypeDomain = "ATTENDANCE_REGULARIZATION_REQUEST_TYPE";
const strActionDomain = "ATTENDANCE_REGULARIZATION_ACTION";
const strAttendanceStatusDomain = "ATTENDANCE_STATUS";

function emptyOnBehalfForm(): RegularizationFormValues & { intEmployeeID: number | null; strOnBehalfReason: string } {
  return {
    intEmployeeID: null, strOnBehalfReason: "", dtWorkDate: "", strRequestTypeCode: "",
    strProposedStatus: "", tmProposedFirstIn: "", tmProposedLastOut: "",
    decProposedWorkedHours: null, blnProposedIsPaid: null, strProposedRemark: "", strEmployeeReason: "",
  };
}

export default function RegularizationRequestsPage({ blnEssManagerMode = false }: { blnEssManagerMode?: boolean }) {
  const objSearchParams = useSearchParams();
  const { t, intLanguageID } = useModuleLabels("attendance_regularization_requests");
  const { blnLoading: blnRightsLoading, canViewAny, canDoAny } = useModuleActionAccess([
    blnEssManagerMode ? "ESS_ATTENDANCE_REGULARIZATION_APPROVALS" : "ATTENDANCE_REGULARIZATION_REQUESTS",
  ]);
  const [objLookups, setObjLookups] = useState<RegularizationLookups>({});
  const [lstRequests, setLstRequests] = useState<RegularizationRequest[]>([]);
  const [objDetail, setObjDetail] = useState<RegularizationDetail | null>(null);
  const [strStatus, setStrStatus] = useState("");
  const [strFromDate, setStrFromDate] = useState("");
  const [strToDate, setStrToDate] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnWorking, setBlnWorking] = useState(false);
  const [strError, setStrError] = useState("");
  const [objAction, setObjAction] = useState<{ strAction: "approve" | "reject" | "send-back"; objRequest: RegularizationDetail } | null>(null);
  const [strRemarks, setStrRemarks] = useState("");
  const [blnOnBehalfOpen, setBlnOnBehalfOpen] = useState(false);
  const [objOnBehalf, setObjOnBehalf] = useState<RegularizationFormValues & { intEmployeeID: number | null; strOnBehalfReason: string }>(emptyOnBehalfForm);

  const loadData = useCallback(async () => {
    setBlnLoading(true); setStrError("");
    try {
      const [objLookupResult, objListResult] = await Promise.all([
        blnEssManagerMode
          ? attendanceRegularizationService.getManagerLookups(intLanguageID || authHelpers.getLanguageID() || undefined)
          : attendanceRegularizationService.getHrLookups(intLanguageID || authHelpers.getLanguageID() || undefined),
        blnEssManagerMode
          ? attendanceRegularizationService.listManagerRequests({ intPage: 1, intPageSize: 100, strStatus: strStatus || undefined, strFromDate: strFromDate || undefined, strToDate: strToDate || undefined })
          : attendanceRegularizationService.listHrRequests({ intPage: 1, intPageSize: 100, strStatus: strStatus || undefined, strFromDate: strFromDate || undefined, strToDate: strToDate || undefined }),
      ]);
      setObjLookups(objLookupResult); setLstRequests(objListResult.lstItems);
    } catch (objError) { setStrError(objError instanceof Error ? objError.message : t("load_failed", "Unable to load requests.")); }
    finally { setBlnLoading(false); }
  }, [blnEssManagerMode, intLanguageID, strFromDate, strStatus, strToDate, t]);

  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const intRequestID = Number(objSearchParams.get("request") ?? 0);
    if (intRequestID > 0) void openDetail(intRequestID);
    if (objSearchParams.get("onBehalf") === "1") {
      setObjOnBehalf((objValue) => ({
        ...objValue,
        intEmployeeID: Number(objSearchParams.get("employee") ?? 0) || null,
        dtWorkDate: objSearchParams.get("date") ?? "",
      }));
      setBlnOnBehalfOpen(true);
    }
  // Query parameters are consumed once when entering from the exception queue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const lstStatuses = objLookups[strStatusDomain] ?? [];
  const lstTypes = objLookups[strTypeDomain] ?? [];
  const lstActions = objLookups[strActionDomain] ?? [];
  const lstAttendanceStatuses = objLookups[strAttendanceStatusDomain] ?? objLookups["ATTENDANCE_DAY_STATUS"] ?? [];
  const blnCanApprove = blnEssManagerMode || canDoAny("ATT_REG_REQUEST_APPROVE");
  const blnCanReject = blnEssManagerMode || canDoAny("ATT_REG_REQUEST_REJECT");
  const blnCanSendBack = blnEssManagerMode || canDoAny("ATT_REG_REQUEST_SEND_BACK");

  async function openDetail(intRequestID: number) {
    setBlnWorking(true);
    try {
      setObjDetail(
        blnEssManagerMode
          ? await attendanceRegularizationService.getManagerDetail(intRequestID)
          : await attendanceRegularizationService.getHrDetail(intRequestID)
      );
    }
    catch (objError) { setStrError(objError instanceof Error ? objError.message : t("detail_failed", "Unable to load request.")); }
    finally { setBlnWorking(false); }
  }

  async function confirmAction() {
    if (!objAction) return;
    if (objAction.strAction !== "approve" && !strRemarks.trim()) return;
    setBlnWorking(true);
    try {
      if (blnEssManagerMode) {
        await attendanceRegularizationService.actionManagerRequest(objAction.objRequest.intID, objAction.strAction, objAction.objRequest.intRowVersion, strRemarks.trim() || undefined);
      } else {
        await attendanceRegularizationService.actionRequest(objAction.objRequest.intID, objAction.strAction, objAction.objRequest.intRowVersion, strRemarks.trim() || undefined);
      }
      setObjAction(null); setObjDetail(null); setStrRemarks(""); await loadData();
    } catch (objError) { setStrError(objError instanceof Error ? objError.message : t("action_failed", "Unable to complete approval action.")); }
    finally { setBlnWorking(false); }
  }

  async function createOnBehalf() {
    if (!objOnBehalf.intEmployeeID || !objOnBehalf.strOnBehalfReason.trim() || !objOnBehalf.strEmployeeReason.trim()) return;
    setBlnWorking(true);
    try {
      await attendanceRegularizationService.createOnBehalf({ ...objOnBehalf, intEmployeeID: objOnBehalf.intEmployeeID });
      setBlnOnBehalfOpen(false); await loadData();
    } catch (objError) { setStrError(objError instanceof Error ? objError.message : t("create_failed", "Unable to create request.")); }
    finally { setBlnWorking(false); }
  }

  function clearFilters() {
    setStrFromDate("");
    setStrToDate("");
    setStrStatus("");
  }

  if (blnRightsLoading) return <CircularProgress />;
  if (!canViewAny()) return <Alert severity="warning">{t("access_denied", "Regularization Requests access is not available.")}</Alert>;
  const blnCanCreateOnBehalf = !blnEssManagerMode && canDoAny("ATT_REG_REQUEST_CREATE_ON_BEHALF");
  return (
    <Box className={styles.page} sx={{ "& .MuiOutlinedInput-root": { borderRadius: "9px" }, "& .MuiAlert-root": { borderRadius: "9px" } }}>
      {/* AppShell owns the title; retain only the contextual action when authorized. */}
      {blnCanCreateOnBehalf ? <Stack direction="row" justifyContent="flex-end"><Button data-control-id="regularization-requests.on-behalf.button" className={styles.primaryButton} startIcon={<AddRoundedIcon />} onClick={() => setBlnOnBehalfOpen(true)}>{t("create_on_behalf", "Create on Behalf")}</Button></Stack> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Paper className={styles.controlsCard}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth data-control-id="regularization-requests.from-date.input" type="date" label={t("from_date", "From Date")} value={strFromDate} onChange={(objEvent) => setStrFromDate(objEvent.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth data-control-id="regularization-requests.to-date.input" type="date" label={t("to_date", "To Date")} value={strToDate} onChange={(objEvent) => setStrToDate(objEvent.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
          <Grid item xs={12} sm={6} md={3}><TextField fullWidth data-control-id="regularization-requests.status.select" select label={t("status", "Status")} value={strStatus} onChange={(objEvent) => setStrStatus(objEvent.target.value)}><MenuItem value="">{t("all", "All")}</MenuItem>{lstStatuses.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Stack direction="row" spacing={1} className={styles.filterActions}>
              <Button fullWidth data-control-id="regularization-requests.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => void loadData()}>{t("search", "Search")}</Button>
              <Button fullWidth data-control-id="regularization-requests.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={clearFilters}>{t("clear", "Clear")}</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
      <Paper className={styles.tableCard}>
        {blnLoading ? <Box sx={{ p: 5, textAlign: "center" }}><CircularProgress /></Box> : (
          <Box className={styles.tableWrap}><Table className={styles.table} size="small" sx={{ minWidth: 850 }}><TableHead><TableRow><TableCell>{t("request_number", "Request")}</TableCell><TableCell>{t("employee", "Employee")}</TableCell><TableCell>{t("work_date", "Work Date")}</TableCell><TableCell>{t("type", "Type")}</TableCell><TableCell>{t("status", "Status")}</TableCell><TableCell>{t("actions", "Actions")}</TableCell></TableRow></TableHead><TableBody>
            {lstRequests.map((objRequest) => <TableRow key={objRequest.intID} hover><TableCell>{objRequest.strRequestNumber}</TableCell><TableCell>{objRequest.strEmployeeName ?? objRequest.strEmployeeCode}</TableCell><TableCell>{objRequest.dtWorkDate}</TableCell><TableCell>{lookupLabel(lstTypes, objRequest.strRequestTypeCode, t("unavailable", "Unavailable"))}</TableCell><TableCell><LookupChip lstOptions={lstStatuses} strCode={objRequest.strRequestStatus} strFallback={t("unavailable", "Unavailable")} /></TableCell><TableCell><Button data-control-id={`regularization-requests.${objRequest.intID}.view.button`} onClick={() => void openDetail(objRequest.intID)}>{t("view", "View")}</Button></TableCell></TableRow>)}
            {lstRequests.length === 0 ? <TableRow><TableCell colSpan={6} align="center">{t("empty", "No requests found.")}</TableCell></TableRow> : null}
          </TableBody></Table></Box>
        )}
      </Paper>
      <Dialog data-control-id="regularization-requests.detail.dialog" open={Boolean(objDetail)} onClose={() => setObjDetail(null)} fullWidth maxWidth="lg">
        <DialogTitle>{t("approval_detail", "Approval Detail")}</DialogTitle>
        <DialogContent dividers><Grid container spacing={2}><Grid item xs={12} md={6}><Paper variant="outlined" sx={{ p: 2, height: "100%" }}><Typography fontWeight={850}>{t("original", "Original")}</Typography><Typography>{lookupLabel(lstAttendanceStatuses, objDetail?.objOriginalSnapshot.strStatus, t("not_recorded", "Not recorded"))}</Typography><Typography>{t("first_in", "First IN")}: {objDetail?.objOriginalSnapshot.tmFirstIn ?? "—"}</Typography><Typography>{t("last_out", "Last OUT")}: {objDetail?.objOriginalSnapshot.tmLastOut ?? "—"}</Typography><Typography>{t("worked_hours", "Worked Hours")}: {objDetail?.objOriginalSnapshot.decWorkedHours ?? "—"}</Typography></Paper></Grid><Grid item xs={12} md={6}><Paper variant="outlined" sx={{ p: 2, height: "100%" }}><Typography fontWeight={850}>{t("proposed", "Proposed")}</Typography><Typography>{lookupLabel(lstAttendanceStatuses, objDetail?.objProposalSnapshot.strProposedStatus, t("unavailable", "Unavailable"))}</Typography><Typography>{t("first_in", "First IN")}: {objDetail?.objProposalSnapshot.tmProposedFirstIn ?? "—"}</Typography><Typography>{t("last_out", "Last OUT")}: {objDetail?.objProposalSnapshot.tmProposedLastOut ?? "—"}</Typography><Typography>{t("worked_hours", "Worked Hours")}: {objDetail?.objProposalSnapshot.decProposedWorkedHours ?? "—"}</Typography></Paper></Grid><Grid item xs={12}><Typography fontWeight={850}>{t("reason", "Reason")}</Typography><Typography>{objDetail?.strEmployeeReason}</Typography><Divider sx={{ my: 2 }} /><Typography fontWeight={850}>{t("timeline", "Timeline")}</Typography>{objDetail?.lstActions.map((objItem) => <Box key={objItem.intID} sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 1.5, my: 1 }}><Typography fontWeight={750}>{lookupLabel(lstActions, objItem.strActionCode, t("action", "Action"))}</Typography><Typography variant="caption">{new Date(objItem.dtActionOn).toLocaleString()} {objItem.strRemarks}</Typography></Box>)}</Grid></Grid></DialogContent>
        <DialogActions><Button data-control-id="regularization-requests.detail.close.button" onClick={() => setObjDetail(null)}>{t("close", "Close")}</Button>{objDetail?.strRequestStatus === "PENDING_APPROVAL" ? <>{blnCanSendBack ? <Button data-control-id="regularization-requests.send-back.button" onClick={() => setObjAction({ strAction: "send-back", objRequest: objDetail })}>{t("send_back", "Send Back")}</Button> : null}{blnCanReject ? <Button data-control-id="regularization-requests.reject.button" color="error" onClick={() => setObjAction({ strAction: "reject", objRequest: objDetail })}>{t("reject", "Reject")}</Button> : null}{blnCanApprove ? <Button data-control-id="regularization-requests.approve.button" variant="contained" color="success" onClick={() => setObjAction({ strAction: "approve", objRequest: objDetail })}>{t("approve", "Approve")}</Button> : null}</> : null}</DialogActions>
      </Dialog>
      <Dialog data-control-id="regularization-requests.action.dialog" open={Boolean(objAction)} onClose={() => setObjAction(null)} fullWidth maxWidth="sm"><DialogTitle>{objAction ? lookupLabel(lstActions, objAction.strAction.toUpperCase().replace("-", "_"), t("confirm_action", "Confirm Action")) : ""}</DialogTitle><DialogContent><TextField data-control-id="regularization-requests.action.remarks.input" fullWidth multiline minRows={3} required={objAction?.strAction !== "approve"} label={t("remarks", "Remarks")} value={strRemarks} onChange={(objEvent) => setStrRemarks(objEvent.target.value)} sx={{ mt: 1 }} /></DialogContent><DialogActions><Button data-control-id="regularization-requests.action.cancel.button" onClick={() => setObjAction(null)}>{t("cancel", "Cancel")}</Button><Button data-control-id="regularization-requests.action.confirm.button" variant="contained" disabled={blnWorking || (objAction?.strAction !== "approve" && !strRemarks.trim())} onClick={() => void confirmAction()}>{t("confirm", "Confirm")}</Button></DialogActions></Dialog>
      <Dialog data-control-id="regularization-requests.on-behalf.dialog" open={blnOnBehalfOpen} onClose={() => setBlnOnBehalfOpen(false)} fullWidth maxWidth="md"><DialogTitle>{t("create_on_behalf", "Create on Behalf")}</DialogTitle><DialogContent><Grid container spacing={2} sx={{ mt: 0 }}><Grid item xs={12} sm={6}><TextField data-control-id="regularization-requests.on-behalf.employee.input" fullWidth type="number" required label={t("employee_id", "Employee ID")} value={objOnBehalf.intEmployeeID ?? ""} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, intEmployeeID: Number(objEvent.target.value) || null }))} /></Grid><Grid item xs={12} sm={6}><TextField data-control-id="regularization-requests.on-behalf.date.input" fullWidth type="date" required label={t("work_date", "Work Date")} InputLabelProps={{ shrink: true }} value={objOnBehalf.dtWorkDate} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, dtWorkDate: objEvent.target.value }))} /></Grid><Grid item xs={12} sm={6}><TextField data-control-id="regularization-requests.on-behalf.type.select" fullWidth select required label={t("request_type", "Request Type")} value={objOnBehalf.strRequestTypeCode} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strRequestTypeCode: objEvent.target.value }))}>{lstTypes.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField></Grid><Grid item xs={12} sm={6}><TextField data-control-id="regularization-requests.on-behalf.status.select" fullWidth select required label={t("proposed_status", "Proposed Status")} value={objOnBehalf.strProposedStatus} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strProposedStatus: objEvent.target.value }))}>{lstAttendanceStatuses.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField></Grid><Grid item xs={12}><TextField data-control-id="regularization-requests.on-behalf.employee-reason.input" fullWidth required multiline label={t("employee_reason", "Employee Reason")} value={objOnBehalf.strEmployeeReason} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strEmployeeReason: objEvent.target.value }))} /></Grid><Grid item xs={12}><TextField data-control-id="regularization-requests.on-behalf.reason.input" fullWidth required multiline label={t("on_behalf_reason", "On-behalf Reason")} value={objOnBehalf.strOnBehalfReason} onChange={(objEvent) => setObjOnBehalf((objValue) => ({ ...objValue, strOnBehalfReason: objEvent.target.value }))} /></Grid></Grid></DialogContent><DialogActions><Button data-control-id="regularization-requests.on-behalf.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} disabled={blnWorking} onClick={() => setObjOnBehalf(emptyOnBehalfForm())}>{t("clear", "Clear")}</Button><Button data-control-id="regularization-requests.on-behalf.cancel.button" onClick={() => setBlnOnBehalfOpen(false)}>{t("cancel", "Cancel")}</Button><Button data-control-id="regularization-requests.on-behalf.create.button" variant="contained" disabled={blnWorking} onClick={() => void createOnBehalf()}>{t("create_draft", "Create Draft")}</Button></DialogActions></Dialog>
    </Box>
  );
}
