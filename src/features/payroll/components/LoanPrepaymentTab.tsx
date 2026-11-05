"use client";

import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { useEffect, useMemo, useState } from "react";

import CommonSearchableSelect from "@/Common/components/CommonSearchableSelect";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { usePayrollLookups } from "@/features/payroll-lookups/hooks/usePayrollLookups";
import { loanAdvanceService } from "@/features/payroll/services/loanAdvanceService";
import type { LoanAdvanceEmployeeBankAccountRecord, LoanAdvanceLedgerRecord, LoanAdvanceRecord } from "@/features/payroll/types";

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function formatDate(strValue?: string | null) {
  return strValue ? strValue.slice(0, 10) : "-";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type LoanPrepaymentTabProps = {
  objRecord: LoanAdvanceRecord;
  blnCanAddPrepayment: boolean;
  onSuccess: (objNextRecord: LoanAdvanceRecord) => void;
};

export default function LoanPrepaymentTab({ objRecord, blnCanAddPrepayment, onSuccess }: LoanPrepaymentTabProps) {
  const { t } = useModuleLabels("loans-advances");
  const blnIsActiveLoan = objRecord.strWorkflowStatus === "active";
  const blnCanOpenDialog = blnIsActiveLoan && blnCanAddPrepayment;
  const { lstOptions: lstPaymentModeOptions, blnLoading: blnPaymentModesLoading } = usePayrollLookups("PAYMENT_MODE");
  const [blnDialogOpen, setBlnDialogOpen] = useState(false);
  const [strPrepaymentDate, setStrPrepaymentDate] = useState(todayIso());
  const [strAmount, setStrAmount] = useState("");
  const [strAdjustmentMode, setStrAdjustmentMode] = useState<"reduce_emi" | "reduce_tenure" | "">("");
  const [intPaymentModeID, setIntPaymentModeID] = useState<number | "">("");
  const [intEmployeeBankAccountID, setIntEmployeeBankAccountID] = useState<number | "">("");
  const [lstBankAccounts, setLstBankAccounts] = useState<LoanAdvanceEmployeeBankAccountRecord[]>([]);
  const [blnBankAccountsLoading, setBlnBankAccountsLoading] = useState(false);
  const [strTransactionReferenceNo, setStrTransactionReferenceNo] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  const decPrincipalOutstanding = Number(objRecord.decPrincipalOutstandingAmount ?? objRecord.decTotalOutstandingAmount ?? 0);
  const decAmountEntered = Number(strAmount || 0);
  const blnIsFull = decAmountEntered > 0 && decAmountEntered >= decPrincipalOutstanding;
  const objSelectedPaymentMode = lstPaymentModeOptions.find((objOption) => objOption.intID === intPaymentModeID) || null;
  const blnIsBankMode = objSelectedPaymentMode?.strValueCode === "BANK_TRANSFER";

  const lstPrepaymentHistory = useMemo(
    () => (objRecord.lstLedger || []).filter((objEntry) => objEntry.strLedgerEvent === "prepayment_full" || objEntry.strLedgerEvent === "prepayment_partial"),
    [objRecord.lstLedger],
  );

  // Loaded unconditionally (not just when the dialog's Payment Mode is set to Bank Transfer) so
  // the history table below can also resolve which account a past bank-transfer prepayment used.
  useEffect(() => {
    if (lstBankAccounts.length || blnBankAccountsLoading) return;
    setBlnBankAccountsLoading(true);
    loanAdvanceService
      .listEmployeeBankAccounts(objRecord.strRecordUUID)
      .then(setLstBankAccounts)
      .catch(() => setLstBankAccounts([]))
      .finally(() => setBlnBankAccountsLoading(false));
  }, [lstBankAccounts.length, blnBankAccountsLoading, objRecord.strRecordUUID]);

  function resolvePaymentModeLabel(objEntry: LoanAdvanceLedgerRecord): string {
    const intID = objEntry.objNewValues?.intPaymentModeID;
    if (!intID) return "-";
    return lstPaymentModeOptions.find((objOption) => objOption.intID === intID)?.strDisplayName || "-";
  }

  function resolveBankAccountLabel(objEntry: LoanAdvanceLedgerRecord): string {
    const intID = objEntry.objNewValues?.intEmployeeBankAccountID;
    if (!intID) return "-";
    const objAccount = lstBankAccounts.find((objRow) => objRow.intID === intID);
    return objAccount ? `${objAccount.strBankName || "-"} - ${objAccount.strAccountNumberMasked || ""}` : "-";
  }

  function resetForm() {
    setStrPrepaymentDate(todayIso());
    setStrAmount("");
    setStrAdjustmentMode("");
    setIntPaymentModeID("");
    setIntEmployeeBankAccountID("");
    setStrTransactionReferenceNo("");
    setStrRemarks("");
    setStrError("");
  }

  function validate(): string {
    if (!strPrepaymentDate) {
      return t("validation_prepayment_date_required", "Prepayment date is required.");
    }
    if (decAmountEntered <= 0) {
      return t("validation_prepayment_amount_required", "Prepayment amount must be greater than zero.");
    }
    if (!blnIsFull && !strAdjustmentMode) {
      return t("validation_adjustment_mode_required", "Choose Reduce EMI or Reduce Tenure.");
    }
    if (!intPaymentModeID) {
      return t("validation_payment_mode_required", "Payment mode is required.");
    }
    if (blnIsBankMode && !intEmployeeBankAccountID) {
      return t("validation_bank_account_required", "Select the employee's bank account.");
    }
    if (!strRemarks.trim()) {
      return t("validation_remarks_required", "Remarks are required -- state the reason for this prepayment.");
    }
    return "";
  }

  async function handleSubmit() {
    const strValidationError = validate();
    if (strValidationError) {
      setStrError(strValidationError);
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const objPayload = {
        dtPrepaymentDate: strPrepaymentDate,
        decPrepaymentAmount: decAmountEntered,
        strAdjustmentMode: blnIsFull ? undefined : strAdjustmentMode,
        intPaymentModeID: intPaymentModeID || undefined,
        intEmployeeBankAccountID: blnIsBankMode ? intEmployeeBankAccountID || undefined : undefined,
        strTransactionReferenceNo: strTransactionReferenceNo.trim() || undefined,
        strRemarks: strRemarks.trim() || undefined,
      };
      const objNextRecord = await loanAdvanceService.action(objRecord.strRecordUUID, "prepay", objPayload);
      setBlnDialogOpen(false);
      resetForm();
      onSuccess(objNextRecord);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_prepayment", "Unable to record this prepayment."));
    } finally {
      setBlnSaving(false);
    }
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Box className={styles.fnfWorkflowGrid}>
        <Box className={styles.fnfWorkflowPanel}>
          <Typography className={styles.fnfWorkflowTitle}>{t("field_principal_outstanding", "Principal Outstanding")}</Typography>
          <Typography className={styles.fnfWorkflowValue} sx={{ color: "#dc2626" }}>{formatCurrency(decPrincipalOutstanding)}</Typography>
        </Box>
        <Box className={styles.fnfWorkflowPanel}>
          <Typography className={styles.fnfWorkflowTitle}>{t("field_current_emi", "Current EMI")}</Typography>
          <Typography className={styles.fnfWorkflowValue}>{formatCurrency(objRecord.decInstallmentAmount)}</Typography>
        </Box>
        <Box className={styles.fnfWorkflowPanel}>
          <Typography className={styles.fnfWorkflowTitle}>{t("field_total_outstanding", "Total Outstanding")}</Typography>
          <Typography className={styles.fnfWorkflowValue} sx={{ color: "#dc2626" }}>{formatCurrency(objRecord.decTotalOutstandingAmount)}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2.5, mb: 1.2 }}>
        <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155" }}>
          {t("section_prepayment_history", "Prepayment History")}
        </Typography>
        {blnCanAddPrepayment ? (
          <Button
            className={styles.primaryButton}
            startIcon={<AddRoundedIcon />}
            disabled={!blnCanOpenDialog}
            onClick={() => setBlnDialogOpen(true)}
            controlId="loan-advance.prepayment-tab.add.button"
          >
            {t("button_add_prepayment", "Add Repayment")}
          </Button>
        ) : null}
      </Box>
      {!blnIsActiveLoan ? (
        <Alert severity="info" sx={{ mb: 1.2, borderRadius: "8px" }}>
          {t("prepayment_not_active", "Prepayment can only be recorded while this loan is Active.")}
        </Alert>
      ) : null}

      <Box className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.fnfDenseTable}`}>
          <thead>
            <tr>
              <th>{t("history_date", "Date")}</th>
              <th>{t("history_type", "Type")}</th>
              <th>{t("history_amount", "Amount")}</th>
              <th>{t("history_applied_as", "Applied As")}</th>
              <th>{t("history_payment_mode", "Payment Mode")}</th>
              <th>{t("history_bank_account", "Bank Account")}</th>
              <th>{t("history_reference", "Reference")}</th>
              <th>{t("history_balance_after", "Outstanding After")}</th>
              <th>{t("history_remarks", "Remarks")}</th>
            </tr>
          </thead>
          <tbody>
            {lstPrepaymentHistory.map((objEntry) => (
              <tr key={objEntry.intID}>
                <td>{formatDate(objEntry.dtEventOn)}</td>
                <td>{objEntry.strLedgerEvent === "prepayment_full" ? t("type_full", "Full") : t("type_partial", "Partial")}</td>
                <td>{formatCurrency(objEntry.decEventAmount)}</td>
                <td>
                  {objEntry.objNewValues?.strAdjustmentMode === "reduce_emi"
                    ? t("adjustment_mode_reduce_emi_short", "Reduce EMI")
                    : objEntry.objNewValues?.strAdjustmentMode === "reduce_tenure"
                      ? t("adjustment_mode_reduce_tenure_short", "Reduce Tenure")
                      : "-"}
                </td>
                <td>{resolvePaymentModeLabel(objEntry)}</td>
                <td>{resolveBankAccountLabel(objEntry)}</td>
                <td>{objEntry.objNewValues?.strTransactionReferenceNo || "-"}</td>
                <td>{formatCurrency(objEntry.decBalanceAfterEvent)}</td>
                <td>{objEntry.strRemarks || "-"}</td>
              </tr>
            ))}
            {!lstPrepaymentHistory.length ? <tr><td colSpan={9} className={styles.emptyState}>{t("history_empty", "No prepayments recorded yet.")}</td></tr> : null}
          </tbody>
        </table>
      </Box>

      <Dialog open={blnDialogOpen} onClose={() => { setBlnDialogOpen(false); resetForm(); }} maxWidth="sm" fullWidth>
        <DialogTitle>{t("dialog_title_add_prepayment", "Record Pre-payment")}</DialogTitle>
        <DialogContent>
          {strError ? <Alert severity="error" sx={{ mb: 2, mt: 1, borderRadius: "8px" }} onClose={() => setStrError("")}>{strError}</Alert> : null}

          <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", mt: 1, mb: 1.2 }}>
            {t("section_prepayment_details", "Prepayment Details")}
          </Typography>
          <Box className={styles.fnfEditDetailsGrid}>
            <TextField
              size="small"
              type="date"
              label={t("field_prepayment_date", "Prepayment Date")}
              InputLabelProps={{ shrink: true }}
              value={strPrepaymentDate}
              onChange={(e) => setStrPrepaymentDate(e.target.value)}
              controlId="loan-advance.prepayment-tab.date.input"
            />
            <TextField
              required
              size="small"
              type="number"
              label={t("field_prepayment_amount", "Prepayment Amount")}
              value={strAmount}
              onChange={(e) => setStrAmount(e.target.value)}
              helperText={t("prepayment_amount_hint", "Enter up to the full outstanding principal.")}
              controlId="loan-advance.prepayment-tab.amount.input"
            />

            {decAmountEntered > 0 ? (
              blnIsFull ? (
                <Alert severity="info" className={styles.fnfEditDetailsFull} sx={{ borderRadius: "8px" }}>
                  {t("prepayment_full_hint", "This amount covers the full outstanding principal -- every remaining installment will be settled and the loan will close.")}
                </Alert>
              ) : (
                <TextField
                  select
                  size="small"
                  className={styles.fnfEditDetailsFull}
                  label={t("field_adjustment_mode", "Apply As")}
                  value={strAdjustmentMode}
                  onChange={(e) => setStrAdjustmentMode(e.target.value as "reduce_emi" | "reduce_tenure")}
                  controlId="loan-advance.prepayment-tab.mode.select"
                >
                  <MenuItem value="reduce_emi">{t("adjustment_mode_reduce_emi", "Reduce EMI -- keep the same remaining months")}</MenuItem>
                  <MenuItem value="reduce_tenure">{t("adjustment_mode_reduce_tenure", "Reduce Tenure -- keep the same EMI, finish sooner")}</MenuItem>
                </TextField>
              )
            ) : null}
          </Box>

          {decAmountEntered > 0 ? (
            <>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155", mt: 2.5, mb: 1.2 }}>
                {t("section_payment_details", "Payment Details")}
              </Typography>
              <Box className={styles.fnfEditDetailsGrid}>
                <CommonSearchableSelect
                  required
                  label={t("field_payment_mode", "Payment Mode")}
                  value={intPaymentModeID}
                  options={lstPaymentModeOptions.map((objOption) => ({ intID: objOption.intID, strLabel: objOption.strDisplayName }))}
                  onChange={(intValue) => {
                    setIntPaymentModeID(intValue === "" ? "" : Number(intValue));
                    setIntEmployeeBankAccountID("");
                  }}
                  disabled={blnPaymentModesLoading}
                  controlId="loan-advance.prepayment-tab.payment-mode.select"
                />

                {blnIsBankMode ? (
                  <CommonSearchableSelect
                    label={t("field_bank_account", "Bank Account")}
                    value={intEmployeeBankAccountID}
                    options={lstBankAccounts.map((objAccount) => ({
                      intID: objAccount.intID,
                      strLabel: `${objAccount.strBankName || "-"} - ${objAccount.strAccountNumberMasked || ""}${objAccount.blnIsPrimary ? ` (${t("primary", "Primary")})` : ""}`,
                    }))}
                    onChange={(intValue) => setIntEmployeeBankAccountID(intValue === "" ? "" : Number(intValue))}
                    disabled={blnBankAccountsLoading}
                    required
                    controlId="loan-advance.prepayment-tab.bank-account.select"
                  />
                ) : null}

                <TextField
                  size="small"
                  label={t("field_transaction_reference", "Transaction Reference")}
                  value={strTransactionReferenceNo}
                  onChange={(e) => setStrTransactionReferenceNo(e.target.value)}
                  controlId="loan-advance.prepayment-tab.reference.input"
                />
                <TextField
                  required
                  size="small"
                  multiline
                  minRows={2}
                  label={t("field_remarks", "Remarks")}
                  value={strRemarks}
                  onChange={(e) => setStrRemarks(e.target.value)}
                  helperText={t("remarks_hint", "State the reason for this prepayment.")}
                  controlId="loan-advance.prepayment-tab.remarks.textarea"
                />
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button className={styles.secondaryButton} onClick={() => { setBlnDialogOpen(false); resetForm(); }} controlId="loan-advance.prepayment-tab.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void handleSubmit()} disabled={blnSaving} controlId="loan-advance.prepayment-tab.submit.button">
            {blnSaving ? t("saving", "Saving...") : t("prepayment_confirm", "Record Pre-payment")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
