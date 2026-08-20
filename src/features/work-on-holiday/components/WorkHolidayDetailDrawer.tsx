"use client";

import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, Grid, Stack, TextField, Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import { getWorkHolidayBusinessStatus } from "@/features/work-on-holiday/types/WorkHolidayTypes";
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
  /** Show the employee-facing business status (Draft, Pending Approval, ...) instead of the raw workflow code. */
  blnBusinessStatus?: boolean;
  fnOnClose: () => void;
  fnOnRefresh: () => Promise<void>;
  fnOnConflict: (strMessage: string) => void;
};
type WorkHolidayActionOption = {
  strCode: "approve" | "reject" | "send-back" | "verify" | "post" | "reverse";
  strLabel: string;
  strColor: "primary" | "error";
};

function formatLabel(strValue: string) {
  return strValue.replaceAll("_", " ").replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function formatDateTime(strValue?: string | null) {
  return strValue ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(strValue)) : "—";
}

export default function WorkHolidayDetailDrawer({
  objDetail, blnOpen, blnLoading = false, blnCanApprove = false, blnCanReject = false,
  blnCanSendBack = false, blnCanVerify = false, blnCanPost = false, blnCanReverse = false,
  blnActionMode = false, blnBusinessStatus = false, fnOnClose, fnOnRefresh, fnOnConflict,
}: WorkHolidayDetailDrawerProps) {
  const { t } = useModuleLabels("work_on_holiday");
  const [strAction, setStrAction] = useState<"approve" | "reject" | "send-back" | "verify" | "post" | "reverse" | null>(null);
  const [strReason, setStrReason] = useState("");
  const [strError, setStrError] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const lstAvailableActions = useMemo(() => {
    if (!objDetail) return [];
    const blnCanTakeApprovalDecision = objDetail.strRequestStatus === "PENDING_APPROVAL" && !objDetail.blnApprovalDecisionTaken;
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
  const objSectionSx = {
    border: 1,
    borderColor: "divider",
    borderRadius: 1.5,
    px: 1.75,
    py: 1.4,
    backgroundColor: "#fff",
  };
  return (
    <>
      <Dialog
        data-control-id="work-on-holiday.detail.dialog"
        open={blnOpen}
        onClose={fnOnClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            borderRadius: "10px",
            width: { xs: "calc(100vw - 24px)", lg: "min(1380px, calc(100vw - 36px))" },
            maxWidth: "calc(100vw - 24px)",
            maxHeight: "94vh",
          },
        }}
      >
        <DialogTitle sx={{ px: 3, py: 1.75, backgroundColor: "#fbfdff" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box><Typography variant="h6" fontWeight={850}>{t("detail_title", "Work on Holiday Request")}</Typography><Typography color="text.secondary">{objDetail?.strRequestNumber ?? "—"}</Typography></Box>
          <Button data-control-id="work-on-holiday.detail.close.button" onClick={fnOnClose} variant="outlined" size="small" sx={{ minWidth: 76 }}>{t("close", "Close")}</Button>
        </Stack>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: 3,
            py: 2,
            backgroundColor: "#f7fafc",
            maxHeight: "calc(94vh - 72px)",
            overflowY: "auto",
            scrollbarWidth: "thin",
            "&::-webkit-scrollbar": { width: 8 },
            "&::-webkit-scrollbar-thumb": { backgroundColor: "#9aabb9", borderRadius: 8 },
          }}
        >
        {blnLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress aria-label={t("loading", "Loading")} />
          </Box>
        ) : null}
        {objDetail && !blnLoading ? (
          <Stack spacing={1.5}>
            <Grid container spacing={1.5}>
              {[
                ["employee", objDetail.strEmployeeName ?? `${t("employee", "Employee")} ${objDetail.intEmployeeID}`],
                ["work_date", objDetail.dtWorkDate],
                ["day_type", t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)],
                ["requested_benefit", t(`outcome_${objDetail.strRequestedOutcomeCode.toLowerCase()}`, objDetail.strRequestedOutcomeCode)],
                ["status", blnBusinessStatus
                  ? getWorkHolidayBusinessStatus(objDetail, t)
                  : t(`status_${objDetail.strRequestStatus.toLowerCase()}`, objDetail.strRequestStatus)],
                ["current_approver", objDetail.strCurrentApproverName ?? (objDetail.intCurrentApproverUserID ? t("assigned_approver", "Assigned Approver") : "—")],
              ].map(([strKey, strValue]) => <Grid item xs={6} md={4} lg={2} key={strKey}><Box sx={objSectionSx}><Typography variant="caption" color="text.secondary">{t(strKey, formatLabel(strKey))}</Typography><Typography fontWeight={750}>{strValue}</Typography></Box></Grid>)}
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <Stack spacing={1.5}>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("planned_timing", "Planned Timing")}</Typography>
              <Typography>{t("planned_start", "Planned Start")}: {objDetail.tmPlannedStartTime?.slice(0, 5) ?? "—"} · {t("planned_end", "Planned End")}: {objDetail.tmPlannedEndTime?.slice(0, 5) ?? "—"}</Typography>
              <Typography>{t("calculated_requested_hours", "Calculated Requested Hours")}: {objDetail.decRequestedHours ?? "—"}</Typography>
            </Box>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("actual_timing_evidence", "Actual Timing & Evidence")}</Typography>
              <Typography>{t("actual_start", "Actual Start")}: {objDetail.objAttendanceSnapshot.tmFirstIn?.slice(0, 5) ?? "—"} · {t("actual_end", "Actual End")}: {objDetail.objAttendanceSnapshot.tmLastOut?.slice(0, 5) ?? "—"}</Typography>
              <Typography>{t("verified_worked_hours", "Verified Worked Hours")}: {objDetail.decVerifiedHours ?? objDetail.objAttendanceSnapshot.decWorkedHours ?? "—"}</Typography>
              <Typography>{t("attendance_verification", "Attendance Verification")}: {t(`verification_${objDetail.strAttendanceVerificationStatus.toLowerCase()}`, objDetail.strAttendanceVerificationStatus)}</Typography>
              {lstPunches.map((objPunch) => <Typography key={objPunch.intID} variant="caption" display="block">{t(`punch_${objPunch.strDirection.toLowerCase()}`, objPunch.strDirection)} · {formatDateTime(objPunch.dtPunchAt)}</Typography>)}
            </Box>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("comp_off_credit", "Comp-Off Credit")}</Typography>
              <Typography>{t("expected_credit", "Expected Credit")}: {objDetail.decRequestedCreditDays ?? "—"} · {t("final_credit", "Final Credit")}: {objDetail.decApprovedCreditDays ?? t("pending_verification", "Pending verification")}</Typography>
            </Box>
            <Box sx={objSectionSx}><Typography fontWeight={850}>{t("request_summary", "Request Summary")}</Typography><Typography>{objDetail.strWorkReason}</Typography><Typography color="text.secondary">{objDetail.strWorkDescription || t("not_available", "Not available")}</Typography></Box>
                </Stack>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Stack spacing={1.5}>
            <Alert severity="success" sx={{ borderRadius: 1.5 }}>
              {objDetail.objEligibilitySnapshot.strEligibilitySource === "HOLIDAY_MASTER"
                ? t("eligible_holiday_master", "Eligible date confirmed by Holiday Master.")
                : t("eligible_weekly_off", "Eligible date confirmed as a weekly off.")}
            </Alert>
            <Box sx={objSectionSx}><Typography fontWeight={850}>{t("holiday_information", "Holiday Information")}</Typography><Typography>{objDetail.objEligibilitySnapshot.strHolidayName ?? t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)}</Typography></Box>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("attachments", "Attachments")}</Typography>
              {(objDetail.lstAttachments ?? []).length
                ? (objDetail.lstAttachments ?? []).map((objAttachment) => <Typography key={objAttachment.intID} variant="body2">{objAttachment.strFileName} ({Math.max(1, Math.round(objAttachment.intFileSizeBytes / 1024))} KB)</Typography>)
                : <Typography color="text.secondary">{t("no_attachments", "No attachments provided.")}</Typography>}
            </Box>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("team_availability", "Team Availability")}</Typography>
              <Typography>{t("team_size", "Team Size")}: {objTeam?.intTeamSize ?? "—"} · {t("team_on_leave", "On Leave")}: {objTeam?.intApprovedLeaveCount ?? "—"}</Typography>
            </Box>
            <Box sx={objSectionSx}>
              <Typography fontWeight={850}>{t("approval_timeline", "Approval Route & Timeline")}</Typography>
              {(objDetail.lstTimeline ?? []).map((objAction) => <Box key={objAction.intID} sx={{ borderLeft: 3, borderColor: "primary.main", pl: 1.5, my: 1 }}><Chip size="small" label={t(`action_${objAction.strActionCode.toLowerCase()}`, objAction.strActionCode)} />{objAction.strActionByName ? <Typography variant="body2" fontWeight={650}>{objAction.strActionByName}</Typography> : null}<Typography variant="caption" display="block">{formatDateTime(objAction.dtActionOn)}{objAction.strRemarks ? ` · ${objAction.strRemarks}` : ""}</Typography></Box>)}
            </Box>
                </Stack>
              </Grid>
            </Grid>
            {objDetail.strPostingStatus === "POSTED" || objDetail.strPostingStatus === "REVERSED" ? <Alert data-control-id="work-on-holiday.detail.ledger-reference.alert" severity="info">{t("ledger_reference_safe", "Posting is linked to the request number shown above. Internal ledger identifiers are hidden.")}</Alert> : null}
            {blnActionMode ? (
              <Box data-control-id="work-on-holiday.detail.actions.panel" sx={{ ...objSectionSx, borderColor: "primary.light" }}>
                <Typography fontWeight={850} sx={{ mb: 1.25 }}>{t("request_actions", "Request Actions")}</Typography>
                {!strAction ? (
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {lstAvailableActions.length ? lstAvailableActions.map((objAction) => (
                      <Button key={objAction.strCode} data-control-id={`work-on-holiday.detail.action.${objAction.strCode}.select.button`} variant="contained" color={objAction.strColor} onClick={() => setStrAction(objAction.strCode)} sx={{ minWidth: 96 }}>
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
        </DialogContent>
      </Dialog>
    </>
  );
}
