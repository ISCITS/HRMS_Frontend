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
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
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
  type FlexiProofPayload,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";
import { useFlexiPayDeclarationLabels } from "@/features/flexi-pay-declaration/hooks/useFlexiPayDeclarationLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";

type DraftInputMap = Record<number, string>;
type EligibilityAnswerMap = Record<string, string | number | boolean | null>;
type ComponentSelectionMap = Record<number, number>;
type LinkedQuestionSelectionMap = Record<number, string>;
type ProofFileMap = Record<number, FlexiProofPayload | null>;
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

function mergeEligibilityQuestions(
  lstQuestions: FlexiEligibilityQuestionRecord[] | undefined,
): FlexiEligibilityQuestionRecord[] {
  const dicQuestionsByCode = new Map<string, FlexiEligibilityQuestionRecord>();
  (lstQuestions || []).forEach((objQuestion) => {
    const strQuestionCode = normalizeText(objQuestion.strQuestionCode);
    if (!strQuestionCode) return;
    const objExisting = dicQuestionsByCode.get(strQuestionCode);
    if (!objExisting) {
      dicQuestionsByCode.set(strQuestionCode, {
        ...objQuestion,
        strQuestionCode,
        lstLinkedComponentIDs: [...(objQuestion.lstLinkedComponentIDs || [])],
      });
      return;
    }

    const setLinkedComponentIDs = new Set<number>([
      ...(objExisting.lstLinkedComponentIDs || []),
      ...(objQuestion.lstLinkedComponentIDs || []),
    ]);
    const decExistingMaxValue = objExisting.decMaxValue;
    const decNextMaxValue = objQuestion.decMaxValue;

    dicQuestionsByCode.set(strQuestionCode, {
      ...objExisting,
      strQuestionLabel: objExisting.strQuestionLabel || objQuestion.strQuestionLabel,
      strHelpText: objExisting.strHelpText || objQuestion.strHelpText,
      strHint: objExisting.strHint || objQuestion.strHint,
      blnIsRequired: Boolean(objExisting.blnIsRequired || objQuestion.blnIsRequired),
      blnIsEmployeeEditable: Boolean(objExisting.blnIsEmployeeEditable || objQuestion.blnIsEmployeeEditable),
      blnIsDisabled: Boolean(objExisting.blnIsDisabled && objQuestion.blnIsDisabled),
      blnShowInfoIcon: Boolean(objExisting.blnShowInfoIcon || objQuestion.blnShowInfoIcon),
      strDisabledReason: objExisting.strDisabledReason || objQuestion.strDisabledReason,
      strInfoMessage: objExisting.strInfoMessage || objQuestion.strInfoMessage,
      strApplicableRegime:
        objExisting.strApplicableRegime === objQuestion.strApplicableRegime
          ? objExisting.strApplicableRegime
          : "both",
      lstLinkedComponentIDs: Array.from(setLinkedComponentIDs),
      decMinValue:
        objExisting.decMinValue == null
          ? objQuestion.decMinValue
          : objQuestion.decMinValue == null
            ? objExisting.decMinValue
            : Math.min(objExisting.decMinValue, objQuestion.decMinValue),
      decMaxValue:
        decExistingMaxValue == null
          ? decNextMaxValue
          : decNextMaxValue == null
            ? decExistingMaxValue
            : Math.min(decExistingMaxValue, decNextMaxValue),
      objAnswerValue: objExisting.objAnswerValue ?? objQuestion.objAnswerValue,
      blnAnswerValid: objExisting.blnAnswerValid ?? objQuestion.blnAnswerValid,
      strValidationMessage: objExisting.strValidationMessage || objQuestion.strValidationMessage,
      decEffectiveMultiplier: Math.max(
        Number(objExisting.decEffectiveMultiplier ?? 0),
        Number(objQuestion.decEffectiveMultiplier ?? 0),
      ) || undefined,
    });
  });

  return Array.from(dicQuestionsByCode.values());
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

function buildProofMap(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<ProofFileMap>((dicAcc, objLine) => {
    if (objLine.blnProofUploaded && objLine.strProofFileName) {
      dicAcc[objLine.intSalaryComponentID] = {
        strFileName: objLine.strProofFileName,
        strContentType: objLine.strProofContentType || "application/octet-stream",
        intFileSizeBytes: Number(objLine.intProofFileSizeBytes || 0),
        strBase64Content: "",
      };
    }
    return dicAcc;
  }, {});
}

function buildStateSignature(
  dicDraftInputs: DraftInputMap,
  dicEligibilityAnswers: EligibilityAnswerMap,
  strRemarks: string,
  dicProofFiles: ProofFileMap = {},
) {
  const lstDraftEntries = Object.entries(dicDraftInputs).sort(([a], [b]) => Number(a) - Number(b));
  const lstAnswerEntries = Object.entries(dicEligibilityAnswers).sort(([a], [b]) => a.localeCompare(b));
  const lstProofEntries = Object.entries(dicProofFiles)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([strComponentID, objProof]) => [
      strComponentID,
      objProof
        ? {
            strFileName: objProof.strFileName,
            strContentType: objProof.strContentType,
            intFileSizeBytes: objProof.intFileSizeBytes,
            intContentLength: objProof.strBase64Content.length,
          }
        : null,
    ]);
  return JSON.stringify({
    lstDraftEntries,
    lstAnswerEntries,
    lstProofEntries,
    strRemarks: strRemarks.trim(),
  });
}

function formatFileSize(intFileSizeBytes?: number | null) {
  const intSize = Number(intFileSizeBytes || 0);
  if (!Number.isFinite(intSize) || intSize <= 0) return "";
  if (intSize >= 1024 * 1024) return `${(intSize / (1024 * 1024)).toFixed(1)} MB`;
  if (intSize >= 1024) return `${Math.round(intSize / 1024)} KB`;
  return `${intSize} B`;
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
  const dicProofInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnEvaluating, setBlnEvaluating] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strSavingLabel, setStrSavingLabel] = useState(() => t("processing", "Processing declaration..."));
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(() => buildFallbackContext(strFinancialYearCode));
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>(() => buildInitialDraftInputs(buildFallbackContext(strFinancialYearCode)));
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<EligibilityAnswerMap>({});
  const [dicProofFiles, setDicProofFiles] = useState<ProofFileMap>({});
  const [dicSelectedComponents, setDicSelectedComponents] = useState<ComponentSelectionMap>({});
  const [dicSelectedQuestions, setDicSelectedQuestions] = useState<LinkedQuestionSelectionMap>({});
  const [blnEligibilityDialogOpen, setBlnEligibilityDialogOpen] = useState(false);
  const [blnSubmitDialogOpen, setBlnSubmitDialogOpen] = useState(false);
  const [strReviewActionMode, setStrReviewActionMode] = useState<"reject" | null>(null);
  const [blnShowReviewReadOnlyNotice, setBlnShowReviewReadOnlyNotice] = useState(true);
  const [blnShowReviewActionNotice, setBlnShowReviewActionNotice] = useState(true);
  const strActiveFinancialYearCode = objContext?.strFinancialYearCode || strFinancialYearCode;
  const formatTranslatedStatus = useCallback((strStatus?: string | null) => {
    const strNormalizedStatus = normalizeText(strStatus || "draft").replace(/[\s-]+/g, "_");
    return t(strNormalizedStatus, formatStatus(strStatus));
  }, [t]);
  const getTranslatedRegimeLabel = useCallback((strLabel?: string | null) => {
    const strNormalized = normalizeText(strLabel).replace(/[-_]+/g, " ");
    if (!strNormalized) return t("not_selected", "Not selected");
    if (strNormalized.includes("new")) return t("new_regime", "New Regime");
    if (strNormalized.includes("old")) return t("old_regime", "Old Regime");
    if (strNormalized.includes("both") || strNormalized === "all" || strNormalized === "all regimes") return t("both_regimes", "Both Regimes");
    return String(strLabel || "").replace(/[-_]+/g, " ").trim();
  }, [t]);
  const getTranslatedSelectedTaxRegimeLabel = useCallback(() => getTranslatedRegimeLabel(getSelectedTaxRegimeLabel(objContext)), [getTranslatedRegimeLabel, objContext]);
  const getTranslatedEligibilityChipConfig = useCallback((objRow: FlexiDeclarationLineRecord) => {
    const objChip = getEligibilityChipConfig(objRow);
    const strEligibilityState = getEligibilityState(objRow);
    return {
      ...objChip,
      strLabel: t(strEligibilityState, objChip.strLabel)
    };
  }, [t]);
  const getTranslatedLineReasonText = useCallback((objRow: FlexiDeclarationLineRecord) => {
    const decDeclaredAnnual = Number(objRow.decDraftDeclaredAnnual ?? objRow.decAllocationAnnual ?? 0);
    const decAnnualCap = Number(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? 0);
    const strItemStatus = normalizeText(objRow.strDeclarationItemStatus);
    if (objRow.blnRegimeEligible === false) {
      return objRow.strRegimeEligibilityReason || objRow.strEligibilityReason || t("component_not_eligible_regime", "Component is not eligible for the selected IT regime.");
    }
    if (objRow.strEligibilityDetailsReason) return objRow.strEligibilityDetailsReason;
    if (decAnnualCap <= 0) return t("no_entitlement_configured", "No entitlement configured.");
    if (["approved", "locked"].includes(strItemStatus) && decDeclaredAnnual > 0) return t("approved_locked", "Approved / Locked");
    if (strItemStatus === "submitted" && decDeclaredAnnual > 0) return t("submitted_via_ess", "Submitted via ESS");
    if (decDeclaredAnnual <= 0) return t("not_declared", "Not declared");
    if (!(objRow.lstEligibilityRules || []).length) return t("eligible_by_default", "Eligible by default");
    return objRow.strEligibilityReason || t("eligible_by_default", "Eligible by default");
  }, [t]);
  const translateKnownFlexiText = useCallback((strValue?: string | null) => {
    const strDisplayValue = String(strValue || "").trim();
    const strNormalized = normalizeText(strDisplayValue.replace(/\s+\*$/, "")).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const dicKnownKeys: Record<string, string> = {
      vehicle_information: "vehicle_information",
      employee_has_car: "employee_has_car",
      required_for_car_lease_fuel_and_driver_related_flexi_benefits: "employee_has_car_help",
      car_ownership_type: "car_ownership_type",
      used_for_car_lease_company_car_fuel_and_driver_eligibility: "car_ownership_type_help",
      own_car: "own_car",
      company_car: "company_car",
      fuel_reimbursement: "fuel_reimbursement",
      medical_reimbursement: "medical_reimbursement",
      mobile_reimbursement: "mobile_reimbursement",
      travel_reimbursement: "travel_reimbursement",
      basic_salary: "basic_salary",
      hra: "hra",
      employer_contribution: "employer_contribution",
      flexi_bucket: "flexi_bucket",
      residual_taxable_preview: "residual_taxable_preview",
      approved_locked: "approved_locked",
      eligible_by_default: "eligible_by_default",
    };
    const strKey = dicKnownKeys[strNormalized];
    return strKey ? t(strKey, strDisplayValue) : strDisplayValue;
  }, [t]);

  const syncLocalStateFromContext = useCallback((objData: FlexiDeclarationContextRecord, strMessage?: string) => {
    setObjContext(objData);
    const dicNextDraftInputs = buildInitialDraftInputs(objData);
    const dicNextAnswers = buildAnswerMap(objData);
    const dicNextProofFiles = buildProofMap(objData);
    const dicNextSelectedComponents = buildInitialComponentSelections(objData);
    const dicNextSelectedQuestions = buildInitialQuestionSelections(objData);
    const strNextRemarks = objData.objDeclaration?.strRemarks || "";
    setDicDraftInputs(dicNextDraftInputs);
    setDicEligibilityAnswers(dicNextAnswers);
    setDicProofFiles(dicNextProofFiles);
    setDicSelectedComponents(dicNextSelectedComponents);
    setDicSelectedQuestions(dicNextSelectedQuestions);
    setStrRemarks(strNextRemarks);
    const strSignature = buildStateSignature(dicNextDraftInputs, dicNextAnswers, strNextRemarks, dicNextProofFiles);
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
      setStrError(objError instanceof Error ? objError.message : t("unable_load", "Unable to load flexi declaration."));
    } finally {
      if (intLoadSequenceRef.current === intLoadSequence) {
        setBlnLoading(false);
      }
    }
  }, [blnRouteHasDeclarationID, intRouteDeclarationID, strFinancialYearCode, syncLocalStateFromContext, t]);

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
  const strSelectedTaxRegimeLabel = getTranslatedSelectedTaxRegimeLabel();
  const blnCanApproveAction = canDoAny("approve");
  const blnCanRejectAction = canDoAny("reject") || blnCanApproveAction;
  const blnCanLockAction = canDoAny("lock") || blnCanApproveAction;
  const blnCanReleaseAction = canDoAny("release") || canDoAny("unlock") || blnCanApproveAction;
  const blnShowWorkflowActions = blnReviewEntryMode;
  const blnCanApproveCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanApproveAction;
  const blnCanRejectCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanRejectAction;
  const blnCanLockCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanLockAction;
  const blnCanReleaseCurrent = blnShowWorkflowActions && ["submitted", "locked"].includes(strNormalizedWorkflowStatus) && blnCanReleaseAction;
  const strPageModeLabel = blnReviewEntryMode ? t("approval_review", "Approval Review") : t("ess_declaration", "ESS Declaration");

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
  const intFlexiComponentTableMinWidth = 918 + intDeclaredAnnualColumnWidth;
  const blnHasEligibilityAnswerValues = hasAnyEligibilityAnswers(dicEligibilityAnswers);
  const lstValidationMessages = objContext?.validation_messages || [];
  const strResidualComponentName = dicBaseSummaryMetrics.strResidualComponentName;
  const lstFixedSalaryRows = useMemo(
    () => buildEmployeeSalaryFixedRows(dicBaseSummaryMetrics, decResidualAnnual),
    [decResidualAnnual, dicBaseSummaryMetrics],
  );

  const strCurrentSignature = useMemo(
    () => buildStateSignature(dicDraftInputs, dicEligibilityAnswers, strRemarks, dicProofFiles),
    [dicDraftInputs, dicEligibilityAnswers, dicProofFiles, strRemarks],
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
        objProof: dicProofFiles[objRow.intSalaryComponentID]?.strBase64Content
          ? dicProofFiles[objRow.intSalaryComponentID]
          : null,
        blnClearProof: dicProofFiles[objRow.intSalaryComponentID] === null && Boolean(objRow.blnProofUploaded),
      });
    });
    return Array.from(dicRows.values());
  }, [dicProofFiles, lstDisplayedRows]);

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
  const lstMergedEligibilityQuestions = useMemo(
    () => mergeEligibilityQuestions(objContext?.lstEligibilityQuestions),
    [objContext?.lstEligibilityQuestions],
  );
  const lstMissingProofRows = useMemo(
    () =>
      lstDisplayedRows.filter((objDisplayRow) => {
        const objRow = objDisplayRow.objSelectedLine;
        if (!objRow.blnProofRequired || objRow.decInputAnnual <= 0) return false;
        return !dicProofFiles[objRow.intSalaryComponentID];
      }),
    [dicProofFiles, lstDisplayedRows],
  );

  const dicQuestionGroups = useMemo(() => {
    return lstMergedEligibilityQuestions.reduce<Record<string, { strGroupLabel: string; lstQuestions: FlexiEligibilityQuestionRecord[] }>>(
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
  }, [lstMergedEligibilityQuestions]);

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
          {objContext?.strEligibilityQuestionsMessage || t("no_eligibility_questions_configured", "No eligibility questions are configured for this flexi declaration.")}
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
                  {translateKnownFlexiText(objGroup.strGroupLabel)}
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
                          {translateKnownFlexiText(objQuestion.strQuestionLabel)}
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
                          {translateKnownFlexiText(objQuestion.strHelpText)}
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
        setStrError(objError instanceof Error ? objError.message : t("unable_evaluate", "Unable to evaluate flexi declaration."));
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
    t,
  ]);

  useEffect(() => {
    if (blnLoading || blnSaving || !objContext?.objDeclaration?.intDeclarationID || !blnCanEditDeclaration) return;
    if (strCurrentSignature === strLastAutoSavedSignatureRef.current) return;
    if (lstPayloadRows.length === 0 && !blnHasEligibilityAnswerValues && strRemarks.trim().length === 0) return;
    if (lstMissingProofRows.length > 0) return;

    const intTimer = window.setTimeout(async () => {
      try {
        await flexiPayDeclarationService.saveDraft(
          strActiveFinancialYearCode,
          lstPayloadRows,
          strRemarks,
          dicEligibilityAnswers,
        );
        if (strCurrentSignature === buildStateSignature(dicDraftInputs, dicEligibilityAnswers, strRemarks, dicProofFiles)) {
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
    dicProofFiles,
    lstMissingProofRows.length,
  ]);

  function validateDeclarationForAction(strAction: "draft" | "submit") {
    if (lstDisplayedRows.length === 0) {
      setStrError(t("no_flexi_pay_configured_current_salary_structure", "No flexi pay is configured for the current salary structure."));
      return false;
    }
    if (blnAllocationExceeded) {
      setStrError(t("amount_exceeds_basket", "Declared flexi amount exceeds the available basket."));
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
    if (lstMissingProofRows.length > 0) {
      const strProofIssues = lstMissingProofRows
        .map((objDisplayRow) => translateKnownFlexiText(objDisplayRow.objSelectedLine.strComponentName || objDisplayRow.objSelectedLine.strComponentCode) || t("component", "Component"))
        .slice(0, 3)
        .join(" | ");
      const strMoreIssues = lstMissingProofRows.length > 3 ? ` | +${lstMissingProofRows.length - 3} more` : "";
      setStrError(`${t("proof_required_before_save", "Upload proof documents before saving.")} ${strProofIssues}${strMoreIssues}`);
      return false;
    }
    if (strAction === "submit" && lstPayloadRows.length === 0) {
      setStrError(t("enter_declared_amount", "Enter a declared annual amount for at least one eligible flexi component."));
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

  function openProofPicker(intSalaryComponentID: number) {
    dicProofInputRefs.current[intSalaryComponentID]?.click();
  }

  async function handleProofFileSelected(intSalaryComponentID: number, objFile: File | null) {
    if (!objFile) return;
    try {
      const strBase64Content = await new Promise<string>((fnResolve, fnReject) => {
        const objReader = new FileReader();
        objReader.onload = () => {
          const strResult = String(objReader.result || "");
          const intSeparatorIndex = strResult.indexOf(",");
          fnResolve(intSeparatorIndex >= 0 ? strResult.slice(intSeparatorIndex + 1) : strResult);
        };
        objReader.onerror = () => fnReject(objReader.error || new Error("Unable to read file."));
        objReader.readAsDataURL(objFile);
      });
      setDicProofFiles((dicPrevious) => ({
        ...dicPrevious,
        [intSalaryComponentID]: {
          strFileName: objFile.name,
          strContentType: objFile.type || "application/octet-stream",
          intFileSizeBytes: objFile.size,
          strBase64Content,
        },
      }));
      setStrError("");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_read_proof", "Unable to read proof file."));
    } finally {
      if (dicProofInputRefs.current[intSalaryComponentID]) {
        dicProofInputRefs.current[intSalaryComponentID]!.value = "";
      }
    }
  }

  function handleClearProofFile(intSalaryComponentID: number) {
    setDicProofFiles((dicPrevious) => ({
      ...dicPrevious,
      [intSalaryComponentID]: null,
    }));
    if (dicProofInputRefs.current[intSalaryComponentID]) {
      dicProofInputRefs.current[intSalaryComponentID]!.value = "";
    }
  }

  async function handleSaveDraft() {
    if (!validateDeclarationForAction("draft")) return;
    setStrSavingLabel(t("saving_draft", "Saving draft..."));
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
      syncLocalStateFromContext(objData, t("draft_saved_success", "Draft saved successfully."));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_save_draft", "Unable to save draft."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
    }
  }

  async function handleSubmit(): Promise<boolean> {
    if (!validateDeclarationForAction("submit")) return false;
    setStrSavingLabel(t("submitting", "Submitting declaration..."));
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
      syncLocalStateFromContext(objData, t("submitted_success", "Declaration submitted successfully."));
      return true;
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_submit", "Unable to submit declaration."));
      return false;
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
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
    setStrSavingLabel(t("approving", "Approving declaration..."));
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
      setStrToast(t("approve_success", "Declaration approved successfully."));
      navigateAfterReviewAction(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_approve", "Unable to approve declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
    }
  }

  async function handleLockReview() {
    if (!blnCanLockCurrent) return;
    setStrSavingLabel(t("locking", "Locking declaration..."));
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.lock(intRouteDeclarationID, strRemarks);
      setStrToast(t("lock_success", "Declaration locked successfully."));
      navigateAfterReviewAction(false);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_lock", "Unable to lock declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
    }
  }

  async function handleReleaseReview() {
    if (!blnCanReleaseCurrent) return;
    setStrSavingLabel(t("releasing", "Releasing declaration..."));
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.release(intRouteDeclarationID, strRemarks);
      setStrToast(t("release_success", "Declaration released successfully."));
      navigateAfterReviewAction(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_release", "Unable to release declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
    }
  }

  async function handleDecisionReview() {
    if (!strReviewActionMode) return;
    setStrSavingLabel(t("rejecting", "Rejecting declaration..."));
    setBlnSaving(true);
    setStrError("");
    try {
      await waitForNextPaint();
      await hrFlexiDeclarationReviewService.reject(intRouteDeclarationID, strRemarks);
      setStrToast(t("reject_success", "Declaration rejected."));
      setStrReviewActionMode(null);
      navigateAfterReviewAction(true);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("unable_update", "Unable to update declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("processing", "Processing declaration..."));
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
            {blnChecked ? t("yes", "Yes") : t("no", "No")}
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
          <MenuItem value="">{t("select", "Select")}</MenuItem>
          {lstOptions.map((objOption) => (
            <MenuItem key={objOption.strValue} value={objOption.strValue}>
              {translateKnownFlexiText(objOption.strLabel)}
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
    return <BlockingLoader blnOpen strLabel={t("loading_details", "Loading flexi declaration details...")} />;
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
      {blnAllocationExceeded ? <Alert severity="error">{t("amount_exceeds_basket", "Declared flexi amount exceeds the available basket.")}</Alert> : null}
      {lstValidationMessages.map((strMessage) => (
        <Alert key={strMessage} severity="warning">{strMessage}</Alert>
      ))}
      {objContext?.blnHasHiddenComponents ? (
        <Alert severity="info">{t("hidden_components_info", "Some components are hidden because eligibility conditions are not met.")}</Alert>
      ) : null}
      {blnReviewEntryMode && blnShowReviewReadOnlyNotice ? (
        <Alert
          severity="info"
          action={(
            <IconButton
              aria-label={t("close_review_notice", "Close review notice")}
              color="inherit"
              size="small"
              onClick={() => setBlnShowReviewReadOnlyNotice(false)}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        >
          {t("review_read_only_notice", "Approval Review: declaration amount fields are read-only here unless HR override is explicitly supported.")}
        </Alert>
      ) : null}
      {!blnShowWorkflowActions && strNormalizedWorkflowStatus === "submitted" ? (
        <Alert severity="info">{t("submitted_preview_notice", "Submitted values are shown for preview. Payroll should use approved or locked values after approval.")}</Alert>
      ) : null}
      {blnShowWorkflowActions && blnShowReviewActionNotice ? (
        <Alert
          severity="info"
          action={(
            <IconButton
              aria-label={t("close_review_notice", "Close review notice")}
              color="inherit"
              size="small"
              onClick={() => setBlnShowReviewActionNotice(false)}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )}
        >
          {t("review_action_notice", "Approval Review: use Approve, Reject, Lock or Release based on the declaration status.")}
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
              {objContext?.objEmployeeSummary?.strEmployeeName || t("employee", "Employee")}
            </Typography>
            <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.82rem" }}>
              {objContext?.objEmployeeSummary?.strEmployeeCode || "-"} | {t("fy", "FY")} {strActiveFinancialYearCode} | {strPageModeLabel} | {t("current_status", "Current Status")} {formatTranslatedStatus(strWorkflowStatus)} | {t("it_regime", "IT Regime")} {strSelectedTaxRegimeLabel}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatTranslatedStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              sx={objHeaderActionButtonSx}
              onClick={() => objRouter.push(strBackPath)}
            >
              {t("back", "Back")}
            </Button>
            {!blnShowWorkflowActions && blnShowEssDraftAction ? (
              <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnCanSaveDraft} onClick={() => void handleSaveDraft()}>
                {t("draft_button", "Draft")}
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
                {lstEssResubmittableWorkflowStatuses.includes(strNormalizedWorkflowStatus) ? t("resubmit", "Resubmit") : t("submit", "Submit")}
              </Button>
            ) : null}
            {blnShowWorkflowActions ? (
              <>
                <Button size="small" variant="outlined" color="error" disabled={!blnCanRejectCurrent || blnSaving} onClick={() => setStrReviewActionMode("reject")}>
                  {t("reject", "Reject")}
                </Button>
                {blnCanReleaseCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving} sx={objHeaderActionButtonSx} onClick={() => void handleReleaseReview()}>
                    {t("release", "Release")}
                  </Button>
                ) : null}
                {blnCanLockCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving} sx={objHeaderActionButtonSx} onClick={() => void handleLockReview()}>
                    {t("lock", "Lock")}
                  </Button>
                ) : null}
                {blnCanApproveCurrent ? (
                  <Button size="small" variant="outlined" disabled={blnSaving || blnAllocationExceeded} sx={objHeaderActionButtonSx} onClick={() => void handleApproveReview()}>
                    {t("approve", "Approve")}
                  </Button>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))", lg: "repeat(7, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #2563eb" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("mode", "Mode")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{strPageModeLabel}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #2563eb" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("current_status", "Current Status")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatTranslatedStatus(strWorkflowStatus)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #0d9488" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("flexi_basket_available", "Flexi Basket Available")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #d97706" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("declared_flexi", "Declared Flexi")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #db2777" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("residual_taxable_balance", "Residual Taxable Balance")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #7c3aed" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("assigned_salary_structure", "Assigned Salary Structure")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{objContext?.objAssignedStructure?.strStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 0.7, borderRadius: "10px", borderLeft: "3px solid #f59e0b" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.68rem" }}>{t("tax_regime", "Tax Regime")}</Typography>
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
                  <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>{t("eligibility_questions", "Eligibility Questions")}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.72rem", mt: 0.1 }}>
                    {t("eligibility_help", "Components are enabled from the selected IT regime. Related questions remain available for eligible components.")}
                  </Typography>
                </Box>
                {lstAllEligibilityQuestions.length > intEligibilityPreviewLimit ? (
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => setBlnEligibilityDialogOpen(true)}
                    sx={{ alignSelf: { xs: "flex-start", md: "center" }, backgroundColor: "#2563eb", "&:hover": { backgroundColor: "#1d4ed8" } }}
                  >
                    {t("show_more", "Show More")}
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
                <Typography sx={{ fontWeight: 900, color: "#172554", fontSize: "0.95rem" }}>{t("salary_impact_summary", "Salary Impact Summary")}</Typography>
                <Tooltip title={t("salary_impact_tooltip", "This is an estimate. Final payroll impact will be based on approved declaration and payroll processing.")} enterTouchDelay={0}>
                  <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16, cursor: "pointer" }} />
                </Tooltip>
              </Stack>

              <Stack spacing={0.9}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("annual_ctc", "Annual CTC")}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decAnnualCtc, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("gross_monthly", "Gross Monthly")}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decGrossMonthly, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("flexi_basket_available", "Flexi Basket Available")}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("declared_flexi", "Declared Flexi")}</Typography>
                  <Typography sx={{ color: blnAllocationExceeded ? "#dc2626" : "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>
                    {formatCurrency(decDeclaredAnnual, strCurrencyCode)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("residual_taxable_balance", "Residual Taxable Balance")}</Typography>
                  <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("residual_component", "Residual Component")}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem", textAlign: "right" }}>{strResidualComponentName}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("monthly_driver_salary", "Monthly Driver Salary")}</Typography>
                  <Typography sx={{ color: "#0f172a", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decDeclaredMonthly, strCurrencyCode)}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>{t("monthly_residual_taxable", "Monthly Residual Taxable")}</Typography>
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
            <DialogTitle>{t("all_eligibility_questions", "All Eligibility Questions")}</DialogTitle>
            <DialogContent dividers sx={{ p: 1.25 }}>
              <Box sx={{ display: "grid", gap: 1 }}>
                {renderEligibilityQuestionGroups(dicQuestionGroups)}
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 1 }}>
              <Button onClick={() => setBlnEligibilityDialogOpen(false)}>{t("close", "Close")}</Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={blnSubmitDialogOpen}
            onClose={() => (blnSaving ? null : setBlnSubmitDialogOpen(false))}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>{t("confirm_submission", "Confirm Declaration Submission")}</DialogTitle>
            <DialogContent dividers sx={{ p: 1.5 }}>
              <Stack spacing={1.25}>
                {strError ? <Alert severity="error">{strError}</Alert> : null}
                <Alert severity="info">
                  {t("submission_info", "Please review your declared amounts before submitting. Once submitted, the declaration moves for approval and cannot be edited unless it is returned, released, or rejected back to you.")}
                </Alert>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${t("declared_flexi", "Declared Flexi")}: ${formatCurrency(decDeclaredAnnual, strCurrencyCode)}`} />
                  <Chip label={`${t("residual_taxable_balance", "Residual Taxable Balance")}: ${formatCurrency(decResidualAnnual, strCurrencyCode)}`} />
                </Stack>
                <Typography sx={{ fontWeight: 800, fontSize: "0.85rem" }}>{t("declaration_remarks", "Declaration Remarks")}</Typography>
                <TextField
                  multiline
                  minRows={3}
                  value={strRemarks}
                  onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
                  disabled={blnSaving}
                  placeholder={t("optional_remarks", "Optional remarks for this submission")}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 1.5, py: 1 }}>
              <Button onClick={() => setBlnSubmitDialogOpen(false)} disabled={blnSaving}>{t("cancel", "Cancel")}</Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<SendRoundedIcon />}
                disabled={blnSaving}
                onClick={() => void handleConfirmSubmit()}
              >
                {lstEssResubmittableWorkflowStatuses.includes(strNormalizedWorkflowStatus) ? t("confirm_resubmit", "Confirm Resubmit") : t("confirm_submit", "Confirm Submit")}
              </Button>
          </DialogActions>
          </Dialog>

          <Dialog
            open={Boolean(strReviewActionMode)}
            onClose={() => (blnSaving ? null : setStrReviewActionMode(null))}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>{t("reject_dialog_title", "Reject Declaration")}</DialogTitle>
            <DialogContent dividers sx={{ p: 1.5 }}>
              <Stack spacing={1.25}>
                <Typography sx={{ mb: 0.25 }}>{t("reviewer_remarks_hint", "Reviewer remarks will be saved on the declaration.")}</Typography>
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
              <Button onClick={() => setStrReviewActionMode(null)} disabled={blnSaving}>{t("cancel", "Cancel")}</Button>
              <Button variant="contained" onClick={() => void handleDecisionReview()} disabled={blnSaving || !strRemarks.trim()}>
                {t("confirm", "Confirm")}
              </Button>
            </DialogActions>
          </Dialog>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>{t("eligible_flexi_components", "Eligible Flexi Components")}</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    {t("components_help", "Annual Cap is entitlement only. Monthly Impact is always based on Declared Annual divided by 12.")}
                  </Typography>
                </Box>
                <Chip label={`${intEligibleFlexiComponentCount} ${t("eligible_total", "eligible")} / ${lstDisplayedRows.length} ${t("total", "total")}`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
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
                  <col style={{ width: 196 }} />
                  <col style={{ width: 92 }} />
                  <col style={{ width: 252 }} />
                </colgroup>
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#ffffff" }}>
                  <TableRow>
                    <TableCell>{t("component", "Component")}</TableCell>
                    <TableCell>{t("eligibility", "Eligibility")}</TableCell>
                    <TableCell>{t("regime", "Regime")}</TableCell>
                    <TableCell align="right">{t("annual_cap", "Annual Cap")}</TableCell>
                    <TableCell align="right">{t("declared_annual", "Declared Annual")}</TableCell>
                    <TableCell align="right">{t("monthly_impact", "Monthly Impact")}</TableCell>
                    <TableCell>{t("proof", "Proof")}</TableCell>
                    <TableCell>{t("status", "Status")}</TableCell>
                    <TableCell>{t("reason_action", "Reason / Action")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstDisplayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                        {t("no_components_available", "No flexi components are available.")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    lstDisplayedRows.map((objDisplayRow) => {
                      const objRow = objDisplayRow.objSelectedLine;
                      const objEligibilityChip = getTranslatedEligibilityChipConfig(objRow);
                      return (
                        <TableRow key={objDisplayRow.intRowKey}>
                          <TableCell>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.73rem", lineHeight: 1.15 }}>
                              {translateKnownFlexiText(objRow.strComponentName || objRow.strComponentCode) || t("component", "Component")}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                color={objEligibilityChip.strColor}
                                label={objEligibilityChip.strLabel}
                                sx={{
                                  minWidth: getEligibilityState(objRow) === "not_eligible" ? 96 : 82,
                                  height: 22,
                                  maxWidth: "none",
                                  "& .MuiChip-label": { px: 0.85, overflow: "visible", textOverflow: "clip", whiteSpace: "nowrap" },
                                }}
                              />
                              {objDisplayRow.decMultiplier > 1 ? (
                                <Typography sx={{ color: "#475569", fontSize: "0.68rem" }}>
                                  {t("multiplier", "Multiplier")} x {objDisplayRow.decMultiplier}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={getTranslatedRegimeLabel(getComponentRegimeDisplayLabel(objRow))}
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
                          <TableCell>
                            {objRow.blnProofRequired ? (
                              <Stack spacing={0.45} sx={{ minWidth: 0 }}>
                                <Chip
                                  size="small"
                                  color={dicProofFiles[objRow.intSalaryComponentID] ? "success" : "warning"}
                                  variant={dicProofFiles[objRow.intSalaryComponentID] ? "filled" : "outlined"}
                                  label={dicProofFiles[objRow.intSalaryComponentID] ? t("proof_uploaded", "Proof Uploaded") : t("proof_required", "Proof Required")}
                                  sx={{ alignSelf: "flex-start", maxWidth: "100%" }}
                                />
                                {dicProofFiles[objRow.intSalaryComponentID]?.strFileName ? (
                                  <Typography sx={{ color: "#64748b", fontSize: "0.62rem", lineHeight: 1.15, wordBreak: "break-word" }}>
                                    {dicProofFiles[objRow.intSalaryComponentID]?.strFileName}
                                    {dicProofFiles[objRow.intSalaryComponentID]?.intFileSizeBytes
                                      ? ` (${formatFileSize(dicProofFiles[objRow.intSalaryComponentID]?.intFileSizeBytes)})`
                                      : ""}
                                  </Typography>
                                ) : null}
                                {objRow.decInputAnnual > 0 && !dicProofFiles[objRow.intSalaryComponentID] ? (
                                  <Typography sx={{ color: "#dc2626", fontSize: "0.62rem", lineHeight: 1.15 }}>
                                    {t("proof_mandatory_before_save", "Upload proof before saving this declaration.")}
                                  </Typography>
                                ) : null}
                                {blnCanEditDeclaration ? (
                                  <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<UploadFileRoundedIcon />}
                                      onClick={() => openProofPicker(objRow.intSalaryComponentID)}
                                      controlId={`flexi-proof.upload.${objRow.intSalaryComponentID}.button`}
                                      sx={{ minWidth: 0, px: 0.8, py: 0.15, fontSize: "0.62rem", textTransform: "none" }}
                                    >
                                      {dicProofFiles[objRow.intSalaryComponentID] ? t("replace", "Replace") : t("upload", "Upload")}
                                    </Button>
                                    {dicProofFiles[objRow.intSalaryComponentID] ? (
                                      <Button
                                        size="small"
                                        color="error"
                                        onClick={() => handleClearProofFile(objRow.intSalaryComponentID)}
                                        controlId={`flexi-proof.clear.${objRow.intSalaryComponentID}.button`}
                                        sx={{ minWidth: 0, px: 0.6, py: 0.15, fontSize: "0.62rem", textTransform: "none" }}
                                      >
                                        {t("remove", "Remove")}
                                      </Button>
                                    ) : null}
                                    <input
                                      ref={(objElement) => {
                                        dicProofInputRefs.current[objRow.intSalaryComponentID] = objElement;
                                      }}
                                      type="file"
                                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                      style={{ display: "none" }}
                                      data-controlid={`flexi-proof.file.${objRow.intSalaryComponentID}.input`}
                                      onChange={(objEvent) => void handleProofFileSelected(objRow.intSalaryComponentID, objEvent.target.files?.[0] || null)}
                                    />
                                  </Stack>
                                ) : null}
                              </Stack>
                            ) : (
                              t("no", "No")
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={objRow.strDeclarationItemStatus ? formatTranslatedStatus(objRow.strDeclarationItemStatus) : t("draft", "Draft")}
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
                                {translateKnownFlexiText(getTranslatedLineReasonText(objRow))}
                              </Typography>
                              <IconButton
                                size="small"
                                disabled={!blnCanEditDeclaration || Number(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? 0) <= 0 || blnSaving}
                                onClick={() => handleClearFlexiComponent(objDisplayRow.intRowKey)}
                                sx={{ color: "#dc2626", flex: "0 0 auto", p: 0.35 }}
                                aria-label={`${t("clear_component_amount", "Clear component amount")}: ${translateKnownFlexiText(objRow.strComponentName || objRow.strComponentCode) || t("component", "component")}`}
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
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{t("fixed_salary_components", "Fixed Salary Components")}</Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem", verticalAlign: "top" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("component", "Component")}</TableCell>
                      <TableCell align="right">{t("annual", "Annual")}</TableCell>
                      <TableCell align="right">{t("monthly", "Monthly")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lstFixedSalaryRows.map((objRow) => (
                      <TableRow key={objRow.strLabel}>
                        <TableCell>{translateKnownFlexiText(objRow.strLabel)}</TableCell>
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
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>{t("estimated_salary_split", "Estimated Salary Split After Declaration")}</Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem", verticalAlign: "top" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t("bucket", "Bucket")}</TableCell>
                      <TableCell align="right">{t("annual", "Annual")}</TableCell>
                      <TableCell align="right">{t("monthly", "Monthly")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { strLabel: t("declared_flexi", "Declared Flexi"), decAnnual: decDeclaredAnnual },
                      { strLabel: t("residual_taxable_balance", "Residual Taxable Balance"), decAnnual: decResidualAnnual },
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
                  {t("salary_impact_tooltip", "This is an estimate. Final payroll impact will be based on approved declaration and payroll processing.")}
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
