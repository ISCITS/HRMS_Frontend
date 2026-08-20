"use client";

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
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
  const strProofTone = intVerifiedProofCount > 0 ? "var(--app-success-color)" : "var(--app-warning-color)";

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
    <Paper sx={{ p: 1.1, border: "1px solid var(--app-border-color)", borderRadius: "var(--app-btn-radius)", boxShadow: "var(--app-shadow-soft)", backgroundColor: "var(--app-surface-color)" }}>
      <Stack spacing={0.9}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={0.6}>
          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography sx={{ fontWeight: 900, color: "var(--app-header-color)" }}>{strDeductionName}</Typography>
            <ITDeclarationStatusBadge strStatus={objItem.strItemStatus} />
          </Stack>
          <Stack direction="row" spacing={0.6} alignItems="center">
            <Typography sx={{ fontSize: "0.76rem", color: strProofTone, fontWeight: 700, overflowWrap: "anywhere" }}>
              {lstProofs.length === 0 ? "No proof uploaded" : `${lstProofs.length} uploaded · ${intVerifiedProofCount} verified${intRejectedProofCount ? ` · ${intRejectedProofCount} rejected` : ""}`}
            </Typography>
            <Tooltip title="View Document">
              <span>
                <IconButton
                  size="small"
                  onClick={() => objPrimaryProof && fnPreviewProof?.(objPrimaryProof.intProofID)}
                  disabled={!objPrimaryProof || !fnPreviewProof}
                  controlId="it-declaration.review.proof.view.icon-button"
                  sx={{ color: "var(--app-muted-color)" }}
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
                  sx={{ color: "var(--app-muted-color)" }}
                >
                  <DownloadRoundedIcon sx={{ fontSize: 17 }} />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        {objItem.strEmployeeRemarks ? <Typography sx={{ color: "var(--app-muted-color)", fontSize: "0.8rem" }}>Employee: {objItem.strEmployeeRemarks}</Typography> : null}
        {objItem.strReviewerRemarks ? <Typography sx={{ color: "var(--app-warning-color)", fontSize: "0.8rem" }}>Reviewer: {objItem.strReviewerRemarks}</Typography> : null}

        <Stack direction="row" spacing={2.2}>
          <Stack>
            <Typography sx={{ fontSize: "0.68rem", color: "var(--app-muted-color)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Declared</Typography>
            <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--app-header-color)" }}>{objInrFormatter.format(Number(objItem.decDeclaredAmount || 0))}</Typography>
          </Stack>
          <Stack>
            <Typography sx={{ fontSize: "0.68rem", color: "var(--app-muted-color)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>Approved</Typography>
            <Typography sx={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--app-header-color)" }}>{objInrFormatter.format(Number(objItem.decApprovedAmount || 0))}</Typography>
          </Stack>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "150px minmax(0, 1fr)" }, gap: 0.8, alignItems: "start" }}>
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
          <TextField size="small" label="Remarks" placeholder="Optional" value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} disabled={blnLocked || blnItemFinalized} controlId="it-declaration.review.remarks.input" />
        </Box>
        {strError ? <Alert severity="error" onClose={() => setStrError("")} sx={{ width: "100%" }}>{strError}</Alert> : null}

        <Stack
          direction="row"
          spacing={0.65}
          sx={{
            "& .MuiButton-root": {
              minHeight: 31,
              px: 1.1,
              borderRadius: "var(--app-btn-radius)",
              textTransform: "none",
              fontSize: "0.74rem",
              fontWeight: 800,
              boxShadow: "none",
            },
          }}
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<ThumbUpAltOutlinedIcon />}
            disabled={blnDisableApprovalActions || blnApprovedAmountInvalid}
            onClick={() => void runWithValidation("approve")}
            controlId="it-declaration.review.approve.button"
            sx={{ backgroundColor: "var(--app-success-color)", "&:hover": { backgroundColor: "#25692f", boxShadow: "none" }, "&.Mui-disabled": { backgroundColor: "rgba(47,126,61,0.35)", color: "rgba(255,255,255,0.85)" } }}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<ThumbDownAltOutlinedIcon />}
            disabled={blnDisableRejectActions}
            onClick={() => void runWithValidation("reject")}
            controlId="it-declaration.review.reject.button"
            sx={{ borderColor: "var(--app-danger-color)", color: "var(--app-danger-color)", "&:hover": { borderColor: "#c4302f", backgroundColor: "rgba(231,58,58,0.06)" } }}
          >
            Reject
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
