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
  const objButtonSx = { minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 700, borderRadius: "8px", fontSize: "0.75rem" };
  const objContainedButtonSx = { ...objButtonSx, fontWeight: 800 };

  return (
    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
      {blnCanStart ? <Button size="small" variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={blnBusy || !canStartReimbursementReview(objClaim.strClaimStatus)} onClick={() => onAction("start")} sx={objContainedButtonSx}>Start Review</Button> : null}
      {blnCanApprove ? <Button size="small" variant="outlined" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("approve")} sx={objButtonSx}>Approve Claim</Button> : null}
      {blnCanReject ? <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("reject")} sx={objButtonSx}>Reject</Button> : null}
      {blnCanRelease ? <Button size="small" variant="outlined" startIcon={<ReplyRoundedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("release")} sx={objButtonSx}>Release</Button> : null}
      {blnCanLock ? <Button size="small" variant="outlined" startIcon={<LockRoundedIcon />} disabled={blnBusy || !canLockReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("lock")} sx={objButtonSx}>Lock</Button> : null}
      {blnCanPush ? <Button size="small" variant="contained" color="success" startIcon={<PublishRoundedIcon />} disabled={blnBusy || !canPushReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("push")} sx={objContainedButtonSx}>Push to Payroll</Button> : null}
    </Stack>
  );
}
