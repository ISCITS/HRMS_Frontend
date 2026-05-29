"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BlockingLoader from "@/components/shared/BlockingLoader";
import FNFActionBar from "@/features/payroll/components/FNFActionBar";
import FNFSettlementLineEditor from "@/features/payroll/components/FNFSettlementLineEditor";
import {
  FNFAuditTimeline,
  FNFGratuityPanel,
  FNFLeaveEncashmentPanel,
  FNFNoticePayPanel,
  FNFReimbursementPanel,
  FNFRecoveryPanel,
  FNFSettlementCalculationPanel,
  FNFStatementPreview,
  formatCurrency,
} from "@/features/payroll/components/FNFSettlementPanels";
import FNFStatusBadge from "@/features/payroll/components/FNFStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { fnfSettlementService } from "@/features/payroll/services/fnfSettlementService";
import type { FNFLineFormValues, FNFSettlementLineRecord, FNFSettlementRecord, FNFStatementRecord } from "@/features/payroll/types";

export default function FNFSettlementDetailPage({ intSettlementID }: { intSettlementID: number }) {
  const objRouter = useRouter();
  const [objSettlement, setObjSettlement] = useState<FNFSettlementRecord | null>(null);
  const [objStatement, setObjStatement] = useState<FNFStatementRecord | null>(null);
  const [objEditingLine, setObjEditingLine] = useState<FNFSettlementLineRecord | null>(null);
  const [objLineToDelete, setObjLineToDelete] = useState<FNFSettlementLineRecord | null>(null);
  const [blnLineDialogOpen, setBlnLineDialogOpen] = useState(false);
  const [strPendingAction, setStrPendingAction] = useState("");
  const [strReason, setStrReason] = useState("");
  const [strPaymentReference, setStrPaymentReference] = useState("");
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const blnReadOnly = useMemo(() => objSettlement ? ["approved", "locked", "paid", "recovered", "cancelled"].includes(objSettlement.strSettlementStatus) : true, [objSettlement]);

  async function loadSettlement(blnShowLoader = true) {
    if (blnShowLoader) setBlnLoading(true);
    setStrError("");
    try {
      setObjSettlement(await fnfSettlementService.getSettlement(intSettlementID));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load FNF settlement.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { loadSettlement().catch(() => undefined); }, [intSettlementID]);

  function openAction(strAction: string) {
    if (["release", "cancel", "mark-paid"].includes(strAction)) {
      setStrPendingAction(strAction);
      setStrReason("");
      setStrPaymentReference("");
      return;
    }
    handleAction(strAction).catch(() => undefined);
  }

  async function handleAction(strAction: string, objBody?: unknown) {
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      if (strAction === "statement") {
        setObjStatement(await fnfSettlementService.getStatement(intSettlementID));
        setStrSuccess("Statement generated.");
      } else {
        setObjSettlement(await fnfSettlementService.action(intSettlementID, strAction, objBody));
        setStrSuccess("Action completed.");
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to complete action.");
    } finally {
      setBlnSaving(false);
      setStrPendingAction("");
    }
  }

  async function saveLine(dicValues: FNFLineFormValues) {
    if (objEditingLine) {
      await fnfSettlementService.updateLine(intSettlementID, objEditingLine.intID, dicValues);
    } else {
      await fnfSettlementService.addLine(intSettlementID, dicValues);
    }
    await loadSettlement(false);
  }

  async function confirmDeleteLine() {
    if (!objLineToDelete) return;
    setBlnSaving(true);
    try {
      await fnfSettlementService.deleteLine(intSettlementID, objLineToDelete.intID);
      await loadSettlement(false);
      setObjLineToDelete(null);
      setStrSuccess("Settlement line deleted.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to delete line.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (!objSettlement && !blnLoading) return <Alert severity="error">{strError || "Settlement not found."}</Alert>;

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box sx={{ p: 1 }}><Typography className={styles.breadcrumbs}>Payroll / Full and Final</Typography><Typography className={styles.title} sx={{ fontSize: "1.2rem" }}>Full and Final Settlement #{objSettlement?.strSettlementNumber || objSettlement?.intID}</Typography></Box>
          <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
            <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements")}>Back</Button>
            {objSettlement ? <FNFActionBar objSettlement={objSettlement} blnBusy={blnSaving} onAction={openAction} /> : null}
          </Stack>
        </Box>
      </Box>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {objSettlement ? (
        <Box className={styles.tableCard}>
          <Box className={styles.detailScrollCard}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ borderBottom: "1px solid #d9e6ef", pb: 2 }}>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Employee</Typography><Typography sx={{ fontWeight: 800 }}>{objSettlement.intEmployeeID}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Exit Type</Typography><Typography sx={{ fontWeight: 800 }}>{objSettlement.strExitType}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Last Working Date</Typography><Typography sx={{ fontWeight: 800 }}>{objSettlement.dtLastWorkingDate}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Status</Typography><FNFStatusBadge strStatus={objSettlement.strSettlementStatus} /></Box>
              </Stack>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Total Earnings</Typography><Typography sx={{ color: "#16a34a", fontWeight: 900 }}>{formatCurrency(objSettlement.decTotalEarnings)}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Deductions/Recoveries</Typography><Typography sx={{ color: "#dc2626", fontWeight: 900 }}>{formatCurrency((objSettlement.decTotalDeductions || 0) + (objSettlement.decTotalRecoveries || 0))}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Tax/Statutory</Typography><Typography sx={{ color: "#ea580c", fontWeight: 900 }}>{formatCurrency((objSettlement.decTotalTaxDeducted || 0) + (objSettlement.decTotalStatutoryDeduction || 0))}</Typography></Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: "#64748b" }}>Net Settlement</Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Net Payable</Typography><Typography sx={{ color: "#2563eb", fontWeight: 900 }}>{formatCurrency(objSettlement.decNetPayableAmount)}</Typography></Box>
                    <Box><Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>Net Recoverable</Typography><Typography sx={{ color: "#dc2626", fontWeight: 900 }}>{formatCurrency(objSettlement.decNetRecoverableAmount)}</Typography></Box>
                  </Stack>
                </Box>
              </Stack>
              <FNFSettlementCalculationPanel objSettlement={objSettlement} blnReadOnly={blnReadOnly} onAdd={() => { setObjEditingLine(null); setBlnLineDialogOpen(true); }} onEdit={(line) => { setObjEditingLine(line); setBlnLineDialogOpen(true); }} onDelete={setObjLineToDelete} />
              <FNFLeaveEncashmentPanel objSettlement={objSettlement} />
              <FNFNoticePayPanel objSettlement={objSettlement} />
              <FNFGratuityPanel objSettlement={objSettlement} />
              <FNFRecoveryPanel objSettlement={objSettlement} />
              <FNFReimbursementPanel objSettlement={objSettlement} />
              <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 2 }}><Typography sx={{ fontWeight: 800 }}>Tax / Statutory Summary</Typography><Typography sx={{ color: "#64748b" }}>Final TDS {formatCurrency(objSettlement.decFinalTdsAmount)} | Statutory {formatCurrency(objSettlement.decTotalStatutoryDeduction)}</Typography></Box>
              <FNFStatementPreview objStatement={objStatement} />
              <FNFAuditTimeline lstAudit={objSettlement.lstAudit || []} />
            </Stack>
          </Box>
        </Box>
      ) : null}
      <FNFSettlementLineEditor blnOpen={blnLineDialogOpen} objLine={objEditingLine} onClose={() => setBlnLineDialogOpen(false)} onSave={saveLine} />
      <Dialog open={Boolean(objLineToDelete)} onClose={() => setObjLineToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Settlement Line</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete {objLineToDelete?.strLineName || "this settlement line"}?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button size="small" variant="text" onClick={() => setObjLineToDelete(null)} disabled={blnSaving}>Cancel</Button>
          <Button size="small" variant="contained" color="error" onClick={confirmDeleteLine} disabled={blnSaving}>Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(strPendingAction)} onClose={() => setStrPendingAction("")} fullWidth maxWidth="sm">
        <DialogTitle>{strPendingAction === "mark-paid" ? "Payment Reference" : "Reason Required"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{strPendingAction === "mark-paid" ? <TextField label="Payment Reference" value={strPaymentReference} onChange={(e) => setStrPaymentReference(e.target.value)} fullWidth /> : null}<TextField label="Reason / Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} fullWidth multiline minRows={3} /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setStrPendingAction("")}>Close</Button><Button variant="contained" onClick={() => { if (strPendingAction === "mark-paid" && !strPaymentReference.trim()) { setStrError("Payment reference is required."); return; } if (["release", "cancel"].includes(strPendingAction) && !strReason.trim()) { setStrError("Reason is required."); return; } handleAction(strPendingAction, { strRemarks: strReason, strPaymentReferenceNo: strPaymentReference }).catch(() => undefined); }}>Confirm</Button></DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? "Loading settlement..." : "Saving..."} />
    </Box>
  );
}
