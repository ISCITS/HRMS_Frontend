"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
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
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import BlockingLoader from "@/components/shared/BlockingLoader";
import {
  flexiPayDeclarationService,
  type FlexiDeclarationContextRecord,
  type FlexiDeclarationLineRecord,
  type FlexiEligibilityQuestionRecord,
} from "@/features/flexi-pay-declaration/services/flexiPayDeclarationService";

type DraftInputMap = Record<number, string>;
type EligibilityAnswerMap = Record<string, string | number | boolean | null>;
type ComponentSelectionMap = Record<number, number>;
type LinkedQuestionSelectionMap = Record<number, string>;
const intEligibilityPreviewLimit = 6;

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

function getStatusTone(strStatus?: string | null): "default" | "success" | "warning" | "error" {
  const strValue = normalizeText(strStatus);
  if (["approved", "locked"].includes(strValue)) return "success";
  if (["submitted"].includes(strValue)) return "warning";
  if (["rejected", "returned", "cancelled"].includes(strValue)) return "error";
  return "default";
}

function getSnapshotNumber(objSnapshot: Record<string, unknown> | null | undefined, lstKeys: string[]) {
  for (const strKey of lstKeys) {
    const decValue = Number(objSnapshot?.[strKey]);
    if (Number.isFinite(decValue)) return decValue;
  }
  return null;
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

function buildInitialDraftInputs(objContext: FlexiDeclarationContextRecord) {
  return (objContext.lstDeclarationLines || []).reduce<DraftInputMap>((dicAcc, objLine) => {
    dicAcc[objLine.intSalaryComponentID] = String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0);
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
  const decMultiplier = getRowEffectiveMultiplier(objRow);
  if (decMultiplier <= 1) {
    return String(decStoredAnnual);
  }
  return String(decStoredAnnual / decMultiplier);
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

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const strFinancialYearCode = getCurrentFinancialYearCode();
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
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(() => buildFallbackContext(strFinancialYearCode));
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>(() => buildInitialDraftInputs(buildFallbackContext(strFinancialYearCode)));
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<EligibilityAnswerMap>({});
  const [dicSelectedComponents, setDicSelectedComponents] = useState<ComponentSelectionMap>({});
  const [dicSelectedQuestions, setDicSelectedQuestions] = useState<LinkedQuestionSelectionMap>({});
  const [blnEligibilityDialogOpen, setBlnEligibilityDialogOpen] = useState(false);
  const [blnSubmitDialogOpen, setBlnSubmitDialogOpen] = useState(false);

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
      const objData = await flexiPayDeclarationService.getCurrentDeclaration(strFinancialYearCode);
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
  }, [strFinancialYearCode, syncLocalStateFromContext]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const strWorkflowStatus = objContext?.objDeclaration?.strWorkflowStatus || objContext?.declaration_status || "draft";
  const blnWorkflowEditable = ["draft", "returned", "rejected"].includes(normalizeText(strWorkflowStatus));
  const blnCanEditDeclaration = Boolean(blnWorkflowEditable && objContext?.blnCanDeclare);
  const strCurrencyCode = objContext?.objAssignedStructure?.strCurrencyCode || "INR";

  const lstRows = useMemo<EvaluatedLineRecord[]>(() => {
    return (objContext?.lstDeclarationLines || []).map((objLine) => {
      const decInputAnnual = normalizeAmount(
        dicDraftInputs[objLine.intSalaryComponentID] ?? String(objLine.decDraftDeclaredAnnual ?? objLine.decAllocationAnnual ?? 0),
      );
      const decEffectiveAnnualCap = Number(objLine.decEffectiveAnnualCap ?? objLine.decAnnualLimit ?? 0);
      let strValidationMessage = "";
      if (objLine.blnEligible === false && decInputAnnual > 0) {
        strValidationMessage = objLine.strEligibilityReason || "This component is not eligible.";
      } else if (decEffectiveAnnualCap > 0 && decInputAnnual > decEffectiveAnnualCap) {
        strValidationMessage = "Declared amount cannot exceed annual cap.";
      }
      return {
        ...objLine,
        decInputAnnual,
        decDisplayMonthly: decInputAnnual / 12,
        strValidationMessage,
      };
    });
  }, [dicDraftInputs, objContext?.lstDeclarationLines]);

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
    });
  }, [dicDraftInputs, dicEligibilityQuestionByCode, dicSelectedComponents, dicSelectedQuestions, dicSelectableRowByID, lstSelectableRows]);

  const setSelectedComponentIDs = useMemo(
    () => new Set(lstDisplayedRows.map((objRow) => objRow.objSelectedLine.intSalaryComponentID)),
    [lstDisplayedRows],
  );

  const objSalaryImpactSummary = objContext?.salary_impact_summary || null;
  const decBasketAnnual = Number(
    objSalaryImpactSummary?.decFlexiBasketAvailableAnnual
      ?? objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual
      ?? 0,
  );
  const decDeclaredAnnual = Number(
    objSalaryImpactSummary?.decDeclaredFlexiAnnual
      ?? lstDisplayedRows.reduce((decTotal, objRow) => decTotal + objRow.objSelectedLine.decInputAnnual, 0),
  );
  const decResidualAnnual = Number(
    objSalaryImpactSummary?.decResidualTaxableBalanceAnnual
      ?? Math.max(decBasketAnnual - decDeclaredAnnual, 0),
  );
  const decAnnualCtc = Number(
    (
      objSalaryImpactSummary?.decAnnualCtc
      ?? getSnapshotNumber(objContext?.objCurrentSalarySnapshot as Record<string, unknown> | null | undefined, ["decCtcAnnual"])
      ?? 0
    ),
  );
  const decGrossMonthly = Number(
    (
      objSalaryImpactSummary?.decGrossMonthly
      ?? getSnapshotNumber(objContext?.objCurrentSalarySnapshot as Record<string, unknown> | null | undefined, ["decGrossMonthly"])
      ?? 0
    ),
  );
  const decEstimatedMonthlyPayrollImpact = Number(objSalaryImpactSummary?.decEstimatedMonthlyPayrollImpact ?? decDeclaredAnnual / 12);
  const intEligibleFlexiComponentCount = lstDisplayedRows.filter((objRow) => objRow.objSelectedLine.blnEligible !== false).length;
  const blnAllocationExceeded = decDeclaredAnnual > decBasketAnnual;
  const blnHasRowValidationErrors = lstDisplayedRows.some((objRow) => Boolean(objRow.objSelectedLine.strValidationMessage));
  const blnHasEligibilityAnswerValues = hasAnyEligibilityAnswers(dicEligibilityAnswers);
  const lstValidationMessages = objContext?.validation_messages || [];
  const strResidualComponentName = objSalaryImpactSummary?.objResidualComponent?.strComponentName
    || objContext?.objFlexiAllocation?.strResidualComponentName
    || "-";

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
    blnCanEditDeclaration
    && !blnSaving
    && !blnEvaluating
    && !blnAllocationExceeded
    && !blnHasRowValidationErrors
    && (lstPayloadRows.length > 0 || blnHasEligibilityAnswerValues || strRemarks.trim().length > 0),
  );
  const blnCanSubmit = Boolean(
    blnCanEditDeclaration
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

    return Object.entries(dicGroups).map(([strGroupCode, objGroup], intGroupIndex) => {
      const { strAccent, strTint } = LST_GROUP_ACCENT_PALETTE[intGroupIndex % LST_GROUP_ACCENT_PALETTE.length];
      return (
        <Box key={strGroupCode}>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.65 }}>
            {getQuestionIcon(strGroupCode, strAccent)}
            <Typography sx={{ fontWeight: 800, fontSize: "0.82rem", color: strAccent }}>
              {objGroup.strGroupLabel}:
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gap: 0.75,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
                lg: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            {objGroup.lstQuestions.map((objQuestion) => {
              const objLabelBlock = (
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={0.45} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.73rem", lineHeight: 1.2 }}>
                      {objQuestion.strQuestionLabel}
                      {objQuestion.blnIsRequired ? " *" : ""}
                    </Typography>
                    {objQuestion.blnShowInfoIcon ? (
                      <Tooltip title={objQuestion.strInfoMessage || objQuestion.strDisabledReason || "This question cannot be edited."} enterTouchDelay={0}>
                        <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 14, cursor: "pointer", flexShrink: 0, mt: 0.05 }} />
                      </Tooltip>
                    ) : null}
                  </Stack>
                  {objQuestion.strHelpText ? (
                    <Typography sx={{ color: "#64748b", fontSize: "0.64rem", mt: 0.18, lineHeight: 1.15 }}>
                      {objQuestion.strHelpText}
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
                    border: "1px solid #dbe3ef",
                    borderLeft: `3px solid ${strAccent}`,
                    backgroundColor: strTint,
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
    });
  }

  useEffect(() => {
    if (blnLoading || !objContext?.blnCanDeclare || !blnWorkflowEditable) return;
    if (strCurrentSignature === strLastSyncedSignatureRef.current) return;
    if (strCurrentSignature === strLastEvaluatedSignatureRef.current) return;

    const strEvaluationSignature = strCurrentSignature;
    const intSequence = ++intEvaluateSequenceRef.current;
    const intTimer = window.setTimeout(async () => {
      setBlnEvaluating(true);
      try {
        const objData = await flexiPayDeclarationService.evaluate(
          strFinancialYearCode,
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
    blnWorkflowEditable,
    strCurrentSignature,
    strFinancialYearCode,
    strRemarks,
  ]);

  useEffect(() => {
    if (blnLoading || blnSaving || !objContext?.objDeclaration?.intDeclarationID || !blnWorkflowEditable) return;
    if (strCurrentSignature === strLastAutoSavedSignatureRef.current) return;
    if (lstPayloadRows.length === 0 && !blnHasEligibilityAnswerValues && strRemarks.trim().length === 0) return;

    const intTimer = window.setTimeout(async () => {
      try {
        await flexiPayDeclarationService.saveDraft(
          strFinancialYearCode,
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
    blnWorkflowEditable,
    strCurrentSignature,
    strFinancialYearCode,
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
      setStrError("Fix declaration validation issues before continuing.");
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
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.saveDraft(
        strFinancialYearCode,
        lstPayloadRows,
        strRemarks,
        dicEligibilityAnswers,
      );
      syncLocalStateFromContext(objData, "Draft saved successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save draft.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleSubmit(): Promise<boolean> {
    if (!validateDeclarationForAction("submit")) return false;
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.submit(
        strFinancialYearCode,
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
    }
  }

  async function handleConfirmSubmit() {
    const blnSuccess = await handleSubmit();
    if (blnSuccess) {
      setBlnSubmitDialogOpen(false);
    }
  }

  function renderQuestionInput(objQuestion: FlexiEligibilityQuestionRecord) {
    const strQuestionCode = objQuestion.strQuestionCode;
    const objValue = dicEligibilityAnswers[strQuestionCode] ?? objQuestion.objAnswerValue ?? null;
    const blnDisabled = !blnCanEditDeclaration || blnSaving || objQuestion.blnIsDisabled === true || objQuestion.blnIsEmployeeEditable === false;

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
          onChange={(objEvent) =>
            setDicEligibilityAnswers((dicPrevious) => ({
              ...dicPrevious,
              [strQuestionCode]: objEvent.target.value === "" ? null : Number(objEvent.target.value),
            }))
          }
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
      {strError ? <Alert severity="error">{strError}</Alert> : null}
      {objContext?.strIneligibilityReason && !objContext.blnCanDeclare ? (
        <Alert severity="info">{objContext.strIneligibilityReason}</Alert>
      ) : null}
      {!blnWorkflowEditable && objContext?.blnCanDeclare ? (
        <Alert severity="info">This declaration is in view-only mode.</Alert>
      ) : null}
      {blnAllocationExceeded ? <Alert severity="error">Declared flexi amount exceeds the available basket.</Alert> : null}
      {lstValidationMessages.map((strMessage) => (
        <Alert key={strMessage} severity="warning">{strMessage}</Alert>
      ))}
      {objContext?.blnHasHiddenComponents ? (
        <Alert severity="info">Some components are hidden because eligibility conditions are not met.</Alert>
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
              {objContext?.objEmployeeSummary?.strEmployeeCode || "-"} | FY {strFinancialYearCode} | Current Status {formatStatus(strWorkflowStatus)}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip label={formatStatus(strWorkflowStatus)} color={getStatusTone(strWorkflowStatus)} />
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.72)", "&:hover": { borderColor: "#ffffff", backgroundColor: "rgba(255,255,255,0.1)" } }}
              onClick={() => objRouter.push("/salary/flexi-pay-declarations")}
            >
              Back
            </Button>
            {blnCanEditDeclaration ? (
              <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={blnSaving} onClick={() => void handleSaveDraft()}>
                Save Draft
              </Button>
            ) : null}
            {blnCanEditDeclaration ? (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={<SendRoundedIcon />}
                disabled={blnSaving}
                onClick={() => {
                  if (validateDeclarationForAction("submit")) {
                    setStrError("");
                    setBlnSubmitDialogOpen(true);
                  }
                }}
              >
                {normalizeText(strWorkflowStatus) === "returned" ? "Resubmit" : "Submit"}
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 0.75, gridTemplateColumns: { xs: "1fr", md: "repeat(5, minmax(0, 1fr))" } }}>
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
      </Box>

      <Stack spacing={1.2}>
        <Box sx={{ display: "grid", gap: 1.2, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 0.75, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={0.75} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>Basic Eligibility Details</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.72rem", mt: 0.1 }}>
                    Answer these basic details first. Your responses decide which flexi components become eligible in the declaration table below.
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
                  <Typography sx={{ color: "#172554", fontWeight: 800, fontSize: "0.78rem" }}>Estimated Monthly Payroll Impact</Typography>
                  <Typography sx={{ color: "#059669", fontWeight: 900, fontSize: "0.8rem" }}>{formatCurrency(decEstimatedMonthlyPayrollImpact, strCurrencyCode)}</Typography>
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
            <DialogTitle>All Basic Eligibility Details</DialogTitle>
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
                  Please review your declared amounts before submitting. Once submitted, the declaration moves for approval and cannot be edited unless it is returned.
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
                {normalizeText(strWorkflowStatus) === "returned" ? "Confirm Resubmit" : "Confirm Submit"}
              </Button>
            </DialogActions>
          </Dialog>

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Eligible Flexi Components</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    Declare amount only for the components that become eligible from the basic details above.
                  </Typography>
                </Box>
                <Chip label={`${intEligibleFlexiComponentCount} eligible / ${lstDisplayedRows.length} total`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" sx={{ tableLayout: "fixed", "& .MuiTableCell-root": { py: 0.45, px: 0.7, fontSize: "0.7rem", verticalAlign: "top" }, "& .MuiTableHead-root .MuiTableCell-root": { py: 0.65, fontWeight: 700, whiteSpace: "nowrap", fontSize: "0.68rem" } }}>
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "#ffffff" }}>
                  <TableRow>
                    <TableCell>Component</TableCell>
                    <TableCell>Eligibility</TableCell>
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
                      <TableCell colSpan={8} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                        No flexi components are available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lstDisplayedRows.map((objDisplayRow) => {
                      const objRow = objDisplayRow.objSelectedLine;
                      return (
                        <TableRow key={objDisplayRow.intRowKey}>
                          <TableCell sx={{ width: 160, minWidth: 160 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "0.73rem", lineHeight: 1.15 }}>
                              {objRow.strComponentName || objRow.strComponentCode || "Component"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                color={objRow.blnEligible === false ? "default" : "success"}
                                label={objRow.blnEligible === false ? "Not Eligible" : "Eligible"}
                              />
                              {objDisplayRow.decMultiplier > 1 ? (
                                <Typography sx={{ color: "#475569", fontSize: "0.68rem" }}>
                                  Multiplier x {objDisplayRow.decMultiplier}
                                </Typography>
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit, strCurrencyCode)}
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="number"
                              value={objDisplayRow.strDisplayedAmount}
                              disabled={!blnCanEditDeclaration || objRow.blnEligible === false || blnSaving}
                              error={Boolean(objRow.strValidationMessage)}
                              helperText={objRow.strValidationMessage || (objDisplayRow.decMultiplier > 1 ? `Per unit x ${objDisplayRow.decMultiplier} = ${formatCurrency(objRow.decInputAnnual, strCurrencyCode)}` : " ")}
                              onChange={(objEvent) =>
                                setDicDraftInputs((dicPrevious) => ({
                                  ...dicPrevious,
                                  [objRow.intSalaryComponentID]: String(normalizeAmount(objEvent.target.value) * objDisplayRow.decMultiplier),
                                }))
                              }
                              inputProps={{ min: 0, max: objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? undefined }}
                              sx={{ width: 92, "& .MuiInputBase-root": { fontSize: "0.7rem", height: 32 }, "& .MuiFormHelperText-root": { fontSize: "0.58rem", mt: 0.2, lineHeight: 1.05 } }}
                            />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(objRow.decDisplayMonthly, strCurrencyCode)}</TableCell>
                          <TableCell>{objRow.blnProofRequired ? "Required" : "Not Required"}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={objRow.strDeclarationItemStatus ? formatStatus(objRow.strDeclarationItemStatus) : "Draft"}
                              color={getStatusTone(objRow.strDeclarationItemStatus)}
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                              <Typography sx={{ color: "#64748b", fontSize: "0.6rem", lineHeight: 1.15, maxWidth: 118, flex: 1, overflow: "hidden" }}>
                                {objRow.strEligibilityReason || "-"}
                              </Typography>
                              <IconButton
                                size="small"
                                disabled={!blnCanEditDeclaration || objRow.blnEligible === false || blnSaving}
                                onClick={() => handleClearFlexiComponent(objDisplayRow.intRowKey)}
                                sx={{ color: "#dc2626" }}
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
                    {[
                      { strLabel: "Annual CTC", decAnnual: decAnnualCtc },
                      { strLabel: "Gross Monthly", decAnnual: decGrossMonthly * 12 },
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

      <Snackbar open={Boolean(strToast)} autoHideDuration={2500} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
