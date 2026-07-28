"use client";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Grid, MenuItem, Paper,
  Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import * as yup from "yup";

import CommonDataGrid, { type DataGridColumn } from "@/components/ui/CommonDataGrid";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import WorkHolidayDetailDrawer from "@/features/work-on-holiday/components/WorkHolidayDetailDrawer";
import { useWorkHolidayDetail, useWorkHolidayList } from "@/features/work-on-holiday/hooks/useWorkHoliday";
import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import type {
  WorkHolidayFormValues, WorkHolidayPosting,
} from "@/features/work-on-holiday/types/WorkHolidayTypes";
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

export default function EssWorkHolidayPage() {
  const { t } = useModuleLabels("work_on_holiday");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDo } = useActionRights();
  const fnCan = (strAction: string) => lstModuleCodes.some((strModule) =>
    (dicActionAliases[strAction] ?? [strAction]).some((strAlias) => canDo(strModule, strAlias)),
  );
  const blnCanView = fnCan("WORK_ON_HOLIDAY_VIEW");
  const blnCanCreate = fnCan("WORK_ON_HOLIDAY_CREATE");
  const [intTab, setIntTab] = useState(() => typeof window === "undefined" ? 0 : Number(sessionStorage.getItem(strTabStorageKey) ?? 0));
  const [strNotice, setStrNotice] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [lstEarned, setLstEarned] = useState<WorkHolidayPosting[]>([]);
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
  const objAttachment = watch("objAttachment");
  useEffect(() => { setValue("decRequestedHours", calculateHours(strStart, strEnd)); }, [setValue, strEnd, strStart]);

  function clearRequestForm() {
    // Reset through react-hook-form so validation, calculated hours, and the
    // displayed attachment name are cleared together.
    reset();
    setStrError("");
    setStrNotice("");
  }

  function changeTab(_objEvent: SyntheticEvent, intValue: number) {
    setIntTab(intValue);
    sessionStorage.setItem(strTabStorageKey, String(intValue));
    if (intValue === 2) void workHolidayService.listCompOffEarned().then((objPage) => setLstEarned(objPage.lstItems)).catch((objError: unknown) => setStrError(objError instanceof Error ? objError.message : t("error_load", "Unable to load data.")));
  }

  async function saveAndSubmit(objValues: WorkHolidayFormValues, blnSubmit: boolean) {
    setBlnSaving(true);
    setStrError("");
    setStrNotice("");
    try {
      const objSaved = await workHolidayService.createDraft({
        dtWorkDate: objValues.dtWorkDate,
        strRequestedOutcomeCode: objValues.strRequestedOutcomeCode,
        tmPlannedStartTime: objValues.tmPlannedStartTime,
        tmPlannedEndTime: objValues.tmPlannedEndTime,
        tmActualStartTime: objValues.tmActualStartTime || null,
        tmActualEndTime: objValues.tmActualEndTime || null,
        decRequestedHours: objValues.decRequestedHours,
        decRequestedCreditDays: objValues.decRequestedCreditDays,
        strWorkReason: objValues.strWorkReason,
        strWorkDescription: objValues.strWorkDescription,
        intBackupEmployeeID: objValues.intBackupEmployeeID,
      });
      if (objValues.objAttachment) {
        await workHolidayService.uploadAttachment(objSaved.intID, objValues.objAttachment);
      }
      if (blnSubmit) {
        await workHolidayService.submit(objSaved.intID, {
          intRowVersion: objSaved.intRowVersion, strIdempotencyKey: crypto.randomUUID(),
        });
      }
      reset();
      await reload();
      setStrNotice(blnSubmit ? t("submitted_success", "Request submitted successfully.") : t("draft_saved", "Draft saved successfully."));
      setIntTab(1);
      sessionStorage.setItem(strTabStorageKey, "1");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save request."));
    } finally {
      setBlnSaving(false);
    }
  }

  const lstColumns: DataGridColumn<WorkHolidayGridRow>[] = [
    { field: "action", headerName: t("actions", "Actions"), width: 90, sortable: false, filterable: false, exportable: false },
    { field: "strRequestNumber", headerName: t("request_number", "Request Number"), width: 170 },
    { field: "dtWorkDate", headerName: t("work_date", "Work Date"), width: 130 },
    { field: "strDayTypeCode", headerName: t("day_type", "Day Type"), width: 130 },
    { field: "strRequestedOutcomeCode", headerName: t("outcome", "Outcome"), width: 150 },
    { field: "strRequestStatus", headerName: t("status", "Status"), width: 170 },
    { field: "strAttendanceVerificationStatus", headerName: t("attendance_verification", "Attendance Verification"), width: 210 },
    { field: "strPostingStatus", headerName: t("posting_status", "Posting Status"), width: 160 },
    { field: "strCurrentApproverName", headerName: t("current_approver", "Current Approver"), width: 180 },
  ];
  const lstRows: WorkHolidayGridRow[] = objList.lstItems.map((objRequest) => ({
    intID: objRequest.intID,
    action: <Button data-control-id={`work-on-holiday.my.${objRequest.intID}.view.button`} aria-label={t("view", "View")} onClick={() => void loadDetail(objRequest.intID)}><VisibilityRoundedIcon /></Button>,
    strRequestNumber: objRequest.strRequestNumber ?? "—",
    dtWorkDate: objRequest.dtWorkDate,
    strDayTypeCode: t(`day_type_${objRequest.strDayTypeCode.toLowerCase()}`, objRequest.strDayTypeCode),
    strRequestedOutcomeCode: t(`outcome_${objRequest.strRequestedOutcomeCode.toLowerCase()}`, objRequest.strRequestedOutcomeCode),
    strRequestStatus: <Chip size="small" label={t(`status_${objRequest.strRequestStatus.toLowerCase()}`, objRequest.strRequestStatus)} />,
    strAttendanceVerificationStatus: t(`verification_${objRequest.strAttendanceVerificationStatus.toLowerCase()}`, objRequest.strAttendanceVerificationStatus),
    strPostingStatus: t(`posting_${objRequest.strPostingStatus.toLowerCase()}`, objRequest.strPostingStatus),
    strCurrentApproverName: objRequest.strCurrentApproverName ?? (objRequest.intCurrentApproverUserID ? t("assigned_approver", "Assigned Approver") : "—"),
  }));

  if (blnRightsLoading) return <Box data-control-id="work-on-holiday.ess.rights-loading.container" sx={{ display: "grid", placeItems: "center", minHeight: 240 }}><CircularProgress aria-label={t("loading", "Loading")} /></Box>;
  if (!blnCanView && !blnCanCreate) return <Alert data-control-id="work-on-holiday.ess.unauthorized.alert" severity="warning">{strRightsError || t("unauthorized", "Work on Holiday access is not available. Ask your administrator to assign the ESS Work on Holiday rights.")}</Alert>;
  return (
    <Stack spacing={2}>
      <Box className="pageBanner" data-control-id="work-on-holiday.ess.header.banner">
        <Box className="bannerDots" />
        <Box className="bannerIcon">
          <EventAvailableRoundedIcon sx={{ fontSize: 30 }} />
        </Box>
        <Box className="bannerDivider" />
        <Box sx={{ position: "relative", zIndex: 1, flex: 1, minWidth: 0 }}>
          <Typography component="h1" className="bannerTitle">{t("ess_page_title", "Work on Holiday")}</Typography>
          <Typography component="p" className="bannerSubTitle">{t("ess_page_subtitle", "Request approval and track attendance or Comp-Off credit.")}</Typography>
        </Box>
      </Box>
      {strNotice ? <Alert data-control-id="work-on-holiday.ess.success.alert" severity="success" onClose={() => setStrNotice("")}>{strNotice}</Alert> : null}
      {strError || strListError ? <Alert data-control-id="work-on-holiday.ess.error.alert" severity="error">{strError || strListError}</Alert> : null}
      <Paper><Tabs value={intTab} onChange={changeTab} variant="scrollable" aria-label={t("ess_tabs", "Work on Holiday sections")}><Tab data-control-id="work-on-holiday.ess.new.tab" label={t("tab_new_request", "New Request")} disabled={!blnCanCreate} /><Tab data-control-id="work-on-holiday.ess.my.tab" label={t("tab_my_requests", "My Requests")} /><Tab data-control-id="work-on-holiday.ess.earned.tab" label={t("tab_earned_comp_off", "Earned Comp-Off")} /></Tabs></Paper>
      {intTab === 0 ? (
        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Alert data-control-id="work-on-holiday.ess.policy-guidance.alert" severity="info" sx={{ mb: 2 }}>{t("policy_guidance", "Select a configured holiday or weekly off. Eligibility and policy limits are validated by the server.")}</Alert>
          <Box component="form" onSubmit={handleSubmit((objValues) => saveAndSubmit(objValues, true))}>
            <Box sx={{ width: "100%" }}>
              <Grid container spacing={2}>
                <Grid item xs={12}><Stack direction="row" flexWrap="wrap" useFlexGap gap={2}>
                  <Box sx={{ width: { xs: "100%", sm: 230 } }}><Controller name="dtWorkDate" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.date.input" fullWidth size="small" type="date" label={t("eligible_date", "Eligible Date")} InputLabelProps={{ shrink: true }} error={Boolean(errors.dtWorkDate)} helperText={errors.dtWorkDate?.message} />} /></Box>
                  <Box sx={{ width: { xs: "100%", sm: 280 } }}><Controller name="strRequestedOutcomeCode" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.outcome.select" select fullWidth size="small" label={t("requested_outcome", "Requested Outcome")}>{["ATTENDANCE_CREDIT", "COMPOFF", "BOTH", "NONE"].map((strCode) => <MenuItem data-control-id={`work-on-holiday.ess.outcome.${strCode.toLowerCase()}.option`} key={strCode} value={strCode}>{t(`outcome_${strCode.toLowerCase()}`, strCode)}</MenuItem>)}</TextField>} /></Box>
                  <Box sx={{ width: { xs: "100%", sm: 180 } }}><Controller name="decRequestedCreditDays" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.credit-days.select" select fullWidth size="small" label={t("expected_credit", "Expected Credit")}>{[0, 0.5, 1].map((fltValue) => <MenuItem data-control-id={`work-on-holiday.ess.credit-days.${fltValue}.option`} key={fltValue} value={fltValue}>{fltValue}</MenuItem>)}</TextField>} /></Box>
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmPlannedStartTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.planned-start.input" fullWidth size="small" type="time" label={t("planned_start", "Planned Start")} InputLabelProps={{ shrink: true }} error={Boolean(errors.tmPlannedStartTime)} />} /></Box>
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmPlannedEndTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.planned-end.input" fullWidth size="small" type="time" label={t("planned_end", "Planned End")} InputLabelProps={{ shrink: true }} error={Boolean(errors.tmPlannedEndTime)} />} /></Box>
                  <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmActualStartTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.actual-start.input" fullWidth size="small" type="time" label={t("actual_start", "Actual Start")} InputLabelProps={{ shrink: true }} />} /></Box>
                  <Stack direction="row" useFlexGap gap={2} sx={{ width: { xs: "100%", sm: "auto" } }}>
                    <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 190 } }}><Controller name="tmActualEndTime" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.actual-end.input" fullWidth size="small" type="time" label={t("actual_end", "Actual End")} InputLabelProps={{ shrink: true }} />} /></Box>
                    <Box sx={{ width: { xs: "calc(50% - 8px)", sm: 220 } }}><Controller name="decRequestedHours" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.requested-hours.input" fullWidth size="small" type="number" label={t("calculated_hours", "Calculated Requested Hours")} InputProps={{ readOnly: true }} />} /></Box>
                  </Stack>
                  <Box sx={{ width: { xs: "100%", sm: 300 } }}><Controller name="intBackupEmployeeID" control={control} render={({ field }) => <TextField {...field} value={field.value ?? ""} data-control-id="work-on-holiday.ess.backup-resource.input" fullWidth size="small" type="number" label={t("backup_resource", "Backup Resource")} helperText={t("backup_resource_helper", "Enter an employee reference available within your company.")} />} /></Box>
                  <Box sx={{ width: { xs: "100%", sm: 180 } }}><Button data-control-id="work-on-holiday.ess.attachment.button" component="label" fullWidth variant="outlined" startIcon={<AttachFileRoundedIcon />} sx={{ height: 40 }}>{objAttachment?.name ?? t("attachment", "Attachment")}<input data-control-id="work-on-holiday.ess.attachment.input" hidden type="file" onChange={(objEvent) => setValue("objAttachment", objEvent.target.files?.[0] ?? null)} /></Button></Box>
                </Stack></Grid>
                <Grid item xs={12}><Controller name="strWorkReason" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.reason.input" fullWidth size="small" multiline minRows={2} label={t("reason", "Reason")} error={Boolean(errors.strWorkReason)} helperText={errors.strWorkReason?.message} />} /></Grid>
                <Grid item xs={12}><Controller name="strWorkDescription" control={control} render={({ field }) => <TextField {...field} data-control-id="work-on-holiday.ess.description.input" fullWidth size="small" multiline minRows={3} label={t("work_description", "Work Description")} />} /></Grid>
              </Grid>
              <Divider sx={{ my: 2 }} /><Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end" gap={1}><Button data-control-id="work-on-holiday.ess.clear.button" type="button" variant="outlined" startIcon={<ClearRoundedIcon />} disabled={blnSaving} onClick={clearRequestForm} sx={objSecondaryActionSx}>{t("clear", "Clear")}</Button><Button data-control-id="work-on-holiday.ess.save-draft.button" variant="outlined" disabled={blnSaving} onClick={handleSubmit((objValues) => saveAndSubmit(objValues, false))} sx={objSecondaryActionSx}>{t("save_draft", "Save Draft")}</Button><Button data-control-id="work-on-holiday.ess.submit.button" type="submit" variant="contained" disabled={blnSaving} sx={{ backgroundColor: "var(--app-primary-color)", "&:hover": { backgroundColor: "var(--app-primary-hover-color, #164d7c)" } }}>{blnSaving ? <CircularProgress size={20} color="inherit" /> : t("submit", "Submit")}</Button></Stack>
            </Box>
          </Box>
        </Paper>
      ) : null}
      {intTab === 1 ? <Box sx={{ position: "relative" }}>{blnLoading ? <CircularProgress aria-label={t("loading", "Loading")} /> : null}<CommonDataGrid columns={lstColumns} rows={lstRows} rowIdField="intID" showExportOptions exportFileName="work_on_holiday_my_requests" testIdPrefix="work-on-holiday-my" emptyMessage={t("empty_my_requests", "No requests found.")} /></Box> : null}
      {intTab === 2 ? <CommonDataGrid columns={[
        { field: "strPostingTypeCode", headerName: t("credit_type", "Credit Type") },
        { field: "decPostedDays", headerName: t("credited_days", "Credited Days") },
        { field: "strPostingStatus", headerName: t("posting_status", "Posting Status") },
      ]} rows={lstEarned.map((objPosting) => ({ intID: objPosting.intID, strPostingTypeCode: t(`posting_type_${objPosting.strPostingTypeCode.toLowerCase()}`, objPosting.strPostingTypeCode), decPostedDays: objPosting.decPostedDays ?? "—", strPostingStatus: t(`posting_${objPosting.strPostingStatus.toLowerCase()}`, objPosting.strPostingStatus) }))} rowIdField="intID" showExportOptions exportFileName="earned_comp_off" testIdPrefix="work-on-holiday-earned" emptyMessage={t("empty_earned", "No earned Comp-Off entries found.")} /> : null}
      <WorkHolidayDetailDrawer objDetail={objDetail} blnOpen={Boolean(objDetail)} blnLoading={blnDetailLoading} fnOnClose={() => setObjDetail(null)} fnOnRefresh={async () => { if (objDetail) await loadDetail(objDetail.intID); await reload(); }} fnOnConflict={(strMessage) => setStrError(`${t("concurrency_conflict", "This request changed. The latest record has been loaded.")} ${strMessage}`)} />
    </Stack>
  );
}
