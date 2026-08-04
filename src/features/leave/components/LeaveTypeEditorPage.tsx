"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { leaveService } from "@/features/leave/services/leaveService";
import { useActionRights } from "@/features/security/hooks/useActionRights";
import type {
  LeaveApplicabilityRow,
  LeaveApprovalStepRow,
  LeaveCombinationRow,
  LeaveLookups,
  LeavePolicyAggregate,
  LeavePolicyRuleRow,
  LeaveTypeAggregate,
  LeaveTypeEnrichedDto,
  LeaveTypeTextRow,
} from "@/features/leave/types";

type ToastState = { blnOpen: boolean; strMessage: string; strSeverity: "success" | "error" };

// Every field renders in a uniform fixed-width column (approx. the "Display Order" size).
const objGridSx = {
  display: "grid",
  gap: 1.5,
  gridTemplateColumns: "repeat(auto-fill, minmax(210px, 232px))",
  alignItems: "start",
} as const;
const objFullCellSx = { gridColumn: "1 / -1" } as const;
// Shared section-card styling (matches the Salary Component editor's always-open cards).
const objSectionSx = { borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" } as const;

const lstApplicabilityTypes = [
  "COMPANY", "LOCATION", "STATE", "DEPARTMENT", "DESIGNATION", "GRADE",
  "EMPLOYMENT_TYPE", "GENDER", "WORKER", "PROBATION", "TENURE",
];
const lstApproverSources = ["LINE_MANAGER", "REPORTING_MANAGER", "HR", "FIXED_ROLE", "FIXED_EMPLOYEE"];
const lstAttendanceStatuses = ["ON_LEAVE", "LWP", "ON_DUTY", "PRESENT", "HALF_DAY"];
const lstCombinationRuleCodes = ["NOT_ALLOWED", "ALLOWED", "ALLOWED_WITH_GAP"];
const lstRoundingCodes = ["NONE", "UP", "DOWN", "NEAREST_HALF"];
const lstProrationBasis = ["CALENDAR_DAYS", "WORKING_DAYS", "COMPLETED_MONTHS"];
const lstTreatmentCodes = ["EXCLUDE", "INCLUDE", "COUNT_IF_ENCLOSED"];
const lstRuleOperators = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_OR_EQUAL", "LESS_OR_EQUAL", "BETWEEN", "NOT_BETWEEN", "IN", "NOT_IN"];

function toNum(strValue: string): number | null {
  return strValue === "" ? null : Number(strValue);
}

// Module-scope render helpers (stable identity → inputs keep focus across renders).
// Read-only is applied via a wrapping <fieldset disabled> around the form body.
function SectionText(props: { label: string; value: string | null | undefined; onChange: (v: string) => void; type?: string; multiline?: boolean; required?: boolean; strError?: string }) {
  return (
    <TextField
      label={props.label}
      type={props.type ?? "text"}
      value={props.value ?? ""}
      onChange={(e) => props.onChange(e.target.value)}
      size="small"
      fullWidth
      required={props.required}
      error={Boolean(props.strError)}
      helperText={props.strError || undefined}
      multiline={props.multiline}
      minRows={props.multiline ? 2 : undefined}
      InputLabelProps={props.type === "date" ? { shrink: true } : undefined}
    />
  );
}
function SectionNum(props: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return <TextField label={props.label} type="number" value={props.value ?? ""} onChange={(e) => props.onChange(toNum(e.target.value))} size="small" fullWidth />;
}
function SectionSelect(props: { label: string; value: string; onChange: (v: string) => void; options: { code: string; label: string }[] }) {
  return (
    <TextField label={props.label} select value={props.value} onChange={(e) => props.onChange(e.target.value)} size="small" fullWidth>
      {props.options.map((o) => (
        <MenuItem key={o.code} value={o.code}>{o.label}</MenuItem>
      ))}
    </TextField>
  );
}
function SectionSwitch(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <FormControlLabel control={<Switch size="small" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />} label={props.label} />;
}

function emptyPolicy(): LeavePolicyAggregate {
  return {
    intID: null,
    dtEffectiveFrom: new Date().toISOString().slice(0, 10),
    dtEffectiveTo: null,
    blnIsActive: true,
    // India POC controlled fallback: leave year starts 1 April. No central company/tenant leave-year
    // config exists to inherit from yet; existing saved records keep their own month/day (preserved
    // on edit because the fields are not rendered but remain in the form payload).
    intLeaveYearStartMonth: 4,
    intLeaveYearStartDay: 1,
    decEntitlementQty: 0,
    strAccrualFrequency: "none",
    decAccrualQty: 0,
    strAccrualTimingCode: "PERIOD_START",
    strAccrualRoundingCode: "NONE",
    intAccrualWaitingDays: 0,
    blnAccrualAfterConfirmation: false,
    blnCreditOnJoining: true,
    blnCreditOnConfirmation: false,
    strJoinProrationBasisCode: "CALENDAR_DAYS",
    blnExitProrationEnabled: true,
    intMinServiceDays: 0,
    decMinPerApplication: null,
    decMaxPerApplication: null,
    decMaxConsecutiveDays: null,
    intMaxApplicationsPerMonth: null,
    intMaxApplicationsPerYear: null,
    intMinNoticeDays: 0,
    blnBackdatedApplicationAllowed: false,
    intMaxBackdateDays: 0,
    blnFutureApplicationAllowed: true,
    intMaxAdvanceDays: null,
    blnAllowDuringProbation: true,
    blnAllowDuringNoticePeriod: true,
    decMinBalanceAfterRequest: null,
    blnHalfDayAllowed: true,
    blnHourlyLeaveAllowed: false,
    decMinimumHourQty: null,
    strWeeklyOffTreatmentCode: "EXCLUDE",
    strHolidayTreatmentCode: "EXCLUDE",
    blnSandwichRuleEnabled: false,
    strSandwichScopeCode: "WEEKLY_OFF_AND_HOLIDAY",
    strSandwichBoundaryCode: "BOTH_SIDES",
    blnSandwichApplyOnDifferentLeaveTypes: false,
    blnCarryForwardAllowed: false,
    strCarryForwardLimitTypeCode: "FIXED_DAYS",
    decMaxCarryForward: null,
    decCarryForwardPercent: null,
    intCarryForwardExpiryMonths: null,
    decMaxBalance: null,
    blnLapseExcessBalance: true,
    blnEncashmentAllowed: false,
    strEncashmentEventCode: "FNF_ONLY",
    decMaxEncashableDays: null,
    decMinBalanceForEncashment: null,
    strProofRuleCode: "NOT_REQUIRED",
    decProofRequiredAfterDays: null,
    strProofDocumentTypeCode: null,
    blnReasonMandatory: true,
    strBackupResourceRuleCode: "OPTIONAL",
    strAutoActionCode: "NONE",
    intAutoActionAfterDays: null,
    strEscalationRoleCode: null,
    blnCancellationBeforeStartAllowed: true,
    blnCancellationAfterStartAllowed: false,
    blnManagerCancelApprovedAllowed: true,
    strRemarks: null,
  };
}

function emptyAggregate(): LeaveTypeAggregate {
  return {
    strTypeCode: "",
    strTypeName: "",
    strDescription: "",
    strLeaveCategoryCode: "REGULAR",
    strUnit: "day",
    blnIsPaid: true,
    strPayrollTreatmentCode: "PAID",
    strAttendanceStatusCode: "ON_LEAVE",
    blnBalanceTrackingRequired: true,
    blnIsStatutory: false,
    blnIsSpecialLeave: false,
    strApprovalRouteCode: "LINE_MANAGER",
    intDisplayOrder: 10,
    strColorCode: null,
    strIconName: null,
    blnIsActive: true,
    dtEffectiveFrom: new Date().toISOString().slice(0, 10),
    dtEffectiveTo: null,
    blnAllowEmployeeApply: true,
    blnAllowHrApplyOnBehalf: true,
    blnAllowMobileApply: true,
    blnAllowNegativeBalance: false,
    blnRequiresReason: true,
    blnRequiresProof: false,
    blnAllowHalfDay: true,
    blnIsEncashable: false,
    objPolicy: emptyPolicy(),
    lstText: [{ intLanguageID: 1, strTypeName: "", strDescription: "", strEmployeeHelpText: "" }],
    lstApplicability: [],
    lstApprovalSteps: [],
    lstRules: [],
    lstCombinationRules: [],
  };
}

export default function LeaveTypeEditorPage({ strMode, intLeaveTypeID }: { strMode: "new" | "edit" | "view"; intLeaveTypeID?: number }) {
  const objRouter = useRouter();
  const { canDo } = useActionRights();
  // Read-only in explicit view mode OR when the user lacks the granular right for this mode, so a
  // direct URL to /edit or /new cannot bypass the Leave Types menu rights (the backend also enforces).
  const blnReadOnly =
    strMode === "view" ||
    (strMode === "edit" && !canDo("leave_types", "EDIT")) ||
    (strMode === "new" && !canDo("leave_types", "ADD"));
  const [objForm, setObjForm] = useState<LeaveTypeAggregate>(emptyAggregate());
  const [objLookups, setObjLookups] = useState<LeaveLookups>({});
  const [lstOtherTypes, setLstOtherTypes] = useState<LeaveTypeEnrichedDto[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  // Advanced Configuration (Applicability / Advanced Rules / Combination) is collapsed by default for the POC.
  const [blnAdvancedOpen, setBlnAdvancedOpen] = useState(false);
  // Field-level validation messages shown inline below the control (not as a generic toast).
  const [dicFieldErrors, setDicFieldErrors] = useState<{ strTypeCode?: string; strTypeName?: string }>({});
  const [objToast, setObjToast] = useState<ToastState>({ blnOpen: false, strMessage: "", strSeverity: "success" });

  const objPolicy = objForm.objPolicy ?? emptyPolicy();

  function showToast(strMessage: string, strSeverity: "success" | "error") {
    setObjToast({ blnOpen: true, strMessage, strSeverity });
  }

  useEffect(() => {
    async function load() {
      setBlnLoading(true);
      try {
        const [objLookupResult, lstTypeResult] = await Promise.all([leaveService.getLeaveLookups(), leaveService.listEnterpriseLeaveTypes()]);
        setObjLookups(objLookupResult);
        setLstOtherTypes(lstTypeResult);
        if (strMode !== "new" && intLeaveTypeID) {
          const objAggregate = await leaveService.getLeaveTypeAggregate(intLeaveTypeID);
          if (!objAggregate.objPolicy) objAggregate.objPolicy = emptyPolicy();
          if (!objAggregate.lstRules) objAggregate.lstRules = [];
          if (!objAggregate.lstApplicability) objAggregate.lstApplicability = [];
          if (!objAggregate.lstApprovalSteps) objAggregate.lstApprovalSteps = [];
          if (!objAggregate.lstCombinationRules) objAggregate.lstCombinationRules = [];
          if (!objAggregate.lstText || objAggregate.lstText.length === 0) {
            objAggregate.lstText = [{ intLanguageID: 1, strTypeName: objAggregate.strTypeName, strDescription: objAggregate.strDescription ?? "", strEmployeeHelpText: "" }];
          }
          setObjForm(objAggregate);
        }
      } catch (objError) {
        const objHandled = await createApiRequestError(objError);
        showToast(objHandled.message, "error");
      } finally {
        setBlnLoading(false);
      }
    }
    void load();
  }, [strMode, intLeaveTypeID]);

  function setMaster<K extends keyof LeaveTypeAggregate>(strKey: K, objValue: LeaveTypeAggregate[K]) {
    setObjForm((objPrev) => ({ ...objPrev, [strKey]: objValue }));
  }
  function setPolicy<K extends keyof LeavePolicyAggregate>(strKey: K, objValue: LeavePolicyAggregate[K]) {
    setObjForm((objPrev) => ({ ...objPrev, objPolicy: { ...(objPrev.objPolicy ?? emptyPolicy()), [strKey]: objValue } }));
  }

  function optionsFor(strDomain: string, lstFallback: string[]): { code: string; label: string }[] {
    const lstLookup = objLookups[strDomain];
    if (lstLookup && lstLookup.length) return lstLookup.map((o) => ({ code: o.strValueCode, label: o.strDisplayName }));
    return lstFallback.map((c) => ({ code: c, label: c.replace(/_/g, " ") }));
  }

  const blnBalanceTracked = objForm.blnBalanceTrackingRequired;
  const blnPaid = objForm.blnIsPaid && objForm.strPayrollTreatmentCode !== "UNPAID";
  const blnShowAccrual = blnBalanceTracked && blnPaid;
  const blnShowEncashment = objForm.blnIsEncashable && blnBalanceTracked;

  async function submit() {
    const dicErrors: { strTypeCode?: string; strTypeName?: string } = {};
    if (!objForm.strTypeCode.trim()) dicErrors.strTypeCode = "Code is required.";
    if (!objForm.strTypeName.trim()) dicErrors.strTypeName = "Name is required.";
    if (dicErrors.strTypeCode || dicErrors.strTypeName) {
      setDicFieldErrors(dicErrors);
      return;
    }
    setDicFieldErrors({});
    const lstText = objForm.lstText.map((objText) => (objText.intLanguageID === 1 && !objText.strTypeName.trim() ? { ...objText, strTypeName: objForm.strTypeName } : objText));
    // The type's effective dates also drive the policy version window (single source of truth).
    const objPolicyOut = objForm.objPolicy
      ? {
          ...objForm.objPolicy,
          dtEffectiveFrom: objForm.dtEffectiveFrom || objForm.objPolicy.dtEffectiveFrom,
          dtEffectiveTo: objForm.dtEffectiveTo ?? objForm.objPolicy.dtEffectiveTo,
        }
      : objForm.objPolicy;
    const objPayload: LeaveTypeAggregate = { ...objForm, lstText, objPolicy: objPolicyOut };
    setBlnSaving(true);
    try {
      if (strMode === "edit" && intLeaveTypeID) {
        await leaveService.updateLeaveTypeAggregate(intLeaveTypeID, objPayload);
        showToast("Leave type updated successfully.", "success");
      } else {
        await leaveService.createLeaveTypeAggregate(objPayload);
        showToast("Leave type created successfully.", "success");
      }
      setTimeout(() => objRouter.push("/leave"), 600);
    } catch (objError) {
      const objHandled = await createApiRequestError(objError);
      // Map backend duplicate code/name conflicts to the specific field (shown below it) instead of
      // a generic toast; anything else still surfaces as a toast.
      const strMessage = objHandled.message ?? "";
      const blnCodeConflict = /code/i.test(strMessage) && /exist/i.test(strMessage);
      const blnNameConflict = /name/i.test(strMessage) && /exist/i.test(strMessage);
      if (blnCodeConflict || blnNameConflict) {
        setDicFieldErrors({
          strTypeCode: blnCodeConflict ? strMessage : undefined,
          strTypeName: blnNameConflict ? strMessage : undefined,
        });
      } else {
        showToast(strMessage, "error");
      }
    } finally {
      setBlnSaving(false);
    }
  }

  // ---- child-collection helpers ----
  function addText() {
    const setUsed = new Set(objForm.lstText.map((t) => t.intLanguageID));
    const intNext = [1, 2].find((id) => !setUsed.has(id)) ?? 2;
    setMaster("lstText", [...objForm.lstText, { intLanguageID: intNext, strTypeName: "", strDescription: "", strEmployeeHelpText: "" }]);
  }
  function updateText(intIndex: number, objPatch: Partial<LeaveTypeTextRow>) {
    setMaster("lstText", objForm.lstText.map((t, i) => (i === intIndex ? { ...t, ...objPatch } : t)));
  }
  function removeText(intIndex: number) {
    setMaster("lstText", objForm.lstText.filter((_, i) => i !== intIndex));
  }

  function addApplicability() {
    setMaster("lstApplicability", [...objForm.lstApplicability, { strApplicabilityTypeCode: "GRADE", intApplicabilityEntityID: null, strApplicabilityValueCode: "", blnIncludeFlag: true, intPriority: 100 }]);
  }
  function updateApplicability(intIndex: number, objPatch: Partial<LeaveApplicabilityRow>) {
    setMaster("lstApplicability", objForm.lstApplicability.map((r, i) => (i === intIndex ? { ...r, ...objPatch } : r)));
  }
  function removeApplicability(intIndex: number) {
    setMaster("lstApplicability", objForm.lstApplicability.filter((_, i) => i !== intIndex));
  }

  function addStep() {
    const intNext = (objForm.lstApprovalSteps.reduce((m, s) => Math.max(m, s.intStepNo), 0) || 0) + 1;
    setMaster("lstApprovalSteps", [...objForm.lstApprovalSteps, { intStepNo: intNext, strApproverSourceCode: "LINE_MANAGER", blnActionRequired: true, blnSkipIfUnavailable: true, intNoActionAfterDays: null, strNoActionRuleCode: "ESCALATE", intEscalationStepNo: null }]);
  }
  function updateStep(intIndex: number, objPatch: Partial<LeaveApprovalStepRow>) {
    setMaster("lstApprovalSteps", objForm.lstApprovalSteps.map((r, i) => (i === intIndex ? { ...r, ...objPatch } : r)));
  }
  function removeStep(intIndex: number) {
    setMaster("lstApprovalSteps", objForm.lstApprovalSteps.filter((_, i) => i !== intIndex));
  }

  function addCombo() {
    const intFirstOther = lstOtherTypes.find((t) => t.intID !== objForm.intID)?.intID ?? 0;
    setMaster("lstCombinationRules", [...objForm.lstCombinationRules, { intOtherLeaveTypeID: intFirstOther, strCombinationRuleCode: "NOT_ALLOWED", intSequenceGapDays: 0 }]);
  }
  function updateCombo(intIndex: number, objPatch: Partial<LeaveCombinationRow>) {
    setMaster("lstCombinationRules", objForm.lstCombinationRules.map((r, i) => (i === intIndex ? { ...r, ...objPatch } : r)));
  }
  function removeCombo(intIndex: number) {
    setMaster("lstCombinationRules", objForm.lstCombinationRules.filter((_, i) => i !== intIndex));
  }

  function addRule() {
    const intNextSeq = (objForm.lstRules.reduce((m, r) => Math.max(m, r.intRuleSequence), 0) || 0) + 10;
    setMaster("lstRules", [...objForm.lstRules, { intRuleGroupNo: 1, intRuleSequence: intNextSeq, strAttributeCode: "", strOperatorCode: "EQUALS", strValueFrom: "", strValueTo: "", strFailureMessage: "" }]);
  }
  function updateRule(intIndex: number, objPatch: Partial<LeavePolicyRuleRow>) {
    setMaster("lstRules", objForm.lstRules.map((r, i) => (i === intIndex ? { ...r, ...objPatch } : r)));
  }
  function removeRule(intIndex: number) {
    setMaster("lstRules", objForm.lstRules.filter((_, i) => i !== intIndex));
  }

  const dicLangName = useMemo<Record<number, string>>(() => ({ 1: "English", 2: "Hindi" }), []);

  if (blnLoading) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const objInputProps = { disabled: blnReadOnly } as const;

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5, pb: 4 }}>
      {/* Header (matches the Salary Component editor chrome) */}
      <Paper
        sx={{
          borderRadius: "28px",
          px: { xs: 2, md: 3 },
          py: { xs: 1.5, md: 2 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5}>
          <Typography sx={{ color: "#64748b" }}>Enterprise leave type &amp; policy configuration.</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              className={styles.secondaryButton}
              startIcon={<ArrowBackRoundedIcon />}
              onClick={() => objRouter.push("/leave")}
              sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 100, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }}
            >
              Back
            </Button>
            {!blnReadOnly ? (
              <Button
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={submit}
                disabled={blnSaving}
                sx={{ borderRadius: "14px", height: 38, minHeight: 38, py: 0, px: 2.25, minWidth: 168, fontSize: "0.9rem", whiteSpace: "nowrap", flexShrink: 0, "& .MuiButton-startIcon": { mr: 0.75, "& svg": { fontSize: "1rem" } } }}
              >
                {blnSaving ? "Saving..." : "Save Leave Type"}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <fieldset disabled={blnReadOnly} style={{ border: 0, margin: "20px 0 0 0", padding: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* A. Basic Information */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Basic Information</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionText label="Code" required value={objForm.strTypeCode} strError={dicFieldErrors.strTypeCode} onChange={(v) => { setMaster("strTypeCode", v.toUpperCase()); if (dicFieldErrors.strTypeCode) setDicFieldErrors((objPrev) => ({ ...objPrev, strTypeCode: undefined })); }} />
            <SectionText label="Default Name" required value={objForm.strTypeName} strError={dicFieldErrors.strTypeName} onChange={(v) => { setMaster("strTypeName", v); if (dicFieldErrors.strTypeName) setDicFieldErrors((objPrev) => ({ ...objPrev, strTypeName: undefined })); }} />
            <SectionSelect label="Category" value={objForm.strLeaveCategoryCode} onChange={(v) => setMaster("strLeaveCategoryCode", v)} options={optionsFor("LEAVE_CATEGORY", ["REGULAR", "STATUTORY", "UNPAID", "ON_DUTY", "COMPENSATORY"])} />
            <SectionSelect label="Unit" value={objForm.strUnit} onChange={(v) => setMaster("strUnit", v)} options={optionsFor("LEAVE_UNIT", ["DAY", "HALF_DAY", "HOUR"]).map((o) => ({ code: o.code.toLowerCase(), label: o.label }))} />
            <SectionSelect label="Payroll Treatment" value={objForm.strPayrollTreatmentCode} onChange={(v) => setMaster("strPayrollTreatmentCode", v)} options={optionsFor("LEAVE_PAYROLL_TREATMENT", ["PAID", "UNPAID", "NO_PAY_IMPACT"])} />
            <SectionSelect label="Attendance Status" value={objForm.strAttendanceStatusCode} onChange={(v) => setMaster("strAttendanceStatusCode", v)} options={lstAttendanceStatuses.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
            <SectionSelect label="Approval Route" value={objForm.strApprovalRouteCode} onChange={(v) => setMaster("strApprovalRouteCode", v)} options={optionsFor("LEAVE_APPROVAL_ROUTE", ["LINE_MANAGER", "REPORTING_MANAGER", "HR", "CONFIGURED_WORKFLOW"])} />
            <SectionNum label="Display Order" value={objForm.intDisplayOrder} onChange={(v) => setMaster("intDisplayOrder", v ?? 0)} />
            <SectionText label="Effective From" type="date" value={objForm.dtEffectiveFrom} onChange={(v) => setMaster("dtEffectiveFrom", v)} />
            {/* POC: Effective To hidden — value preserved in the form payload. */}
            <Box sx={{ gridColumn: "span 2" }}>
              <SectionText label="Description" value={objForm.strDescription} onChange={(v) => setMaster("strDescription", v)} />
            </Box>
            <Box sx={objFullCellSx}>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                <SectionSwitch label="Paid" value={objForm.blnIsPaid} onChange={(v) => { setMaster("blnIsPaid", v); if (!v) setMaster("strPayrollTreatmentCode", "UNPAID"); }} />
                <SectionSwitch label="Balance tracked" value={objForm.blnBalanceTrackingRequired} onChange={(v) => setMaster("blnBalanceTrackingRequired", v)} />
                <SectionSwitch label="Statutory" value={objForm.blnIsStatutory} onChange={(v) => setMaster("blnIsStatutory", v)} />
                <SectionSwitch label="Encashable" value={objForm.blnIsEncashable} onChange={(v) => setMaster("blnIsEncashable", v)} />
                <SectionSwitch label="Active" value={objForm.blnIsActive} onChange={(v) => setMaster("blnIsActive", v)} />
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* B. Application Channels & Behaviour */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Application Channels &amp; Behaviour</Typography>
        <Box>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            <SectionSwitch label="ESS apply" value={objForm.blnAllowEmployeeApply} onChange={(v) => setMaster("blnAllowEmployeeApply", v)} />
            <SectionSwitch label="HR on behalf" value={objForm.blnAllowHrApplyOnBehalf} onChange={(v) => setMaster("blnAllowHrApplyOnBehalf", v)} />
            <SectionSwitch label="Allow half-day" value={objForm.blnAllowHalfDay} onChange={(v) => setMaster("blnAllowHalfDay", v)} />
            <SectionSwitch label="Reason required" value={objForm.blnRequiresReason} onChange={(v) => setMaster("blnRequiresReason", v)} />
            <SectionSwitch label="Proof required" value={objForm.blnRequiresProof} onChange={(v) => setMaster("blnRequiresProof", v)} />
            <SectionSwitch label="Allow negative balance" value={objForm.blnAllowNegativeBalance} onChange={(v) => setMaster("blnAllowNegativeBalance", v)} />
          </Stack>
        </Box>
      </Paper>

      {/* C. Entitlement & Accrual */}
      {blnShowAccrual ? (
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Entitlement &amp; Accrual</Typography>
          <Box>
            <Box sx={objGridSx}>
              {/* POC: Year start month/day hidden — leave year is a company-level setting; values preserved. */}
              <SectionNum label="Annual entitlement" value={objPolicy.decEntitlementQty} onChange={(v) => setPolicy("decEntitlementQty", v ?? 0)} />
              <SectionSelect label="Accrual frequency" value={objPolicy.strAccrualFrequency} onChange={(v) => setPolicy("strAccrualFrequency", v)} options={[{ code: "none", label: "None" }, { code: "monthly", label: "Monthly" }, { code: "yearly", label: "Yearly" }]} />
              <SectionNum label="Qty / cycle" value={objPolicy.decAccrualQty} onChange={(v) => setPolicy("decAccrualQty", v ?? 0)} />
              <SectionSelect label="Accrual timing" value={objPolicy.strAccrualTimingCode} onChange={(v) => setPolicy("strAccrualTimingCode", v)} options={optionsFor("LEAVE_ACCRUAL_TIMING", ["PERIOD_START", "PERIOD_END", "JOINING_DATE", "CONFIRMATION_DATE"])} />
              <SectionSelect label="Rounding" value={objPolicy.strAccrualRoundingCode} onChange={(v) => setPolicy("strAccrualRoundingCode", v)} options={lstRoundingCodes.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
              {/* POC: Waiting Gap (waiting days) and Minimum Service Days hidden — values preserved. */}
              <SectionSelect label="Join proration" value={objPolicy.strJoinProrationBasisCode} onChange={(v) => setPolicy("strJoinProrationBasisCode", v)} options={lstProrationBasis.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
              <Box sx={objFullCellSx}>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                  <SectionSwitch label="Credit on joining" value={objPolicy.blnCreditOnJoining} onChange={(v) => setPolicy("blnCreditOnJoining", v)} />
                  <SectionSwitch label="Credit on confirmation" value={objPolicy.blnCreditOnConfirmation} onChange={(v) => setPolicy("blnCreditOnConfirmation", v)} />
                </Stack>
              </Box>
            </Box>
          </Box>
        </Paper>
      ) : null}

      {/* D. Application Limits */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Application Limits</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionNum label="Min per request" value={objPolicy.decMinPerApplication} onChange={(v) => setPolicy("decMinPerApplication", v)} />
            <SectionNum label="Max per request" value={objPolicy.decMaxPerApplication} onChange={(v) => setPolicy("decMaxPerApplication", v)} />
            <SectionNum label="Max consecutive" value={objPolicy.decMaxConsecutiveDays} onChange={(v) => setPolicy("decMaxConsecutiveDays", v)} />
            {/* POC: Maximum per Month hidden — value preserved. */}
            <SectionNum label="Max / year" value={objPolicy.intMaxApplicationsPerYear} onChange={(v) => setPolicy("intMaxApplicationsPerYear", v)} />
            <SectionNum label="Min notice days" value={objPolicy.intMinNoticeDays} onChange={(v) => setPolicy("intMinNoticeDays", v ?? 0)} />
            <SectionNum label="Max backdate days" value={objPolicy.intMaxBackdateDays} onChange={(v) => setPolicy("intMaxBackdateDays", v ?? 0)} />
            <SectionNum label="Max advance days" value={objPolicy.intMaxAdvanceDays} onChange={(v) => setPolicy("intMaxAdvanceDays", v)} />
            {/* POC: Minimum Balance after Request and Hourly Leave (+ Minimum hours) hidden — values preserved. */}
            <Box sx={objFullCellSx}>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                <SectionSwitch label="Backdated allowed" value={objPolicy.blnBackdatedApplicationAllowed} onChange={(v) => setPolicy("blnBackdatedApplicationAllowed", v)} />
                <SectionSwitch label="Future allowed" value={objPolicy.blnFutureApplicationAllowed} onChange={(v) => setPolicy("blnFutureApplicationAllowed", v)} />
                <SectionSwitch label="During probation" value={objPolicy.blnAllowDuringProbation} onChange={(v) => setPolicy("blnAllowDuringProbation", v)} />
                <SectionSwitch label="During notice period" value={objPolicy.blnAllowDuringNoticePeriod} onChange={(v) => setPolicy("blnAllowDuringNoticePeriod", v)} />
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* E. Weekly-off / Holiday / Sandwich */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Weekly Off, Holiday &amp; Sandwich</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionSelect label="Weekly-off treatment" value={objPolicy.strWeeklyOffTreatmentCode} onChange={(v) => setPolicy("strWeeklyOffTreatmentCode", v)} options={lstTreatmentCodes.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
            <SectionSelect label="Holiday treatment" value={objPolicy.strHolidayTreatmentCode} onChange={(v) => setPolicy("strHolidayTreatmentCode", v)} options={lstTreatmentCodes.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
            <Box><SectionSwitch label="Sandwich rule enabled" value={objPolicy.blnSandwichRuleEnabled} onChange={(v) => setPolicy("blnSandwichRuleEnabled", v)} /></Box>
            {objPolicy.blnSandwichRuleEnabled ? (
              <>
                <SectionSelect label="Sandwich scope" value={objPolicy.strSandwichScopeCode} onChange={(v) => setPolicy("strSandwichScopeCode", v)} options={optionsFor("LEAVE_SANDWICH_SCOPE", ["WEEKLY_OFF", "HOLIDAY", "WEEKLY_OFF_AND_HOLIDAY"])} />
                <SectionSelect label="Sandwich boundary" value={objPolicy.strSandwichBoundaryCode} onChange={(v) => setPolicy("strSandwichBoundaryCode", v)} options={optionsFor("LEAVE_SANDWICH_BOUNDARY", ["PRECEDING", "FOLLOWING", "BOTH_SIDES"])} />
                {/* POC: Apply Across Different Types hidden — value preserved. */}
                <Box sx={objFullCellSx}><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>Example: Fri + Mon leave with Sat/Sun off &mdash; a &quot;both sides&quot; sandwich counts the weekend as leave.</Typography></Box>
              </>
            ) : null}
          </Box>
        </Box>
      </Paper>

      {/* F. Carry Forward */}
      {blnShowAccrual ? (
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Carry Forward &amp; Year-End</Typography>
          <Box>
            <Box sx={objGridSx}>
              <Box><SectionSwitch label="Carry forward allowed" value={objPolicy.blnCarryForwardAllowed} onChange={(v) => setPolicy("blnCarryForwardAllowed", v)} /></Box>
              {objPolicy.blnCarryForwardAllowed ? (
                <>
                  <SectionSelect label="Limit type" value={objPolicy.strCarryForwardLimitTypeCode} onChange={(v) => setPolicy("strCarryForwardLimitTypeCode", v)} options={optionsFor("LEAVE_CARRY_FORWARD_LIMIT", ["FIXED_DAYS", "PERCENTAGE", "UNLIMITED"])} />
                  {objPolicy.strCarryForwardLimitTypeCode === "FIXED_DAYS" ? <SectionNum label="Max carry-fwd days" value={objPolicy.decMaxCarryForward} onChange={(v) => setPolicy("decMaxCarryForward", v)} /> : null}
                  {objPolicy.strCarryForwardLimitTypeCode === "PERCENTAGE" ? <SectionNum label="Percent (0-100)" value={objPolicy.decCarryForwardPercent} onChange={(v) => setPolicy("decCarryForwardPercent", v)} /> : null}
                  {/* POC: Carry Forward Expiry (months) hidden — value preserved. */}
                </>
              ) : null}
              <SectionNum label="Max balance cap" value={objPolicy.decMaxBalance} onChange={(v) => setPolicy("decMaxBalance", v)} />
              <Box><SectionSwitch label="Lapse excess balance" value={objPolicy.blnLapseExcessBalance} onChange={(v) => setPolicy("blnLapseExcessBalance", v)} /></Box>
            </Box>
          </Box>
        </Paper>
      ) : null}

      {/* G. Encashment */}
      {blnShowEncashment ? (
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Encashment</Typography>
          <Box>
            <Box sx={objGridSx}>
              <Box><SectionSwitch label="Encashment allowed" value={objPolicy.blnEncashmentAllowed} onChange={(v) => setPolicy("blnEncashmentAllowed", v)} /></Box>
              {objPolicy.blnEncashmentAllowed ? (
                <>
                  <SectionSelect label="Encashment event" value={objPolicy.strEncashmentEventCode} onChange={(v) => setPolicy("strEncashmentEventCode", v)} options={optionsFor("LEAVE_ENCASHMENT_EVENT", ["FNF_ONLY", "YEAR_END", "FNF_AND_YEAR_END", "ANYTIME"])} />
                  <SectionNum label="Max encashable days" value={objPolicy.decMaxEncashableDays} onChange={(v) => setPolicy("decMaxEncashableDays", v)} />
                  <SectionNum label="Min retained balance" value={objPolicy.decMinBalanceForEncashment} onChange={(v) => setPolicy("decMinBalanceForEncashment", v)} />
                </>
              ) : null}
            </Box>
          </Box>
        </Paper>
      ) : null}

      {/* H. Proof & Documents */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Proof &amp; Documents</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionSelect label="Proof rule" value={objPolicy.strProofRuleCode} onChange={(v) => setPolicy("strProofRuleCode", v)} options={optionsFor("LEAVE_PROOF_RULE", ["NOT_REQUIRED", "ALWAYS_REQUIRED", "REQUIRED_AFTER_N_DAYS"])} />
            {objPolicy.strProofRuleCode === "REQUIRED_AFTER_N_DAYS" ? (
              <>
                <SectionNum label="Required after days" value={objPolicy.decProofRequiredAfterDays} onChange={(v) => setPolicy("decProofRequiredAfterDays", v)} />
                <SectionText label="Document type" value={objPolicy.strProofDocumentTypeCode} onChange={(v) => setPolicy("strProofDocumentTypeCode", v || null)} />
              </>
            ) : null}
          </Box>
        </Box>
      </Paper>

      {/* I. Approval workflow behaviour + steps */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Approval Workflow</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionSelect label="Backup resource rule" value={objPolicy.strBackupResourceRuleCode} onChange={(v) => setPolicy("strBackupResourceRuleCode", v)} options={optionsFor("LEAVE_BACKUP_RESOURCE_RULE", ["NOT_REQUIRED", "OPTIONAL", "MANDATORY"])} />
            <SectionSelect label="No-action auto behaviour" value={objPolicy.strAutoActionCode} onChange={(v) => setPolicy("strAutoActionCode", v)} options={optionsFor("LEAVE_AUTO_ACTION", ["NONE", "AUTO_APPROVE", "ESCALATE", "SKIP_TO_NEXT_APPROVER"])} />
            {objPolicy.strAutoActionCode !== "NONE" ? (
              <>
                <SectionNum label="After days" value={objPolicy.intAutoActionAfterDays} onChange={(v) => setPolicy("intAutoActionAfterDays", v)} />
                {/* POC: Escalation Role hidden — value preserved. */}
              </>
            ) : null}
            <Box sx={objFullCellSx}>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                <SectionSwitch label="Cancel before start" value={objPolicy.blnCancellationBeforeStartAllowed} onChange={(v) => setPolicy("blnCancellationBeforeStartAllowed", v)} />
                {/* POC: Cancel After Start hidden — value preserved. */}
                <SectionSwitch label="Manager cancel approved" value={objPolicy.blnManagerCancelApprovedAllowed} onChange={(v) => setPolicy("blnManagerCancelApprovedAllowed", v)} />
              </Stack>
            </Box>
            <Box sx={objFullCellSx}><Divider><Chip label="Approval steps" size="small" /></Divider></Box>
            {objForm.lstApprovalSteps.map((objStep, intIndex) => (
              <Box sx={objFullCellSx} key={intIndex}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField label="Step" type="number" size="small" value={objStep.intStepNo} onChange={(e) => updateStep(intIndex, { intStepNo: Number(e.target.value) || 1 })} sx={{ width: 80 }} {...objInputProps} />
                  <TextField label="Approver" select size="small" value={objStep.strApproverSourceCode} onChange={(e) => updateStep(intIndex, { strApproverSourceCode: e.target.value })} sx={{ width: 200 }} {...objInputProps}>
                    {lstApproverSources.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ")}</MenuItem>)}
                  </TextField>
                  <TextField label="No-action days" type="number" size="small" value={objStep.intNoActionAfterDays ?? ""} onChange={(e) => updateStep(intIndex, { intNoActionAfterDays: toNum(e.target.value) })} sx={{ width: 130 }} {...objInputProps} />
                  <TextField label="On no-action" select size="small" value={objStep.strNoActionRuleCode} onChange={(e) => updateStep(intIndex, { strNoActionRuleCode: e.target.value })} sx={{ width: 180 }} {...objInputProps}>
                    {["ESCALATE", "AUTO_APPROVE", "SKIP_TO_NEXT_APPROVER"].map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ")}</MenuItem>)}
                  </TextField>
                  <FormControlLabel control={<Switch size="small" checked={objStep.blnActionRequired} disabled={blnReadOnly} onChange={(e) => updateStep(intIndex, { blnActionRequired: e.target.checked })} />} label="Action req." />
                  {!blnReadOnly ? <IconButton size="small" color="error" onClick={() => removeStep(intIndex)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
                </Stack>
              </Box>
            ))}
            {!blnReadOnly ? <Box sx={objFullCellSx}><Button size="small" startIcon={<AddRoundedIcon />} onClick={addStep}>Add step</Button></Box> : null}
          </Box>
        </Box>
      </Paper>

      {/* Translations — placed before Advanced Configuration per POC section order. */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Translations</Typography>
        <Box>
          <Stack spacing={1}>
            {objForm.lstText.map((objRow, intIndex) => (
              <Stack key={intIndex} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField label="Language" select size="small" value={objRow.intLanguageID} onChange={(e) => updateText(intIndex, { intLanguageID: Number(e.target.value) })} sx={{ width: 130 }} {...objInputProps}>
                  <MenuItem value={1}>English</MenuItem>
                  <MenuItem value={2}>Hindi</MenuItem>
                </TextField>
                <TextField label={`Name (${dicLangName[objRow.intLanguageID] ?? objRow.intLanguageID})`} size="small" value={objRow.strTypeName} onChange={(e) => updateText(intIndex, { strTypeName: e.target.value })} sx={{ width: 220 }} {...objInputProps} />
                <TextField label="Description" size="small" value={objRow.strDescription ?? ""} onChange={(e) => updateText(intIndex, { strDescription: e.target.value })} sx={{ width: 260 }} {...objInputProps} />
                {!blnReadOnly && objForm.lstText.length > 1 ? <IconButton size="small" color="error" onClick={() => removeText(intIndex)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
              </Stack>
            ))}
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem" }}>English (default) name is mandatory. Duplicate languages are not allowed.</Typography>
            {!blnReadOnly ? <Box><Button size="small" startIcon={<AddRoundedIcon />} onClick={addText} disabled={objForm.lstText.length >= 2}>Add language</Button></Box> : null}
          </Stack>
        </Box>
      </Paper>

      {/* Advanced Configuration — collapsed by default (POC): groups Applicability, Advanced Rules, Combination. */}
      <Paper sx={objSectionSx}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ cursor: blnReadOnly ? "default" : "pointer" }} role="button" aria-expanded={blnAdvancedOpen} onClick={() => setBlnAdvancedOpen((blnPrev) => !blnPrev)}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>Advanced Configuration</Typography>
          <ExpandMoreRoundedIcon sx={{ transform: blnAdvancedOpen ? "rotate(180deg)" : "none", transition: "transform .2s", color: "#64748b" }} />
        </Stack>
        <Collapse in={blnAdvancedOpen} unmountOnExit>
          <Stack spacing={2.5} sx={{ mt: 2 }}>

      {/* Applicability */}
      <Paper variant="outlined" sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Applicability &amp; Eligibility</Typography>
        <Box>
          <Stack spacing={1}>
            {objForm.lstApplicability.map((objRow, intIndex) => (
              <Stack key={intIndex} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField label="Type" select size="small" value={objRow.strApplicabilityTypeCode} onChange={(e) => updateApplicability(intIndex, { strApplicabilityTypeCode: e.target.value })} sx={{ width: 180 }} {...objInputProps}>
                  {lstApplicabilityTypes.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ")}</MenuItem>)}
                </TextField>
                <TextField label="Entity ID" type="number" size="small" value={objRow.intApplicabilityEntityID ?? ""} onChange={(e) => updateApplicability(intIndex, { intApplicabilityEntityID: toNum(e.target.value) })} sx={{ width: 120 }} {...objInputProps} />
                <TextField label="Value code" size="small" value={objRow.strApplicabilityValueCode ?? ""} onChange={(e) => updateApplicability(intIndex, { strApplicabilityValueCode: e.target.value.toUpperCase() })} sx={{ width: 150 }} {...objInputProps} />
                <TextField label="Priority" type="number" size="small" value={objRow.intPriority} onChange={(e) => updateApplicability(intIndex, { intPriority: Number(e.target.value) || 100 })} sx={{ width: 100 }} {...objInputProps} />
                <FormControlLabel control={<Switch size="small" checked={objRow.blnIncludeFlag} disabled={blnReadOnly} onChange={(e) => updateApplicability(intIndex, { blnIncludeFlag: e.target.checked })} />} label={objRow.blnIncludeFlag ? "Include" : "Exclude"} />
                {!blnReadOnly ? <IconButton size="small" color="error" onClick={() => removeApplicability(intIndex)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
              </Stack>
            ))}
            {objForm.lstApplicability.length === 0 ? <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>Applies to everyone (no restriction).</Typography> : null}
            {!blnReadOnly ? <Box><Button size="small" startIcon={<AddRoundedIcon />} onClick={addApplicability}>Add rule</Button></Box> : null}
          </Stack>
        </Box>
      </Paper>

      {/* Advanced conditional rules (rule builder) */}
      <Paper variant="outlined" sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Advanced Rules (conditional eligibility)</Typography>
        <Box>
          <Stack spacing={1}>
            {objForm.lstRules.map((objRow, intIndex) => {
              const blnRange = objRow.strOperatorCode === "BETWEEN" || objRow.strOperatorCode === "NOT_BETWEEN";
              return (
                <Stack key={intIndex} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <TextField label="Group" type="number" size="small" value={objRow.intRuleGroupNo} onChange={(e) => updateRule(intIndex, { intRuleGroupNo: Number(e.target.value) || 1 })} sx={{ width: 80 }} {...objInputProps} />
                  <TextField label="Seq" type="number" size="small" value={objRow.intRuleSequence} onChange={(e) => updateRule(intIndex, { intRuleSequence: Number(e.target.value) || 0 })} sx={{ width: 80 }} {...objInputProps} />
                  <TextField label="Attribute" size="small" value={objRow.strAttributeCode} onChange={(e) => updateRule(intIndex, { strAttributeCode: e.target.value.toUpperCase() })} placeholder="e.g. GENDER, TENURE_MONTHS" sx={{ width: 190 }} {...objInputProps} />
                  <TextField label="Operator" select size="small" value={objRow.strOperatorCode} onChange={(e) => updateRule(intIndex, { strOperatorCode: e.target.value })} sx={{ width: 160 }} {...objInputProps}>
                    {lstRuleOperators.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ")}</MenuItem>)}
                  </TextField>
                  <TextField label={blnRange ? "From" : "Value"} size="small" value={objRow.strValueFrom ?? ""} onChange={(e) => updateRule(intIndex, { strValueFrom: e.target.value })} sx={{ width: 120 }} {...objInputProps} />
                  {blnRange ? <TextField label="To" size="small" value={objRow.strValueTo ?? ""} onChange={(e) => updateRule(intIndex, { strValueTo: e.target.value })} sx={{ width: 120 }} {...objInputProps} /> : null}
                  <TextField label="Failure message" size="small" value={objRow.strFailureMessage ?? ""} onChange={(e) => updateRule(intIndex, { strFailureMessage: e.target.value })} sx={{ width: 220 }} {...objInputProps} />
                  {!blnReadOnly ? <IconButton size="small" color="error" onClick={() => removeRule(intIndex)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
                </Stack>
              );
            })}
            {objForm.lstRules.length === 0 ? <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No advanced conditions. Use these for eligibility not covered by applicability (e.g. tenure bands, gender, child count).</Typography> : null}
            {!blnReadOnly ? <Box><Button size="small" startIcon={<AddRoundedIcon />} onClick={addRule}>Add rule</Button></Box> : null}
          </Stack>
        </Box>
      </Paper>

      {/* Combination rules */}
      <Paper variant="outlined" sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Combination Rules</Typography>
        <Box>
          <Stack spacing={1}>
            {objForm.lstCombinationRules.map((objRow, intIndex) => (
              <Stack key={intIndex} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <TextField label="Other leave type" select size="small" value={objRow.intOtherLeaveTypeID} onChange={(e) => updateCombo(intIndex, { intOtherLeaveTypeID: Number(e.target.value) })} sx={{ width: 220 }} {...objInputProps}>
                  {lstOtherTypes.filter((t) => t.intID !== objForm.intID).map((t) => <MenuItem key={t.intID} value={t.intID}>{t.strDisplayName} ({t.strTypeCode})</MenuItem>)}
                </TextField>
                <TextField label="Rule" select size="small" value={objRow.strCombinationRuleCode} onChange={(e) => updateCombo(intIndex, { strCombinationRuleCode: e.target.value })} sx={{ width: 180 }} {...objInputProps}>
                  {lstCombinationRuleCodes.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ")}</MenuItem>)}
                </TextField>
                <TextField label="Gap days" type="number" size="small" value={objRow.intSequenceGapDays} onChange={(e) => updateCombo(intIndex, { intSequenceGapDays: Number(e.target.value) || 0 })} sx={{ width: 110 }} {...objInputProps} />
                {!blnReadOnly ? <IconButton size="small" color="error" onClick={() => removeCombo(intIndex)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
              </Stack>
            ))}
            {objForm.lstCombinationRules.length === 0 ? <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>No combination restrictions.</Typography> : null}
            {!blnReadOnly ? <Box><Button size="small" startIcon={<AddRoundedIcon />} onClick={addCombo} disabled={lstOtherTypes.length === 0}>Add rule</Button></Box> : null}
          </Stack>
        </Box>
      </Paper>
          </Stack>
        </Collapse>
      </Paper>

      {/* M. Usage */}
      {objForm.objUsage ? (
        <Paper sx={objSectionSx}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Usage Information</Typography>
          <Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Policies: ${objForm.objUsage.intPolicies}`} />
              <Chip label={`Applications: ${objForm.objUsage.intApplications}`} />
              <Chip label={`Balances: ${objForm.objUsage.intBalances}`} />
              <Chip label={`Ledger: ${objForm.objUsage.intLedgerEntries}`} />
              <Chip label={`Combination refs: ${objForm.objUsage.intCombinationRules}`} />
              <Chip color={objForm.objUsage.blnInUse ? "warning" : "success"} label={objForm.objUsage.blnInUse ? "In use — delete blocked, deactivate instead" : "Not in use — deletable"} />
            </Stack>
          </Box>
        </Paper>
      ) : null}

      {!blnReadOnly ? (
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
          <Button onClick={() => objRouter.push("/leave")}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={submit} disabled={blnSaving}>{blnSaving ? "Saving..." : "Save Leave Type"}</Button>
        </Stack>
      ) : null}
      </fieldset>

      <Snackbar open={objToast.blnOpen} autoHideDuration={5000} onClose={() => setObjToast((p) => ({ ...p, blnOpen: false }))} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert severity={objToast.strSeverity} variant="filled" onClose={() => setObjToast((p) => ({ ...p, blnOpen: false }))}>{objToast.strMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
