"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationActionBar from "@/features/it-declaration/components/ITDeclarationActionBar";
import ITDeclarationAuditTimeline from "@/features/it-declaration/components/ITDeclarationAuditTimeline";
import ITDeclarationItemReviewPanel from "@/features/it-declaration/components/ITDeclarationItemReviewPanel";
import ITDeclarationProofViewer from "@/features/it-declaration/components/ITDeclarationProofViewer";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import {
  hrItDeclarationReviewService,
  type HrItDeclarationAuditRecord,
  type HrItDeclarationDetailRecord,
} from "@/features/it-declaration/services/itDeclarationService";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type Props = { intDeclarationID: number };
type ConfirmAction = "approve_all" | "reject" | "release" | "lock" | null;

export default function ITDeclarationReviewDetailPage({ intDeclarationID }: Props) {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, canDoAny, objRights } = useModuleActionAccess(["PAYROLL_IT_DECLARATION"]);
  const [objDetail, setObjDetail] = useState<HrItDeclarationDetailRecord | null>(null);
  const [lstAudit, setLstAudit] = useState<HrItDeclarationAuditRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strReason, setStrReason] = useState("");
  const [strDialogError, setStrDialogError] = useState("");
  const [strConfirm, setStrConfirm] = useState<ConfirmAction>(null);

  function hasPermissionCode(strCode: string) {
    const strNormalized = strCode.trim().toUpperCase();
    return Object.entries(objRights.dicAllowedActions || {}).some(([strModuleCode, lstActions]) =>
      strModuleCode.trim().toUpperCase() === strNormalized ||
      lstActions.some((strAction) => strAction.trim().toUpperCase() === strNormalized)
    );
  }

  const blnCanApprove = canDoAny("approve") || hasPermissionCode("PAYROLL_IT_DECLARATION_APPROVE");
  const blnCanReject = canDoAny("reject") || hasPermissionCode("PAYROLL_IT_DECLARATION_REJECT");
  const blnCanReview = canDoAny("edit") || hasPermissionCode("PAYROLL_IT_DECLARATION_REVIEW");
  const blnCanRelease = canDoAny("release") || hasPermissionCode("PAYROLL_IT_DECLARATION_RELEASE");
  const blnCanLock = canDoAny("lock") || hasPermissionCode("PAYROLL_IT_DECLARATION_LOCK");
  const blnCanProofVerify = canDoAny("proof_verify") || hasPermissionCode("PAYROLL_IT_DECLARATION_PROOF_VERIFY");
  const blnLocked = Boolean(objDetail?.blnLocked || objDetail?.strStatus?.toLowerCase() === "locked");

  async function loadData() {
    setBlnLoading(true);
    setStrError("");
    try {
      const [objFetched, lstAuditEvents] = await Promise.all([
        hrItDeclarationReviewService.getDetail(intDeclarationID),
        hrItDeclarationReviewService.getAudit(intDeclarationID),
      ]);
      setObjDetail(objFetched);
      setLstAudit(lstAuditEvents);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load declaration detail.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadData();
  }, [blnRightsLoading, intDeclarationID]);

  async function handleItemAction(intItemID: number, strAction: "approve" | "reject" | "partial_approve" | "proof_pending" | "proof_verify" | "proof_reject", objPayload?: { strRemarks?: string; decApprovedAmount?: number }) {
    if (blnLocked) return;
    if ((strAction === "reject" || strAction === "partial_approve" || strAction === "proof_reject") && !objPayload?.strRemarks) {
      setStrError("Remarks are required.");
      return;
    }
    if (strAction === "proof_verify" || strAction === "proof_reject") {
      await hrItDeclarationReviewService.reviewProof(intDeclarationID, intItemID, strAction === "proof_verify" ? "verify" : "reject", objPayload);
    } else if (strAction === "partial_approve") {
      await hrItDeclarationReviewService.reviewItem(intDeclarationID, intItemID, "partial-approve", objPayload);
    } else if (strAction === "proof_pending") {
      await hrItDeclarationReviewService.reviewItem(intDeclarationID, intItemID, "proof-pending", objPayload);
    } else {
      await hrItDeclarationReviewService.reviewItem(intDeclarationID, intItemID, strAction, objPayload);
    }
    setStrToast("Action completed successfully.");
    await loadData();
  }

  async function confirmAction() {
    if (!objDetail || !strConfirm) return;
    if (["reject", "release"].includes(strConfirm) && !strReason.trim()) {
      setStrDialogError("Remarks are required.");
      return;
    }
    try {
      if (strConfirm === "approve_all") await hrItDeclarationReviewService.reviewHeader(objDetail.intDeclarationID, "approve");
      if (strConfirm === "reject") await hrItDeclarationReviewService.reviewHeader(objDetail.intDeclarationID, "reject", { strRemarks: strReason.trim() });
      if (strConfirm === "release") await hrItDeclarationReviewService.release(objDetail.intDeclarationID, { strRemarks: strReason.trim() });
      if (strConfirm === "lock") await hrItDeclarationReviewService.lock(objDetail.intDeclarationID, { strRemarks: strReason.trim() || undefined });
      setStrConfirm(null);
      setStrReason("");
      setStrDialogError("");
      setStrToast("Action completed successfully.");
      await loadData();
    } catch (objError) {
      setStrDialogError(objError instanceof Error ? objError.message : "Unable to complete this action.");
    }
  }

  async function previewProof(intItemID: number) {
    if (!objDetail) return;
    const objPreview = await hrItDeclarationReviewService.previewProof(objDetail.intDeclarationID, intItemID);
    const strUrl = `data:${objPreview.strMimeType};base64,${objPreview.strBase64Content}`;
    window.open(strUrl, "_blank", "noopener,noreferrer");
  }

  const lstProofs = useMemo(() => objDetail?.lstProofs || [], [objDetail]);

  if (blnLoading || blnRightsLoading) return <BlockingLoader blnOpen strLabel="Loading IT declaration detail..." />;
  if (!objDetail) return <Alert severity="error">{strError || "Declaration not found."}</Alert>;

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/it-declaration-review")}>Back</Button>
        <ITDeclarationStatusBadge strStatus={objDetail.strStatus} />
      </Stack>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      <Typography sx={{ fontSize: "1.3rem", fontWeight: 800 }}>{objDetail.strEmployeeName} ({objDetail.strEmployeeCode})</Typography>
      <Typography sx={{ color: "#64748b" }}>FY: {objDetail.strFinancialYearCode} | Regime: {objDetail.strTaxRegime} | Declared: {objDetail.decDeclaredTotalAmount} | Approved: {objDetail.decApprovedTotalAmount} | Proof Pending: {objDetail.intProofPendingCount}</Typography>
      <Stack direction="row" spacing={1}>
        <Button variant="outlined" disabled={blnLocked || !blnCanReview} onClick={() => void hrItDeclarationReviewService.startReview(objDetail.intDeclarationID).then(loadData)}>Start Review</Button>
      </Stack>
      <ITDeclarationActionBar
        blnLocked={blnLocked}
        blnCanRelease={blnCanRelease}
        blnCanLock={blnCanLock}
        blnCanApprove={blnCanApprove}
        fnApproveAll={() => setStrConfirm("approve_all")}
        fnRejectHeader={() => setStrConfirm("reject")}
        fnRelease={() => setStrConfirm("release")}
        fnLock={() => setStrConfirm("lock")}
      />

      <Box sx={{ display: "grid", gap: 1.2 }}>
        {objDetail.lstItems.map((objItem, intIndex) => (
          <ITDeclarationItemReviewPanel
            key={objItem.intItemID ?? `it-item-${intIndex}-${objItem.strSection}-${objItem.strInvestmentName}`}
            objItem={objItem}
            blnLocked={blnLocked}
            blnCanApprove={blnCanApprove}
            blnCanReject={blnCanReject}
            blnCanProofVerify={blnCanProofVerify}
            fnAction={(strAction, objPayload) => handleItemAction(objItem.intItemID, strAction, objPayload)}
          />
        ))}
      </Box>

      <Typography sx={{ fontWeight: 800 }}>Proof Documents</Typography>
      <ITDeclarationProofViewer lstProofs={lstProofs} fnPreview={previewProof} />

      {objDetail.objHraDetails ? (
        <Box>
          <Typography sx={{ fontWeight: 800 }}>HRA Details</Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.85rem" }}>{JSON.stringify(objDetail.objHraDetails)}</Typography>
        </Box>
      ) : null}
      {objDetail.objHomeLoanDetails ? (
        <Box>
          <Typography sx={{ fontWeight: 800 }}>Home Loan Details</Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.85rem" }}>{JSON.stringify(objDetail.objHomeLoanDetails)}</Typography>
        </Box>
      ) : null}
      {objDetail.objPreviousEmployerDetails ? (
        <Box>
          <Typography sx={{ fontWeight: 800 }}>Previous Employer Details</Typography>
          <Typography sx={{ color: "#475569", fontSize: "0.85rem" }}>{JSON.stringify(objDetail.objPreviousEmployerDetails)}</Typography>
        </Box>
      ) : null}

      <Typography sx={{ fontWeight: 800 }}>Audit Timeline</Typography>
      <ITDeclarationAuditTimeline lstAudit={lstAudit} />

      <Dialog open={Boolean(strConfirm)} onClose={() => setStrConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Please confirm this action.</Typography>
          {(strConfirm === "reject" || strConfirm === "release") ? (
            <TextField fullWidth size="small" label="Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} multiline minRows={3} />
          ) : null}
          {strDialogError ? <Alert severity="error" sx={{ mt: 1 }}>{strDialogError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrConfirm(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void confirmAction()}>Confirm</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2200} onClose={() => setStrToast("")} message={strToast} />
    </Stack>
  );
}
