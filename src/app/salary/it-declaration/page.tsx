"use client";

import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Fade,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Snackbar,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import BlockingLoader from "@/components/shared/BlockingLoader";
import { itDeclarationService, type ItDeclarationDto } from "@/features/it-declaration/services/itDeclarationService";
import { type EssDeclarationCategoryApiRecord } from "@/services/master/MasterApiService";

type FlowStatus = "NOT_STARTED" | "REGIME_SELECTED" | "IN_PROGRESS" | "SUBMITTED";
type Regime = "Old Regime" | "New Regime";

type DeclarationRow = {
  intItemID?: number | null;
  strSection: string;
  strDescription: string;
  strMaxLimitDisplay: string;
  decMaxEligibleAmount?: number | null;
  blnProofRequired?: boolean;
  decDeclaredAmount: number;
  strInvestmentName: string;
  strStatus: "Completed" | "Proof Pending" | "In Progress" | "Not Started";
  strEligibilityNote?: string;
  objProof?: {
    intProofID: number;
    strFileName: string;
    strFilePath: string;
    strMimeType: string;
    intFileSizeBytes: number;
    strVerificationStatus: string;
  } | null;
};

const lstStepper = ["Select Tax Regime", "Enter Declarations", "Compare Tax", "Final Submit"];
const strFinancialYearCode = "2025-2026";
const intDeclarationTableMaxHeight = 420;
const dicInvestmentOptionsFallbackBySection: Record<string, string[]> = {
  "80C": ["Employee Provident Fund (EPF)", "Public Provident Fund (PPF)", "ELSS", "Life Insurance Premium", "NSC", "5-Year Tax Saving FD", "Tuition Fees", "Principal Repayment (Home Loan)"],
  "80CCD(1B)": ["Employee NPS Contribution"],
  "80CCD(2)": ["Employer NPS Contribution"],
  "80CCD": ["NPS Contribution", "Employer NPS Contribution", "Employee NPS Contribution"],
  "80D": ["Medical Insurance - Self & Family", "Medical Insurance - Parents", "Preventive Health Checkup"],
  "24B": ["Housing Loan Interest"],
  "80E": ["Education Loan Interest"],
  "80G": ["Donation"],
  "80TTA": ["Savings Interest"],
  "80TTB": ["Interest on Deposits (Senior Citizen)"],
  "80EE": ["Home Loan Interest (First-time Buyer)"],
  "80EEA": ["Affordable Housing Loan Interest"],
  "80EEB": ["Electric Vehicle Loan Interest"],
};

function getFallbackInvestmentOptions(strSection: string) {
  const strNormalized = (strSection || "").trim().toUpperCase();
  const lstExact = dicInvestmentOptionsFallbackBySection[strNormalized];
  if (lstExact) return lstExact;
  const strSanitized = strNormalized.replace(/\s+/g, "");
  const lstSanitizedExact = dicInvestmentOptionsFallbackBySection[strSanitized];
  if (lstSanitizedExact) return lstSanitizedExact;
  const objPrefixEntry = Object.entries(dicInvestmentOptionsFallbackBySection).find(([strKey]) => strNormalized.startsWith(strKey));
  if (objPrefixEntry) return objPrefixEntry[1];
  const objSanitizedPrefixEntry = Object.entries(dicInvestmentOptionsFallbackBySection).find(([strKey]) => strSanitized.startsWith(strKey.replace(/\s+/g, "")));
  if (objSanitizedPrefixEntry) return objSanitizedPrefixEntry[1];
  if (strNormalized.startsWith("80")) return ["Section-specific investment"];
  if (strNormalized.startsWith("24")) return ["Loan/Property related declaration"];
  if (strNormalized) return [`Section ${strNormalized} declaration`];
  return objPrefixEntry ? objPrefixEntry[1] : [];
}

function formatCurrency(decValue: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(decValue || 0)}`;
}

function formatAmountInput(strValue: string) {
  const strDigits = strValue.replace(/[^\d]/g, "");
  if (!strDigits) return "";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(strDigits));
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

function getStatusTextColor(strStatus: DeclarationRow["strStatus"]) {
  if (strStatus === "Completed") return "#15803d";
  if (strStatus === "Proof Pending") return "#b45309";
  if (strStatus === "In Progress") return "#c2410c";
  return "#6b7280";
}

function resolveRowStatus(objRow: DeclarationRow) {
  if (objRow.decDeclaredAmount > 0 && objRow.blnProofRequired && !objRow.objProof) return "Proof Pending" as const;
  if (objRow.decDeclaredAmount > 0) return "Completed" as const;
  if (objRow.strInvestmentName.trim()) return "In Progress" as const;
  return "Not Started" as const;
}

function parseMaxLimit(strMaxLimit: string) {
  if (!strMaxLimit || strMaxLimit === "-") return null;
  const strDigits = strMaxLimit.replace(/[^0-9.]/g, "");
  const decParsed = Number(strDigits);
  return Number.isFinite(decParsed) ? decParsed : null;
}

function getGroupName(objRow: DeclarationRow) {
  const strCode = objRow.strSection.toUpperCase();
  if (["24B", "80EE", "80EEA", "80EEB"].some((strPrefix) => strCode.startsWith(strPrefix))) {
    return "Loans & Property";
  }
  if (["80C", "80CCD", "80D", "80DD", "80DDB", "80G", "80TTA", "80TTB"].some((strPrefix) => strCode.startsWith(strPrefix))) {
    return "Deductions";
  }
  return "Other Exemptions";
}

function resolvePreviewMimeType(strMimeType: string, strFileName: string) {
  const strNormalizedMime = (strMimeType || "").toLowerCase().trim();
  if (strNormalizedMime && strNormalizedMime !== "application/octet-stream") {
    return strNormalizedMime;
  }

  const strLowerFileName = (strFileName || "").toLowerCase();
  if (strLowerFileName.endsWith(".png")) return "image/png";
  if (strLowerFileName.endsWith(".jpg") || strLowerFileName.endsWith(".jpeg")) return "image/jpeg";
  if (strLowerFileName.endsWith(".gif")) return "image/gif";
  if (strLowerFileName.endsWith(".webp")) return "image/webp";
  if (strLowerFileName.endsWith(".svg")) return "image/svg+xml";
  if (strLowerFileName.endsWith(".pdf")) return "application/pdf";
  if (strLowerFileName.endsWith(".txt")) return "text/plain";
  if (strLowerFileName.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

function getDeclarationRowKey(objRow: DeclarationRow) {
  return objRow.strSection.trim().toLowerCase();
}

function dedupeDeclarationRows(lstInputRows: DeclarationRow[]) {
  const dicByCompositeKey = new Map<string, DeclarationRow>();
  for (const objRow of lstInputRows) {
    const strKey = getDeclarationRowKey(objRow);
    const objExisting = dicByCompositeKey.get(strKey);
    if (!objExisting) {
      dicByCompositeKey.set(strKey, objRow);
      continue;
    }

    const blnExistingHasItemId = objExisting.intItemID != null;
    const blnCurrentHasItemId = objRow.intItemID != null;
    const blnExistingHasLimit = objExisting.strMaxLimitDisplay !== "-";
    const blnCurrentHasLimit = objRow.strMaxLimitDisplay !== "-";
    const blnPickCurrent =
      objRow.decDeclaredAmount > objExisting.decDeclaredAmount ||
      (objRow.decDeclaredAmount === objExisting.decDeclaredAmount && !blnExistingHasLimit && blnCurrentHasLimit) ||
      (objRow.decDeclaredAmount === objExisting.decDeclaredAmount && blnExistingHasLimit === blnCurrentHasLimit && !blnExistingHasItemId && blnCurrentHasItemId);

    if (blnPickCurrent) {
      dicByCompositeKey.set(strKey, objRow);
    }
  }
  return Array.from(dicByCompositeKey.values());
}

function mergeSectionRules(lstBaseRows: DeclarationRow[], lstRuleRows: DeclarationRow[]) {
  if (lstRuleRows.length === 0) return lstBaseRows;
  const dicRuleBySection = new Map<string, DeclarationRow>();
  for (const objRuleRow of lstRuleRows) {
    dicRuleBySection.set(objRuleRow.strSection.trim().toUpperCase(), objRuleRow);
  }
  return lstBaseRows.map((objRow) => {
    const objRule = dicRuleBySection.get(objRow.strSection.trim().toUpperCase());
    if (!objRule) return { ...objRow, strStatus: resolveRowStatus(objRow) };
    const decConfigured = objRule.decMaxEligibleAmount ?? parseMaxLimit(objRule.strMaxLimitDisplay);
    const objMerged: DeclarationRow = {
      ...objRow,
      decMaxEligibleAmount: decConfigured ?? null,
      blnProofRequired: objRule.blnProofRequired ?? objRow.blnProofRequired,
      strMaxLimitDisplay:
        decConfigured != null ? formatCurrency(decConfigured) : objRow.strMaxLimitDisplay,
    };
    return { ...objMerged, strStatus: resolveRowStatus(objMerged) };
  });
}

function formatApiErrorForUi(objError: unknown, strFallback: string) {
  const strRawMessage =
    objError instanceof Error
      ? objError.message
      : (objError as { message?: unknown } | null)?.message;
  const strNormalizedMessage =
    typeof strRawMessage === "string" ? strRawMessage.trim() : "";
  const strMessage = strNormalizedMessage || strFallback;
  if (objError instanceof ApiRequestError) {
    const lstMeta: string[] = [];
    if (objError.intStatusCode) {
      lstMeta.push(`HTTP ${objError.intStatusCode}`);
    }
    if (objError.strRequestId?.trim()) {
      lstMeta.push(`RequestId ${objError.strRequestId.trim()}`);
    }
    if (lstMeta.length > 0) {
      return `${strMessage} (${lstMeta.join(" | ")})`;
    }
  }
  return strMessage;
}

function SummaryCard({
  strLabel,
  strValue,
  strSubValue,
  objIcon,
}: {
  strLabel: string;
  strValue: string;
  strSubValue?: string;
  objIcon?: React.ReactNode;
}) {
  return (
    <Paper sx={{ p: 1.2, borderRadius: "10px", border: "1px solid #d9e3f1", background: "#fff", boxShadow: "0 3px 10px rgba(15, 23, 42, 0.04)" }}>
      <Stack direction="row" spacing={1}>
        {objIcon ? <Box sx={{ color: "#5a7aa6", mt: 0.1 }}>{objIcon}</Box> : null}
        <Box>
          <Typography sx={{ color: "#6b7280", fontSize: "0.74rem", mb: 0.2 }}>{strLabel}</Typography>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.98rem", lineHeight: 1.2 }}>{strValue}</Typography>
          {strSubValue ? <Typography sx={{ color: "#64748b", fontSize: "0.73rem", mt: 0.18 }}>{strSubValue}</Typography> : null}
        </Box>
      </Stack>
    </Paper>
  );
}

function FlowNode({ strLabel, intStep, blnActive }: { strLabel: string; intStep: number; blnActive: boolean }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: "999px",
          display: "grid",
          placeItems: "center",
          fontSize: "0.72rem",
          fontWeight: 700,
          color: blnActive ? "#ffffff" : "#6b7280",
          backgroundColor: blnActive ? "#2563eb" : "#eef2f7",
          border: blnActive ? "1px solid #2563eb" : "1px solid #d1d5db",
        }}
      >
        {intStep}
      </Box>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#1f2937" }}>{strLabel}</Typography>
      {intStep !== 4 ? <ArrowForwardIosRoundedIcon sx={{ fontSize: 12, color: "#9ca3af", ml: "auto" }} /> : null}
    </Stack>
  );
}

export default function SalaryEssDeclarationsPage() {
  const [intDeclarationID, setIntDeclarationID] = useState<number | null>(null);
  const [strFlowStatus, setStrFlowStatus] = useState<FlowStatus>("NOT_STARTED");
  const [strDeclarationStatus, setStrDeclarationStatus] = useState<ItDeclarationDto["strDeclarationStatus"]>("draft");
  const [strSelectedRegime, setStrSelectedRegime] = useState<Regime | "">("");
  const [lstRows, setLstRows] = useState<DeclarationRow[]>([]);
  const [strLastUpdated, setStrLastUpdated] = useState(getDateLabel());
  const [blnDraftSaved, setBlnDraftSaved] = useState(false);
  const [strSuccessToast, setStrSuccessToast] = useState("");
  const [strError, setStrError] = useState("");
  const [strWarning, setStrWarning] = useState("");
  const [blnRetryRefresh, setBlnRetryRefresh] = useState(false);
  const [strRecentlyUpdatedKey, setStrRecentlyUpdatedKey] = useState("");
  const [blnCompared, setBlnCompared] = useState(false);
  const [blnSummaryFromApi, setBlnSummaryFromApi] = useState(false);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strSavingLabel, setStrSavingLabel] = useState("Saving...");
  const [blnRegimeDirty, setBlnRegimeDirty] = useState(false);
  const [dicDirtyRows, setDicDirtyRows] = useState<Record<string, {
    intItemID?: number | null;
    strSection: string;
    strInvestmentName: string;
    decDeclaredAmount: number;
  }>>({});

  const [blnRegimeModalOpen, setBlnRegimeModalOpen] = useState(false);
  const [strRegimeDraft, setStrRegimeDraft] = useState<Regime>("Old Regime");
  const [blnCompareModalOpen, setBlnCompareModalOpen] = useState(false);
  const [blnSubmitModalOpen, setBlnSubmitModalOpen] = useState(false);
  const [blnDeclarationConfirm, setBlnDeclarationConfirm] = useState(false);
  const [blnSubmitModalLoading, setBlnSubmitModalLoading] = useState(false);
  const [blnDismissDraftSavedAlert, setBlnDismissDraftSavedAlert] = useState(false);
  const [blnDismissUnsavedAlert, setBlnDismissUnsavedAlert] = useState(false);
  const [blnDismissWarningAlert, setBlnDismissWarningAlert] = useState(false);
  const [blnDismissErrorAlert, setBlnDismissErrorAlert] = useState(false);

  const [objEditRow, setObjEditRow] = useState<DeclarationRow | null>(null);
  const [strInvestmentNameInput, setStrInvestmentNameInput] = useState("");
  const [strAmountInput, setStrAmountInput] = useState("");
  const [blnModalSaving, setBlnModalSaving] = useState(false);
  const [lstInvestmentOptionsForRow, setLstInvestmentOptionsForRow] = useState<string[]>([]);
  const [objProofFileInput, setObjProofFileInput] = useState<File | null>(null);
  const [objTaxSummary, setObjTaxSummary] = useState({
    decGrossSalary: 0,
    decExemptions: 0,
    decTaxableIncome: 0,
    decOldTax: 0,
    decNewTax: 0,
    decSavings: 0,
    strRecommendedRegime: "Old Regime" as Regime,
  });
  const [objRegimeConfig, setObjRegimeConfig] = useState({
    strDefaultRegime: "Old Regime" as Regime,
    blnAllowEmployeeOptOut: true,
  });

  const blnLocked = strFlowStatus === "SUBMITTED" || strDeclarationStatus === "submitted";
  const blnRegimeSwitchDisabled = blnLocked || !objRegimeConfig.blnAllowEmployeeOptOut;
  const blnStarted = strFlowStatus !== "NOT_STARTED";
  const blnDraftStatus = !blnLocked && (strFlowStatus === "REGIME_SELECTED" || strFlowStatus === "IN_PROGRESS");
  const blnHasAnyFilled = useMemo(() => lstRows.some((objRow) => objRow.decDeclaredAmount > 0), [lstRows]);
  const decDeclaredTotal = useMemo(
    () => lstRows.reduce((decTotal, objRow) => decTotal + Math.max(0, objRow.decDeclaredAmount || 0), 0),
    [lstRows]
  );
  const blnUseSummaryAsTruth = useMemo(
    () =>
      Boolean(
        blnSummaryFromApi &&
        Number.isFinite(objTaxSummary.decOldTax) &&
        Number.isFinite(objTaxSummary.decNewTax)
      ),
    [blnSummaryFromApi, objTaxSummary]
  );
  const objDerivedCalc = useMemo(() => {
    const decGross = Math.max(0, objTaxSummary.decGrossSalary || 0);
    let blnRuleBasedFallback = false;
    const decEligibleExemptionsFallback = lstRows.reduce((decTotal, objRow) => {
      const decAmount = Math.max(0, objRow.decDeclaredAmount || 0);
      const decConfiguredLimit = objRow.decMaxEligibleAmount ?? parseMaxLimit(objRow.strMaxLimitDisplay);
      if (decConfiguredLimit != null && Number.isFinite(decConfiguredLimit)) {
        return decTotal + Math.min(decAmount, Math.max(0, decConfiguredLimit));
      }
      blnRuleBasedFallback = true;
      return decTotal;
    }, 0);

    if (blnUseSummaryAsTruth) {
      const decOld = Math.max(0, objTaxSummary.decOldTax || 0);
      const decNew = Math.max(0, objTaxSummary.decNewTax || 0);
      const decSavingsAbs = Math.abs(decOld - decNew);
      const strRecommended = decOld === decNew ? "Either Regime" : decOld < decNew ? "Old Regime" : "New Regime";
      return {
        blnPreviewOnly: false,
        blnRuleBasedFallback: false,
        decGrossSalary: decGross,
        decExemptions: Math.max(0, objTaxSummary.decExemptions || 0),
        decTaxableOld: Math.max(0, objTaxSummary.decTaxableIncome || 0),
        decTaxableNew: Math.max(0, decGross),
        decOldTax: decOld,
        decNewTax: decNew,
        decSavings: decSavingsAbs,
        strRecommendedRegime: strRecommended as Regime | "Either Regime",
      };
    }

    const decExemptionsCapped = decGross > 0 ? Math.min(decEligibleExemptionsFallback, decGross) : decEligibleExemptionsFallback;
    const decTaxableOld = Math.max(0, decGross - decExemptionsCapped);
    const decTaxableNew = Math.max(0, decGross);
    const decOld = Math.max(0, objTaxSummary.decOldTax || 0);
    const decNew = Math.max(0, objTaxSummary.decNewTax || 0);
    const decSavingsAbs = Math.abs(decOld - decNew);
    const strRecommended = decOld === decNew ? "Either Regime" : decOld < decNew ? "Old Regime" : "New Regime";
    return {
      blnPreviewOnly: true,
      blnRuleBasedFallback,
      decGrossSalary: decGross,
      decExemptions: decExemptionsCapped,
      decTaxableOld,
      decTaxableNew,
      decOldTax: decOld,
      decNewTax: decNew,
      decSavings: decSavingsAbs,
      strRecommendedRegime: strRecommended as Regime | "Either Regime",
    };
  }, [blnUseSummaryAsTruth, objTaxSummary, lstRows]);
  const strRecommendedRegimeSelectable: Regime =
    objDerivedCalc.strRecommendedRegime === "New Regime" ? "New Regime" : "Old Regime";
  const intActiveStep = useMemo(() => {
    if (strFlowStatus === "NOT_STARTED") return 0;
    if (strFlowStatus === "REGIME_SELECTED") return 1;
    if (strFlowStatus === "IN_PROGRESS" && !blnCompared) return 1;
    if (strFlowStatus === "IN_PROGRESS" && blnCompared) return 2;
    return 3;
  }, [strFlowStatus, blnCompared]);
  const decAmountInputValue = Number((strAmountInput || "").replace(/[^\d.]/g, "") || 0);
  const decAmountMaxInput = 99_99_99_999;
  const decActiveMaxLimit = objEditRow ? (objEditRow.decMaxEligibleAmount ?? parseMaxLimit(objEditRow.strMaxLimitDisplay)) : null;
  const strAmountInputError = useMemo(() => {
    if (!objEditRow) return "";
    if (strAmountInput.trim() === "") return "Amount is required.";
    if (!Number.isFinite(decAmountInputValue)) return "Amount is invalid.";
    if (decAmountInputValue < 0) return "Amount cannot be negative.";
    if (decAmountInputValue > decAmountMaxInput) return `Amount cannot exceed ${formatCurrency(decAmountMaxInput)}.`;
    return "";
  }, [objEditRow, strAmountInput, decAmountInputValue, decActiveMaxLimit]);
  const strEligibleCapHelper =
    decActiveMaxLimit != null && decAmountInputValue > decActiveMaxLimit
      ? `Eligible amount capped at ${formatCurrency(decActiveMaxLimit)}.`
      : "";
  const blnSaveEditDisabled = Boolean(strAmountInputError);
  const blnModalDirty = useMemo(() => {
    if (!objEditRow) return false;
    const strCurrentAmount = formatAmountInput(String(Math.max(0, objEditRow.decDeclaredAmount || 0)));
    return (
      strInvestmentNameInput.trim() !== (objEditRow.strInvestmentName || "").trim() ||
      strAmountInput.trim() !== strCurrentAmount.trim() ||
      Boolean(objProofFileInput)
    );
  }, [objEditRow, strInvestmentNameInput, strAmountInput, objProofFileInput]);

  function hydrateFromApi(objData: ItDeclarationDto) {
    const blnHasSummary =
      objData.objSummary != null &&
      Number.isFinite(objData.objSummary.decOldTax) &&
      Number.isFinite(objData.objSummary.decNewTax);
    setBlnSummaryFromApi(blnHasSummary);
    setIntDeclarationID(objData.intDeclarationID ?? null);
    setStrFlowStatus(objData.strFlowStatus as FlowStatus);
    setStrDeclarationStatus(objData.strDeclarationStatus ?? "draft");
    setStrSelectedRegime((objData.strSelectedRegime || "") as Regime | "");
    setStrLastUpdated(objData.strLastUpdated || getDateLabel());
    setLstRows(
      objData.lstItems?.length
        ? dedupeDeclarationRows(
            objData.lstItems.map((objItem) => {
              const objRow: DeclarationRow = {
                intItemID: objItem.intItemID,
                strSection: objItem.strSection,
                strDescription: objItem.strDescription,
                strMaxLimitDisplay: objItem.strMaxLimit,
                decMaxEligibleAmount: parseMaxLimit(objItem.strMaxLimit),
                decDeclaredAmount: objItem.decDeclaredAmount,
                strInvestmentName: objItem.strInvestmentName,
                strStatus: objItem.strStatus,
                objProof: objItem.objProof ?? null,
              };
              return { ...objRow, strStatus: resolveRowStatus(objRow) };
            })
          )
        : []
    );
    setObjTaxSummary({
      decGrossSalary: objData.objSummary?.decGrossSalary ?? 0,
      decExemptions: objData.objSummary?.decExemptions ?? 0,
      decTaxableIncome: objData.objSummary?.decTaxableIncome ?? 0,
      decOldTax: objData.objSummary?.decOldTax ?? 0,
      decNewTax: objData.objSummary?.decNewTax ?? 0,
      decSavings: objData.objSummary?.decSavings ?? 0,
      strRecommendedRegime: (objData.objSummary?.strRecommendedRegime ?? "Old Regime") as Regime,
    });
    setObjRegimeConfig({
      strDefaultRegime: (objData.objRegimeConfig?.strDefaultRegime ?? "Old Regime") as Regime,
      blnAllowEmployeeOptOut: objData.objRegimeConfig?.blnAllowEmployeeOptOut ?? true,
    });
    setDicDirtyRows({});
    setBlnRegimeDirty(false);
    setBlnCompared(objData.strFlowStatus === "SUBMITTED");
  }

  function mapCategoryToRow(objCategory: EssDeclarationCategoryApiRecord): DeclarationRow {
    const strDescription = objCategory.strCategoryDescription?.trim() || objCategory.strCategoryName;
    const strMaxLimitDisplay = objCategory.decMaxLimitAmount == null ? "-" : formatCurrency(objCategory.decMaxLimitAmount);
    return {
      intItemID: null,
      strSection: objCategory.strCategoryCode,
      strDescription,
      strMaxLimitDisplay,
      decMaxEligibleAmount: objCategory.decMaxLimitAmount ?? null,
      blnProofRequired: objCategory.blnProofRequired,
      decDeclaredAmount: 0,
      strInvestmentName: "",
      strStatus: "Not Started",
    };
  }

  async function loadRowsFromCategoryMaster(): Promise<DeclarationRow[]> {
    const lstCandidatePaths = [
      "/masters/ess-declaration-categories",
      "/ess-declaration-categories",
      "/masters/tax-declaration-component",
    ];
    const lstCandidateMenuActions = [
      "ESS_IT_DECLARATION_VIEW",
      "MASTER_ESS_DECLARATION_CATEGORY_LIST",
    ];
    let objLastError: unknown = null;

    for (const strPath of lstCandidatePaths) {
      for (const strMenuAction of lstCandidateMenuActions) {
        try {
          const objCategoryResult = await requestEncryptedApi<EssDeclarationCategoryApiRecord[]>({
            strPath: `${ApiRoutePrefix.ApiV1}${strPath}`,
            strMethod: ApiRequestMethod.Get,
            strMenuAction,
            blnUseAuthHeader: true,
          });
          return dedupeDeclarationRows(
            (objCategoryResult.Data ?? [])
              .filter((objCategory) => objCategory.blnIsActive)
              .map(mapCategoryToRow)
          );
        } catch (objError) {
          objLastError = objError;
        }
      }
    }

    if (objLastError) {
      throw objLastError;
    }
    return [];
  }

  async function loadDeclaration() {
    setBlnLoading(true);
    setStrError("");
    setStrWarning("");
    setBlnRetryRefresh(false);
    try {
      const objData = await itDeclarationService.getDeclaration(strFinancialYearCode);
      hydrateFromApi(objData);
      const lstMasterRows = await loadRowsFromCategoryMaster().catch(() => []);
      if (!objData.lstItems?.length) {
        setLstRows(lstMasterRows.map((objRow) => ({ ...objRow, strStatus: resolveRowStatus(objRow) })));
      } else if (lstMasterRows.length > 0) {
        setLstRows((lstCurrentRows) => mergeSectionRules(lstCurrentRows, lstMasterRows));
      }
    } catch (objError) {
      const strApiError = formatApiErrorForUi(objError, "Unable to load IT declaration.");
      const blnItDeclarationRouteMissing = objError instanceof ApiRequestError && objError.intStatusCode === 404;
      try {
        const lstMasterRows = await loadRowsFromCategoryMaster();
        setLstRows(lstMasterRows);
        setBlnSummaryFromApi(false);
        if (lstMasterRows.length > 0) {
          setStrWarning(
            blnItDeclarationRouteMissing
              ? "IT declaration API is not available in current backend build. Loaded declaration sections from Tax Declaration master."
              : `${strApiError} Loaded declaration sections from Tax Declaration Component master.`
          );
        } else {
          setStrError("Unable to refresh declaration summary. Please try again.");
          setBlnRetryRefresh(true);
        }
      } catch {
        setLstRows([]);
        setStrError("Unable to refresh declaration summary. Please try again.");
        setBlnRetryRefresh(true);
      }
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    void loadDeclaration();
  }, []);

  useEffect(() => {
    if (!blnDraftSaved) return;
    setBlnDismissDraftSavedAlert(false);
    const intTimer = window.setTimeout(() => setBlnDraftSaved(false), 1500);
    return () => window.clearTimeout(intTimer);
  }, [blnDraftSaved]);

  useEffect(() => {
    if (!(blnRegimeDirty || Object.keys(dicDirtyRows).length > 0)) return;
    setBlnDismissUnsavedAlert(false);
  }, [blnRegimeDirty, dicDirtyRows]);

  useEffect(() => {
    if (!strWarning) return;
    setBlnDismissWarningAlert(false);
    const intTimer = window.setTimeout(() => setBlnDismissWarningAlert(true), 4500);
    return () => window.clearTimeout(intTimer);
  }, [strWarning]);

  useEffect(() => {
    if (!strError) return;
    setBlnDismissErrorAlert(false);
  }, [strError]);

  useEffect(() => {
    if (!strRecentlyUpdatedKey) return;
    const intTimer = window.setTimeout(() => setStrRecentlyUpdatedKey(""), 1800);
    return () => window.clearTimeout(intTimer);
  }, [strRecentlyUpdatedKey]);

  async function runCompareAndOpenModal() {
    if (blnLocked) return;
    setBlnSaving(true);
    setStrSavingLabel("Saving changes and comparing...");
    setStrError("");
    try {
      const intResolvedDeclarationID = await persistDraftToDb();
      if (!intResolvedDeclarationID) return;
      const objData = await itDeclarationService.compareTax(intResolvedDeclarationID);
      hydrateFromApi(objData);
      setBlnCompared(true);
      setBlnCompareModalOpen(true);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to compare tax."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
    }
  }

  async function saveDraft() {
    if (blnLocked) return;
    setBlnSaving(true);
    setStrSavingLabel("Saving draft...");
    setStrError("");
    try {
      await persistDraftToDb();
      setBlnDraftSaved(true);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to save declaration draft."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
    }
  }

  function openRegimeModal() {
    setStrRegimeDraft((strSelectedRegime || strRecommendedRegimeSelectable || "Old Regime") as Regime);
    setBlnRegimeModalOpen(true);
  }

  function openEditModal(objRow: DeclarationRow) {
    if (!blnStarted && !blnLocked) {
      openRegimeModal();
      return;
    }
    setObjEditRow(objRow);
    setStrInvestmentNameInput(objRow.strInvestmentName);
    setStrAmountInput(objRow.decDeclaredAmount ? formatAmountInput(String(objRow.decDeclaredAmount)) : "");
    setObjProofFileInput(null);
    const lstFallbackOptions = getFallbackInvestmentOptions(objRow.strSection);
    const lstLocalHints = [objRow.strDescription?.trim(), objRow.strInvestmentName?.trim()]
      .filter((strValue): strValue is string => Boolean(strValue && strValue !== "-"));
    const lstSeedOptions = Array.from(new Set([...lstFallbackOptions, ...lstLocalHints]));
    setLstInvestmentOptionsForRow(lstSeedOptions);
    void (async () => {
      try {
        const lstOptions = await itDeclarationService.listInvestmentOptions(objRow.strSection);
        const lstApiOptions = lstOptions
          .map((objOption) => objOption.strOptionName?.trim() || objOption.strOptionCode?.trim())
          .filter((strValue): strValue is string => Boolean(strValue));
        const lstMerged = Array.from(new Set([...lstSeedOptions, ...lstApiOptions]));
        setLstInvestmentOptionsForRow(lstMerged);
      } catch {
        setLstInvestmentOptionsForRow(lstSeedOptions);
      }
    })();
  }

  function closeEditModal() {
    setObjEditRow(null);
    setObjProofFileInput(null);
    setLstInvestmentOptionsForRow([]);
  }

  async function ensureDeclarationAndSaveSingleItem(objPayload: {
    intItemID?: number | null;
    strSection: string;
    strInvestmentName: string;
    decDeclaredAmount: number;
  }) {
    const strRegimeToSave = (strSelectedRegime || strRecommendedRegimeSelectable || "Old Regime") as Regime;
    let intResolvedDeclarationID = intDeclarationID;
    let objLatestData: ItDeclarationDto | null = null;

    if (!intResolvedDeclarationID) {
      objLatestData = await itDeclarationService.startDeclaration(strFinancialYearCode, strRegimeToSave);
      intResolvedDeclarationID = objLatestData.intDeclarationID ?? null;
    } else if (blnRegimeDirty) {
      objLatestData = await itDeclarationService.changeRegime(intResolvedDeclarationID, strRegimeToSave);
    }

    if (!intResolvedDeclarationID) {
      throw new Error("Unable to resolve declaration ID for proof upload.");
    }

    objLatestData = await itDeclarationService.saveItem(intResolvedDeclarationID, objPayload);
    hydrateFromApi(objLatestData);

    const objSavedItem = objLatestData.lstItems?.find((objItem) =>
      objPayload.intItemID != null
        ? objItem.intItemID === objPayload.intItemID
        : objItem.strSection === objPayload.strSection
    );

    return {
      intDeclarationID: intResolvedDeclarationID,
      intItemID: objSavedItem?.intItemID ?? null,
    };
  }

  async function saveDeclarationEdit() {
    if (!objEditRow) return;
    if (strAmountInputError) return;
    setBlnModalSaving(true);
    try {
      const decAmount = Math.max(0, Number((strAmountInput || "").replace(/[^\d.]/g, "") || 0));
      const strInvestmentName = strInvestmentNameInput.trim();
      const strDirtyKey = objEditRow.intItemID != null ? `id-${objEditRow.intItemID}` : `${objEditRow.strSection}-${objEditRow.strDescription}`;
      setLstRows((lstCurrentRows) =>
        lstCurrentRows.map((objRow) =>
          (objRow.intItemID != null && objEditRow.intItemID != null && objRow.intItemID === objEditRow.intItemID) ||
          (objRow.intItemID == null && objEditRow.intItemID == null && objRow.strSection === objEditRow.strSection && objRow.strDescription === objEditRow.strDescription)
            ? (() => {
                const objUpdatedRow: DeclarationRow = {
                ...objRow,
                strInvestmentName,
                decDeclaredAmount: decAmount,
                strEligibilityNote:
                  objRow.decMaxEligibleAmount != null && decAmount > objRow.decMaxEligibleAmount
                    ? `Eligible amount capped at ${formatCurrency(objRow.decMaxEligibleAmount)}.`
                    : "",
              };
                return {
                  ...objUpdatedRow,
                  strStatus: resolveRowStatus(objUpdatedRow),
                };
              })()
            : objRow
        )
      );
      setDicDirtyRows((dicCurrentRows) => ({
        ...dicCurrentRows,
        [strDirtyKey]: {
          intItemID: objEditRow.intItemID,
          strSection: objEditRow.strSection,
          strInvestmentName,
          decDeclaredAmount: decAmount,
        },
      }));
      setStrRecentlyUpdatedKey(strDirtyKey);

      if (objProofFileInput) {
        try {
          setStrSavingLabel("Uploading proof...");
          setBlnSaving(true);
          const objPersisted = await ensureDeclarationAndSaveSingleItem({
            intItemID: objEditRow.intItemID,
            strSection: objEditRow.strSection,
            strInvestmentName,
            decDeclaredAmount: decAmount,
          });
          if (objPersisted.intItemID) {
            const objData = await itDeclarationService.uploadItemProof(objPersisted.intDeclarationID, objPersisted.intItemID, objProofFileInput);
            hydrateFromApi(objData);
          }
        } catch (objError) {
          setStrError(formatApiErrorForUi(objError, "Unable to upload declaration proof."));
        } finally {
          setBlnSaving(false);
          setStrSavingLabel("Saving...");
        }
      }

      setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : "IN_PROGRESS"));
      setBlnCompared(false);
      setStrLastUpdated(getDateLabel());
      setObjEditRow(null);
      setObjProofFileInput(null);
      setBlnDraftSaved(true);
      setStrSuccessToast("Declaration item saved successfully.");
    } finally {
      setBlnModalSaving(false);
    }
  }

  async function previewDeclarationProof() {
    if (!objEditRow?.intItemID || !intDeclarationID) return;
    setBlnSaving(true);
    setBlnSubmitModalLoading(true);
    setStrSavingLabel("Loading proof...");
    try {
      const objPreview = await itDeclarationService.previewItemProof(intDeclarationID, objEditRow.intItemID);
      const strBase64 = objPreview.strBase64Content;
      const strMimeType = resolvePreviewMimeType(objPreview.strMimeType, objPreview.strFileName);
      const setPreviewableMimePrefixes = ["image/", "text/"];
      const setPreviewableExactMimes = new Set([
        "application/pdf",
        "application/json",
      ]);
      const blnCanPreviewInline =
        setPreviewableMimePrefixes.some((strPrefix) => strMimeType.startsWith(strPrefix)) ||
        setPreviewableExactMimes.has(strMimeType);
      const strBinary = atob(strBase64);
      const uintBytes = new Uint8Array(strBinary.length);
      for (let intIndex = 0; intIndex < strBinary.length; intIndex += 1) {
        uintBytes[intIndex] = strBinary.charCodeAt(intIndex);
      }
      const objBlob = new Blob([uintBytes], { type: strMimeType });
      const strObjectUrl = URL.createObjectURL(objBlob);
      if (blnCanPreviewInline) {
        const objNewTab = window.open(strObjectUrl, "_blank", "noopener,noreferrer");
        if (!objNewTab) {
          const objLink = document.createElement("a");
          objLink.href = strObjectUrl;
          objLink.download = objPreview.strFileName || "proof";
          document.body.appendChild(objLink);
          objLink.click();
          document.body.removeChild(objLink);
          setStrWarning("Popup was blocked. File downloaded instead.");
        }
      } else {
        const objLink = document.createElement("a");
        objLink.href = strObjectUrl;
        objLink.download = objPreview.strFileName || "proof";
        document.body.appendChild(objLink);
        objLink.click();
        document.body.removeChild(objLink);
        setStrWarning("This file type cannot be previewed in browser. File downloaded instead.");
      }
      window.setTimeout(() => URL.revokeObjectURL(strObjectUrl), 60_000);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to preview declaration proof."));
    } finally {
      setBlnSaving(false);
      setBlnSubmitModalLoading(false);
      setStrSavingLabel("Saving...");
    }
  }

  async function deleteDeclarationProof() {
    if (!objEditRow?.intItemID || !intDeclarationID) return;
    setBlnSaving(true);
    setStrSavingLabel("Deleting proof...");
    try {
      const objData = await itDeclarationService.deleteItemProof(intDeclarationID, objEditRow.intItemID);
      if (objData) {
        hydrateFromApi(objData);
      }
      setObjEditRow((objCurrent) => (objCurrent ? { ...objCurrent, objProof: null } : objCurrent));
      setObjProofFileInput(null);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to delete declaration proof."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
    }
  }

  async function confirmRegime() {
    setStrSelectedRegime(strRegimeDraft);
    setBlnRegimeDirty(true);
    setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : strCurrentStatus));
    setBlnCompared(false);
    setStrLastUpdated(getDateLabel());
    setBlnRegimeModalOpen(false);
  }

  async function submitDeclaration() {
    if (!blnDeclarationConfirm) {
      setStrWarning("Please check confirmation checkbox before final submit.");
      setBlnSubmitModalOpen(false);
      return;
    }
    setBlnSaving(true);
    setStrSavingLabel("Saving changes and submitting...");
    setStrError("");
    try {
      const intResolvedDeclarationID = await persistDraftToDb();
      if (!intResolvedDeclarationID) return;
      const objData = await itDeclarationService.submitDeclaration(intResolvedDeclarationID);
      hydrateFromApi(objData);
      setBlnSubmitModalOpen(false);
      setBlnDraftSaved(true);
      setStrSuccessToast("Declaration submitted successfully.");
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to submit declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
    }
  }

  async function withdrawDeclaration() {
    if (!blnLocked || !intDeclarationID) return;
    setBlnSaving(true);
    setStrSavingLabel("Withdrawing declaration...");
    setStrError("");
    try {
      const objData = await itDeclarationService.withdrawDeclaration(intDeclarationID);
      hydrateFromApi(objData);
      setBlnDeclarationConfirm(false);
      setBlnDraftSaved(true);
      setStrSuccessToast("Declaration withdrawn successfully.");
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to withdraw declaration."));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
    }
  }

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel="Loading IT Declaration..." />;
  }

  async function persistDraftToDb() {
    const strRegimeToSave = (strSelectedRegime || strRecommendedRegimeSelectable || "Old Regime") as Regime;
    const lstPendingRows = Object.values(dicDirtyRows);
    let intResolvedDeclarationID = intDeclarationID;
    let objLatestData: ItDeclarationDto | null = null;

    if (intResolvedDeclarationID && !blnRegimeDirty && lstPendingRows.length === 0) {
      return intResolvedDeclarationID;
    }

    if (!intResolvedDeclarationID) {
      objLatestData = await itDeclarationService.startDeclaration(strFinancialYearCode, strRegimeToSave);
      intResolvedDeclarationID = objLatestData.intDeclarationID ?? null;
    } else if (blnRegimeDirty) {
      objLatestData = await itDeclarationService.changeRegime(intResolvedDeclarationID, strRegimeToSave);
    }

    if (!intResolvedDeclarationID) {
      throw new Error("Unable to resolve declaration ID for draft save.");
    }

    for (const objPendingRow of lstPendingRows) {
      objLatestData = await itDeclarationService.saveItem(intResolvedDeclarationID, objPendingRow);
    }

    if (objLatestData) {
      hydrateFromApi(objLatestData);
    }

    return intResolvedDeclarationID;
  }

  return (
    <Stack spacing={0.7} sx={{ pb: 1, pr: 0.2 }}>
      <BlockingLoader blnOpen={blnSaving} strLabel={strSavingLabel} intZIndex={1800} />

      <Paper sx={{ p: 0.9, borderRadius: "12px", border: "1px solid rgba(37, 99, 235, 0.2)", background: "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)", color: "#f8fcff" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} gap={1}>
          <Stack direction="row" spacing={1.2} alignItems="center">
            <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20 }} />
            <Box>
              <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "1rem" }}>IT Declaration & Tax Planning</Typography>
              <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.74rem" }}>Financial Year {strFinancialYearCode}</Typography>
            </Box>
          </Stack>
          <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
              <RadioGroup
                row
                value={strSelectedRegime || "Old Regime"}
                onChange={(objEvent) => { setStrSelectedRegime(objEvent.target.value as Regime); setBlnRegimeDirty(true); }}
                sx={{
                  mr: { md: 0.5 },
                  "& .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.95)", fontSize: "0.8rem" },
                  "& .MuiRadio-root": { color: "rgba(239,252,255,0.95)" },
                  "& .Mui-checked": { color: "#ffffff !important" },
                }}
              >
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="Old Regime" control={<Radio size="small" />} label={`Old Regime${objDerivedCalc.strRecommendedRegime === "Old Regime" ? " (Recommended)" : ""}`} />
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="New Regime" control={<Radio size="small" />} label="New Regime" />
              </RadioGroup>
              <Button variant="contained" size="small" onClick={() => void saveDraft()} disabled={blnLocked} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f" } }}>
                Save Draft
              </Button>
              <Button variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked || blnSaving} onClick={() => void runCompareAndOpenModal()} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0e7490", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0b5f75" } }}>
                {blnSaving && strSavingLabel.includes("comparing") ? "Comparing..." : "Compare Tax"}
              </Button>
              <Button variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked} onClick={() => setBlnSubmitModalOpen(true)} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#d97706" } }}>
                Submit Declaration
              </Button>
              {blnLocked ? (
                <Button variant="outlined" size="small" onClick={() => void withdrawDeclaration()} sx={{ minHeight: 30, borderRadius: "8px", borderColor: "#f59e0b", color: "#f59e0b", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", "&:hover": { borderColor: "#d97706", backgroundColor: "rgba(245,158,11,0.08)" } }}>
                  Withdraw Declaration
                </Button>
              ) : null}
            </Stack>
            {!objRegimeConfig.blnAllowEmployeeOptOut ? (
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(239,252,255,0.85)" }}>
                Regime is locked by policy. Default regime: {objRegimeConfig.strDefaultRegime}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Alert
        severity="warning"
        icon={<WarningAmberRoundedIcon />}
        sx={{ borderRadius: "8px", border: "1px solid rgba(251,146,60,0.35)", backgroundColor: "rgba(255,237,213,0.62)", py: 0.05, "& .MuiAlert-message": { fontSize: "0.8rem" } }}
      >
        If you do not submit your IT declaration before the deadline, the New Tax Regime will be applied by default.
      </Alert>

      {blnDraftSaved && !blnDismissDraftSavedAlert ? (
        <Fade in={!blnDismissDraftSavedAlert}>
          <Alert
            severity="success"
            sx={{ borderRadius: "8px", py: 0.1 }}
            action={
              <IconButton size="small" color="inherit" onClick={() => setBlnDismissDraftSavedAlert(true)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            }
          >
            Draft saved
          </Alert>
        </Fade>
      ) : null}
      {!blnDraftSaved && (blnRegimeDirty || Object.keys(dicDirtyRows).length > 0) && !blnDismissUnsavedAlert ? (
        <Fade in={!blnDismissUnsavedAlert}>
          <Alert
            severity="info"
            sx={{ borderRadius: "8px", py: 0.1 }}
            action={
              <IconButton size="small" color="inherit" onClick={() => setBlnDismissUnsavedAlert(true)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            }
          >
            Unsaved changes
          </Alert>
        </Fade>
      ) : null}
      {strWarning && !blnDismissWarningAlert ? (
        <Fade in={!blnDismissWarningAlert}>
          <Alert
            severity="warning"
            sx={{ borderRadius: "8px", py: 0.1 }}
            action={
              <IconButton size="small" color="inherit" onClick={() => setBlnDismissWarningAlert(true)}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            }
          >
            {strWarning}
          </Alert>
        </Fade>
      ) : null}
      {strError && !blnDismissErrorAlert ? (
        <Fade in={!blnDismissErrorAlert}>
          <Alert
            severity="error"
            sx={{ borderRadius: "8px", py: 0.1 }}
            action={
              <Stack direction="row" spacing={0.4} alignItems="center">
                {blnRetryRefresh ? <Button color="inherit" size="small" onClick={() => void loadDeclaration()}>Retry</Button> : null}
                <IconButton size="small" color="inherit" onClick={() => setBlnDismissErrorAlert(true)}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
            }
          >
            {strError}
          </Alert>
        </Fade>
      ) : null}

      <Grid container spacing={0.8}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Declaration Status" strValue={strFlowStatus === "SUBMITTED" ? "Submitted" : blnHasAnyFilled ? "Draft" : "Not Started"} strSubValue={`Last updated: ${strLastUpdated}`} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Selected Regime" strValue={strSelectedRegime || "Old Regime"} strSubValue={objDerivedCalc.strRecommendedRegime === "Either Regime" ? "Either regime works" : objDerivedCalc.strRecommendedRegime === "Old Regime" ? "Recommended" : ""} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Estimated Tax Saving" strValue={formatCurrency(objDerivedCalc.decSavings)} strSubValue={objDerivedCalc.blnPreviewOnly ? "Estimated preview only" : "(Old vs New Regime)"} objIcon={<SavingsOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Last Updated" strValue={strLastUpdated} strSubValue="By You" objIcon={<CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 0.8, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          {lstStepper.map((strStep, intIndex) => (
            <FlowNode key={strStep} strLabel={strStep} intStep={intIndex + 1} blnActive={intIndex <= intActiveStep} />
          ))}
        </Stack>
      </Paper>
      <Grid container spacing={0.8}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>Your Declarations</Typography>
              <Button variant="outlined" size="small" sx={{ minHeight: 28, py: 0.1, fontSize: "0.75rem" }} onClick={() => void loadDeclaration()} disabled={blnLocked}>Refresh Amounts</Button>
            </Stack>
            <TableContainer sx={{ maxHeight: intDeclarationTableMaxHeight, overflowY: "auto", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Table size="small">
                <TableHead sx={{ position: "sticky", top: 0, zIndex: 1, backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell>Section</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Declared Amount</TableCell>
                    <TableCell>Max Limit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lstRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ color: "#64748b", fontSize: "0.82rem" }}>
                        No declaration sections available. Check Tax Declaration Component master data and ESS IT declaration API.
                      </TableCell>
                    </TableRow>
                  ) : (() => {
                    const dicGroups = new Map<string, DeclarationRow[]>();
                    for (const objRow of lstRows) {
                      const strGroupName = getGroupName(objRow);
                      const lstGroupRows = dicGroups.get(strGroupName) ?? [];
                      lstGroupRows.push(objRow);
                      dicGroups.set(strGroupName, lstGroupRows);
                    }
                    return Array.from(dicGroups.entries()).flatMap(([strGroupName, lstGroupRows]) => [
                      <TableRow key={`grp-${strGroupName}`} sx={{ backgroundColor: "#f8fafc" }}>
                        <TableCell colSpan={6} sx={{ fontWeight: 800, color: "#334155", fontSize: "0.78rem" }}>{strGroupName}</TableCell>
                      </TableRow>,
                      ...lstGroupRows.map((objRow, intIndex) => {
                        const strRowKey = objRow.intItemID != null ? `id-${objRow.intItemID}` : `${objRow.strSection}-${objRow.strDescription}`;
                        return (
                          <TableRow
                            key={objRow.intItemID ?? `${objRow.strSection}-${intIndex}`}
                            hover
                            sx={{
                              height: 56,
                              backgroundColor: strRecentlyUpdatedKey === strRowKey ? "rgba(16,185,129,0.12)" : undefined,
                              transition: "background-color 0.8s ease",
                            }}
                          >
                            <TableCell sx={{ fontWeight: 700 }}>{objRow.strSection}</TableCell>
                            <TableCell>{objRow.strDescription}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontSize: "0.85rem" }}>{formatCurrency(objRow.decDeclaredAmount)}</Typography>
                              {objRow.strEligibilityNote ? <Typography sx={{ fontSize: "0.72rem", color: "#b45309" }}>{objRow.strEligibilityNote}</Typography> : null}
                            </TableCell>
                            <TableCell>{objRow.strMaxLimitDisplay}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={objRow.strStatus}
                                sx={{
                                  fontWeight: 700,
                                  color: objRow.strStatus === "Completed" ? "#166534" : objRow.strStatus === "Proof Pending" ? "#9a3412" : objRow.strStatus === "In Progress" ? "#9a3412" : "#475569",
                                  backgroundColor: objRow.strStatus === "Completed" ? "#dcfce7" : objRow.strStatus === "Proof Pending" ? "#ffedd5" : objRow.strStatus === "In Progress" ? "#ffedd5" : "#e2e8f0",
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                variant="text"
                                size="small"
                                sx={{ fontSize: "0.76rem", fontWeight: 700 }}
                                disabled={blnLocked ? objRow.decDeclaredAmount <= 0 : false}
                                onClick={() => openEditModal(objRow)}
                              >
                                {blnLocked
                                  ? (objRow.decDeclaredAmount > 0 ? "View" : "-")
                                  : (objRow.decDeclaredAmount > 0 ? "View / Edit" : blnStarted ? "Add" : "Start")}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    ]);
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef", height: "100%" }}>
            <Typography sx={{ fontWeight: 800, mb: 1, fontSize: "0.95rem" }}>Tax Summary (Live)</Typography>
            <Stack spacing={0.72}>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Gross Salary</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decGrossSalary)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Total Exemptions</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decExemptions)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Taxable Income (Old)</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decTaxableOld)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Taxable Income (New)</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decTaxableNew)}</Typography></Stack>
              <Box sx={{ borderTop: "1px solid #e5e7eb", my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Estimated Tax (Old)</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#15803d" }}>{formatCurrency(objDerivedCalc.decOldTax)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Estimated Tax (New)</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c" }}>{formatCurrency(objDerivedCalc.decNewTax)}</Typography></Stack>
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>Estimated preview only</Typography> : null}
              {objDerivedCalc.blnPreviewOnly && objDerivedCalc.blnRuleBasedFallback ? <Typography sx={{ fontSize: "0.73rem", color: "#94a3b8" }}>Some sections require backend rule-based calculation.</Typography> : null}
            </Stack>
            <Paper sx={{ mt: 1, p: 1, borderRadius: "8px", border: "1px solid #bde3cb", backgroundColor: "#f0fdf4" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color: "#166534" }}>Recommended Regime</Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: "#14532d" }}>{objDerivedCalc.strRecommendedRegime}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#166534", mt: 0.2, fontWeight: 700 }}>Estimated Tax Saving: {formatCurrency(objDerivedCalc.decSavings)}</Typography>
            </Paper>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={blnRegimeModalOpen} onClose={() => setBlnRegimeModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Select Tax Regime</DialogTitle>
        <DialogContent>
          <RadioGroup value={strRegimeDraft} onChange={(objEvent) => setStrRegimeDraft(objEvent.target.value as Regime)}>
            <FormControlLabel value="Old Regime" control={<Radio />} label="Old Regime (Recommended)" />
            <FormControlLabel value="New Regime" control={<Radio />} label="New Regime" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnRegimeModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void confirmRegime()}>Continue</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objEditRow)} onClose={closeEditModal} maxWidth="md" fullWidth>
        <DialogTitle>Edit Declaration ({objEditRow?.strSection})</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.35}>
            <Autocomplete
              freeSolo
              options={lstInvestmentOptionsForRow}
              value={strInvestmentNameInput}
              onInputChange={(_, strValue) => setStrInvestmentNameInput(strValue)}
              readOnly={blnLocked}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Investment name"
                  size="small"
                  InputProps={{ ...params.InputProps, readOnly: blnLocked }}
                  fullWidth
                  helperText={lstInvestmentOptionsForRow.length > 0 ? "Select or search common investments for this section." : "Enter investment name."}
                />
              )}
            />
            <TextField
              label="Amount input"
              size="small"
              inputMode="numeric"
              value={strAmountInput}
              onChange={(objEvent) => setStrAmountInput(formatAmountInput(objEvent.target.value))}
              error={Boolean(strAmountInputError)}
              helperText={strAmountInputError || strEligibleCapHelper || " "}
              InputProps={{ readOnly: blnLocked }}
              fullWidth
            />
            {decActiveMaxLimit != null ? (
              <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: -0.5 }}>
                Max allowed under {objEditRow?.strSection}: {formatCurrency(decActiveMaxLimit)}
              </Typography>
            ) : null}
            {objEditRow?.objProof && !objProofFileInput ? (
              <Stack spacing={0.8}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<VisibilityOutlinedIcon />}
                    sx={{ borderColor: "#0f766e", color: "#0f766e", "&:hover": { borderColor: "#115e59", backgroundColor: "rgba(15,118,110,0.08)" } }}
                    onClick={() => void previewDeclarationProof()}
                  >
                    Preview
                  </Button>
                  {!blnLocked ? (
                    <Button
                      component="label"
                      variant="outlined"
                      size="small"
                      startIcon={<UploadFileRoundedIcon />}
                      sx={{ borderColor: "#2563eb", color: "#2563eb", "&:hover": { borderColor: "#1d4ed8", backgroundColor: "rgba(37,99,235,0.08)" } }}
                    >
                      Replace
                      <input
                        hidden
                        type="file"
                        accept=".png,.jpg,.jpeg,.pdf,.txt,.xlsx,.xls,.ppt,.pptx,.doc,.docx"
                        onChange={(objEvent) => {
                          const objFile = objEvent.target.files?.[0] ?? null;
                          setObjProofFileInput(objFile);
                        }}
                      />
                    </Button>
                  ) : null}
                  {!blnLocked ? (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      sx={{ borderColor: "#cbd5e1", color: "#475569", "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" } }}
                      onClick={() => void deleteDeclarationProof()}
                    >
                      Delete
                    </Button>
                  ) : null}
                </Stack>
                <Box
                  sx={{
                    border: "1px dashed #99f6e4",
                    backgroundColor: "#f0fdfa",
                    borderRadius: "10px",
                    px: 1,
                    py: 0.7,
                  }}
                >
                  <Typography sx={{ color: "#115e59", fontSize: "0.78rem", fontWeight: 700 }}>
                    Uploaded proof
                  </Typography>
                  <Typography sx={{ color: "#134e4a", fontSize: "0.8rem", wordBreak: "break-word" }}>
                    {objEditRow.objProof.strFileName}
                  </Typography>
                </Box>
              </Stack>
            ) : !blnLocked ? (
              <Button component="label" variant="outlined" size="small" startIcon={<UploadFileRoundedIcon />} sx={{ borderStyle: "dashed", borderWidth: "1.5px", color: "#1d4ed8", borderColor: "#93c5fd" }}>
                Upload Proof
                <input
                  hidden
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf,.txt,.xlsx,.xls,.ppt,.pptx,.doc,.docx"
                  onChange={(objEvent) => {
                    const objFile = objEvent.target.files?.[0] ?? null;
                    setObjProofFileInput(objFile);
                  }}
                />
              </Button>
            ) : null}
            <Typography sx={{ color: "#64748b", fontSize: "0.74rem", mt: -0.2 }}>
              Supported types: PNG, JPG, PDF, TXT, XLS/XLSX, PPT/PPTX, DOC/DOCX. Max size: 10 MB.
            </Typography>
            {(!objEditRow?.objProof || objProofFileInput) && (
              <Typography sx={{ color: "#475569", fontSize: "0.8rem" }}>
                {objProofFileInput ? (
                  <Box component="span" sx={{ color: "#1d4ed8", fontWeight: 700 }}>
                    Selected: {objProofFileInput.name}
                  </Box>
                ) : (
                  "No proof uploaded"
                )}
              </Typography>
            )}
            <Typography sx={{ color: "#475569", fontSize: "0.86rem" }}>Total amount: {formatCurrency(Math.max(0, Number(strAmountInput || 0)))}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditModal}>{blnLocked ? "Close" : "Cancel"}</Button>
          {!blnLocked ? (
            <Button variant="contained" onClick={() => void saveDeclarationEdit()} disabled={blnSaveEditDisabled || blnModalSaving}>
              {blnModalSaving ? <CircularProgress size={16} color="inherit" /> : "Save"}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={blnCompareModalOpen} onClose={() => setBlnCompareModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compare Tax</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.1}>
            <TableContainer sx={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Metric</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Old Regime</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>New Regime</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Taxable Income</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableOld)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableNew)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Estimated Tax</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: objDerivedCalc.strRecommendedRegime === "Old Regime" ? "#166534" : "#0f172a", backgroundColor: objDerivedCalc.strRecommendedRegime === "Old Regime" ? "rgba(220,252,231,0.62)" : undefined }}>
                      {formatCurrency(objDerivedCalc.decOldTax)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: objDerivedCalc.strRecommendedRegime === "New Regime" ? "#166534" : "#0f172a", backgroundColor: objDerivedCalc.strRecommendedRegime === "New Regime" ? "rgba(220,252,231,0.62)" : undefined }}>
                      {formatCurrency(objDerivedCalc.decNewTax)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            <Paper sx={{ p: 1, borderRadius: "8px", border: "1px solid #bde3cb", backgroundColor: "#f0fdf4" }}>
              <Typography sx={{ color: "#166534", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Recommended Regime
              </Typography>
              <Typography sx={{ color: "#14532d", fontSize: "1rem", fontWeight: 900 }}>{objDerivedCalc.strRecommendedRegime}</Typography>
            </Paper>
            <Alert severity="info" sx={{ borderRadius: "10px" }}>
              <Typography sx={{ fontWeight: 800 }}>Estimated Savings: {formatCurrency(objDerivedCalc.decSavings)}</Typography>
              <Typography sx={{ fontSize: "0.8rem", mt: 0.2 }}>
                {objDerivedCalc.strRecommendedRegime === "Either Regime" ? "Both regimes currently result in the same estimated tax." : `${objDerivedCalc.strRecommendedRegime} is recommended because it gives the lower estimated tax based on your current declaration entries.`}
              </Typography>
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.76rem", mt: 0.35 }}>Estimated preview only</Typography> : null}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnCompareModalOpen(false)}>Back</Button>
          <Button variant="contained" onClick={() => { setBlnCompareModalOpen(false); setBlnSubmitModalOpen(true); }}>Continue to Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnSubmitModalOpen} onClose={() => setBlnSubmitModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Submit Declaration</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1}>
            <Paper sx={{ p: 0.9, borderRadius: "8px", border: "1px solid #dbe3ef", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.83rem", color: "#0f172a", mb: 0.4 }}>Declaration Summary</Typography>
              <Stack spacing={0.35}>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Selected Regime</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{strSelectedRegime || strRecommendedRegimeSelectable}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Total Declared Amount</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(decDeclaredTotal)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>Estimated Savings</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(objDerivedCalc.decSavings)}</Typography></Stack>
              </Stack>
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>Estimated preview only</Typography> : null}
            </Paper>
            <Alert severity="warning" sx={{ borderRadius: "8px" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>After submission:</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>Editing will be locked.</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>Selected regime cannot be changed.</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>Uploaded proofs cannot be modified.</Typography>
            </Alert>
            <Typography sx={{ fontSize: "0.83rem", color: "#334155" }}>
              Please confirm that your declaration details and uploaded proofs are final and accurate before submitting.
            </Typography>
            <FormControlLabel
              sx={{ m: 0, alignItems: "flex-start" }}
              control={
                <Checkbox
                  size="small"
                  checked={blnDeclarationConfirm}
                  onChange={(objEvent) => {
                    const blnChecked = objEvent.target.checked;
                    setBlnDeclarationConfirm(blnChecked);
                    if (blnChecked && strWarning.includes("confirmation checkbox")) {
                      setStrWarning("");
                    }
                  }}
                />
              }
              label={<Typography sx={{ fontSize: "0.8rem" }}>I confirm details are correct (required before final submit).</Typography>}
            />
            {!blnDeclarationConfirm ? (
              <Typography sx={{ fontSize: "0.75rem", color: "#b45309", mt: -0.3 }}>
                Please check this confirmation before submitting.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnSubmitModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitDeclaration()} disabled={blnSubmitModalLoading}>
            {blnSubmitModalLoading ? <CircularProgress size={16} color="inherit" /> : "Confirm & Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(strSuccessToast)} autoHideDuration={2000} onClose={() => setStrSuccessToast("")} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={() => setStrSuccessToast("")} severity="success" sx={{ width: "100%" }}>
          {strSuccessToast}
        </Alert>
      </Snackbar>

    </Stack>
  );
}
