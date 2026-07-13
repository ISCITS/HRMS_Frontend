"use client";

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Alert, Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { IconButton, Tooltip } from "@mui/material";
import { useState } from "react";

import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import type { HrItDeclarationItemRecord, HrItDeclarationProofRecord } from "@/features/it-declaration/services/itDeclarationService";

const objInrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getInvestmentDisplayName(objItem: HrItDeclarationItemRecord) {
  const lstCandidates = [
    objItem.strInvestmentName,
    objItem.strInvestmentOptionName,
    objItem.strOptionName,
    objItem.strDeductionName,
    objItem.strComponentName,
    objItem.investment_name,
    objItem.investmentName,
  ];
  const strName = lstCandidates.find((strCandidate) => String(strCandidate || "").trim());
  if (strName) return String(strName).trim();
  const strDescription = String(objItem.strDescription || "").trim();
  const strSection = String(objItem.strSection || "").trim();
  if (strDescription && strDescription.toLowerCase() !== strSection.toLowerCase() && !strDescription.toLowerCase().includes("section")) {
    return strDescription;
  }
  return "Investment / Deduction";
}

function normalizeMaxLimitAppliedAt(objValue: unknown) {
  const strValue = String(objValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return strValue === "APPROVAL_LEVEL" ? "APPROVAL_LEVEL" : "ENTRY_LEVEL";
}

function parseMaxLimit(objValue: unknown) {
  if (typeof objValue === "number") return Number.isFinite(objValue) ? objValue : null;
  const strDigits = String(objValue || "").replace(/[^0-9.]/g, "");
  const decParsed = Number(strDigits);
  return Number.isFinite(decParsed) ? decParsed : null;
}

type Props = {
  objItem: HrItDeclarationItemRecord;
  blnLocked: boolean;
  blnCanApprove: boolean;
  blnCanReject: boolean;
  lstProofs?: HrItDeclarationProofRecord[];
  decSectionMaxLimit?: number | null;
  decOtherApprovedAmount?: number;
  fnPreviewProof?: (intProofID: number) => void;
  fnDownloadProof?: (intProofID: number) => void;
  fnAction: (strAction: "approve" | "reject", objPayload?: { strRemarks?: string; decApprovedAmount?: number }) => Promise<void>;
};

export default function ITDeclarationItemReviewPanel({
  objItem,
  blnLocked,
  blnCanApprove,
  blnCanReject,
  lstProofs = [],
  decSectionMaxLimit = null,
  decOtherApprovedAmount = 0,
  fnPreviewProof,
  fnDownloadProof,
  fnAction,
}: Props) {
  const [strRemarks, setStrRemarks] = useState(objItem.strReviewerRemarks ?? "");
  const [strApprovedAmount, setStrApprovedAmount] = useState(String(objItem.decApprovedAmount ?? objItem.decDeclaredAmount ?? 0));
  const [strError, setStrError] = useState("");
  const strItemStatus = String(objItem.strItemStatus || "").toLowerCase();
  const blnItemFinalized = ["approved", "rejected", "released", "locked"].includes(strItemStatus);
  const blnDisableApprovalActions = blnLocked || blnItemFinalized || !blnCanApprove;
  const blnDisableRejectActions = blnLocked || blnItemFinalized || !blnCanReject;
  const objPrimaryProof = lstProofs[0];
  const decDeclaredAmount = Number(objItem.decDeclaredAmount || 0);
  const decApprovedInput = Number(strApprovedAmount || 0);
  const decConfiguredMaxLimit = decSectionMaxLimit ?? objItem.decMaxLimitAmount ?? objItem.decMaxEligibleAmount ?? parseMaxLimit(objItem.strMaxLimit);
  const blnApplyMaxLimitAtApproval = normalizeMaxLimitAppliedAt(objItem.strMaxLimitAppliedAt) === "APPROVAL_LEVEL";
  const decApprovalAvailableForItem =
    blnApplyMaxLimitAtApproval && decConfiguredMaxLimit != null
      ? Math.max(0, Number(decConfiguredMaxLimit) - Math.max(0, Number(decOtherApprovedAmount || 0)))
      : null;
  const blnApprovedAmountInvalid =
    !Number.isFinite(decApprovedInput) ||
    decApprovedInput < 0 ||
    decApprovedInput > decDeclaredAmount ||
    (decApprovalAvailableForItem != null && decApprovedInput > decApprovalAvailableForItem);
  const strApprovedAmountHelperText =
    !Number.isFinite(decApprovedInput) || decApprovedInput < 0 || decApprovedInput > decDeclaredAmount
      ? `Approved amount must be between 0 and ${decDeclaredAmount}.`
      : decApprovalAvailableForItem != null && decApprovedInput > decApprovalAvailableForItem
        ? `Section approval cannot exceed ${objInrFormatter.format(decConfiguredMaxLimit || 0)}. Available for this row: ${objInrFormatter.format(decApprovalAvailableForItem)}.`
        : " ";
  const strDeductionName = getInvestmentDisplayName(objItem);
  const intVerifiedProofCount = lstProofs.filter((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "verified").length;
  const intRejectedProofCount = lstProofs.filter((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "rejected").length;
  const strProofTone = intVerifiedProofCount > 0 ? "#15803d" : lstProofs.length > 0 ? "#b45309" : "#b45309";
  const strProofBackground = intVerifiedProofCount > 0 ? "#f0fdf4" : "#fff7ed";
  const strProofBorder = intVerifiedProofCount > 0 ? "#bbf7d0" : "#fed7aa";

  async function runWithValidation(strAction: "approve" | "reject") {
    if (strAction === "approve" && blnApprovedAmountInvalid) {
      setStrError(decApprovalAvailableForItem != null && decApprovedInput > decApprovalAvailableForItem ? "Approved amount exceeds the section maximum limit." : "Approved amount cannot be greater than declared amount.");
      return;
    }
    if (strAction === "reject" && !strRemarks.trim()) {
      setStrError("Remarks are required for this action.");
      return;
    }
    setStrError("");
    await fnAction(strAction, {
      strRemarks: strRemarks.trim() || undefined,
      decApprovedAmount: Number(strApprovedAmount || 0),
    });
  }

  return (
    <Paper sx={{ px: 1, py: 1.15, pr: { xs: 1.2, md: 1.4 }, border: "3px solid #94a3b8", borderRadius: "8px", boxShadow: "0 5px 16px rgba(15,23,42,0.1)", backgroundColor: "#ffffff" }}>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "flex-start" }} spacing={1}>
            <Stack spacing={0.6} sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{strDeductionName}</Typography>
                <ITDeclarationStatusBadge strStatus={objItem.strItemStatus} />
              </Stack>
              {objItem.strEmployeeRemarks ? <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Employee: {objItem.strEmployeeRemarks}</Typography> : null}
              {objItem.strReviewerRemarks ? <Typography sx={{ color: "#b45309", fontSize: "0.8rem" }}>Reviewer: {objItem.strReviewerRemarks}</Typography> : null}
            </Stack>
            <Box sx={{ flex: { xs: "1 1 auto", sm: "0 0 245px" }, px: 1, py: 0.7, borderRadius: "8px", border: `1px solid ${strProofBorder}`, backgroundColor: strProofBackground }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Proof Status</Typography>
                  <Typography sx={{ fontSize: "0.84rem", color: strProofTone, fontWeight: 900, overflowWrap: "anywhere" }}>
                    {lstProofs.length === 0 ? "No proof uploaded" : `${lstProofs.length} uploaded | ${intVerifiedProofCount} verified${intRejectedProofCount ? ` | ${intRejectedProofCount} rejected` : ""}`}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="View Document">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => objPrimaryProof && fnPreviewProof?.(objPrimaryProof.intProofID)}
                        disabled={!objPrimaryProof || !fnPreviewProof}
                        controlId="it-declaration.review.proof.view.icon-button"
                        sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45, backgroundColor: "#ffffff" }}
                      >
                        <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Download Document">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => objPrimaryProof && fnDownloadProof?.(objPrimaryProof.intProofID)}
                        disabled={!objPrimaryProof || !fnDownloadProof}
                        controlId="it-declaration.review.proof.download.icon-button"
                        sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45, backgroundColor: "#ffffff" }}
                      >
                        <DownloadRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Stack spacing={0.8}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Box sx={{ flex: "1 1 150px", minWidth: { xs: "calc(50% - 4px)", sm: 150 }, px: 1, py: 0.8, borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Declared</Typography>
                <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{objInrFormatter.format(Number(objItem.decDeclaredAmount || 0))}</Typography>
              </Box>
              <Box sx={{ flex: "1 1 150px", minWidth: { xs: "calc(50% - 4px)", sm: 150 }, px: 1, py: 0.8, borderRadius: "8px", border: "1px solid #dbeafe", backgroundColor: "#eff6ff" }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Current Approved</Typography>
                <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{objInrFormatter.format(Number(objItem.decApprovedAmount || 0))}</Typography>
              </Box>
            </Stack>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Stack spacing={0.8}>
            <Typography sx={{ fontSize: "0.78rem", color: "#334155", fontWeight: 900 }}>Review Decision</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "190px minmax(0, 1fr)" }, gap: 0.8, alignItems: "start" }}>
              <TextField
                size="small"
                label="Approved amount"
                controlId="it-declaration.review.approved-amount.input"
                type="number"
                value={strApprovedAmount}
                onChange={(e) => setStrApprovedAmount(e.target.value)}
                disabled={blnDisableApprovalActions}
                error={blnApprovedAmountInvalid}
                helperText={strApprovedAmountHelperText}
                inputProps={{ min: 0, max: decApprovalAvailableForItem == null ? decDeclaredAmount : Math.min(decDeclaredAmount, decApprovalAvailableForItem), step: "0.01" }}
                sx={{ width: "100%" }}
              />
              <TextField size="small" label="Review remarks" value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} multiline minRows={1} disabled={blnLocked || blnItemFinalized} controlId="it-declaration.review.remarks.input" />
            </Box>
            {strError ? <Alert severity="error" onClose={() => setStrError("")} sx={{ width: "100%" }}>{strError}</Alert> : null}
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Stack
            direction="row"
            spacing={0.65}
            useFlexGap
            flexWrap="wrap"
            justifyContent="flex-end"
            sx={{
              "& .MuiButton-root": {
                minHeight: 31,
                px: 1.1,
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.74rem",
                fontWeight: 800,
              },
            }}
          >
            <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnDisableRejectActions} onClick={() => void runWithValidation("reject")} controlId="it-declaration.review.reject.button">Reject Item</Button>
            <Button size="small" variant="contained" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnDisableApprovalActions || blnApprovedAmountInvalid} onClick={() => void runWithValidation("approve")} controlId="it-declaration.review.approve.button">Approve Item</Button>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}
