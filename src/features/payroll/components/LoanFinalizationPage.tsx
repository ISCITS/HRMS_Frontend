"use client";

import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
import BlockingLoader from "@/components/shared/BlockingLoader";
import styles from "@/features/payroll/components/PayrollScreen.module.css";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { loanAdvanceService } from "@/features/payroll/services/loanAdvanceService";
import { loanRecoveryService } from "@/features/payroll/services/loanRecoveryService";
import { dicLoanRecoveryPostingStatus, type LoanAdvanceRecord, type LoanRecoveryRow, type LoanRecoveryRunOption } from "@/features/payroll/types";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

const lstModuleCodes = ["PAYROLL_LOANS_ADVANCES", "LOANS_ADVANCES", "LOANS_AND_ADVANCES", "PAYROLL_LOAN_FINALIZATION", "LOAN_FINALIZATION"];

function formatCurrency(decValue?: number | null) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(decValue || 0));
}

const dicPostingStatusMeta: Record<number, { strLabel: string; strColor: "default" | "info" | "success" | "error" }> = {
  [dicLoanRecoveryPostingStatus.NOT_POSTED]: { strLabel: "Not Posted", strColor: "default" },
  [dicLoanRecoveryPostingStatus.POSTED_TO_PAYROLL_INPUT]: { strLabel: "Posted to Payroll", strColor: "info" },
  [dicLoanRecoveryPostingStatus.PAYROLL_PROCESSED]: { strLabel: "Payroll Processed", strColor: "success" },
  [dicLoanRecoveryPostingStatus.REVERSED_OR_UNPOSTED]: { strLabel: "Reversed / Unposted", strColor: "default" },
  [dicLoanRecoveryPostingStatus.POSTING_ERROR]: { strLabel: "Posting Error", strColor: "error" },
};

const dicScheduleStatusFallbackLabels: Record<string, string> = {
  pending: "Due",
  recovered: "Recovered",
  partial: "Partially Recovered",
  skipped: "Skipped",
  adjusted: "Adjusted",
  fnf_recovered: "Recovered via F&F",
  cancelled: "Cancelled",
};

export default function LoanFinalizationPage() {
  const { t, blnLoadingLabels } = useModuleLabels("loan-recovery");
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstModuleCodes);
  const [lstPayrollRuns, setLstPayrollRuns] = useState<LoanRecoveryRunOption[]>([]);
  const [strSelectedRunUUID, setStrSelectedRunUUID] = useState("");
  const [objRun, setObjRun] = useState<LoanRecoveryRunOption | null>(null);
  const [lstRows, setLstRows] = useState<LoanRecoveryRow[]>([]);
  const [setSelectedScheduleIDs, setSetSelectedScheduleIDs] = useState<Set<number>>(new Set());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnActionLoading, setBlnActionLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [blnConfirmPostOpen, setBlnConfirmPostOpen] = useState(false);
  const [blnUnpostDialogOpen, setBlnUnpostDialogOpen] = useState(false);
  const [intUnpostScheduleID, setIntUnpostScheduleID] = useState<number | null>(null);
  const [strUnpostReason, setStrUnpostReason] = useState("");
  const [objSkipRow, setObjSkipRow] = useState<LoanRecoveryRow | null>(null);
  const [strSkipReason, setStrSkipReason] = useState("");
  const [objAdjustRow, setObjAdjustRow] = useState<LoanRecoveryRow | null>(null);
  const [strAdjustPrincipal, setStrAdjustPrincipal] = useState("");
  const [strAdjustInterest, setStrAdjustInterest] = useState("");
  const [strAdjustReason, setStrAdjustReason] = useState("");
  const [objHistoryRow, setObjHistoryRow] = useState<LoanRecoveryRow | null>(null);
  const [objHistoryLoan, setObjHistoryLoan] = useState<LoanAdvanceRecord | null>(null);
  const [blnHistoryLoading, setBlnHistoryLoading] = useState(false);
  const [strHistoryError, setStrHistoryError] = useState("");

  const blnCanView = canViewAny() || canDoAny("loan_adv_view");
  const blnCanPost = canDoAny("loan_adv_recovery_post");
  const blnCanUnpost = canDoAny("loan_adv_recovery_unpost");
  // Skip/adjust reuse the Loans & Advances workflow actions this screen already has rights to
  // (same module, same underlying schedule row) rather than new Loan Recovery-specific rights.
  const blnCanSkip = canDoAny("loan_adv_skip_installment");
  const blnCanAdjust = canDoAny("loan_adv_adjust_schedule");

  useEffect(() => {
    if (blnRightsLoading || !blnCanView) return;
    loanRecoveryService
      .listEligiblePayrollRuns()
      .then(setLstPayrollRuns)
      .catch((objError) => setStrError(objError instanceof Error ? objError.message : t("error_load_runs", "Unable to load eligible payroll runs.")))
      .finally(() => setBlnLoading(false));
  }, [blnRightsLoading, blnCanView]);

  async function loadEligible(strRunUUID: string) {
    if (!strRunUUID) {
      setObjRun(null);
      setLstRows([]);
      return;
    }
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await loanRecoveryService.listEligible(strRunUUID);
      setObjRun(objResult.objRun);
      setLstRows(objResult.lstRows);
      setSetSelectedScheduleIDs(new Set());
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_load_eligible", "Unable to load loans due for this payroll run."));
    } finally {
      setBlnLoading(false);
    }
  }

  function selectRun(strRunUUID: string) {
    setStrSelectedRunUUID(strRunUUID);
    setStrError("");
    setStrSuccess("");
    void loadEligible(strRunUUID);
  }

  function toggleRowSelected(intScheduleID: number) {
    setSetSelectedScheduleIDs((setPrev) => {
      const setNext = new Set(setPrev);
      if (setNext.has(intScheduleID)) setNext.delete(intScheduleID);
      else setNext.add(intScheduleID);
      return setNext;
    });
  }

  const lstPostableRows = useMemo(() => lstRows.filter((objRow) => objRow.blnCanPost), [lstRows]);
  const blnAllPostableSelected = lstPostableRows.length > 0 && lstPostableRows.every((objRow) => setSelectedScheduleIDs.has(objRow.intScheduleID));

  function toggleSelectAll() {
    setSetSelectedScheduleIDs((setPrev) => {
      if (blnAllPostableSelected) return new Set();
      return new Set(lstPostableRows.map((objRow) => objRow.intScheduleID));
    });
  }

  const lstSelectedRows = useMemo(() => lstRows.filter((objRow) => setSelectedScheduleIDs.has(objRow.intScheduleID)), [lstRows, setSelectedScheduleIDs]);
  const decSelectedTotal = useMemo(() => lstSelectedRows.reduce((decSum, objRow) => decSum + objRow.decTotalDueAmount, 0), [lstSelectedRows]);

  async function confirmPostToPayroll() {
    setBlnConfirmPostOpen(false);
    if (!strSelectedRunUUID || setSelectedScheduleIDs.size === 0) return;
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objResult = await loanRecoveryService.post(strSelectedRunUUID, Array.from(setSelectedScheduleIDs));
      setObjRun(objResult.objRun);
      setLstRows(objResult.lstRows);
      setSetSelectedScheduleIDs(new Set());
      setStrSuccess(
        t("post_success", `Posted ${objResult.intPostedCount} installment(s) to payroll.${objResult.intFailedCount ? ` ${objResult.intFailedCount} could not be posted.` : ""}`)
      );
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_post", "Unable to post loan recoveries to payroll."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  function openUnpostDialog(intScheduleID: number) {
    setIntUnpostScheduleID(intScheduleID);
    setStrUnpostReason("");
    setBlnUnpostDialogOpen(true);
  }

  async function confirmUnpost() {
    if (!intUnpostScheduleID) return;
    setBlnUnpostDialogOpen(false);
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      const objResult = await loanRecoveryService.unpost(intUnpostScheduleID, strUnpostReason.trim() || undefined);
      setObjRun(objResult.objRun);
      setLstRows(objResult.lstRows);
      setStrSuccess(t("unpost_success", "Loan recovery posting withdrawn successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_unpost", "Unable to withdraw this posting."));
    } finally {
      setBlnActionLoading(false);
      setIntUnpostScheduleID(null);
    }
  }

  function openSkipDialog(objRow: LoanRecoveryRow) {
    setObjSkipRow(objRow);
    setStrSkipReason("");
  }

  async function confirmSkip() {
    if (!objSkipRow || !strSkipReason.trim()) return;
    const objRowToSkip = objSkipRow;
    setObjSkipRow(null);
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      await loanAdvanceService.action(objRowToSkip.strLoanRecordUUID, "skip-installment", { intScheduleID: objRowToSkip.intScheduleID, strReason: strSkipReason.trim() });
      await loadEligible(strSelectedRunUUID);
      setStrSuccess(t("skip_success", "This month's installment skipped successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_skip", "Unable to skip this installment."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  function openAdjustDialog(objRow: LoanRecoveryRow) {
    setObjAdjustRow(objRow);
    setStrAdjustPrincipal(String(objRow.decPrincipalDueAmount));
    setStrAdjustInterest(String(objRow.decInterestDueAmount));
    setStrAdjustReason("");
  }

  async function confirmAdjust() {
    if (!objAdjustRow || !strAdjustReason.trim()) return;
    const objRowToAdjust = objAdjustRow;
    setObjAdjustRow(null);
    setBlnActionLoading(true);
    setStrError("");
    setStrSuccess("");
    try {
      await loanAdvanceService.action(objRowToAdjust.strLoanRecordUUID, "adjust-schedule", {
        intScheduleID: objRowToAdjust.intScheduleID,
        decPrincipalDueAmount: Number(strAdjustPrincipal || 0),
        decActualInterestAmount: Number(strAdjustInterest || 0),
        strReason: strAdjustReason.trim(),
      });
      await loadEligible(strSelectedRunUUID);
      setStrSuccess(t("adjust_success", "This month's installment amount adjusted successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("error_adjust", "Unable to adjust this installment."));
    } finally {
      setBlnActionLoading(false);
    }
  }

  function openHistoryDialog(objRow: LoanRecoveryRow) {
    setObjHistoryRow(objRow);
    setObjHistoryLoan(null);
    setStrHistoryError("");
    setBlnHistoryLoading(true);
    loanAdvanceService
      .getLoan(objRow.strLoanRecordUUID)
      .then(setObjHistoryLoan)
      .catch((objError) => setStrHistoryError(objError instanceof Error ? objError.message : t("error_history", "Unable to load installment history.")))
      .finally(() => setBlnHistoryLoading(false));
  }

  const lstTableRows = useMemo(
    () =>
      lstRows.map((objRow) => {
        const objPostingMeta = dicPostingStatusMeta[objRow.intPayrollPostingStatus] || dicPostingStatusMeta[dicLoanRecoveryPostingStatus.NOT_POSTED];
        return {
          id: objRow.intScheduleID,
          action: objRow.blnCanPost && blnCanPost ? (
            <Checkbox
              size="small"
              checked={setSelectedScheduleIDs.has(objRow.intScheduleID)}
              onChange={() => toggleRowSelected(objRow.intScheduleID)}
              controlId={`loan-recovery.row-select.${objRow.intScheduleID}.checkbox`}
            />
          ) : null,
          rowActions: (
            <Stack direction="row" spacing={0}>
              <Tooltip title={t("history_button", "View Installment History")} arrow>
                <IconButton size="small" onClick={() => openHistoryDialog(objRow)} aria-label={t("history_button", "View Installment History")} controlId={`loan-recovery.row.${objRow.intScheduleID}.history.button`}>
                  <HistoryRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {objRow.blnCanUnpost && blnCanUnpost ? (
                <Tooltip title={t("unpost_button", "Unpost")} arrow>
                  <IconButton size="small" onClick={() => openUnpostDialog(objRow.intScheduleID)} aria-label={t("unpost_button", "Unpost")} controlId={`loan-recovery.row.${objRow.intScheduleID}.unpost.button`}>
                    <RestartAltRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              {objRow.blnCanAdjust && blnCanAdjust ? (
                <Tooltip title={t("adjust_button", "Edit")} arrow>
                  <IconButton size="small" onClick={() => openAdjustDialog(objRow)} aria-label={t("adjust_button", "Edit")} controlId={`loan-recovery.row.${objRow.intScheduleID}.edit.button`}>
                    <EditRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
              {objRow.blnCanSkip && blnCanSkip ? (
                <Tooltip title={t("skip_button", "Skip")} arrow>
                  <IconButton size="small" onClick={() => openSkipDialog(objRow)} aria-label={t("skip_button", "Skip")} controlId={`loan-recovery.row.${objRow.intScheduleID}.skip.button`}>
                    <BlockRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : null}
            </Stack>
          ),
          employeeCode: objRow.strEmployeeCode,
          employeeName: objRow.strEmployeeName,
          loanNumber: objRow.strLoanAdvanceNumber || "-",
          category: objRow.strCategoryName,
          installmentNo: objRow.intInstallmentNo,
          openingOutstanding: formatCurrency(objRow.decOpeningPrincipalBalance),
          openingOutstandingSort: Number(objRow.decOpeningPrincipalBalance || 0),
          principalDue: formatCurrency(objRow.decPrincipalDueAmount),
          principalDueSort: Number(objRow.decPrincipalDueAmount || 0),
          interestDue: formatCurrency(objRow.decInterestDueAmount),
          interestDueSort: Number(objRow.decInterestDueAmount || 0),
          totalDue: formatCurrency(objRow.decTotalDueAmount),
          totalDueSort: Number(objRow.decTotalDueAmount || 0),
          balanceAfter: formatCurrency(objRow.decClosingPrincipalBalance),
          balanceAfterSort: Number(objRow.decClosingPrincipalBalance || 0),
          postingStatus: (
            <>
              <Chip size="small" label={t(`posting_status_${objRow.intPayrollPostingStatus}`, objPostingMeta.strLabel)} color={objPostingMeta.strColor} variant={objRow.intPayrollPostingStatus === dicLoanRecoveryPostingStatus.NOT_POSTED ? "outlined" : "filled"} />
              {objRow.strPostingErrorMessage ? (
                <Typography sx={{ fontSize: ".72rem", color: "#dc2626", mt: 0.4 }}>{objRow.strPostingErrorMessage}</Typography>
              ) : null}
            </>
          ),
          scheduleStatus: t(`schedule_status_${objRow.strScheduleStatus}`, dicScheduleStatusFallbackLabels[objRow.strScheduleStatus] || objRow.strScheduleStatus.replaceAll("_", " ")),
        };
      }),
    [lstRows, setSelectedScheduleIDs, blnCanPost, blnCanUnpost, blnCanAdjust, blnCanSkip, t]
  );

  const lstTableColumns = useMemo<CommonTableColumn<(typeof lstTableRows)[number]>[]>(
    () => [
      {
        field: "action",
        headerName: lstPostableRows.length > 0 && blnCanPost ? (
          <Checkbox size="small" checked={blnAllPostableSelected} onChange={toggleSelectAll} controlId="loan-recovery.select-all.checkbox" />
        ) : "",
        align: "center",
        sortable: false,
        filterable: false,
        exportable: false,
        width: 44,
      },
      { field: "rowActions", headerName: t("table_actions", "Actions"), align: "center", sortable: false, filterable: false, exportable: false, width: 120 },
      { field: "employeeCode", headerName: t("table_employee_code", "Employee Code"), width: 110 },
      { field: "employeeName", headerName: t("table_employee_name", "Employee Name"), width: 150 },
      { field: "loanNumber", headerName: t("table_loan_no", "Loan/Advance No."), width: 120 },
      { field: "category", headerName: t("table_category", "Category"), width: 120 },
      { field: "installmentNo", headerName: t("table_installment_no", "Installment No."), align: "center", width: 90 },
      { field: "openingOutstanding", headerName: t("table_opening_outstanding", "Opening Outstanding"), align: "right", width: 130, sortAccessor: (dicRow) => dicRow.openingOutstandingSort },
      { field: "principalDue", headerName: t("table_principal_due", "Principal Due"), align: "right", width: 110, sortAccessor: (dicRow) => dicRow.principalDueSort },
      { field: "interestDue", headerName: t("table_interest_due", "Interest Due"), align: "right", width: 100, sortAccessor: (dicRow) => dicRow.interestDueSort },
      { field: "totalDue", headerName: t("table_total_due", "Total Due"), align: "right", width: 100, sortAccessor: (dicRow) => dicRow.totalDueSort },
      { field: "balanceAfter", headerName: t("table_balance_after", "Balance After This Installment"), align: "right", width: 140, sortAccessor: (dicRow) => dicRow.balanceAfterSort },
      { field: "postingStatus", headerName: t("table_posting_status", "Posting Status"), sortable: false, filterable: false, width: 130 },
      { field: "scheduleStatus", headerName: t("table_schedule_status", "Schedule Status"), width: 110 },
    ],
    [t, lstPostableRows, blnCanPost, blnAllPostableSelected]
  );

  if (!blnCanView && !blnRightsLoading) {
    return (
      <Box className={styles.page}>
        <Alert severity="warning">{t("no_access", "Loan recovery access is not available for your user group.")}</Alert>
      </Box>
    );
  }

  return (
    <Box className={styles.page}>
      <Typography className={styles.title}>{t("page_title", "Loan Recovery")}</Typography>

      <Box className={styles.controlsCard}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2, alignItems: "flex-end" }}>
          <TextField
            select
            label={t("field_payroll_run", "Payroll Run")}
            value={strSelectedRunUUID}
            onChange={(e) => selectRun(e.target.value)}
            size="small"
            sx={{ minWidth: 320, flex: "1 1 320px" }}
            controlId="loan-recovery.select.payroll-run"
          >
            <MenuItem value="">{t("select_run_prompt", "Select an open payroll run")}</MenuItem>
            {lstPayrollRuns.map((objOption) => (
              <MenuItem key={objOption.strRecordUUID} value={objOption.strRecordUUID}>
                {objOption.strRunName} ({objOption.dtPayrollMonth.slice(0, 7)})
              </MenuItem>
            ))}
          </TextField>
          {blnCanPost ? (
            <Button
              className={styles.primaryButton}
              startIcon={<CloudUploadRoundedIcon />}
              onClick={() => setBlnConfirmPostOpen(true)}
              disabled={!objRun || setSelectedScheduleIDs.size === 0 || blnActionLoading}
              controlId="loan-recovery.post.button"
            >
              {t("post_button", "Post to Payroll")}
            </Button>
          ) : null}
        </Box>
      </Box>

      {strRightsError ? <Alert severity="warning">{strRightsError}</Alert> : null}
      {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
      {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}

      {!objRun ? (
        <Alert severity="info">{t("select_run_hint", "Select an open payroll run above to see the loan/advance installments due that month.")}</Alert>
      ) : (
        <Box className={styles.tableCard}>
          <CommonTable
            columns={lstTableColumns}
            rows={lstTableRows}
            rowIdField="id"
            exportFileName="loan-recovery"
            showPaginationSummary
            emptyMessage={t("empty_message", "No loan/advance installments due for this payroll run.")}
            testIdPrefix="loan-recovery.list"
            sx={{ p: 0, boxShadow: "none", background: "transparent" }}
          />
        </Box>
      )}

      <Dialog open={blnConfirmPostOpen} onClose={() => setBlnConfirmPostOpen(false)} maxWidth="xs" fullWidth controlId="loan-recovery.confirm-post.dialog">
        <DialogTitle>{t("confirm_post_title", "Post to Payroll?")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(
              "confirm_post_body",
              `This will post ${setSelectedScheduleIDs.size} installment(s) totalling ${formatCurrency(decSelectedTotal)} to this payroll run's deductions.`
            )}
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, fontSize: ".82rem" }}>
            {t("confirm_post_skip_note", "Rows marked Skipped, already posted, or already processed are not included -- use Edit or Skip on a row first if you need to change or exclude it.")}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setBlnConfirmPostOpen(false)} controlId="loan-recovery.confirm-post.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void confirmPostToPayroll()} controlId="loan-recovery.confirm-post.submit.button">
            {t("post_button", "Post to Payroll")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnUnpostDialogOpen} onClose={() => setBlnUnpostDialogOpen(false)} maxWidth="sm" fullWidth controlId="loan-recovery.unpost.dialog">
        <DialogTitle>{t("unpost_reason_title", "Withdraw this posting?")}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={2}
            value={strUnpostReason}
            onChange={(e) => setStrUnpostReason(e.target.value)}
            placeholder={t("unpost_reason_placeholder", "Optional reason for withdrawing this posting")}
            sx={{ mt: 1 }}
            controlId="loan-recovery.unpost.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setBlnUnpostDialogOpen(false)} controlId="loan-recovery.unpost.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void confirmUnpost()} controlId="loan-recovery.unpost.submit.button">
            {t("unpost_button", "Unpost")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objSkipRow)} onClose={() => setObjSkipRow(null)} maxWidth="sm" fullWidth controlId="loan-recovery.skip.dialog">
        <DialogTitle>{t("skip_reason_title", "Skip this month's installment?")}</DialogTitle>
        <DialogContent>
          {objSkipRow ? (
            <DialogContentText sx={{ mb: 1.5 }}>
              {t("skip_reason_subtitle", `${objSkipRow.strEmployeeName} (${objSkipRow.strEmployeeCode}) - installment #${objSkipRow.intInstallmentNo}, ${formatCurrency(objSkipRow.decTotalDueAmount)}.`)}
            </DialogContentText>
          ) : null}
          <TextField
            autoFocus
            fullWidth
            required
            multiline
            minRows={2}
            label={t("field_skip_reason", "Reason")}
            value={strSkipReason}
            onChange={(e) => setStrSkipReason(e.target.value)}
            placeholder={t("skip_reason_placeholder", "Enter the reason this installment should be skipped this month")}
            controlId="loan-recovery.skip.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setObjSkipRow(null)} controlId="loan-recovery.skip.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void confirmSkip()} disabled={!strSkipReason.trim()} controlId="loan-recovery.skip.submit.button">
            {t("skip_button", "Skip")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objAdjustRow)} onClose={() => setObjAdjustRow(null)} maxWidth="sm" fullWidth controlId="loan-recovery.adjust.dialog">
        <DialogTitle>{t("adjust_reason_title", "Change this month's installment amount")}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.4, pt: "12px !important" }}>
          {objAdjustRow ? (
            <DialogContentText>
              {t("adjust_reason_subtitle", `${objAdjustRow.strEmployeeName} (${objAdjustRow.strEmployeeCode}) - installment #${objAdjustRow.intInstallmentNo}.`)}
            </DialogContentText>
          ) : null}
          <TextField
            fullWidth
            type="number"
            label={t("field_principal_due", "Principal Due")}
            value={strAdjustPrincipal}
            onChange={(e) => setStrAdjustPrincipal(e.target.value)}
            controlId="loan-recovery.adjust.principal.input"
          />
          <TextField
            fullWidth
            type="number"
            label={t("field_interest_due", "Interest Due")}
            value={strAdjustInterest}
            onChange={(e) => setStrAdjustInterest(e.target.value)}
            controlId="loan-recovery.adjust.interest.input"
          />
          <TextField
            fullWidth
            required
            multiline
            minRows={2}
            label={t("field_adjust_reason", "Reason")}
            value={strAdjustReason}
            onChange={(e) => setStrAdjustReason(e.target.value)}
            placeholder={t("adjust_reason_placeholder", "Enter the reason this month's amount is being changed")}
            controlId="loan-recovery.adjust.reason.textarea"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setObjAdjustRow(null)} controlId="loan-recovery.adjust.cancel.button">
            {t("cancel", "Cancel")}
          </Button>
          <Button className={styles.primaryButton} onClick={() => void confirmAdjust()} disabled={!strAdjustReason.trim()} controlId="loan-recovery.adjust.submit.button">
            {t("save", "Save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objHistoryRow)} onClose={() => setObjHistoryRow(null)} maxWidth="md" fullWidth controlId="loan-recovery.history.dialog">
        <DialogTitle>{t("history_dialog_title", "Installment History")}</DialogTitle>
        <DialogContent>
          {objHistoryRow ? (
            <DialogContentText sx={{ mb: 1.5 }}>
              {t("history_dialog_subtitle", `${objHistoryRow.strEmployeeName} (${objHistoryRow.strEmployeeCode}) - ${objHistoryRow.strLoanAdvanceNumber || "-"}`)}
            </DialogContentText>
          ) : null}
          {strHistoryError ? <Alert severity="error" sx={{ mb: 1.5 }}>{strHistoryError}</Alert> : null}
          {objHistoryLoan ? (
            <>
              <Typography sx={{ fontWeight: 800, mb: 1.5 }}>
                {t(
                  "history_paid_summary",
                  `${(objHistoryLoan.lstSchedule || []).filter((objInstallment) => ["recovered", "fnf_recovered"].includes(objInstallment.strScheduleStatus)).length} of ${(objHistoryLoan.lstSchedule || []).length} installments paid`
                )}
              </Typography>
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("table_installment_no", "Installment No.")}</TableCell>
                      <TableCell>{t("history_month", "Payroll Month")}</TableCell>
                      <TableCell align="right">{t("table_total_due", "Total Due")}</TableCell>
                      <TableCell align="right">{t("history_recovered", "Recovered")}</TableCell>
                      <TableCell>{t("table_schedule_status", "Schedule Status")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(objHistoryLoan.lstSchedule || []).map((objInstallment) => (
                      <TableRow key={objInstallment.intID}>
                        <TableCell>{objInstallment.intInstallmentNo}</TableCell>
                        <TableCell>{(objInstallment.dtPayrollMonth || "").slice(0, 7)}</TableCell>
                        <TableCell align="right">{formatCurrency(objInstallment.decTotalDueAmount)}</TableCell>
                        <TableCell align="right">{formatCurrency(objInstallment.decRecoveredTotalAmount)}</TableCell>
                        <TableCell>{t(`schedule_status_${objInstallment.strScheduleStatus}`, dicScheduleStatusFallbackLabels[objInstallment.strScheduleStatus] || objInstallment.strScheduleStatus.replaceAll("_", " "))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button className={styles.secondaryButton} onClick={() => setObjHistoryRow(null)} controlId="loan-recovery.history.close.button">
            {t("close", "Close")}
          </Button>
        </DialogActions>
      </Dialog>

      <BlockingLoader blnOpen={blnLoading || blnRightsLoading || blnLoadingLabels || blnActionLoading || blnHistoryLoading} strLabel={t("loading", "Loading...")} />
    </Box>
  );
}
