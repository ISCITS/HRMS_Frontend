"use client";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudSyncRoundedIcon from "@mui/icons-material/CloudSyncRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { loanAdvanceService } from "@/features/payroll/services/loanAdvanceService";
import { payrollRunService } from "@/features/payroll/services/payrollRunService";
import type { LoanAdvanceRecord, LoanAdvanceScheduleRecord, PayrollRunListRecord } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

// LOAN_ADV_VIEW etc. are granted against the "Loans & Advances" menu (module code
// PAYROLL_LOANS_ADVANCES); LOAN_ADV_FINALIZE / LOAN_ADV_REOPEN_FINALIZATION are granted against
// this screen's own "Loan Finalization" menu (module code PAYROLL_LOAN_FINALIZATION) -- both
// module codes need to be checked, or the finalize/reopen actions are invisible to canDoAny.
const lstModuleCodes = ["PAYROLL_LOANS_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES", "PAYROLL_LOAN_FINALIZATION", "LOAN_FINALIZATION"];

// Finalization only makes sense once a real installment schedule exists to verify -- disbursed
// and active loans. Same rule the backend enforces on the finalize/reopen actions.
const lstFinalizableStatuses = ["disbursed", "active"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

function formatDate(strValue?: string | null) {
  return strValue ? strValue.slice(0, 10) : "-";
}

function getEmployeeName(objRow: LoanAdvanceRecord) {
  return objRow.objEmployee?.strEmployeeName || objRow.objEmployee?.strEmployeeCode || "-";
}

function sameMonth(strA?: string | null, strB?: string | null) {
  return Boolean(strA) && Boolean(strB) && strA!.slice(0, 7) === strB!.slice(0, 7);
}

const dicScheduleStatusFallbackLabels: Record<string, string> = {
  pending: "Due",
  in_payroll: "In Payroll",
  partial: "Partially Paid",
  recovered: "Paid",
  skipped: "Skipped",
  cancelled: "Cancelled",
  fnf_recovered: "Recovered via F&F",
};

export default function LoanFinalizationPage() {
  const { t, blnLoadingLabels } = useModuleLabels("loan-finalization");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [lstLoans, setLstLoans] = useState<LoanAdvanceRecord[]>([]);
  const [strSelectedLoanUUID, setStrSelectedLoanUUID] = useState("");
  const [lstPayrollRuns, setLstPayrollRuns] = useState<PayrollRunListRecord[]>([]);
  const [strSelectedRunUUID, setStrSelectedRunUUID] = useState("");
  // Gates the detail/finalize panel -- data only shows once "Import Data" is clicked, not just on
  // selecting a run + loan, and resets whenever either selection changes.
  const [blnDataImported, setBlnDataImported] = useState(false);
  const [objImportedLoan, setObjImportedLoan] = useState<LoanAdvanceRecord | null>(null);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnActionLoading, setBlnActionLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnReopenDialogOpen, setBlnReopenDialogOpen] = useState(false);
  const [strReopenReason, setStrReopenReason] = useState("");

  const blnCanView = canViewAny() || canDoAny("loan_adv_view");
  const blnCanFinalize = canDoAny("loan_adv_finalize");
  const blnCanReopen = canDoAny("loan_adv_reopen_finalization");
  const objSelectedRun = useMemo(() => lstPayrollRuns.find((objRun) => objRun.strRecordUUID === strSelectedRunUUID) || null, [lstPayrollRuns, strSelectedRunUUID]);

  async function loadLoans() {
    if (!blnCanView) {
      setLstLoans([]);
      setBlnLoading(false);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      // Scoping to a payroll run narrows the list to loans that actually have an installment due
      // in that run's month -- otherwise every disbursed/active loan across all months is shown.
      const lstAllLoans = await loanAdvanceService.listLoans(objSelectedRun ? { payroll_month: objSelectedRun.dtPayrollMonth.slice(0, 10) } : undefined);
      setLstLoans(lstAllLoans.filter((objLoan) => lstFinalizableStatuses.includes(objLoan.strWorkflowStatus)));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_load_list", "Unable to load loans and advances."));
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    payrollRunService.getPayrollRuns().then(setLstPayrollRuns).catch(() => setLstPayrollRuns([]));
  }, [blnRightsLoading, blnCanView]);

  useEffect(() => {
    if (blnRightsLoading) return;
    void loadLoans();
  }, [blnRightsLoading, blnCanView, strSelectedRunUUID]);

  const objSelectedLoan = useMemo(() => lstLoans.find((objLoan) => objLoan.strRecordUUID === strSelectedLoanUUID) || null, [lstLoans, strSelectedLoanUUID]);
  // The imported snapshot is what the detail panel renders -- kept separate from the list-derived
  // objSelectedLoan so "Import Data" can pull a fresh copy (latest schedule/status) on demand.
  const objDisplayLoan = objImportedLoan && objImportedLoan.strRecordUUID === strSelectedLoanUUID ? objImportedLoan : null;

  const objCurrentMonthSchedule = useMemo(() => {
    if (!objDisplayLoan || !objSelectedRun) return null;
    return (objDisplayLoan.lstSchedule || []).find((objRow) => sameMonth(objRow.dtPayrollMonth, objSelectedRun.dtPayrollMonth)) || null;
  }, [objDisplayLoan, objSelectedRun]);

  const lstRemainingSchedule = useMemo(() => {
    if (!objDisplayLoan) return [];
    if (!objCurrentMonthSchedule) return objDisplayLoan.lstSchedule || [];
    return (objDisplayLoan.lstSchedule || []).filter((objRow) => objRow.intID !== objCurrentMonthSchedule.intID);
  }, [objDisplayLoan, objCurrentMonthSchedule]);

  function resetImport() {
    setBlnDataImported(false);
    setObjImportedLoan(null);
    setStrError("");
    setStrSuccess("");
  }

  function selectRun(strRunUUID: string) {
    setStrSelectedRunUUID(strRunUUID);
    setStrSelectedLoanUUID("");
    resetImport();
  }

  function selectLoan(strLoanUUID: string) {
    setStrSelectedLoanUUID(strLoanUUID);
    resetImport();
  }

  async function importData() {
    if (!objSelectedLoan) return;
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objFreshLoan = await loanAdvanceService.getLoan(objSelectedLoan.strRecordUUID);
      setObjImportedLoan(objFreshLoan);
      setBlnDataImported(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_import", "Unable to import this loan/advance's data."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  async function refreshImportedLoan() {
    if (!objDisplayLoan) return;
    const objFreshLoan = await loanAdvanceService.getLoan(objDisplayLoan.strRecordUUID);
    setObjImportedLoan(objFreshLoan);
    setLstLoans((lstPrev) => lstPrev.map((objRow) => (objRow.strRecordUUID === objFreshLoan.strRecordUUID ? objFreshLoan : objRow)));
  }

  async function finalizeCurrentMonth() {
    if (!objDisplayLoan || !objCurrentMonthSchedule || !blnCanFinalize) return;
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      await loanAdvanceService.finalizeSchedule(objDisplayLoan.strRecordUUID, objCurrentMonthSchedule.intID);
      await refreshImportedLoan();
      setStrSuccess(t("finalize_success", "This month's installment finalized successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_finalize", "Unable to finalize this installment."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  function openReopenDialog() {
    if (!objDisplayLoan || !objCurrentMonthSchedule || !blnCanReopen) return;
    setStrReopenReason("");
    setBlnReopenDialogOpen(true);
  }

  async function reopenCurrentMonthFinalization() {
    const strReason = strReopenReason.trim();
    if (!objDisplayLoan || !objCurrentMonthSchedule || !blnCanReopen || !strReason) return;
    setBlnReopenDialogOpen(false);
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      await loanAdvanceService.reopenScheduleFinalization(objDisplayLoan.strRecordUUID, objCurrentMonthSchedule.intID, strReason);
      await refreshImportedLoan();
      setStrSuccess(t("reopen_success", "This month's installment finalization reopened successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_reopen", "Unable to reopen this installment's finalization."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  // Loan lines are generated automatically inside payroll calculation, not pushed by this screen --
  // this just recalculates the one employee within the selected run so the just-finalized month's
  // deduction line appears immediately, without waiting for (or forcing) a full run-wide recompute.
  async function fetchInPayroll() {
    if (!objDisplayLoan || !objSelectedRun) return;
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      await payrollRunService.reprocessPayrollRun(objSelectedRun.strRecordUUID, t("fetch_in_payroll_reason", "Fetch finalized loan/advance EMI into payroll."), [objDisplayLoan.intEmployeeID]);
      await refreshImportedLoan();
      setStrSuccess(t("fetch_in_payroll_success", "Loan/advance EMI fetched into the payroll run successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_fetch_in_payroll", "Unable to fetch this loan/advance's EMI into the payroll run."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  function scheduleStatusLabel(strStatus: string) {
    return t(`schedule_status_${strStatus}`, dicScheduleStatusFallbackLabels[strStatus] || strStatus.replaceAll("_", " "));
  }

  function renderScheduleTable(lstRows: LoanAdvanceScheduleRecord[]) {
    return (
      <Box className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.fnfDenseTable}`}>
          <thead>
            <tr>
              <th>{t("schedule_no", "No.")}</th>
              <th>{t("schedule_month", "Payroll Month")}</th>
              <th>{t("schedule_opening", "Opening")}</th>
              <th>{t("schedule_principal", "Principal")}</th>
              <th>{t("schedule_interest", "Interest")}</th>
              <th>{t("schedule_total", "Total Due")}</th>
              <th>{t("schedule_recovered", "Recovered")}</th>
              <th>{t("schedule_closing", "Closing")}</th>
              <th>{t("schedule_status", "Status")}</th>
            </tr>
          </thead>
          <tbody>
            {lstRows.map((objRow) => (
              <tr key={objRow.intID}>
                <td>{objRow.intInstallmentNo}</td>
                <td>{formatDate(objRow.dtPayrollMonth).slice(0, 7)}</td>
                <td>{formatCurrency(objRow.decOpeningPrincipalBalance)}</td>
                <td>{formatCurrency(objRow.decPrincipalDueAmount)}</td>
                <td>{formatCurrency(objRow.decActualInterestAmount)}</td>
                <td>{formatCurrency(objRow.decTotalDueAmount)}</td>
                <td>{formatCurrency(objRow.decRecoveredTotalAmount)}</td>
                <td>{formatCurrency(objRow.decClosingPrincipalBalance)}</td>
                <td>{scheduleStatusLabel(objRow.strScheduleStatus)}</td>
              </tr>
            ))}
            {lstRows.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  {t("schedule_empty", "No installment schedule found.")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Box>
    );
  }

  if (!blnCanView && !blnRightsLoading) {
    return (
      <Box className={styles.page}>
        <Alert severity="warning">{t("no_access", "Loan finalization access is not available for your user group.")}</Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Box className={styles.controlsCard}>
        <Typography className={`${styles.sectionBar} ${styles.sectionBarTight} ${styles.sectionBarCompact}`}>
          {t("section_select_loan", "Select a loan / advance")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2, alignItems: "flex-end" }}>
          <TextField
            select
            label={t("field_payroll_run", "Payroll Run")}
            value={strSelectedRunUUID}
            onChange={(e) => selectRun(e.target.value)}
            size="small"
            sx={{ minWidth: 220, flex: "1 1 220px" }}
            controlId="loan-finalization.select.payroll-run"
          >
            <MenuItem value="">{t("select_run_prompt_optional", "All months")}</MenuItem>
            {lstPayrollRuns.map((objRun) => (
              <MenuItem key={objRun.strRecordUUID} value={objRun.strRecordUUID}>
                {objRun.strRunName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t("field_loan", "Loan / Advance")}
            value={strSelectedLoanUUID}
            onChange={(e) => selectLoan(e.target.value)}
            size="small"
            sx={{ minWidth: 320, flex: "2 1 320px" }}
            controlId="loan-finalization.select.loan"
          >
            <MenuItem value="">{t("select_loan_prompt", "Select a loan or advance")}</MenuItem>
            {lstLoans.map((objLoan) => (
              <MenuItem key={objLoan.strRecordUUID} value={objLoan.strRecordUUID}>
                {getEmployeeName(objLoan)} ({objLoan.objEmployee?.strEmployeeCode || "-"}) - {objLoan.objCategory?.strCategoryName || t("field_loan", "Loan / Advance")} - {formatCurrency(objLoan.decApprovedAmount)}
              </MenuItem>
            ))}
          </TextField>
          <Button
            className={styles.primaryButton}
            startIcon={<DownloadRoundedIcon />}
            onClick={() => void importData()}
            disabled={!objSelectedLoan || blnActionLoading}
            controlId="loan-finalization.import.button"
          >
            {t("import_data_button", "Import Data")}
          </Button>
          {blnCanFinalize ? (
            <Button
              className={styles.secondaryButton}
              startIcon={<CheckCircleRoundedIcon />}
              onClick={() => void finalizeCurrentMonth()}
              disabled={!blnDataImported || !objCurrentMonthSchedule || objCurrentMonthSchedule.blnIsFinalized || blnActionLoading}
              controlId="loan-finalization.finalize.button"
            >
              {t("finalize_button", "Finalize")}
            </Button>
          ) : null}
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

      {blnDataImported && objDisplayLoan ? (
        <Box className={styles.controlsCard}>
          <Typography className={`${styles.sectionBar} ${styles.sectionBarTight} ${styles.sectionBarCompact}`}>
            {t("section_details", "Loan / advance details")}
          </Typography>

          <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0,1fr))" }, mb: 1.6 }}>
            <TextField label={t("field_employee", "Employee")} value={`${getEmployeeName(objDisplayLoan)} (${objDisplayLoan.objEmployee?.strEmployeeCode || "-"})`} size="small" disabled />
            <TextField label={t("field_category", "Category")} value={objDisplayLoan.objCategory?.strCategoryName || "-"} size="small" disabled />
            <TextField label={t("field_status", "Status")} value={t(`status_${objDisplayLoan.strWorkflowStatus}`, objDisplayLoan.strWorkflowStatus.replaceAll("_", " "))} size="small" disabled />
            <TextField label={t("field_approved_amount", "Approved Amount")} value={formatCurrency(objDisplayLoan.decApprovedAmount)} size="small" disabled />
            <TextField label={t("field_outstanding_amount", "Outstanding Amount")} value={formatCurrency(objDisplayLoan.decTotalOutstandingAmount)} size="small" disabled />
            <TextField label={t("field_installment_amount", "Installment Amount")} value={formatCurrency(objDisplayLoan.decInstallmentAmount)} size="small" disabled />
          </Box>

          {objSelectedRun ? (
            <Box sx={{ border: "1px solid var(--app-card-border-color)", borderRadius: "var(--app-card-radius)", p: 1.6, mb: 1.6, background: "var(--app-grid-header-background, #f8fafc)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, mb: objCurrentMonthSchedule ? 1.2 : 0 }}>
                <Typography sx={{ fontWeight: 900 }}>{t("current_month_title", "This Month's EMI")} - {objSelectedRun.strRunName}</Typography>
                {objCurrentMonthSchedule ? (
                  <Chip
                    size="small"
                    label={objCurrentMonthSchedule.blnIsFinalized ? t("finalized_yes", "Finalized") : t("finalized_no", "Not finalized")}
                    color={objCurrentMonthSchedule.blnIsFinalized ? "success" : "default"}
                    variant={objCurrentMonthSchedule.blnIsFinalized ? "filled" : "outlined"}
                  />
                ) : null}
              </Box>

              {objCurrentMonthSchedule ? (
                <>
                  <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", sm: "repeat(4, minmax(0,1fr))" }, mb: 1.6 }}>
                    <TextField label={t("schedule_principal", "Principal")} value={formatCurrency(objCurrentMonthSchedule.decPrincipalDueAmount)} size="small" disabled />
                    <TextField label={t("schedule_interest", "Interest")} value={formatCurrency(objCurrentMonthSchedule.decActualInterestAmount)} size="small" disabled />
                    <TextField label={t("schedule_total", "Total Due")} value={formatCurrency(objCurrentMonthSchedule.decTotalDueAmount)} size="small" disabled />
                    <TextField label={t("schedule_status", "Status")} value={scheduleStatusLabel(objCurrentMonthSchedule.strScheduleStatus)} size="small" disabled />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {objCurrentMonthSchedule.blnIsFinalized && blnCanReopen ? (
                      <Button className={styles.secondaryButton} startIcon={<RestartAltRoundedIcon />} onClick={openReopenDialog} disabled={blnActionLoading} controlId="loan-finalization.reopen.button">
                        {t("reopen_button", "Reopen Finalization")}
                      </Button>
                    ) : null}
                    {objCurrentMonthSchedule.blnIsFinalized ? (
                      <Button className={styles.secondaryButton} startIcon={<CloudSyncRoundedIcon />} onClick={() => void fetchInPayroll()} disabled={blnActionLoading} controlId="loan-finalization.fetch-in-payroll.button">
                        {t("fetch_in_payroll_button", "Fetch in Payroll")}
                      </Button>
                    ) : null}
                  </Box>
                </>
              ) : (
                <Typography sx={{ color: "#64748b", fontSize: ".88rem" }}>{t("no_current_month_installment", "No installment is due for this loan in the selected payroll run's month.")}</Typography>
              )}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 1.6 }}>{t("select_run_hint", "Select a payroll run above to see this loan's EMI for that month.")}</Alert>
          )}

          <Typography sx={{ color: "#0f172a", fontWeight: 900, mb: 1 }}>{t("remaining_schedule_title", "Remaining Months")}</Typography>
          {renderScheduleTable(lstRemainingSchedule)}
        </Box>
      ) : (
        <Alert severity="info">{t("select_loan_hint", "Select a payroll run and a loan or advance above, then click Import Data to verify and finalize this month's EMI.")}</Alert>
      )}

      <Dialog open={blnReopenDialogOpen} onClose={() => setBlnReopenDialogOpen(false)} maxWidth="sm" fullWidth controlId="loan-finalization.reopen.dialog">
        <DialogTitle>{t("reopen_reason_title", "Reason for reopening this month's finalized installment")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            value={strReopenReason}
            onChange={(e) => setStrReopenReason(e.target.value)}
            placeholder={t("reopen_reason_placeholder", "Enter the reason for reopening this month's finalized installment")}
            sx={{ mt: 1 }}
            controlId="loan-finalization.reopen.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setBlnReopenDialogOpen(false)} controlId="loan-finalization.reopen.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void reopenCurrentMonthFinalization()} disabled={!strReopenReason.trim()} controlId="loan-finalization.reopen.submit.button">
            {t("reopen_button", "Reopen Finalization")}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels || blnActionLoading} strLabel={t("loading", "Loading...")} />
    </Box>
  );
}
