"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
  Tooltip,
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
import { useRouter, useSearchParams } from "next/navigation";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import CommonTable, { type CommonTableColumn } from "@/Common/components/CommonTable";
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

type SectionEditEntry = {
  strClientKey: string;
  intItemID?: number | null;
  strSection: string;
  strInvestmentName: string;
  strAmountInput: string;
  objProof?: DeclarationRow["objProof"];
  objProofFileInput?: File | null;
};

const lstStepper = ["Select Tax Regime", "Enter Declarations", "Compare Tax", "Final Submit"];
const strDefaultFinancialYearCode = "2025-2026";
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

function formatPercent(decValue: number) {
  return `${decValue.toFixed(2)}%`;
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

function getDeclarationRowKey(objRow: DeclarationRow) {
  if (objRow.intItemID != null) {
    return `item-${objRow.intItemID}`;
  }
  const strName = (objRow.strInvestmentName || "").trim().toLowerCase();
  if (strName) {
    return `${objRow.strSection.trim().toLowerCase()}::${strName}`;
  }
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
    <Paper sx={{ p: 0.9, borderRadius: "9px", border: "1px solid #d9e3f1", background: "#fff", boxShadow: "0 2px 8px rgba(15, 23, 42, 0.035)" }}>
      <Stack direction="row" spacing={0.8} alignItems="flex-start">
        {objIcon ? <Box sx={{ color: "#5a7aa6", mt: 0.05, "& .MuiSvgIcon-root": { fontSize: 16 } }}>{objIcon}</Box> : null}
        <Box>
          <Typography sx={{ color: "#6b7280", fontSize: "0.7rem", mb: 0.1, lineHeight: 1.15 }}>{strLabel}</Typography>
          <Typography sx={{ color: "#0f172a", fontWeight: 800, fontSize: "0.84rem", lineHeight: 1.15 }}>{strValue}</Typography>
          {strSubValue ? <Typography sx={{ color: "#64748b", fontSize: "0.69rem", mt: 0.1, lineHeight: 1.15 }}>{strSubValue}</Typography> : null}
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
  const objRouter = useRouter();
  const objSearchParams = useSearchParams();
  const strFinancialYearCode = (objSearchParams.get("fy") || "").trim() || strDefaultFinancialYearCode;
  const strRouteRegime = (objSearchParams.get("regime") || "").trim();
  const blnRouteCompare = (objSearchParams.get("compare") || "").trim() === "1";
  const strInitialRegime = (strRouteRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime") as Regime;

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
  const [blnTaxCalcInfoOpen, setBlnTaxCalcInfoOpen] = useState(false);
  const [blnSubmitModalOpen, setBlnSubmitModalOpen] = useState(false);
  const [blnDeclarationConfirm, setBlnDeclarationConfirm] = useState(false);
  const [blnSubmitModalLoading, setBlnSubmitModalLoading] = useState(false);
  const [blnDismissDraftSavedAlert, setBlnDismissDraftSavedAlert] = useState(false);
  const [blnDismissUnsavedAlert, setBlnDismissUnsavedAlert] = useState(false);
  const [blnDismissWarningAlert, setBlnDismissWarningAlert] = useState(false);
  const [blnDismissErrorAlert, setBlnDismissErrorAlert] = useState(false);

  const [objEditRow, setObjEditRow] = useState<DeclarationRow | null>(null);
  const [lstSectionEditEntries, setLstSectionEditEntries] = useState<SectionEditEntry[]>([]);
  const [blnModalSaving, setBlnModalSaving] = useState(false);
  const [lstInvestmentOptionsForRow, setLstInvestmentOptionsForRow] = useState<string[]>([]);
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
  const strDeclarationStatusNormalized = String(strDeclarationStatus || "").trim().toLowerCase();
  const blnHideActionButtons = blnLocked || ["approved", "locked"].includes(strDeclarationStatusNormalized);
  const blnDraftLikeActionsAllowed = ["draft", "released", "rejected", "resubmitted"].includes(strDeclarationStatusNormalized);
  const blnCopyAllowedBeforeCreateOnly = !intDeclarationID;
  const blnRegimeSwitchDisabled = blnLocked || !objRegimeConfig.blnAllowEmployeeOptOut;
  const blnStarted = strFlowStatus !== "NOT_STARTED";
  const blnDraftStatus = !blnLocked && (strFlowStatus === "REGIME_SELECTED" || strFlowStatus === "IN_PROGRESS");
  const blnHasAnyFilled = useMemo(() => lstRows.some((objRow) => objRow.decDeclaredAmount > 0), [lstRows]);
  const lstSectionRows = useMemo(() => {
    const dicBySection = new Map<string, DeclarationRow>();
    for (const objRow of lstRows) {
      const strSectionKey = (objRow.strSection || "").trim().toUpperCase();
      const objExisting = dicBySection.get(strSectionKey);
      if (!objExisting) {
        dicBySection.set(strSectionKey, {
          ...objRow,
          intItemID: null,
          decDeclaredAmount: Math.max(0, objRow.decDeclaredAmount || 0),
        });
        continue;
      }
      const decMergedAmount = Math.max(0, objExisting.decDeclaredAmount || 0) + Math.max(0, objRow.decDeclaredAmount || 0);
      const strMergedStatus: DeclarationRow["strStatus"] =
        decMergedAmount > 0
          ? "Completed"
          : (objExisting.strStatus === "In Progress" || objRow.strStatus === "In Progress")
            ? "In Progress"
            : "Not Started";
      dicBySection.set(strSectionKey, {
        ...objExisting,
        decDeclaredAmount: decMergedAmount,
        strStatus: strMergedStatus,
      });
    }
    return Array.from(dicBySection.values());
  }, [lstRows]);
  const lstDeclarationGridRows = useMemo(() => {
    return lstSectionRows.map((objRow, intIndex) => ({
      id: objRow.intItemID ?? `${objRow.strSection}-${intIndex}`,
      category: getGroupName(objRow),
      section: <Typography sx={{ fontWeight: 700 }}>{objRow.strSection}</Typography>,
      description: <Typography>{objRow.strDescription}</Typography>,
      declaredAmount: (
        <Box>
          <Typography sx={{ fontSize: "0.85rem" }}>{formatCurrency(objRow.decDeclaredAmount)}</Typography>
          {objRow.strEligibilityNote ? <Typography sx={{ fontSize: "0.72rem", color: "#b45309" }}>{objRow.strEligibilityNote}</Typography> : null}
        </Box>
      ),
      maxLimit: <Typography>{objRow.strMaxLimitDisplay}</Typography>,
      status: (
        <Chip
          size="small"
          label={objRow.strStatus}
          sx={{
            fontWeight: 700,
            color: objRow.strStatus === "Completed" ? "#166534" : objRow.strStatus === "Proof Pending" ? "#9a3412" : objRow.strStatus === "In Progress" ? "#9a3412" : "#475569",
            backgroundColor: objRow.strStatus === "Completed" ? "#dcfce7" : objRow.strStatus === "Proof Pending" ? "#ffedd5" : objRow.strStatus === "In Progress" ? "#ffedd5" : "#e2e8f0",
          }}
        />
      ),
      action: (
        <Button
          data-testid="salary.it-declaration.back.button"
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
      ),
    }));
  }, [blnLocked, blnStarted, lstSectionRows]);
  const lstDeclarationColumns: CommonTableColumn<(typeof lstDeclarationGridRows)[number]>[] = [
    { field: "category", headerName: "Category", width: 130 },
    { field: "section", headerName: "Section", width: 90, sortable: false },
    { field: "description", headerName: "Description", width: 180, sortable: false },
    { field: "declaredAmount", headerName: "Declared Amount", width: 150, sortable: false },
    { field: "maxLimit", headerName: "Max Limit", width: 100, sortable: false },
    { field: "status", headerName: "Status", width: 120, sortable: false },
    { field: "action", headerName: "Action", width: 100, sortable: false, align: "center", exportable: false },
  ];
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
      const decTaxableOldFromSummary = Math.max(0, objTaxSummary.decTaxableIncome || 0);
      const decExemptionsFromTaxableDelta = Math.max(0, decGross - decTaxableOldFromSummary);
      const decExemptionsFromApi = Math.max(0, objTaxSummary.decExemptions || 0);
      const decEffectiveExemptions = decExemptionsFromApi > 0 ? decExemptionsFromApi : decExemptionsFromTaxableDelta;
      return {
        blnPreviewOnly: false,
        blnRuleBasedFallback: false,
        decGrossSalary: decGross,
        decExemptions: decEffectiveExemptions,
        decTaxableOld: decTaxableOldFromSummary,
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
  const decOldEffectiveRate = objDerivedCalc.decTaxableOld > 0 ? (objDerivedCalc.decOldTax / objDerivedCalc.decTaxableOld) * 100 : 0;
  const decNewEffectiveRate = objDerivedCalc.decTaxableNew > 0 ? (objDerivedCalc.decNewTax / objDerivedCalc.decTaxableNew) * 100 : 0;
  const intActiveStep = useMemo(() => {
    if (strFlowStatus === "NOT_STARTED") return 0;
    if (strFlowStatus === "REGIME_SELECTED") return 1;
    if (strFlowStatus === "IN_PROGRESS" && !blnCompared) return 1;
    if (strFlowStatus === "IN_PROGRESS" && blnCompared) return 2;
    return 3;
  }, [strFlowStatus, blnCompared]);
  const decAmountMaxInput = 99_99_99_999;
  const decActiveMaxLimit = objEditRow ? (objEditRow.decMaxEligibleAmount ?? parseMaxLimit(objEditRow.strMaxLimitDisplay)) : null;
  const decSectionEditTotal = useMemo(
    () => lstSectionEditEntries.reduce((decTotal, objEntry) => decTotal + Math.max(0, Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0)), 0),
    [lstSectionEditEntries]
  );
  const strSectionEditError = useMemo(() => {
    if (!objEditRow) return "";
    const dicNameCount = new Map<string, number>();
    for (const objEntry of lstSectionEditEntries) {
      const strNameKey = objEntry.strInvestmentName.trim().toLowerCase();
      if (!strNameKey) continue;
      dicNameCount.set(strNameKey, (dicNameCount.get(strNameKey) ?? 0) + 1);
    }
    if (Array.from(dicNameCount.values()).some((intCount) => intCount > 1)) {
      return "Duplicate investment is not allowed.";
    }
    for (const objEntry of lstSectionEditEntries) {
      const strName = objEntry.strInvestmentName.trim();
      const decAmount = Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0);
      if (!strName) return "Investment name is required for all rows.";
      if (!objEntry.strAmountInput.trim()) return "Declared amount is required for all rows.";
      if (!Number.isFinite(decAmount) || decAmount < 0) return "All row amounts must be valid positive values.";
      if (decAmount <= 0) return "Declared amount must be greater than zero for all rows.";
      if (decAmount > decAmountMaxInput) return `Amount cannot exceed ${formatCurrency(decAmountMaxInput)}.`;
    }
    if (decActiveMaxLimit != null && decSectionEditTotal > decActiveMaxLimit) {
      return `Section total cannot exceed ${formatCurrency(decActiveMaxLimit)}.`;
    }
    return "";
  }, [objEditRow, lstSectionEditEntries, decActiveMaxLimit]);
  const blnSaveEditDisabled = Boolean(strSectionEditError);

  function hydrateFromApi(objData: ItDeclarationDto) {
    const blnSummaryFallback = Boolean(objData.objSummary?.blnSummaryFallback);
    const blnHasSummary =
      objData.objSummary != null &&
      Number.isFinite(objData.objSummary.decOldTax) &&
      Number.isFinite(objData.objSummary.decNewTax) &&
      !blnSummaryFallback;
    setBlnSummaryFromApi(blnHasSummary);
    setIntDeclarationID(objData.intDeclarationID ?? null);
    setStrFlowStatus(objData.strFlowStatus as FlowStatus);
    setStrDeclarationStatus(objData.strDeclarationStatus ?? "draft");
    setStrSelectedRegime((objData.strSelectedRegime || "") as Regime | "");
    setStrLastUpdated(objData.strLastUpdated || getDateLabel());
    setLstRows(
      objData.lstItems?.length
        ? objData.lstItems.map((objItem) => {
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
    if (blnSummaryFallback) {
      setStrWarning(
        objData.objSummary?.strSummaryWarning?.trim()
          ? `Tax summary is in preview mode: ${objData.objSummary.strSummaryWarning}`
          : "Tax summary is in preview mode due to missing tax setup."
      );
      setBlnDismissWarningAlert(false);
    }
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
      const objData =
        strRouteRegime
          ? await itDeclarationService.startDeclaration(strFinancialYearCode, strInitialRegime)
          : await itDeclarationService.getDeclaration(strFinancialYearCode);
      hydrateFromApi(objData);
      const lstMasterRows = await loadRowsFromCategoryMaster().catch(() => []);
      if (!objData.lstItems?.length) {
        setLstRows(lstMasterRows.map((objRow) => ({ ...objRow, strStatus: resolveRowStatus(objRow) })));
      } else if (lstMasterRows.length > 0) {
        setLstRows((lstCurrentRows) => mergeSectionRules(lstCurrentRows, lstMasterRows));
      }
      if (blnRouteCompare) {
        setBlnCompareModalOpen(true);
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
    if (!objSearchParams.get("fy")) {
      objRouter.replace("/salary/ess-declarations");
      return;
    }
    void loadDeclaration();
  }, [strFinancialYearCode, strRouteRegime, blnRouteCompare]);

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
    const lstSectionRows = lstRows.filter((objCurrentRow) => objCurrentRow.strSection === objRow.strSection && (objCurrentRow.intItemID != null || objCurrentRow.decDeclaredAmount > 0 || objCurrentRow.strInvestmentName.trim()));
    const lstNormalized = (lstSectionRows.length > 0 ? lstSectionRows : [objRow]).map((objCurrentRow, intIndex) => ({
      strClientKey: `row-${objCurrentRow.intItemID ?? `new-${intIndex}`}`,
      intItemID: objCurrentRow.intItemID,
      strSection: objCurrentRow.strSection,
      strInvestmentName: objCurrentRow.strInvestmentName || "",
      strAmountInput: objCurrentRow.decDeclaredAmount ? formatAmountInput(String(objCurrentRow.decDeclaredAmount)) : "",
      objProof: objCurrentRow.objProof ?? null,
      objProofFileInput: null,
    }));
    setLstSectionEditEntries(lstNormalized.length > 0 ? lstNormalized : [{
      strClientKey: `row-new-${Date.now()}`,
      intItemID: null,
      strSection: objRow.strSection,
      strInvestmentName: "",
      strAmountInput: "",
      objProof: null,
      objProofFileInput: null,
    }]);
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
    setLstSectionEditEntries([]);
    setLstInvestmentOptionsForRow([]);
  }

  function addInvestmentRow() {
    if (!objEditRow) return;
    const blnHasIncompleteRow = lstSectionEditEntries.some((objEntry) => {
      const strName = objEntry.strInvestmentName.trim();
      const decAmount = Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0);
      return !strName || !objEntry.strAmountInput.trim() || !Number.isFinite(decAmount) || decAmount <= 0;
    });
    if (blnHasIncompleteRow) {
      setStrWarning("Complete Investment name and Declared amount for current rows before adding a new investment.");
      return;
    }
    setLstSectionEditEntries((lstCurrent) => [
      ...lstCurrent,
      {
        strClientKey: `row-new-${Date.now()}-${lstCurrent.length}`,
        intItemID: null,
        strSection: objEditRow.strSection,
        strInvestmentName: "",
        strAmountInput: "",
        objProof: null,
        objProofFileInput: null,
      },
    ]);
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
    if (strSectionEditError) return;
    setBlnModalSaving(true);
    try {
      setStrSavingLabel("Saving declaration rows...");
      setBlnSaving(true);

      const lstRowsToDelete = lstSectionEditEntries.filter((objEntry) =>
        objEntry.intItemID != null &&
        !objEntry.strInvestmentName.trim() &&
        Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0) <= 0
      );
      for (const objDeleteEntry of lstRowsToDelete) {
        if (intDeclarationID && objDeleteEntry.intItemID) {
          const objData = await itDeclarationService.deleteItem(intDeclarationID, objDeleteEntry.intItemID);
          hydrateFromApi(objData);
        }
      }

      for (const objEntry of lstSectionEditEntries) {
        const strInvestmentName = objEntry.strInvestmentName.trim();
        const decAmount = Math.max(0, Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0));
        if (!strInvestmentName && decAmount <= 0) continue;
        const objPersisted = await ensureDeclarationAndSaveSingleItem({
          intItemID: objEntry.intItemID,
          strSection: objEntry.strSection,
          strInvestmentName,
          decDeclaredAmount: decAmount,
        });
        if (objEntry.objProofFileInput && objPersisted.intItemID) {
          const objData = await itDeclarationService.uploadItemProof(objPersisted.intDeclarationID, objPersisted.intItemID, objEntry.objProofFileInput);
          hydrateFromApi(objData);
        }
      }

      // Always re-fetch declaration once all row operations are done, so modal reopen reflects persisted server rows.
      const objRefreshed = await itDeclarationService.getDeclaration(strFinancialYearCode);
      hydrateFromApi(objRefreshed);

      setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : "IN_PROGRESS"));
      setBlnCompared(false);
      setStrLastUpdated(getDateLabel());
      setObjEditRow(null);
      setLstSectionEditEntries([]);
      setBlnDraftSaved(true);
      setStrSuccessToast("Declaration rows saved successfully.");
    } finally {
      setBlnSaving(false);
      setStrSavingLabel("Saving...");
      setBlnModalSaving(false);
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

  async function copyPreviousFinancialYear() {
    if (blnLocked) return;
    setBlnSaving(true);
    setStrSavingLabel("Copying previous FY...");
    setStrError("");
    try {
      const intResolvedDeclarationID = await persistDraftToDb();
      if (!intResolvedDeclarationID) return;
      const objData = await itDeclarationService.copyPreviousDeclaration(intResolvedDeclarationID);
      hydrateFromApi(objData);
      setStrSuccessToast("Previous FY declaration copied.");
      setBlnCompared(false);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, "Unable to copy previous FY declaration."));
    } finally {
      setBlnSaving(false);
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
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1}>
          <Stack spacing={0.5} alignItems="flex-start">
            <Button
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ color: "#e2e8f0", minHeight: 22, px: 0.5, "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" } }}
              onClick={() => objRouter.push("/salary/ess-declarations")}
            >
              Back
            </Button>
            <Stack direction="row" spacing={0.9} alignItems="center" sx={{ mt: 0.1 }}>
              <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />
              <Box>
                <Typography sx={{ color: "#f8fcff", fontWeight: 800, fontSize: "0.98rem", lineHeight: 1.2, mb: 0.2 }}>IT Declaration & Tax Planning</Typography>
                <Typography sx={{ color: "rgba(239,252,255,0.92)", fontSize: "0.74rem", lineHeight: 1.2 }}>Financial Year {strFinancialYearCode}</Typography>
              </Box>
            </Stack>
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
                  "& .MuiFormControlLabel-root.Mui-disabled .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.82)" },
                  "& .MuiRadio-root": { color: "rgba(239,252,255,0.95)" },
                  "& .MuiRadio-root.Mui-disabled": { color: "rgba(239,252,255,0.75)" },
                  "& .Mui-checked": { color: "#ffffff !important" },
                }}
              >
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="Old Regime" control={<Radio size="small" />} label={`Old Regime${objDerivedCalc.strRecommendedRegime === "Old Regime" ? " (Recommended)" : ""}`} />
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="New Regime" control={<Radio size="small" />} label="New Regime" />
              </RadioGroup>
              {!blnHideActionButtons ? (
                <>
                  <Button data-testid="salary.it-declaration.save-draft.button" variant="contained" size="small" onClick={() => void saveDraft()} disabled={blnLocked || !blnDraftLikeActionsAllowed} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f" }, "&.Mui-disabled": { backgroundColor: "rgba(11,63,115,0.52)", color: "rgba(255,255,255,0.92)" } }}>
                    Save Draft
                  </Button>
                  {blnCopyAllowedBeforeCreateOnly && strFlowStatus === "NOT_STARTED" ? (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={blnLocked || blnSaving}
                      onClick={() => void copyPreviousFinancialYear()}
                      sx={{
                        minHeight: 30,
                        borderRadius: "8px",
                        backgroundColor: "#1d4ed8",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.76rem",
                        textTransform: "none",
                        boxShadow: "none",
                        "&:hover": { backgroundColor: "#1e40af" },
                        "&.Mui-disabled": {
                          backgroundColor: "rgba(148,163,184,0.35)",
                          color: "rgba(226,232,240,0.92)",
                          border: "1px dashed rgba(203,213,225,0.65)",
                          cursor: "not-allowed",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Copy Previous FY
                    </Button>
                  ) : null}
                  <Button data-testid="salary.it-declaration.compare-tax.button" variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked || blnSaving || !blnDraftLikeActionsAllowed} onClick={() => void runCompareAndOpenModal()} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0369a1", color: "#ffffff", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 0 0 1px rgba(3,105,161,0.18)", "&:hover": { backgroundColor: "#075985" }, "&.Mui-disabled": { backgroundColor: "rgba(148,163,184,0.35)", color: "rgba(226,232,240,0.92)", border: "1px dashed rgba(203,213,225,0.65)", cursor: "not-allowed", boxShadow: "none" } }}>
                    {blnSaving && strSavingLabel.includes("comparing") ? "Comparing..." : "Compare Tax"}
                  </Button>
                  <Button data-testid="salary.it-declaration.submit.button" variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked || !blnDraftLikeActionsAllowed} onClick={() => setBlnSubmitModalOpen(true)} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#d97706" }, "&.Mui-disabled": { backgroundColor: "rgba(148,163,184,0.35)", color: "rgba(226,232,240,0.92)", border: "1px dashed rgba(203,213,225,0.65)", cursor: "not-allowed", boxShadow: "none" } }}>
                    Submit Declaration
                  </Button>
                </>
              ) : null}
            </Stack>
            {!objRegimeConfig.blnAllowEmployeeOptOut ? (
              <>
                <Typography sx={{ fontSize: "0.72rem", color: "rgba(239,252,255,0.85)" }}>
                  Regime is locked by policy. Default regime: {objRegimeConfig.strDefaultRegime}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "rgba(239,252,255,0.85)" }}>
                  If you do not submit your IT declaration before the deadline, the New Tax Regime will be applied by default.
                </Typography>
              </>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      {blnDraftSaved && !blnDismissDraftSavedAlert ? (
        <Fade in={!blnDismissDraftSavedAlert}>
          <Alert
            severity="success"
            variant="filled"
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
            variant="filled"
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
            variant="filled"
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
            variant="filled"
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
          <SummaryCard
            strLabel="Gross Salary"
            strValue={formatCurrency(objDerivedCalc.decGrossSalary)}
            strSubValue={objDerivedCalc.decGrossSalary > 0 ? "From payroll data" : "Payroll gross not available"}
            objIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 0.8, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          {lstStepper.map((strStep, intIndex) => (
            <FlowNode key={strStep} strLabel={strStep} intStep={intIndex + 1} blnActive={intIndex <= intActiveStep} />
          ))}
        </Stack>
      </Paper>
      <Grid container spacing={0.6}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>Your Declarations</Typography>
              <Button variant="outlined" size="small" sx={{ minHeight: 28, py: 0.1, fontSize: "0.75rem" }} onClick={() => void loadDeclaration()} disabled={blnLocked}>Refresh Amounts</Button>
            </Stack>
            <Box sx={{ height: intDeclarationTableMaxHeight, borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <CommonTable
                columns={lstDeclarationColumns}
                rows={lstDeclarationGridRows}
                rowIdField={"id"}
                defaultPageSize={500}
                hideToolbar
                minTableWidth={840}
                withPaper={false}
                emptyMessage="No declaration sections available. Check Tax Declaration Component master data and ESS IT declaration API."
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef", height: "100%" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>Tax Summary (Live)</Typography>
              <Tooltip title="View detailed tax calculation">
                <IconButton size="small" onClick={() => setBlnTaxCalcInfoOpen(true)} sx={{ color: "#475569" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
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

      <Dialog open={Boolean(objEditRow)} onClose={closeEditModal} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ py: 1.1, px: 2 }}>Edit Declaration ({objEditRow?.strSection})</DialogTitle>
        <DialogContent sx={{ pt: "8px !important", pb: "6px !important" }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {!blnLocked ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddCircleOutlineRoundedIcon />}
                  sx={{ minHeight: 28, px: 1.05, fontSize: "0.74rem", textTransform: "none", borderRadius: "8px", backgroundColor: "#0b3f73", "&:hover": { backgroundColor: "#0a355f" } }}
                  onClick={addInvestmentRow}
                >
                  Add Investment
                </Button>
              ) : <Box />}
              <Typography sx={{ color: "#334155", fontSize: "0.82rem", fontWeight: 800 }}>
                Section total: {formatCurrency(decSectionEditTotal)}
              </Typography>
            </Stack>
            <Stack spacing={0.5}>
              {lstSectionEditEntries.map((objEntry, intIndex) => (
                <Paper key={objEntry.strClientKey} sx={{ pt: 0.7, pb: 0.45, px: 0.55, borderRadius: "8px", border: "1px solid #dbe3ef" }}>
                  <Stack spacing={0.3}>
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={0.6} alignItems={{ lg: "flex-start" }}>
                      <Box sx={{ width: { xs: "100%", lg: "4%" }, pt: { lg: 1.1 } }}>
                        <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#334155", textAlign: { xs: "left", lg: "center" } }}>
                          {intIndex + 1}
                        </Typography>
                      </Box>
                      <Box sx={{ width: { xs: "100%", lg: "44%" } }}>
                        <Autocomplete
                          freeSolo
                          options={lstInvestmentOptionsForRow}
                          value={objEntry.strInvestmentName}
                          onInputChange={(_, strValue) => {
                            setLstSectionEditEntries((lstCurrent) => lstCurrent.map((objCurrent) => (
                              objCurrent.strClientKey === objEntry.strClientKey ? { ...objCurrent, strInvestmentName: strValue } : objCurrent
                            )));
                          }}
                          readOnly={blnLocked}
                          renderInput={(params) => {
                            const strCurrentName = objEntry.strInvestmentName.trim().toLowerCase();
                            const intDuplicateCount = lstSectionEditEntries.filter((objCurrent) => objCurrent.strInvestmentName.trim().toLowerCase() === strCurrentName && strCurrentName).length;
                            const blnDuplicate = intDuplicateCount > 1;
                            const blnMandatoryMissing = !objEntry.strInvestmentName.trim();
                            return (
                              <TextField
                                {...params}
                                label="Investment name *"
                                size="small"
                                error={blnDuplicate || blnMandatoryMissing}
                                helperText={blnDuplicate ? "Duplicate investment is not allowed." : blnMandatoryMissing ? "Investment name is mandatory." : undefined}
                                InputProps={{ ...params.InputProps, readOnly: blnLocked }}
                                sx={{ "& .MuiInputBase-root": { minHeight: 34 } }}
                                fullWidth
                              />
                            );
                          }}
                        />
                      </Box>
                      <Box sx={{ width: { xs: "100%", lg: "19%" } }}>
                        <TextField
                          label="Declared amount *"
                          size="small"
                          inputMode="numeric"
                          value={objEntry.strAmountInput}
                          onChange={(objEvent) => {
                            const strNext = formatAmountInput(objEvent.target.value);
                            setLstSectionEditEntries((lstCurrent) => lstCurrent.map((objCurrent) => (
                              objCurrent.strClientKey === objEntry.strClientKey ? { ...objCurrent, strAmountInput: strNext } : objCurrent
                            )));
                          }}
                          sx={{ "& .MuiInputBase-root": { minHeight: 34 } }}
                          error={!objEntry.strAmountInput.trim() || Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0) <= 0}
                          helperText={!objEntry.strAmountInput.trim() ? "Declared amount is mandatory." : Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0) <= 0 ? "Amount must be greater than zero." : undefined}
                          InputProps={{ readOnly: blnLocked }}
                          fullWidth
                        />
                      </Box>
                      <Stack direction="row" spacing={0.45} alignItems="center" sx={{ width: { xs: "100%", lg: "15%" }, pt: { lg: 0.25 } }}>
                        {!blnLocked ? (
                          <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            startIcon={<UploadFileRoundedIcon />}
                            sx={{
                              minHeight: 26,
                              px: 0.9,
                              py: 0.25,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              textTransform: "none",
                              borderRadius: "7px",
                              borderColor: "#2563eb",
                              color: "#1d4ed8",
                              backgroundColor: "#eff6ff",
                              "& .MuiSvgIcon-root": { color: "#1d4ed8", fontSize: "1rem" },
                              "&:hover": { borderColor: "#1d4ed8", backgroundColor: "#dbeafe" },
                            }}
                          >
                            {objEntry.objProof || objEntry.objProofFileInput ? "Replace" : "Upload"}
                            <input
                              hidden
                              type="file"
                              accept=".png,.jpg,.jpeg,.pdf"
                              onChange={(objEvent) => {
                                const objFile = objEvent.target.files?.[0] ?? null;
                                setLstSectionEditEntries((lstCurrent) => lstCurrent.map((objCurrent) => (
                                  objCurrent.strClientKey === objEntry.strClientKey ? { ...objCurrent, objProofFileInput: objFile } : objCurrent
                                )));
                              }}
                            />
                          </Button>
                        ) : null}
                        {!blnLocked ? (
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              sx={{ border: "1px solid #cbd5e1", borderRadius: "7px", color: "#475569", p: 0.45, "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" } }}
                              onClick={async () => {
                                if (objEntry.intItemID && intDeclarationID) {
                                  try {
                                    const objData = await itDeclarationService.deleteItem(intDeclarationID, objEntry.intItemID);
                                    hydrateFromApi(objData);
                                  } catch (objError) {
                                    setStrError(formatApiErrorForUi(objError, "Unable to delete investment row."));
                                    return;
                                  }
                                }
                                setLstSectionEditEntries((lstCurrent) => lstCurrent.filter((objCurrent) => objCurrent.strClientKey !== objEntry.strClientKey));
                              }}
                            >
                              <DeleteOutlineRoundedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : null}
                      </Stack>
                      <Typography
                        sx={{
                          color: objEntry.objProofFileInput ? "#1d4ed8" : "#64748b",
                          fontSize: "0.7rem",
                          fontWeight: objEntry.objProofFileInput ? 700 : 500,
                          lineHeight: 1.2,
                          width: { xs: "100%", lg: "18%" },
                          pt: { lg: 1.0 },
                        }}
                      >
                        {objEntry.objProofFileInput
                          ? `Selected: ${objEntry.objProofFileInput.name}`
                          : objEntry.objProof?.strFileName
                            ? `Uploaded: ${objEntry.objProof.strFileName}`
                            : "No proof uploaded"}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            {strSectionEditError && strSectionEditError.toLowerCase().includes("section total") ? (
              <Typography sx={{ fontSize: "0.73rem", color: "#b91c1c", fontWeight: 700 }}>{strSectionEditError}</Typography>
            ) : null}
            {decActiveMaxLimit != null ? (
              <Typography sx={{ color: "#64748b", fontSize: "0.74rem", mt: -0.35 }}>
                Max allowed under {objEditRow?.strSection}: {formatCurrency(decActiveMaxLimit)}
              </Typography>
            ) : null}
            <Typography sx={{ color: "#b45309", fontSize: "0.72rem", mt: -0.15, lineHeight: 1.2, fontWeight: 600 }}>
              Supported document types: PDF, JPG/JPEG, PNG. Max size: 10 MB.
            </Typography>
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
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontWeight: 800 }}>Compare Tax</Typography>
            <Tooltip title="View detailed tax calculation">
              <IconButton size="small" onClick={() => setBlnTaxCalcInfoOpen(true)} sx={{ color: "#475569" }}>
                <InfoOutlinedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogTitle>
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

      <Dialog open={blnTaxCalcInfoOpen} onClose={() => setBlnTaxCalcInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ py: 1.1 }}>Tax Calculation Details</DialogTitle>
        <DialogContent sx={{ pt: "10px !important" }}>
          <Stack spacing={1}>
            <Alert severity="info" sx={{ borderRadius: "8px" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                Old Regime taxable income is reduced by eligible exemptions. New Regime uses gross salary in this summary view.
              </Typography>
              {objDerivedCalc.blnPreviewOnly ? (
                <Typography sx={{ fontSize: "0.76rem", mt: 0.25 }}>
                  Showing estimated values based on current saved/unsaved declaration inputs.
                </Typography>
              ) : null}
            </Alert>
            <Grid container spacing={0.8}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0.85, borderRadius: "8px", border: "1px solid #bfdbfe", background: "linear-gradient(140deg, #eff6ff 0%, #f8fbff 100%)", height: "100%" }}>
                  <Stack spacing={0.22}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e3a8a" }}>Formula Guide</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>A = Gross Salary</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>B = Eligible Exemptions considered for that regime</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>Taxable Income = A - B</Typography>
                    <Typography sx={{ fontSize: "0.73rem", color: "#475569", mt: 0.1 }}>
                      In this view, declaration-based exemptions are applied to Old Regime. For New Regime, B is shown as 0.
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0.85, borderRadius: "8px", border: "1px solid #bbf7d0", background: "linear-gradient(140deg, #f0fdf4 0%, #f8fff8 100%)", height: "100%" }}>
                  <Stack spacing={0.22}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#166534" }}>Tax Amount Formula Flow</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>C = Taxable Income (A - B)</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>D = Estimated Tax (from regime slab rules in payroll tax engine)</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>Effective Tax Rate = D / C</Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "#475569", mt: 0.1 }}>
                  Old: {formatPercent(decOldEffectiveRate)} | New: {formatPercent(decNewEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Old rate = {formatCurrency(objDerivedCalc.decOldTax)} / {formatCurrency(objDerivedCalc.decTaxableOld)} × 100 = {formatPercent(decOldEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                  New rate = {formatCurrency(objDerivedCalc.decNewTax)} / {formatCurrency(objDerivedCalc.decTaxableNew)} × 100 = {formatPercent(decNewEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "#475569" }}>
                  Estimated Savings = |Estimated Tax (Old) - Estimated Tax (New)|
                </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
            <TableContainer sx={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Calculation Step</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Old Regime</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>New Regime</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Gross Salary (A)</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decGrossSalary)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decGrossSalary)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Total Declared Amount</TableCell>
                    <TableCell>{formatCurrency(decDeclaredTotal)}</TableCell>
                    <TableCell>{formatCurrency(decDeclaredTotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Eligible Exemptions (B)</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decExemptions)}</TableCell>
                    <TableCell>{formatCurrency(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Taxable Income (A - B)</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableOld)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableNew)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Estimated Tax</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(objDerivedCalc.decOldTax)}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(objDerivedCalc.decNewTax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Estimated Savings</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#166534" }}>{formatCurrency(objDerivedCalc.decSavings)}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>
                      {objDerivedCalc.strRecommendedRegime === "Either Regime" ? "No difference" : `${objDerivedCalc.strRecommendedRegime} recommended`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnTaxCalcInfoOpen(false)}>Close</Button>
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
