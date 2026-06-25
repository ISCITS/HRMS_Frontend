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
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
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

function getQuestionIcon(strGroupCode?: string | null) {
  const strCode = normalizeText(strGroupCode);
  if (strCode.includes("vehicle")) return <DirectionsCarFilledRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />;
  if (strCode.includes("family")) return <FamilyRestroomRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />;
  if (strCode.includes("meal")) return <LunchDiningRoundedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />;
  return <QuizOutlinedIcon sx={{ color: "#0f4c81", fontSize: 18 }} />;
}

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

type EvaluatedLineRecord = FlexiDeclarationLineRecord & {
  decInputAnnual: number;
  decDisplayMonthly: number;
  strValidationMessage?: string;
};

export default function FlexiPayDeclarationPage() {
  const objRouter = useRouter();
  const strFinancialYearCode = getCurrentFinancialYearCode();
  const intLoadSequenceRef = useRef(0);
  const intEvaluateSequenceRef = useRef(0);
  const strLastSyncedSignatureRef = useRef("");
  const strLastAutoSavedSignatureRef = useRef("");

  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [blnEvaluating, setBlnEvaluating] = useState(false);
  const [strError, setStrError] = useState("");
  const [strToast, setStrToast] = useState("");
  const [strRemarks, setStrRemarks] = useState("");
  const [objContext, setObjContext] = useState<FlexiDeclarationContextRecord | null>(() => buildFallbackContext(strFinancialYearCode));
  const [dicDraftInputs, setDicDraftInputs] = useState<DraftInputMap>(() => buildInitialDraftInputs(buildFallbackContext(strFinancialYearCode)));
  const [dicEligibilityAnswers, setDicEligibilityAnswers] = useState<EligibilityAnswerMap>({});

  const syncLocalStateFromContext = useCallback((objData: FlexiDeclarationContextRecord, strMessage?: string) => {
    setObjContext(objData);
    const dicNextDraftInputs = buildInitialDraftInputs(objData);
    const dicNextAnswers = buildAnswerMap(objData);
    const strNextRemarks = objData.objDeclaration?.strRemarks || "";
    setDicDraftInputs(dicNextDraftInputs);
    setDicEligibilityAnswers(dicNextAnswers);
    setStrRemarks(strNextRemarks);
    const strSignature = buildStateSignature(dicNextDraftInputs, dicNextAnswers, strNextRemarks);
    strLastSyncedSignatureRef.current = strSignature;
    strLastAutoSavedSignatureRef.current = strSignature;
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
  const blnCanWithdraw = normalizeText(strWorkflowStatus) === "submitted";
  const blnCanCancel = ["draft", "returned", "rejected"].includes(normalizeText(strWorkflowStatus));
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

  const objSalaryImpactSummary = objContext?.salary_impact_summary || null;
  const decBasketAnnual = Number(
    objSalaryImpactSummary?.decFlexiBasketAvailableAnnual
      ?? objContext?.objFlexiAllocation?.decFlexiBasketAvailableAnnual
      ?? 0,
  );
  const decDeclaredAnnual = Number(
    objSalaryImpactSummary?.decDeclaredFlexiAnnual
      ?? lstRows.reduce((decTotal, objRow) => decTotal + objRow.decInputAnnual, 0),
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
  const intEligibleFlexiComponentCount = lstRows.filter((objRow) => objRow.blnEligible !== false).length;
  const blnAllocationExceeded = decDeclaredAnnual > decBasketAnnual;
  const blnHasRowValidationErrors = lstRows.some((objRow) => Boolean(objRow.strValidationMessage));
  const blnCanAttemptSave = Boolean(blnCanEditDeclaration && !blnSaving && !blnEvaluating && !blnAllocationExceeded && !blnHasRowValidationErrors);
  const lstValidationMessages = objContext?.validation_messages || [];
  const strResidualComponentName = objSalaryImpactSummary?.objResidualComponent?.strComponentName
    || objContext?.objFlexiAllocation?.strResidualComponentName
    || "-";
  const intHistoryCount = Number(objContext?.history_count ?? (objContext?.objDeclaration ? 1 : 0));

  const strCurrentSignature = useMemo(
    () => buildStateSignature(dicDraftInputs, dicEligibilityAnswers, strRemarks),
    [dicDraftInputs, dicEligibilityAnswers, strRemarks],
  );

  const lstPayloadRows = useMemo(
    () =>
      lstRows
        .filter((objRow) => objRow.decInputAnnual > 0)
        .map((objRow) => ({
          intSalaryComponentID: objRow.intSalaryComponentID,
          decDeclaredAmountAnnual: objRow.decInputAnnual,
          strRemarks: objRow.strDeclarationItemRemarks || null,
        })),
    [lstRows],
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

  useEffect(() => {
    if (blnLoading || !objContext?.blnCanDeclare || !blnWorkflowEditable) return;
    if (strCurrentSignature === strLastSyncedSignatureRef.current) return;

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
    if (lstPayloadRows.length === 0) return;

    const intTimer = window.setTimeout(async () => {
      try {
        const objData = await flexiPayDeclarationService.saveDraft(
          strFinancialYearCode,
          lstPayloadRows,
          strRemarks,
          dicEligibilityAnswers,
        );
        syncLocalStateFromContext(objData);
      } catch {
        // Keep autosave silent; manual actions still surface errors.
      }
    }, 1400);

    return () => window.clearTimeout(intTimer);
  }, [
    blnLoading,
    blnSaving,
    dicEligibilityAnswers,
    lstPayloadRows,
    objContext?.objDeclaration?.intDeclarationID,
    blnWorkflowEditable,
    strCurrentSignature,
    strFinancialYearCode,
    strRemarks,
    syncLocalStateFromContext,
  ]);

  function validateDeclarationForAction() {
    if (lstRows.length === 0) {
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
    if (lstPayloadRows.length === 0) {
      setStrError("Enter a declared annual amount for at least one eligible flexi component.");
      return false;
    }
    return true;
  }

  function handleClearFlexiComponent(intSalaryComponentID: number) {
    setDicDraftInputs((dicPrevious) => ({
      ...dicPrevious,
      [intSalaryComponentID]: "0",
    }));
  }

  async function handleSaveDraft() {
    if (!validateDeclarationForAction()) return;
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

  async function handleSubmit() {
    if (!validateDeclarationForAction()) return;
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
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to submit declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleWithdraw() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.withdraw(strFinancialYearCode, strRemarks);
      syncLocalStateFromContext(objData, "Declaration withdrawn successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to withdraw declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  async function handleCancel() {
    setBlnSaving(true);
    setStrError("");
    try {
      const objData = await flexiPayDeclarationService.cancel(strFinancialYearCode, strRemarks);
      syncLocalStateFromContext(objData, "Declaration cancelled successfully.");
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to cancel declaration.");
    } finally {
      setBlnSaving(false);
    }
  }

  function renderQuestionInput(objQuestion: FlexiEligibilityQuestionRecord) {
    const strQuestionCode = objQuestion.strQuestionCode;
    const objValue = dicEligibilityAnswers[strQuestionCode] ?? objQuestion.objAnswerValue ?? null;
    const blnDisabled = !blnCanEditDeclaration || blnSaving;

    if (objQuestion.strAnswerType === "boolean") {
      return (
        <FormControlLabel
          sx={{ m: 0, justifyContent: "space-between", width: "100%" }}
          label=""
          control={(
            <Switch
              size="small"
              checked={Boolean(objValue)}
              disabled={blnDisabled}
              onChange={(objEvent) =>
                setDicEligibilityAnswers((dicPrevious) => ({
                  ...dicPrevious,
                  [strQuestionCode]: objEvent.target.checked,
                }))
              }
            />
          )}
        />
      );
    }

    if (objQuestion.strAnswerType === "select") {
      const lstOptions = normalizeSelectOptions(objQuestion.objOptionJson);
      return (
        <TextField
          select
          size="small"
          fullWidth
          value={objValue == null ? "" : String(objValue)}
          disabled={blnDisabled}
          onChange={(objEvent) =>
            setDicEligibilityAnswers((dicPrevious) => ({
              ...dicPrevious,
              [strQuestionCode]: objEvent.target.value || null,
            }))
          }
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
          fullWidth
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
        />
      );
    }

    return (
      <TextField
        size="small"
        fullWidth
        value={objValue == null ? "" : String(objValue)}
        disabled={blnDisabled}
        onChange={(objEvent) =>
          setDicEligibilityAnswers((dicPrevious) => ({
            ...dicPrevious,
            [strQuestionCode]: objEvent.target.value || null,
          }))
        }
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
      {blnEvaluating ? <Alert severity="info">Refreshing eligibility and salary impact preview...</Alert> : null}
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
            {blnCanCancel ? (
              <Button size="small" variant="outlined" sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.72)" }} disabled={blnSaving} onClick={() => void handleCancel()}>
                Cancel
              </Button>
            ) : null}
            {blnCanWithdraw ? (
              <Button size="small" variant="outlined" sx={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.72)" }} startIcon={<UndoRoundedIcon />} disabled={blnSaving} onClick={() => void handleWithdraw()}>
                Withdraw
              </Button>
            ) : null}
            <Button size="small" variant="contained" startIcon={<SaveRoundedIcon />} disabled={!blnCanAttemptSave} onClick={() => void handleSaveDraft()}>
              Save Draft
            </Button>
            <Button size="small" variant="contained" color="warning" startIcon={<SendRoundedIcon />} disabled={!blnCanAttemptSave} onClick={() => void handleSubmit()}>
              {normalizeText(strWorkflowStatus) === "returned" ? "Resubmit" : "Submit"}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(6, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Current Status</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatStatus(strWorkflowStatus)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Flexi Basket Available</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decBasketAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Declared Flexi</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decDeclaredAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Residual Taxable Balance</Typography>
          <Typography sx={{ fontWeight: 800 }}>{formatCurrency(decResidualAnnual, strCurrencyCode)}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>Assigned Salary Structure</Typography>
          <Typography sx={{ fontWeight: 800 }}>{objContext?.objAssignedStructure?.strSalaryStructureName || "-"}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.2, borderRadius: "12px" }}>
          <Typography sx={{ color: "#64748b", fontSize: "0.76rem" }}>History Count</Typography>
          <Typography sx={{ fontWeight: 800 }}>{intHistoryCount}</Typography>
        </Paper>
      </Box>

      <Box sx={{ display: "grid", gap: 1.2, alignItems: "start", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 340px" } }}>
        <Stack spacing={1.2}>
          {decBasketAnnual > 0 && Object.keys(dicQuestionGroups).length > 0 ? (
            <Paper sx={{ p: 1.2, borderRadius: "12px", border: "1px solid #dbe3ef" }}>
              <Stack spacing={1.1}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Eligibility Questions</Typography>
                {Object.entries(dicQuestionGroups).map(([strGroupCode, objGroup]) => (
                  <Box key={strGroupCode}>
                    <Typography sx={{ fontWeight: 700, color: "#0f172a", mb: 0.8, fontSize: "0.82rem" }}>{objGroup.strGroupLabel}</Typography>
                    <Box sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
                      {objGroup.lstQuestions.map((objQuestion) => (
                        <Paper key={objQuestion.strQuestionCode} variant="outlined" sx={{ p: 1, borderRadius: "10px" }}>
                          <Stack spacing={0.8}>
                            <Stack direction="row" spacing={0.75} alignItems="flex-start">
                              {getQuestionIcon(objQuestion.strGroupCode)}
                              <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: "0.81rem" }}>
                                  {objQuestion.strQuestionLabel}
                                  {objQuestion.blnIsRequired ? " *" : ""}
                                </Typography>
                                {objQuestion.strHelpText || objQuestion.strHint ? (
                                  <Typography sx={{ color: "#64748b", fontSize: "0.7rem" }}>
                                    {objQuestion.strHelpText || objQuestion.strHint}
                                  </Typography>
                                ) : null}
                              </Box>
                            </Stack>
                            {renderQuestionInput(objQuestion)}
                          </Stack>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Paper>
          ) : null}

          <Paper sx={{ borderRadius: "12px", overflow: "hidden" }}>
            <Box sx={{ p: 1.2, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }}>Eligible Flexi Components</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.25 }}>
                    Declare annual amount against eligible flexi components. Eligibility and limits are calculated based on your salary structure and answers.
                  </Typography>
                </Box>
                <Chip label={`${intEligibleFlexiComponentCount} eligible / ${lstRows.length} total`} sx={{ alignSelf: { xs: "flex-start", md: "center" }, fontWeight: 700 }} />
              </Stack>
            </Box>

            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small">
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
                  {lstRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ py: 2, textAlign: "center", color: "#64748b" }}>
                        No flexi components are available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lstRows.map((objRow) => (
                      <TableRow key={objRow.intSalaryComponentID}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700, fontSize: "0.84rem" }}>
                            {objRow.strComponentName || objRow.strComponentCode || "Component"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={objRow.blnEligible === false ? "default" : "success"}
                            label={objRow.blnEligible === false ? "Not Eligible" : "Eligible"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit, strCurrencyCode)}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={dicDraftInputs[objRow.intSalaryComponentID] ?? String(objRow.decDraftDeclaredAnnual ?? 0)}
                            disabled={!blnCanEditDeclaration || objRow.blnEligible === false || blnSaving}
                            error={Boolean(objRow.strValidationMessage)}
                            helperText={objRow.strValidationMessage || " "}
                            onChange={(objEvent) =>
                              setDicDraftInputs((dicPrevious) => ({
                                ...dicPrevious,
                                [objRow.intSalaryComponentID]: objEvent.target.value,
                              }))
                            }
                            inputProps={{ min: 0, max: objRow.decEffectiveAnnualCap ?? objRow.decAnnualLimit ?? undefined }}
                            sx={{ width: 150 }}
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
                            <Typography sx={{ color: "#64748b", fontSize: "0.72rem", flex: 1 }}>
                              {objRow.strEligibilityReason || "-"}
                            </Typography>
                            <IconButton
                              size="small"
                              disabled={!blnCanEditDeclaration || objRow.blnEligible === false || blnSaving}
                              onClick={() => handleClearFlexiComponent(objRow.intSalaryComponentID)}
                              sx={{ color: "#dc2626" }}
                              aria-label={`Clear ${objRow.strComponentName || objRow.strComponentCode || "component"} amount`}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Paper sx={{ p: 1.2, borderRadius: "12px" }}>
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 800 }}>Declaration Remarks</Typography>
              <TextField
                multiline
                minRows={3}
                value={strRemarks}
                onChange={(objEvent) => setStrRemarks(objEvent.target.value)}
                disabled={(!blnCanEditDeclaration && !blnCanCancel && !blnCanWithdraw) || blnSaving}
              />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Declared Flexi: ${formatCurrency(decDeclaredAnnual, strCurrencyCode)}`} />
                <Chip label={`Residual Taxable Balance: ${formatCurrency(decResidualAnnual, strCurrencyCode)}`} />
              </Stack>
            </Stack>
          </Paper>

          <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            <Paper sx={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #dbe3ef" }}>
              <Box sx={{ p: 1.12, borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <Typography sx={{ fontWeight: 800, fontSize: "0.9rem" }}>Fixed Salary Components</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
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
                <Table size="small">
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

        <Paper sx={{ p: 1.25, borderRadius: "18px", border: "1px solid #cfe3ff", position: { lg: "sticky" }, top: { lg: 82 }, alignSelf: "start" }}>
          <Stack spacing={1.15}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={{ fontWeight: 900, color: "#172554", fontSize: "0.95rem" }}>Salary Impact Summary</Typography>
              <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 16 }} />
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

            <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1 }}>
              <Stack direction="row" spacing={0.75} alignItems="flex-start">
                <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                <Typography sx={{ color: "#172554", fontSize: "0.75rem", lineHeight: 1.45 }}>
                  This is an estimate. Final payroll impact will be based on approved declaration and payroll processing.
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>
      </Box>

      <Snackbar open={Boolean(strToast)} autoHideDuration={2500} onClose={() => setStrToast("")} message={strToast} />
    </Box>
  );
}
