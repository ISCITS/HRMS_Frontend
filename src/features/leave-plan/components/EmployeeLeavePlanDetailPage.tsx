"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, MenuItem, Paper, Snackbar, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import * as yup from "yup";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { useEmployeeLeavePlan } from "@/features/leave-plan/hooks/useEmployeeLeavePlan";
import type { EmployeeLeaveBalance, EmployeePlanAssignRequest, LeavePlan, ReplacementImpact } from "@/features/leave-plan/types/LeavePlanTypes";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useActionRights } from "@/features/security/hooks/useActionRights";

type AssignmentForm = { intLeavePlanID: number; dtEffectiveFrom: string; dtEffectiveTo: string; strAssignmentReason: string };
type MovementForm = { decValue: number; dtTransactionDate: string; strRemarks: string };
type MovementDialog = { strType: "opening" | "credit" | "debit"; objBalance: EmployeeLeaveBalance } | null;

// Reuse the permanent section-card treatment used by the Salary Component editor.
const objSectionSx = { borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" } as const;

// Real collapsible section card (the previous Accordion helpers never actually collapsed). Collapsed
// by default per the guide for Replace / Leave Plan History / Recent Transactions; `blnOpen`/`title`
// drive the clickable header. `objAction` renders controls (e.g. year picker) in the header row.
// `blnOpen`/`fnOnOpenChange` make the card controlled (used by Replace, so the Save buttons can open
// it); `blnKeepMounted` keeps the body in the DOM while collapsed, which the assignment form needs
// for the header/footer submit buttons to reach it.
type CollapsibleCardProps = PropsWithChildren<{
  strTitle: string;
  blnDefaultOpen?: boolean;
  objAction?: ReactNode;
  blnOpen?: boolean;
  fnOnOpenChange?: (blnNext: boolean) => void;
  blnKeepMounted?: boolean;
}>;
function CollapsibleCard({ strTitle, blnDefaultOpen = false, objAction, blnOpen: blnControlledOpen, fnOnOpenChange, blnKeepMounted = false, children }: CollapsibleCardProps) {
  const [blnInternalOpen, setBlnInternalOpen] = useState(blnDefaultOpen);
  const blnOpen = blnControlledOpen ?? blnInternalOpen;
  const setBlnOpen = (fnNext: (blnPrev: boolean) => boolean) => {
    if (fnOnOpenChange) fnOnOpenChange(fnNext(blnOpen));
    else setBlnInternalOpen(fnNext);
  };
  return (
    <Paper sx={objSectionSx}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5 }}>
        <Box role="button" aria-expanded={blnOpen} onClick={() => setBlnOpen((blnPrev) => !blnPrev)} sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer", flex: 1 }}>
          <ExpandMoreRoundedIcon sx={{ transform: blnOpen ? "rotate(180deg)" : "none", transition: "transform .2s", color: "#64748b" }} />
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{strTitle}</Typography>
        </Box>
        {objAction ? <Box onClick={(objEvent) => objEvent.stopPropagation()}>{objAction}</Box> : null}
      </Box>
      <Collapse in={blnOpen} unmountOnExit={!blnKeepMounted}>
        <Box sx={{ mt: 2, "& .MuiTableHead-root .MuiTableCell-root": { textTransform: "capitalize" } }}>{children}</Box>
      </Collapse>
    </Paper>
  );
}

// Always-open section card (compact summary + primary Yearly Balances).
function SectionCard({ strTitle, objAction, children }: PropsWithChildren<{ strTitle: string; objAction?: ReactNode }>) {
  return (
    <Paper sx={objSectionSx}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5, mb: 2 }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{strTitle}</Typography>
        {objAction ?? null}
      </Box>
      <Box sx={{ "& .MuiTableHead-root .MuiTableCell-root": { textTransform: "capitalize" } }}>{children}</Box>
    </Paper>
  );
}

// Yearly-balance column labels (guide §5). Keys map to translation keys with these English fallbacks.
const lstBalanceColumns: Array<{ key: string; label: string }> = [
  { key: "leave_type", label: "Leave Type" },
  { key: "opening", label: "Opening Balance" },
  { key: "entitlement", label: "Entitlement" },
  { key: "accrued", label: "Accrued" },
  { key: "credit", label: "Manual Credit" },
  { key: "debit", label: "Manual Debit" },
  { key: "utilized", label: "Utilized" },
  { key: "hold", label: "On Hold" },
  { key: "available", label: "Available" },
  { key: "locked", label: "Status/Lock" },
  { key: "actions", label: "Actions" },
];

function buildAssignmentSchema(fnT: (strKey: string, strFallback?: string) => string) {
  const strRequired = fnT("validation_required", "This field is required.");
  const strPlanRequired = fnT("validation_plan_required", "Please select a leave plan.");
  const strReasonRequired = fnT("validation_reason_required", "Please enter an assignment reason.");
  return yup.object({
    intLeavePlanID: yup.number().integer().positive(strPlanRequired).required(strPlanRequired), dtEffectiveFrom: yup.string().required(strRequired),
    dtEffectiveTo: yup.string().defined().test("date-order", fnT("validation_effective_to_order", "Effective To must be the same as or later than Effective From."), function (strValue) { return !strValue || !this.parent.dtEffectiveFrom || strValue >= this.parent.dtEffectiveFrom; }),
    strAssignmentReason: yup.string().trim().min(1, strReasonRequired).max(500, fnT("validation_remarks_length", "Remarks cannot exceed 500 characters.")).required(strReasonRequired),
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

// ISO date strings are YYYY-MM-DD; normalize any datetime/null value to the date portion.
function toIsoDate(strValue: string | null | undefined): string {
  return strValue ? strValue.slice(0, 10) : "";
}

export default function EmployeeLeavePlanDetailPage({ intEmployeeID, strMode = "manage" }: { intEmployeeID: number; strMode?: "view" | "manage" }) {
  const objRouter = useRouter();
  const { t } = useModuleLabels("employee_leave_plan");
  const { canDo, blnLoading: blnRightsLoading } = useActionRights();
  const [intLeaveYear, setIntLeaveYear] = useState(new Date().getFullYear());
  const [objMovement, setObjMovement] = useState<MovementDialog>(null);
  const [blnReplaceOpen, setBlnReplaceOpen] = useState(false);
  const [objPendingAssignment, setObjPendingAssignment] = useState<EmployeePlanAssignRequest | null>(null);
  const [objImpact, setObjImpact] = useState<ReplacementImpact | null>(null);
  const [strActionError, setStrActionError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const {
    objEmployee, objOverview, objCurrentPlan, lstPlans, lstLeaveTypes, blnLoading, blnRefreshing, blnSaving, strError,
    fetchPlan, previewReplacement, assignPlan, initializeBalances, setOpeningBalance, adjustBalance,
  } = useEmployeeLeavePlan(intEmployeeID, intLeaveYear);
  // The Employee Leave Assignment menu grants the generic action set (view/edit/add/...);
  // older ESS-style setups use the compound LEAVE_VIEW/LEAVE_MANAGE codes, so accept either.
  const blnCanManage = (canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "EDIT") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "ADD") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "LEAVE_MANAGE")) && strMode !== "view";
  const blnCanView = canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "VIEW") || canDo("EMPLOYEE_LEAVE_ASSIGNMENT", "LEAVE_VIEW");
  const objAssignmentSchema = useMemo(() => buildAssignmentSchema(t), [t]);
  const objMovementSchema = useMemo(() => buildMovementSchema(t), [t]);
  const objAssignmentForm = useForm<AssignmentForm>({ resolver: yupResolver(objAssignmentSchema) as Resolver<AssignmentForm>, defaultValues: { intLeavePlanID: 0, dtEffectiveFrom: new Date().toISOString().slice(0, 10), dtEffectiveTo: "", strAssignmentReason: "" } });
  const objMovementForm = useForm<MovementForm>({ resolver: yupResolver(objMovementSchema) as Resolver<MovementForm>, defaultValues: { decValue: 0, dtTransactionDate: new Date().toISOString().slice(0, 10), strRemarks: "" } });
  const dicPlanNames = useMemo(() => Object.fromEntries(lstPlans.map((objPlan) => [objPlan.intID, objPlan.strDisplayName || objPlan.strPlanName])), [lstPlans]);
  const dicTypeNames = useMemo(() => Object.fromEntries(lstLeaveTypes.map((objType) => [objType.intID, `${objType.strTypeCode} - ${objType.strTypeName}`])), [lstLeaveTypes]);
  const objCurrent = objOverview?.objCurrentAssignment ?? null;

  // Entitlement preview + inline opening-balance capture for the plan being assigned.
  const intSelectedPlanID = Number(useWatch({ control: objAssignmentForm.control, name: "intLeavePlanID" }) ?? 0);
  const [objSelectedPlan, setObjSelectedPlan] = useState<LeavePlan | null>(null);
  const [dicOpeningInputs, setDicOpeningInputs] = useState<Record<number, string>>({});
  const [blnPreviewLoading, setBlnPreviewLoading] = useState(false);
  const lstPreviewItems = useMemo(() => (objSelectedPlan?.lstItems ?? []).filter((objItem) => objItem.blnIsActive), [objSelectedPlan]);

  // Date bounds come straight from the SELECTED plan's validity window; the fields are auto-filled
  // to those dates and stay editable within them. lstPlans already carries the plan dates, so the
  // bounds resolve synchronously without waiting for the entitlement-preview fetch.
  const objSelectedPlanSummary = useMemo(() => lstPlans.find((objPlan) => objPlan.intID === intSelectedPlanID) ?? null, [lstPlans, intSelectedPlanID]);
  const strJoiningDate = toIsoDate(objEmployee?.dtDateOfJoining);
  const strPlanEffectiveFrom = toIsoDate(objSelectedPlanSummary?.dtEffectiveFrom);
  const strPlanEffectiveTo = toIsoDate(objSelectedPlanSummary?.dtEffectiveTo);

  // Auto-fill Effective From / To directly from the newly selected plan; never retain the previous
  // plan's dates.
  function applyPlanDefaults(intPlanID: number) {
    const objPlan = lstPlans.find((objRow) => objRow.intID === intPlanID) ?? null;
    if (!objPlan) {
      objAssignmentForm.setValue("dtEffectiveFrom", "");
      objAssignmentForm.setValue("dtEffectiveTo", "");
      return;
    }
    objAssignmentForm.setValue("dtEffectiveFrom", toIsoDate(objPlan.dtEffectiveFrom));
    objAssignmentForm.setValue("dtEffectiveTo", toIsoDate(objPlan.dtEffectiveTo));
    objAssignmentForm.clearErrors(["intLeavePlanID", "dtEffectiveFrom", "dtEffectiveTo"]);
  }

  useEffect(() => {
    let blnMounted = true;
    if (!intSelectedPlanID) {
      setObjSelectedPlan(null);
      setDicOpeningInputs({});
      return;
    }
    setBlnPreviewLoading(true);
    fetchPlan(intSelectedPlanID)
      .then((objPlan) => { if (blnMounted) { setObjSelectedPlan(objPlan); setDicOpeningInputs({}); } })
      .catch(async (objError) => { if (blnMounted) { setObjSelectedPlan(null); setStrActionError((await createApiRequestError(objError)).message); } })
      .finally(() => { if (blnMounted) setBlnPreviewLoading(false); });
    return () => { blnMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intSelectedPlanID]);

  function buildOpeningBalances() {
    return lstPreviewItems
      .filter((objItem) => objItem.blnOpeningBalanceAllowed)
      .map((objItem) => ({ intLeaveTypeID: objItem.intLeaveTypeID, decOpeningBalance: Number(dicOpeningInputs[objItem.intLeaveTypeID] ?? 0) || 0 }))
      .filter((objOpening) => objOpening.decOpeningBalance > 0);
  }

  async function executeAction(fnAction: () => Promise<unknown>): Promise<boolean> {
    setStrActionError("");
    try { await fnAction(); return true; } catch (objError) { setStrActionError((await createApiRequestError(objError)).message); return false; }
  }

  function submitAssignment(objValues: AssignmentForm) {
    const strFrom = toIsoDate(objValues.dtEffectiveFrom);
    const strTo = toIsoDate(objValues.dtEffectiveTo);

    const objPayload: EmployeePlanAssignRequest = { intEmployeeID, intLeavePlanID: objValues.intLeavePlanID, intLeaveYear, dtEffectiveFrom: strFrom, dtEffectiveTo: strTo || null, blnInitializeBalances: true, strAssignmentReason: objValues.strAssignmentReason.trim(), lstOpeningBalances: buildOpeningBalances() };
    if (objCurrent) {
      setObjPendingAssignment(objPayload);
      // Fetch the pre-save impact summary (advisory; the backend re-validates authoritatively on confirm).
      setObjImpact(null);
      void (async () => {
        try {
          setObjImpact(await previewReplacement({ intLeavePlanID: objPayload.intLeavePlanID, intLeaveYear, dtEffectiveFrom: objPayload.dtEffectiveFrom }));
        } catch { /* preview is best-effort; confirm still calls the authoritative replace endpoint */ }
      })();
    }
    else void (async () => {
      const blnOk = await executeAction(() => assignPlan(objPayload, false));
      if (blnOk) { setStrSuccess(t("assign_success", "Leave plan assigned and leave entitlements allocated successfully.")); objAssignmentForm.reset({ ...objValues, intLeavePlanID: 0, dtEffectiveFrom: "", dtEffectiveTo: "", strAssignmentReason: "" }); }
    })();
  }

  async function confirmReplacement() {
    if (!objPendingAssignment) return;
    const blnOk = await executeAction(() => assignPlan(objPendingAssignment, true));
    if (!blnOk) return; // keep the dialog open so the API error is actionable — no changes were saved
    setStrSuccess(t("replace_success", "Leave plan replaced and leave entitlements allocated successfully."));
    setObjPendingAssignment(null);
    setObjImpact(null);
    objAssignmentForm.reset({ intLeavePlanID: 0, dtEffectiveFrom: "", dtEffectiveTo: "", strAssignmentReason: "" });
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

  // 12px between every card, matching the gap between the app header and the toolbar below it.
  return <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5, pb: 4 }}>
    <Paper sx={{ borderRadius: "28px", px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
        {/* The page title lives here rather than in the app-shell header (see blnLeaveAssignmentEditorRoute). */}
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.28rem" }, color: "#0f172a" }}>
          {strMode === "view"
            ? t("detail_title_view", "View Employee Leave Assignment")
            : t("detail_title_edit", "Edit Employee Leave Assignment")}
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <Button className={styles.secondaryButton} startIcon={<ArrowBackRoundedIcon />} onClick={() => objRouter.push("/leave/plan-assignments")} sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 100, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }} data-control-id="employee-leave-plan.detail.back.button">{t("back_button", "Back")}</Button>
          {blnCanManage ? <Button onClick={() => { setBlnReplaceOpen(true); void objAssignmentForm.handleSubmit(submitAssignment)(); }} className={styles.primaryButton} startIcon={<SaveRoundedIcon />} disabled={blnSaving} sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 168, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }} data-control-id="employee-leave-plan.detail.save.button">{blnSaving ? t("saving", "Saving...") : t("save_leave_plan", "Save Leave Plan")}</Button> : null}
        </Stack>
      </Stack>
    </Paper>
    {(strError || strActionError) ? <Alert severity="error">{strError || strActionError}</Alert> : null}
    {/* 1. Compact Employee Summary + Current Leave Plan (merged). */}
    <SectionCard strTitle={t("section_employee_account", "Employee Leave Account")}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
        <Typography><strong>{t("employee_code", "Employee Code")}:</strong> {objEmployee?.strEmployeeCode}</Typography>
        <Typography><strong>{t("employee_name", "Employee Name")}:</strong> {objEmployee?.strFullName}</Typography>
        <Typography><strong>{t("joining_date", "Joining Date")}:</strong> {formatDate(objEmployee?.dtDateOfJoining ?? null)}</Typography>
        <Typography><strong>{t("exit_date", "Exit Date")}:</strong> {formatDate(objEmployee?.dtDateOfExit ?? null)}</Typography>
      </Box>
      <Divider sx={{ my: 1.5 }} />
      {objCurrent ? <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 1 }}>
        <Typography><strong>{t("current_plan", "Current Leave Plan")}:</strong> {dicPlanNames[objCurrent.intLeavePlanID] ?? `#${objCurrent.intLeavePlanID}`}</Typography>
        <Typography><strong>{t("effective_from", "Effective From")}:</strong> {formatDate(objCurrent.dtEffectiveFrom)}</Typography>
        <Typography><strong>{t("effective_to", "Effective To")}:</strong> {formatDate(objCurrent.dtEffectiveTo)}</Typography>
        <Typography><strong>{t("assignment_status", "Assignment Status")}:</strong> {objCurrent.strAssignmentStatus}</Typography>
      </Box> : <Typography color="text.secondary">{t("no_current_plan", "No current Leave Plan is assigned.")}</Typography>}
    </SectionCard>

    {/* 2. Yearly Leave Balances — primary working section (always visible). */}
    <SectionCard strTitle={t("section_yearly_balances", "Yearly Leave Balances")} objAction={
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField type="number" size="small" label={t("leave_year", "Leave Year")} value={intLeaveYear} onChange={(objEvent) => setIntLeaveYear(Number(objEvent.target.value))} inputProps={{ "data-control-id": "employee-leave-plan.balance.year.input", min: 2001, max: 2999 }} />
        {blnRefreshing ? <CircularProgress size={22} sx={{ alignSelf: "center" }} data-control-id="employee-leave-plan.balance.year.spinner" /> : null}
        {blnCanManage && objCurrent ? <Button startIcon={<AddRoundedIcon />} onClick={() => void executeAction(initializeBalances)} disabled={blnSaving} data-control-id="employee-leave-plan.balance.initialize.button">{t("initialize_balances", "Initialize Balances")}</Button> : null}
      </Box>
    }>
      <TableContainer><Table size="small" sx={{ minWidth: 1150 }}><TableHead><TableRow>{lstBalanceColumns.map((objCol) => <TableCell key={objCol.key} sx={{ fontWeight: 800 }}>{t(`balance_${objCol.key}`, objCol.label)}</TableCell>)}</TableRow></TableHead><TableBody>{!(objOverview?.lstBalances.length) ? <TableRow><TableCell colSpan={11} align="center">{blnRefreshing ? t("loading_balances", "Loading balances...") : t("no_balances", "No balances found for this year.")}</TableCell></TableRow> : objOverview.lstBalances.map((objBalance) => { const blnOpeningAllowed = objCurrentPlan?.lstItems?.find((objItem) => objItem.intLeaveTypeID === objBalance.intLeaveTypeID)?.blnOpeningBalanceAllowed ?? false; return <TableRow key={objBalance.intID}><TableCell>{dicTypeNames[objBalance.intLeaveTypeID] ?? `#${objBalance.intLeaveTypeID}`}</TableCell><TableCell>{objBalance.decOpeningBalance}</TableCell><TableCell>{objBalance.decEntitledBalance}</TableCell><TableCell>{objBalance.decAccruedBalance}</TableCell><TableCell>{objBalance.decAdjustmentCredit}</TableCell><TableCell>{objBalance.decAdjustmentDebit}</TableCell><TableCell>{objBalance.decUtilizedBalance}</TableCell><TableCell>{objBalance.decHoldBalance}</TableCell><TableCell sx={{ fontWeight: 800, color: "#0f766e" }}>{objBalance.decAvailableBalance}</TableCell><TableCell>{objBalance.blnIsLocked ? <Chip size="small" color="warning" label={t("locked", "Locked")} /> : <Chip size="small" color="success" variant="outlined" label={t("open", "Open")} />}</TableCell><TableCell>{blnCanManage ? <Box sx={{ display: "flex", gap: .5 }}><Button size="small" disabled={objBalance.blnIsLocked || !blnOpeningAllowed} onClick={() => openMovement("opening", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.opening.button`}>{t("opening", "Opening")}</Button><Button size="small" disabled={objBalance.blnIsLocked} onClick={() => openMovement("credit", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.credit.button`}>{t("credit", "Credit")}</Button><Button size="small" color="warning" disabled={objBalance.blnIsLocked} onClick={() => openMovement("debit", objBalance)} data-control-id={`employee-leave-plan.balance.${objBalance.intID}.debit.button`}>{t("debit", "Debit")}</Button></Box> : "—"}</TableCell></TableRow>; })}</TableBody></Table></TableContainer>
    </SectionCard>

    {/* 3. Replace Leave Plan — collapsed by default. */}
    {blnCanManage ? <CollapsibleCard strTitle={objCurrent ? t("section_replace_plan", "Replace Leave Plan") : t("section_assign_plan", "Assign Leave Plan")} blnOpen={blnReplaceOpen} fnOnOpenChange={setBlnReplaceOpen} blnKeepMounted>
      {objCurrent ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>{t("replace_hint", "Select a plan to assign it for its validity period. Effective From / To are auto-filled from the plan. The current assignment is superseded automatically and kept in Leave Plan History.")}</Typography> : null}
      <Box id="employee-leave-plan-assignment-form" component="form" onSubmit={objAssignmentForm.handleSubmit(submitAssignment)}><Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr 2fr" }, gap: 1 }}>
      <Controller name="intLeavePlanID" control={objAssignmentForm.control} render={({ field }) => <TextField select {...field} value={field.value || ""} label={t("select_plan", "Leave Plan")} error={Boolean(objAssignmentForm.formState.errors.intLeavePlanID)} helperText={objAssignmentForm.formState.errors.intLeavePlanID?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.plan.select" }} onChange={(objEvent) => { const intNewPlanID = Number(objEvent.target.value); field.onChange(intNewPlanID); applyPlanDefaults(intNewPlanID); }}><MenuItem value="" data-control-id="employee-leave-plan.assignment.plan.empty.option">{t("select_plan_placeholder", "Select Plan")}</MenuItem>{lstPlans.filter((objPlan) => objPlan.blnIsActive).map((objPlan) => <MenuItem key={objPlan.intID} value={objPlan.intID} data-control-id={`employee-leave-plan.assignment.plan.${objPlan.intID}.option`}>{objPlan.strPlanCode} - {objPlan.strDisplayName || objPlan.strPlanName}</MenuItem>)}</TextField>} />
      <Controller name="dtEffectiveFrom" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} type="date" label={t("effective_from", "Effective From")} InputLabelProps={{ shrink: true }} disabled={!intSelectedPlanID} error={Boolean(objAssignmentForm.formState.errors.dtEffectiveFrom)} helperText={objAssignmentForm.formState.errors.dtEffectiveFrom?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.effective-from.input", min: strPlanEffectiveFrom || undefined, max: strPlanEffectiveTo || undefined }} />} />
      <Controller name="dtEffectiveTo" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} type="date" label={t("effective_to", "Effective To")} InputLabelProps={{ shrink: true }} disabled={!intSelectedPlanID} error={Boolean(objAssignmentForm.formState.errors.dtEffectiveTo)} helperText={objAssignmentForm.formState.errors.dtEffectiveTo?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.effective-to.input", min: strPlanEffectiveFrom || undefined, max: strPlanEffectiveTo || undefined }} />} />
      <Controller name="strAssignmentReason" control={objAssignmentForm.control} render={({ field }) => <TextField {...field} label={t("assignment_reason", "Assignment Reason")} error={Boolean(objAssignmentForm.formState.errors.strAssignmentReason)} helperText={objAssignmentForm.formState.errors.strAssignmentReason?.message} inputProps={{ "data-control-id": "employee-leave-plan.assignment.reason.input", maxLength: 500 }} />} />
    </Box>
      {objSelectedPlanSummary ? <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{t("plan_validity_hint", "Selected plan validity: {from} – {to}").replace("{from}", formatDate(strPlanEffectiveFrom || null)).replace("{to}", formatDate(strPlanEffectiveTo || null))}{strJoiningDate ? ` · ${t("joining_date_hint", "Employee joining date: {date}").replace("{date}", formatDate(strJoiningDate))}` : ""}</Typography> : null}
      {blnPreviewLoading ? <Box sx={{ mt: 2, textAlign: "center" }}><CircularProgress size={22} /></Box> : lstPreviewItems.length ? <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>{t("preview_title", "Plan Entitlement Preview")}</Typography>
        <TableContainer><Table size="small"><TableHead><TableRow>{["leave_type", "annual_entitlement", "opening_allowed", "negative_limit", "opening_balance"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`preview_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>
          {lstPreviewItems.map((objItem) => <TableRow key={objItem.intLeaveTypeID}>
            <TableCell>{dicTypeNames[objItem.intLeaveTypeID] ?? `#${objItem.intLeaveTypeID}`}</TableCell>
            <TableCell>{objItem.decAnnualEntitlement}</TableCell>
            <TableCell>{objItem.blnOpeningBalanceAllowed ? t("yes", "Yes") : t("no", "No")}</TableCell>
            <TableCell>{objItem.decNegativeBalanceLimit}</TableCell>
            <TableCell>{objItem.blnOpeningBalanceAllowed ? <TextField type="number" size="small" value={dicOpeningInputs[objItem.intLeaveTypeID] ?? ""} onChange={(objEvent) => setDicOpeningInputs((dicPrev) => ({ ...dicPrev, [objItem.intLeaveTypeID]: objEvent.target.value }))} inputProps={{ min: 0, step: 0.5, "data-control-id": `employee-leave-plan.assignment.opening.${objItem.intLeaveTypeID}.input` }} sx={{ width: 120 }} /> : "—"}</TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer>
        <Typography variant="caption" color="text.secondary">{t("preview_hint", "Opening balances are captured only for Leave Types that allow them and are initialized atomically with the assignment.")}</Typography>
      </Box> : null}
    </Box></CollapsibleCard> : null}

    {/* Leave Plan History — collapsed by default; Source hidden (POC). */}
    <CollapsibleCard strTitle={t("section_plan_history", "Leave Plan History")}>
      <TableContainer><Table size="small"><TableHead><TableRow>{["plan", "effective_from", "effective_to", "status", "reason"].map((strKey) => <TableCell key={strKey} sx={{ fontWeight: 800 }}>{t(`history_${strKey}`, strKey.replaceAll("_", " "))}</TableCell>)}</TableRow></TableHead><TableBody>{!(objOverview?.lstAssignments.length) ? <TableRow><TableCell colSpan={5} align="center">{t("no_assignment_history", "No plan history.")}</TableCell></TableRow> : objOverview.lstAssignments.map((objRow) => <TableRow key={objRow.intID}><TableCell>{dicPlanNames[objRow.intLeavePlanID] ?? `#${objRow.intLeavePlanID}`}</TableCell><TableCell>{formatDate(objRow.dtEffectiveFrom)}</TableCell><TableCell>{formatDate(objRow.dtEffectiveTo)}</TableCell><TableCell>{objRow.strAssignmentStatus}</TableCell><TableCell>{objRow.strAssignmentReason ?? "—"}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
    </CollapsibleCard>

    {/* Footer actions, mirroring the Leave Plan editor. Saving opens the Replace/Assign section first
        so any validation message is visible instead of firing inside a collapsed card. */}
    {blnCanManage ? (
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
        <Button onClick={() => objRouter.push("/leave/plan-assignments")} disabled={blnSaving} data-control-id="employee-leave-plan.detail.cancel.button">{t("cancel", "Cancel")}</Button>
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={blnSaving}
          onClick={() => { setBlnReplaceOpen(true); void objAssignmentForm.handleSubmit(submitAssignment)(); }}
          data-control-id="employee-leave-plan.detail.save.bottom.button"
        >
          {blnSaving ? t("saving", "Saving...") : t("save_leave_plan", "Save Leave Plan")}
        </Button>
      </Stack>
    ) : null}

    <Dialog open={Boolean(objPendingAssignment)} onClose={() => !blnSaving && setObjPendingAssignment(null)} fullWidth maxWidth="sm" PaperProps={{ "data-control-id": "employee-leave-plan.replace.dialog" } as Record<string, string>}><DialogTitle>{t("replace_confirm_title", "Confirm Plan Replacement")}</DialogTitle><DialogContent><Typography sx={{ mb: 1.5 }}>{t("replace_confirm_message", "The current Plan will be end-dated and replaced from the selected effective date. Continue?")}</Typography>
      {/* Pre-save impact summary (§7): retained / added / removed-frozen and any blocking Leave Types. */}
      {objImpact ? <Stack spacing={1}>
        {objImpact.lstBlocking.length ? <Alert severity="error" data-control-id="employee-leave-plan.replace.impact.blocking">
          <Typography variant="subtitle2" fontWeight={800}>{t("impact_blocking", "Cannot replace — resolve these first:")}</Typography>
          {objImpact.lstBlocking.map((objLine) => <Typography key={objLine.intLeaveTypeID} variant="body2">• {objLine.strLeaveType} — {(objLine.lstReasons ?? []).join(", ")}</Typography>)}
        </Alert> : null}
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {objImpact.lstRetained.map((objLine) => <Chip key={`r${objLine.intLeaveTypeID}`} size="small" color="default" label={`${t("impact_retained", "Retained")}: ${objLine.strLeaveType}`} />)}
          {objImpact.lstAdded.map((objLine) => <Chip key={`a${objLine.intLeaveTypeID}`} size="small" color="success" label={`${t("impact_added", "Added")}: ${objLine.strLeaveType}`} />)}
          {objImpact.lstRemovedFrozen.map((objLine) => <Chip key={`f${objLine.intLeaveTypeID}`} size="small" color="warning" label={`${t("impact_frozen", "Frozen")}: ${objLine.strLeaveType}`} />)}
        </Box>
        {objImpact.lstRemovedFrozen.some((objLine) => (objLine.decAvailableBalance ?? 0) > 0) ? <Alert severity="warning">{t("impact_frozen_balance", "A removed Leave Type still has an available balance. It is preserved and frozen — not transferred or lapsed.")}</Alert> : null}
      </Stack> : null}
    </DialogContent><DialogActions><Button onClick={() => { setObjPendingAssignment(null); setObjImpact(null); }} data-control-id="employee-leave-plan.replace.cancel.button">{t("cancel", "Cancel")}</Button><Button variant="contained" onClick={() => void confirmReplacement()} disabled={blnSaving || Boolean(objImpact && !objImpact.blnCanReplace)} data-control-id="employee-leave-plan.replace.confirm.button">{t("replace", "Replace")}</Button></DialogActions></Dialog>

    <Dialog open={Boolean(objMovement)} onClose={() => !blnSaving && setObjMovement(null)} PaperProps={{ "data-control-id": "employee-leave-plan.movement.dialog" } as Record<string, string>}><Box component="form" onSubmit={objMovementForm.handleSubmit(submitMovement)}><DialogTitle>{objMovement?.strType === "opening" ? t("opening_balance_title", "Set Opening Balance") : objMovement?.strType === "credit" ? t("manual_credit_title", "Manual Credit") : t("manual_debit_title", "Manual Debit")}</DialogTitle><DialogContent sx={{ display: "grid", gap: 2, pt: "12px !important", minWidth: { sm: 440 } }}>
      <Controller name="decValue" control={objMovementForm.control} render={({ field }) => <TextField {...field} type="number" label={objMovement?.strType === "opening" ? t("opening_balance", "Opening Balance") : t("days", "Days")} error={Boolean(objMovementForm.formState.errors.decValue)} helperText={objMovementForm.formState.errors.decValue?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.days.input", min: 0, step: .5 }} onChange={(objEvent) => field.onChange(Number(objEvent.target.value))} />} />
      <Controller name="dtTransactionDate" control={objMovementForm.control} render={({ field }) => <TextField {...field} type="date" label={t("transaction_date", "Transaction Date")} InputLabelProps={{ shrink: true }} error={Boolean(objMovementForm.formState.errors.dtTransactionDate)} helperText={objMovementForm.formState.errors.dtTransactionDate?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.date.input" }} />} />
      <Controller name="strRemarks" control={objMovementForm.control} render={({ field }) => <TextField {...field} multiline minRows={3} label={t("remarks", "Remarks")} error={Boolean(objMovementForm.formState.errors.strRemarks)} helperText={objMovementForm.formState.errors.strRemarks?.message} inputProps={{ "data-control-id": "employee-leave-plan.movement.remarks.input", maxLength: 500 }} />} />
    </DialogContent><DialogActions><Button onClick={() => setObjMovement(null)} data-control-id="employee-leave-plan.movement.cancel.button">{t("cancel", "Cancel")}</Button><Button type="submit" variant="contained" disabled={blnSaving} data-control-id="employee-leave-plan.movement.save.button">{t("save", "Save")}</Button></DialogActions></Box></Dialog>
    <Snackbar open={Boolean(strSuccess)} autoHideDuration={5000} onClose={() => setStrSuccess("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
      <Alert severity="success" variant="filled" onClose={() => setStrSuccess("")} data-control-id="employee-leave-plan.detail.success.toast">{strSuccess}</Alert>
    </Snackbar>
  </Stack>;
}
