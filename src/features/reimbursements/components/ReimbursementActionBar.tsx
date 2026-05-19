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
  onAction: (strAction: "start" | "approve" | "reject" | "release" | "lock" | "push") => void;
};

export default function ReimbursementActionBar({ objClaim, blnBusy, onAction }: ActionBarProps) {
  const blnTerminal = isHrReimbursementTerminal(objClaim.strClaimStatus);

  return (
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
      <Button size="small" variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={blnBusy || !canStartReimbursementReview(objClaim.strClaimStatus)} onClick={() => onAction("start")} sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Start Review</Button>
      <Button size="small" variant="outlined" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("approve")} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Approve Claim</Button>
      <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("reject")} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Reject</Button>
      <Button size="small" variant="outlined" startIcon={<ReplyRoundedIcon />} disabled={blnBusy || blnTerminal} onClick={() => onAction("release")} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Release</Button>
      <Button size="small" variant="outlined" startIcon={<LockRoundedIcon />} disabled={blnBusy || !canLockReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("lock")} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Lock</Button>
      <Button size="small" variant="contained" color="success" startIcon={<PublishRoundedIcon />} disabled={blnBusy || !canPushReimbursementClaim(objClaim.strClaimStatus)} onClick={() => onAction("push")} sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Push to Payroll</Button>
    </Stack>
  );
}
