"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { type InputHTMLAttributes, useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import ReimbursementActionBar from "@/features/reimbursements/components/ReimbursementActionBar";
import ReimbursementAuditTimeline from "@/features/reimbursements/components/ReimbursementAuditTimeline";
import ReimbursementClaimSummaryCard from "@/features/reimbursements/components/ReimbursementClaimSummaryCard";
import ReimbursementItemReviewPanel from "@/features/reimbursements/components/ReimbursementItemReviewPanel";
import ReimbursementStatusBadge from "@/features/reimbursements/components/ReimbursementStatusBadge";
import { formatDateLabel } from "@/features/reimbursements/formatters";
import { isHrReimbursementTerminal } from "@/features/reimbursements/hrRules";
import { payrollReimbursementService, type ReimbursementAuditRecord } from "@/features/reimbursements/services/payrollReimbursementService";
import { reimbursementService } from "@/features/reimbursements/services/reimbursementService";
import { employeePayrollInputService } from "@/features/payroll/services/employeePayrollInputService";
import type { PayrollRunOption } from "@/features/payroll/types";
import type { ReimbursementClaimDto, ReimbursementClaimItemDto, ReimbursementOptionsDto } from "@/features/reimbursements/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type DialogAction =
  | "approve_claim"
  | "reject_claim"
  | "release_claim"
  | "push_payroll"
  | "reject_item"
  | "proof_pending"
  | "reject_proof"
  | null;

const objEmptyOptions: ReimbursementOptionsDto = { lstCategories: [], lstSalaryComponents: [] };
const lstReimbursementReviewModuleCodes = ["REIMBURSEMENT_REVIEW", "REIMBURSEMENTS_REVIEW", "PAYROLL_REIMBURSEMENT", "PAYROLL_REIMBURSEMENTS"];

function getErrorMessage(objError: unknown) {
  return objError instanceof Error ? objError.message : "Unable to process reimbursement review action.";
}

export default function ReimbursementReviewDetailPage({ intClaimID }: { intClaimID: number }) {
  const objRouter = useRouter();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstReimbursementReviewModuleCodes);
  const [objClaim, setObjClaim] = useState<ReimbursementClaimDto | null>(null);
  const [lstAudit, setLstAudit] = useState<ReimbursementAuditRecord[]>([]);
  const [objOptions, setObjOptions] = useState<ReimbursementOptionsDto>(objEmptyOptions);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnBusy, setBlnBusy] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [strPayrollRunID, setStrPayrollRunID] = useState("");
  const [strDialogError, setStrDialogError] = useState("");
  const [lstPayrollRuns, setLstPayrollRuns] = useState<PayrollRunOption[]>([]);
  const [blnPayrollRunsLoading, setBlnPayrollRunsLoading] = useState(false);
  const [blnConfirmed, setBlnConfirmed] = useState(false);
  const [strDialogAction, setStrDialogAction] = useState<DialogAction>(null);
  const [objSelectedItem, setObjSelectedItem] = useState<ReimbursementClaimItemDto | null>(null);
  const [intSelectedProofID, setIntSelectedProofID] = useState<number | null>(null);


  const lstEditablePayrollRuns = useMemo(
    () => lstPayrollRuns.filter((objRun) => ["Open", "Submitted"].includes(objRun.strStatus) && !objRun.blnIsLocked),
    [lstPayrollRuns]
  );
  const blnCanView = canViewAny() || canDoAny("list") || canDoAny("review");
  const blnCanReview = canDoAny("review") || canDoAny("edit");
  const blnCanApprove = canDoAny("approve");
  const blnCanReject = canDoAny("reject");
  const blnCanRelease = canDoAny("release");
  const blnCanLock = canDoAny("lock");
  const blnCanPush = canDoAny("submit") || canDoAny("push") || canDoAny("export");
  const blnActionsDisabled = !objClaim || isHrReimbursementTerminal(objClaim.strClaimStatus) || blnBusy || !blnCanReview;

  async function loadDetail() {
    if (!blnCanView) {
      setBlnLoading(false);
      return;
    }

    // Purpose: Loads claim, option labels, and audit rows needed by the HR review workspace.
    setBlnLoading(true);
    setStrError("");
    try {
      const [objLoadedClaim, objLoadedOptions, lstLoadedAudit] = await Promise.all([
        payrollReimbursementService.getClaim(intClaimID),
        reimbursementService.getOptions().catch(() => objEmptyOptions),
        payrollReimbursementService.listAudit(intClaimID).catch(() => []),
      ]);
      setObjClaim(objLoadedClaim);
      setObjOptions(objLoadedOptions);
      setLstAudit(lstLoadedAudit);
    } catch (objError) {
      setStrError(getErrorMessage(objError));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }

    void loadDetail();
  }, [intClaimID, blnRightsLoading, blnCanView]);

  const dicCategoryNameByID = useMemo(
    () => new Map(objOptions.lstCategories.map((objCategory) => [objCategory.intID, objCategory.strCategoryName])),
    [objOptions.lstCategories]
  );

  function openReasonDialog(strAction: Exclude<DialogAction, null>, objItem?: ReimbursementClaimItemDto, intProofID?: number) {
    // Purpose: Opens a shared reason/confirmation dialog for actions that need reviewer explanation.
    setStrDialogAction(strAction);
    setObjSelectedItem(objItem ?? null);
    setIntSelectedProofID(intProofID ?? null);
    setStrDialogError("");
    setStrRemarks("");
    setStrPayrollRunID("");
    setBlnConfirmed(false);
    if (strAction === "push_payroll") {
      void loadPayrollRunOptions();
    }
  }

  async function loadPayrollRunOptions() {
    setBlnPayrollRunsLoading(true);
    setStrDialogError("");
    try {
      if (!objClaim) return;
      const objFormOptions = await employeePayrollInputService.getFormOptions({ intEmployeeID: objClaim.intEmployeeID ?? null });
      const lstEligibleRuns = objFormOptions.lstPayrollRuns.filter((objRun) => {
        const strScopeType = objRun.strScopeType ?? "All";
        return strScopeType !== "SelectedEmployee" || objRun.intScopedEmployeeID === objClaim.intEmployeeID;
      });
      const lstEditableRuns = lstEligibleRuns.filter((objRun) => ["Open", "Submitted"].includes(objRun.strStatus) && !objRun.blnIsLocked);
      setLstPayrollRuns(lstEligibleRuns);
      const objClaimRun = lstEditableRuns.find((objRun) => objRun.intID === objClaim?.intPayrollRunID);
      const objDefaultRun = objClaimRun ?? lstEditableRuns[0] ?? null;
      setStrPayrollRunID(objDefaultRun ? String(objDefaultRun.intID) : "");
      if (!objDefaultRun) {
        setStrDialogError("No Open or Submitted unlocked payroll run is available for this claim employee.");
      }
    } catch (objError) {
      setStrDialogError(getErrorMessage(objError));
      setLstPayrollRuns([]);
      setStrPayrollRunID("");
    } finally {
      setBlnPayrollRunsLoading(false);
    }
  }

  function closeDialog() {
    setStrDialogAction(null);
    setObjSelectedItem(null);
    setIntSelectedProofID(null);
    setStrDialogError("");
    setStrRemarks("");
    setStrPayrollRunID("");
    setBlnConfirmed(false);
  }

  async function runAction(fnAction: () => Promise<ReimbursementClaimDto>, strMessage: string) {
    // Purpose: Runs a workflow mutation, refreshes claim state, and reloads audit history.
    setBlnBusy(true);
    setStrError("");
    try {
      const objUpdatedClaim = await fnAction();
      setObjClaim(objUpdatedClaim);
      setLstAudit(await payrollReimbursementService.listAudit(objUpdatedClaim.intID).catch(() => []));
      setStrSuccess(strMessage);
      closeDialog();
    } catch (objError) {
      const strMessage = getErrorMessage(objError);
      if (strDialogAction) {
        setStrDialogError(strMessage);
      } else {
        setStrError(strMessage);
      }
    } finally {
      setBlnBusy(false);
    }
  }

  async function handleActionBar(strAction: "start" | "approve" | "reject" | "release" | "lock" | "push") {
    if (!objClaim) return;
    if (strAction === "start") await runAction(() => payrollReimbursementService.startReview(objClaim.intID), "Review started.");
    if (strAction === "approve") openReasonDialog("approve_claim");
    if (strAction === "reject") openReasonDialog("reject_claim");
    if (strAction === "release") openReasonDialog("release_claim");
    if (strAction === "lock") await runAction(() => payrollReimbursementService.lockClaim(objClaim.intID), "Claim locked for payroll.");
    if (strAction === "push") openReasonDialog("push_payroll");
  }

  async function approveItem(objItem: ReimbursementClaimItemDto, decApprovedAmount: number, strItemRemarks: string) {
    // Purpose: Enforces partial approval remarks before calling the HR item approval endpoint.
    if (!objClaim) return;
    if (decApprovedAmount < objItem.decClaimedAmount && !strItemRemarks.trim()) {
      setStrError("Partial approval requires remarks.");
      return;
    }
    await runAction(
      () => payrollReimbursementService.approveItem(objClaim.intID, objItem.intID, { decApprovedAmount, strRemarks: strItemRemarks || null }),
      "Item approval saved."
    );
  }

  async function verifyProof(intProofID: number) {
    if (!objClaim) return;
    await runAction(() => payrollReimbursementService.verifyProof(objClaim.intID, intProofID, { strRemarks: "Proof verified." }), "Proof verified.");
  }

  async function submitDialogAction() {
    // Purpose: Submits the selected dialog action after required reason/confirmation checks.
    if (!objClaim || !strDialogAction) return;
    setStrDialogError("");
    const strCleanRemarks = strRemarks.trim();
    if (["reject_claim", "release_claim", "reject_item", "reject_proof"].includes(strDialogAction) && !strCleanRemarks) {
      setStrDialogError("Reason is required for this action.");
      return;
    }
    if (strDialogAction === "push_payroll" && !blnConfirmed) {
      setStrDialogError("Confirm payroll push before continuing.");
      return;
    }
    if (strDialogAction === "push_payroll" && !strPayrollRunID) {
      setStrDialogError("Select an Open or Submitted unlocked payroll run before continuing.");
      return;
    }
    if (strDialogAction === "approve_claim") await runAction(() => payrollReimbursementService.approveClaim(objClaim.intID, { strRemarks: strCleanRemarks || null }), "Claim approved.");
    if (strDialogAction === "reject_claim") await runAction(() => payrollReimbursementService.rejectClaim(objClaim.intID, { strRemarks: strCleanRemarks }), "Claim rejected.");
    if (strDialogAction === "release_claim") await runAction(() => payrollReimbursementService.releaseClaim(objClaim.intID, { strRemarks: strCleanRemarks }), "Claim released to employee.");
    if (strDialogAction === "push_payroll") await runAction(() => payrollReimbursementService.pushToPayroll(objClaim.intID, { intPayrollRunID: strPayrollRunID ? Number(strPayrollRunID) : null, strRemarks: strCleanRemarks || null }), "Claim pushed to payroll.");
    if (strDialogAction === "reject_item" && objSelectedItem) await runAction(() => payrollReimbursementService.rejectItem(objClaim.intID, objSelectedItem.intID, { strRemarks: strCleanRemarks }), "Item rejected.");
    if (strDialogAction === "proof_pending" && objSelectedItem) await runAction(() => payrollReimbursementService.markProofPending(objClaim.intID, objSelectedItem.intID, { strRemarks: strCleanRemarks || null }), "Item marked proof pending.");
    if (strDialogAction === "reject_proof" && intSelectedProofID) await runAction(() => payrollReimbursementService.rejectProof(objClaim.intID, intSelectedProofID, { strRemarks: strCleanRemarks }), "Proof rejected.");
  }

  const strDialogTitle = {
    approve_claim: "Approve Claim",
    reject_claim: "Reject Claim",
    release_claim: "Release Claim",
    push_payroll: "Push to Payroll",
    reject_item: "Reject Item",
    proof_pending: "Mark Proof Pending",
    reject_proof: "Reject Proof",
  }[strDialogAction || "approve_claim"];

  return (
    <Stack spacing={1.4}>
      <BlockingLoader blnOpen={blnLoading || blnRightsLoading} strLabel="Loading reimbursement review..." />
      <Paper sx={{ p: 1.35, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={() => objRouter.push("/payroll/reimbursements")} aria-label="Back to reimbursement review" data-testid="reimbursements.review-detail.back.icon-button"><ArrowBackRoundedIcon fontSize="small" /></IconButton>
            <Box>
              <Typography sx={{ fontWeight: 900, color: "#0f172a", fontSize: "1.08rem" }}>{objClaim?.strClaimCode || `Claim #${intClaimID}`}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{objClaim ? `${objClaim.strClaimTitle || "-"} | ${formatDateLabel(objClaim.dtClaimDate)}` : "Review reimbursement claim"}</Typography>
            </Box>
          </Stack>
          {objClaim ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <ReimbursementStatusBadge strStatus={objClaim.strClaimStatus} />
              <ReimbursementActionBar
                objClaim={objClaim}
                blnBusy={blnBusy}
                blnCanStart={blnCanReview}
                blnCanApprove={blnCanApprove}
                blnCanReject={blnCanReject}
                blnCanRelease={blnCanRelease}
                blnCanLock={blnCanLock}
                blnCanPush={blnCanPush}
                onAction={(strAction) => void handleActionBar(strAction)}
              />
            </Stack>
          ) : null}
        </Stack>
      </Paper>

      {strRightsError ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{strRightsError}</Alert> : null}
      {!blnCanView ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>Reimbursement review access is not available for your user group.</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")} sx={{ borderRadius: "8px" }}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")} sx={{ borderRadius: "8px" }}>{strSuccess}</Alert> : null}
      {objClaim?.strReviewerRemarks ? <Alert severity={objClaim.strClaimStatus === "rejected" ? "error" : "info"} sx={{ borderRadius: "8px" }}>{objClaim.strReviewerRemarks}</Alert> : null}

      {objClaim ? <ReimbursementClaimSummaryCard objClaim={objClaim} /> : null}

      <Grid container spacing={1.2}>
        <Grid item xs={12} lg={8}>
          <Stack spacing={1}>
            {(objClaim?.lstItems ?? []).map((objItem) => (
              <ReimbursementItemReviewPanel
                key={objItem.intID}
                objItem={objItem}
                strCategoryName={objItem.intReimbursementCategoryID ? dicCategoryNameByID.get(objItem.intReimbursementCategoryID) : null}
                blnActionsDisabled={blnActionsDisabled}
                blnCanApprove={blnCanApprove}
                blnCanReject={blnCanReject}
                blnCanProofReview={blnCanReview}
                onApprove={(objNextItem, decApprovedAmount, strItemRemarks) => void approveItem(objNextItem, decApprovedAmount, strItemRemarks)}
                onReject={(objNextItem) => openReasonDialog("reject_item", objNextItem)}
                onProofPending={(objNextItem) => openReasonDialog("proof_pending", objNextItem)}
                onVerifyProof={(intProofID) => void verifyProof(intProofID)}
                onRejectProof={(intProofID) => openReasonDialog("reject_proof", undefined, intProofID)}
              />
            ))}
            {objClaim && (objClaim.lstItems ?? []).length === 0 ? <Alert severity="info">No claim items found.</Alert> : null}
          </Stack>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 1.2, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
            <Typography sx={{ fontWeight: 900, color: "#0f172a", mb: 1 }}>Audit Timeline</Typography>
            <ReimbursementAuditTimeline lstAudit={lstAudit} />
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={Boolean(strDialogAction)} onClose={closeDialog} maxWidth="sm" fullWidth data-testid="reimbursements.review-detail.action.dialog">
        <DialogTitle>{strDialogTitle}</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.2}>
            {strDialogError ? <Alert severity="error" sx={{ borderRadius: "8px" }}>{strDialogError}</Alert> : null}
            {strDialogAction === "push_payroll" ? (
              <>
                <TextField
                  select
                  size="small"
                  label="Target payroll run"
                  value={strPayrollRunID}
                  onChange={(objEvent) => setStrPayrollRunID(objEvent.target.value)}
                  disabled={blnPayrollRunsLoading || lstEditablePayrollRuns.length === 0}
                  helperText={blnPayrollRunsLoading ? "Loading payroll runs..." : "Only Open or Submitted unlocked runs for this claim employee are listed."}
                  data-testid="reimbursements.review-detail.target-payroll-run.select"
                >
                  <MenuItem value="" disabled>Select payroll run</MenuItem>
                  {lstEditablePayrollRuns.map((objRun) => (
                    <MenuItem key={objRun.intID} value={String(objRun.intID)}>
                      {objRun.strCode} ({objRun.strStatus})
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel control={<Checkbox checked={blnConfirmed} onChange={(objEvent) => setBlnConfirmed(objEvent.target.checked)} inputProps={{ "data-testid": "reimbursements.review-detail.confirm-payroll.checkbox" } as InputHTMLAttributes<HTMLInputElement>} />} label="I confirm this reimbursement should be pushed to payroll input." />
              </>
            ) : null}
            <TextField fullWidth multiline minRows={3} label={["reject_claim", "release_claim", "reject_item", "reject_proof"].includes(strDialogAction || "") ? "Reason" : "Remarks"} value={strRemarks} onChange={(objEvent) => setStrRemarks(objEvent.target.value)} data-testid="reimbursements.review-detail.remarks.input" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} data-testid="reimbursements.review-detail.action.cancel.button">Cancel</Button>
          <Button variant="contained" onClick={() => void submitDialogAction()} disabled={blnBusy || blnPayrollRunsLoading} data-testid="reimbursements.review-detail.action.continue.button">Continue</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
