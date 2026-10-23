"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DetailPageHeader } from "@/components/master/MasterListUi";
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
import type { FNFCalculationValidation, FNFLineFormValues, FNFSettlementFormValues, FNFSettlementLineRecord, FNFSettlementRecord, FNFStatementRecord } from "@/features/payroll/types";
import { useFNFRights } from "@/features/payroll/hooks/useFNFRights";
import { printPayslipHtml } from "@/features/payroll/utils/payslipDocument";

function formatDate(strValue?: string | null) {
  if (!strValue) return "-";
  const objDate = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonth(strValue: string) {
  const objDate = new Date(`${strValue.slice(0, 7)}-01T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : objDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatLabel(strValue?: string | null) {
  return strValue ? strValue.replace(/_/g, " ").replace(/\b\w/g, (strChar) => strChar.toUpperCase()) : "-";
}

function toSettlementFormValues(objSettlement: FNFSettlementRecord): FNFSettlementFormValues {
  return {
    intEmployeeID: objSettlement.intEmployeeID,
    strEmployeeCode: objSettlement.strEmployeeCode || "",
    strSettlementNumber: objSettlement.strSettlementNumber || "",
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

export default function FNFSettlementDetailPage({ strSettlementID }: { /** record_uuid from the URL; the internal id is never routed on. */ strSettlementID: string }) {
  const objRouter = useRouter();
  const { can } = useFNFRights();
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
  const blnCanEditDetails = can("edit");
  // Lines can be added/changed only by users with the Edit right, and only while editable.
  const blnLinesReadOnly = blnReadOnly || !blnCanEditDetails;
  const lstValidations = useMemo(() => ((objSettlement?.objCalculationSnapshot?.validations as FNFCalculationValidation[] | undefined) || []), [objSettlement]);
  const blnHasBlockingValidation = lstValidations.some((dicValidation) => dicValidation.severity === "blocking");
  const blnShowValidations = Boolean(objSettlement && ["calculated", "released", "under_review"].includes(objSettlement.strSettlementStatus));
  const lstSalaryMonths = ((objSettlement?.objCalculationSnapshot?.salary_months as { month: string }[] | undefined) || []).map((dicMonth) => dicMonth.month.slice(0, 7));
  const objClosure = objSettlement?.objCalculationSnapshot?.closure as
    | { tax_ledger?: { status: string; tds?: number }; leave_balances?: unknown[]; employee?: { after?: { status?: string; date_of_exit?: string } } }
    | undefined;

  async function loadSettlement(blnShowLoader = true) {
    if (blnShowLoader) setBlnLoading(true);
    setStrError("");
    try {
      setObjSettlement(await fnfSettlementService.getSettlement(strSettlementID));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load FNF settlement.");
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => { loadSettlement().catch(() => undefined); }, [strSettlementID]);

  function openAction(strAction: string) {
    const blnNeedsOverrideReason = strAction === "submit-review" && blnHasBlockingValidation;
    if (["release", "cancel", "mark-paid", "mark-recovered"].includes(strAction) || blnNeedsOverrideReason) {
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
        setObjStatement(await fnfSettlementService.getStatement(strSettlementID));
        setStrSuccess("Statement generated.");
      } else if (strAction === "payslip") {
        const objPayslip = await fnfSettlementService.generatePayslip(strSettlementID);
        printPayslipHtml(objPayslip.strHtml, objPayslip.strFileName);
        setStrSuccess(`Payslip ${objPayslip.strPayslipNumber} generated. It is also available in the F&F Payslips tab.`);
        await loadSettlement(false);
      } else {
        setObjSettlement(await fnfSettlementService.action(strSettlementID, strAction, objBody));
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
      await fnfSettlementService.updateLine(strSettlementID, objEditingLine.intID, dicValues);
    } else {
      await fnfSettlementService.addLine(strSettlementID, dicValues);
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
      setObjSettlement(await fnfSettlementService.updateSettlement(objSettlement.strRecordUUID, dicEditingSettlement));
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
      await fnfSettlementService.deleteLine(strSettlementID, objLineToDelete.intID);
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
      <DetailPageHeader
        strSection="Employee Services"
        strListTitle="Full & Final Settlement"
        strListHref="/payroll/fnf-settlements"
        strCurrent={objSettlement?.strSettlementNumber || "View"}
        objCurrentAdornment={objSettlement ? <FNFStatusBadge strStatus={objSettlement.strSettlementStatus} /> : undefined}
      >
        <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/fnf-settlements")} controlId="payroll.fnf-settlement-detail.back.button">Back</Button>
        {objSettlement ? <FNFActionBar objSettlement={objSettlement} blnBusy={blnSaving} onAction={openAction} /> : null}
      </DetailPageHeader>
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {objSettlement ? (
        <Box className={styles.tableCard}>
          <Box className={styles.detailScrollCard}>
            <Stack spacing={1.5}>
              {/* Settlement summary: everything known about the exit in one compact grid. */}
              <Box className={styles.fnfSummaryCard}>
                <Box className={styles.fnfSummaryHead}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography className={styles.fnfSummaryName}>{objSettlement.strEmployeeName || "-"} <Box component="span" className={styles.fnfSummaryCode}>{objSettlement.strEmployeeCode || objSettlement.intEmployeeID}</Box></Typography>
                    <Typography className={styles.fnfSummaryLabel}>{objSettlement.strDepartmentName || "Department not set"}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {["locked", "paid", "recovered"].includes(objSettlement.strSettlementStatus) ? <Chip size="small" color="success" label="Visible in ESS" /> : null}
                    {!blnReadOnly && blnCanEditDetails ? <Button className={styles.secondaryButton} size="small" startIcon={<EditRoundedIcon />} onClick={() => setDicEditingSettlement(toSettlementFormValues(objSettlement))} controlId="payroll.fnf-settlement-detail.edit-details.button">Edit Details</Button> : null}
                  </Stack>
                </Box>
                <Box className={styles.fnfSummaryGrid}>
                  {[
                    ["Exit Type", formatLabel(objSettlement.strExitType)],
                    ["Resignation Date", formatDate(objSettlement.dtResignationDate)],
                    ["Last Working Date", formatDate(objSettlement.dtLastWorkingDate)],
                    ["Settlement Date", formatDate(objSettlement.dtSettlementDate)],
                    ["Notice (Required / Served)", `${objSettlement.decNoticePeriodDays || 0} / ${objSettlement.decNoticeServedDays || 0} days`],
                    ["Notice Shortfall", `${objSettlement.decNoticeShortfallDays || 0} days`],
                    ["Salary Period", lstSalaryMonths.length ? lstSalaryMonths.map(formatMonth).join(", ") : "After Calculate"],
                    ["Exit Reason", objSettlement.strExitReason || "-"],
                  ].map(([strLabel, strValue]) => (
                    <Box key={strLabel} className={styles.fnfSummaryItem}>
                      <Typography className={styles.fnfSummaryLabel}>{strLabel}</Typography>
                      <Typography className={styles.fnfSummaryValue} title={strValue}>{strValue}</Typography>
                    </Box>
                  ))}
                </Box>
                {objSettlement.strRemarks ? <Typography className={styles.fnfSummaryRemarks}><strong>Remarks:</strong> {objSettlement.strRemarks}</Typography> : null}
              </Box>

              {/* Amount tiles */}
              <Box className={styles.fnfTotalsGrid}>
                {[
                  ["Total Earnings", objSettlement.decTotalEarnings, "#16a34a"],
                  ["Deductions / Recoveries", (objSettlement.decTotalDeductions || 0) + (objSettlement.decTotalRecoveries || 0), "#dc2626"],
                  ["TDS", objSettlement.decFinalTdsAmount ?? objSettlement.decTotalTaxDeducted, "#ea580c"],
                  ["Statutory (PF / ESI / PT / LWF)", objSettlement.decTotalStatutoryDeduction, "#ea580c"],
                  ["Net Payable", objSettlement.decNetPayableAmount, "#2563eb"],
                  ["Net Recoverable", objSettlement.decNetRecoverableAmount, "#dc2626"],
                ].map(([strLabel, decValue, strColor]) => (
                  <Box key={String(strLabel)} className={styles.fnfTotalTile}>
                    <Typography className={styles.fnfSummaryLabel}>{strLabel}</Typography>
                    <Typography className={styles.fnfTotalValue} sx={{ color: String(strColor) }}>{formatCurrency(Number(decValue || 0))}</Typography>
                  </Box>
                ))}
              </Box>

              {blnShowValidations && lstValidations.length ? (
                <Stack spacing={0.75}>
                  {lstValidations.map((dicValidation) => (
                    <Alert key={dicValidation.code} sx={{ py: 0 }} severity={dicValidation.severity === "blocking" ? "error" : dicValidation.severity === "warning" ? "warning" : "info"}>
                      {dicValidation.message}{dicValidation.severity === "blocking" ? " Submitting for review will ask for an override reason." : ""}
                    </Alert>
                  ))}
                </Stack>
              ) : null}
              {objClosure ? (
                <Alert severity="success" sx={{ py: 0 }}>
                  Settlement closed in the F&amp;F module:{" "}
                  {[
                    objClosure.tax_ledger ? `tax ledger ${objClosure.tax_ledger.status === "posted" ? `posted (TDS ${formatCurrency(objClosure.tax_ledger.tds)})` : String(objClosure.tax_ledger.status).replace(/_/g, " ")}` : null,
                    objClosure.leave_balances ? `${objClosure.leave_balances.length} leave balance(s) closed` : null,
                    objClosure.employee ? `employee set ${objClosure.employee.after?.status} from ${formatDate(objClosure.employee.after?.date_of_exit)}` : null,
                  ].filter(Boolean).join("; ")}.
                </Alert>
              ) : null}

              <FNFSettlementCalculationPanel objSettlement={objSettlement} blnReadOnly={blnLinesReadOnly} onAdd={() => { setObjEditingLine(null); setBlnLineDialogOpen(true); }} onEdit={(line) => { setObjEditingLine(line); setBlnLineDialogOpen(true); }} onDelete={setObjLineToDelete} />
              <FNFLeaveEncashmentPanel objSettlement={objSettlement} blnReadOnly={blnLinesReadOnly} onAdd={() => { setObjEditingLine(null); setBlnLineDialogOpen(true); }} onEdit={(line) => { setObjEditingLine(line); setBlnLineDialogOpen(true); }} onDelete={setObjLineToDelete} />
              <FNFNoticePayPanel objSettlement={objSettlement} />
              <FNFGratuityPanel objSettlement={objSettlement} />
              <FNFRecoveryPanel objSettlement={objSettlement} />
              <FNFReimbursementPanel objSettlement={objSettlement} />
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
          <Button className={styles.secondaryButton} size="small" variant="outlined" onClick={() => setDicEditingSettlement(null)} disabled={blnSaving}>Cancel</Button>
          <Button className={styles.primaryButton} size="small" variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => saveSettlementDetails()} disabled={blnSaving}>Save Details</Button>
        </DialogActions>
      </Dialog>
      <FNFSettlementLineEditor blnOpen={blnLineDialogOpen} objLine={objEditingLine} onClose={() => setBlnLineDialogOpen(false)} onSave={saveLine} />
      <Dialog open={Boolean(objLineToDelete)} onClose={() => setObjLineToDelete(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete Settlement Line</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete {objLineToDelete?.strLineName || "this settlement line"}?</Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
          <Button size="small" variant="text" onClick={() => setObjLineToDelete(null)} disabled={blnSaving} controlId="payroll.fnf-settlement-detail.delete-line.cancel.button">Cancel</Button>
          <Button size="small" variant="contained" color="error" onClick={confirmDeleteLine} disabled={blnSaving} controlId="payroll.fnf-settlement-detail.delete-line.confirm.button">Delete</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(strPendingAction)} onClose={() => setStrPendingAction("")} fullWidth maxWidth="sm">
        <DialogTitle>{["mark-paid", "mark-recovered"].includes(strPendingAction) ? "Payment / Recovery Details" : strPendingAction === "submit-review" ? "Override Reason Required" : "Reason Required"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{["mark-paid", "mark-recovered"].includes(strPendingAction) ? <><TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={strPaymentDate} onChange={(e) => setStrPaymentDate(e.target.value)} fullWidth controlId="payroll.fnf-settlement-detail.payment-date.input" /><TextField select label="Mode" value={strPaymentMode} onChange={(e) => setStrPaymentMode(e.target.value)} fullWidth controlId="payroll.fnf-settlement-detail.payment-mode.select"><MenuItem value="bank_transfer">Bank Transfer</MenuItem><MenuItem value="cheque">Cheque</MenuItem><MenuItem value="cash">Cash</MenuItem><MenuItem value="adjustment">Adjustment</MenuItem><MenuItem value="other">Other</MenuItem></TextField><TextField label="Reference Number" value={strPaymentReference} onChange={(e) => setStrPaymentReference(e.target.value)} fullWidth controlId="payroll.fnf-settlement-detail.payment-reference.input" /></> : null}<TextField label="Reason / Remarks" value={strReason} onChange={(e) => setStrReason(e.target.value)} fullWidth multiline minRows={3} controlId="payroll.fnf-settlement-detail.reason-remarks.input" /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setStrPendingAction("")} controlId="payroll.fnf-settlement-detail.action-dialog.close.button">Close</Button><Button variant="contained" onClick={() => { if (["mark-paid", "mark-recovered"].includes(strPendingAction) && !strPaymentReference.trim()) { setStrError("Reference number is required."); return; } if (["release", "cancel", "submit-review"].includes(strPendingAction) && !strReason.trim()) { setStrError("Reason is required."); return; } handleAction(strPendingAction, { strRemarks: strReason, strPaymentReferenceNo: strPaymentReference, strPaymentMode, dtPaymentDate: strPaymentDate }).catch(() => undefined); }} controlId="payroll.fnf-settlement-detail.action-dialog.confirm.button">Confirm</Button></DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSaving} strLabel={blnLoading ? "Loading settlement..." : "Saving..."} />
    </Box>
  );
}
