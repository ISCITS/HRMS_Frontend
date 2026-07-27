"use client";

import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, Grid, Stack, TextField, Typography,
} from "@mui/material";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import type { WorkHolidayRequest } from "@/features/work-on-holiday/types/WorkHolidayTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

type WorkHolidayDetailDrawerProps = {
  objDetail: WorkHolidayRequest | null;
  blnOpen: boolean;
  blnLoading?: boolean;
  blnCanApprove?: boolean;
  blnCanReject?: boolean;
  blnCanSendBack?: boolean;
  blnCanVerify?: boolean;
  blnCanPost?: boolean;
  blnCanReverse?: boolean;
  fnOnClose: () => void;
  fnOnRefresh: () => Promise<void>;
  fnOnConflict: (strMessage: string) => void;
};

function formatDateTime(strValue?: string | null) {
  return strValue ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(strValue)) : "—";
}

export default function WorkHolidayDetailDrawer({
  objDetail, blnOpen, blnLoading = false, blnCanApprove = false, blnCanReject = false,
  blnCanSendBack = false, blnCanVerify = false, blnCanPost = false, blnCanReverse = false,
  fnOnClose, fnOnRefresh, fnOnConflict,
}: WorkHolidayDetailDrawerProps) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("work_on_holiday");
  const [strAction, setStrAction] = useState<"approve" | "reject" | "send-back" | "verify" | "post" | "reverse" | null>(null);
  const [strReason, setStrReason] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);

  async function runAction() {
    if (!objDetail || !strAction) return;
    if (["reject", "send-back", "reverse"].includes(strAction) && strReason.trim().length < 3) {
      setStrError(t("validation_reason_required", "A reason is required."));
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const objPayload = {
        intRowVersion: objDetail.intRowVersion,
        strIdempotencyKey: crypto.randomUUID(),
        strRemarks: strReason.trim() || null,
      };
      if (strAction === "approve" || strAction === "reject" || strAction === "send-back") {
        await workHolidayService.decide(objDetail.intID, strAction, objPayload);
      } else if (strAction === "verify") {
        await workHolidayService.verifyAttendance(objDetail.intID, {
          ...objPayload, decVerifiedHours: objDetail.objAttendanceSnapshot.decWorkedHours ?? 0, blnVerified: true,
        });
      } else if (strAction === "post") {
        await workHolidayService.postCredit(objDetail.intID, {
          ...objPayload, blnAttendanceCredit: true, blnCompOffCredit: true,
        });
      } else {
        await workHolidayService.reverse(objDetail.intID, objPayload);
      }
      setStrAction(null);
      setStrReason("");
      await fnOnRefresh();
    } catch (objError) {
      const strMessage = objError instanceof Error ? objError.message : t("error_action", "Unable to complete action.");
      if (strMessage.toLowerCase().includes("modified") || strMessage.toLowerCase().includes("reload")) {
        fnOnConflict(strMessage);
        await fnOnRefresh();
        setStrAction(null);
      } else {
        setStrError(strMessage);
      }
    } finally {
      setBlnSaving(false);
    }
  }

  const objTeam = objDetail?.objEligibilitySnapshot.objTeamAvailability;
  const lstPunches = objDetail?.objAttendanceSnapshot.lstPunches ?? [];
  return (
    <>
      <Drawer
        data-control-id="work-on-holiday.detail.drawer"
        anchor="right"
        open={blnOpen}
        onClose={fnOnClose}
        PaperProps={{ sx: { width: { xs: "100%", sm: 580 }, p: 2 } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box><Typography variant="h6" fontWeight={850}>{t("detail_title", "Work on Holiday Request")}</Typography><Typography color="text.secondary">{objDetail?.strRequestNumber ?? "—"}</Typography></Box>
          <Button data-control-id="work-on-holiday.detail.close.button" onClick={fnOnClose}>{t("close", "Close")}</Button>
        </Stack>
        <Divider sx={{ my: 2 }} />
        {blnLoading ? <CircularProgress aria-label={t("loading", "Loading")} /> : null}
        {objDetail ? (
          <Stack spacing={2}>
            <Grid container spacing={1.5}>
              {[
                ["work_date", objDetail.dtWorkDate],
                ["day_type", t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)],
                ["outcome", t(`outcome_${objDetail.strRequestedOutcomeCode.toLowerCase()}`, objDetail.strRequestedOutcomeCode)],
                ["status", t(`status_${objDetail.strRequestStatus.toLowerCase()}`, objDetail.strRequestStatus)],
                ["attendance_verification", t(`verification_${objDetail.strAttendanceVerificationStatus.toLowerCase()}`, objDetail.strAttendanceVerificationStatus)],
                ["posting_status", t(`posting_${objDetail.strPostingStatus.toLowerCase()}`, objDetail.strPostingStatus)],
              ].map(([strKey, strValue]) => <Grid item xs={6} key={strKey}><Typography variant="caption" color="text.secondary">{t(strKey, strKey.replaceAll("_", " "))}</Typography><Typography fontWeight={750}>{strValue}</Typography></Grid>)}
            </Grid>
            <Box><Typography fontWeight={850}>{t("request_summary", "Request Summary")}</Typography><Typography>{objDetail.strWorkReason}</Typography><Typography color="text.secondary">{objDetail.strWorkDescription || t("not_available", "Not available")}</Typography></Box>
            <Box><Typography fontWeight={850}>{t("holiday_information", "Holiday Information")}</Typography><Typography>{objDetail.objEligibilitySnapshot.strHolidayName ?? t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)}</Typography></Box>
            <Box>
              <Typography fontWeight={850}>{t("attendance_evidence", "Attendance Evidence")}</Typography>
              <Typography>{t("attendance_status", "Attendance Status")}: {t(`attendance_${(objDetail.objAttendanceSnapshot.strStatus ?? "not_recorded").toLowerCase()}`, objDetail.objAttendanceSnapshot.strStatus ?? "Not recorded")}</Typography>
              <Typography>{t("worked_hours", "Worked Hours")}: {objDetail.objAttendanceSnapshot.decWorkedHours ?? "—"}</Typography>
              <Typography>{t("first_in", "First In")}: {objDetail.objAttendanceSnapshot.tmFirstIn ?? "—"} · {t("last_out", "Last Out")}: {objDetail.objAttendanceSnapshot.tmLastOut ?? "—"}</Typography>
              {lstPunches.map((objPunch) => <Typography key={objPunch.intID} variant="caption" display="block">{t(`punch_${objPunch.strDirection.toLowerCase()}`, objPunch.strDirection)} · {formatDateTime(objPunch.dtPunchAt)}</Typography>)}
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={850}>{t("team_availability", "Team Availability")}</Typography>
                {objDetail.strTeamCalendarPath ? <Button data-control-id="work-on-holiday.detail.team-calendar.button" startIcon={<CalendarMonthRoundedIcon />} onClick={() => objRouter.push(objDetail.strTeamCalendarPath!)}>{t("team_calendar", "Team Calendar")}</Button> : null}
              </Stack>
              <Typography>{t("team_size", "Team Size")}: {objTeam?.intTeamSize ?? "—"} · {t("team_on_leave", "On Leave")}: {objTeam?.intApprovedLeaveCount ?? "—"}</Typography>
            </Box>
            <Box>
              <Typography fontWeight={850}>{t("approval_timeline", "Approval Route & Timeline")}</Typography>
              {(objDetail.lstTimeline ?? []).map((objAction) => <Box key={objAction.intID} sx={{ borderLeft: 3, borderColor: "primary.main", pl: 1.5, my: 1 }}><Chip size="small" label={t(`action_${objAction.strActionCode.toLowerCase()}`, objAction.strActionCode)} /><Typography variant="caption" display="block">{formatDateTime(objAction.dtActionOn)}{objAction.strRemarks ? ` · ${objAction.strRemarks}` : ""}</Typography></Box>)}
            </Box>
            {objDetail.strPostingStatus === "POSTED" || objDetail.strPostingStatus === "REVERSED" ? <Alert data-control-id="work-on-holiday.detail.ledger-reference.alert" severity="info">{t("ledger_reference_safe", "Posting is linked to the request number shown above. Internal ledger identifiers are hidden.")}</Alert> : null}
            <Stack direction="row" gap={1} flexWrap="wrap">
              {blnCanApprove && objDetail.strRequestStatus === "PENDING_APPROVAL" ? <Button data-control-id="work-on-holiday.detail.approve.button" variant="contained" onClick={() => setStrAction("approve")}>{t("approve", "Approve")}</Button> : null}
              {blnCanReject && objDetail.strRequestStatus === "PENDING_APPROVAL" ? <Button data-control-id="work-on-holiday.detail.reject.button" color="error" onClick={() => setStrAction("reject")}>{t("reject", "Reject")}</Button> : null}
              {blnCanSendBack && objDetail.strRequestStatus === "PENDING_APPROVAL" ? <Button data-control-id="work-on-holiday.detail.send-back.button" onClick={() => setStrAction("send-back")}>{t("send_back", "Send Back")}</Button> : null}
              {blnCanVerify && ["APPROVED", "PENDING_ATTENDANCE_VERIFICATION"].includes(objDetail.strRequestStatus) ? <Button data-control-id="work-on-holiday.detail.verify.button" variant="contained" onClick={() => setStrAction("verify")}>{t("verify_attendance", "Verify Attendance")}</Button> : null}
              {blnCanPost && ["READY", "FAILED", "PARTIAL"].includes(objDetail.strPostingStatus) ? <Button data-control-id="work-on-holiday.detail.post.button" variant="contained" onClick={() => setStrAction("post")}>{t("post_credit", "Post Credit")}</Button> : null}
              {blnCanReverse && objDetail.strPostingStatus === "POSTED" ? <Button data-control-id="work-on-holiday.detail.reverse.button" color="error" onClick={() => setStrAction("reverse")}>{t("reverse_posting", "Reverse Posting")}</Button> : null}
            </Stack>
          </Stack>
        ) : null}
      </Drawer>
      <Dialog data-control-id="work-on-holiday.action.dialog" open={Boolean(strAction)} onClose={() => !blnSaving && setStrAction(null)} fullWidth maxWidth="sm">
        <DialogTitle>{t(`confirm_${strAction ?? "action"}`, "Confirm Action")}</DialogTitle>
        <DialogContent><Typography sx={{ mb: 2 }}>{t("confirm_action_message", "Review the request before confirming this action.")}</Typography><TextField data-control-id="work-on-holiday.action.reason.input" fullWidth multiline minRows={3} label={t("reason_remarks", "Reason / Remarks")} value={strReason} onChange={(objEvent) => setStrReason(objEvent.target.value)} required={Boolean(strAction && ["reject", "send-back", "reverse"].includes(strAction))} />{strError ? <Alert data-control-id="work-on-holiday.action.error.alert" severity="error" sx={{ mt: 2 }}>{strError}</Alert> : null}</DialogContent>
        <DialogActions><Button data-control-id="work-on-holiday.action.cancel.button" onClick={() => setStrAction(null)} disabled={blnSaving}>{t("cancel", "Cancel")}</Button><Button data-control-id="work-on-holiday.action.confirm.button" variant="contained" color={strAction === "reverse" || strAction === "reject" ? "error" : "primary"} onClick={() => void runAction()} disabled={blnSaving}>{t("confirm", "Confirm")}</Button></DialogActions>
      </Dialog>
    </>
  );
}
