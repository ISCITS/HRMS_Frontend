"use client";

import {
  Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, Grid, Stack, TextField, Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

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
  blnActionMode?: boolean;
  fnOnClose: () => void;
  fnOnRefresh: () => Promise<void>;
  fnOnConflict: (strMessage: string) => void;
};
type WorkHolidayActionOption = {
  strCode: "approve" | "reject" | "send-back" | "verify" | "post" | "reverse";
  strLabel: string;
  strColor: "primary" | "error";
};

function hasApprovalDecision(objDetail: WorkHolidayRequest) {
  return (objDetail.lstTimeline ?? []).some((objAction) =>
    ["APPROVE", "REJECT", "SEND_BACK"].includes(objAction.strActionCode.toUpperCase()),
  );
}

function formatDateTime(strValue?: string | null) {
  return strValue ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(strValue)) : "—";
}

export default function WorkHolidayDetailDrawer({
  objDetail, blnOpen, blnLoading = false, blnCanApprove = false, blnCanReject = false,
  blnCanSendBack = false, blnCanVerify = false, blnCanPost = false, blnCanReverse = false,
  blnActionMode = false, fnOnClose, fnOnRefresh, fnOnConflict,
}: WorkHolidayDetailDrawerProps) {
  const { t } = useModuleLabels("work_on_holiday");
  const [strAction, setStrAction] = useState<"approve" | "reject" | "send-back" | "verify" | "post" | "reverse" | null>(null);
  const [strReason, setStrReason] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const lstAvailableActions = useMemo(() => {
    if (!objDetail) return [];
    const blnCanTakeApprovalDecision = objDetail.strRequestStatus === "PENDING_APPROVAL" && !hasApprovalDecision(objDetail);
    const lstOptions: (WorkHolidayActionOption | null)[] = [
      blnCanApprove && blnCanTakeApprovalDecision ? { strCode: "approve" as const, strLabel: t("approve", "Approve"), strColor: "primary" as const } : null,
      blnCanReject && blnCanTakeApprovalDecision ? { strCode: "reject" as const, strLabel: t("reject", "Reject"), strColor: "error" as const } : null,
      blnCanSendBack && blnCanTakeApprovalDecision ? { strCode: "send-back" as const, strLabel: t("send_back", "Send Back"), strColor: "primary" as const } : null,
      blnCanVerify && ["APPROVED", "PENDING_ATTENDANCE_VERIFICATION"].includes(objDetail.strRequestStatus) ? { strCode: "verify" as const, strLabel: t("verify_attendance", "Verify Attendance"), strColor: "primary" as const } : null,
      blnCanPost && ["READY", "FAILED", "PARTIAL"].includes(objDetail.strPostingStatus) ? { strCode: "post" as const, strLabel: t("post_credit", "Post Credit"), strColor: "primary" as const } : null,
      blnCanReverse && objDetail.strPostingStatus === "POSTED" ? { strCode: "reverse" as const, strLabel: t("reverse_posting", "Reverse Posting"), strColor: "error" as const } : null,
    ];
    return lstOptions.filter((objAction): objAction is WorkHolidayActionOption => Boolean(objAction));
  }, [blnCanApprove, blnCanPost, blnCanReject, blnCanReverse, blnCanSendBack, blnCanVerify, objDetail, t]);

  useEffect(() => {
    setStrAction(null);
    setStrReason("");
    setStrError("");
  }, [blnActionMode, objDetail?.intID]);

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
            <Alert severity="success">
              {objDetail.objEligibilitySnapshot.strEligibilitySource === "HOLIDAY_MASTER"
                ? t("eligible_holiday_master", "Eligible date confirmed by Holiday Master.")
                : t("eligible_weekly_off", "Eligible date confirmed as a weekly off.")}
            </Alert>
            <Box><Typography fontWeight={850}>{t("holiday_information", "Holiday Information")}</Typography><Typography>{objDetail.objEligibilitySnapshot.strHolidayName ?? t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)}</Typography></Box>
            <Box>
              <Typography fontWeight={850}>{t("attendance_evidence", "Attendance Evidence")}</Typography>
              <Typography>{t("attendance_status", "Attendance Status")}: {t(`attendance_${(objDetail.objAttendanceSnapshot.strStatus ?? "not_recorded").toLowerCase()}`, objDetail.objAttendanceSnapshot.strStatus ?? "Not recorded")}</Typography>
              <Typography>{t("worked_hours", "Worked Hours")}: {objDetail.objAttendanceSnapshot.decWorkedHours ?? "—"}</Typography>
              <Typography>{t("first_in", "First In")}: {objDetail.objAttendanceSnapshot.tmFirstIn ?? "—"} · {t("last_out", "Last Out")}: {objDetail.objAttendanceSnapshot.tmLastOut ?? "—"}</Typography>
              {lstPunches.map((objPunch) => <Typography key={objPunch.intID} variant="caption" display="block">{t(`punch_${objPunch.strDirection.toLowerCase()}`, objPunch.strDirection)} · {formatDateTime(objPunch.dtPunchAt)}</Typography>)}
            </Box>
            <Box>
              <Typography fontWeight={850}>{t("team_availability", "Team Availability")}</Typography>
              <Typography>{t("team_size", "Team Size")}: {objTeam?.intTeamSize ?? "—"} · {t("team_on_leave", "On Leave")}: {objTeam?.intApprovedLeaveCount ?? "—"}</Typography>
            </Box>
            <Box>
              <Typography fontWeight={850}>{t("approval_timeline", "Approval Route & Timeline")}</Typography>
              {(objDetail.lstTimeline ?? []).map((objAction) => <Box key={objAction.intID} sx={{ borderLeft: 3, borderColor: "primary.main", pl: 1.5, my: 1 }}><Chip size="small" label={t(`action_${objAction.strActionCode.toLowerCase()}`, objAction.strActionCode)} /><Typography variant="caption" display="block">{formatDateTime(objAction.dtActionOn)}{objAction.strRemarks ? ` · ${objAction.strRemarks}` : ""}</Typography></Box>)}
            </Box>
            {objDetail.strPostingStatus === "POSTED" || objDetail.strPostingStatus === "REVERSED" ? <Alert data-control-id="work-on-holiday.detail.ledger-reference.alert" severity="info">{t("ledger_reference_safe", "Posting is linked to the request number shown above. Internal ledger identifiers are hidden.")}</Alert> : null}
            {blnActionMode ? (
              <Box data-control-id="work-on-holiday.detail.actions.panel" sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                <Typography fontWeight={850} sx={{ mb: 1.5 }}>{t("request_actions", "Request Actions")}</Typography>
                {!strAction ? (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {lstAvailableActions.length ? lstAvailableActions.map((objAction) => (
                      <Button key={objAction.strCode} data-control-id={`work-on-holiday.detail.action.${objAction.strCode}.select.button`} variant="contained" color={objAction.strColor} onClick={() => setStrAction(objAction.strCode)}>
                        {objAction.strLabel}
                      </Button>
                    )) : <Alert severity="info">{t("no_actions_available", "No actions are available for this request.")}</Alert>}
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    <Typography>{t("confirm_action_message", "Review the request before confirming this action.")}</Typography>
                    <TextField data-control-id="work-on-holiday.detail.action.reason.input" fullWidth multiline minRows={3} label={t("reason_remarks", "Reason / Remarks")} value={strReason} onChange={(objEvent) => setStrReason(objEvent.target.value)} required={["reject", "send-back", "reverse"].includes(strAction)} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button data-control-id="work-on-holiday.detail.action.back.button" onClick={() => setStrAction(null)} disabled={blnSaving}>{t("back", "Back")}</Button>
                      <Button data-control-id="work-on-holiday.detail.action.confirm.button" variant="contained" color={strAction === "reverse" || strAction === "reject" ? "error" : "primary"} onClick={() => void runAction()} disabled={blnSaving}>{t("confirm", "Confirm")}</Button>
                    </Stack>
                  </Stack>
                )}
                {strError ? <Alert data-control-id="work-on-holiday.detail.action.error.alert" severity="error" sx={{ mt: 2 }}>{strError}</Alert> : null}
              </Box>
            ) : null}
          </Stack>
        ) : null}
      </Drawer>
    </>
  );
}
