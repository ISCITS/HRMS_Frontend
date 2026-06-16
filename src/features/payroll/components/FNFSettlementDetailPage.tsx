"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
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
import type { FNFLineFormValues, FNFSettlementFormValues, FNFSettlementLineRecord, FNFSettlementRecord, FNFStatementRecord } from "@/features/payroll/types";

function toSettlementFormValues(objSettlement: FNFSettlementRecord): FNFSettlementFormValues {
  return {
    intEmployeeID: objSettlement.intEmployeeID,
    strEmployeeCode: objSettlement.strEmployeeCode || "",
    strSettlementNumber: objSettlement.strSettlementNumber || "",
    intPayrollRunID: objSettlement.intPayrollRunID || "",
    strExitType: objSettlement.strExitType || "resignation",
    strExitReason: objSettlement.strExitReason || "",
    dtResignationDate: objSettlement.dtResignationDate || "",
    dtLastWorkingDate: objSettlement.dtLastWorkingDate || "",
    dtSettlementDate: objSettlement.dtSettlementDate || "",
    dtSettlementMonth: objSettlement.dtSettlementMonth || "",
    decNoticePeriodDays: String(objSettlement.decNoticePeriodDays || 0),
    decNoticeServedDays: String(objSettlement.decNoticeServedDays || 0),
    decNoticeShortfallDays: String(objSettlement.decNoticeShortfallDays || 0),
    strCurrencyCode: objSettlement.strCurrencyCode || "INR",
    strRemarks: objSettlement.strRemarks || "",
  };
}

export default function FNFSettlementDetailPage({ intSettlementID }: { intSettlementID: number }) {
  const objRouter = useRouter();
  const [objSettlement, setObjSettlement] = useState<FNFSettlementRecord | null>(null);
  const [objStatement, setObjStatement] = useState<FNFStatementRecord | null>(null);
  const [objEditingLine, setObjEditingLine] = useState<FNFSettlementLineRecord | null>(null);
  const [objLineToDelete, setObjLineToDelete] = useState<FNFSettlementLineRecord | null>(null);
  const [dicEditingSettlement, setDicEditingSettlement] = useState<FNFSettlementFormValues | null>(null);
  const [blnLineDialogOpen, setBlnLineDialogOpen] = useState(false);
  const [strPendingAction, setStrPendingAction] = useState("");
  const [strReason, setStrReason] = useState("");
  const [strPaymentReference, setStrPaymentReference] = useState("");
  const [strPaymentMode, setStrPaymentMode] = useState("bank_transfer");
  const [strPaymentDate, setStrPaymentDate] = useState(new Date().toISOString().slice(0, 10));
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
    if (["release", "cancel", "mark-paid", "mark-recovered"].includes(strAction)) {
      setStrPendingAction(strAction);
      setStrReason("");
      setStrPaymentReference("");
      setStrPaymentMode("bank_transfer");
      setStrPaymentDate(new Date().toISOString().slice(0, 10));
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

  async function saveSettlementDetails() {
    if (!objSettlement || !dicEditingSettlement) return;
    if (!dicEditingSettlement.strExitType.trim() || !dicEditingSettlement.dtLastWorkingDate) {
      setStrError("Exit type and last working date are required.");
      return;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      setObjSettlement(await fnfSettlementService.updateSettlement(objSettlement.intID, dicEditingSettlement));
      setDicEditingSettlement(null);
      setStrSuccess("Settlement details updated.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update settlement details.");
    } finally {
      setBlnSaving(false);
    }
  }

  function updateSettlementField<TKey extends keyof FNFSettlementFormValues>(strKey: TKey, objValue: FNFSettlementFormValues[TKey]) {
    setDicEditingSettlement((dicCurrent) => dicCurrent ? { ...dicCurrent, [strKey]: objValue } : dicCurrent);
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
            <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements")} data-testid="payroll.fnf-settlement-detail.back.button">Back</Button>
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
                <Box sx={{ flex: 1 }}><Typography sx={{ color: "#64748b" }}>Status</Typography><Stack direction="row" spacing={1} alignItems="center"><FNFStatusBadge strStatus={objSettlement.strSettlementStatus} />{["locked", "paid", "recovered"].includes(objSettlement.strSettlementStatus) ? <Chip size="small" color="success" label="Visible in ESS" /> : null}</Stack></Box>
                {!blnReadOnly ? <Box sx={{ alignSelf: "flex-end" }}><Button className={styles.secondaryButton} startIcon={<EditRoundedIcon />} onClick={() => setDicEditingSettlement(toSettlementFormValues(objSettlement))} data-testid="payroll.fnf-settlement-detail.edit-details.button">Edit Details</Button></Box> : null}
              </Stack>
              <Box className={styles.fnfWorkflowGrid}>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 1: Employee</Typography>
                  <Typography className={styles.fnfWorkflowValue}>{objSettlement.strEmployeeCode || objSettlement.intEmployeeID}</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>{objSettlement.strDepartmentName || "Department not set"}</Typography>
                </Box>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 2: Resignation Details</Typography>
                  <Typography className={styles.fnfWorkflowValue}>LWD {objSettlement.dtLastWorkingDate}</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>Resigned {objSettlement.dtResignationDate || "-"} | Settles {objSettlement.dtSettlementDate || "-"}</Typography>
                </Box>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 3: Notice Pay</Typography>
                  <Typography className={styles.fnfWorkflowValue}>{objSettlement.decNoticeShortfallDays || 0} days shortfall</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>Required {objSettlement.decNoticePeriodDays || 0} | Served {objSettlement.decNoticeServedDays || 0}</Typography>
                </Box>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 4: Work Days</Typography>
                  <Typography className={styles.fnfWorkflowValue}>Payroll run {objSettlement.intPayrollRunID || "-"}</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>Settlement month {objSettlement.dtSettlementMonth || "-"}</Typography>
                </Box>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 5: Leave Encashment</Typography>
                  <Typography className={styles.fnfWorkflowValue}>{formatCurrency((objSettlement.lstLines || []).filter((line) => line.strCalculationBasis?.includes("leave") || line.strLineCode.includes("LEAVE")).reduce((decTotal, line) => decTotal + (line.decAmount || 0), 0))}</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>Editable below before approval or lock</Typography>
                </Box>
                <Box className={styles.fnfWorkflowPanel}>
                  <Typography className={styles.fnfWorkflowTitle}>Step 6: Remarks</Typography>
                  <Typography className={styles.fnfWorkflowValue}>{objSettlement.strRemarks || "-"}</Typography>
                  <Typography className={styles.fnfWorkflowMeta}>Final notes and statutory review</Typography>
                </Box>
              </Box>
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
              <FNFLeaveEncashmentPanel objSettlement={objSettlement} blnReadOnly={blnReadOnly} onAdd={() => { setObjEditingLine(null); setBlnLineDialogOpen(true); }} onEdit={(line) => { setObjEditingLine(line); setBlnLineDialogOpen(true); }} onDelete={setObjLineToDelete} />
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
      <Dialog open={Boolean(dicEditingSettlement)} onClose={() => setDicEditingSettlement(null)} fullWidth maxWidth="md">
        <DialogTitle>Edit Settlement Details</DialogTitle>
        <DialogContent>
          {dicEditingSettlement ? (
            <Box className={styles.fnfEditDetailsGrid} sx={{ pt: 1 }}>
              <TextField label="Settlement Number" value={dicEditingSettlement.strSettlementNumber} onChange={(e) => updateSettlementField("strSettlementNumber", e.target.value)} fullWidth />
              <TextField label="Payroll Run ID" type="number" value={dicEditingSettlement.intPayrollRunID} disabled fullWidth />
              <TextField label="Exit Type" required value={dicEditingSettlement.strExitType} onChange={(e) => updateSettlementField("strExitType", e.target.value)} fullWidth />
              <TextField label="Resignation Date" type="date" InputLabelProps={{ shrink: true }} value={dicEditingSettlement.dtResignationDate} onChange={(e) => updateSettlementField("dtResignationDate", e.target.value)} fullWidth />
              <TextField label="Last Working Date" required type="date" InputLabelProps={{ shrink: true }} value={dicEditingSettlement.dtLastWorkingDate} onChange={(e) => updateSettlementField("dtLastWorkingDate", e.target.value)} fullWidth />
              <TextField label="Settlement Date" type="date" InputLabelProps={{ shrink: true }} value={dicEditingSettlement.dtSettlementDate} onChange={(e) => updateSettlementField("dtSettlementDate", e.target.value)} fullWidth />
              <TextField label="Settlement Month" type="date" InputLabelProps={{ shrink: true }} value={dicEditingSettlement.dtSettlementMonth} onChange={(e) => updateSettlementField("dtSettlementMonth", e.target.value)} fullWidth />
              <TextField label="Currency" value={dicEditingSettlement.strCurrencyCode} onChange={(e) => updateSettlementField("strCurrencyCode", e.target.value)} fullWidth />
              <TextField label="Notice Period Days" type="number" value={dicEditingSettlement.decNoticePeriodDays} onChange={(e) => updateSettlementField("decNoticePeriodDays", e.target.value)} fullWidth />
              <TextField label="Notice Served Days" type="number" value={dicEditingSettlement.decNoticeServedDays} onChange={(e) => updateSettlementField("decNoticeServedDays", e.target.value)} fullWidth />
              <TextField label="Notice Shortfall Days" type="number" value={dicEditingSettlement.decNoticeShortfallDays} onChange={(e) => updateSettlementField("decNoticeShortfallDays", e.target.value)} fullWidth />
              <TextField label="Exit Reason" value={dicEditingSettlement.strExitReason} onChange={(e) => updateSettlementField("strExitReason", e.target.value)} fullWidth multiline minRows={2} />
              <TextField className={styles.fnfEditDetailsFull} label="Remarks" value={dicEditingSettlement.strRemarks} onChange={(e) => updateSettlementField("strRemarks", e.target.value)} fullWidth multiline minRows={2} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button size="small" variant="text" onClick={() => setDicEditingSettlement(null)} disabled={blnSaving}>Cancel</Button>
          <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => saveSettlementDetails()} disabled={blnSaving}>Save Details</Button>
        </DialogActions>
      </Dialog>
      <FNFSettlementLineEditor blnOpen={blnLineDialogOpen} objLine={objEditingLine} onClose={() => setBlnLineDialogOpen(false)} onSave={saveLine} />
      <Dialog open={Boolean(objLineToDelete)} onClose={() => setObjLineToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Settlement Line</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete {objLineToDelete?.strLineName || "this settlement line"}?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button size="small" variant="text" onClick={() => setObjLineToDelete(null)} disabled={blnSaving} data-testid="payroll.fnf-settlement-detail.delete-line.cancel.button">Cancel</Button>
          <Button size="small" variant="contained" color="error" onClick={confirmDeleteLine} disabled={blnSaving} data-testid="payroll.fnf-settlement-detail.delete-line.confirm.button">Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(strPendingAction)} onClose={() => setStrPendingAction("")} fullWidth maxWidth="sm">
        <DialogTitle>{["mark-paid", "mark-recovered"].includes(strPendingAction) ? "Payment / Recovery Details" : "Reason Required"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{["mark-paid", "mark-recovered"].includes(strPendingAction) ? <><TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={strPaymentDate} onChange={(e) => setStrPaymentDate(e.target.value)} fullWidth data-testid="payroll.fnf-settlement-detail.payment-date.input" /><TextField select label="Mode" value={strPaymentMode} onChange={(e) => setStrPaymentMode(e.target.value)} fullWidth data-testid="payroll.fnf-settlement-detail.payment-mode.select"><MenuItem value="bank_transfer">Bank Transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="cash">Cash</MenuItem><MenuItem value="adjustment">Adjustment</MenuItem><MenuItem value="other">Other</MenuItem></TextField><TextField label="Reference Number" value={strPaymentReference} onChange={(e) => setStrPaymentReference(e.target.value)} fullWidth data-testid="payroll.fnf-settlement-detail.payment-reference.input" /></> : null}<TextField label="Reason / Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} fullWidth multiline minRows={3} data-testid="payroll.fnf-settlement-detail.reason-remarks.input" /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setStrPendingAction("")} data-testid="payroll.fnf-settlement-detail.action-dialog.close.button">Close</Button><Button variant="contained" onClick={() => { if (["mark-paid", "mark-recovered"].includes(strPendingAction) && !strPaymentReference.trim()) { setStrError("Reference number is required."); return; } if (["release", "cancel"].includes(strPendingAction) && !strReason.trim()) { setStrError("Reason is required."); return; } handleAction(strPendingAction, { strRemarks: strReason, strPaymentReferenceNo: strPaymentReference, strPaymentMode, dtPaymentDate: strPaymentDate }).catch(() => undefined); }} data-testid="payroll.fnf-settlement-detail.action-dialog.confirm.button">Confirm</Button></DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? "Loading settlement..." : "Saving..."} />
    </Box>
  );
}
