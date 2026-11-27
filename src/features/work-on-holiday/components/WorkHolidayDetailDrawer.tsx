"use client";

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";
import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DottedLoader } from "@/components/shared/BlockingLoader";

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
  strColor: "primary" | "error" | "success";
  strVariant: "text" | "contained";
};

function statusChipSx(strRequestStatus: string, strPostingStatus?: string | null) {
  if (["POSTED", "REVERSED"].includes(strRequestStatus)) return { bgcolor: "#dcfce7", color: "#166534" };
  if (strRequestStatus === "REJECTED") return { bgcolor: "#fee2e2", color: "#991b1b" };
  if (["WITHDRAWN", "DRAFT"].includes(strRequestStatus)) return { bgcolor: "#e5e7eb", color: "#374151" };
  if (strRequestStatus === "VERIFIED" && strPostingStatus !== "PROCESSING") return { bgcolor: "#dcfce7", color: "#166534" };
  return { bgcolor: "#fef3c7", color: "#92400e" };
}

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
      blnCanSendBack && blnCanTakeApprovalDecision ? { strCode: "send-back" as const, strLabel: t("send_back", "Send Back"), strColor: "primary" as const, strVariant: "text" as const } : null,
      blnCanReject && blnCanTakeApprovalDecision ? { strCode: "reject" as const, strLabel: t("reject", "Reject"), strColor: "error" as const, strVariant: "text" as const } : null,
      blnCanReverse && objDetail.strPostingStatus === "POSTED" ? { strCode: "reverse" as const, strLabel: t("reverse_posting", "Reverse Posting"), strColor: "error" as const, strVariant: "text" as const } : null,
      blnCanVerify && ["APPROVED", "PENDING_ATTENDANCE_VERIFICATION"].includes(objDetail.strRequestStatus) ? { strCode: "verify" as const, strLabel: t("verify_attendance", "Verify Attendance"), strColor: "success" as const, strVariant: "contained" as const } : null,
      blnCanPost && ["READY", "FAILED", "PARTIAL"].includes(objDetail.strPostingStatus) ? { strCode: "post" as const, strLabel: t("post_credit", "Post Credit"), strColor: "success" as const, strVariant: "contained" as const } : null,
      blnCanApprove && blnCanTakeApprovalDecision ? { strCode: "approve" as const, strLabel: t("approve", "Approve"), strColor: "success" as const, strVariant: "contained" as const } : null,
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

  const strStatusLabel = objDetail ? (blnBusinessStatus ? getWorkHolidayBusinessStatus(objDetail, t) : t(`status_${objDetail.strRequestStatus.toLowerCase()}`, objDetail.strRequestStatus)) : "";
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
  const objCardSx = { border: "1px solid #dbe5f1", borderRadius: "8px", overflow: "hidden", backgroundColor: "#fff" } as const;
  const objCardHeaderSx = { display: "flex", alignItems: "center", gap: 1, px: 1.5, py: 0.9, backgroundColor: "#eaf1fb", color: "#0f2f55" } as const;
  const objFieldSx = { display: "flex", alignItems: "center", gap: 1, border: "1px solid #dbe5f1", borderRadius: "8px", px: 1.25, py: 0.9, backgroundColor: "#fff", minWidth: 0, flex: 1 } as const;
  const objIconSx = { fontSize: 20, color: "#1d5d96" } as const;

  function DetailCard({ strTitle, nodeIcon, children }: { strTitle: string; nodeIcon?: ReactNode; children: ReactNode }) {
    return (
      <Box sx={objCardSx}>
        <Box sx={objCardHeaderSx}>{nodeIcon}<Typography fontWeight={800} fontSize="0.9rem">{strTitle}</Typography></Box>
        <Box sx={{ p: 1.25 }}>{children}</Box>
      </Box>
    );
  }

  function DetailField({ strLabel, nodeValue, nodeIcon }: { strLabel: string; nodeValue: ReactNode; nodeIcon: ReactNode }) {
    return (
      <Box sx={objFieldSx}>
        {nodeIcon}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>{strLabel}</Typography>
          <Typography fontWeight={750} fontSize="0.9rem" noWrap>{nodeValue}</Typography>
        </Box>
      </Box>
    );
  }

  function timelineDotColor(strCode: string) {
    if (["REJECT", "WITHDRAW", "POSTING_FAILED"].includes(strCode)) return "#ef4444";
    return "#2563eb";
  }

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
          <Box><Typography variant="h6" fontWeight={850} color="#0f2f55">{t("detail_title", "Work on Holiday Request")}</Typography><Typography color="text.secondary">{objDetail?.strRequestNumber ?? "—"}</Typography></Box>
          <Button data-control-id="work-on-holiday.detail.close.button" onClick={fnOnClose} variant="outlined" size="small" startIcon={<CloseRoundedIcon />} sx={{ minWidth: 76 }}>{t("close", "Close")}</Button>
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
            <DottedLoader aria-label={t("loading", "Loading")} />
          </Box>
        ) : null}
        {objDetail && !blnLoading ? (
          <Stack spacing={1.5}>
            <Box sx={{ ...objCardSx, px: 1.5, py: 1.25 }}>
              <Grid container spacing={1.5}>
                {([
                  ["employee", objDetail.strEmployeeName ?? `${t("employee", "Employee")} ${objDetail.intEmployeeID}`, <PersonOutlineRoundedIcon key="i" sx={objIconSx} />],
                  ["work_date", objDetail.dtWorkDate, <EventAvailableRoundedIcon key="i" sx={objIconSx} />],
                  ["day_type", t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode), <EventAvailableRoundedIcon key="i" sx={objIconSx} />],
                  ["requested_benefit", t(`outcome_${objDetail.strRequestedOutcomeCode.toLowerCase()}`, objDetail.strRequestedOutcomeCode), <SavingsOutlinedIcon key="i" sx={objIconSx} />],
                  ["status", <Chip key="s" size="small" label={strStatusLabel} sx={{ fontWeight: 700, height: 22, ...statusChipSx(objDetail.strRequestStatus, objDetail.strPostingStatus) }} />, <InfoOutlinedIcon key="i" sx={objIconSx} />],
                  ["current_approver", objDetail.strCurrentApproverName ?? (objDetail.intCurrentApproverUserID ? t("assigned_approver", "Assigned Approver") : "—"), <PersonOutlineRoundedIcon key="i" sx={objIconSx} />],
                ] as [string, ReactNode, ReactNode][]).map(([strKey, nodeValue, nodeIcon]) => (
                  <Grid item xs={6} md={4} lg={2} key={strKey}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                      {nodeIcon}
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2}>{t(strKey, formatLabel(strKey))}</Typography>
                        <Typography component="div" fontWeight={750} fontSize="0.9rem" noWrap>{nodeValue}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} lg={6}>
                <Stack spacing={1.5}>
                  <DetailCard strTitle={t("planned_timing", "Planned Timing")}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <DetailField strLabel={t("planned_start_time", "Planned Start Time")} nodeValue={objDetail.tmPlannedStartTime?.slice(0, 5) ?? "—"} nodeIcon={<AccessTimeRoundedIcon sx={objIconSx} />} />
                      <DetailField strLabel={t("planned_end_time", "Planned End Time")} nodeValue={objDetail.tmPlannedEndTime?.slice(0, 5) ?? "—"} nodeIcon={<AccessTimeRoundedIcon sx={objIconSx} />} />
                      <DetailField strLabel={t("calculated_requested_hours", "Calculated Requested Hours")} nodeValue={objDetail.decRequestedHours ?? "—"} nodeIcon={<CalculateOutlinedIcon sx={objIconSx} />} />
                    </Stack>
                  </DetailCard>
                  <DetailCard strTitle={t("actual_timing_evidence", "Actual Timing & Evidence")}>
                    <Stack spacing={1}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <DetailField strLabel={t("actual_start_time", "Actual Start Time")} nodeValue={objDetail.objAttendanceSnapshot.tmFirstIn?.slice(0, 5) ?? "—"} nodeIcon={<AccessTimeRoundedIcon sx={objIconSx} />} />
                        <DetailField strLabel={t("actual_end_time", "Actual End Time")} nodeValue={objDetail.objAttendanceSnapshot.tmLastOut?.slice(0, 5) ?? "—"} nodeIcon={<AccessTimeRoundedIcon sx={objIconSx} />} />
                        <DetailField strLabel={t("verified_worked_hours", "Verified Worked Hours")} nodeValue={objDetail.decVerifiedHours ?? objDetail.objAttendanceSnapshot.decWorkedHours ?? "—"} nodeIcon={<CalculateOutlinedIcon sx={objIconSx} />} />
                      </Stack>
                      <DetailField strLabel={t("attendance_verification", "Attendance Verification")} nodeValue={t(`verification_${objDetail.strAttendanceVerificationStatus.toLowerCase()}`, objDetail.strAttendanceVerificationStatus)} nodeIcon={<DescriptionOutlinedIcon sx={objIconSx} />} />
                      {lstPunches.map((objPunch) => <Typography key={objPunch.intID} variant="caption" display="block">{t(`punch_${objPunch.strDirection.toLowerCase()}`, objPunch.strDirection)} · {formatDateTime(objPunch.dtPunchAt)}</Typography>)}
                    </Stack>
                  </DetailCard>
                  <DetailCard strTitle={t("comp_off_credit", "Comp-Off Credit")}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <DetailField strLabel={t("expected_credit", "Expected Credit")} nodeValue={objDetail.decRequestedCreditDays ?? "—"} nodeIcon={<SavingsOutlinedIcon sx={objIconSx} />} />
                      <DetailField strLabel={t("final_credit", "Final Credit")} nodeValue={objDetail.decApprovedCreditDays ?? t("pending_verification", "Pending verification")} nodeIcon={<SavingsOutlinedIcon sx={objIconSx} />} />
                    </Stack>
                  </DetailCard>
                  <DetailCard strTitle={t("request_summary", "Request Summary")}>
                    <Stack spacing={1}>
                      <DetailField strLabel={t("reason", "Reason")} nodeValue={objDetail.strWorkReason} nodeIcon={<DescriptionOutlinedIcon sx={objIconSx} />} />
                      <DetailField strLabel={t("work_description", "Work Description")} nodeValue={objDetail.strWorkDescription || t("not_available", "Not available")} nodeIcon={<DescriptionOutlinedIcon sx={objIconSx} />} />
                    </Stack>
                  </DetailCard>
                </Stack>
              </Grid>
              <Grid item xs={12} lg={6}>
                <Stack spacing={1.5}>
                  <Alert severity="success" sx={{ borderRadius: 1.5 }}>
                    {objDetail.objEligibilitySnapshot.strEligibilitySource === "HOLIDAY_MASTER"
                      ? t("eligible_holiday_master", "Eligible date confirmed by Holiday Master.")
                      : t("eligible_weekly_off", "Eligible date confirmed as a weekly off.")}
                  </Alert>
                  <DetailCard strTitle={t("holiday_information", "Holiday Information")}>
                    <Typography>{objDetail.objEligibilitySnapshot.strHolidayName ?? t(`day_type_${objDetail.strDayTypeCode.toLowerCase()}`, objDetail.strDayTypeCode)}</Typography>
                  </DetailCard>
                  <DetailCard strTitle={t("attachments", "Attachments")} nodeIcon={<AttachFileRoundedIcon sx={objIconSx} />}>
                    {(objDetail.lstAttachments ?? []).length
                      ? (objDetail.lstAttachments ?? []).map((objAttachment) => <Typography key={objAttachment.intID} variant="body2">{objAttachment.strFileName} ({Math.max(1, Math.round(objAttachment.intFileSizeBytes / 1024))} KB)</Typography>)
                      : <Typography color="text.secondary">{t("no_attachments", "No attachments provided.")}</Typography>}
                  </DetailCard>
                  <DetailCard strTitle={t("team_availability", "Team Availability")} nodeIcon={<GroupsOutlinedIcon sx={objIconSx} />}>
                    <Stack direction="row" spacing={2} justifyContent="center" divider={<Box sx={{ width: "1px", bgcolor: "divider" }} />}>
                      <Typography>{t("team_size", "Team Size")}: <b>{objTeam?.intTeamSize ?? "—"}</b></Typography>
                      <Typography>{t("team_on_leave", "On Leave")}: <b>{objTeam?.intApprovedLeaveCount ?? "—"}</b></Typography>
                    </Stack>
                  </DetailCard>
                  <DetailCard strTitle={t("approval_timeline", "Approval Route & Timeline")} nodeIcon={<AccountTreeOutlinedIcon sx={objIconSx} />}>
                    {(objDetail.lstTimeline ?? []).map((objAction, intIndex, lstAll) => (
                      <Box key={objAction.intID} sx={{ display: "flex", gap: 1.5, position: "relative", pb: intIndex === lstAll.length - 1 ? 0 : 1.75 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12, pt: 0.6 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: timelineDotColor(objAction.strActionCode), flexShrink: 0 }} />
                          {intIndex === lstAll.length - 1 ? null : <Box sx={{ flex: 1, width: "2px", bgcolor: "#c7d6ea", mt: 0.5 }} />}
                        </Box>
                        <Box sx={{ flex: "0 0 130px" }}><Chip size="small" label={t(`action_${objAction.strActionCode.toLowerCase()}`, objAction.strActionCode)} /></Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          {objAction.strActionByName ? <Typography variant="body2" fontWeight={650}>{objAction.strActionByName}</Typography> : null}
                          <Typography variant="caption" color="text.secondary" display="block">{formatDateTime(objAction.dtActionOn)}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ flex: "0 0 30%", minWidth: 0, wordBreak: "break-word" }}>{objAction.strRemarks || "—"}</Typography>
                      </Box>
                    ))}
                  </DetailCard>
                </Stack>
              </Grid>
            </Grid>
            {objDetail.strPostingStatus === "POSTED" || objDetail.strPostingStatus === "REVERSED" ? <Alert data-control-id="work-on-holiday.detail.ledger-reference.alert" severity="info">{t("ledger_reference_safe", "Posting is linked to the request number shown above. Internal ledger identifiers are hidden.")}</Alert> : null}
            {blnActionMode ? (
              <Box
                data-control-id="work-on-holiday.detail.actions.panel"
                sx={{
                  ...objSectionSx,
                  borderColor: "primary.light",
                  position: "sticky",
                  bottom: 0,
                  mb: -2,
                  zIndex: 2,
                  backgroundColor: "#fff",
                  boxShadow: "0 -4px 10px rgba(15, 23, 42, 0.08)",
                }}
              >
                <Typography fontWeight={850} sx={{ mb: 1.25 }}>{t("request_actions", "Request Actions")}</Typography>
                {!strAction ? (
                  <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
                    <Button data-control-id="work-on-holiday.detail.actions.close.button" onClick={fnOnClose}>{t("close", "Close")}</Button>
                    {lstAvailableActions.length ? lstAvailableActions.map((objAction) => (
                      <Button key={objAction.strCode} data-control-id={`work-on-holiday.detail.action.${objAction.strCode}.select.button`} variant={objAction.strVariant} color={objAction.strColor} onClick={() => setStrAction(objAction.strCode)} sx={{ minWidth: 96 }}>
                        {objAction.strLabel}
                      </Button>
                    )) : null}
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
