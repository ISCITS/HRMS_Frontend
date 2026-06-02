"use client";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Button, Stack } from "@mui/material";

import { canLockReimbursementClaim, canPushReimbursementClaim, canStartReimbursementReview, isHrReimbursementTerminal } from "@/features/reimbursements/hrRules";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";

type ActionBarProps = {
  objClaim: ReimbursementClaimDto;
  blnBusy: boolean;
  blnCanStart?: boolean;
  blnCanApprove?: boolean;
  blnCanReject?: boolean;
  blnCanRelease?: boolean;
  blnCanLock?: boolean;
  blnCanPush?: boolean;
  onAction: (strAction: "start" | "approve" | "reject" | "release" | "lock" | "push") => void;
};

export default function ReimbursementActionBar({
  objClaim,
  blnBusy,
  blnCanStart = false,
  blnCanApprove = false,
  blnCanReject = false,
  blnCanRelease = false,
  blnCanLock = false,
  blnCanPush = false,
  onAction,
}: ActionBarProps) {
  const blnTerminal = isHrReimbursementTerminal(objClaim.strClaimStatus);

  return (
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
      {blnCanStart ? <Button size="small" variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={blnBusy || !canStartReimbursementReview(objClaim.strClaimStatus)} onClick={() => onAction("start")} data-testid="reimbursements.review.start.button" sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Start Review</Button> : null}
      {blnCanApprove ? <Button size="small" variant="outlined" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("approve")} data-testid="reimbursements.review.approve-claim.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Approve Claim</Button> : null}
      {blnCanReject ? <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("reject")} data-testid="reimbursements.review.reject-claim.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Reject</Button> : null}
      {blnCanRelease ? <Button size="small" variant="outlined" startIcon={<ReplyRoundedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("release")} data-testid="reimbursements.review.release-claim.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Release</Button> : null}
      {blnCanLock ? <Button size="small" variant="outlined" startIcon={<LockRoundedIcon />} disabled={blnBusy || !canLockReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("lock")} data-testid="reimbursements.review.lock-claim.button" sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Lock</Button> : null}
      {blnCanPush ? <Button size="small" variant="contained" color="success" startIcon={<PublishRoundedIcon />} disabled={blnBusy || !canPushReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("push")} data-testid="reimbursements.review.push-to-payroll.button" sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Push to Payroll</Button> : null}
    </Stack>
  );
}
