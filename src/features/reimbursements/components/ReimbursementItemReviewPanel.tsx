"use client";

import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import ReimbursementProofViewer from "@/features/reimbursements/components/ReimbursementProofViewer";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatCurrency, formatDateLabel } from "@/features/reimbursements/formatters";
import type { ReimbursementClaimItemDto } from "@/features/reimbursements/types";

type ItemReviewPanelProps = {
  intClaimID: number;
  objItem: ReimbursementClaimItemDto;
  strClaimName?: string | null;
  strReimbursementTypeName?: string | null;
  blnActionsDisabled: boolean;
  blnCanApprove?: boolean;
  blnCanReject?: boolean;
  blnCanProofReview?: boolean;
  onApprove: (objItem: ReimbursementClaimItemDto, decApprovedAmount: number, strRemarks: string) => void;
  onReject: (objItem: ReimbursementClaimItemDto) => void;
  onProofPending: (objItem: ReimbursementClaimItemDto) => void;
  onVerifyProof: (intProofID: number) => void;
  onRejectProof: (intProofID: number) => void;
  onUploadProof: (intItemID: number, objFile: File) => void;
  onDeleteProof: (intItemID: number, intProofID: number) => void;
};

export default function ReimbursementItemReviewPanel({
  intClaimID,
  objItem,
  strClaimName,
  strReimbursementTypeName,
  blnActionsDisabled,
  blnCanApprove = false,
  blnCanReject = false,
  blnCanProofReview = false,
  onApprove,
  onReject,
  onProofPending,
  onVerifyProof,
  onRejectProof,
  onUploadProof,
  onDeleteProof,
}: ItemReviewPanelProps) {
  const [strApprovedAmount, setStrApprovedAmount] = useState(String(objItem.decApprovedAmount || objItem.decClaimedAmount || 0));
  const [strRemarks, setStrRemarks] = useState(objItem.strReviewerRemarks ?? "");
  const strDisplayName = objItem.strReimbursementTypeName || strReimbursementTypeName;

  function formatChoiceLabel(strValue?: string | null) {
    return (strValue || "-")
      .split("_")
      .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
      .join(" ");
  }

  function formatFinanceStatus(strValue?: string | null) {
    if (strValue === "paid") return "Settled";
    if (strValue === "pending") return "Pending";
    return formatChoiceLabel(strValue);
  }

  function approveItem() {
    // Purpose: Sends the reviewer-selected approved amount and remarks for full or partial item approval.
    const decApprovedAmount = Number(strApprovedAmount);
    if (!Number.isFinite(decApprovedAmount)) return;
    onApprove(objItem, decApprovedAmount, strRemarks.trim());
  }

  return (
    <Paper sx={{ px: 1, py: 1.2, pr: { xs: 1.2, md: 2 }, borderRadius: "8px", border: "1px solid #dbe3ef", boxShadow: "0 3px 10px rgba(15,23,42,0.04)" }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Stack spacing={0.6} sx={{ pr: { xs: 0, md: 2.2 } }}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{strDisplayName}</Typography>
            <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{formatDateLabel(objItem.dtExpenseDate)} | {objItem.strTaxTreatment.replace("_", " ")}</Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "#334155" }}>{objItem.strExpenseDescription || "-"}</Typography>
            {objItem.strEmployeeRemarks ? <Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Employee: {objItem.strEmployeeRemarks}</Typography> : null}
            {objItem.strReviewerRemarks ? <Typography sx={{ fontSize: "0.8rem", color: "#b45309" }}>Reviewer: {objItem.strReviewerRemarks}</Typography> : null}
          </Stack>
        </Grid>
        <Grid item xs={12} md={6} sx={{ pr: { xs: 0, md: 1.2 } }}>
          <Stack spacing={0.8} sx={{ mr: { xs: 0, md: 1 } }}>
            <Grid container spacing={0.8}>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Claimed Amount</Typography>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{formatCurrency(objItem.decClaimedAmount)}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Approved Amount</Typography>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{formatCurrency(objItem.decApprovedAmount)}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Eligible Balance</Typography>
                <Typography sx={{ fontWeight: 900, color: "#2563eb" }}>{formatCurrency(objItem.decEligibleBalance ?? objItem.decBalanceAvailable ?? 0)}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Proof Status</Typography>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{formatChoiceLabel(objItem.strProofStatus || (objItem.blnProofRequired ? "required" : "not_required"))}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Settlement Method</Typography>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{formatChoiceLabel(objItem.strSettlementMode)}</Typography>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>Payroll Impact / Finance</Typography>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {objItem.strSettlementMode === "finance" ? formatFinanceStatus(objItem.strFinanceStatus) : formatChoiceLabel(objItem.strPayrollImpact)}
                </Typography>
              </Grid>
            </Grid>
            <TextField size="small" type="number" label="Approved amount" value={strApprovedAmount} onChange={(objEvent) => setStrApprovedAmount(objEvent.target.value)} inputProps={{ min: 0, max: objItem.decClaimedAmount, step: "0.01" }} disabled={blnActionsDisabled || !blnCanApprove} sx={{ width: { xs: "100%", sm: 200 } }} />
            <TextField fullWidth size="small" multiline minRows={2} label="Review remarks" value={strRemarks} onChange={(objEvent) => setStrRemarks(objEvent.target.value)} disabled={blnActionsDisabled || (!blnCanApprove && !blnCanReject && !blnCanProofReview)} />
          </Stack>
        </Grid>
        <Grid item xs={12} md={3}>
          <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }} sx={{ mr: { xs: 0, md: 1 } }}>
            <ReimbursementStatusBadge strStatus={objItem.strItemStatus} />
            <Box sx={{ width: "100%" }}>
              <ReimbursementProofViewer
                intClaimID={intClaimID}
                intItemID={objItem.intID}
                lstProofs={objItem.lstProofs}
                blnActionsDisabled={blnActionsDisabled || !blnCanProofReview}
                onVerify={onVerifyProof}
                onReject={onRejectProof}
                onUpload={onUploadProof}
                onDelete={onDeleteProof}
              />
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Stack direction="row" spacing={0.7} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            {blnCanProofReview ? <Button size="small" variant="outlined" startIcon={<PendingActionsRoundedIcon />} disabled={blnActionsDisabled} onClick={() => onProofPending(objItem)} sx={{ minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 700, borderRadius: "8px", fontSize: "0.75rem" }}>Proof Pending</Button> : null}
            {blnCanReject ? <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnActionsDisabled} onClick={() => onReject(objItem)} sx={{ minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 700, borderRadius: "8px", fontSize: "0.75rem" }}>Reject Item</Button> : null}
            {blnCanApprove ? <Button size="small" variant="contained" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnActionsDisabled} onClick={approveItem} sx={{ minHeight: 30, px: 1.15, py: 0.25, textTransform: "none", fontWeight: 800, borderRadius: "8px", fontSize: "0.75rem" }}>Approve Item</Button> : null}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
