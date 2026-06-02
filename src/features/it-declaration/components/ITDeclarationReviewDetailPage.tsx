"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ITDeclarationActionBar from "@/features/it-declaration/components/ITDeclarationActionBar";
import ITDeclarationItemReviewPanel from "@/features/it-declaration/components/ITDeclarationItemReviewPanel";
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
  const { blnLoading: blnRightsLoading, canDoAny, objRights } = useModuleActionAccess([
    "PAYROLL_IT_DECLARATION_REVIEW",
    "PAYROLL_IT_DECLARATION",
  ]);
  const [objDetail, setObjDetail] = useState<HrItDeclarationDetailRecord | null>(null);
  const [lstAudit, setLstAudit] = useState<HrItDeclarationAuditRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strReason, setStrReason] = useState("");
  const [strDialogError, setStrDialogError] = useState("");
  const [strConfirm, setStrConfirm] = useState<ConfirmAction>(null);
  const [blnAuditDialogOpen, setBlnAuditDialogOpen] = useState(false);
  const [intItemsPerPage] = useState(2);
  const [intItemPage, setIntItemPage] = useState(1);

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
  const blnCanProofVerify =
    canDoAny("proof_verify") ||
    hasPermissionCode("PAYROLL_IT_DECLARATION_PROOF_VERIFY") ||
    blnCanReview;
  const strDeclarationStatus = String(objDetail?.strStatus || "").toLowerCase();
  const blnLocked = Boolean(objDetail?.blnLocked || objDetail?.strStatus?.toLowerCase() === "locked");
  const blnReviewEditable = ["under_review"].includes(strDeclarationStatus);
  const blnSubmittedPendingReview = strDeclarationStatus === "submitted";
  const blnItemActionsAllowedStatus = blnReviewEditable || blnSubmittedPendingReview;
  const blnCanStartReview = !blnLocked && blnCanReview && strDeclarationStatus === "submitted";
  const blnCanApproveHeader = !blnLocked && blnCanApprove && strDeclarationStatus === "under_review";
  const blnCanRejectHeader = !blnLocked && blnCanReject && strDeclarationStatus === "under_review";
  const blnCanReleaseHeader = !blnLocked && (blnCanRelease || blnCanReview) && ["submitted", "under_review", "approved", "partially_approved", "rejected"].includes(strDeclarationStatus);
  const blnCanLockHeader = !blnLocked && (blnCanLock || blnCanReview) && ["approved", "partially_approved"].includes(strDeclarationStatus);

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
    if (!intItemID) return;
    if (blnLocked) {
      setStrError("Locked declaration cannot be modified.");
      return;
    }
    if (!blnItemActionsAllowedStatus) {
      setStrError("Item actions are allowed only after Start Review.");
      return;
    }
    if (blnSubmittedPendingReview) {
      try {
        await hrItDeclarationReviewService.startReview(intDeclarationID);
        await loadData();
      } catch (objError) {
        setStrError(objError instanceof Error ? objError.message : "Unable to start review.");
        return;
      }
    }
    if ((strAction === "reject" || strAction === "partial_approve" || strAction === "proof_reject") && !objPayload?.strRemarks) {
      setStrError("Remarks are required.");
      return;
    }
    try {
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
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to complete item action.");
    }
  }

  async function previewProof(intProofID: number) {
    if (!objDetail) return;
    const objPreview = await hrItDeclarationReviewService.previewProofByID(objDetail.intDeclarationID, intProofID);
    const strUrl = `data:${objPreview.strMimeType};base64,${objPreview.strBase64Content}`;
    window.open(strUrl, "_blank", "noopener,noreferrer");
  }

  async function downloadProof(intProofID: number) {
    if (!objDetail) return;
    const objPreview = await hrItDeclarationReviewService.previewProofByID(objDetail.intDeclarationID, intProofID);
    const strUrl = `data:${objPreview.strMimeType};base64,${objPreview.strBase64Content}`;
    const objAnchor = document.createElement("a");
    objAnchor.href = strUrl;
    objAnchor.download = objPreview.strFileName || `proof-${intProofID}`;
    document.body.appendChild(objAnchor);
    objAnchor.click();
    document.body.removeChild(objAnchor);
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

  const lstProofs = useMemo(() => objDetail?.lstProofs || [], [objDetail]);
  const lstItems = objDetail?.lstItems || [];
  const intItemPageCount = Math.max(1, Math.ceil(lstItems.length / intItemsPerPage));
  const intSafeItemPage = Math.min(intItemPage, intItemPageCount);
  const intStartIndex = (intSafeItemPage - 1) * intItemsPerPage;
  const lstVisibleItems = lstItems.slice(intStartIndex, intStartIndex + intItemsPerPage);

  function goToNextItem(intCurrentItemID?: number) {
    if (!lstItems.length) return;
    const intCurrentIndex = typeof intCurrentItemID === "number"
      ? lstItems.findIndex((objItem) => objItem.intItemID === intCurrentItemID)
      : intStartIndex;
    const intNextIndex = intCurrentIndex >= 0 ? intCurrentIndex + 1 : intStartIndex + 1;
    if (intNextIndex >= lstItems.length) return;
    const intNextPage = Math.floor(intNextIndex / intItemsPerPage) + 1;
    setIntItemPage(intNextPage);
  }

  function goToPreviousPage() {
    setIntItemPage((intPrev) => Math.max(1, intPrev - 1));
  }

  function goToNextPage() {
    setIntItemPage((intPrev) => Math.min(intItemPageCount, intPrev + 1));
  }

  if (blnLoading || blnRightsLoading) return <BlockingLoader blnOpen strLabel="Loading IT declaration detail..." />;
  if (!objDetail) return <Alert severity="error">{strError || "Declaration not found."}</Alert>;

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 0.9, borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)", color: "#f8fcff" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1}>
          <Stack spacing={0.6} alignItems="flex-start">
            <Button
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ color: "#e2e8f0", minHeight: 22, px: 0.5, textTransform: "none", "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" } }}
              onClick={() => objRouter.push("/payroll/it-declaration-review")}
              data-testid="it-declaration.review-detail.back.button"
            >
              Back
            </Button>
            <Typography sx={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fcff" }}>{objDetail.strEmployeeName} ({objDetail.strEmployeeCode})</Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.78rem" }}>
              FY: {objDetail.strFinancialYearCode} | Regime: {objDetail.strTaxRegime} | Declared: {objDetail.decDeclaredTotalAmount} | Approved: {objDetail.decApprovedTotalAmount} | Proof Pending: {objDetail.intProofPendingCount}
            </Typography>
          </Stack>
          <Stack spacing={0.6} alignItems={{ xs: "flex-start", md: "flex-end" }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <ITDeclarationStatusBadge strStatus={objDetail.strStatus} />
              <Button
                variant="text"
                size="small"
                onClick={() => setBlnAuditDialogOpen(true)}
                data-testid="it-declaration.review-detail.view-log.button"
                sx={{ textTransform: "none", color: "#e2e8f0", minWidth: "auto", px: 0.6 }}
              >
                View Log
              </Button>
            </Stack>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
              {blnCanStartReview ? <Button
                variant="outlined"
                onClick={() => void hrItDeclarationReviewService.startReview(objDetail.intDeclarationID).then(loadData)}
                data-testid="it-declaration.review-detail.start-review.button"
                sx={{
                  minHeight: 30,
                  borderRadius: "8px",
                  px: 1.8,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.76rem",
                  borderColor: "rgba(255,255,255,0.65)",
                  color: "#f8fcff",
                  "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.08)" },
                  "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.32)", color: "rgba(226,232,240,0.8)" },
                }}
              >
                Start Review
              </Button> : null}
              <ITDeclarationActionBar
                blnLocked={blnLocked}
                blnCanRelease={blnCanReleaseHeader}
                blnCanLock={blnCanLockHeader}
                blnCanApprove={blnCanApproveHeader}
                blnCanReject={blnCanRejectHeader}
                blnHeaderMode
                fnApproveAll={() => setStrConfirm("approve_all")}
                fnRejectHeader={() => setStrConfirm("reject")}
                fnRelease={() => setStrConfirm("release")}
                fnLock={() => setStrConfirm("lock")}
              />
            </Stack>
          </Stack>
        </Stack>
      </Paper>
      {strError ? <Alert severity="error">{strError}</Alert> : null}

      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
        <Typography sx={{ fontWeight: 800 }}>Items ({lstItems.length})</Typography>
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
          <Button variant="outlined" size="small" onClick={goToPreviousPage} disabled={intSafeItemPage <= 1} data-testid="it-declaration.review-detail.previous-page.button">Previous</Button>
          <Typography sx={{ fontSize: "0.82rem", color: "#64748b" }}>Page {intSafeItemPage} of {intItemPageCount}</Typography>
          <Button variant="outlined" size="small" onClick={goToNextPage} disabled={intSafeItemPage >= intItemPageCount} data-testid="it-declaration.review-detail.next-page.button">Next</Button>
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
        {lstVisibleItems.map((objItem, intIndex) => {
          const intCurrentItemID = objItem.intItemID ?? 0;
          const lstItemProofs = lstProofs.filter((objProof) => objProof.intItemID === intCurrentItemID);
          return (
          <ITDeclarationItemReviewPanel
            key={objItem.intItemID ?? `it-item-${intIndex}-${objItem.strSection}-${objItem.strInvestmentName}`}
            objItem={objItem}
            blnLocked={blnLocked || !blnItemActionsAllowedStatus}
            blnCanReview={blnCanReview}
            blnCanApprove={blnCanApprove}
            blnCanReject={blnCanReject}
            blnCanProofVerify={blnCanProofVerify}
            lstProofs={lstItemProofs}
            fnPreviewProof={(intProofID) => void previewProof(intProofID)}
            fnDownloadProof={(intProofID) => void downloadProof(intProofID)}
            fnAction={(strAction, objPayload) => handleItemAction(objItem.intItemID ?? 0, strAction, objPayload)}
          />
          );
        })}
      </Box>

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

      <Dialog open={Boolean(strConfirm)} onClose={() => setStrConfirm(null)} maxWidth="sm" fullWidth data-testid="it-declaration.review-detail.confirm.dialog">
        <DialogTitle>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Please confirm this action.</Typography>
          {(strConfirm === "reject" || strConfirm === "release") ? (
            <TextField fullWidth size="small" label="Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} multiline minRows={3} data-testid="it-declaration.review-detail.confirm.remarks.input" />
          ) : null}
          {strDialogError ? <Alert severity="error" sx={{ mt: 1 }}>{strDialogError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStrConfirm(null)} data-testid="it-declaration.review-detail.confirm.cancel.button">Cancel</Button>
          <Button variant="contained" onClick={() => void confirmAction()} data-testid="it-declaration.review-detail.confirm.submit.button">Confirm</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnAuditDialogOpen} onClose={() => setBlnAuditDialogOpen(false)} maxWidth="md" fullWidth data-testid="it-declaration.review-detail.audit.dialog">
        <DialogTitle>Audit Logs</DialogTitle>
        <DialogContent>
          {lstAudit.length === 0 ? (
            <Typography sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>No audit events found.</Typography>
          ) : (
            <Stack sx={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              <Stack direction="row" sx={{ backgroundColor: "#f8fafc", px: 1, py: 0.8, "& > div": { fontSize: "0.76rem", fontWeight: 800, color: "#334155" } }}>
                <div style={{ flex: "0 0 180px", minWidth: "180px" }}>Action</div>
                <div style={{ flex: "0 0 190px", minWidth: "190px" }}>Action By</div>
                <div style={{ flex: "0 0 260px", minWidth: "260px" }}>Action On</div>
                <div style={{ flex: "1 1 auto", minWidth: 0 }}>Remarks</div>
              </Stack>
              {lstAudit.map((objLog, intIndex) => (
                <Stack key={`${objLog.strAction}-${objLog.strActionOn}-${intIndex}`} direction="row" sx={{ px: 1, py: 0.7, borderTop: "1px solid #eef2f7", "& > div": { fontSize: "0.78rem", color: "#1f2937" } }}>
                  <div style={{ flex: "0 0 180px", minWidth: "180px" }}>{objLog.strAction}</div>
                  <div style={{ flex: "0 0 190px", minWidth: "190px" }}>{objLog.strActionBy || "-"}</div>
                  <div style={{ flex: "0 0 260px", minWidth: "260px" }}>{objLog.strActionOn || "-"}</div>
                  <div style={{ flex: "1 1 auto", minWidth: 0 }}>{objLog.strRemarks || "-"}</div>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnAuditDialogOpen(false)} data-testid="it-declaration.review-detail.audit.close.button">Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2200} onClose={() => setStrToast("")} message={strToast} />
    </Stack>
  );
}
