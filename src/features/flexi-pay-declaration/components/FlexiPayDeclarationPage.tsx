"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DirectionsCarFilledRoundedIcon from "@mui/icons-material/DirectionsCarFilledRounded";
import FamilyRestroomRoundedIcon from "@mui/icons-material/FamilyRestroomRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LunchDiningRoundedIcon from "@mui/icons-material/LunchDiningRounded";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  buildEmployeeSalaryFixedRows,
  calculateEmployeeSalaryBaseSummaryMetrics,
} from "@/features/employee-salary/utils/employeeSalarySummary";
import {
  flexiPayDeclarationService,
  hrFlexiDeclarationReviewService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
  type FlexiEligibilityQuestionRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { useFlexiPayDeclarationLabels } from "@/features/flexi-pay-declaration/hooks/useFlexiPayDeclarationLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type DraftInputMap = Record<number, string>;
type EligibilityAnswerMap = Record<string, string | number | boolean | null>;
type ComponentSelectionMap = Record<number, number>;
type LinkedQuestionSelectionMap = Record<number, string>;
const intEligibilityPreviewLimit = 6;
const lstEmployeeSalaryModuleCodes = ["EMPLOYEE_SALARY", "EMPLOYEE-SALARY", "EMPLOYEE_SALARIES"];
const objHeaderActionButtonSx = {
  color: "#ffffff",
  borderColor: "rgba(255,255,255,0.72)",
  "&:hover": {
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  "&.Mui-disabled": {
    color: "rgba(255,255,255,0.45)",
    borderColor: "rgba(255,255,255,0.2)",
  },
} as const;

function getCurrentFinancialYearCode() {
  const objNow = new Date();
  const intYear = objNow.getFullYear();
  const intMonth = objNow.getMonth();
  const intFyStartYear = intMonth >= 3 ? intYear : intYear - 1;
  return `${intFyStartYear}-${String(intFyStartYear + 1).slice(-2)}`;
}

function formatCurrency(decValue: number | null | undefined, strCurrencyCode = "INR") {
  if (decValue == null || !Number.isFinite(decValue)) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: strCurrencyCode,
    maximumFractionDigits: 0,
  }).format(decValue);
}

function formatDate(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

function normalizeText(strValue?: string | null) {
  return String(strValue || "").trim().toLowerCase();
}

function normalizeToken(strValue?: string | null) {
  return normalizeText(strValue).replace(/[\s_-]+/g, "");
}

function normalizeAmount(strValue: string) {
  const decValue = Number(strValue);
  if (!Number.isFinite(decValue) || decValue < 0) return 0;
  return decValue;
}

function formatStatus(strStatus?: string | null) {
  return String(strStatus || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function formatApplicableRegime(strApplicableRegime?: string | null) {
  const strValue = normalizeText(strApplicableRegime).replace(/[-_]+/g, " ");
  if (strValue.includes("new")) return "New Regime";
  if (strValue.includes("both") || strValue === "all" || strValue === "all regimes") return "Both Regimes";
  return "Old Regime";
}

function getRegimeChipColor(strApplicableRegime?: string | null): "default" | "info" | "success" | "warning" {
  const strValue = normalizeText(strApplicableRegime).replace(/[-_]+/g, " ");
  if (strValue.includes("new")) return "warning";
  if (strValue.includes("old")) return "info";
  if (strValue.includes("both") || strValue === "all" || strValue === "all regimes") return "success";
  return "default";
}

function getSelectedTaxRegimeLabel(objContext: FlexiDeclarationContextRecord | null) {
  const strLabel =
    objContext?.objSelectedTaxRegime?.strTaxRegimeLabel
    || objContext?.objSelectedTaxRegime?.strTaxRegimeName
    || objContext?.strSelectedTaxRegime
    || objContext?.strTaxRegime
    || "";
  const strNormalized = normalizeText(strLabel).replace(/[-_]+/g, " ");
  if (!strNormalized) return "Not selected";
  if (strNormalized.includes("new")) return "New Regime";
  if (strNormalized.includes("old")) return "Old Regime";
  if (strNormalized.includes("both") || strNormalized === "all" || strNormalized === "all regimes") return "Both Regimes";
  return strLabel.replace(/[-_]+/g, " ").trim();
}

function getEligibilityState(objRow: FlexiDeclarationLineRecord) {
  const blnNeedsDetails = objRow.blnEligibilityDetailsSatisfied === false || Boolean(objRow.strEligibilityDetailsReason);
  if (objRow.blnRegimeEligible === false) {
    return "not_eligible";
  }
  if (blnNeedsDetails) {
    return "needs_details";
  }
  if (objRow.blnEligible === false) {
    return "not_eligible";
  }
  if (!(objRow.lstEligibilityRules || []).length) {
    return "eligible_by_default";
  }
  return "eligible";
}

function getEligibilityChipConfig(objRow: FlexiDeclarationLineRecord): {
  strLabel: string;
  strColor: "default" | "success" | "warning" | "error";
} {
  const strEligibilityState = getEligibilityState(objRow);
  if (strEligibilityState === "eligible_by_default") {
    return { strLabel: "Eligible by default", strColor: "success" };
  }
  if (strEligibilityState === "eligible") {
    return { strLabel: "Eligible", strColor: "success" };
  }
  if (strEligibilityState === "not_eligible") {
    return { strLabel: "Not Eligible", strColor: "error" };
  }
  return { strLabel: "Needs Details", strColor: "warning" };
}

function getLineReasonText(objRow: FlexiDeclarationLineRecord) {
  const decDeclaredAnnual = Number(objRow.decDraftDeclaredAnnual ?? objRow.decAllocationAnnual ?? 0);
  const decAnnualCap = Number(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? 0);
  const strItemStatus = normalizeText(objRow.strDeclarationItemStatus);
  if (objRow.blnRegimeEligible === false) {
    return objRow.strRegimeEligibilityReason || objRow.strEligibilityReason || "Component is not eligible for the selected IT regime.";
  }
  if (objRow.strEligibilityDetailsReason) {
    return objRow.strEligibilityDetailsReason;
  }
  if (decAnnualCap <= 0) {
    return "No entitlement configured.";
  }
  if (["approved", "locked"].includes(strItemStatus) && decDeclaredAnnual > 0) {
    return "Approved / Locked";
  }
  if (strItemStatus === "submitted" && decDeclaredAnnual > 0) {
    return "Submitted via ESS";
  }
  if (decDeclaredAnnual <= 0) {
    return "Not declared";
  }
  if (!(objRow.lstEligibilityRules || []).length) {
    return "Eligible by default";
  }
  return objRow.strEligibilityReason || "Eligible by default";
}

function getComponentRegimeDisplayLabel(objRow: FlexiDeclarationLineRecord) {
  return (
    objRow.strEligibilityApplicableRegimeLabel
    || objRow.strComponentApplicableRegimeLabel
    || formatApplicableRegime(objRow.strEligibilityApplicableRegime || objRow.strComponentApplicableRegime)
  );
}

function getStatusTone(strStatus?: string | null): "default" | "success" | "warning" | "error" {
  const strValue = normalizeText(strStatus);
  if (["approved", "locked"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned", "cancelled"].includes(strValue)) return "error";
  return "default";
}

function buildFallbackContext(strFinancialYearCode: string): FlexiDeclarationContextRecord {
  return {
    strFinancialYearCode,
    blnCanDeclare: false,
    strIneligibilityReason: "Flexi declaration details are taking longer than expected. Please try again after the backend responds.",
    objDeclaration: null,
    objEmployeeSummary: null,
    objAssignedStructure: null,
    objCurrentSalarySnapshot: null,
    objFlexiAllocation: {
      blnHasFlexiBasket: false,
      decFlexiBasketAvailableAnnual: 0,
      decResidualTaxableAllowanceAnnual: 0,
      strResidualComponentName: null,
      lstAvailableComponents: [],
    },
    lstComponentLines: [],
    lstEligibilityQuestions: [],
    objEligibilityAnswers: {},
    lstDeclarationLines: [],
    salary_impact_summary: null,
    validation_messages: [],
    history_count: 0,
    declaration_status: "draft",
    blnHasHiddenComponents: false,
  };
}

function waitForNextPaint() {
  return new Promise<void>((fnResolve) => {
    window.requestAnimationFrame(() => fnResolve());
  });
}

function buildInitialDraftInputs(objContext: FlexiDeclarationContextRecord) {
  const strWorkflowStatus = normalizeText(objContext.objDeclaration?.strWorkflowStatus ?? objContext.declaration_status ?? "draft");
  return (objContext.lstDeclarationLines || []).reduce<DraftInputMap>((dicAcc, objLine) => {
    const decInitialAnnual = ["approved", "locked"].includes(strWorkflowStatus)
      ? Number(objLine.decDraftApprovedAnnual ?? objLine.decAllocationAnnual ?? objLine.decDraftDeclaredAnnual ?? 0)
      : Number(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? objLine.decDraftApprovedAnnual ?? 0);
    dicAcc[objLine.intSalaryComponentID] = String(decInitialAnnual);
    return dicAcc;
  }, {});
}

function buildAnswerMap(objContext: FlexiDeclarationContextRecord) {
  return { ...(objContext.objEligibilityAnswers || {}) };
}

function buildStateSignature(dicDraftInputs: DraftInputMap, dicEligibilityAnswers: EligibilityAnswerMap, strRemarks: string) {
  const lstDraftEntries = Object.entries(dicDraftInputs).sort(([a], [b]) => Number(a) - Number(b));
  const lstAnswerEntries = Object.entries(dicEligibilityAnswers).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({
    lstDraftEntries,
    lstAnswerEntries,
    strRemarks: strRemarks.trim(),
  });
}

const OBJ_ELIGIBILITY_FIELD_SX = {
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#7dd3fc" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#38bdf8" },
  "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#0ea5e9" },
};

function hasAnyEligibilityAnswers(dicEligibilityAnswers: EligibilityAnswerMap) {
  return Object.values(dicEligibilityAnswers).some((objValue) => {
    if (objValue == null) return false;
    if (typeof objValue === "string") return objValue.trim().length > 0;
    return true;
  });
}

function getQuestionIcon(strGroupCode?: string | null, strColor = "#0f4c81") {
  const strCode = normalizeText(strGroupCode);
  if (strCode.includes("vehicle")) return <DirectionsCarFilledRoundedIcon sx={{ color: strColor, fontSize: 18 }} />;
  if (strCode.includes("family")) return <FamilyRestroomRoundedIcon sx={{ color: strColor, fontSize: 18 }} />;
  if (strCode.includes("meal")) return <LunchDiningRoundedIcon sx={{ color: strColor, fontSize: 18 }} />;
  return <QuizOutlinedIcon sx={{ color: strColor, fontSize: 18 }} />;
}

const LST_GROUP_ACCENT_PALETTE = [
  { strAccent: "#2563eb", strTint: "#eff6ff" },
  { strAccent: "#0d9488", strTint: "#f0fdfa" },
  { strAccent: "#d97706", strTint: "#fffbeb" },
  { strAccent: "#db2777", strTint: "#fdf2f8" },
  { strAccent: "#7c3aed", strTint: "#f5f3ff" },
];

function normalizeSelectOptions(objOptionJson: unknown) {
  if (!Array.isArray(objOptionJson)) return [];
  return objOptionJson
    .map((objOption) => {
      if (typeof objOption === "string") {
        return { strValue: objOption, strLabel: objOption };
      }
      if (objOption && typeof objOption === "object") {
        const strValue = String((objOption as Record<string, unknown>).value ?? (objOption as Record<string, unknown>).code ?? "");
        const strLabel = String((objOption as Record<string, unknown>).label ?? (objOption as Record<string, unknown>).name ?? strValue);
        if (!strValue) return null;
        return { strValue, strLabel };
      }
      return null;
    })
    .filter((objOption): objOption is { strValue: string; strLabel: string } => Boolean(objOption));
}

function buildQuestionFromRule(objRule: Record<string, unknown>): FlexiEligibilityQuestionRecord | null {
  const strQuestionCode = String(objRule.strQuestionCode ?? objRule.question_code ?? "").trim();
  if (!strQuestionCode) return null;
  return {
    strQuestionCode,
    strQuestionLabel: String(objRule.strQuestionLabel ?? objRule.question_label ?? objRule.default_label ?? strQuestionCode),
    strAnswerType: String(objRule.strAnswerType ?? objRule.answer_type ?? "text") as FlexiEligibilityQuestionRecord["strAnswerType"],
    strHelpText: String(objRule.strHelpText ?? objRule.help_text ?? objRule.default_help_text ?? "").trim() || null,
    strGroupCode: String(objRule.strGroupCode ?? objRule.str_group_code ?? "").trim() || null,
    strGroupLabel: String(objRule.strGroupLabel ?? objRule.str_group_label ?? "").trim() || null,
    strValueUnit: String(objRule.strValueUnit ?? objRule.value_unit ?? "").trim() || null,
    decMinValue: objRule.question_min_value == null ? null : Number(objRule.question_min_value),
    decMaxValue: objRule.question_max_value == null ? null : Number(objRule.question_max_value),
    blnIsRequired: Boolean(objRule.is_required ?? objRule.blnIsRequired ?? false),
    blnIsEmployeeEditable: Boolean(objRule.is_employee_editable ?? objRule.blnIsEmployeeEditable ?? true),
    blnIsDisabled: Boolean(objRule.blnIsDisabled ?? false),
    blnShowInfoIcon: Boolean(objRule.blnShowInfoIcon ?? false),
    strDisabledReason: String(objRule.strDisabledReason ?? "").trim() || null,
    strInfoMessage: String(objRule.strInfoMessage ?? "").trim() || null,
    strApplicableRegime: String(objRule.strApplicableRegime ?? "").trim() || null,
    objOptionJson: objRule.option_json ?? objRule.objOptionJson,
    objAnswerValue: null,
  };
}

function getLinkedQuestionsForRow(objRow: FlexiDeclarationLineRecord) {
  const dicQuestionByCode = new Map<string, FlexiEligibilityQuestionRecord>();
  for (const objRule of objRow.lstEligibilityRules || []) {
    if (!objRule || typeof objRule !== "object") continue;
    const objQuestion = buildQuestionFromRule(objRule as Record<string, unknown>);
    if (objQuestion && !dicQuestionByCode.has(objQuestion.strQuestionCode)) {
      dicQuestionByCode.set(objQuestion.strQuestionCode, objQuestion);
    }
  }
  return Array.from(dicQuestionByCode.values());
}

function getRuleEvaluationByQuestionCode(objRow: FlexiDeclarationLineRecord, strQuestionCode: string) {
  for (const objEvaluation of objRow.lstRuleEvaluations || []) {
    if (!objEvaluation || typeof objEvaluation !== "object") continue;
    const dicEvaluation = objEvaluation as Record<string, unknown>;
    const strCurrentCode = String(dicEvaluation.strQuestionCode ?? dicEvaluation.question_code ?? "").trim();
    if (strCurrentCode === strQuestionCode) {
      return {
        blnPassed: Boolean(dicEvaluation.blnPassed ?? dicEvaluation.bln_passed ?? false),
        strFailureMessage: String(dicEvaluation.strFailureMessage ?? dicEvaluation.failure_message ?? "").trim() || null,
      };
    }
  }
  return null;
}

function getRowEffectiveMultiplier(objRow: FlexiDeclarationLineRecord) {
  const decMultiplier = Number(objRow.decEffectiveMultiplier ?? 1);
  return Number.isFinite(decMultiplier) && decMultiplier > 0 ? decMultiplier : 1;
}

function getDisplayedDeclarationAmount(objRow: FlexiDeclarationLineRecord, strStoredValue: string | undefined) {
  const decStoredAnnual = normalizeAmount(strStoredValue ?? String(objRow.decDraftDeclaredAnnual ?? objRow.decAllocationAnnual ?? 0));
  return String(decStoredAnnual);
}

function isSelectableDeclarationComponent(objRow: Pick<FlexiDeclarationLineRecord, "strComponentCode" | "strComponentName">) {
  const strCode = normalizeText(objRow.strComponentCode);
  const strName = normalizeText(objRow.strComponentName);
  return strCode !== "flexipay" && strCode !== "flexi_pay" && strName !== "flexi pay";
}

function buildInitialComponentSelections(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<ComponentSelectionMap>((dicAcc, objLine) => {
    if (!isSelectableDeclarationComponent(objLine)) return dicAcc;
    dicAcc[objLine.intSalaryComponentID] = objLine.intSalaryComponentID;
    return dicAcc;
  }, {});
}

function buildInitialQuestionSelections(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<LinkedQuestionSelectionMap>((dicAcc, objLine) => {
    if (!isSelectableDeclarationComponent(objLine)) return dicAcc;
    dicAcc[objLine.intSalaryComponentID] = getLinkedQuestionsForRow(objLine)[0]?.strQuestionCode ?? "";
    return dicAcc;
  }, {});
}

type EvaluatedLineRecord = FlexiDeclarationLineRecord & {
  decInputAnnual: number;
  decDisplayMonthly: number;
  strValidationMessage?: string;
};

type DisplayedLineRecord = {
  intRowKey: number;
  objBaseLine: EvaluatedLineRecord;
  objSelectedLine: EvaluatedLineRecord;
  lstLinkedQuestions: FlexiEligibilityQuestionRecord[];
  strSelectedQuestionCode: string;
  objSelectedQuestion: FlexiEligibilityQuestionRecord | null;
  strDisplayedAmount: string;
  decMultiplier: number;
};

const lstEssEditableWorkflowStatuses = ["draft", "returned", "released", "rejected"];
const lstEssResubmittableWorkflowStatuses = ["returned", "released", "rejected"];

export default function FlexiPayDeclarationPage() {
  const objParams = useParams<{ intDeclarationID?: string | string[] }>();
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const { t } = useFlexiPayDeclarationLabels();
  const { canDoAny } = useModuleActionAccess(lstEmployeeSalaryModuleCodes);
  const strFinancialYearCode = getCurrentFinancialYearCode();
  const strParamDeclarationID = Array.isArray(objParams?.intDeclarationID) ? objParams.intDeclarationID[0] : objParams?.intDeclarationID;
  const intRouteDeclarationID = Number(objSearchParams.get("intDeclarationID") || strParamDeclarationID || 0);
  const blnRouteHasDeclarationID = Number.isInteger(intRouteDeclarationID) && intRouteDeclarationID > 0;
  const blnReviewEntryMode = blnRouteHasDeclarationID;
  const strSource = (objSearchParams.get("source") || "").trim().toLowerCase();
  const blnEmployeeSalarySource = strSource === "employee_salary";
  const strReturnTo = (objSearchParams.get("returnTo") || "").trim();
  const strBackPath = strReturnTo.startsWith("/") && !strReturnTo.startsWith("//")
    ? strReturnTo
    : (blnReviewEntryMode ? "/payroll/flexi-declaration-review" : "/salary/flexi-pay-declarations");
  const intLoadSequenceRef = useRef(0);
  const intEvaluateSequenceRef = useRef(0);
  const strLastSyncedSignatureRef = useRef("");
  const strLastAutoSavedSignatureRef = useRef("");
  const strLastEvaluatedSignatureRef = useRef("");

  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnEvaluating, setBlnEvaluating] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strSavingLabel, setStrSavingLabel] = useState("Processing declaration...");
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(() => buildFallbackContext(strFinancialYearCode));
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>(() => buildInitialDraftInputs(buildFallbackContext(strFinancialYearCode)));
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<EligibilityAnswerMap>({});
  const [dicSelectedComponents, setDicSelectedComponents] = useState<ComponentSelectionMap>({});
  const [dicSelectedQuestions, setDicSelectedQuestions] = useState<LinkedQuestionSelectionMap>({});
  const [blnEligibilityDialogOpen, setBlnEligibilityDialogOpen] = useState(false);
  const [blnSubmitDialogOpen, setBlnSubmitDialogOpen] = useState(false);
  const [strReviewActionMode, setStrReviewActionMode] = useState<"reject" | null>(null);
  const [blnShowReviewReadOnlyNotice, setBlnShowReviewReadOnlyNotice] = useState(true);
  const [blnShowReviewActionNotice, setBlnShowReviewActionNotice] = useState(true);
  const strActiveFinancialYearCode = objContext?.strFinancialYearCode || strFinancialYearCode;

  const syncLocalStateFromContext = useCallback((objData: FlexiDeclarationContextRecord, strMessage?: string) => {
    setObjContext(objData);
    const dicNextDraftInputs = buildInitialDraftInputs(objData);
    const dicNextAnswers = buildAnswerMap(objData);
    const dicNextSelectedComponents = buildInitialComponentSelections(objData);
    const dicNextSelectedQuestions = buildInitialQuestionSelections(objData);
    const strNextRemarks = objData.objDeclaration?.strRemarks || "";
    setDicDraftInputs(dicNextDraftInputs);
    setDicEligibilityAnswers(dicNextAnswers);
    setDicSelectedComponents(dicNextSelectedComponents);
    setDicSelectedQuestions(dicNextSelectedQuestions);
    setStrRemarks(strNextRemarks);
    const strSignature = buildStateSignature(dicNextDraftInputs, dicNextAnswers, strNextRemarks);
    strLastSyncedSignatureRef.current = strSignature;
    strLastAutoSavedSignatureRef.current = strSignature;
    strLastEvaluatedSignatureRef.current = strSignature;
    if (strMessage) {
      setStrToast(strMessage);
    }
  }, []);

  const loadContext = useCallback(async () => {
    const intLoadSequence = ++intLoadSequenceRef.current;
    setBlnLoading(true);
    setStrError("");
    try {
      const objData = blnRouteHasDeclarationID
        ? await hrFlexiDeclarationReviewService.getDetail(intRouteDeclarationID)
        : await flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode);
      if (intLoadSequenceRef.current !== intLoadSequence) return;
      syncLocalStateFromContext(objData);
    } catch (objError) {
      if (intLoadSequenceRef.current !== intLoadSequence) return;
      setObjContext(buildFallbackContext(strFinancialYearCode));
      setStrError(objError instanceof Error ? objError.message : "Unable to load flexi declaration.");
    } finally {
      if (intLoadSequenceRef.current === intLoadSequence) {
        setBlnLoading(false);
      }
    }
  }, [blnRouteHasDeclarationID, intRouteDeclarationID, strFinancialYearCode, syncLocalStateFromContext]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || objContext?.declaration_status || "draft";
  const strNormalizedWorkflowStatus = normalizeText(strWorkflowStatus);
  const blnCanEditDeclaration = Boolean(
    !blnReviewEntryMode &&
    lstEssEditableWorkflowStatuses.includes(strNormalizedWorkflowStatus) &&
    objContext?.blnCanDeclare
  );
  const blnShowEssDraftAction = Boolean(
    !blnReviewEntryMode &&
    lstEssEditableWorkflowStatuses.includes(strNormalizedWorkflowStatus) &&
    objContext?.blnCanDeclare
  );
  const blnShowEssSubmitAction = blnShowEssDraftAction;
  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";
  const strSelectedTaxRegimeLabel = getSelectedTaxRegimeLabel(objContext);
  const blnCanApproveAction = canDoAny("approve");
  const blnCanRejectAction = canDoAny("reject") || blnCanApproveAction;
  const blnCanLockAction = canDoAny("lock") || blnCanApproveAction;
  const blnCanReleaseAction = canDoAny("release") || canDoAny("unlock") || blnCanApproveAction;
  const blnShowWorkflowActions = blnReviewEntryMode;
  const blnCanApproveCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanApproveAction;
  const blnCanRejectCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanRejectAction;
  const blnCanLockCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanLockAction;
  const blnCanReleaseCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanReleaseAction;
  const strPageModeLabel = blnReviewEntryMode ? "Approval Review" : "ESS Declaration";

  const lstRows = useMemo<EvaluatedLineRecord[]>(() => {
    return (objContext?.lstDeclarationLines || []).map((objLine) => {
      const decInputAnnual = normalizeAmount(
        dicDraftInputs[objLine.intSalaryComponentID] ?? String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0),
      );
      const decEffectiveAnnualCap = Number(objLine.decEffectiveAnnualCap ?? objLine.decAnnualLimit ?? 0);
      const strEligibilityState = getEligibilityState(objLine);
      let strValidationMessage = "";
      if (strEligibilityState === "needs_details" && decInputAnnual > 0) {
        strValidationMessage = `${objLine.strEligibilityDetailsReason || "Required eligibility details are missing."} Use delete to clear the amount.`;
      } else if (strEligibilityState === "not_eligible" && decInputAnnual > 0) {
        strValidationMessage = `${objLine.strEligibilityReason || objLine.strRegimeEligibilityReason || "This component is not eligible."} Use delete to clear the amount.`;
      } else if (decEffectiveAnnualCap > 0 && decInputAnnual > decEffectiveAnnualCap) {
        strValidationMessage = `Declared amount ${formatCurrency(decInputAnnual, strCurrencyCode)} exceeds annual cap ${formatCurrency(decEffectiveAnnualCap, strCurrencyCode)}.`;
      }
      return {
        ...objLine,
        decInputAnnual,
        decDisplayMonthly: decInputAnnual / 12,
        strValidationMessage,
      };
    });
  }, [dicDraftInputs, objContext?.lstDeclarationLines, strCurrencyCode]);

  const lstSelectableRows = useMemo(
    () => lstRows.filter((objRow) => isSelectableDeclarationComponent(objRow)),
    [lstRows],
  );

  const dicSelectableRowByID = useMemo(
    () => new Map(lstSelectableRows.map((objRow) => [objRow.intSalaryComponentID, objRow])),
    [lstSelectableRows],
  );

  const dicEligibilityQuestionByCode = useMemo(
    () => new Map((objContext?.lstEligibilityQuestions || []).map((objQuestion) => [objQuestion.strQuestionCode, objQuestion])),
    [objContext?.lstEligibilityQuestions],
  );

  const lstDisplayedRows = useMemo<DisplayedLineRecord[]>(() => {
    return lstSelectableRows.map((objBaseLine) => {
      const intRowKey = objBaseLine.intSalaryComponentID;
      const intSelectedComponentID = dicSelectedComponents[intRowKey] ?? intRowKey;
      const objSelectedLine = dicSelectableRowByID.get(intSelectedComponentID) ?? objBaseLine;
      const lstQuestionOptions = getLinkedQuestionsForRow(objSelectedLine).map(
        (objQuestion) => dicEligibilityQuestionByCode.get(objQuestion.strQuestionCode) ?? objQuestion,
      );
      const strStoredQuestionCode = dicSelectedQuestions[intRowKey] ?? "";
      const strSelectedQuestionCode = lstQuestionOptions.some((objQuestion) => objQuestion.strQuestionCode === strStoredQuestionCode)
        ? strStoredQuestionCode
        : (lstQuestionOptions[0]?.strQuestionCode ?? "");
      return {
        intRowKey,
        objBaseLine,
        objSelectedLine,
        lstLinkedQuestions: lstQuestionOptions,
        strSelectedQuestionCode,
        objSelectedQuestion: lstQuestionOptions.find((objQuestion) => objQuestion.strQuestionCode === strSelectedQuestionCode) ?? null,
        strDisplayedAmount: getDisplayedDeclarationAmount(objSelectedLine, dicDraftInputs[objSelectedLine.intSalaryComponentID]),
        decMultiplier: getRowEffectiveMultiplier(objSelectedLine),
      };
    }).filter((objRow) => {
      const decAnnualCap = Number(objRow.objSelectedLine.decEffectiveAnnualCap ?? objRow.objSelectedLine.decAnnualLimit ?? 0);
      const decDeclaredAnnual = Number(objRow.objSelectedLine.decInputAnnual ?? 0);
      return decAnnualCap > 0 || decDeclaredAnnual > 0;
    });
  }, [dicDraftInputs, dicEligibilityQuestionByCode, dicSelectedComponents, dicSelectedQuestions, dicSelectableRowByID, lstSelectableRows]);

  const setSelectedComponentIDs = useMemo(
    () => new Set(lstDisplayedRows.map((objRow) => objRow.objSelectedLine.intSalaryComponentID)),
    [lstDisplayedRows],
  );

  // Keep ESS and approval figures aligned with the same salary breakdown rules used on Employee Salary.
  const dicBaseSummaryMetrics = useMemo(
    () => calculateEmployeeSalaryBaseSummaryMetrics({
      lstComponentLines: objContext?.lstComponentLines as Array<{
        strComponentCode?: string | null;
        strComponentName?: string | null;
        strComponentCategory?: string | null;
        blnIsFlexiBenefit?: boolean;
        blnIsFlexiBasket?: boolean;
        blnIncludedInCtc?: boolean;
        decAmountMonthly?: number | null;
        decAmountAnnual?: number | null;
      }> | undefined,
      objCurrentSalarySnapshot: objContext?.objCurrentSalarySnapshot ?? null,
      objFlexiAllocation: objContext?.objFlexiAllocation ?? null,
    }),
    [objContext?.lstComponentLines, objContext?.objCurrentSalarySnapshot, objContext?.objFlexiAllocation],
  );
  const decBasketAnnual = dicBaseSummaryMetrics.decFlexiBucketAnnual;
  const decDeclaredAnnual = Number(
    lstDisplayedRows.reduce((decTotal, objRow) => decTotal + objRow.objSelectedLine.decInputAnnual, 0),
  );
  const decDeclaredMonthly = decDeclaredAnnual / 12;
  const decResidualAnnual = Math.max(decBasketAnnual - decDeclaredAnnual, 0);
  const decResidualMonthly = decResidualAnnual / 12;
  const decAnnualCtc = dicBaseSummaryMetrics.decAnnualCtc;
  const decGrossMonthly = dicBaseSummaryMetrics.decGrossMonthly;
  const intEligibleFlexiComponentCount = lstDisplayedRows.filter((objRow) => {
    const strEligibilityState = getEligibilityState(objRow.objSelectedLine);
    return strEligibilityState === "eligible" || strEligibilityState === "eligible_by_default";
  }).length;
  const blnAllocationExceeded = decDeclaredAnnual > decBasketAnnual;
  const blnHasRowValidationErrors = lstDisplayedRows.some((objRow) => Boolean(objRow.objSelectedLine.strValidationMessage));
  const intDeclaredAnnualColumnWidth = blnHasRowValidationErrors ? 236 : 116;
  const intDeclaredAnnualFieldWidth = blnHasRowValidationErrors ? 218 : 104;
  const intFlexiComponentTableMinWidth = 982 + intDeclaredAnnualColumnWidth;
  const blnHasEligibilityAnswerValues = hasAnyEligibilityAnswers(dicEligibilityAnswers);
  const lstValidationMessages = objContext?.validation_messages || [];
  const strResidualComponentName = dicBaseSummaryMetrics.strResidualComponentName;
  const lstFixedSalaryRows = useMemo(
    () => buildEmployeeSalaryFixedRows(dicBaseSummaryMetrics, decResidualAnnual),
    [decResidualAnnual, dicBaseSummaryMetrics],
  );

  const strCurrentSignature = useMemo(
    () => buildStateSignature(dicDraftInputs, dicEligibilityAnswers, strRemarks),
    [dicDraftInputs, dicEligibilityAnswers, strRemarks],
  );

  const lstPayloadRows = useMemo(() => {
    const dicRows = new Map();
    lstDisplayedRows.forEach((objDisplayRow) => {
      const objRow = objDisplayRow.objSelectedLine;
      if (objRow.decInputAnnual <= 0) return;
      dicRows.set(objRow.intSalaryComponentID, {
        intSalaryComponentID: objRow.intSalaryComponentID,
        decDeclaredAmountAnnual: objRow.decInputAnnual,
        strRemarks: objRow.strDeclarationItemRemarks || null,
      });
    });
    return Array.from(dicRows.values());
  }, [lstDisplayedRows]);

  const blnCanSaveDraft = Boolean(
    blnShowEssDraftAction
    && !blnSaving
    && !blnEvaluating
    && !blnAllocationExceeded
    && !blnHasRowValidationErrors
    && (lstPayloadRows.length > 0 || blnHasEligibilityAnswerValues || strRemarks.trim().length > 0),
  );
  const blnCanSubmit = Boolean(
    blnShowEssSubmitAction
    && !blnSaving
    && !blnEvaluating
    && !blnAllocationExceeded
    && !blnHasRowValidationErrors
    && lstPayloadRows.length > 0,
  );

  const dicQuestionGroups = useMemo(() => {
    return (objContext?.lstEligibilityQuestions || []).reduce<Record<string, { strGroupLabel: string; lstQuestions: FlexiEligibilityQuestionRecord[] }>>(
      (dicAcc, objQuestion) => {
        const strGroupCode = objQuestion.strGroupCode || "other_eligibility";
        const strGroupLabel = objQuestion.strGroupLabel || "Other Eligibility";
        if (!dicAcc[strGroupCode]) {
          dicAcc[strGroupCode] = { strGroupLabel, lstQuestions: [] };
        }
        dicAcc[strGroupCode].lstQuestions.push(objQuestion);
        return dicAcc;
      },
      {},
    );
  }, [objContext?.lstEligibilityQuestions]);

  const lstAllEligibilityQuestions = useMemo(
    () => Object.values(dicQuestionGroups).flatMap((objGroup) => objGroup.lstQuestions),
    [dicQuestionGroups],
  );

  const dicPreviewQuestionGroups = useMemo(() => {
    return lstAllEligibilityQuestions
      .slice(0, intEligibilityPreviewLimit)
      .reduce<Record<string, { strGroupLabel: string; lstQuestions: FlexiEligibilityQuestionRecord[] }>>((dicAcc, objQuestion) => {
        const strGroupCode = objQuestion.strGroupCode || "other_eligibility";
        const strGroupLabel = objQuestion.strGroupLabel || "Other Eligibility";
        if (!dicAcc[strGroupCode]) {
          dicAcc[strGroupCode] = { strGroupLabel, lstQuestions: [] };
        }
        dicAcc[strGroupCode].lstQuestions.push(objQuestion);
        return dicAcc;
      }, {});
  }, [lstAllEligibilityQuestions]);

  function renderEligibilityQuestionGroups(
    dicGroups: Record<string, { strGroupLabel: string; lstQuestions: FlexiEligibilityQuestionRecord[] }>,
  ) {
    if (Object.entries(dicGroups).length === 0) {
      return (
        <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>
          {objContext?.strEligibilityQuestionsMessage || "No eligibility questions are configured for this flexi declaration."}
        </Typography>
      );
    }

    return (
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, minmax(0, 1fr))",
            xl: "repeat(3, minmax(0, 1fr))",
          },
          alignItems: "start",
        }}
      >
        {Object.entries(dicGroups).map(([strGroupCode, objGroup], intGroupIndex) => {
          const { strAccent, strTint } = LST_GROUP_ACCENT_PALETTE[intGroupIndex % LST_GROUP_ACCENT_PALETTE.length];
          return (
            <Box
              key={strGroupCode}
              sx={{
                minWidth: 0,
                p: 0.9,
                borderRadius: "12px",
                border: "1px solid #dbe7f3",
                backgroundColor: "#ffffff",
                boxShadow: "0 6px 16px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                {getQuestionIcon(strGroupCode, strAccent)}
                <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: strAccent }}>
                  {objGroup.strGroupLabel}
                </Typography>
              </Stack>
              <Box sx={{ display: "grid", gap: 0.75 }}>
                {objGroup.lstQuestions.map((objQuestion) => {
                  const blnQuestionDisabled = objQuestion.blnIsDisabled === true;
                  const strQuestionAccent = blnQuestionDisabled ? "#0f7ea7" : strAccent;
                  const strQuestionTint = blnQuestionDisabled ? "#eef8fc" : strTint;
                  const objLabelBlock = (
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.45} alignItems="flex-start" sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.73rem", lineHeight: 1.2, color: blnQuestionDisabled ? "#0f4c81" : "#0f172a" }}>
                          {objQuestion.strQuestionLabel}
                          {objQuestion.blnIsRequired ? " *" : ""}
                        </Typography>
                        {objQuestion.blnShowInfoIcon ? (
                          <Tooltip
                            title={objQuestion.strInfoMessage || objQuestion.strDisabledReason || "This question cannot be edited."}
                            enterTouchDelay={0}
                            arrow
                            slotProps={{
                              tooltip: {
                                sx: {
                                  bgcolor: "#0f4c81",
                                  color: "#ffffff",
                                  border: "1px solid #38bdf8",
                                  boxShadow: "0 10px 24px rgba(15, 76, 129, 0.28)",
                                  fontSize: "0.68rem",
                                  fontWeight: 700,
                                  lineHeight: 1.25,
                                  maxWidth: 260,
                                },
                              },
                              arrow: { sx: { color: "#0f4c81" } },
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "#dff3fb",
                                border: "1px solid #38bdf8",
                                cursor: "pointer",
                                flexShrink: 0,
                                mt: -0.05,
                              }}
                            >
                              <InfoOutlinedIcon sx={{ color: "#0f7ea7", fontSize: 12 }} />
                            </Box>
                          </Tooltip>
                        ) : null}
                      </Stack>
                      {objQuestion.strHelpText ? (
                        <Typography sx={{ color: blnQuestionDisabled ? "#246b8f" : "#64748b", fontSize: "0.64rem", mt: 0.18, lineHeight: 1.15 }}>
                          {objQuestion.strHelpText}
                        </Typography>
                      ) : null}
                      {objQuestion.strValidationMessage ? (
                        <Typography sx={{ color: "#dc2626", fontSize: "0.64rem", mt: 0.18, lineHeight: 1.15, fontWeight: 700 }}>
                          {objQuestion.strValidationMessage}
                        </Typography>
                      ) : null}
                    </Box>
                  );

                  return (
                    <Box
                      key={objQuestion.strQuestionCode}
                      sx={{
                        minWidth: 0,
                        p: 0.75,
                        borderRadius: "9px",
                        border: blnQuestionDisabled ? "1px solid #bae6fd" : "1px solid #dbe3ef",
                        borderLeft: `3px solid ${strQuestionAccent}`,
                        backgroundColor: strQuestionTint,
                        boxShadow: blnQuestionDisabled ? "inset 0 0 0 1px rgba(56, 189, 248, 0.18)" : "none",
                      }}
                    >
                      <Stack direction="row" spacing={0.6} alignItems="flex-start" justifyContent="space-between">
                        {objLabelBlock}
                        <Box sx={{ flexShrink: 0, pt: 0.15 }}>{renderQuestionInput(objQuestion)}</Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  useEffect(() => {
    if (blnLoading || !objContext?.blnCanDeclare || !blnCanEditDeclaration) return;
    if (strCurrentSignature === strLastSyncedSignatureRef.current) return;
    if (strCurrentSignature === strLastEvaluatedSignatureRef.current) return;

    const strEvaluationSignature = strCurrentSignature;
    const intSequence = ++intEvaluateSequenceRef.current;
    const intTimer = window.setTimeout(async () => {
      setBlnEvaluating(true);
      try {
        const objData = await flexiPayDeclarationService.evaluate(
          strActiveFinancialYearCode,
          lstPayloadRows,
          strRemarks,
          dicEligibilityAnswers,
        );
        if (intEvaluateSequenceRef.current !== intSequence) return;
        strLastEvaluatedSignatureRef.current = strEvaluationSignature;
        setObjContext(objData);
        setStrError("");
      } catch (objError) {
        if (intEvaluateSequenceRef.current !== intSequence) return;
        setStrError(objError instanceof Error ? objError.message : "Unable to evaluate flexi declaration.");
      } finally {
        if (intEvaluateSequenceRef.current === intSequence) {
          setBlnEvaluating(false);
        }
      }
    }, 450);

    return () => window.clearTimeout(intTimer);
  }, [
    blnLoading,
    dicEligibilityAnswers,
    lstPayloadRows,
    objContext?.blnCanDeclare,
    blnCanEditDeclaration,
    strCurrentSignature,
    strActiveFinancialYearCode,
    strRemarks,
  ]);

  useEffect(() => {
    if (blnLoading || blnSaving || !objContext?.objDeclaration?.intDeclarationID || !blnCanEditDeclaration) return;
    if (strCurrentSignature === strLastAutoSavedSignatureRef.current) return;
    if (lstPayloadRows.length === 0 && !blnHasEligibilityAnswerValues && strRemarks.trim().length === 0) return;

    const intTimer = window.setTimeout(async () => {
      try {
        await flexiPayDeclarationService.saveDraft(
          strActiveFinancialYearCode,
          lstPayloadRows,
          strRemarks,
          dicEligibilityAnswers,
        );
        if (strCurrentSignature === buildStateSignature(dicDraftInputs, dicEligibilityAnswers, strRemarks)) {
          strLastAutoSavedSignatureRef.current = strCurrentSignature;
        }
      } catch {
        // Keep autosave silent; manual actions still surface errors.
      }
    }, 1400);

    return () => window.clearTimeout(intTimer);
  }, [
    blnLoading,
    blnSaving,
    blnHasEligibilityAnswerValues,
    dicEligibilityAnswers,
    lstPayloadRows,
    objContext?.objDeclaration?.intDeclarationID,
    blnCanEditDeclaration,
    strCurrentSignature,
    strActiveFinancialYearCode,
    strRemarks,
    dicDraftInputs,
  ]);

  function validateDeclarationForAction(strAction: "draft" | "submit") {
    if (lstDisplayedRows.length === 0) {
      setStrError("No flexi components are available for this salary structure.");
      return false;
    }
    if (blnAllocationExceeded) {
      setStrError("Declared flexi amount exceeds the available basket.");
      return false;
    }
    if (blnHasRowValidationErrors) {
      const lstRowIssues = lstDisplayedRows
        .map((objRow) => objRow.objSelectedLine)
        .filter((objRow) => Boolean(objRow.strValidationMessage))
        .map((objRow) => `${objRow.strComponentName || objRow.strComponentCode || "Component"}: ${objRow.strValidationMessage}`);
      const strVisibleIssues = lstRowIssues.slice(0, 3).join(" | ");
      const strMoreIssues = lstRowIssues.length > 3 ? ` | +${lstRowIssues.length - 3} more` : "";
      setStrError(`Fix declaration validation issue${lstRowIssues.length > 1 ? "s" : ""}: ${strVisibleIssues}${strMoreIssues}`);
      return false;
    }
    if (strAction === "submit" && lstPayloadRows.length === 0) {
      setStrError("Enter a declared annual amount for at least one eligible flexi component.");
      return false;
    }
    return true;
  }

  function handleComponentSelectionChange(intRowKey: number, intSalaryComponentID: number) {
    const objSelectedLine = dicSelectableRowByID.get(intSalaryComponentID);
    setDicSelectedComponents((dicPrevious) => ({
      ...dicPrevious,
      [intRowKey]: intSalaryComponentID,
    }));
    setDicSelectedQuestions((dicPrevious) => ({
      ...dicPrevious,
      [intRowKey]: objSelectedLine ? (getLinkedQuestionsForRow(objSelectedLine)[0]?.strQuestionCode ?? "") : "",
    }));
  }

  function handleLinkedQuestionSelectionChange(intRowKey: number, strQuestionCode: string) {
    setDicSelectedQuestions((dicPrevious) => ({
      ...dicPrevious,
      [intRowKey]: strQuestionCode,
    }));
  }

  function handleClearFlexiComponent(intRowKey: number) {
    const intSelectedComponentID = dicSelectedComponents[intRowKey] ?? intRowKey;
    setDicDraftInputs((dicPrevious) => ({
      ...dicPrevious,
      [intSelectedComponentID]: "0",
    }));
  }

  async function handleSaveDraft() {
    if (!validateDeclarationForAction("draft")) return;
    setStrSavingLabel("Saving draft...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      const objData = await flexiPayDeclarationService.saveDraft(
        strActiveFinancialYearCode,
        lstPayloadRows,
        strRemarks,
        dicEligibilityAnswers,
      );
      syncLocalStateFromContext(objData, "Draft saved successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save draft.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  async function handleSubmit(): Promise<boolean> {
    if (!validateDeclarationForAction("submit")) return false;
    setStrSavingLabel("Submitting declaration...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      const objData = await flexiPayDeclarationService.submit(
        strActiveFinancialYearCode,
        lstPayloadRows,
        strRemarks,
        dicEligibilityAnswers,
      );
      syncLocalStateFromContext(objData, "Declaration submitted successfully.");
      return true;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to submit declaration.");
      return false;
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  async function handleConfirmSubmit() {
    const blnSuccess = await handleSubmit();
    if (blnSuccess) {
      setBlnSubmitDialogOpen(false);
    }
  }

  function navigateAfterReviewAction(blnFocusFlexiSection: boolean) {
    if (blnEmployeeSalarySource && strReturnTo.startsWith("/") && !strReturnTo.startsWith("//")) {
      const strTarget = blnFocusFlexiSection && !strReturnTo.includes("#") ? `${strReturnTo}#flexi-component` : strReturnTo;
      objRouter.push(strTarget);
      return;
    }
    objRouter.push(strBackPath);
  }

  async function handleApproveReview() {
    if (!blnCanApproveCurrent) return;
    setStrSavingLabel("Approving declaration...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.approve(intRouteDeclarationID, {
        lstItems: lstDisplayedRows.map((objDisplayRow) => ({
          intSalaryComponentID: objDisplayRow.objSelectedLine.intSalaryComponentID,
          decApprovedAmountAnnual: objDisplayRow.objSelectedLine.decInputAnnual,
          strRemarks: objDisplayRow.objSelectedLine.strDeclarationItemRemarks || null,
        })),
        strRemarks,
      });
      setStrToast(t("flexi_pay_declaration_approve_success", "Declaration approved successfully."));
      navigateAfterReviewAction(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to approve declaration.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  async function handleLockReview() {
    if (!blnCanLockCurrent) return;
    setStrSavingLabel("Locking declaration...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.lock(intRouteDeclarationID, strRemarks);
      setStrToast(t("flexi_pay_declaration_lock_success", "Declaration locked successfully."));
      navigateAfterReviewAction(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to lock declaration.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  async function handleReleaseReview() {
    if (!blnCanReleaseCurrent) return;
    setStrSavingLabel("Releasing declaration...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.release(intRouteDeclarationID, strRemarks);
      setStrToast(t("flexi_pay_declaration_release_success", "Declaration released successfully."));
      navigateAfterReviewAction(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to release declaration.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  async function handleDecisionReview() {
    if (!strReviewActionMode) return;
    setStrSavingLabel("Rejecting declaration...");
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.reject(intRouteDeclarationID, strRemarks);
      setStrToast(t("flexi_pay_declaration_reject_success", "Declaration rejected."));
      setStrReviewActionMode(null);
      navigateAfterReviewAction(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to update declaration.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Processing declaration...");
    }
  }

  function renderQuestionInput(objQuestion: FlexiEligibilityQuestionRecord) {
    const strQuestionCode = objQuestion.strQuestionCode;
    const objValue = dicEligibilityAnswers[strQuestionCode] ?? objQuestion.objAnswerValue ?? null;
    const blnDisabled = !blnCanEditDeclaration || blnSaving || objQuestion.blnIsDisabled === true || objQuestion.blnIsEmployeeEditable === false;
    const strQuestionValidationMessage = objQuestion.strValidationMessage || "";

    if (objQuestion.strAnswerType === "boolean") {
      const blnChecked = objValue == null ? false : Boolean(objValue);
      return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Switch
            checked={blnChecked}
            disabled={blnDisabled}
            onChange={(_, blnNextChecked) =>
              setDicEligibilityAnswers((dicPrevious) => ({
                ...dicPrevious,
                [strQuestionCode]: blnNextChecked,
              }))
            }
            size="small"
          />
          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: blnChecked ? "#2563eb" : "#64748b" }}>
            {blnChecked ? "Yes" : "No"}
          </Typography>
        </Box>
      );
    }

    if (objQuestion.strAnswerType === "select") {
      const lstOptions = normalizeSelectOptions(objQuestion.objOptionJson);
      return (
        <TextField
          select
          size="small"
          value={objValue == null ? "" : String(objValue)}
          disabled={blnDisabled}
          error={Boolean(strQuestionValidationMessage)}
          onChange={(objEvent) =>
            setDicEligibilityAnswers((dicPrevious) => ({
              ...dicPrevious,
              [strQuestionCode]: objEvent.target.value || null,
            }))
          }
          sx={{ width: 120, ...OBJ_ELIGIBILITY_FIELD_SX }}
        >
          <MenuItem value="">Select</MenuItem>
          {lstOptions.map((objOption) => (
            <MenuItem key={objOption.strValue} value={objOption.strValue}>
              {objOption.strLabel}
            </MenuItem>
          ))}
        </TextField>
      );
    }

    if (objQuestion.strAnswerType === "number") {
      return (
        <TextField
          size="small"
          type="number"
          value={objValue == null ? "" : String(objValue)}
          disabled={blnDisabled}
          error={Boolean(strQuestionValidationMessage)}
          onChange={(objEvent) => {
            const strNextValue = objEvent.target.value;
            if (strNextValue === "") {
              setDicEligibilityAnswers((dicPrevious) => ({
                ...dicPrevious,
                [strQuestionCode]: null,
              }));
              return;
            }
            const decRawValue = Number(strNextValue);
            if (!Number.isFinite(decRawValue)) return;
            const decMinValue = objQuestion.decMinValue ?? 0;
            const decMaxValue = objQuestion.decMaxValue ?? undefined;
            const decClampedValue = decMaxValue == null
              ? Math.max(decMinValue, decRawValue)
              : Math.min(Math.max(decMinValue, decRawValue), decMaxValue);
            setDicEligibilityAnswers((dicPrevious) => ({
              ...dicPrevious,
              [strQuestionCode]: decClampedValue,
            }));
          }}
          inputProps={{
            min: objQuestion.decMinValue ?? 0,
            max: objQuestion.decMaxValue ?? undefined,
            step: 1,
          }}
          sx={{
            width: 64,
            ...OBJ_ELIGIBILITY_FIELD_SX,
            "& input[type=number]::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
            "& input[type=number]::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
            "& input[type=number]": { MozAppearance: "textfield" },
          }}
        />
      );
    }

    return (
      <TextField
        size="small"
        value={objValue == null ? "" : String(objValue)}
        disabled={blnDisabled}
        error={Boolean(strQuestionValidationMessage)}
        onChange={(objEvent) =>
          setDicEligibilityAnswers((dicPrevious) => ({
            ...dicPrevious,
            [strQuestionCode]: objEvent.target.value || null,
          }))
        }
        sx={{ width: 120, ...OBJ_ELIGIBILITY_FIELD_SX }}
      />
    );
  }

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel="Loading flexi declaration details..." />;
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.2,
        height: "100%",
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        pb: 2,
        pr: 0.5,
      }}
    >
      <BlockingLoader blnOpen={blnSaving} strLabel={strSavingLabel} />
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {objContext?.strIneligibilityReason && !objContext.blnCanDeclare ? (
        <Alert severity="info">{objContext.strIneligibilityReason}</Alert>
      ) : null}
      {blnAllocationExceeded ? <Alert severity="error">Declared flexi amount exceeds the available basket.</Alert> : null}
      {lstValidationMessages.map((strMessage) => (
        <Alert key={strMessage} severity="warning">{strMessage}</Alert>
      ))}
      {objContext?.blnHasHiddenComponents ? (
        <Alert severity="info">Some components are hidden because eligibility conditions are not met.</Alert>
      ) : null}
      {blnReviewEntryMode && blnShowReviewReadOnlyNotice ? (
        <Alert
          severity="info"
          action={(
            <IconButton
              aria-label="Close review read only notice"
              color="inherit"
              size="small"
              onClick={() => setBlnShowReviewReadOnlyNotice(false)}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        >
          Approval Review: declaration amount fields are read-only here unless HR override is explicitly supported.
        </Alert>
      ) : null}
      {!blnShowWorkflowActions && strNormalizedWorkflowStatus === "submitted" ? (
        <Alert severity="info">Submitted values are shown for preview. Payroll should use approved or locked values after approval.</Alert>
      ) : null}
      {blnShowWorkflowActions && blnShowReviewActionNotice ? (
        <Alert
          severity="info"
          action={(
            <IconButton
              aria-label="Close review action notice"
              color="inherit"
              size="small"
              onClick={() => setBlnShowReviewActionNotice(false)}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        >
          Approval Review: use Approve, Reject, Lock or Release based on the declaration status.
        </Alert>
      ) : null}

      <Paper
        sx={{
          p: 1.35,
          borderRadius: "12px",
          border: "1px solid #1e3a8a",
          background: "linear-gradient(90deg, #184f94 0%, #0f7ea7 100%)",
          boxShadow: "0 8px 20px rgba(11, 47, 99, 0.18)",
          position: "sticky",
          top: 0,
          zIndex: 8,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
          <Box>
            <Typography sx={{ fontWeight: 900, color: "#f8fcff", fontSize: "1.05rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeName || "Employee"}
            </Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeCode || "-"} | FY {strActiveFinancialYearCode} | {strPageModeLabel} | Current Status {formatStatus(strWorkflowStatus)} | IT Regime {strSelectedTaxRegimeLabel}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              sx={objHeaderActionButtonSx}
              onClick={() => objRouter.push(strBackPath)}
            >
              {t("flexi_pay_declaration_back", "Back")}
            </Button>
            {!blnShowWorkflowActions && blnShowEssDraftAction ? (
              <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnCanSaveDraft} onClick={() => void handleSaveDraft()}>
                Draft
              </Button>
            ) : null}
            {!blnShowWorkflowActions && blnShowEssSubmitAction ? (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<SendRoundedIcon />}
                disabled={!blnCanSubmit}
                onClick={() => {
                  if (validateDeclarationForAction("submit")) {
                    setStrError("");
                    setBlnSubmitDialogOpen(true);
                  }
                }}
              >
                {lstEssResubmittableWorkflowStatuses.includes(strNormalizedWorkflowStatus) ? "Resubmit" : "Submit"}
              </Button>
            ) : null}
            {blnShowWorkflowActions ? (
              <>
                <Button size="small" variant="outlined" color="error" disabled={!blnCanRejectCurrent || blnSaving} onClick={() => setStrReviewActionMode("reject")}>
                  {t("flexi_pay_declaration_reject", "Reject")}
                </Button>
                {blnCanReleaseCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving} sx={objHeaderActionButtonSx} onClick={() => void handleReleaseReview()}>
                    {t("flexi_pay_declaration_release", "Release")}
                  </Button>
                ) : null}
                {blnCanLockCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving} sx={objHeaderActionButtonSx} onClick={() => void handleLockReview()}>
                    {t("flexi_pay_declaration_lock", "Lock")}
                  </Button>
                ) : null}
                {blnCanApproveCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving || blnAllocationExceeded} sx={objHeaderActionButtonSx} onClick={() => void handleApproveReview()}>
                    {t("flexi_pay_declaration_approve", "Approve")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(6, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #2563eb" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Mode</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{strPageModeLabel}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #2563eb" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Current Status</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatStatus(strWorkflowStatus)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #0d9488" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Flexi Basket Available</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #d97706" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Declared Flexi</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #db2777" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Residual Taxable Balance</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #7c3aed" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Assigned Salary Structure</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{objContext?.objAssignedStructure?.strStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #f59e0b" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>Tax Regime</Typography>
          <Chip
            size="small"
            variant="outlined"
            label={strSelectedTaxRegimeLabel}
            color={getRegimeChipColor(strSelectedTaxRegimeLabel)}
            sx={{
              mt: 0.25,
              height: 22,
              maxWidth: "100%",
              "& .MuiChip-label": { px: 0.75, fontSize: "0.7rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
        </Paper>
      </Box>

      <Stack spacing={1.2}>
        <Box sx={{ display: "grid", gap: 1.2, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 0.75, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={0.75} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>Eligibility Questions</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.72rem", mt: 0.1 }}>
                    Components are enabled from the selected IT regime. Related questions remain available for eligible components.
                  </Typography>
                </Box>
                {lstAllEligibilityQuestions.length > intEligibilityPreviewLimit ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setBlnEligibilityDialogOpen(true)}
                    sx={{ alignSelf: { xs: "flex-start", md: "center" }, backgroundColor: "#2563eb", "&:hover": { backgroundColor: "#1d4ed8" } }}
                  >
                    Show More
                  </Button>
                ) : null}
              </Stack>
            </Box>
            <Box sx={{ p: 1, display: "grid", gap: 1 }}>
              {renderEligibilityQuestionGroups(dicPreviewQuestionGroups)}
            </Box>
          </Paper>

          <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #cfe3ff", display: "flex" }}>
            <Stack spacing={1.15} sx={{ width: "100%" }}>
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Typography sx={{ fontWeight: 900, color: "#172554", fontSize: "0.95rem" }}>Salary Impact Summary</Typography>
                <Tooltip title="This is an estimate. Final payroll impact will be based on approved declaration and payroll processing." enterTouchDelay={0}>
                  <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16, cursor: "pointer" }} />
                </Tooltip>
              </Stack>

              <Stack spacing={0.9}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Annual CTC</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decAnnualCtc, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Gross Monthly</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decGrossMonthly, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Flexi Basket Available</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Declared Flexi</Typography>
                  <Typography sx={{ color: blnAllocationExceeded ? "#dc2626" : "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>
                    {formatCurrency(decDeclaredAnnual, strCurrencyCode)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Residual Taxable Balance</Typography>
                  <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Residual Component</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem", textAlign: "right" }}>{strResidualComponentName}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Monthly Driver Salary</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decDeclaredMonthly, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Monthly Residual Taxable</Typography>
                  <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualMonthly, strCurrencyCode)}</Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Dialog
            open={blnEligibilityDialogOpen}
            onClose={() => setBlnEligibilityDialogOpen(false)}
            fullWidth
            maxWidth="lg"
          >
            <DialogTitle>All Eligibility Questions</DialogTitle>
            <DialogContent dividers sx={{ p: 1.25 }}>
              <Box sx={{ display: "grid", gap: 1 }}>
                {renderEligibilityQuestionGroups(dicQuestionGroups)}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 1 }}>
              <Button onClick={() => setBlnEligibilityDialogOpen(false)}>Close</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={blnSubmitDialogOpen}
            onClose={() => (blnSaving ? null : setBlnSubmitDialogOpen(false))}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Confirm Declaration Submission</DialogTitle>
            <DialogContent dividers sx={{ p: 1.5 }}>
              <Stack spacing={1.25}>
                {strError ? <Alert severity="error">{strError}</Alert> : null}
                <Alert severity="info">
                  Please review your declared amounts before submitting. Once submitted, the declaration moves for approval and cannot be edited unless it is returned, released, or rejected back to you.
                </Alert>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`Declared Flexi: ${formatCurrency(decDeclaredAnnual, strCurrencyCode)}`} />
                  <Chip label={`Residual Taxable Balance: ${formatCurrency(decResidualAnnual, strCurrencyCode)}`} />
                </Stack>
                <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>Declaration Remarks</Typography>
                <TextField
                  multiline
                  minRows={3}
                  value={strRemarks}
                  onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
                  disabled={blnSaving}
                  placeholder="Optional remarks for this submission"
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 1 }}>
              <Button onClick={() => setBlnSubmitDialogOpen(false)} disabled={blnSaving}>Cancel</Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<SendRoundedIcon />}
                disabled={blnSaving}
                onClick={() => void handleConfirmSubmit()}
              >
                {lstEssResubmittableWorkflowStatuses.includes(strNormalizedWorkflowStatus) ? "Confirm Resubmit" : "Confirm Submit"}
              </Button>
          </DialogActions>
          </Dialog>

          <Dialog
            open={Boolean(strReviewActionMode)}
            onClose={() => (blnSaving ? null : setStrReviewActionMode(null))}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>{t("flexi_pay_declaration_reject_dialog_title", "Reject Declaration")}</DialogTitle>
            <DialogContent dividers sx={{ p: 1.5 }}>
              <Stack spacing={1.25}>
                <Typography sx={{ mb: 0.25 }}>{t("flexi_pay_declaration_reviewer_remarks_hint", "Reviewer remarks will be saved on the declaration.")}</Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  value={strRemarks}
                  onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
                  disabled={blnSaving}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 1 }}>
              <Button onClick={() => setStrReviewActionMode(null)} disabled={blnSaving}>{t("flexi_pay_declaration_cancel", "Cancel")}</Button>
              <Button variant="contained" onClick={() => void handleDecisionReview()} disabled={blnSaving || !strRemarks.trim()}>
                {t("flexi_pay_declaration_confirm", "Confirm")}
              </Button>
            </DialogActions>
          </Dialog>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Eligible Flexi Components</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    Annual Cap is entitlement only. Monthly Impact is always based on Declared Annual divided by 12.
                  </Typography>
                </Box>
                <Chip label={`${intEligibleFlexiComponentCount} eligible / ${lstDisplayedRows.length} total`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 300 }}>
              <Table
                size="small"
                sx={{
                  tableLayout: "fixed",
                  minWidth: intFlexiComponentTableMinWidth,
                  "& .MuiTableCell-root": { py: 0.55, px: 0.75, fontSize: "0.7rem", verticalAlign: "middle" },
                  "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" },
                }}
              >
                <colgroup>
                  <col style={{ width: 176 }} />
                  <col style={{ width: 126 }} />
                  <col style={{ width: 108 }} />
                  <col style={{ width: 94 }} />
                  <col style={{ width: intDeclaredAnnualColumnWidth }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 64 }} />
                  <col style={{ width: 70 }} />
                  <col style={{ width: 252 }} />
                </colgroup>
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#ffffff" }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell>Eligibility</TableCell>
                    <TableCell>Regime</TableCell>
                    <TableCell align="right">Annual Cap</TableCell>
                    <TableCell align="right">Declared Annual</TableCell>
                    <TableCell align="right">Monthly Impact</TableCell>
                    <TableCell>Proof</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Reason / Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstDisplayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                        No flexi components are available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lstDisplayedRows.map((objDisplayRow) => {
                      const objRow = objDisplayRow.objSelectedLine;
                      const objEligibilityChip = getEligibilityChipConfig(objRow);
                      return (
                        <TableRow key={objDisplayRow.intRowKey}>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.73rem", lineHeight: 1.15 }}>
                              {objRow.strComponentName || objRow.strComponentCode || "Component"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                color={objEligibilityChip.strColor}
                                label={objEligibilityChip.strLabel}
                                sx={{
                                  minWidth: objEligibilityChip.strLabel === "Not Eligible" ? 96 : 82,
                                  height: 22,
                                  maxWidth: "none",
                                  "& .MuiChip-label": { px: 0.85, overflow: "visible", textOverflow: "clip", whiteSpace: "nowrap" },
                                }}
                              />
                              {objDisplayRow.decMultiplier > 1 ? (
                                <Typography sx={{ color: "#475569", fontSize: "0.68rem" }}>
                                  Multiplier x {objDisplayRow.decMultiplier}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={getComponentRegimeDisplayLabel(objRow)}
                              color={getRegimeChipColor(objRow.strEligibilityApplicableRegime || objRow.strComponentApplicableRegime)}
                              sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit, strCurrencyCode)}
                          </TableCell>
                          <TableCell align="right">
                              <TextField
                                size="small"
                                type="number"
                                value={objDisplayRow.strDisplayedAmount}
                                disabled={
                                  !blnCanEditDeclaration ||
                                  !["eligible", "eligible_by_default"].includes(getEligibilityState(objRow)) ||
                                  Number(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? 0) <= 0 ||
                                  blnSaving
                                }
                                error={Boolean(objRow.strValidationMessage)}
                                helperText={objRow.strValidationMessage || ""}
                                onChange={(objEvent) =>
                                  setDicDraftInputs((dicPrevious) => ({
                                    ...dicPrevious,
                                    [objRow.intSalaryComponentID]: String(normalizeAmount(objEvent.target.value)),
                                  }))
                                }
                                inputProps={{ min: 0, max: objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? undefined }}
                              sx={{
                                width: intDeclaredAnnualFieldWidth,
                                "& .MuiInputBase-root": { fontSize: "0.7rem", height: 32 },
                                "& input": { textAlign: "right" },
                                "& .MuiFormHelperText-root": { mx: 0, mt: 0.25, fontSize: "0.6rem", lineHeight: 1.12, textAlign: "left" },
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(objRow.decDisplayMonthly, strCurrencyCode)}</TableCell>
                          <TableCell>{objRow.blnProofRequired ? "Required" : "No"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={objRow.strDeclarationItemStatus ? formatStatus(objRow.strDeclarationItemStatus) : "Draft"}
                              color={getStatusTone(objRow.strDeclarationItemStatus)}
                              sx={{ height: 22, maxWidth: "100%", "& .MuiChip-label": { px: 0.8, overflow: "hidden", textOverflow: "ellipsis" } }}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <Typography
                                sx={{
                                  color: "#64748b",
                                  fontSize: "0.6rem",
                                  lineHeight: 1.15,
                                  flex: 1,
                                  minWidth: 0,
                                  display: "-webkit-box",
                                  WebkitBoxOrient: "vertical",
                                  WebkitLineClamp: 2,
                                  overflow: "hidden",
                                }}
                              >
                                {getLineReasonText(objRow)}
                              </Typography>
                              <IconButton
                                size="small"
                                disabled={!blnCanEditDeclaration || Number(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? 0) <= 0 || blnSaving}
                                onClick={() => handleClearFlexiComponent(objDisplayRow.intRowKey)}
                                sx={{ color: "#dc2626", flex: "0 0 auto", p: 0.35 }}
                                aria-label={`Clear ${objRow.strComponentName || objRow.strComponentCode || "component"} amount`}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Fixed Salary Components</Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem", verticalAlign: "top" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstFixedSalaryRows.map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Estimated Salary Split After Declaration</Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem", verticalAlign: "top" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Bucket</TableCell>
                      <TableCell align="right">Annual</TableCell>
                      <TableCell align="right">Monthly</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { strLabel: "Declared Flexi", decAnnual: decDeclaredAnnual },
                      { strLabel: "Residual Taxable Balance", decAnnual: decResidualAnnual },
                    ].map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{objRow.strLabel}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAnnual, strCurrencyCode)}</TableCell>
                        <TableCell align="right">{formatCurrency(objRow.decAnnual / 12, strCurrencyCode)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ p: 1, borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ color: "#64748b", fontSize: "0.72rem" }}>
                  This is an estimate. Final payroll impact will be based on approved declaration and payroll processing.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Stack>

      <Snackbar
        open={Boolean(strToast)}
        autoHideDuration={3500}
        onClose={() => setStrToast("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setStrToast("")} severity="success" variant="filled" sx={{ width: "100%" }}>
          {strToast}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(strError)}
        autoHideDuration={4500}
        onClose={() => setStrError("")}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={() => setStrError("")} severity="error" variant="filled" sx={{ width: "100%" }}>
          {strError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
