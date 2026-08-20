"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, MenuItem, Paper,
  Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonConfirmDialog from "@/Common/components/CommonConfirmDialog";
import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import FileRowActions from "@/components/shared/files/FileRowActions";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import WorkHolidayDetailDrawer from "@/features/work-on-holiday/components/WorkHolidayDetailDrawer";
import { useWorkHolidayDetail, useWorkHolidayList } from "@/features/work-on-holiday/hooks/useWorkHoliday";
import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import type {
  WorkHolidayEarnedCompOff, WorkHolidayEligibilityPreview, WorkHolidayFormValues, WorkHolidayRequest,
} from "@/features/work-on-holiday/types/WorkHolidayTypes";
import { getWorkHolidayBusinessStatus } from "@/features/work-on-holiday/types/WorkHolidayTypes";
import { WORK_HOLIDAY_ACTION_ALIASES as dicActionAliases } from "@/features/work-on-holiday/types/WorkHolidayTypes";
import { WORK_HOLIDAY_MODULE_CODES as lstModuleCodes } from "@/features/work-on-holiday/types/WorkHolidayTypes";

type WorkHolidayGridRow = Record<string, ReactNode> & { intID: number };

const strTabStorageKey = "hrms:work-on-holiday:ess-tab";
const objSecondaryActionSx = {
  backgroundColor: "#fff",
  border: "1px solid var(--app-primary-color)",
  color: "var(--app-primary-color)",
  "&:hover": {
    backgroundColor: "rgba(29, 93, 150, 0.06)",
    borderColor: "var(--app-primary-color)",
  },
};

function calculateHours(strStart: string, strEnd: string) {
  if (!strStart || !strEnd) return 0;
  const [intStartHour, intStartMinute] = strStart.split(":").map(Number);
  const [intEndHour, intEndMinute] = strEnd.split(":").map(Number);
  const intMinutes = (intEndHour * 60 + intEndMinute) - (intStartHour * 60 + intStartMinute);
  return Math.max(0, Number((intMinutes / 60).toFixed(2)));
}

function addOneMinuteToTime(strValue?: string | null) {
  if (!strValue || !/^\d{2}:\d{2}$/.test(strValue)) return undefined;
  const [strHour, strMinute] = strValue.split(":");
  const intTotalMinutes = Number(strHour) * 60 + Number(strMinute) + 1;
  if (!Number.isFinite(intTotalMinutes) || intTotalMinutes >= 24 * 60) return undefined;
  return `${String(Math.floor(intTotalMinutes / 60)).padStart(2, "0")}:${String(intTotalMinutes % 60).padStart(2, "0")}`;
}

function formatDisplayDate(strValue?: string | null) {
  if (!strValue) return "—";
  const strDatePart = strValue.slice(0, 10);
  const objDate = new Date(`${strDatePart}T00:00:00`);
  if (Number.isNaN(objDate.getTime())) return strValue;
  return `${String(objDate.getDate()).padStart(2, "0")}-${String(objDate.getMonth() + 1).padStart(2, "0")}-${objDate.getFullYear()}`;
}

// Read-only preview only; the authoritative credit is recalculated server-side from the
// effective Work on Holiday policy once attendance is verified (see WorkHolidayService).
function calculateExpectedCredit(strOutcome: string, decHours: number) {
  if (!["COMPOFF", "BOTH"].includes(strOutcome)) return 0;
  if (decHours >= 8) return 1;
  if (decHours >= 4) return 0.5;
  return 0;
}

export default function EssWorkHolidayPage() {
  const { t } = useModuleLabels("work_on_holiday");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo } = useActionRights();
  const fnCan = (strAction: string) => lstModuleCodes.some((strModule) =>
    (dicActionAliases[strAction] ?? [strAction]).some((strAlias) => canDo(strModule, strAlias)),
  );
  const blnCanView = fnCan("WORK_ON_HOLIDAY_VIEW");
  const blnCanCreate = fnCan("WORK_ON_HOLIDAY_CREATE");
  const blnCanWithdraw = fnCan("WORK_ON_HOLIDAY_WITHDRAW");
  const blnCanSubmit = fnCan("WORK_ON_HOLIDAY_SUBMIT");
  const [intTab, setIntTab] = useState(() => typeof window === "undefined" ? 0 : Number(sessionStorage.getItem(strTabStorageKey) ?? 0));
  const [strNotice, setStrNotice] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [objWithdrawRequest, setObjWithdrawRequest] = useState<WorkHolidayRequest | null>(null);
  const [strWithdrawReason, setStrWithdrawReason] = useState("");
  const [objSubmitRequest, setObjSubmitRequest] = useState<WorkHolidayRequest | null>(null);
  const [lstEarned, setLstEarned] = useState<WorkHolidayEarnedCompOff[]>([]);
  const [objEditingRequest, setObjEditingRequest] = useState<WorkHolidayRequest | null>(null);
  const { objList, blnLoading, strError: strListError, reload } = useWorkHolidayList("my", undefined, 1, 100, blnCanView);
  const { objDetail, blnLoading: blnDetailLoading, loadDetail, setObjDetail } = useWorkHolidayDetail();

  const objSchema = useMemo(() => yup.object({
    dtWorkDate: yup.string().required(t("validation_date_required", "Work date is required.")),
    strRequestedOutcomeCode: yup.string().required(),
    tmPlannedStartTime: yup.string().required(t("validation_start_required", "Planned start time is required.")),
    tmPlannedEndTime: yup.string().required(t("validation_end_required", "Planned end time is required.")),
    tmActualStartTime: yup.string().default(""),
    tmActualEndTime: yup.string().default(""),
    decRequestedHours: yup.number().min(0).required(),
    decRequestedCreditDays: yup.number().oneOf([0, 0.5, 1]).required(),
    strWorkReason: yup.string().trim().min(3).max(1000).required(t("validation_reason_required", "Reason is required.")),
    strWorkDescription: yup.string().max(2000).default(""),
    intBackupEmployeeID: yup.number().nullable().default(null),
    objAttachment: yup.mixed<File>().nullable().default(null),
  }), [t]);
  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<WorkHolidayFormValues>({
    resolver: yupResolver(objSchema) as Resolver<WorkHolidayFormValues>,
    defaultValues: {
      dtWorkDate: "", strRequestedOutcomeCode: "COMPOFF", tmPlannedStartTime: "",
      tmPlannedEndTime: "", tmActualStartTime: "", tmActualEndTime: "",
      decRequestedHours: 0, decRequestedCreditDays: 1, strWorkReason: "",
      strWorkDescription: "", intBackupEmployeeID: null, objAttachment: null,
    },
  });
  const strStart = watch("tmPlannedStartTime");
  const strEnd = watch("tmPlannedEndTime");
  const strOutcome = watch("strRequestedOutcomeCode");
  const strWorkDate = watch("dtWorkDate");
  const objAttachment = watch("objAttachment");
  const strMinimumEndTime = useMemo(() => addOneMinuteToTime(strStart), [strStart]);
  const [objEligibilityPreview, setObjEligibilityPreview] = useState<WorkHolidayEligibilityPreview | null>(null);
  useEffect(() => {
    const decHours = calculateHours(strStart, strEnd);
    setValue("decRequestedHours", decHours);
    setValue("decRequestedCreditDays", calculateExpectedCredit(strOutcome, decHours));
  }, [setValue, strEnd, strOutcome, strStart]);
  useEffect(() => {
    if (!strMinimumEndTime || !strEnd || strEnd >= strMinimumEndTime) return;
    setValue("tmPlannedEndTime", "", { shouldDirty: true, shouldValidate: true });
  }, [setValue, strEnd, strMinimumEndTime]);

  // Retrospective requests may already have verified punches; show that evidence read-only
  // instead of letting the employee re-key Actual Start/End (see EssWorkHolidayPage guidance).
  useEffect(() => {
    if (!strWorkDate) { setObjEligibilityPreview(null); return undefined; }
    let blnCancelled = false;
    workHolidayService.getEligibilityPreview(strWorkDate)
      .then((objResult) => { if (!blnCancelled) setObjEligibilityPreview(objResult); })
      .catch(() => { if (!blnCancelled) setObjEligibilityPreview(null); });
    return () => { blnCancelled = true; };
  }, [strWorkDate]);
  const lstPreviewPunches = objEligibilityPreview?.objAttendanceSnapshot?.lstPunches ?? [];
  const blnShowRetrospectiveEvidence = Boolean(
    objEligibilityPreview?.blnRetrospective
    && objEligibilityPreview.objAttendanceSnapshot
    && (lstPreviewPunches.length || objEligibilityPreview.objAttendanceSnapshot.decWorkedHours),
  );

  function clearRequestForm() {
    // Reset through react-hook-form so validation, calculated hours, and the
    // displayed attachment name are cleared together.
    reset();
    setObjEditingRequest(null);
    setStrError("");
    setStrNotice("");
  }

  function backToMyRequests() {
    clearRequestForm();
    setIntTab(1);
    sessionStorage.setItem(strTabStorageKey, "1");
  }

  function startEdit(objRequest: WorkHolidayRequest) {
    setObjEditingRequest(objRequest);
    reset({
      dtWorkDate: objRequest.dtWorkDate,
      strRequestedOutcomeCode: objRequest.strRequestedOutcomeCode === "NONE" ? "COMPOFF" : objRequest.strRequestedOutcomeCode,
      tmPlannedStartTime: (objRequest.tmPlannedStartTime ?? "").slice(0, 5),
      tmPlannedEndTime: (objRequest.tmPlannedEndTime ?? "").slice(0, 5),
      tmActualStartTime: "",
      tmActualEndTime: "",
      decRequestedHours: objRequest.decRequestedHours ?? 0,
      decRequestedCreditDays: objRequest.decRequestedCreditDays ?? 0,
      strWorkReason: objRequest.strWorkReason,
      strWorkDescription: objRequest.strWorkDescription ?? "",
      intBackupEmployeeID: objRequest.intBackupEmployeeID ?? null,
      objAttachment: null,
    });
    setStrError("");
    setStrNotice("");
    setIntTab(0);
    sessionStorage.setItem(strTabStorageKey, "0");
  }

  function changeTab(_objEvent: SyntheticEvent, intValue: number) {
    setIntTab(intValue);
    sessionStorage.setItem(strTabStorageKey, String(intValue));
    if (intValue === 0) setObjEditingRequest(null);
    if (intValue === 2) void workHolidayService.listCompOffEarned().then((objPage) => setLstEarned(objPage.lstItems)).catch((objError: unknown) => setStrError(objError instanceof Error ? objError.message : t("error_load", "Unable to load data.")));
  }

  async function saveAndSubmit(objValues: WorkHolidayFormValues, blnSubmit: boolean) {
    setBlnSaving(true);
    setStrError("");
    setStrNotice("");
    try {
      const objPayload = {
        dtWorkDate: objValues.dtWorkDate,
        strRequestedOutcomeCode: objValues.strRequestedOutcomeCode,
        tmPlannedStartTime: objValues.tmPlannedStartTime,
        tmPlannedEndTime: objValues.tmPlannedEndTime,
        // Actual Start/End are system/HR verified after the work date, never employee-entered.
        tmActualStartTime: null,
        tmActualEndTime: null,
        decRequestedHours: objValues.decRequestedHours,
        decRequestedCreditDays: objValues.decRequestedCreditDays,
        strWorkReason: objValues.strWorkReason,
        strWorkDescription: objValues.strWorkDescription,
        intBackupEmployeeID: objValues.intBackupEmployeeID,
      };
      const blnResubmit = objEditingRequest?.strRequestStatus === "SENT_BACK";
      const objSaved = objEditingRequest
        ? await workHolidayService.updateDraft(objEditingRequest.intID, {
            ...objPayload, intRowVersion: objEditingRequest.intRowVersion,
          })
        : await workHolidayService.createDraft(objPayload);
      if (objValues.objAttachment) {
        await workHolidayService.uploadAttachment(objSaved.intID, objValues.objAttachment);
      }
      if (blnSubmit) {
        await workHolidayService.submit(objSaved.intID, {
          intRowVersion: objSaved.intRowVersion, strIdempotencyKey: crypto.randomUUID(),
        });
      }
      reset();
      setObjEditingRequest(null);
      await reload();
      setStrNotice(
        blnSubmit
          ? (blnResubmit ? t("resubmitted_success", "Request resubmitted successfully.") : t("submitted_success", "Request submitted successfully."))
          : t("draft_saved", "Draft saved successfully."),
      );
      setIntTab(1);
      sessionStorage.setItem(strTabStorageKey, "1");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save request."));
    } finally {
      setBlnSaving(false);
    }
  }

  async function withdrawRequest() {
    if (!objWithdrawRequest || !strWithdrawReason.trim()) return;
    const blnDiscard = objWithdrawRequest.strRequestStatus === "DRAFT";
    setBlnSaving(true);
    setStrError("");
    setStrNotice("");
    try {
      // Discarding a Draft reuses the same withdraw transition (DRAFT is an allowed source
      // status); there is no separate delete endpoint, so this avoids parallel business logic.
      await workHolidayService.withdraw(objWithdrawRequest.intID, {
        intRowVersion: objWithdrawRequest.intRowVersion,
        strIdempotencyKey: crypto.randomUUID(),
        strRemarks: strWithdrawReason.trim(),
      });
      setObjWithdrawRequest(null);
      setStrWithdrawReason("");
      await reload();
      setStrNotice(blnDiscard ? t("discard_success", "Draft discarded successfully.") : t("withdraw_success", "Request withdrawn successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_withdraw", "Unable to complete this action."));
    } finally {
      setBlnSaving(false);
    }
  }

  async function submitDraftRequest() {
    if (!objSubmitRequest) return;
    setBlnSaving(true);
    setStrError("");
    setStrNotice("");
    try {
      await workHolidayService.submit(objSubmitRequest.intID, {
        intRowVersion: objSubmitRequest.intRowVersion, strIdempotencyKey: crypto.randomUUID(),
      });
      setObjSubmitRequest(null);
      await reload();
      setStrNotice(t("submitted_success", "Request submitted successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_submit", "Unable to submit this request."));
    } finally {
      setBlnSaving(false);
    }
  }

  const lstColumns: DataGridColumn<WorkHolidayGridRow>[] = [
    { field: "action", headerName: t("actions", "Actions"), width: 170, sortable: false, filterable: false, exportable: false },
    { field: "strRequestNumber", headerName: t("request_number", "Request Number"), width: 170 },
    { field: "dtWorkDate", headerName: t("work_date", "Work Date"), width: 130 },
    { field: "strDayTypeCode", headerName: t("day_type", "Day Type"), width: 130 },
    { field: "strRequestedOutcomeCode", headerName: t("requested_benefit", "Requested Benefit"), width: 170 },
    { field: "strBusinessStatus", headerName: t("status", "Status"), width: 200 },
    { field: "strCurrentApproverName", headerName: t("current_approver", "Current Approver"), width: 180 },
  ];
  const lstRows: WorkHolidayGridRow[] = objList.lstItems.map((objRequest) => {
    const blnEditable = ["DRAFT", "SENT_BACK"].includes(objRequest.strRequestStatus);
    return {
    intID: objRequest.intID,
    action: (
      <Stack direction="row" spacing={0.25}>
        <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.view.button`} aria-label={t("view", "View")} onClick={() => void loadDetail(objRequest.intID)}><VisibilityRoundedIcon /></Button>
        {blnCanCreate && blnEditable ? (
          <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.edit.button`} aria-label={t("edit", "Edit")} onClick={() => startEdit(objRequest)}>
            <EditRoundedIcon />
          </Button>
        ) : null}
        {(blnCanSubmit || blnCanCreate) && objRequest.strRequestStatus === "DRAFT" ? (
          <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.submit.button`} color="primary" aria-label={t("submit", "Submit")} onClick={() => setObjSubmitRequest(objRequest)}>
            <SendRoundedIcon />
          </Button>
        ) : null}
        {blnCanWithdraw && objRequest.strRequestStatus === "PENDING_APPROVAL" ? (
          <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.withdraw.button`} color="error" aria-label={t("withdraw", "Withdraw")} onClick={() => { setStrWithdrawReason(""); setObjWithdrawRequest(objRequest); }}>
            <WarningAmberRoundedIcon />
          </Button>
        ) : null}
        {blnCanWithdraw && objRequest.strRequestStatus === "DRAFT" ? (
          <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.discard.button`} color="error" aria-label={t("discard", "Discard")} onClick={() => { setStrWithdrawReason(""); setObjWithdrawRequest(objRequest); }}>
            <DeleteOutlineRoundedIcon />
          </Button>
        ) : null}
      </Stack>
    ),
    strRequestNumber: objRequest.strRequestNumber ?? "—",
    dtWorkDate: objRequest.dtWorkDate,
    strDayTypeCode: t(`day_type_${objRequest.strDayTypeCode.toLowerCase()}`, objRequest.strDayTypeCode),
    strRequestedOutcomeCode: t(`outcome_${objRequest.strRequestedOutcomeCode.toLowerCase()}`, objRequest.strRequestedOutcomeCode),
    strBusinessStatus: <Chip size="small" label={getWorkHolidayBusinessStatus(objRequest, t)} />,
    strCurrentApproverName: objRequest.strCurrentApproverName ?? (objRequest.intCurrentApproverUserID ? t("assigned_approver", "Assigned Approver") : "—"),
    };
  });

  if (blnRightsLoading) return <Box data-control-id="work-on-holiday.ess.rights-loading.container" sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress aria-label={t("loading", "Loading")} /></Box>;
  if (!blnCanView && !blnCanCreate) return <Alert data-control-id="work-on-holiday.ess.unauthorized.alert" severity="warning">{strRightsError || t("unauthorized", "Work on Holiday access is not available. Ask your administrator to assign the ESS Work on Holiday rights.")}</Alert>;
  return (
    <Stack spacing={2}>
      {strNotice ? <Alert data-control-id="work-on-holiday.ess.success.alert" severity="success" onClose={() => setStrNotice("")}>{strNotice}</Alert> : null}
      {strError || strListError ? <Alert data-control-id="work-on-holiday.ess.error.alert" severity="error">{strError || strListError}</Alert> : null}
      <Paper><Tabs value={intTab} onChange={changeTab} variant="scrollable" aria-label={t("ess_tabs", "Work on Holiday sections")}><Tab data-control-id="work-on-holiday.ess.new.tab" label={t("tab_new_request", "New Request")} disabled={!blnCanCreate} /><Tab data-control-id="work-on-holiday.ess.my.tab" label={t("tab_my_requests", "My Requests")} /><Tab data-control-id="work-on-holiday.ess.earned.tab" label={t("tab_earned_comp_off", "Earned Comp-Off")} /></Tabs></Paper>
      {intTab === 0 ? (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          {objEditingRequest ? (
            <Button
              data-control-id="work-on-holiday.ess.back-to-my-requests.button"
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              onClick={backToMyRequests}
              sx={{ mb: 1 }}
            >
              {t("back_to_my_requests", "Back to My Requests")}
            </Button>
          ) : null}
          <Alert data-control-id="work-on-holiday.ess.policy-guidance.alert" severity="info" sx={{ mb: 2 }}>{t("policy_guidance", "Select a Saturday, Sunday, or an active Holiday Master date. Eligibility is validated for approval.")}</Alert>
          {objEditingRequest ? (
            <Alert
              data-control-id="work-on-holiday.ess.editing.alert"
              severity="info"
              sx={{ mb: 2 }}
              action={<Button data-control-id="work-on-holiday.ess.cancel-edit.button" size="small" onClick={clearRequestForm}>{t("cancel_edit", "Cancel Edit")}</Button>}
            >
              {objEditingRequest.strRequestStatus === "SENT_BACK"
                ? t("editing_sent_back", "Editing a sent-back request. Submitting will resubmit it for approval.")
                : t("editing_draft", "Editing a draft request.")}
              {" "}{objEditingRequest.strRequestNumber ?? ""}
            </Alert>
          ) : null}
          {blnShowRetrospectiveEvidence ? (
            <Alert data-control-id="work-on-holiday.ess.retrospective-evidence.alert" severity="info" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>{t("retrospective_evidence_title", "Existing Attendance Evidence")}</Typography>
              <Typography variant="body2">
                {t("first_in", "First In")}: {objEligibilityPreview?.objAttendanceSnapshot?.tmFirstIn?.slice(0, 5) ?? "—"}
                {" · "}{t("last_out", "Last Out")}: {objEligibilityPreview?.objAttendanceSnapshot?.tmLastOut?.slice(0, 5) ?? "—"}
                {" · "}{t("worked_hours", "Worked Hours")}: {objEligibilityPreview?.objAttendanceSnapshot?.decWorkedHours ?? "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t("retrospective_evidence_note", "This is read-only evidence from existing punches; it cannot be edited here.")}</Typography>
            </Alert>
          ) : null}
          <Box component="form" onSubmit={handleSubmit((objValues) => saveAndSubmit(objValues, true))}>
            <Box sx={{ width: "100%" }}>
              <Grid container spacing={2}>
                <Grid item xs={12}><Stack direction="row" flexWrap="wrap" useFlexGap gap={2}>
                  <Box sx={{ width: { xs: "100%", sm: 230 } }}><Controller name="dtWorkDate" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.date.input" fullWidth size="small" type="date" label={t("eligible_date", "Eligible Date")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtWorkDate)} helperText={errors.dtWorkDate?.message} />} /></Box>
                  <Box sx={{ width: { xs: "100%", sm: 280 } }}><Controller name="strRequestedOutcomeCode" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.outcome.select" select fullWidth size="small" label={t("requested_benefit", "Requested Benefit")}>{["ATTENDANCE_CREDIT", "COMPOFF", "BOTH"].map((strCode) => <MenuItem data-control-id={`work-on-holiday.ess.outcome.${strCode.toLowerCase()}.option`} key={strCode} value={strCode}>{t(`outcome_${strCode.toLowerCase()}`, strCode)}</MenuItem>)}</TextField>} /></Box>
                  {["COMPOFF", "BOTH"].includes(strOutcome) ? (
                    <Box sx={{ width: { xs: "100%", sm: 180 } }}><Controller name="decRequestedCreditDays" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.credit-days.input" fullWidth size="small" label={t("expected_credit", "Expected Credit")} InputProps={{ readOnly: true }} />} /></Box>
                  ) : null}
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmPlannedStartTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.planned-start.input" fullWidth size="small" type="time" label="Start Time" InputLabelProps={{ shrink: true }} error={Boolean(errors.tmPlannedStartTime)} helperText={errors.tmPlannedStartTime?.message} />} /></Box>
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmPlannedEndTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.planned-end.input" fullWidth size="small" type="time" label="End Time" InputLabelProps={{ shrink: true }} error={Boolean(errors.tmPlannedEndTime)} inputProps={{ min: strMinimumEndTime }} helperText={strMinimumEndTime ? t("end_after_start_hint", `Must be after ${strStart}`) : errors.tmPlannedEndTime?.message} />} /></Box>
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 220 } }}><Controller name="decRequestedHours" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.requested-hours.input" fullWidth size="small" type="number" label={t("calculated_hours", "Calculated Requested Hours")} InputProps={{ readOnly: true }} />} /></Box>
                  <Box sx={{ width: { xs: "100%", sm: objAttachment ? 320 : 180 } }}>
                    {objAttachment ? (
                      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.8} sx={{ border: "1px solid #dbe3ef", borderRadius: "8px", px: 1, height: 40, minWidth: 0 }}>
                        <Typography title={objAttachment.name} sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{objAttachment.name}</Typography>
                        <FileRowActions
                          strFileName={objAttachment.name}
                          controlIdPrefix="work-on-holiday.ess.attachment"
                          onPreview={() => {
                            const strUrl = URL.createObjectURL(objAttachment);
                            window.open(strUrl, "_blank", "noopener,noreferrer");
                            window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
                          }}
                          onReplace={(objNewFile) => setValue("objAttachment", objNewFile)}
                          onDelete={() => setValue("objAttachment", null)}
                        />
                      </Stack>
                    ) : (
                      <Button data-control-id="work-on-holiday.ess.attachment.button" component="label" fullWidth variant="outlined" startIcon={<AttachFileRoundedIcon />} sx={{ height: 40 }}>
                        {t("attachment", "Attachment")}
                        <input data-control-id="work-on-holiday.ess.attachment.input" hidden type="file" onChange={(objEvent) => setValue("objAttachment", objEvent.target.files?.[0] ?? null)} />
                      </Button>
                    )}
                  </Box>
                </Stack></Grid>
                <Grid item xs={12}><Controller name="strWorkReason" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.reason.input" fullWidth size="small" multiline minRows={2} label={t("reason", "Reason")} error={Boolean(errors.strWorkReason)} helperText={errors.strWorkReason?.message} />} /></Grid>
                <Grid item xs={12}><Controller name="strWorkDescription" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.description.input" fullWidth size="small" multiline minRows={3} label={t("work_description", "Work Description")} />} /></Grid>
              </Grid>
              <Divider sx={{ my: 2 }} /><Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={1}><Button data-control-id="work-on-holiday.ess.clear.button" type="button" variant="outlined" startIcon={<ClearRoundedIcon />} disabled={blnSaving} onClick={clearRequestForm} sx={objSecondaryActionSx}>{t("clear", "Clear")}</Button><Button data-control-id="work-on-holiday.ess.save-draft.button" variant="outlined" disabled={blnSaving} onClick={handleSubmit((objValues) => saveAndSubmit(objValues, false))} sx={objSecondaryActionSx}>{objEditingRequest ? t("update_draft", "Update Draft") : t("save_draft", "Save Draft")}</Button><Button data-control-id="work-on-holiday.ess.submit.button" type="submit" variant="contained" disabled={blnSaving} sx={{ backgroundColor: "var(--app-primary-color)", "&:hover": { backgroundColor: "var(--app-primary-hover-color, #164d7c)" } }}>{blnSaving ? <CircularProgress size={20} color="inherit" /> : (objEditingRequest?.strRequestStatus === "SENT_BACK" ? t("resubmit", "Resubmit") : t("submit", "Submit"))}</Button></Stack>
            </Box>
          </Box>
        </Paper>
      ) : null}
      {intTab === 1 ? <Box sx={{ position: "relative" }}>{blnLoading ? <CircularProgress aria-label={t("loading", "Loading")} /> : null}<CommonDataGrid columns={lstColumns} rows={lstRows} rowIdField="intID" showExportOptions exportFileName="work_on_holiday_my_requests" testIdPrefix="work-on-holiday-my" emptyMessage={t("empty_my_requests", "No requests found.")} /></Box> : null}
      {intTab === 2 ? <CommonDataGrid columns={[
        { field: "strRequestNumber", headerName: t("source_request", "Source Request") },
        { field: "dtWorkDate", headerName: t("work_date", "Work Date") },
        { field: "decCreditedDays", headerName: t("credited_days", "Credited Days") },
        { field: "dtCreditDate", headerName: t("credit_date", "Credit Date") },
        { field: "dtExpiryDate", headerName: t("expiry_date", "Expiry Date") },
        { field: "strStatus", headerName: t("status", "Status") },
      ]} rows={lstEarned.map((objEarned) => ({
        intID: objEarned.intID,
        strRequestNumber: objEarned.strRequestNumber ?? "—",
        dtWorkDate: formatDisplayDate(objEarned.dtWorkDate),
        decCreditedDays: objEarned.decCreditedDays ?? "—",
        dtCreditDate: formatDisplayDate(objEarned.dtCreditDate),
        dtExpiryDate: formatDisplayDate(objEarned.dtExpiryDate),
        strStatus: t(`earned_status_${objEarned.strStatus.toLowerCase()}`, objEarned.strStatus === "REVERSED" ? "Reversed" : "Available"),
      }))} rowIdField="intID" showExportOptions exportFileName="earned_comp_off" testIdPrefix="work-on-holiday-earned" emptyMessage={t("empty_earned", "No earned Comp-Off entries found.")} /> : null}
      <WorkHolidayDetailDrawer objDetail={objDetail} blnOpen={Boolean(objDetail)} blnLoading={blnDetailLoading} blnBusinessStatus fnOnClose={() => setObjDetail(null)} fnOnRefresh={async () => { if (objDetail) await loadDetail(objDetail.intID); await reload(); }} fnOnConflict={(strMessage) => setStrError(`${t("concurrency_conflict", "This request changed. The latest record has been loaded.")} ${strMessage}`)} />
      <CommonConfirmDialog
        rootControlId="work-on-holiday.submit.dialog"
        blnOpen={Boolean(objSubmitRequest)}
        strTitle={t("confirm_submit_title", "Submit Work on Holiday Request?")}
        strMessage={t("confirm_submit_message", "Once submitted, this request will move to Pending Approval and cannot be edited.")}
        strCancelLabel={t("cancel", "Cancel")}
        strConfirmLabel={t("submit", "Submit")}
        blnConfirmDisabled={blnSaving}
        blnCancelDisabled={blnSaving}
        onClose={() => !blnSaving && setObjSubmitRequest(null)}
        onConfirm={() => void submitDraftRequest()}
        cancelButtonControlId="work-on-holiday.submit.cancel.button"
        confirmButtonControlId="work-on-holiday.submit.confirm.button"
      />
      <Dialog data-control-id="work-on-holiday.withdraw.dialog" open={Boolean(objWithdrawRequest)} onClose={() => !blnSaving && setObjWithdrawRequest(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 850 }}>
          {objWithdrawRequest?.strRequestStatus === "DRAFT"
            ? t("confirm_discard_title", "Discard Draft Request?")
            : t("confirm_withdraw_title", "Withdraw Work on Holiday Request?")}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            data-control-id="work-on-holiday.withdraw.reason.input"
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label={objWithdrawRequest?.strRequestStatus === "DRAFT" ? t("discard_reason", "Discard Reason") : t("withdraw_reason", "Withdrawal Reason")}
            value={strWithdrawReason}
            onChange={(objEvent) => setStrWithdrawReason(objEvent.target.value)}
            error={!strWithdrawReason.trim()}
            helperText={!strWithdrawReason.trim() ? t("withdraw_reason_required", "A reason is required.") : ""}
          />
        </DialogContent>
        <DialogActions>
          <Button data-control-id="work-on-holiday.withdraw.cancel.button" onClick={() => setObjWithdrawRequest(null)} disabled={blnSaving}>{t("cancel", "Cancel")}</Button>
          <Button data-control-id="work-on-holiday.withdraw.confirm.button" variant="contained" color="error" onClick={() => void withdrawRequest()} disabled={blnSaving || !strWithdrawReason.trim()}>
            {objWithdrawRequest?.strRequestStatus === "DRAFT" ? t("discard", "Discard") : t("withdraw", "Withdraw")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
