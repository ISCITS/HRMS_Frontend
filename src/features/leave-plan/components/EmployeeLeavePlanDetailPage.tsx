"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { useEmployeeLeavePlan } from "@/features/leave-plan/hooks/useEmployeeLeavePlan";
import type { EmployeeLeaveBalance, EmployeePlanAssignRequest } from "@/features/leave-plan/types/LeavePlanTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type AssignmentForm = { intLeavePlanID: number; dtEffectiveFrom: string; dtEffectiveTo: string; strAssignmentReason: string };
type MovementForm = { decValue: number; dtTransactionDate: string; strRemarks: string };
type MovementDialog = { strType: "opening" | "credit" | "debit"; objBalance: EmployeeLeaveBalance } | null;

function buildAssignmentSchema(fnT: (strKey: string, strFallback?: string) => string) {
  const strRequired = fnT("validation_required", "This field is required.");
  return yup.object({
    intLeavePlanID: yup.number().integer().positive(strRequired).required(strRequired), dtEffectiveFrom: yup.string().required(strRequired),
    dtEffectiveTo: yup.string().defined().test("date-order", fnT("validation_effective_dates", "Effective To cannot be before Effective From."), function (strValue) { return !strValue || !this.parent.dtEffectiveFrom || strValue >= this.parent.dtEffectiveFrom; }),
    strAssignmentReason: yup.string().trim().min(1, strRequired).max(500, fnT("validation_remarks_length", "Remarks cannot exceed 500 characters.")).required(strRequired),
  });
}

function buildMovementSchema(fnT: (strKey: string, strFallback?: string) => string) {
  const strRequired = fnT("validation_required", "This field is required.");
  return yup.object({
    decValue: yup.number().min(0, fnT("validation_non_negative", "Value cannot be negative.")).required(strRequired),
    dtTransactionDate: yup.string().required(strRequired),
    strRemarks: yup.string().trim().min(1, strRequired).max(500, fnT("validation_remarks_length", "Remarks cannot exceed 500 characters.")).required(strRequired),
  });
}

function formatDate(strValue: string | null): string {
  if (!strValue) return "—";
  const objDate = new Date(`${strValue.slice(0, 10)}T00:00:00`);
  return Number.isNaN(objDate.getTime()) ? strValue : new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

export default function EmployeeLeavePlanDetailPage({ intEmployeeID }: { intEmployeeID: number }) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee_leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const [intLeaveYear, setIntLeaveYear] = useState(new Date().getFullYear());
  const [objMovement, setObjMovement] = useState<MovementDialog>(null);
  const [objPendingAssignment, setObjPendingAssignment] = useState<EmployeePlanAssignRequest | null>(null);
  const [strActionError, setStrActionError] = useState("");
  const {
    objEmployee, objOverview, objCurrentPlan, lstPlans, lstLeaveTypes, lstLedger, blnLoading, blnSaving, strError,
    assignPlan, initializeBalances, setOpeningBalance, adjustBalance,
  } = useEmployeeLeavePlan(intEmployeeID, intLeaveYear);
  const blnCanManage = canDo("LEAVE", "LEAVE_MANAGE") || canDo("LEAVE_MANAGEMENT", "LEAVE_MANAGE");
  const blnCanView = canDo("LEAVE", "LEAVE_VIEW") || canDo("LEAVE_MANAGEMENT", "LEAVE_VIEW");
  const objAssignmentSchema = useMemo(() => buildAssignmentSchema(t), [t]);
  const objMovementSchema = useMemo(() => buildMovementSchema(t), [t]);
  const objAssignmentForm = useForm<AssignmentForm>({ resolver: yupResolver(objAssignmentSchema), defaultValues: { intLeavePlanID: 0, dtEffectiveFrom: new Date().toISOString().slice(0, 10), dtEffectiveTo: "", strAssignmentReason: "" } });
  const objMovementForm = useForm<MovementForm>({ resolver: yupResolver(objMovementSchema), defaultValues: { decValue: 0, dtTransactionDate: new Date().toISOString().slice(0, 10), strRemarks: "" } });
  const dicPlanNames = useMemo(() => Object.fromEntries(lstPlans.map((objPlan) => [objPlan.intID, objPlan.strDisplayName || objPlan.strPlanName])), [lstPlans]);
  const dicTypeNames = useMemo(() => Object.fromEntries(lstLeaveTypes.map((objType) => [objType.intID, `${objType.strTypeCode} - ${objType.strTypeName}`])), [lstLeaveTypes]);
  const objCurrent = objOverview?.objCurrentAssignment ?? null;

  async function executeAction(fnAction: () => Promise<unknown>) {
    setStrActionError("");
    try { await fnAction(); } catch (objError) { setStrActionError((await createApiRequestError(objError)).message); }
  }

  function submitAssignment(objValues: AssignmentForm) {
    if (objEmployee && (objValues.dtEffectiveFrom < objEmployee.dtDateOfJoining || (objEmployee.dtDateOfExit && objValues.dtEffectiveFrom > objEmployee.dtDateOfExit))) {
      objAssignmentForm.setError("dtEffectiveFrom", { message: t("validation_employee_dates", "Effective date must fall within the employee's service dates.") });
      return;
    }
    const objPayload: EmployeePlanAssignRequest = { intEmployeeID, intLeavePlanID: objValues.intLeavePlanID, intLeaveYear, dtEffectiveFrom: objValues.dtEffectiveFrom, dtEffectiveTo: objValues.dtEffectiveTo || null, blnInitializeBalances: true, strAssignmentReason: objValues.strAssignmentReason.trim(), lstOpeningBalances: [] };
    if (objCurrent) setObjPendingAssignment(objPayload);
    else void executeAction(async () => { await assignPlan(objPayload, false); objAssignmentForm.reset({ ...objValues, intLeavePlanID: 0, strAssignmentReason: "" }); });
  }

  async function confirmReplacement() {
    if (!objPendingAssignment) return;
    await executeAction(() => assignPlan(objPendingAssignment, true));
    setObjPendingAssignment(null);
    objAssignmentForm.reset({ intLeavePlanID: 0, dtEffectiveFrom: new Date().toISOString().slice(0, 10), dtEffectiveTo: "", strAssignmentReason: "" });
  }

  function openMovement(strType: "opening" | "credit" | "debit", objBalance: EmployeeLeaveBalance) {
    setObjMovement({ strType, objBalance });
    objMovementForm.reset({ decValue: strType === "opening" ? objBalance.decOpeningBalance : 0, dtTransactionDate: new Date().toISOString().slice(0, 10), strRemarks: "" });
  }

  async function submitMovement(objValues: MovementForm) {
    if (!objMovement) return;
    if (objMovement.strType !== "opening" && objValues.decValue <= 0) {
      objMovementForm.setError("decValue", { message: t("validation_days_positive", "Days must be greater than zero.") });
      return;
    }
    const objPayload = { dtTransactionDate: objValues.dtTransactionDate, strRemarks: objValues.strRemarks.trim() };
    await executeAction(() => objMovement.strType === "opening"
      ? setOpeningBalance(objMovement.objBalance.intID, { ...objPayload, decOpeningBalance: objValues.decValue })
      : adjustBalance(objMovement.objBalance.intID, objMovement.strType, { ...objPayload, decDays: objValues.decValue }));
    setObjMovement(null);
  }

  if (blnLoading || blnRightsLoading) return <Box sx={{ py: 10, textAlign: "center" }}><CircularProgress /><Typography>{t("loading_detail", "Loading employee Leave Plan...")}</Typography></Box>;
  if (!blnCanView) return <Box sx={{ p: 3 }}><Alert severity="warning">{t("access_denied", "Leave assignment access is not available for your user group.")}</Alert></Box>;

  return <Box sx={{ p: { xs: 1.5, md: 2.5 }, display: "grid", gap: 2 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}><Box><Typography variant="h5" fontWeight={800}>{t("detail_title", "Employee Leave Plan")}</Typography><Typography color="text.secondary">{t("detail_subtitle", "Assignment, yearly balances, and append-only ledger history.")}</Typography></Box><Button startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/leave/plan-assignments")} data-control-id="employee-leave-plan.detail.back.button">{t("back_button", "Back")}</Button></Box>
    {(strError || strActionError) ? <Alert severity="error">{strError || strActionError}</Alert> : null}
    <Paper sx={{ p: 2 }}><Typography variant="h6" fontWeight={750}>{t("section_employee_summary", "Employee Summary")}</Typography><Box sx={{ mt: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1 }}><Typography><strong>{t("employee_code", "Employee Code")}:</strong> {objEmployee?.strEmployeeCode}</Typography><Typography><strong>{t("employee_name", "Employee Name")}:</strong> {objEmployee?.strFullName}</Typography><Typography><strong>{t("joining_date", "Joining Date")}:</strong> {formatDate(objEmployee?.dtDateOfJoining ?? null)}</Typography><Typography><strong>{t("exit_date", "Exit Date")}:</strong> {formatDate(objEmployee?.dtDateOfExit ?? null)}</Typography></Box></Paper>

    <Paper sx={{ p: 2 }}><Typography variant="h6" fontWeight={750}>{t("section_current_plan", "Current Leave Plan")}</Typography>{objCurrent ? <Box sx={{ mt: 1, display: "flex", gap: 4, flexWrap: "wrap" }}><Typography><strong>{t("plan", "Plan")}:</strong> {dicPlanNames[objCurrent.intLeavePlanID] ?? `#${objCurrent.intLeavePlanID}`}</Typography><Typography><strong>{t("effective_from", "Effective From")}:</strong> {formatDate(objCurrent.dtEffectiveFrom)}</Typography><Typography><strong>{t("effective_to", "Effective To")}:</strong> {formatDate(objCurrent.dtEffectiveTo)}</Typography><Typography><strong>{t("status", "Status")}:</strong> {objCurrent.strAssignmentStatus}</Typography></Box> : <Typography sx={{ mt: 1 }} color="text.secondary">{t("no_current_plan", "No current Leave Plan is assigned.")}</Typography>}</Paper>

    {blnCanManage ? <Paper component="form" onSubmit={objAssignmentForm.handleSubmit(submitAssignment)} sx={{ p: 2 }}><Typography variant="h6" fontWeight={750} mb={2}>{objCurrent ? t("section_replace_plan", "Replace Leave Plan") : t("section_assign_plan", "Assign Leave Plan")}</Typography><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr 2fr auto" }, gap: 1 }}>
      <Controller name="intLeavePlanID" control={objAssignmentForm.control} render={({ field }) => <TextField select {...field} value={field.value || ""} label={t("select_plan", "Leave Plan")} error={Boolean(objAssignmentForm.formState.errors.intLeavePlanID)} helperText={objAssignmentForm.formState.errors.intLeavePlanID?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.plan.select" }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))}><MenuItem value="" data-control-id="employee-leave-plan.assignment.plan.empty.option">{t("select_plan_placeholder", "Select Plan")}</MenuItem>{lstPlans.filter((objPlan) => objPlan.blnIsActive).map((objPlan) => <MenuItem key={objPlan.intID} value={objPlan.intID} data-control-id={`employee-leave-plan.assignment.plan.${objPlan.intID}.option`}>{objPlan.strPlanCode} - {objPlan.strDisplayName || objPlan.strPlanName}</MenuItem>)}</TextField>} />
      <Controller name="dtEffectiveFrom" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} error={Boolean(objAssignmentForm.formState.errors.dtEffectiveFrom)} helperText={objAssignmentForm.formState.errors.dtEffectiveFrom?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.effective-from.input" }} />} />
      <Controller name="dtEffectiveTo" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} type="date" label={t("effective_to", "Effective To")} InputLabelProps={{ shrink: true }} error={Boolean(objAssignmentForm.formState.errors.dtEffectiveTo)} helperText={objAssignmentForm.formState.errors.dtEffectiveTo?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.effective-to.input" }} />} />
      <Controller name="strAssignmentReason" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} label={t("assignment_reason", "Assignment Reason")} error={Boolean(objAssignmentForm.formState.errors.strAssignmentReason)} helperText={objAssignmentForm.formState.errors.strAssignmentReason?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.reason.input", maxLength: 500 }} />} />
      <Button type="submit" variant="contained" disabled={blnSaving} data-control-id="employee-leave-plan.assignment.submit.button">{objCurrent ? t("replace", "Replace") : t("assign", "Assign")}</Button>
    </Box></Paper> : null}

    <Paper sx={{ p: 2 }}><Typography variant="h6" fontWeight={750} mb={1}>{t("section_assignment_history", "Assignment History")}</Typography><TableContainer><Table size="small"><TableHead><TableRow>{["plan", "effective_from", "effective_to", "status", "source", "reason"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`history_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>{!(objOverview?.lstAssignments.length) ? <TableRow><TableCell colSpan={6} align="center">{t("no_assignment_history", "No assignment history.")}</TableCell></TableRow> : objOverview.lstAssignments.map((objRow) => <TableRow key={objRow.intID}><TableCell>{dicPlanNames[objRow.intLeavePlanID] ?? `#${objRow.intLeavePlanID}`}</TableCell><TableCell>{formatDate(objRow.dtEffectiveFrom)}</TableCell><TableCell>{formatDate(objRow.dtEffectiveTo)}</TableCell><TableCell>{objRow.strAssignmentStatus}</TableCell><TableCell>{objRow.strSourceType}</TableCell><TableCell>{objRow.strAssignmentReason ?? "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>

    <Paper sx={{ p: 2 }}><Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}><Typography variant="h6" fontWeight={750}>{t("section_yearly_balances", "Yearly Balances")}</Typography><Box sx={{ display: "flex", gap: 1 }}><TextField type="number" size="small" label={t("leave_year", "Leave Year")} value={intLeaveYear} onChange={(objEvent) => setIntLeaveYear(Number(objEvent.target.value))} inputProps={{ "data-control-id": "employee-leave-plan.balance.year.input", min: 2001, max: 2999 }} />{blnCanManage && objCurrent ? <Button startIcon={<AddRoundedIcon />} onClick={() => void executeAction(initializeBalances)} disabled={blnSaving} data-control-id="employee-leave-plan.balance.initialize.button">{t("initialize_balances", "Initialize Balances")}</Button> : null}</Box></Box>
      <TableContainer><Table size="small" sx={{ minWidth: 1150 }}><TableHead><TableRow>{["leave_type", "opening", "entitlement", "accrued", "credit", "debit", "utilized", "hold", "available", "locked", "actions"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`balance_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>{!(objOverview?.lstBalances.length) ? <TableRow><TableCell colSpan={11} align="center">{t("no_balances", "No balances found for this year.")}</TableCell></TableRow> : objOverview.lstBalances.map((objBalance) => { const blnOpeningAllowed = objCurrentPlan?.lstItems?.find((objItem) => objItem.intLeaveTypeID === objBalance.intLeaveTypeID)?.blnOpeningBalanceAllowed ?? false; return <TableRow key={objBalance.intID}><TableCell>{dicTypeNames[objBalance.intLeaveTypeID] ?? `#${objBalance.intLeaveTypeID}`}</TableCell><TableCell>{objBalance.decOpeningBalance}</TableCell><TableCell>{objBalance.decEntitledBalance}</TableCell><TableCell>{objBalance.decAccruedBalance}</TableCell><TableCell>{objBalance.decAdjustmentCredit}</TableCell><TableCell>{objBalance.decAdjustmentDebit}</TableCell><TableCell>{objBalance.decUtilizedBalance}</TableCell><TableCell>{objBalance.decHoldBalance}</TableCell><TableCell sx={{ fontWeight: 800 }}>{objBalance.decAvailableBalance}</TableCell><TableCell>{objBalance.blnIsLocked ? t("yes", "Yes") : t("no", "No")}</TableCell><TableCell>{blnCanManage ? <Box sx={{ display: "flex", gap: .5 }}><Button size="small" disabled={objBalance.blnIsLocked || !blnOpeningAllowed} onClick={() => openMovement("opening", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.opening.button`}>{t("opening", "Opening")}</Button><Button size="small" disabled={objBalance.blnIsLocked} onClick={() => openMovement("credit", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.credit.button`}>{t("credit", "Credit")}</Button><Button size="small" color="warning" disabled={objBalance.blnIsLocked} onClick={() => openMovement("debit", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.debit.button`}>{t("debit", "Debit")}</Button></Box> : "—"}</TableCell></TableRow>; })}</TableBody></Table></TableContainer>
    </Paper>

    <Paper sx={{ p: 2 }}><Typography variant="h6" fontWeight={750} mb={1}>{t("section_ledger_history", "Ledger History")}</Typography><TableContainer><Table size="small" sx={{ minWidth: 950 }}><TableHead><TableRow>{["date", "leave_type", "transaction_type", "credit", "debit", "balance_after", "source", "remarks"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`ledger_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>{!lstLedger.length ? <TableRow><TableCell colSpan={8} align="center">{t("no_ledger", "No ledger movements found.")}</TableCell></TableRow> : lstLedger.map((objLedger) => <TableRow key={objLedger.intID}><TableCell>{formatDate(objLedger.dtTransactionDate)}</TableCell><TableCell>{dicTypeNames[objLedger.intLeaveTypeID] ?? `#${objLedger.intLeaveTypeID}`}</TableCell><TableCell>{objLedger.strTransactionType}</TableCell><TableCell>{objLedger.decCreditDays}</TableCell><TableCell>{objLedger.decDebitDays}</TableCell><TableCell>{objLedger.decBalanceAfter}</TableCell><TableCell>{objLedger.strSourceType}</TableCell><TableCell>{objLedger.strTransactionRemarks ?? "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>

    <Dialog open={Boolean(objPendingAssignment)} onClose={() => !blnSaving && setObjPendingAssignment(null)} PaperProps={{ "data-control-id": "employee-leave-plan.replace.dialog" } as Record<string, string>}><DialogTitle>{t("replace_confirm_title", "Confirm Plan Replacement")}</DialogTitle><DialogContent><Typography>{t("replace_confirm_message", "The current Plan will be end-dated and replaced from the selected effective date. Continue?")}</Typography></DialogContent><DialogActions><Button onClick={() => setObjPendingAssignment(null)} data-control-id="employee-leave-plan.replace.cancel.button">{t("cancel", "Cancel")}</Button><Button variant="contained" onClick={() => void confirmReplacement()} disabled={blnSaving} data-control-id="employee-leave-plan.replace.confirm.button">{t("replace", "Replace")}</Button></DialogActions></Dialog>
    <Dialog open={Boolean(objMovement)} onClose={() => !blnSaving && setObjMovement(null)} PaperProps={{ "data-control-id": "employee-leave-plan.movement.dialog" } as Record<string, string>}><Box component="form" onSubmit={objMovementForm.handleSubmit(submitMovement)}><DialogTitle>{objMovement?.strType === "opening" ? t("opening_balance_title", "Set Opening Balance") : objMovement?.strType === "credit" ? t("manual_credit_title", "Manual Credit") : t("manual_debit_title", "Manual Debit")}</DialogTitle><DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important", minWidth: { sm: 440 } }}>
      <Controller name="decValue" control={objMovementForm.control} render={({ field }) => <TextField {...field} type="number" label={objMovement?.strType === "opening" ? t("opening_balance", "Opening Balance") : t("days", "Days")} error={Boolean(objMovementForm.formState.errors.decValue)} helperText={objMovementForm.formState.errors.decValue?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.days.input", min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} />} />
      <Controller name="dtTransactionDate" control={objMovementForm.control} render={({ field }) => <TextField {...field} type="date" label={t("transaction_date", "Transaction Date")} InputLabelProps={{ shrink: true }} error={Boolean(objMovementForm.formState.errors.dtTransactionDate)} helperText={objMovementForm.formState.errors.dtTransactionDate?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.date.input" }} />} />
      <Controller name="strRemarks" control={objMovementForm.control} render={({ field }) => <TextField {...field} multiline minRows={3} label={t("remarks", "Remarks")} error={Boolean(objMovementForm.formState.errors.strRemarks)} helperText={objMovementForm.formState.errors.strRemarks?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.remarks.input", maxLength: 500 }} />} />
    </DialogContent><DialogActions><Button onClick={() => setObjMovement(null)} data-control-id="employee-leave-plan.movement.cancel.button">{t("cancel", "Cancel")}</Button><Button type="submit" variant="contained" disabled={blnSaving} data-control-id="employee-leave-plan.movement.save.button">{t("save", "Save")}</Button></DialogActions></Box></Dialog>
  </Box>;
}
