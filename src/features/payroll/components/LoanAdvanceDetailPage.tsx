"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Step, StepLabel, Stepper, Tab, Tabs, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import LoanAdvanceStatusBadge from "@/features/payroll/components/LoanAdvanceStatusBadge";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { createInitialLoanAdvanceForm, loanAdvanceService, toLoanAdvanceForm } from "@/features/payroll/services/loanAdvanceService";
import type { LoanAdvanceCategoryRecord, LoanAdvanceFormValues, LoanAdvanceRecord, LoanAdvanceScheduleRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstModuleCodes = ["PAYROLL_LOANS_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES"];
const lstWorkflow = ["draft", "pending_approval", "approved", "disbursed", "active", "closed"];
const lstReadonlyStatuses = ["approved", "disbursed", "active", "closed", "rejected", "cancelled", "pending_approval"];

type ActionDialogState = {
  strAction: string;
  strTitle: string;
  blnNeedsAmount?: boolean;
  blnNeedsDisbursement?: boolean;
  blnNeedsReason?: boolean;
} | null;

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function formatDate(strValue?: string | null) {
  return strValue ? strValue.slice(0, 10) : "-";
}

function addMonths(strDate: string, intMonths: number) {
  const objDate = strDate ? new Date(strDate) : new Date();
  objDate.setDate(1);
  objDate.setMonth(objDate.getMonth() + intMonths);
  return objDate.toISOString().slice(0, 10);
}

function buildSchedulePreview(dicValues: LoanAdvanceFormValues, objPolicy: LoanAdvanceCategoryRecord | null): LoanAdvanceScheduleRecord[] {
  const decAmount = Number(dicValues.decApprovedAmount || dicValues.decRequestedAmount || 0);
  const intInstallments = Math.max(1, Number(dicValues.intNumberOfInstallments || 1));
  const decRate = objPolicy?.blnInterestApplicable ? Number(objPolicy.decCompanyInterestRatePercent || 0) / 1200 : 0;
  const decBenchmarkRate = objPolicy?.blnPerquisiteTaxApplicable ? Number(objPolicy.decBenchmarkInterestRatePercent || 0) / 1200 : 0;
  const decEnteredInstallment = Number(dicValues.decInstallmentAmount || 0);
  const decBaseInstallment = decEnteredInstallment > 0 ? decEnteredInstallment : Math.ceil(decAmount / intInstallments);
  let decOpening = decAmount;
  return Array.from({ length: intInstallments }).map((_, intIndex) => {
    const decInterest = Math.round(decOpening * decRate);
    const decBenchmarkInterest = Math.round(decOpening * decBenchmarkRate);
    const decPrincipal = intIndex === intInstallments - 1 ? decOpening : Math.min(decOpening, decBaseInstallment);
    const decTaxable = Math.max(0, decBenchmarkInterest - decInterest);
    const decClosing = Math.max(0, decOpening - decPrincipal);
    const objRow = {
      intID: intIndex + 1,
      intInstallmentNo: intIndex + 1,
      dtPayrollMonth: addMonths(dicValues.dtRecoveryStartMonth, intIndex),
      decOpeningPrincipalBalance: decOpening,
      decPrincipalDueAmount: decPrincipal,
      decActualInterestAmount: decInterest,
      decBenchmarkInterestAmount: decBenchmarkInterest,
      decTaxablePerquisiteAmount: decTaxable,
      decTotalDueAmount: decPrincipal + decInterest,
      decRecoveredTotalAmount: 0,
      decClosingPrincipalBalance: decClosing,
      strScheduleStatus: "preview",
    };
    decOpening = decClosing;
    return objRow;
  });
}

function getEmployeeLabel(objEmployee: EmployeeListRecord) {
  return objEmployee.strEmployeeCode ? `${objEmployee.strFullName} (${objEmployee.strEmployeeCode})` : objEmployee.strFullName;
}

export default function LoanAdvanceDetailPage({ intLoanAdvanceID }: { intLoanAdvanceID?: number }) {
  const objRouter = useRouter();
  const { t, blnLoadingLabels, strLabelError } = useModuleLabels("loans-advances");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [objRecord, setObjRecord] = useState<LoanAdvanceRecord | null>(null);
  const [dicValues, setDicValues] = useState<LoanAdvanceFormValues>(() => createInitialLoanAdvanceForm());
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [lstCategories, setLstCategories] = useState<LoanAdvanceCategoryRecord[]>([]);
  const [lstExistingLoans, setLstExistingLoans] = useState<LoanAdvanceRecord[]>([]);
  const [objPolicy, setObjPolicy] = useState<LoanAdvanceCategoryRecord | null>(null);
  const [intTab, setIntTab] = useState(0);
  const [blnLoading, setBlnLoading] = useState(Boolean(intLoanAdvanceID));
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [objActionDialog, setObjActionDialog] = useState<ActionDialogState>(null);
  const [dicActionValues, setDicActionValues] = useState({ decApprovedAmount: "", dtDisbursementDate: "", strPaymentMode: "", strTransactionReferenceNo: "", strRemarks: "", strReason: "" });

  const blnCanView = canViewAny() || canDoAny("view") || canDoAny("list");
  const blnCanEdit = canDoAny("edit");
  const blnCanAdd = canDoAny("add") || canDoAny("create");
  const blnCanApprove = canDoAny("approve");
  const blnCanSubmit = canDoAny("submit");
  const blnCanCancel = canDoAny("delete") || canDoAny("cancel");
  const strStatus = objRecord?.strWorkflowStatus || "draft";
  const blnReadonly = Boolean(objRecord && lstReadonlyStatuses.includes(strStatus)) || (!intLoanAdvanceID && !blnCanAdd) || (Boolean(intLoanAdvanceID) && !blnCanEdit);
  const objSelectedEmployee = useMemo(() => lstEmployees.find((objEmployee) => objEmployee.intID === Number(dicValues.intEmployeeID)) || null, [lstEmployees, dicValues.intEmployeeID]);
  const lstFilteredCategories = useMemo(() => lstCategories.filter((objCategory) => objCategory.strRequestType === dicValues.strRequestType), [lstCategories, dicValues.strRequestType]);
  const lstSchedulePreview = useMemo(() => buildSchedulePreview(dicValues, objPolicy), [dicValues, objPolicy]);
  const lstSchedule = objRecord?.lstSchedule?.length ? objRecord.lstSchedule : lstSchedulePreview;
  const blnHasActiveWarning = useMemo(() => {
    if (!dicValues.intEmployeeID) return false;
    return lstExistingLoans.some((objLoan) =>
      objLoan.intID !== objRecord?.intID &&
      objLoan.intEmployeeID === Number(dicValues.intEmployeeID) &&
      ["pending_approval", "approved", "disbursed", "active"].includes(objLoan.strWorkflowStatus)
    );
  }, [dicValues.intEmployeeID, lstExistingLoans, objRecord?.intID]);
  const intWorkflowStep = Math.max(0, lstWorkflow.indexOf(strStatus === "sent_back" ? "draft" : strStatus));

  async function loadRecord() {
    if (!intLoanAdvanceID) return;
    setBlnLoading(true);
    setStrError("");
    try {
      const objNextRecord = await loanAdvanceService.getLoan(intLoanAdvanceID);
      setObjRecord(objNextRecord);
      setDicValues(toLoanAdvanceForm(objNextRecord));
      setObjPolicy(objNextRecord.objCategory || null);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_load_detail", "Unable to load loan or advance."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    void loadRecord();
    Promise.all([
      employeeService.getEmployees().catch(() => []),
      loanAdvanceService.listCategories().catch(() => []),
      loanAdvanceService.listLoans().catch(() => []),
    ]).then(([lstEmployeeRows, lstCategoryRows, lstLoanRows]) => {
      setLstEmployees(lstEmployeeRows);
      setLstCategories(lstCategoryRows);
      setLstExistingLoans(lstLoanRows);
    });
  }, [blnRightsLoading, blnCanView, intLoanAdvanceID]);

  useEffect(() => {
    if (!dicValues.intCategoryID) {
      setObjPolicy(null);
      return;
    }
    loanAdvanceService.getCategoryPolicy(Number(dicValues.intCategoryID)).then(setObjPolicy).catch(() => {
      setObjPolicy(lstCategories.find((objCategory) => objCategory.intID === Number(dicValues.intCategoryID)) || null);
    });
  }, [dicValues.intCategoryID, lstCategories]);

  function updateValue<TKey extends keyof LoanAdvanceFormValues>(strKey: TKey, objValue: LoanAdvanceFormValues[TKey]) {
    setDicValues((dicPrevious) => ({ ...dicPrevious, [strKey]: objValue }));
  }

  function validateForm() {
    if (!dicValues.intEmployeeID && !dicValues.strEmployeeCode.trim()) return t("validation_employee_required", "Employee is required.");
    if (!dicValues.intCategoryID) return t("validation_category_required", "Category is required.");
    if (Number(dicValues.decRequestedAmount || 0) <= 0) return t("validation_amount_required", "Requested amount must be greater than zero.");
    if (Number(dicValues.intNumberOfInstallments || 0) <= 0) return t("validation_installments_required", "Installments must be greater than zero.");
    if (objPolicy?.decMaxRequestAmount && Number(dicValues.decRequestedAmount) > objPolicy.decMaxRequestAmount) return t("validation_amount_policy", "Requested amount exceeds category policy.");
    if (objPolicy?.intMaxInstallments && Number(dicValues.intNumberOfInstallments) > objPolicy.intMaxInstallments) return t("validation_installment_policy", "Installments exceed category policy.");
    return "";
  }

  async function saveRecord(blnSubmit = false) {
    const strValidation = validateForm();
    if (strValidation) {
      setStrError(strValidation);
      return null;
    }
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objSnapshot = { lstPreviewSchedule: lstSchedulePreview, objPolicy };
      const objSaved = intLoanAdvanceID
        ? await loanAdvanceService.updateLoan(intLoanAdvanceID, dicValues, objSnapshot)
        : await loanAdvanceService.createLoan(dicValues, objSnapshot);
      const objFinal = blnSubmit ? await loanAdvanceService.action(objSaved.intID, "submit") : objSaved;
      setObjRecord(objFinal);
      setDicValues(toLoanAdvanceForm(objFinal));
      setStrSuccess(blnSubmit ? t("message_submitted", "Request submitted for approval.") : t("message_saved", "Request saved."));
      if (!intLoanAdvanceID) objRouter.replace(`/payroll/loans-advances/${objFinal.intID}`);
      return objFinal;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_save", "Unable to save loan or advance."));
      return null;
    } finally {
      setBlnSaving(false);
    }
  }

  async function runAction() {
    if (!objRecord || !objActionDialog) return;
    setBlnSaving(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objPayload = {
        decApprovedAmount: dicActionValues.decApprovedAmount ? Number(dicActionValues.decApprovedAmount) : undefined,
        dtDisbursementDate: dicActionValues.dtDisbursementDate || undefined,
        strPaymentMode: dicActionValues.strPaymentMode || undefined,
        strTransactionReferenceNo: dicActionValues.strTransactionReferenceNo || undefined,
        strRemarks: dicActionValues.strRemarks || undefined,
        strReason: dicActionValues.strReason || undefined,
      };
      const objNextRecord = await loanAdvanceService.action(objRecord.intID, objActionDialog.strAction, objPayload);
      setObjRecord(objNextRecord);
      setDicValues(toLoanAdvanceForm(objNextRecord));
      setObjActionDialog(null);
      setStrSuccess(t("message_action_done", "Workflow action completed."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_action", "Unable to complete workflow action."));
    } finally {
      setBlnSaving(false);
    }
  }

  function openAction(objNextDialog: ActionDialogState) {
    setDicActionValues({
      decApprovedAmount: objNextDialog?.blnNeedsAmount ? String(objRecord?.decApprovedAmount || objRecord?.decRequestedAmount || dicValues.decRequestedAmount || "") : "",
      dtDisbursementDate: objNextDialog?.blnNeedsDisbursement ? new Date().toISOString().slice(0, 10) : "",
      strPaymentMode: "",
      strTransactionReferenceNo: "",
      strRemarks: "",
      strReason: "",
    });
    setObjActionDialog(objNextDialog);
  }

  function renderWorkflowActions() {
    if (!objRecord) {
      return (
        <>
          {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={() => void saveRecord(false)}>{t("button_save_draft", "Save Draft")}</Button> : null}
          {blnCanAdd ? <Button className={styles.primaryButton} startIcon={<SendRoundedIcon />} onClick={() => void saveRecord(true)}>{t("button_submit", "Submit for Approval")}</Button> : null}
          <Button className={styles.secondaryButton} startIcon={<CloseRoundedIcon />} onClick={() => objRouter.push("/payroll/loans-advances")}>{t("cancel", "Cancel")}</Button>
        </>
      );
    }
    if (["draft", "sent_back"].includes(strStatus)) {
      return (
        <>
          {blnCanEdit ? <Button className={styles.primaryButton} startIcon={<SaveRoundedIcon />} onClick={() => void saveRecord(false)}>{t("button_save_draft", "Save Draft")}</Button> : null}
          {blnCanSubmit ? <Button className={styles.primaryButton} startIcon={<SendRoundedIcon />} onClick={() => openAction({ strAction: "submit", strTitle: t("button_submit", "Submit for Approval") })}>{t("button_submit", "Submit for Approval")}</Button> : null}
          {blnCanCancel ? <Button className={styles.secondaryButton} startIcon={<CloseRoundedIcon />} onClick={() => openAction({ strAction: "cancel", strTitle: t("button_cancel_request", "Cancel Request"), blnNeedsReason: true })}>{t("cancel", "Cancel")}</Button> : null}
        </>
      );
    }
    if (strStatus === "pending_approval") {
      return (
        <>
          {blnCanApprove ? <Button className={styles.primaryButton} startIcon={<CheckCircleRoundedIcon />} onClick={() => openAction({ strAction: "approve", strTitle: t("button_approve", "Approve"), blnNeedsAmount: true })}>{t("button_approve", "Approve")}</Button> : null}
          {blnCanApprove ? <Button className={styles.secondaryButton} startIcon={<CloseRoundedIcon />} onClick={() => openAction({ strAction: "reject", strTitle: t("button_reject", "Reject"), blnNeedsReason: true })}>{t("button_reject", "Reject")}</Button> : null}
          {blnCanApprove ? <Button className={styles.secondaryButton} startIcon={<UndoRoundedIcon />} onClick={() => openAction({ strAction: "send-back", strTitle: t("button_send_back", "Send Back"), blnNeedsReason: true })}>{t("button_send_back", "Send Back")}</Button> : null}
        </>
      );
    }
    if (strStatus === "approved") {
      return (
        <>
          {blnCanApprove ? <Button className={styles.primaryButton} startIcon={<PaymentsRoundedIcon />} onClick={() => openAction({ strAction: "disburse", strTitle: t("button_disburse", "Mark as Disbursed"), blnNeedsDisbursement: true })}>{t("button_disburse", "Mark as Disbursed")}</Button> : null}
          {blnCanCancel ? <Button className={styles.secondaryButton} startIcon={<CloseRoundedIcon />} onClick={() => openAction({ strAction: "cancel", strTitle: t("button_cancel_request", "Cancel Request"), blnNeedsReason: true })}>{t("cancel", "Cancel")}</Button> : null}
        </>
      );
    }
    if (["disbursed", "active"].includes(strStatus)) {
      return (
        <>
          <Button className={styles.secondaryButton} onClick={() => setIntTab(3)}>{t("button_view_schedule", "View Schedule")}</Button>
          <Button className={styles.secondaryButton} disabled>{t("button_manual_recovery", "Manual Recovery")}</Button>
          <Button className={styles.secondaryButton} disabled>{t("button_skip_installment", "Skip Installment")}</Button>
          <Button className={styles.secondaryButton} disabled>{t("button_adjust_installment", "Adjust Installment")}</Button>
          {strStatus === "disbursed" && blnCanApprove ? <Button className={styles.primaryButton} startIcon={<DoneAllRoundedIcon />} onClick={() => openAction({ strAction: "activate", strTitle: t("button_activate", "Activate Recovery") })}>{t("button_activate", "Activate Recovery")}</Button> : null}
          {strStatus === "active" && blnCanApprove ? <Button className={styles.primaryButton} startIcon={<DoneAllRoundedIcon />} onClick={() => openAction({ strAction: "close", strTitle: t("button_close", "Close"), blnNeedsReason: true })}>{t("button_close", "Close")}</Button> : null}
        </>
      );
    }
    return <Button className={styles.secondaryButton} startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>{t("button_print", "Print")}</Button>;
  }

  function renderPolicy() {
    if (!objPolicy) return null;
    return (
      <Alert severity={objPolicy.blnPreventDuplicateActive && blnHasActiveWarning ? "warning" : "info"} sx={{ borderRadius: "8px" }}>
        <Typography sx={{ fontWeight: 900 }}>{objPolicy.strCategoryName}</Typography>
        <Typography sx={{ fontSize: "0.82rem" }}>
          {objPolicy.strCategoryDescription || t("policy_default", "Category policy is applied to amount, installment, interest, payroll recovery, and tax checks.")}
        </Typography>
        <Typography sx={{ fontSize: "0.82rem", mt: 0.5 }}>
          {t("policy_limits", "Limits")}: {objPolicy.decMaxRequestAmount ? formatCurrency(objPolicy.decMaxRequestAmount) : t("not_configured", "Not configured")} | {t("policy_installments", "Installments")}: {objPolicy.intMaxInstallments || t("not_configured", "Not configured")} | {t("policy_tax", "Perquisite Tax")}: {objPolicy.blnPerquisiteTaxApplicable ? t("yes", "Yes") : t("no", "No")}
        </Typography>
      </Alert>
    );
  }

  function renderScheduleTable(lstRows: LoanAdvanceScheduleRecord[]) {
    return (
      <Box className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.fnfDenseTable}`}>
          <thead><tr><th>{t("schedule_no", "No.")}</th><th>{t("schedule_month", "Payroll Month")}</th><th>{t("schedule_opening", "Opening")}</th><th>{t("schedule_principal", "Principal")}</th><th>{t("schedule_interest", "Interest")}</th><th>{t("schedule_taxable", "Taxable Perquisite")}</th><th>{t("schedule_total", "Total Due")}</th><th>{t("schedule_closing", "Closing")}</th><th>{t("schedule_status", "Status")}</th></tr></thead>
          <tbody>
            {lstRows.map((objRow) => (
              <tr key={`${objRow.intID}-${objRow.intInstallmentNo}`}>
                <td>{objRow.intInstallmentNo}</td>
                <td>{formatDate(objRow.dtPayrollMonth).slice(0, 7)}</td>
                <td>{formatCurrency(objRow.decOpeningPrincipalBalance)}</td>
                <td>{formatCurrency(objRow.decPrincipalDueAmount)}</td>
                <td>{formatCurrency(objRow.decActualInterestAmount)}</td>
                <td>{formatCurrency(objRow.decTaxablePerquisiteAmount)}</td>
                <td>{formatCurrency(objRow.decTotalDueAmount)}</td>
                <td>{formatCurrency(objRow.decClosingPrincipalBalance)}</td>
                <td>{objRow.strScheduleStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  }

  return (
    <Box className={`${styles.page} ${styles.detailPage}`}>
      <Box className={styles.controlsCard}>
        <Box className={styles.controlsHeader}>
          <Box>
            <Typography className={styles.breadcrumbs}>{t("breadcrumbs", "Payroll / Loans & Advances")}</Typography>
            <Typography className={styles.title}>{objRecord ? `${objRecord.objEmployee?.strEmployeeName || t("page_title", "Loans & Advances")}` : t("new_title", "New Loan or Advance")}</Typography>
            {objRecord?.objEmployee?.strEmployeeCode ? <Typography sx={{ color: "#64748b", fontSize: "0.82rem" }}>{objRecord.objEmployee.strEmployeeCode}</Typography> : null}
          </Box>
          <Box className={styles.headerActions}>
            <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/payroll/loans-advances")}>{t("back_button", "Back")}</Button>
            {objRecord ? <LoanAdvanceStatusBadge strStatus={objRecord.strWorkflowStatus} /> : null}
            {renderWorkflowActions()}
          </Box>
        </Box>
      </Box>
      {strRightsError || strLabelError ? <Alert severity="warning">{strRightsError || strLabelError}</Alert> : null}
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success">{strSuccess}</Alert> : null}
      {blnHasActiveWarning ? <Alert severity="warning">{t("warning_active_loans", "This employee already has active or pending loans/advances. Review outstanding recoveries before submitting.")}</Alert> : null}
      {!blnCanView && !blnRightsLoading ? <Alert severity="warning">{t("no_access", "Loans and advances access is not available for your user group.")}</Alert> : null}
      {blnCanView ? (
        <Box className={`${styles.tableCard} ${styles.detailScrollCard}`}>
          <Stepper activeStep={intWorkflowStep} alternativeLabel className={styles.fnfStepperShell}>
            {lstWorkflow.map((strStep) => <Step key={strStep}><StepLabel>{t(`workflow_${strStep}`, strStep.replaceAll("_", " "))}</StepLabel></Step>)}
          </Stepper>
          <Tabs value={intTab} onChange={(_, intNextTab) => setIntTab(intNextTab)} sx={{ minHeight: 42, mt: 1 }}>
            <Tab label={t("tab_form", "Request")} />
            <Tab label={t("tab_approval", "Approval")} />
            <Tab label={t("tab_disbursement", "Disbursement")} disabled={!["approved", "disbursed", "active", "closed"].includes(strStatus)} />
            <Tab label={t("tab_schedule", "Repayment Schedule")} disabled={!objRecord && lstSchedulePreview.length === 0} />
            <Tab label={t("tab_ledger", "Ledger / History")} disabled={!objRecord} />
          </Tabs>
          {intTab === 0 ? (
            <Box sx={{ display: "grid", gap: 2, mt: 2 }}>
              <Stepper activeStep={3} className={styles.fnfStepperShell}>
                {[t("step_employee", "Employee Details"), t("step_details", "Loan / Advance Details"), t("step_recovery", "Recovery & Notional Tax"), t("step_review", "Review & Submit")].map((strStep) => <Step key={strStep}><StepLabel>{strStep}</StepLabel></Step>)}
              </Stepper>
              <Box className={styles.fnfEditDetailsGrid}>
                <TextField select size="small" label={t("field_employee", "Employee")} value={dicValues.intEmployeeID} disabled={blnReadonly} onChange={(e) => {
                  const objEmployee = lstEmployees.find((objRow) => objRow.intID === Number(e.target.value));
                  updateValue("intEmployeeID", e.target.value ? Number(e.target.value) : "");
                  updateValue("strEmployeeCode", objEmployee?.strEmployeeCode || "");
                }}>
                  <MenuItem value="">{t("select_employee", "Select employee")}</MenuItem>
                  {lstEmployees.filter((objEmployee) => !objEmployee.blnIsPartialSave).map((objEmployee) => <MenuItem key={objEmployee.intID} value={objEmployee.intID}>{getEmployeeLabel(objEmployee)}</MenuItem>)}
                </TextField>
                <TextField size="small" label={t("field_department", "Department")} value={objSelectedEmployee?.strDepartmentName || objRecord?.objEmployee?.strDepartmentName || ""} disabled />
                <TextField select size="small" label={t("field_request_type", "Request Type")} value={dicValues.strRequestType} disabled={blnReadonly} onChange={(e) => { updateValue("strRequestType", e.target.value as LoanAdvanceFormValues["strRequestType"]); updateValue("intCategoryID", ""); }}>
                  <MenuItem value="loan">{t("type_loan", "Loan")}</MenuItem>
                  <MenuItem value="advance">{t("type_advance", "Advance")}</MenuItem>
                </TextField>
                <TextField select size="small" label={t("field_category", "Category")} value={dicValues.intCategoryID} disabled={blnReadonly} onChange={(e) => updateValue("intCategoryID", e.target.value ? Number(e.target.value) : "")}>
                  <MenuItem value="">{t("select_category", "Select category")}</MenuItem>
                  {lstFilteredCategories.map((objCategory) => <MenuItem key={objCategory.intID} value={objCategory.intID}>{objCategory.strCategoryName}</MenuItem>)}
                </TextField>
                <TextField size="small" type="date" label={t("field_request_date", "Request Date")} InputLabelProps={{ shrink: true }} value={dicValues.dtRequestDate} disabled={blnReadonly} onChange={(e) => updateValue("dtRequestDate", e.target.value)} />
                <TextField size="small" label={t("field_requested_amount", "Requested Amount")} value={dicValues.decRequestedAmount} disabled={blnReadonly} onChange={(e) => updateValue("decRequestedAmount", e.target.value)} />
                <TextField size="small" type="month" label={t("field_recovery_start_month", "Recovery Start Month")} InputLabelProps={{ shrink: true }} value={(dicValues.dtRecoveryStartMonth || "").slice(0, 7)} disabled={blnReadonly} onChange={(e) => updateValue("dtRecoveryStartMonth", `${e.target.value}-01`)} />
                <TextField size="small" label={t("field_installments", "Installments")} value={dicValues.intNumberOfInstallments} disabled={blnReadonly} onChange={(e) => updateValue("intNumberOfInstallments", e.target.value)} />
                <TextField size="small" label={t("field_installment_amount", "Installment Amount")} value={dicValues.decInstallmentAmount} disabled={blnReadonly} onChange={(e) => updateValue("decInstallmentAmount", e.target.value)} />
                <TextField select size="small" label={t("field_recovery_mode", "Recovery Mode")} value={dicValues.strRecoveryMode} disabled={blnReadonly} onChange={(e) => updateValue("strRecoveryMode", e.target.value)}>
                  {["payroll", "manual", "both"].map((strMode) => <MenuItem key={strMode} value={strMode}>{t(`recovery_${strMode}`, strMode)}</MenuItem>)}
                </TextField>
                <TextField className={styles.fnfEditDetailsFull} size="small" multiline minRows={2} label={t("field_reason", "Reason")} value={dicValues.strReason} disabled={blnReadonly} onChange={(e) => updateValue("strReason", e.target.value)} />
                <FormControlLabel control={<Checkbox checked={dicValues.blnLastInstallmentAdjustment} disabled={blnReadonly} onChange={(e) => updateValue("blnLastInstallmentAdjustment", e.target.checked)} />} label={t("field_last_adjustment", "Adjust final installment")} />
                <FormControlLabel control={<Checkbox checked={dicValues.blnAutoDeductInPayroll} disabled={blnReadonly} onChange={(e) => updateValue("blnAutoDeductInPayroll", e.target.checked)} />} label={t("field_auto_deduct", "Auto deduct in payroll")} />
              </Box>
              {renderPolicy()}
              {objPolicy?.blnPerquisiteTaxApplicable ? <Alert severity="warning" sx={{ borderRadius: "8px" }}>{t("notional_tax_note", "Notional tax applies because the benchmark interest rate is higher than the company recovery rate. Taxable perquisite preview is shown in the schedule.")}</Alert> : null}
              <Typography sx={{ color: "#0f172a", fontWeight: 900 }}>{t("preview_title", "Reducing-balance Schedule Preview")}</Typography>
              {renderScheduleTable(lstSchedulePreview)}
            </Box>
          ) : null}
          {intTab === 1 ? (
            <Box className={styles.fnfWorkflowGrid} sx={{ mt: 2 }}>
              {[["requested", formatCurrency(objRecord?.decRequestedAmount || Number(dicValues.decRequestedAmount))], ["approved", formatCurrency(objRecord?.decApprovedAmount)], ["remarks", objRecord?.strApproverRemarks || "-"]].map(([strKey, strValue]) => (
                <Box key={strKey} className={styles.fnfWorkflowPanel}><Typography className={styles.fnfWorkflowTitle}>{t(`approval_${strKey}`, strKey)}</Typography><Typography className={styles.fnfWorkflowValue}>{strValue}</Typography></Box>
              ))}
            </Box>
          ) : null}
          {intTab === 2 ? (
            <Box className={styles.fnfWorkflowGrid} sx={{ mt: 2 }}>
              {[["date", formatDate(objRecord?.dtDisbursementDate)], ["amount", formatCurrency(objRecord?.decDisbursedAmount)], ["reference", objRecord?.strTransactionReferenceNo || "-"]].map(([strKey, strValue]) => (
                <Box key={strKey} className={styles.fnfWorkflowPanel}><Typography className={styles.fnfWorkflowTitle}>{t(`disbursement_${strKey}`, strKey)}</Typography><Typography className={styles.fnfWorkflowValue}>{strValue}</Typography></Box>
              ))}
            </Box>
          ) : null}
          {intTab === 3 ? <Box sx={{ mt: 2 }}>{renderScheduleTable(lstSchedule)}</Box> : null}
          {intTab === 4 ? (
            <Box className={styles.tableWrap} sx={{ mt: 2 }}>
              <table className={`${styles.table} ${styles.fnfDenseTable}`}>
                <thead><tr><th>{t("ledger_event", "Event")}</th><th>{t("ledger_from", "From")}</th><th>{t("ledger_to", "To")}</th><th>{t("ledger_amount", "Amount")}</th><th>{t("ledger_balance", "Balance")}</th><th>{t("ledger_remarks", "Remarks")}</th><th>{t("ledger_on", "On")}</th></tr></thead>
                <tbody>
                  {(objRecord?.lstLedger || []).map((objLedger) => <tr key={objLedger.intID}><td>{objLedger.strLedgerEvent.replaceAll("_", " ")}</td><td>{objLedger.strFromStatus || "-"}</td><td>{objLedger.strToStatus || "-"}</td><td>{formatCurrency(objLedger.decEventAmount)}</td><td>{formatCurrency(objLedger.decBalanceAfterEvent)}</td><td>{objLedger.strRemarks || "-"}</td><td>{formatDate(objLedger.dtEventOn)}</td></tr>)}
                  {!(objRecord?.lstLedger || []).length ? <tr><td colSpan={7} className={styles.emptyState}>{t("ledger_empty", "No ledger history found.")}</td></tr> : null}
                </tbody>
              </table>
            </Box>
          ) : null}
        </Box>
      ) : null}
      <Dialog open={Boolean(objActionDialog)} onClose={() => setObjActionDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{objActionDialog?.strTitle}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.4, pt: "12px !important" }}>
          {objActionDialog?.blnNeedsAmount ? <TextField size="small" label={t("field_approved_amount", "Approved Amount")} value={dicActionValues.decApprovedAmount} onChange={(e) => setDicActionValues((d) => ({ ...d, decApprovedAmount: e.target.value }))} /> : null}
          {objActionDialog?.blnNeedsDisbursement ? (
            <>
              <TextField size="small" type="date" label={t("field_disbursement_date", "Disbursement Date")} InputLabelProps={{ shrink: true }} value={dicActionValues.dtDisbursementDate} onChange={(e) => setDicActionValues((d) => ({ ...d, dtDisbursementDate: e.target.value }))} />
              <TextField size="small" label={t("field_payment_mode", "Payment Mode")} value={dicActionValues.strPaymentMode} onChange={(e) => setDicActionValues((d) => ({ ...d, strPaymentMode: e.target.value }))} />
              <TextField size="small" label={t("field_transaction_reference", "Transaction Reference")} value={dicActionValues.strTransactionReferenceNo} onChange={(e) => setDicActionValues((d) => ({ ...d, strTransactionReferenceNo: e.target.value }))} />
            </>
          ) : null}
          <TextField size="small" multiline minRows={2} label={objActionDialog?.blnNeedsReason ? t("field_reason", "Reason") : t("field_remarks", "Remarks")} value={objActionDialog?.blnNeedsReason ? dicActionValues.strReason : dicActionValues.strRemarks} onChange={(e) => setDicActionValues((d) => objActionDialog?.blnNeedsReason ? ({ ...d, strReason: e.target.value }) : ({ ...d, strRemarks: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button className={styles.secondaryButton} onClick={() => setObjActionDialog(null)}>{t("cancel", "Cancel")}</Button>
          <Button className={styles.primaryButton} onClick={() => void runAction()}>{t("confirm", "Confirm")}</Button>
        </DialogActions>
      </Dialog>
      <BlockingLoader blnOpen={blnLoading || blnSaving || blnRightsLoading || blnLoadingLabels} strLabel={t("loading", "Loading loans and advances...")} />
    </Box>
  );
}
