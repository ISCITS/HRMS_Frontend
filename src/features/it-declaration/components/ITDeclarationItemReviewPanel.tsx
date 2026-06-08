"use client";

import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import ThumbDownAltOutlinedIcon from "@mui/icons-material/ThumbDownAltOutlined";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import { Alert, Box, Button, Grid, Paper, Stack, TextField, Typography } from "@mui/material";
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip } from "@mui/material";
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

type Props = {
  objItem: HrItDeclarationItemRecord;
  blnLocked: boolean;
  blnCanReview: boolean;
  blnCanApprove: boolean;
  blnCanReject: boolean;
  blnCanProofVerify: boolean;
  lstProofs?: HrItDeclarationProofRecord[];
  fnPreviewProof?: (intProofID: number) => void;
  fnDownloadProof?: (intProofID: number) => void;
  fnAction: (strAction: "approve" | "reject" | "partial_approve" | "proof_pending" | "proof_verify" | "proof_reject", objPayload?: { strRemarks?: string; decApprovedAmount?: number }) => Promise<void>;
};

export default function ITDeclarationItemReviewPanel({
  objItem,
  blnLocked,
  blnCanReview,
  blnCanApprove,
  blnCanReject,
  blnCanProofVerify,
  lstProofs = [],
  fnPreviewProof,
  fnDownloadProof,
  fnAction,
}: Props) {
  const [strRemarks, setStrRemarks] = useState(objItem.strReviewerRemarks ?? "");
  const [strApprovedAmount, setStrApprovedAmount] = useState(String(objItem.decApprovedAmount ?? objItem.decDeclaredAmount ?? 0));
  const [strError, setStrError] = useState("");
  const [blnUploadsDialogOpen, setBlnUploadsDialogOpen] = useState(false);
  const strItemStatus = String(objItem.strItemStatus || "").toLowerCase();
  const blnItemFinalized = ["approved", "rejected", "released", "locked"].includes(strItemStatus);
  const blnNeedsVerifiedProofForApproval =
    Boolean(objItem.blnProofRequired) &&
    !lstProofs.some((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "verified");
  const blnDisableApprovalActions = blnLocked || blnItemFinalized || !blnCanApprove || blnNeedsVerifiedProofForApproval;
  const blnDisableProofPendingAction = blnLocked || blnItemFinalized || !blnCanReview;
  const blnDisableRejectActions = blnLocked || blnItemFinalized || !blnCanReject;
  const blnDisableProofActions = blnLocked || blnItemFinalized || !blnCanProofVerify;
  const strProofSummaryStatus =
    lstProofs.length === 0
      ? "N/A"
      : (lstProofs.some((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "verified")
        ? "verified"
        : (lstProofs.some((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "pending")
          ? "pending"
          : String(lstProofs[0]?.strVerificationStatus || "uploaded")));
  const decDeclaredAmount = Number(objItem.decDeclaredAmount || 0);
  const decApprovedInput = Number(strApprovedAmount || 0);
  const blnApprovedAmountInvalid = !Number.isFinite(decApprovedInput) || decApprovedInput < 0 || decApprovedInput > decDeclaredAmount;
  const strDeductionName = getInvestmentDisplayName(objItem);
  const strDescription = String(objItem.strDescription || "").trim();
  const intVerifiedProofCount = lstProofs.filter((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "verified").length;
  const intRejectedProofCount = lstProofs.filter((objProof) => String(objProof.strVerificationStatus || "").toLowerCase() === "rejected").length;
  const strProofTone = intVerifiedProofCount > 0 ? "#15803d" : lstProofs.length > 0 ? "#b45309" : "#b45309";
  const strProofBackground = intVerifiedProofCount > 0 ? "#f0fdf4" : "#fff7ed";
  const strProofBorder = intVerifiedProofCount > 0 ? "#bbf7d0" : "#fed7aa";

  async function runWithValidation(strAction: "approve" | "reject" | "partial_approve" | "proof_pending" | "proof_verify" | "proof_reject") {
    if ((strAction === "approve" || strAction === "partial_approve") && blnApprovedAmountInvalid) {
      setStrError("Approved amount cannot be greater than declared amount.");
      return;
    }
    if (strAction === "reject" || strAction === "partial_approve" || strAction === "proof_reject") {
      if (!strRemarks.trim()) {
        setStrError("Remarks are required for this action.");
        return;
      }
    }
    setStrError("");
    await fnAction(strAction, {
      strRemarks: strRemarks.trim() || undefined,
      decApprovedAmount: Number(strApprovedAmount || 0),
    });
  }

  return (
    <Paper sx={{ px: 1, py: 1.15, pr: { xs: 1.2, md: 1.4 }, border: "1px solid #dbe3ef", borderRadius: "8px", boxShadow: "0 3px 10px rgba(15,23,42,0.04)", backgroundColor: "#ffffff" }}>
      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs={12} md={3}>
          <Stack spacing={0.6} sx={{ pr: { xs: 0, md: 2.2 } }}>
            <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>{strDeductionName}</Typography>
              <ITDeclarationStatusBadge strStatus={objItem.strItemStatus} />
            </Stack>
            <Typography sx={{ color: "#64748b", fontSize: "0.8rem", fontWeight: 700 }}>{objItem.strSection}</Typography>
            {strDescription && strDescription !== strDeductionName ? <Typography sx={{ color: "#334155", fontSize: "0.82rem" }}>{strDescription}</Typography> : null}
            {objItem.strEmployeeRemarks ? <Typography sx={{ color: "#64748b", fontSize: "0.8rem" }}>Employee: {objItem.strEmployeeRemarks}</Typography> : null}
            {objItem.strReviewerRemarks ? <Typography sx={{ color: "#b45309", fontSize: "0.8rem" }}>Reviewer: {objItem.strReviewerRemarks}</Typography> : null}
          </Stack>
        </Grid>
        <Grid item xs={12} md={4}>
          <Stack spacing={0.8}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Box sx={{ minWidth: { xs: "calc(50% - 4px)", sm: 155 }, px: 1, py: 0.8, borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Declared</Typography>
                <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{objInrFormatter.format(Number(objItem.decDeclaredAmount || 0))}</Typography>
              </Box>
              <Box sx={{ minWidth: { xs: "calc(50% - 4px)", sm: 155 }, px: 1, py: 0.8, borderRadius: "8px", border: "1px solid #dbeafe", backgroundColor: "#eff6ff" }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Current Approved</Typography>
                <Typography sx={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{objInrFormatter.format(Number(objItem.decApprovedAmount || 0))}</Typography>
              </Box>
            </Stack>
            <Box sx={{ px: 1, py: 0.8, borderRadius: "8px", border: `1px solid ${strProofBorder}`, backgroundColor: strProofBackground }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 800 }}>Proof Status</Typography>
                  <Typography sx={{ fontSize: "0.84rem", color: strProofTone, fontWeight: 900 }}>
                    {lstProofs.length === 0 ? "No proof uploaded" : `${lstProofs.length} uploaded | ${intVerifiedProofCount} verified${intRejectedProofCount ? ` | ${intRejectedProofCount} rejected` : ""}`}
                  </Typography>
                </Box>
                <Tooltip title="View Uploads">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => setBlnUploadsDialogOpen(true)}
                      disabled={lstProofs.length === 0}
                      data-testid="it-declaration.review.uploads.icon-button"
                      sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45, backgroundColor: "#ffffff" }}
                    >
                      <VisibilityRoundedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} md={5}>
          <Stack spacing={0.8}>
            <Typography sx={{ fontSize: "0.78rem", color: "#334155", fontWeight: 900 }}>Review Decision</Typography>
            <TextField
              size="small"
              label="Approved amount"
              data-testid="it-declaration.review.approved-amount.input"
              type="number"
              value={strApprovedAmount}
              onChange={(e) => setStrApprovedAmount(e.target.value)}
              disabled={blnDisableApprovalActions}
              error={blnApprovedAmountInvalid}
              helperText={blnApprovedAmountInvalid ? `Approved amount must be between 0 and ${decDeclaredAmount}.` : " "}
              inputProps={{ min: 0, max: decDeclaredAmount, step: "0.01" }}
              sx={{ width: { xs: "100%", sm: 230 } }}
            />
            <TextField size="small" label="Review remarks" value={strRemarks} onChange={(e) => setStrRemarks(e.target.value)} multiline minRows={2} disabled={blnLocked || blnItemFinalized} data-testid="it-declaration.review.remarks.input" />
            {strError ? <Alert severity="error" sx={{ width: "100%" }}>{strError}</Alert> : null}
            {blnNeedsVerifiedProofForApproval ? (
              <Alert severity="warning" sx={{ py: 0, width: "100%" }}>
                Verify at least one proof before approve/partial approve.
              </Alert>
            ) : null}
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
            <Button size="small" variant="outlined" startIcon={<PendingActionsRoundedIcon />} disabled={blnDisableProofPendingAction} onClick={() => void runWithValidation("proof_pending")} data-testid="it-declaration.review.proof-pending.button">Proof Pending</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<ThumbDownAltOutlinedIcon />} disabled={blnDisableRejectActions} onClick={() => void runWithValidation("reject")} data-testid="it-declaration.review.reject.button">Reject Item</Button>
            <Button size="small" variant="outlined" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnDisableApprovalActions || blnApprovedAmountInvalid} onClick={() => void runWithValidation("partial_approve")} data-testid="it-declaration.review.partial-approve.button">Partial Approve</Button>
            <Button size="small" variant="contained" startIcon={<ThumbUpAltOutlinedIcon />} disabled={blnDisableApprovalActions || blnApprovedAmountInvalid} onClick={() => void runWithValidation("approve")} data-testid="it-declaration.review.approve.button">Approve Item</Button>
          </Stack>
        </Grid>
      </Grid>
      <Dialog open={blnUploadsDialogOpen} onClose={() => setBlnUploadsDialogOpen(false)} maxWidth="md" fullWidth data-testid="it-declaration.review.uploads.dialog">
        <DialogTitle>Uploaded Documents</DialogTitle>
        <DialogContent>
          {lstProofs.length === 0 ? (
            <Typography sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>No uploads available for this declaration row.</Typography>
          ) : (
            <Stack sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              <Stack direction="row" sx={{ backgroundColor: "#f8fafc", px: 1, py: 0.8, "& > div": { fontSize: "0.76rem", fontWeight: 800, color: "#334155" } }}>
                <BoxCell strLabel="File Name" />
                <BoxCell strLabel="Status" strWidth={120} />
                <BoxCell strLabel="Size (bytes)" strWidth={120} />
                <BoxCell strLabel="Action" strWidth={210} />
              </Stack>
              {lstProofs.map((objProof) => (
                <Stack key={objProof.intProofID} direction="row" sx={{ px: 1, py: 0.7, borderTop: "1px solid #eef2f7", "& > div": { fontSize: "0.78rem", color: "#1f2937" } }}>
                  <BoxCell strLabel={objProof.strFileName || `Proof #${objProof.intProofID}`} />
                  <BoxCell strLabel={objProof.strVerificationStatus} strWidth={120} />
                  <BoxCell strLabel={String(objProof.intFileSizeBytes)} strWidth={120} />
                  <div style={{ flex: "0 0 210px", minWidth: "210px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Tooltip title="View">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => fnPreviewProof?.(objProof.intProofID)}
                          disabled={!fnPreviewProof}
                          data-testid="it-declaration.review.proof.view.icon-button"
                          data-row-key={objProof.intProofID}
                          sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45 }}
                        >
                          <VisibilityRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Download">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => fnDownloadProof?.(objProof.intProofID)}
                          disabled={!fnDownloadProof}
                          data-testid="it-declaration.review.proof.download.icon-button"
                          data-row-key={objProof.intProofID}
                          sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45 }}
                        >
                          <DownloadRoundedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Verify">
                      <span>
                        <IconButton
                          size="small"
                          disabled={blnDisableProofActions}
                          onClick={() => void runWithValidation("proof_verify")}
                          data-testid="it-declaration.review.proof.verify.icon-button"
                          data-row-key={objProof.intProofID}
                          sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45 }}
                        >
                          <CheckRoundedIcon sx={{ fontSize: 16, color: "#15803d" }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <span>
                        <IconButton
                          size="small"
                          disabled={blnDisableProofActions}
                          onClick={() => void runWithValidation("proof_reject")}
                          data-testid="it-declaration.review.proof.reject.icon-button"
                          data-row-key={objProof.intProofID}
                          sx={{ border: "1px solid #cbd5e1", borderRadius: "8px", p: 0.45 }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: 16, color: "#b91c1c" }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </div>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnUploadsDialogOpen(false)} data-testid="it-declaration.review.uploads.close.button">Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

function BoxCell({ strLabel, strWidth }: { strLabel: string; strWidth?: number }) {
  return (
    <div style={{ flex: strWidth ? `0 0 ${strWidth}px` : "1 1 auto", minWidth: strWidth ? `${strWidth}px` : 0 }}>
      {strLabel}
    </div>
  );
}
