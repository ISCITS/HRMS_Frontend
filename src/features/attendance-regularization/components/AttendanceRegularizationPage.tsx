"use client";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, MenuItem, Paper, Snackbar, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { yupResolver } from "@hookform/resolvers/yup";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import * as yup from "yup";

import LookupChip, { lookupLabel } from "@/features/attendance-regularization/components/LookupChip";
import styles from "@/components/master/MasterScreen.module.css";
import { attendanceRegularizationService } from "@/features/attendance-regularization/services/attendanceRegularizationService";
import type {
  DateContext, LookupOption, PreviewResult, RegularizationDetail, RegularizationFormValues,
  RegularizationLookups, RegularizationRequest,
} from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { authHelpers } from "@/lib/auth";

const strTypeDomain = "ATTENDANCE_REGULARIZATION_REQUEST_TYPE";
const strStatusDomain = "ATTENDANCE_REGULARIZATION_STATUS";
const strActionDomain = "ATTENDANCE_REGULARIZATION_ACTION";
const strAttendanceStatusDomain = "ATTENDANCE_STATUS";

function todayIso() {
  const objDate = new Date();
  return `${objDate.getFullYear()}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

function initialValues(strDate: string): RegularizationFormValues {
  return {
    dtWorkDate: strDate, strRequestTypeCode: "", strProposedStatus: "",
    tmProposedFirstIn: "", tmProposedLastOut: "", decProposedWorkedHours: null,
    blnProposedIsPaid: null, strProposedRemark: "", strEmployeeReason: "",
  };
}

function formatDateTime(strValue?: string | null) {
  if (!strValue) return "—";
  const objDate = new Date(strValue);
  return Number.isNaN(objDate.getTime()) ? strValue.slice(0, 5) : objDate.toLocaleString();
}

function SummaryCard({ strLabel, strValue }: { strLabel: string; strValue: string | number }) {
  return <Paper variant="outlined" sx={{ p: 1.25, borderRadius: "8px !important", height: "100%" }}><Typography color="text.secondary" variant="caption">{strLabel}</Typography><Typography fontWeight={800}>{strValue}</Typography></Paper>;
}

export default function AttendanceRegularizationPage() {
  const { t, intLanguageID } = useModuleLabels("attendance_regularization", "Unable to load attendance regularization labels.");
  const { blnLoading: blnRightsLoading, canViewAny } = useModuleActionAccess(["ESS_ATTENDANCE_REGULARIZATION"]);
  const objSearchParams = useSearchParams();
  const strInitialDate = objSearchParams.get("date") ?? todayIso();
  const [intTab, setIntTab] = useState(objSearchParams.get("tab") === "requests" ? 1 : 0);
  const [objLookups, setObjLookups] = useState<RegularizationLookups>({});
  const [objContext, setObjContext] = useState<DateContext | null>(null);
  const [objPreview, setObjPreview] = useState<PreviewResult | null>(null);
  const [lstRequests, setLstRequests] = useState<RegularizationRequest[]>([]);
  const [strRequestSearch, setStrRequestSearch] = useState("");
  const [strRequestStatusFilter, setStrRequestStatusFilter] = useState("");
  const [strAppliedRequestSearch, setStrAppliedRequestSearch] = useState("");
  const [strAppliedRequestStatus, setStrAppliedRequestStatus] = useState("");
  const [objEditing, setObjEditing] = useState<RegularizationRequest | null>(null);
  const [objDetail, setObjDetail] = useState<RegularizationDetail | null>(null);
  const [lstFiles, setLstFiles] = useState<File[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [objConfirm, setObjConfirm] = useState<{ strAction: "submit" | "withdraw"; objRequest: RegularizationRequest } | null>(null);
  const [objToast, setObjToast] = useState({ blnOpen: false, strMessage: "", strSeverity: "success" as "success" | "error" });
  const objActionRowRef = useRef<HTMLDivElement | null>(null);

  const objSchema = useMemo(() => yup.object({
    dtWorkDate: yup.string().required(t("validation_date", "Work date is required.")),
    strRequestTypeCode: yup.string().required(t("validation_type", "Request type is required.")),
    strProposedStatus: yup.string().required(t("validation_status", "Proposed status is required.")),
    tmProposedFirstIn: yup.string().default(""),
    tmProposedLastOut: yup.string().default(""),
    decProposedWorkedHours: yup.number().nullable().min(0).max(24),
    blnProposedIsPaid: yup.boolean().nullable(),
    strProposedRemark: yup.string().max(500).default(""),
    strEmployeeReason: yup.string().trim().required(t("validation_reason", "Reason is required.")).max(1000),
  }), [t]);
  const { control, handleSubmit, reset, watch, formState: { errors: objErrors } } = useForm<RegularizationFormValues>({
    resolver: yupResolver(objSchema) as Resolver<RegularizationFormValues>,
    defaultValues: initialValues(strInitialDate),
  });
  const strWorkDate = watch("dtWorkDate");
  const strProposedStatus = watch("strProposedStatus");
  const blnNeedsTimes = ["present", "half_day", "on_duty"].includes(strProposedStatus);
  const lstTypes = useMemo(() => objLookups[strTypeDomain] ?? [], [objLookups]);
  const lstRequestStatuses = useMemo(() => objLookups[strStatusDomain] ?? [], [objLookups]);
  const lstActions = objLookups[strActionDomain] ?? [];
  const lstAttendanceStatuses = objLookups[strAttendanceStatusDomain] ?? objLookups["ATTENDANCE_DAY_STATUS"] ?? [];
  const lstFilteredRequests = useMemo(() => {
    const strSearch = strAppliedRequestSearch.trim().toLowerCase();
    return lstRequests.filter((objRequest) => {
      const blnMatchesStatus =
        !strAppliedRequestStatus ||
        objRequest.strRequestStatus === strAppliedRequestStatus;
      const blnMatchesSearch =
        !strSearch ||
        [
          objRequest.strRequestNumber,
          objRequest.dtWorkDate,
          lookupLabel(lstTypes, objRequest.strRequestTypeCode, ""),
          lookupLabel(lstRequestStatuses, objRequest.strRequestStatus, ""),
        ].some((strValue) => String(strValue ?? "").toLowerCase().includes(strSearch));
      return blnMatchesStatus && blnMatchesSearch;
    });
  }, [lstRequests, lstRequestStatuses, lstTypes, strAppliedRequestSearch, strAppliedRequestStatus]);

  const loadLookups = useCallback(async () => {
    setObjLookups(await attendanceRegularizationService.getEssLookups(intLanguageID || authHelpers.getLanguageID() || undefined));
  }, [intLanguageID]);
  const loadContext = useCallback(async (strDate: string) => {
    if (!strDate) return;
    setObjContext(await attendanceRegularizationService.getMyContext(strDate));
  }, []);
  const loadRequests = useCallback(async () => {
    const objResult = await attendanceRegularizationService.listMyRequests();
    setLstRequests(objResult.lstItems);
  }, []);

  useEffect(() => {
    let blnMounted = true;
    setBlnLoading(true);
    Promise.all([loadLookups(), loadContext(strInitialDate), loadRequests()])
      .catch((objError: unknown) => blnMounted && setStrError(objError instanceof Error ? objError.message : t("load_failed", "Unable to load requests.")))
      .finally(() => blnMounted && setBlnLoading(false));
    return () => { blnMounted = false; };
  }, [loadContext, loadLookups, loadRequests, strInitialDate, t]);

  useEffect(() => {
    const intTimer = window.setTimeout(() => void loadContext(strWorkDate).catch(() => undefined), 250);
    return () => window.clearTimeout(intTimer);
  }, [loadContext, strWorkDate]);

  useEffect(() => {
    if (intTab !== 0 || (!strError && (objPreview?.blnValid ?? true))) return;
    // Error and validation banners add height, so restore access to the actions they can push below the viewport.
    const intFrame = window.requestAnimationFrame(() => {
      objActionRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(intFrame);
  }, [intTab, objPreview?.blnValid, strError]);

  async function previewForm(objValues: RegularizationFormValues) {
    const { dtWorkDate, ...objPayload } = objValues;
    const objResult = await attendanceRegularizationService.preview(dtWorkDate, objPayload);
    setObjPreview(objResult);
    return objResult;
  }

  async function saveDraft(objValues: RegularizationFormValues) {
    setBlnSaving(true); setStrError("");
    try {
      // A draft remains editable, so preview warnings are shown without blocking draft persistence.
      await previewForm(objValues);
      const objSaved = objEditing
        ? await attendanceRegularizationService.updateDraft(objEditing.intID, objEditing.intRowVersion, objValues)
        : await attendanceRegularizationService.createDraft(objValues);
      for (const objFile of lstFiles) await attendanceRegularizationService.uploadAttachment(objSaved.intID, objFile);
      setObjEditing(objSaved); setLstFiles([]); await loadRequests();
      setObjToast({ blnOpen: true, strMessage: t("draft_saved", "Draft saved."), strSeverity: "success" });
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("save_failed", "Unable to save draft."));
    } finally { setBlnSaving(false); }
  }

  function editRequest(objRequest: RegularizationRequest) {
    setObjEditing(objRequest); setIntTab(0); setObjPreview(null);
    reset({
      dtWorkDate: objRequest.dtWorkDate,
      strRequestTypeCode: objRequest.strRequestTypeCode,
      strProposedStatus: objRequest.objProposalSnapshot.strProposedStatus,
      tmProposedFirstIn: objRequest.objProposalSnapshot.tmProposedFirstIn?.slice(0, 5) ?? "",
      tmProposedLastOut: objRequest.objProposalSnapshot.tmProposedLastOut?.slice(0, 5) ?? "",
      decProposedWorkedHours: objRequest.objProposalSnapshot.decProposedWorkedHours ?? null,
      blnProposedIsPaid: objRequest.objProposalSnapshot.blnProposedIsPaid ?? null,
      strProposedRemark: objRequest.objProposalSnapshot.strProposedRemark ?? "",
      strEmployeeReason: objRequest.strEmployeeReason,
    });
  }

  function clearRequestForm() {
    reset(initialValues(objEditing?.dtWorkDate ?? strInitialDate));
    setObjPreview(null);
    setLstFiles([]);
    setStrError("");
  }

  async function runConfirmedAction() {
    if (!objConfirm) return;
    setBlnSaving(true);
    try {
      if (objConfirm.strAction === "submit") await attendanceRegularizationService.submit(objConfirm.objRequest.intID, objConfirm.objRequest.intRowVersion);
      else await attendanceRegularizationService.withdraw(objConfirm.objRequest.intID, objConfirm.objRequest.intRowVersion, t("withdrawal_reason_default", "Withdrawn by employee."));
      setObjConfirm(null); await loadRequests();
      setObjToast({ blnOpen: true, strMessage: t("action_completed", "Action completed."), strSeverity: "success" });
    } catch (objError) { setStrError(objError instanceof Error ? objError.message : t("action_failed", "Unable to complete action.")); }
    finally { setBlnSaving(false); }
  }

  if (blnRightsLoading || blnLoading) return <Box sx={{ display: "grid", placeItems: "center", py: 8 }}><CircularProgress /></Box>;
  if (!canViewAny()) return <Alert severity="warning">{t("access_denied", "Attendance Regularization access is not available.")}</Alert>;

  return (
    <Box className={styles.page} sx={{ overflowX: "hidden", overflowY: "auto", pb: 2, pr: 0.5, scrollbarGutter: "stable", "& .MuiOutlinedInput-root": { borderRadius: "9px" }, "& .MuiAlert-root": { borderRadius: "9px" } }}>
      <Box className="pageBanner" data-control-id="attendance-regularization.header.banner">
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <EventRepeatRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">{t("page_title", "Attendance Regularization")}</Typography>
          <Typography component="p" className="bannerSubTitle">{t("page_subtitle", "Request corrections and follow their approval history.")}</Typography>
        </Box>
      </Box>
      <Paper className={styles.controlsCard} sx={{ pt: "0 !important", pb: "0 !important" }}>
        <Tabs value={intTab} onChange={(_, intValue) => setIntTab(intValue)}>
          <Tab data-control-id="attendance-regularization.new-request.tab" label={t("new_request_tab", "New Request")} />
          <Tab data-control-id="attendance-regularization.my-requests.tab" label={t("my_requests_tab", "My Requests")} />
        </Tabs>
      </Paper>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      {intTab === 0 ? (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Stack spacing={1.5}>
              <Typography fontWeight={850}>{t("original_attendance", "Original Attendance")}</Typography>
              <Grid container spacing={1} alignItems="stretch">
                <Grid item xs={6} md={2}><SummaryCard strLabel={t("status", "Status")} strValue={lookupLabel(lstAttendanceStatuses, objContext?.objAttendanceDay.strStatus, t("not_recorded", "Not recorded"))} /></Grid>
                <Grid item xs={6} md={2}><SummaryCard strLabel={t("worked_hours", "Worked Hours")} strValue={objContext?.objAttendanceDay.decWorkedHours ?? "—"} /></Grid>
                <Grid item xs={6} md={2}><SummaryCard strLabel={t("first_in", "First IN")} strValue={objContext?.objAttendanceDay.tmFirstIn?.slice(0, 5) ?? "—"} /></Grid>
                <Grid item xs={6} md={2}><SummaryCard strLabel={t("last_out", "Last OUT")} strValue={objContext?.objAttendanceDay.tmLastOut?.slice(0, 5) ?? "—"} /></Grid>
                <Grid item xs={12} md={4}>
                  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: "8px !important", height: "100%" }}>
                    <Typography fontWeight={800}>{t("punch_log", "Punch Log")}</Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                      {objContext?.lstPunches.length ? objContext.lstPunches.map((objPunch) => (
                        <Stack key={objPunch.intID} direction="row" justifyContent="space-between">
                          <Typography>{lookupLabel(objLookups["ATTENDANCE_PUNCH_DIRECTION"] ?? [], objPunch.strDirection, t("punch", "Punch"))}</Typography>
                          <Typography color="text.secondary">{formatDateTime(objPunch.dtPunchAt)}</Typography>
                        </Stack>
                      )) : <Typography color="text.secondary">{t("no_punches", "No punches recorded.")}</Typography>}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
              {objContext?.objHoliday ? <Alert severity="info">{t("holiday_context", "This date is a holiday.")}</Alert> : null}
              {objContext?.objApprovedLeave ? <Alert severity="info">{t("leave_context", "Approved leave exists for this date.")}</Alert> : null}
            </Stack>
          </Grid>
          <Grid item xs={12}>
            <Paper component="form" onSubmit={handleSubmit(saveDraft)} className={styles.controlsCard}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}><Controller name="dtWorkDate" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.work-date.input" fullWidth size="small" type="date" label={t("work_date", "Work Date")} InputLabelProps={{ shrink: true }} error={Boolean(objErrors.dtWorkDate)} helperText={objErrors.dtWorkDate?.message} disabled={Boolean(objEditing)} />} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Controller name="strRequestTypeCode" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.request-type.select" select fullWidth size="small" label={t("request_type", "Request Type")} error={Boolean(objErrors.strRequestTypeCode)} helperText={objErrors.strRequestTypeCode?.message}>{lstTypes.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField>} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Controller name="strProposedStatus" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.proposed-status.select" select fullWidth size="small" label={t("proposed_status", "Proposed Status")} error={Boolean(objErrors.strProposedStatus)} helperText={objErrors.strProposedStatus?.message}>{lstAttendanceStatuses.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField>} /></Grid>
                <Grid item xs={12} sm={6} md={3}><Controller name="decProposedWorkedHours" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} onChange={(objEvent) => field.onChange(objEvent.target.value === "" ? null : Number(objEvent.target.value))} data-control-id="attendance-regularization.worked-hours.input" fullWidth size="small" type="number" inputProps={{ step: 0.25, min: 0, max: 24 }} label={t("proposed_worked_hours", "Proposed Worked Hours")} error={Boolean(objErrors.decProposedWorkedHours)} helperText={objErrors.decProposedWorkedHours?.message} />} /></Grid>
                {blnNeedsTimes ? <><Grid item xs={12} sm={6}><Controller name="tmProposedFirstIn" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.first-in.input" fullWidth type="time" label={t("proposed_first_in", "Proposed IN")} InputLabelProps={{ shrink: true }} />} /></Grid><Grid item xs={12} sm={6}><Controller name="tmProposedLastOut" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.last-out.input" fullWidth type="time" label={t("proposed_last_out", "Proposed OUT")} InputLabelProps={{ shrink: true }} />} /></Grid></> : null}
                <Grid item xs={12}><Controller name="strEmployeeReason" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.reason.input" fullWidth multiline minRows={3} label={t("reason", "Reason")} error={Boolean(objErrors.strEmployeeReason)} helperText={objErrors.strEmployeeReason?.message} />} /></Grid>
                <Grid item xs={12}><Controller name="strProposedRemark" control={control} render={({ field }) => <TextField {...field} data-control-id="attendance-regularization.remark.input" fullWidth label={t("remark", "Remark")} />} /></Grid>
                <Grid item xs={12}><Button data-control-id="attendance-regularization.attachments.button" component="label" variant="outlined" startIcon={<AttachFileRoundedIcon />}>{t("add_attachments", "Add Attachments")}<input hidden multiple type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(objEvent) => setLstFiles(Array.from(objEvent.target.files ?? []))} /></Button><Typography variant="caption" sx={{ ml: 1 }}>{lstFiles.map((objFile) => objFile.name).join(", ")}</Typography></Grid>
              </Grid>
              <Stack ref={objActionRowRef} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end" sx={{ mt: 2, scrollMarginBottom: 16 }}>
                <Button data-control-id="attendance-regularization.clear.button" className={styles.secondaryButton} disabled={blnSaving} startIcon={<ClearRoundedIcon />} onClick={clearRequestForm}>{t("clear", "Clear")}</Button>
                <Button data-control-id="attendance-regularization.preview.button" variant="outlined" disabled={blnSaving} onClick={handleSubmit((objValues) => void previewForm(objValues))}>{t("preview", "Preview")}</Button>
                <Button data-control-id="attendance-regularization.save-draft.button" type="submit" variant="contained" disabled={blnSaving} startIcon={blnSaving ? <CircularProgress size={18} /> : <SaveRoundedIcon />}>{t("save_draft", "Save Draft")}</Button>
                {objEditing ? <Button data-control-id="attendance-regularization.submit.button" variant="contained" color="success" disabled={blnSaving} startIcon={<SendRoundedIcon />} onClick={() => setObjConfirm({ strAction: "submit", objRequest: objEditing })}>{t("submit", "Submit")}</Button> : null}
              </Stack>
              {objPreview && !objPreview.blnValid ? <Alert severity="warning" sx={{ mt: 2 }}>{objPreview.lstErrors.map((objItem) => t(`validation_${objItem.strCode.toLowerCase()}`, objItem.strCode)).join(" · ")}{objPreview.objPayrollConflict ? ` · ${t("payroll_conflict", "Payroll is locked or processed.")}` : ""}</Alert> : null}
            </Paper>
          </Grid>
        </Grid>
      ) : (
        <Stack spacing={1.25}>
          <Paper className={styles.controlsCard}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField data-control-id="attendance-regularization.requests.search.input" fullWidth value={strRequestSearch} onChange={(objEvent) => setStrRequestSearch(objEvent.target.value)} placeholder={t("search_requests", "Search request number, date or type")} />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField data-control-id="attendance-regularization.requests.status.select" select fullWidth label={t("status", "Status")} value={strRequestStatusFilter} onChange={(objEvent) => setStrRequestStatusFilter(objEvent.target.value)}><MenuItem value="">{t("all", "All")}</MenuItem>{lstRequestStatuses.map((objOption) => <MenuItem key={objOption.strValueCode} value={objOption.strValueCode}>{objOption.strDisplayName}</MenuItem>)}</TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Stack direction="row" spacing={1} className={styles.filterActions}>
                  <Button fullWidth data-control-id="attendance-regularization.requests.search.button" className={styles.primaryButton} startIcon={<SearchRoundedIcon />} onClick={() => { setStrAppliedRequestSearch(strRequestSearch); setStrAppliedRequestStatus(strRequestStatusFilter); }}>{t("search", "Search")}</Button>
                  <Button fullWidth data-control-id="attendance-regularization.requests.clear.button" className={styles.secondaryButton} startIcon={<ClearRoundedIcon />} onClick={() => { setStrRequestSearch(""); setStrRequestStatusFilter(""); setStrAppliedRequestSearch(""); setStrAppliedRequestStatus(""); }}>{t("clear", "Clear")}</Button>
                </Stack>
              </Grid>
            </Grid>
          </Paper>
          {lstFilteredRequests.length === 0 ? <Alert severity="info">{t("no_requests", "No regularization requests found.")}</Alert> : lstFilteredRequests.map((objRequest) => (
            <Paper key={objRequest.intID} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                <Box><Typography fontWeight={850}>{objRequest.strRequestNumber ?? objRequest.dtWorkDate}</Typography><Typography color="text.secondary">{objRequest.dtWorkDate} · {lookupLabel(lstTypes, objRequest.strRequestTypeCode, t("request", "Request"))}</Typography></Box>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <LookupChip lstOptions={lstRequestStatuses} strCode={objRequest.strRequestStatus} strFallback={t("status_unavailable", "Status unavailable")} />
                  <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.view.button`} startIcon={<HistoryRoundedIcon />} onClick={() => void attendanceRegularizationService.getMyDetail(objRequest.intID).then(setObjDetail)}>{t("view", "View")}</Button>
                  {["DRAFT", "SENT_BACK"].includes(objRequest.strRequestStatus) ? <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.edit.button`} onClick={() => editRequest(objRequest)}>{t("edit", "Edit")}</Button> : null}
                  {objRequest.strRequestStatus === "DRAFT" ? <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.submit.button`} onClick={() => setObjConfirm({ strAction: "submit", objRequest })}>{t("submit", "Submit")}</Button> : null}
                  {objRequest.strRequestStatus === "PENDING_APPROVAL" ? <Button data-control-id={`attendance-regularization.request.${objRequest.intID}.withdraw.button`} color="error" onClick={() => setObjConfirm({ strAction: "withdraw", objRequest })}>{t("withdraw", "Withdraw")}</Button> : null}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog data-control-id="attendance-regularization.detail.dialog" open={Boolean(objDetail)} onClose={() => setObjDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>{t("request_detail", "Request Detail")}</DialogTitle>
        <DialogContent dividers><Grid container spacing={2}><Grid item xs={12} md={6}><Typography fontWeight={850}>{t("original", "Original")}</Typography><Typography>{t("status", "Status")}: {lookupLabel(lstAttendanceStatuses, objDetail?.objOriginalSnapshot.strStatus, t("not_recorded", "Not recorded"))}</Typography><Typography>{t("first_in", "First IN")}: {objDetail?.objOriginalSnapshot.tmFirstIn ?? "—"}</Typography><Typography>{t("last_out", "Last OUT")}: {objDetail?.objOriginalSnapshot.tmLastOut ?? "—"}</Typography><Typography>{t("worked_hours", "Worked Hours")}: {objDetail?.objOriginalSnapshot.decWorkedHours ?? "—"}</Typography></Grid><Grid item xs={12} md={6}><Typography fontWeight={850}>{t("proposed", "Proposed")}</Typography><Typography>{t("status", "Status")}: {lookupLabel(lstAttendanceStatuses, objDetail?.objProposalSnapshot.strProposedStatus, t("unavailable", "Unavailable"))}</Typography><Typography>{t("first_in", "First IN")}: {objDetail?.objProposalSnapshot.tmProposedFirstIn ?? "—"}</Typography><Typography>{t("last_out", "Last OUT")}: {objDetail?.objProposalSnapshot.tmProposedLastOut ?? "—"}</Typography><Typography>{t("worked_hours", "Worked Hours")}: {objDetail?.objProposalSnapshot.decProposedWorkedHours ?? "—"}</Typography></Grid><Grid item xs={12}><Typography fontWeight={850}>{t("attachments", "Attachments")}</Typography><Stack spacing={0.5}>{objDetail?.lstAttachments.length ? objDetail.lstAttachments.map((objAttachment) => <Stack key={objAttachment.intID} direction="row" alignItems="center" justifyContent="space-between"><Typography>{objAttachment.strFileName}</Typography><Stack direction="row"><Button data-control-id={`attendance-regularization.attachment.${objAttachment.intID}.download.button`} onClick={() => void attendanceRegularizationService.downloadAttachment(objDetail.intID, objAttachment.intID, objAttachment.strFileName)}>{t("download", "Download")}</Button>{["DRAFT", "SENT_BACK"].includes(objDetail.strRequestStatus) ? <Button data-control-id={`attendance-regularization.attachment.${objAttachment.intID}.delete.button`} color="error" onClick={() => void attendanceRegularizationService.deleteAttachment(objDetail.intID, objAttachment.intID).then(() => attendanceRegularizationService.getMyDetail(objDetail.intID)).then(setObjDetail)}>{t("delete", "Delete")}</Button> : null}</Stack></Stack>) : <Typography color="text.secondary">{t("no_attachments", "No attachments.")}</Typography>}</Stack><Divider /><Typography fontWeight={850} sx={{ mt: 2 }}>{t("timeline", "Timeline")}</Typography>{objDetail?.lstActions.map((objAction) => <Box key={objAction.intID} sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 1.5, my: 1 }}><Typography fontWeight={750}>{lookupLabel(lstActions, objAction.strActionCode, t("action", "Action"))}</Typography><Typography variant="caption">{formatDateTime(objAction.dtActionOn)}{objAction.strRemarks ? ` · ${objAction.strRemarks}` : ""}</Typography></Box>)}</Grid></Grid></DialogContent>
        <DialogActions><Button data-control-id="attendance-regularization.detail.close.button" onClick={() => setObjDetail(null)}>{t("close", "Close")}</Button></DialogActions>
      </Dialog>
      <Dialog data-control-id="attendance-regularization.confirm.dialog" open={Boolean(objConfirm)} onClose={() => setObjConfirm(null)}>
        <DialogTitle>{objConfirm?.strAction === "submit" ? t("confirm_submit_title", "Submit Request") : t("confirm_withdraw_title", "Withdraw Request")}</DialogTitle>
        <DialogContent><Typography>{t("confirm_action_message", "Please confirm this workflow action.")}</Typography></DialogContent>
        <DialogActions><Button data-control-id="attendance-regularization.confirm.cancel.button" onClick={() => setObjConfirm(null)}>{t("cancel", "Cancel")}</Button><Button data-control-id="attendance-regularization.confirm.continue.button" variant="contained" disabled={blnSaving} onClick={() => void runConfirmedAction()}>{t("confirm", "Confirm")}</Button></DialogActions>
      </Dialog>
      <Snackbar data-control-id="attendance-regularization.notification" open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((objValue) => ({ ...objValue, blnOpen: false }))}><Alert severity={objToast.strSeverity}>{objToast.strMessage}</Alert></Snackbar>
    </Box>
  );
}
