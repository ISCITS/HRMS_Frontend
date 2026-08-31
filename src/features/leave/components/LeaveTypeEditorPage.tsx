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
import { useEffect, useMemo, useRef, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import styles from "@/components/master/MasterScreen.module.css";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeListRecord } from "@/features/employee/types";
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
  ResourceCapabilities,
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
const lstAttendanceStatuses = ["ON_LEAVE", "LWP", "ON_DUTY", "PRESENT", "HALF_DAY"];
const lstCombinationRuleCodes = ["NOT_ALLOWED", "ALLOWED", "ALLOWED_WITH_GAP"];
const lstRuleOperators = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "GREATER_OR_EQUAL", "LESS_OR_EQUAL", "BETWEEN", "NOT_BETWEEN", "IN", "NOT_IN"];

// POC standard option sets (India POC simplification). Advanced/legacy codes are hidden from these
// dropdowns but preserved on old records via `optsWithCurrent`, which re-adds a stored value that is
// no longer in the standard list so it still displays and round-trips on save.
// FIXED_EMPLOYEE ("Specific User") routes the step to one named employee, chosen per step.
const strFixedEmployeeSource = "FIXED_EMPLOYEE";
const lstPocApproverSources = [
  { code: "REPORTING_MANAGER", label: "REPORTING MANAGER" },
  { code: "LINE_MANAGER", label: "LINE MANAGER" },
  { code: "HR", label: "HR" },
  { code: strFixedEmployeeSource, label: "Specific User" },
];
const lstPocNoActionRules = [
  { code: "NONE", label: "No Automatic Action" },
  { code: "AUTO_APPROVE", label: "Auto Approve" },
  { code: "SKIP_TO_NEXT_APPROVER", label: "Skip to Next Approver" },
];
const lstPocRounding = [
  { code: "NONE", label: "No Rounding" },
  { code: "NEAREST_HALF", label: "Nearest Half Day" },
  { code: "NEAREST_FULL", label: "Nearest Full Day" },
];

function toNum(strValue: string): number | null {
  return strValue === "" ? null : Number(strValue);
}

function normalizeDateForApi(strValue: string | null | undefined): string | null {
  const strTrimmed = String(strValue ?? "").trim();
  if (!strTrimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(strTrimmed)) return strTrimmed;
  const objDdMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(strTrimmed);
  if (objDdMmYyyy) {
    const [, strDay, strMonth, strYear] = objDdMmYyyy;
    return `${strYear}-${strMonth}-${strDay}`;
  }
  return strTrimmed;
}

function emptyToNull(strValue: string | null | undefined): string | null {
  const strTrimmed = String(strValue ?? "").trim();
  return strTrimmed || null;
}

// Append the current stored code to a standard option list when it is not already present, so legacy
// values (e.g. a proration basis or approver source hidden from the POC UI) still render and survive a save.
function optsWithCurrent(lstOptions: { code: string; label: string }[], strCurrent: string | null | undefined): { code: string; label: string }[] {
  if (!strCurrent || lstOptions.some((o) => o.code === strCurrent)) return lstOptions;
  return [...lstOptions, { code: strCurrent, label: strCurrent.replace(/_/g, " ") }];
}

// Credit per Cycle is derived, not entered: yearly = full entitlement, monthly = entitlement / 12,
// manual credit ("none") = 0. Used for both the read-only display and the persisted decAccrualQty.
function computeCreditPerCycle(decEntitlement: number | null | undefined, strFrequency: string): number {
  const decAnnual = Number(decEntitlement ?? 0);
  if (strFrequency === "yearly") return decAnnual;
  if (strFrequency === "monthly") return Math.round((decAnnual / 12) * 100) / 100;
  return 0;
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
function SectionNum(props: { label: string; value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <TextField
      label={props.label}
      type="number"
      value={props.value ?? ""}
      onChange={(e) => props.onChange(toNum(e.target.value))}
      size="small"
      fullWidth
      placeholder={props.placeholder}
      // Keep the label floated when a placeholder is supplied so the "No limit" hint stays visible on empty optional fields.
      InputLabelProps={props.placeholder ? { shrink: true } : undefined}
    />
  );
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
  return <FormControlLabel sx={{ m: 0 }} control={<Switch size="small" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />} label={props.label} />;
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
    decMaxDaysPerMonth: null,
    blnAccrualLapseUnused: false,
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

export default function LeaveTypeEditorPage({ strMode, intLeaveTypeID }: { strMode: "new" | "edit"; intLeaveTypeID?: number }) {
  const objRouter = useRouter();
  const { canDo } = useActionRights();
  // Capabilities decided by the server and returned with the record. The screen opens read-only
  // and enables editing only when the server says so, which is why no mode travels in the URL —
  // there is nothing for a user to flip. Null until the record loads.
  const [objCapabilities, setObjCapabilities] = useState<ResourceCapabilities | null>(null);
  const blnReadOnly =
    strMode === "new"
      ? !canDo("leave_types", "ADD")
      : objCapabilities === null || !objCapabilities.blnCanEdit;
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
  const [lstEmployeeOptions, setLstEmployeeOptions] = useState<EmployeeListRecord[]>([]);
  const [blnEmployeesLoading, setBlnEmployeesLoading] = useState(false);

  const objPolicy = objForm.objPolicy ?? emptyPolicy();

  // The employee list backs the "Specific User" approver only, so it is fetched the first time a step
  // uses that source (either freshly selected or loaded from a saved policy) instead of on every open.
  // The one-shot guard is a ref, not state: a state flag in the dependency array would re-run this
  // effect and fire its cleanup mid-flight, discarding the response that is already on its way.
  const blnNeedsEmployees = objForm.lstApprovalSteps.some((objStep) => objStep.strApproverSourceCode === strFixedEmployeeSource);
  const refEmployeesRequested = useRef(false);
  useEffect(() => {
    if (!blnNeedsEmployees || refEmployeesRequested.current) return;
    refEmployeesRequested.current = true;
    let blnMounted = true;
    setBlnEmployeesLoading(true);
    employeeService.getEmployees()
      .then((lstResult) => { if (blnMounted) setLstEmployeeOptions(lstResult.filter((objEmployee) => !objEmployee.blnIsPartialSave)); })
      .catch(() => {
        // Allow a later retry (re-selecting the source) instead of leaving the dropdown empty forever.
        refEmployeesRequested.current = false;
        if (blnMounted) setLstEmployeeOptions([]);
      })
      .finally(() => { if (blnMounted) setBlnEmployeesLoading(false); });
    return () => { blnMounted = false; };
  }, [blnNeedsEmployees]);

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
          const objEnvelope = await leaveService.getLeaveTypeAggregate(intLeaveTypeID);
          setObjCapabilities(objEnvelope.objCapabilities);
          const objAggregate = objEnvelope.objData;
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

  // Stage 2 (Sandwich): the simplified "Apply Sandwich On" control drives both the stored scope code and
  // the underlying weekly/holiday treatment codes. Standard POC edits always fix boundary to BOTH_SIDES
  // and cross-type application to false. Legacy advanced values are preserved on load — we only rewrite
  // the derived fields when the user changes these simplified controls.
  function applyScopeDerivation(objBase: LeavePolicyAggregate, strScope: string): LeavePolicyAggregate {
    const blnWeekly = strScope === "WEEKLY_OFF" || strScope === "WEEKLY_OFF_AND_HOLIDAY";
    const blnHoliday = strScope === "HOLIDAY" || strScope === "WEEKLY_OFF_AND_HOLIDAY";
    return {
      ...objBase,
      strSandwichScopeCode: strScope,
      strWeeklyOffTreatmentCode: blnWeekly ? "COUNT_IF_ENCLOSED" : "EXCLUDE",
      strHolidayTreatmentCode: blnHoliday ? "COUNT_IF_ENCLOSED" : "EXCLUDE",
      strSandwichBoundaryCode: "BOTH_SIDES",
      blnSandwichApplyOnDifferentLeaveTypes: false,
    };
  }
  function setSandwichEnabled(blnEnabled: boolean) {
    setObjForm((objPrev) => {
      const objBase = objPrev.objPolicy ?? emptyPolicy();
      if (!blnEnabled) {
        return { ...objPrev, objPolicy: { ...objBase, blnSandwichRuleEnabled: false, strWeeklyOffTreatmentCode: "EXCLUDE", strHolidayTreatmentCode: "EXCLUDE" } };
      }
      return { ...objPrev, objPolicy: { ...applyScopeDerivation(objBase, objBase.strSandwichScopeCode || "WEEKLY_OFF_AND_HOLIDAY"), blnSandwichRuleEnabled: true } };
    });
  }
  function setApplySandwichOn(strScope: string) {
    setObjForm((objPrev) => ({ ...objPrev, objPolicy: applyScopeDerivation(objPrev.objPolicy ?? emptyPolicy(), strScope) }));
  }

  // Stage 3 (Entitlement): Credit per Cycle is derived and persisted into decAccrualQty whenever the
  // annual entitlement or frequency changes, so the read-only display and the saved value stay in sync.
  function setEntitlementQty(decValue: number | null) {
    setObjForm((objPrev) => {
      const objBase = objPrev.objPolicy ?? emptyPolicy();
      const dec = decValue ?? 0;
      return { ...objPrev, objPolicy: { ...objBase, decEntitlementQty: dec, decAccrualQty: computeCreditPerCycle(dec, objBase.strAccrualFrequency) } };
    });
  }
  function setAccrualFrequency(strValue: string) {
    setObjForm((objPrev) => {
      const objBase = objPrev.objPolicy ?? emptyPolicy();
      return { ...objPrev, objPolicy: { ...objBase, strAccrualFrequency: strValue, decAccrualQty: computeCreditPerCycle(objBase.decEntitlementQty, strValue) } };
    });
  }
  // Stage 3 (Eligibility): a single "Leave Eligibility" select replaces the two independent credit switches.
  function setLeaveEligibility(strValue: string) {
    const blnConfirmation = strValue === "CONFIRMATION";
    setObjForm((objPrev) => ({ ...objPrev, objPolicy: { ...(objPrev.objPolicy ?? emptyPolicy()), blnCreditOnJoining: !blnConfirmation, blnCreditOnConfirmation: blnConfirmation } }));
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
    const lstText = objForm.lstText.map((objText) => ({
      ...objText,
      strTypeName: objText.intLanguageID === 1 && !objText.strTypeName.trim() ? objForm.strTypeName : objText.strTypeName.trim(),
      strDescription: emptyToNull(objText.strDescription),
      strEmployeeHelpText: emptyToNull(objText.strEmployeeHelpText),
    }));
    const strEffectiveFrom = normalizeDateForApi(objForm.dtEffectiveFrom);
    const strEffectiveTo = normalizeDateForApi(objForm.dtEffectiveTo);
    // The type's effective dates also drive the policy version window (single source of truth).
    const objPolicyOut = objForm.objPolicy
      ? {
          ...objForm.objPolicy,
          dtEffectiveFrom: strEffectiveFrom || normalizeDateForApi(objForm.objPolicy.dtEffectiveFrom) || new Date().toISOString().slice(0, 10),
          dtEffectiveTo: strEffectiveTo ?? normalizeDateForApi(objForm.objPolicy.dtEffectiveTo),
          strPolicyCode: emptyToNull(objForm.objPolicy.strPolicyCode),
          strPolicyName: emptyToNull(objForm.objPolicy.strPolicyName),
          strProofDocumentTypeCode: emptyToNull(objForm.objPolicy.strProofDocumentTypeCode),
          strEscalationRoleCode: emptyToNull(objForm.objPolicy.strEscalationRoleCode),
          strRemarks: emptyToNull(objForm.objPolicy.strRemarks),
        }
      : objForm.objPolicy;
    const objPayload: LeaveTypeAggregate = {
      ...objForm,
      strTypeCode: objForm.strTypeCode.trim().toUpperCase(),
      strTypeName: objForm.strTypeName.trim(),
      strDescription: emptyToNull(objForm.strDescription),
      dtEffectiveFrom: strEffectiveFrom,
      dtEffectiveTo: strEffectiveTo,
      lstText,
      lstApplicability: objForm.lstApplicability.map((objRow) => ({
        ...objRow,
        strApplicabilityValueCode: emptyToNull(objRow.strApplicabilityValueCode),
      })),
      lstRules: objForm.lstRules.map((objRow) => ({
        ...objRow,
        strValueFrom: emptyToNull(objRow.strValueFrom),
        strValueTo: emptyToNull(objRow.strValueTo),
        strResultCode: emptyToNull(objRow.strResultCode),
        strFailureMessage: emptyToNull(objRow.strFailureMessage),
      })),
      objPolicy: objPolicyOut,
    };
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
    setMaster("lstApprovalSteps", [...objForm.lstApprovalSteps, { intStepNo: intNext, strApproverSourceCode: "REPORTING_MANAGER", blnActionRequired: true, blnSkipIfUnavailable: true, intNoActionAfterDays: null, strNoActionRuleCode: "NONE", intEscalationStepNo: null }]);
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

  // Stack spacing / fieldset gap are 12px so every card sits the same distance apart as the app
  // header does from the toolbar below it.
  return (
    <Stack spacing={1.5} sx={{ height: "100%", overflow: "auto", pr: 0.5, pb: 4 }}>
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
          {/* The page title lives here rather than in the app-shell header (see blnLeaveTypeEditorRoute). */}
          <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: "1.1rem", md: "1.28rem" }, color: "#0f172a" }}>
            {strMode === "new" ? "New Leave Type" : blnReadOnly ? "View Leave Type" : "Edit Leave Type"}
          </Typography>
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

      {/* The 12px top margin is set here rather than left to the Stack: an inline margin outranks the
          Stack's spacing class, so relying on it would leave this one seam flush. */}
      <fieldset disabled={blnReadOnly} style={{ border: 0, margin: "12px 0 0 0", padding: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* A. Basic Information */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Basic Information</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionText label="Code" required value={objForm.strTypeCode} strError={dicFieldErrors.strTypeCode} onChange={(v) => { setMaster("strTypeCode", v.toUpperCase()); if (dicFieldErrors.strTypeCode) setDicFieldErrors((objPrev) => ({ ...objPrev, strTypeCode: undefined })); }} />
            <SectionText label="Default Name" required value={objForm.strTypeName} strError={dicFieldErrors.strTypeName} onChange={(v) => { setMaster("strTypeName", v); if (dicFieldErrors.strTypeName) setDicFieldErrors((objPrev) => ({ ...objPrev, strTypeName: undefined })); }} />
            <SectionSelect label="Category" value={objForm.strLeaveCategoryCode} onChange={(v) => setMaster("strLeaveCategoryCode", v)} options={optionsFor("LEAVE_CATEGORY", ["REGULAR", "STATUTORY", "UNPAID", "ON_DUTY", "COMPENSATORY", "RESTRICTED_HOLIDAY"])} />
            <SectionSelect label="Unit" value={objForm.strUnit} onChange={(v) => setMaster("strUnit", v)} options={optionsFor("LEAVE_UNIT", ["DAY", "HALF_DAY", "HOUR"]).map((o) => ({ code: o.code.toLowerCase(), label: o.label }))} />
            <SectionSelect label="Payroll Treatment" value={objForm.strPayrollTreatmentCode} onChange={(v) => setMaster("strPayrollTreatmentCode", v)} options={optionsFor("LEAVE_PAYROLL_TREATMENT", ["PAID", "UNPAID", "NO_PAY_IMPACT"])} />
            <SectionSelect label="Attendance Status" value={objForm.strAttendanceStatusCode} onChange={(v) => setMaster("strAttendanceStatusCode", v)} options={lstAttendanceStatuses.map((c) => ({ code: c, label: c.replace(/_/g, " ") }))} />
            {/* POC: Approval Route hidden — Approval Steps below is the single visible routing source.
                The value is preserved in the form payload and historical workflow snapshots are unaffected. */}
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
              <SectionNum label="Annual Entitlement" value={objPolicy.decEntitlementQty} onChange={(v) => setEntitlementQty(v)} />
              <SectionSelect label="Accrual Frequency" value={objPolicy.strAccrualFrequency} onChange={(v) => setAccrualFrequency(v)} options={[{ code: "yearly", label: "Yearly" }, { code: "monthly", label: "Monthly" }, { code: "none", label: "Manual Credit" }]} />
              {/* Credit per Cycle is calculated (read-only) regardless of view/edit mode. */}
              <TextField label="Credit per Cycle" value={computeCreditPerCycle(objPolicy.decEntitlementQty, objPolicy.strAccrualFrequency)} size="small" fullWidth disabled helperText="Auto-calculated from entitlement" />
              <SectionSelect label="Credit Timing" value={objPolicy.strAccrualTimingCode} onChange={(v) => setPolicy("strAccrualTimingCode", v)} options={optsWithCurrent([{ code: "PERIOD_START", label: "Start of Cycle" }, { code: "PERIOD_END", label: "End of Cycle" }], objPolicy.strAccrualTimingCode)} />
              <SectionSelect label="Rounding" value={objPolicy.strAccrualRoundingCode} onChange={(v) => setPolicy("strAccrualRoundingCode", v)} options={optsWithCurrent(lstPocRounding, objPolicy.strAccrualRoundingCode)} />
              {/* POC: Waiting Gap (waiting days) and Minimum Service Days hidden — values preserved. */}
              <SectionSelect label="Joining Proration Method" value={objPolicy.strJoinProrationBasisCode} onChange={(v) => setPolicy("strJoinProrationBasisCode", v)} options={optsWithCurrent([{ code: "CALENDAR_DAYS", label: "Calendar Days" }, { code: "COMPLETED_MONTHS", label: "Completed Months" }], objPolicy.strJoinProrationBasisCode)} />
              <SectionSelect label="Leave Eligibility" value={objPolicy.blnCreditOnConfirmation ? "CONFIRMATION" : "JOINING"} onChange={setLeaveEligibility} options={[{ code: "JOINING", label: "From Joining Date" }, { code: "CONFIRMATION", label: "From Confirmation Date" }]} />
              {/* Only meaningful when the entitlement is earned in cycles; a yearly credit has nothing to lapse. */}
              {objPolicy.strAccrualFrequency !== "yearly" && objPolicy.strAccrualFrequency !== "none" ? (
                <Box sx={objFullCellSx}><SectionSwitch label="Unused accrual lapses each cycle (no carry-over to the next period)" value={Boolean(objPolicy.blnAccrualLapseUnused)} onChange={(v) => setPolicy("blnAccrualLapseUnused", v)} /></Box>
              ) : null}
              {!objPolicy.blnCreditOnJoining && !objPolicy.blnCreditOnConfirmation ? (
                <Box sx={objFullCellSx}><Alert severity="warning" sx={{ borderRadius: "12px" }}>No eligibility start is configured on this legacy policy. Pick “From Joining Date” or “From Confirmation Date”; the stored value is preserved until you change and save.</Alert></Box>
              ) : null}
              {blnBalanceTracked && objForm.strLeaveCategoryCode === "REGULAR" && Number(objPolicy.decEntitlementQty) === 0 ? (
                <Box sx={objFullCellSx}><Alert severity="warning" sx={{ borderRadius: "12px" }}>This balance-tracked regular leave has an Annual Entitlement of 0 — employees will accrue no balance.</Alert></Box>
              ) : null}
            </Box>
          </Box>
        </Paper>
      ) : null}

      {/* D. Application Limits */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Application Limits</Typography>
        <Box>
          <Box sx={objGridSx}>
            <SectionNum label="Minimum Days per Request" value={objPolicy.decMinPerApplication} onChange={(v) => setPolicy("decMinPerApplication", v)} placeholder="No minimum" />
            <SectionNum label="Maximum Days per Request" value={objPolicy.decMaxPerApplication} onChange={(v) => setPolicy("decMaxPerApplication", v)} placeholder="No limit" />
            <SectionNum label="Maximum Consecutive Leave Days" value={objPolicy.decMaxConsecutiveDays} onChange={(v) => setPolicy("decMaxConsecutiveDays", v)} placeholder="No limit" />
            <SectionNum label="Maximum Days per Month" value={objPolicy.decMaxDaysPerMonth} onChange={(v) => setPolicy("decMaxDaysPerMonth", v)} placeholder="No limit" />
            <SectionNum label="Maximum Requests per Month" value={objPolicy.intMaxApplicationsPerMonth} onChange={(v) => setPolicy("intMaxApplicationsPerMonth", v)} placeholder="No limit" />
            <SectionNum label="Maximum Requests per Year" value={objPolicy.intMaxApplicationsPerYear} onChange={(v) => setPolicy("intMaxApplicationsPerYear", v)} placeholder="No limit" />
            <SectionNum label="Minimum Advance Notice (Days)" value={objPolicy.intMinNoticeDays} onChange={(v) => setPolicy("intMinNoticeDays", v ?? 0)} />
            {/* Conditional limits — shown (and normalized to 0/null when hidden) with their toggle. */}
            {objPolicy.blnBackdatedApplicationAllowed ? <SectionNum label="Maximum Backdated Days" value={objPolicy.intMaxBackdateDays} onChange={(v) => setPolicy("intMaxBackdateDays", v ?? 0)} /> : null}
            {objPolicy.blnFutureApplicationAllowed ? <SectionNum label="Maximum Advance Application Days" value={objPolicy.intMaxAdvanceDays} onChange={(v) => setPolicy("intMaxAdvanceDays", v)} placeholder="No limit" /> : null}
            {/* POC: Minimum Balance after Request and Hourly Leave (+ Minimum hours) hidden — values preserved. */}
            <Box sx={objFullCellSx}>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                <SectionSwitch label="Allow Backdated Requests" value={objPolicy.blnBackdatedApplicationAllowed} onChange={(v) => { setPolicy("blnBackdatedApplicationAllowed", v); if (!v) setPolicy("intMaxBackdateDays", 0); }} />
                <SectionSwitch label="Allow Future-Dated Requests" value={objPolicy.blnFutureApplicationAllowed} onChange={(v) => { setPolicy("blnFutureApplicationAllowed", v); if (!v) setPolicy("intMaxAdvanceDays", null); }} />
                <SectionSwitch label="Available During Probation" value={objPolicy.blnAllowDuringProbation} onChange={(v) => setPolicy("blnAllowDuringProbation", v)} />
                <SectionSwitch label="Available During Notice Period" value={objPolicy.blnAllowDuringNoticePeriod} onChange={(v) => setPolicy("blnAllowDuringNoticePeriod", v)} />
              </Stack>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* E. Sandwich Rule */}
      <Paper sx={objSectionSx}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>Sandwich Rule</Typography>
        <Box>
          <Box sx={objGridSx}>
            {/* Simplified POC controls. The weekly/holiday treatment codes, boundary (BOTH_SIDES) and
                cross-type flag are derived from these two inputs — see applyScopeDerivation.
                POC: Weekly-off/Holiday treatment, Sandwich boundary and Apply-across hidden; values preserved. */}
            <Box><SectionSwitch label="Enable Sandwich Leave" value={objPolicy.blnSandwichRuleEnabled} onChange={setSandwichEnabled} /></Box>
            {objPolicy.blnSandwichRuleEnabled ? (
              <>
                <SectionSelect label="Apply Sandwich On" value={objPolicy.strSandwichScopeCode} onChange={setApplySandwichOn} options={[{ code: "WEEKLY_OFF", label: "Weekly Off" }, { code: "HOLIDAY", label: "Holiday" }, { code: "WEEKLY_OFF_AND_HOLIDAY", label: "Weekly Off & Holiday" }]} />
                <Box sx={objFullCellSx}><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>Example: Fri + Mon leave with Sat/Sun off &mdash; the enclosed weekend is counted as leave.</Typography></Box>
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
            <SectionSelect label="Backup Resource Requirement" value={objPolicy.strBackupResourceRuleCode} onChange={(v) => setPolicy("strBackupResourceRuleCode", v)} options={[{ code: "NOT_REQUIRED", label: "Not Required" }, { code: "OPTIONAL", label: "Optional" }, { code: "MANDATORY", label: "Required" }]} />
            {/* POC: workflow-level No-action auto behaviour + After days hidden — the step-level "If No Action"
                rule below is the single authoritative control. Values preserved in the payload. */}
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
                {/* Top-aligned: the Employee field carries helper text, and centering would lift its
                    input above the rest of the row. */}
                <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
                  <TextField label="Step" type="number" size="small" value={objStep.intStepNo} onChange={(e) => updateStep(intIndex, { intStepNo: Number(e.target.value) || 1 })} sx={{ width: 80 }} {...objInputProps} />
                  <TextField
                    label="Approver"
                    select
                    size="small"
                    value={objStep.strApproverSourceCode}
                    // Switching away from "Specific User" drops the employee so a stale id is never saved.
                    onChange={(e) => updateStep(intIndex, { strApproverSourceCode: e.target.value, intFixedEmployeeID: e.target.value === strFixedEmployeeSource ? objStep.intFixedEmployeeID ?? null : null })}
                    sx={{ width: 200 }}
                    {...objInputProps}
                  >
                    {/* POC approvers: Reporting Manager, Line Manager, HR, Specific User. Fixed Role is
                        advanced-only; a legacy stored value is re-added so it displays and round-trips. */}
                    {optsWithCurrent(lstPocApproverSources, objStep.strApproverSourceCode).map((o) => <MenuItem key={o.code} value={o.code}>{o.label}</MenuItem>)}
                  </TextField>
                  {objStep.strApproverSourceCode === strFixedEmployeeSource ? (
                    <TextField
                      label="Employee"
                      select
                      size="small"
                      value={lstEmployeeOptions.some((objEmployee) => objEmployee.intID === objStep.intFixedEmployeeID) ? String(objStep.intFixedEmployeeID) : ""}
                      onChange={(e) => updateStep(intIndex, { intFixedEmployeeID: Number(e.target.value) || null })}
                      error={!objStep.intFixedEmployeeID}
                      helperText={!objStep.intFixedEmployeeID ? "Select the approving employee." : undefined}
                      sx={{ width: 260 }}
                      {...objInputProps}
                    >
                      <MenuItem value="">{blnEmployeesLoading ? "Loading employees..." : "Select Employee"}</MenuItem>
                      {lstEmployeeOptions.map((objEmployee) => (
                        <MenuItem key={objEmployee.intID} value={String(objEmployee.intID)}>{objEmployee.strEmployeeCode} - {objEmployee.strFullName}</MenuItem>
                      ))}
                    </TextField>
                  ) : null}
                  <TextField label="Action Due Within (Days)" type="number" size="small" value={objStep.intNoActionAfterDays ?? ""} onChange={(e) => updateStep(intIndex, { intNoActionAfterDays: toNum(e.target.value) })} sx={{ width: 170 }} {...objInputProps} />
                  <TextField label="If No Action" select size="small" value={objStep.strNoActionRuleCode} onChange={(e) => updateStep(intIndex, { strNoActionRuleCode: e.target.value })} sx={{ width: 200 }} {...objInputProps}>
                    {optsWithCurrent(lstPocNoActionRules, objStep.strNoActionRuleCode).map((o) => <MenuItem key={o.code} value={o.code}>{o.label}</MenuItem>)}
                  </TextField>
                  {/* POC: Action Required hidden — active steps are treated as action-required by default. */}
                  {!blnReadOnly ? <IconButton size="small" color="error" onClick={() => removeStep(intIndex)} sx={{ mt: 0.5 }}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : null}
                </Stack>
              </Box>
            ))}
            {/* POC caps standard routing at 2 steps. */}
            {!blnReadOnly ? <Box sx={objFullCellSx}><Button size="small" startIcon={<AddRoundedIcon />} onClick={addStep} disabled={objForm.lstApprovalSteps.length >= 2}>Add step</Button></Box> : null}
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
              {/* Usage is summarised by policy count only; the other counters and the in-use
                  delete-block hint were dropped as noise for the person editing the type. */}
              <Chip label={`Policies: ${objForm.objUsage.intPolicies}`} />
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
