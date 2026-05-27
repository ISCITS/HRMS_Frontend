"use client";

import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import ReimbursementProofViewer from "@/features/reimbursements/components/ReimbursementProofViewer";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatCurrency, formatDateLabel } from "@/features/reimbursements/formatters";
import type { ReimbursementClaimItemDto } from "@/features/reimbursements/types";

type ItemReviewPanelProps = {
  objItem: ReimbursementClaimItemDto;
  strCategoryName?: string | null;
  blnActionsDisabled: boolean;
  blnCanApprove?: boolean;
  blnCanReject?: boolean;
  blnCanProofReview?: boolean;
  onApprove: (objItem: ReimbursementClaimItemDto, decApprovedAmount: number, strRemarks: string) => void;
  onReject: (objItem: ReimbursementClaimItemDto) => void;
  onProofPending: (objItem: ReimbursementClaimItemDto) => void;
  onVerifyProof: (intProofID: number) => void;
  onRejectProof: (intProofID: number) => void;
};

export default function ReimbursementItemReviewPanel({
  objItem,
  strCategoryName,
  blnActionsDisabled,
  blnCanApprove = false,
  blnCanReject = false,
  blnCanProofReview = false,
  onApprove,
  onReject,
  onProofPending,
  onVerifyProof,
  onRejectProof,
}: ItemReviewPanelProps) {
  const [strApprovedAmount, setStrApprovedAmount] = useState(String(objItem.decApprovedAmount || objItem.decClaimedAmount || 0));
  const [strRemarks, setStrRemarks] = useState(objItem.strReviewerRemarks ?? "");

  function approveItem() {
    // Purpose: Sends the reviewer-selected approved amount and remarks for full or partial item approval.
    const decApprovedAmount = Number(strApprovedAmount);
    if (!Number.isFinite(decApprovedAmount)) return;
    onApprove(objItem, decApprovedAmount, strRemarks.trim());
  }

  return (
    <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
      <Grid container spacing={1.2}>
        <Grid item xs={12} md={5}>
          <Stack spacing={0.6}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{strCategoryName || objItem.strExpenseDescription || `Item #${objItem.intID}`}</Typography>
              <ReimbursementStatusBadge strStatus={objItem.strItemStatus} />
            </Stack>
            <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{formatDateLabel(objItem.dtExpenseDate)} | {objItem.strTaxTreatment.replace("_", " ")}</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "#334155" }}>{objItem.strExpenseDescription || "-"}</Typography>
            {objItem.strEmployeeRemarks ? <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Employee: {objItem.strEmployeeRemarks}</Typography> : null}
            {objItem.strReviewerRemarks ? <Typography sx={{ fontSize: "0.8rem", color: "#b45309" }}>Reviewer: {objItem.strReviewerRemarks}</Typography> : null}
          </Stack>
        </Grid>
        <Grid item xs={12} md={3}>
          <Stack spacing={0.8}>
            <Typography sx={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>Claimed</Typography>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{formatCurrency(objItem.decClaimedAmount)}</Typography>
            <TextField size="small" type="number" label="Approved amount" value={strApprovedAmount} onChange={(objEvent) => setStrApprovedAmount(objEvent.target.value)} inputProps={{ min: 0, max: objItem.decClaimedAmount, step: "0.01" }} disabled={blnActionsDisabled || !blnCanApprove} />
            <TextField size="small" multiline minRows={2} label="Review remarks" value={strRemarks} onChange={(objEvent) => setStrRemarks(objEvent.target.value)} disabled={blnActionsDisabled || (!blnCanApprove && !blnCanReject && !blnCanProofReview)} />
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <ReimbursementProofViewer lstProofs={objItem.lstProofs} blnActionsDisabled={blnActionsDisabled || !blnCanProofReview} onVerify={onVerifyProof} onReject={onRejectProof} />
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={0.7} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            {blnCanProofReview ? <Button size="small" variant="outlined" startIcon={<PendingActionsRoundedIcon />} disabled={blnActionsDisabled} onClick={() => onProofPending(objItem)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Proof Pending</Button> : null}
            {blnCanReject ? <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnActionsDisabled} onClick={() => onReject(objItem)} sx={{ textTransform: "none", fontWeight: 700, borderRadius: "8px" }}>Reject Item</Button> : null}
            {blnCanApprove ? <Button size="small" variant="contained" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnActionsDisabled} onClick={approveItem} sx={{ textTransform: "none", fontWeight: 800, borderRadius: "8px" }}>Approve Item</Button> : null}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
