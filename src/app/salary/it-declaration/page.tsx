"use client";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
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
  MenuItem,
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
import FileUploadButton from "@/components/shared/files/FileUploadButton";
import ITDeclarationStatusBadge from "@/features/it-declaration/components/ITDeclarationStatusBadge";
import { hrItDeclarationService, itDeclarationService, type ItDeclarationDto } from "@/features/it-declaration/services/itDeclarationService";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import type { FileUploadProgressHandler } from "@/lib/fileUploadService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";
import { type EssDeclarationCategoryApiRecord } from "@/services/master/MasterApiService";

type FlowStatus = "NOT_STARTED" | "REGIME_SELECTED" | "IN_PROGRESS" | "SUBMITTED";
type Regime = "Old Regime" | "New Regime";
type MaxLimitAppliedAt = "ENTRY_LEVEL" | "APPROVAL_LEVEL";

type DeclarationRow = {
  intItemID?: number | null;
  strSection: string;
  strCategory?: string;
  strDescription: string;
  strApplicableRegime?: "old" | "new" | "both";
  strMaxLimitDisplay: string;
  decMaxEligibleAmount?: number | null;
  strMaxLimitAppliedAt?: MaxLimitAppliedAt;
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

function base64ToObjectUrl(strBase64: string, strMimeType: string): string {
  const strBinary = atob(strBase64);
  const bytArray = new Uint8Array(strBinary.length);
  for (let intIndex = 0; intIndex < strBinary.length; intIndex += 1) {
    bytArray[intIndex] = strBinary.charCodeAt(intIndex);
  }
  return URL.createObjectURL(new Blob([bytArray], { type: strMimeType || "application/octet-stream" }));
}

function parseMaxLimit(objMaxLimit: unknown) {
  if (typeof objMaxLimit === "number") return Number.isFinite(objMaxLimit) ? objMaxLimit : null;
  const strMaxLimit = String(objMaxLimit || "").trim();
  if (!strMaxLimit || strMaxLimit === "-") return null;
  const strDigits = strMaxLimit.replace(/[^0-9.]/g, "");
  const decParsed = Number(strDigits);
  return Number.isFinite(decParsed) ? decParsed : null;
}

function asObjectRecord(objValue: unknown) {
  if (!objValue || typeof objValue !== "object" || Array.isArray(objValue)) return null;
  return objValue as Record<string, unknown>;
}

function getNumericValue(objValue: unknown) {
  if (typeof objValue === "number") return Number.isFinite(objValue) ? objValue : null;
  if (typeof objValue === "string" && objValue.trim()) {
    const decParsed = Number(objValue);
    return Number.isFinite(decParsed) ? decParsed : null;
  }
  return null;
}

function resolveMaxLimitAmount(objRecord: Record<string, unknown>) {
  return parseMaxLimit(
    objRecord.decMaxLimitAmount ??
    objRecord.decMaxLimit ??
    objRecord.strMaxLimitAmount ??
    objRecord.maxLimitAmount ??
    objRecord.max_limit_amount ??
    objRecord.maximum_limit_amount ??
    objRecord.max_limit ??
    objRecord.strMaxLimit
  );
}

function normalizeMaxLimitAppliedAt(objValue: unknown): MaxLimitAppliedAt {
  const strValue = String(objValue || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return strValue === "APPROVAL_LEVEL" ? "APPROVAL_LEVEL" : "ENTRY_LEVEL";
}

function normalizeApplicableRegime(objValue: unknown): "old" | "new" | "both" {
  const strValue = String(objValue || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (strValue === "new" || strValue === "new_regime") return "new";
  if (strValue === "old" || strValue === "old_regime") return "old";
  if (strValue === "all" || strValue === "both" || strValue === "both_regimes") return "both";
  return "old";
}

function resolveRegimeBucket(strRegime: Regime | ""): "old" | "new" {
  return strRegime === "New Regime" ? "new" : "old";
}

function filterMasterRowsByRegime(lstMasterRows: DeclarationRow[], strRegime: Regime | "") {
  const strBucket = resolveRegimeBucket(strRegime);
  return lstMasterRows.filter((objRow) => {
    const strApplicableRegime = normalizeApplicableRegime(objRow.strApplicableRegime);
    return strApplicableRegime === "both" || strApplicableRegime === strBucket;
  });
}

function resolveBooleanFlag(objValue: unknown, blnDefault = false) {
  if (typeof objValue === "boolean") return objValue;
  if (typeof objValue === "number") return objValue !== 0;
  if (typeof objValue === "string") {
    const strValue = objValue.trim().toLowerCase();
    if (["true", "1", "yes", "y", "active"].includes(strValue)) return true;
    if (["false", "0", "no", "n", "inactive"].includes(strValue)) return false;
  }
  return blnDefault;
}

function formatDeclarationKind(objValue: unknown) {
  const strValue = String(objValue || "").trim();
  if (!strValue) return "";
  const strNormalized = strValue.toUpperCase().replace(/[\s-]+/g, "_");
  const dicKnownLabels: Record<string, string> = {
    DEDUCTION: "Deductions",
    DEDUCTIONS: "Deductions",
    EXEMPTION: "Exemptions",
    EXEMPTIONS: "Exemptions",
    OTHER_EXEMPTION: "Other Exemptions",
    OTHER_EXEMPTIONS: "Other Exemptions",
    LOAN: "Loans & Property",
    LOANS: "Loans & Property",
    LOANS_PROPERTY: "Loans & Property",
    LOANS_AND_PROPERTY: "Loans & Property",
  };
  if (dicKnownLabels[strNormalized]) return dicKnownLabels[strNormalized];
  return strValue
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

function resolveCategoryRows(objData: unknown): EssDeclarationCategoryApiRecord[] {
  if (Array.isArray(objData)) return objData as EssDeclarationCategoryApiRecord[];
  if (!objData || typeof objData !== "object") return [];
  const objValue = objData as Record<string, unknown>;
  for (const strKey of ["lstCategories", "lstRecords", "items", "rows", "records", "results", "data", "Data"]) {
    if (Array.isArray(objValue[strKey])) return objValue[strKey] as EssDeclarationCategoryApiRecord[];
  }
  return [];
}

function getGroupName(objRow: DeclarationRow) {
  if (objRow.strCategory?.trim()) return objRow.strCategory.trim();
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

// Normalize section codes so "SEC_80CCD_1B" and "80CCD(1B)" are treated as the same section.
// Strips optional "SEC_" prefix then removes all non-alphanumeric characters.
function normalizeSectionKey(strSection: string) {
  return strSection.trim().toUpperCase().replace(/^SEC_/, "").replace(/[^A-Z0-9]/g, "");
}

function mergeSectionRules(lstBaseRows: DeclarationRow[], lstRuleRows: DeclarationRow[]) {
  if (lstRuleRows.length === 0) return lstBaseRows;
  const dicRuleBySection = new Map<string, DeclarationRow>();
  for (const objRuleRow of lstRuleRows) {
    dicRuleBySection.set(objRuleRow.strSection.trim().toUpperCase(), objRuleRow);
    dicRuleBySection.set(normalizeSectionKey(objRuleRow.strSection), objRuleRow);
  }
  return lstBaseRows.map((objRow) => {
    const objRule =
      dicRuleBySection.get(objRow.strSection.trim().toUpperCase()) ??
      dicRuleBySection.get(normalizeSectionKey(objRow.strSection));
    if (!objRule) return { ...objRow, strStatus: resolveRowStatus(objRow) };
    const decConfigured = objRule.decMaxEligibleAmount ?? parseMaxLimit(objRule.strMaxLimitDisplay);
    const objMerged: DeclarationRow = {
      ...objRow,
      strDescription: objRule.strDescription || objRow.strDescription,
      decMaxEligibleAmount: decConfigured ?? null,
      strCategory: objRule.strCategory ?? objRow.strCategory,
      strApplicableRegime: objRule.strApplicableRegime ?? objRow.strApplicableRegime,
      strMaxLimitAppliedAt: objRule.strMaxLimitAppliedAt ?? objRow.strMaxLimitAppliedAt ?? "ENTRY_LEVEL",
      blnProofRequired: objRule.blnProofRequired ?? objRow.blnProofRequired,
      strMaxLimitDisplay:
        decConfigured != null ? formatCurrency(decConfigured) : objRow.strMaxLimitDisplay,
    };
    return { ...objMerged, strStatus: resolveRowStatus(objMerged) };
  });
}

function applyActiveMasterRules(lstBaseRows: DeclarationRow[], lstMasterRows: DeclarationRow[]) {
  if (lstMasterRows.length === 0) return lstBaseRows.map((objRow) => ({ ...objRow, strStatus: resolveRowStatus(objRow) }));
  const setBaseNormalized = new Set<string>();
  const lstVisibleRows = mergeSectionRules(
    lstBaseRows.filter((objRow) => {
      const strNorm = normalizeSectionKey(objRow.strSection);
      const blnVisible = lstMasterRows.some(
        (objRuleRow) =>
          objRuleRow.strSection.trim().toUpperCase() === objRow.strSection.trim().toUpperCase() ||
          normalizeSectionKey(objRuleRow.strSection) === strNorm
      );
      if (blnVisible) setBaseNormalized.add(strNorm);
      return blnVisible;
    }),
    lstMasterRows
  );
  const lstMissingMasterRows = lstMasterRows.filter(
    (objRuleRow) => !setBaseNormalized.has(normalizeSectionKey(objRuleRow.strSection))
  );
  return dedupeDeclarationRows([...lstVisibleRows, ...lstMissingMasterRows]).map((objRow) => ({ ...objRow, strStatus: resolveRowStatus(objRow) }));
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

function isValidReturnPath(strPath: string, blnHrMode: boolean) {
  const strValue = strPath.trim();
  if (!strValue) return false;
  return blnHrMode
    ? strValue.startsWith("/hr/it-declaration")
    : strValue.startsWith("/salary/ess-declarations");
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
  const { t } = useModuleLabels("it-declaration");
  const strFinancialYearCode = (objSearchParams.get("fy") || "").trim() || strDefaultFinancialYearCode;
  const strRouteRegime = (objSearchParams.get("regime") || "").trim();
  const blnRouteCompare = (objSearchParams.get("compare") || "").trim() === "1";
  const strInitialRegime = (strRouteRegime.toLowerCase().includes("new") ? "New Regime" : "Old Regime") as Regime;
  const intHrEmployeeID = Number(objSearchParams.get("employeeId") || 0);
  const intRouteDeclarationID = Number(objSearchParams.get("declarationId") || 0);
  const blnHrMode = intHrEmployeeID > 0 || intRouteDeclarationID > 0;
  const strHeaderBg = blnHrMode ? "#ffffff" : "linear-gradient(100deg, #0f4b8b 0%, #0d6ca1 64%, #0d7f9c 100%)";
  const strHeaderBorder = blnHrMode ? "1px solid #dbe3ef" : "1px solid rgba(37, 99, 235, 0.2)";
  const strHeaderTextColor = blnHrMode ? "#0f172a" : "#f8fcff";
  const strHeaderSubTextColor = blnHrMode ? "#64748b" : "rgba(239,252,255,0.92)";
  const strHeaderMutedTextColor = blnHrMode ? "#64748b" : "rgba(239,252,255,0.85)";
  const strHeaderBackButtonColor = blnHrMode ? "#16324f" : "#e2e8f0";
  const strHeaderBackButtonHoverBg = blnHrMode ? "rgba(14,61,109,0.04)" : "rgba(255,255,255,0.08)";
  const objHeaderCompareTaxSx = blnHrMode
    ? {
        minHeight: 30, borderRadius: "8px", backgroundColor: "#ffffff", color: "#16324f", fontWeight: 800, fontSize: "0.76rem", textTransform: "none" as const, border: "1px solid #b6c2d2", boxShadow: "none",
        "&:hover": { backgroundColor: "rgba(14,61,109,0.04)", borderColor: "#8ea3bc", boxShadow: "none" },
        "&.Mui-disabled": { backgroundColor: "rgba(148,163,184,0.15)", color: "rgba(22,50,79,0.35)", borderColor: "#d1d5db" },
      }
    : {
        minHeight: 30, borderRadius: "8px", backgroundColor: "#ffffff", color: "#0f4b8b", fontWeight: 800, fontSize: "0.76rem", textTransform: "none" as const, boxShadow: "none",
        "&:hover": { backgroundColor: "#e0f2fe", boxShadow: "none" },
        "&.Mui-disabled": { backgroundColor: "rgba(255,255,255,0.35)", color: "rgba(255,255,255,0.78)" },
      };
  const objHeaderRadioGroupSx = blnHrMode
    ? {
        mr: { md: 0.5 },
        "& .MuiFormControlLabel-label": { color: "#16324f", fontSize: "0.8rem" },
        "& .MuiFormControlLabel-root.Mui-disabled .MuiFormControlLabel-label": { color: "rgba(22,50,79,0.55)" },
        "& .MuiRadio-root": { color: "#5a7aa6" },
        "& .MuiRadio-root.Mui-disabled": { color: "rgba(22,50,79,0.35)" },
        "& .Mui-checked": { color: "#0f4b8b !important" },
      }
    : {
        mr: { md: 0.5 },
        "& .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.95)", fontSize: "0.8rem" },
        "& .MuiFormControlLabel-root.Mui-disabled .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.82)" },
        "& .MuiRadio-root": { color: "rgba(239,252,255,0.95)" },
        "& .MuiRadio-root.Mui-disabled": { color: "rgba(239,252,255,0.75)" },
        "& .Mui-checked": { color: "#ffffff !important" },
      };
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(
    blnHrMode
      ? ["HR_IT_DECLARATION", "it_declaration_review", "IT_DECLARATION_REVIEW", "PAYROLL_IT_DECLARATION"]
      : ["ESS_DECLARATIONS"]
  );
  const strRouteReturnTo = (objSearchParams.get("returnTo") || "").trim();
  const strDefaultBackPath = blnHrMode ? "/hr/it-declaration" : "/salary/ess-declarations";
  const strReturnToStorageKey = blnHrMode ? "hrms.it-declaration.hr.return-to" : "hrms.it-declaration.ess.return-to";
  const [strBackPath, setStrBackPath] = useState(strDefaultBackPath);

  const [intDeclarationID, setIntDeclarationID] = useState<number | null>(null);
  const [strFlowStatus, setStrFlowStatus] = useState<FlowStatus>("NOT_STARTED");
  const [strDeclarationStatus, setStrDeclarationStatus] = useState<ItDeclarationDto["strDeclarationStatus"]>("draft");
  const [strSelectedRegime, setStrSelectedRegime] = useState<Regime | "">("");
  const [lstRows, setLstRows] = useState<DeclarationRow[]>([]);
  const [lstMasterRows, setLstMasterRows] = useState<DeclarationRow[]>([]);
  const [strSectionFilter, setStrSectionFilter] = useState<string>("All");
  const [strLastUpdated, setStrLastUpdated] = useState(getDateLabel());
  const [blnDraftSaved, setBlnDraftSaved] = useState(false);
  const [strSuccessToast, setStrSuccessToast] = useState("");
  const [strError, setStrError] = useState("");
  const [strEditDialogError, setStrEditDialogError] = useState("");
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
  // Tracks which proof row is mid-upload during saveDeclarationEdit()'s per-row loop, and its live
  // progress percentage, so the matching FileUploadButton can render a real determinate progress bar.
  const [strActiveProofUploadClientKey, setStrActiveProofUploadClientKey] = useState<string | null>(null);
  const [intActiveProofUploadProgress, setIntActiveProofUploadProgress] = useState(0);
  const [lstInvestmentOptionsForRow, setLstInvestmentOptionsForRow] = useState<string[]>([]);
  const [objTaxSummary, setObjTaxSummary] = useState({
    decGrossSalary: 0,
    decExemptions: 0,
    decDeductions: 0,
    decTaxableIncome: 0,
    decTaxableIncomeOld: 0,
    decTaxableIncomeNew: 0,
    decOldTax: 0,
    decNewTax: 0,
    decSavings: 0,
    strSelectedSlabProfileCode: "",
    strResidentialStatusCode: "",
    intAgeYears: null as number | null,
    objSelectedRegimeBreakdown: null as Record<string, unknown> | null,
    objOldRegimeBreakdown: null as Record<string, unknown> | null,
    objNewRegimeBreakdown: null as Record<string, unknown> | null,
    blnSelectedRegimePayrollAligned: false,
    strSelectedRegimeTaxBasis: "declared",
    strSummaryNote: "",
    strRecommendedRegime: "Old Regime" as Regime,
  });
  const [objRegimeConfig, setObjRegimeConfig] = useState({
    strDefaultRegime: "Old Regime" as Regime,
    blnAllowEmployeeOptOut: true,
  });

  const getRegimeLabel = (strRegime: string) => {
    if (strRegime === "Old Regime") return t("old_regime", "Old Regime");
    if (strRegime === "New Regime") return t("new_regime", "New Regime");
    if (strRegime === "Either Regime") return t("either_regime", "Either Regime");
    return strRegime;
  };

  const getStatusLabel = (strStatus: string) => {
    const strNormalized = String(strStatus || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (strNormalized === "submitted") return t("submitted", "Submitted");
    if (strNormalized === "draft") return t("draft", "Draft");
    if (strNormalized === "released") return t("released", "Released");
    if (strNormalized === "completed") return t("completed", "Completed");
    if (strNormalized === "proof_pending") return t("proof_pending", "Proof Pending");
    if (strNormalized === "in_progress") return t("in_progress", "In Progress");
    if (strNormalized === "not_started") return t("not_started", "Not Started");
    if (strNormalized === "approved") return t("approved", "Approved");
    if (strNormalized === "rejected") return t("rejected", "Rejected");
    if (strNormalized === "resubmitted") return t("resubmitted", "Resubmitted");
    if (strNormalized === "under_review") return t("under_review", "Under Review");
    if (strNormalized === "locked") return t("locked", "Locked");
    return strStatus;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isValidReturnPath(strRouteReturnTo, blnHrMode)) {
      window.sessionStorage.setItem(strReturnToStorageKey, strRouteReturnTo);
      setStrBackPath(strRouteReturnTo);
      return;
    }
    const strStoredReturnTo = window.sessionStorage.getItem(strReturnToStorageKey) || "";
    if (isValidReturnPath(strStoredReturnTo, blnHrMode)) {
      setStrBackPath(strStoredReturnTo);
      return;
    }
    window.sessionStorage.setItem(strReturnToStorageKey, strDefaultBackPath);
    setStrBackPath(strDefaultBackPath);
  }, [blnHrMode, strDefaultBackPath, strReturnToStorageKey, strRouteReturnTo]);

  const strDeclarationStatusNormalized = String(strDeclarationStatus || "").trim().toLowerCase();
  const setReadOnlyDeclarationStatuses = new Set(["submitted", "resubmitted", "approved", "locked"]);
  const blnLocked = strFlowStatus === "SUBMITTED" || setReadOnlyDeclarationStatuses.has(strDeclarationStatusNormalized);
  const blnDeclarationReadOnly = blnLocked;
  const blnHideActionButtons = blnDeclarationReadOnly;
  const blnDraftLikeActionsAllowed = ["draft", "released"].includes(strDeclarationStatusNormalized);
  const blnCanViewDeclaration = blnHrMode
    ? (canViewAny() || canDoAny("view") || canDoAny("review"))
    : (canViewAny() || canDoAny("view") || canDoAny("list"));
  const blnCanEditDeclaration = blnHrMode
    ? (canDoAny("edit") || canDoAny("review"))
    : (canDoAny("edit") || canDoAny("update") || canDoAny("add") || canDoAny("start"));
  const blnCanCompareDeclaration = canDoAny("compare");
  const blnCanDraftDeclaration = canDoAny("draft");
  const blnCanSubmitDeclaration = canDoAny("submit");
  const blnRegimeSwitchDisabled =
    blnDeclarationReadOnly ||
    blnHideActionButtons ||
    !blnDraftLikeActionsAllowed ||
    !blnCanEditDeclaration ||
    !objRegimeConfig.blnAllowEmployeeOptOut;
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

  const lstSectionFilterOptions = useMemo(() => {
    const dicSeen = new Map<string, string>();
    for (const objRow of lstSectionRows) {
      if (objRow.strSection && !dicSeen.has(objRow.strSection)) {
        dicSeen.set(objRow.strSection, objRow.strDescription || objRow.strSection);
      }
    }
    return Array.from(dicSeen.entries())
      .map(([strSection, strDescription]) => ({ strSection, strDescription }))
      .sort((a, b) => a.strSection.localeCompare(b.strSection, undefined, { numeric: true }));
  }, [lstSectionRows]);

  const lstFilteredSectionRows = useMemo(
    () => strSectionFilter === "All" ? lstSectionRows : lstSectionRows.filter((objRow) => objRow.strSection === strSectionFilter),
    [lstSectionRows, strSectionFilter]
  );

  function renderDeclarationRowAction(objRow: DeclarationRow) {
    const blnHasAmount = objRow.decDeclaredAmount > 0;
    const strDash = <Typography sx={{ fontSize: "0.76rem", color: "#94a3b8", fontWeight: 700 }}>-</Typography>;

    let objIcon: React.ReactNode = null;
    let strLabel = "";
    if (blnDeclarationReadOnly) {
      if (!blnCanViewDeclaration || !blnHasAmount) return strDash;
      objIcon = <VisibilityRoundedIcon fontSize="small" />;
      strLabel = t("view", "View");
    } else if (blnCanEditDeclaration) {
      objIcon = <EditRoundedIcon fontSize="small" />;
      strLabel = blnHasAmount ? t("edit", "Edit") : blnStarted ? t("add", "Add") : t("start", "Start");
    } else {
      if (!blnCanViewDeclaration || !blnHasAmount) return strDash;
      objIcon = <VisibilityRoundedIcon fontSize="small" />;
      strLabel = t("view", "View");
    }

    const blnRowIsEditable = !blnDeclarationReadOnly && blnCanEditDeclaration;
    return (
      <Tooltip title={strLabel}>
        <IconButton
          controlId={`salary.it-declaration.row.${blnRowIsEditable ? "edit" : "view"}.button`}
          data-row-key={objRow.intItemID ?? objRow.strSection}
          size="small"
          onClick={() => openEditModal(objRow)}
          sx={{ color: "var(--app-primary-color, #1d4ed8)" }}
        >
          {objIcon}
        </IconButton>
      </Tooltip>
    );
  }

  const lstDeclarationGridRows = useMemo(() => {
    return lstFilteredSectionRows.map((objRow, intIndex) => ({
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
          label={getStatusLabel(objRow.strStatus)}
          sx={{
            fontWeight: 700,
            color: objRow.strStatus === "Completed" ? "#166534" : objRow.strStatus === "Proof Pending" ? "#9a3412" : objRow.strStatus === "In Progress" ? "#9a3412" : "#475569",
            backgroundColor: objRow.strStatus === "Completed" ? "#dcfce7" : objRow.strStatus === "Proof Pending" ? "#ffedd5" : objRow.strStatus === "In Progress" ? "#ffedd5" : "#e2e8f0",
          }}
        />
      ),
      action: renderDeclarationRowAction(objRow),
    }));
  }, [blnCanEditDeclaration, blnCanViewDeclaration, blnDeclarationReadOnly, blnStarted, lstFilteredSectionRows, t]);
  const lstDeclarationColumns: CommonTableColumn<(typeof lstDeclarationGridRows)[number]>[] = [
    { field: "category", headerName: t("category", "Category"), width: 110 },
    { field: "section", headerName: t("section", "Section"), width: 80, sortable: false },
    { field: "description", headerName: t("description", "Description"), width: 260, sortable: false, blnWrapText: true },
    { field: "declaredAmount", headerName: t("declared_amount", "Declared Amount"), width: 130, sortable: false },
    { field: "maxLimit", headerName: t("max_limit", "Max Limit"), width: 90, sortable: false },
    { field: "status", headerName: t("status", "Status"), width: 100, sortable: false },
    { field: "action", headerName: t("action", "Action"), width: 90, sortable: false, align: "center", exportable: false },
  ];

  function openAddDeclarationFromTable() {
    if (blnDeclarationReadOnly || !blnCanEditDeclaration) return;
    const objTargetRow =
      lstFilteredSectionRows.find((objRow) => Math.max(0, objRow.decDeclaredAmount || 0) <= 0) ||
      lstFilteredSectionRows[0] ||
      lstSectionRows.find((objRow) => Math.max(0, objRow.decDeclaredAmount || 0) <= 0) ||
      lstSectionRows[0];
    if (!objTargetRow) {
      setStrWarning(t("no_declaration_sections", "No declaration sections available. Check Tax Declaration Component master data and ESS IT declaration API."));
      return;
    }
    openEditModal(objTargetRow);
  }
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
    const dicFallbackBenefitTotals = lstRows.reduce((dicTotals, objRow) => {
      const decAmount = Math.max(0, objRow.decDeclaredAmount || 0);
      const decConfiguredLimit = objRow.decMaxEligibleAmount ?? parseMaxLimit(objRow.strMaxLimitDisplay);
      const decEligibleAmount = decConfiguredLimit != null && Number.isFinite(decConfiguredLimit)
        ? Math.min(decAmount, Math.max(0, decConfiguredLimit))
        : decAmount;
      if (decConfiguredLimit == null || !Number.isFinite(decConfiguredLimit)) {
        blnRuleBasedFallback = true;
      }

      const strGroupName = getGroupName(objRow);
      if (strGroupName === "Deductions" || strGroupName === "Loans & Property") {
        dicTotals.decDeductions += decEligibleAmount;
      } else {
        dicTotals.decExemptions += decEligibleAmount;
      }
      return dicTotals;
    }, { decExemptions: 0, decDeductions: 0 });

    if (blnUseSummaryAsTruth) {
      const decOld = Math.max(0, objTaxSummary.decOldTax || 0);
      const decNew = Math.max(0, objTaxSummary.decNewTax || 0);
      const decSavingsAbs = Math.abs(decOld - decNew);
      const strRecommended = decOld === decNew ? "Either Regime" : decOld < decNew ? "Old Regime" : "New Regime";
      const decTaxableOldFromSummary = Math.max(0, objTaxSummary.decTaxableIncomeOld ?? (objTaxSummary.decTaxableIncome || 0));
      const decTaxableNewFromSummary = Math.max(0, objTaxSummary.decTaxableIncomeNew ?? decGross);
      const decExemptionsFromTaxableDelta = Math.max(0, decGross - decTaxableOldFromSummary);
      const decExemptionsFromApi = Math.max(0, objTaxSummary.decExemptions || 0);
      const decEffectiveExemptions = decExemptionsFromApi > 0 ? decExemptionsFromApi : decExemptionsFromTaxableDelta;
      return {
        blnPreviewOnly: false,
        blnRuleBasedFallback: false,
        decGrossSalary: decGross,
        decExemptions: decEffectiveExemptions,
        decDeductions: Math.max(0, objTaxSummary.decDeductions || 0),
        decTaxableOld: decTaxableOldFromSummary,
        decTaxableNew: decTaxableNewFromSummary,
        decOldTax: decOld,
        decNewTax: decNew,
        decSavings: decSavingsAbs,
        strRecommendedRegime: strRecommended as Regime | "Either Regime",
      };
    }

    const decExemptionsCapped = decGross > 0 ? Math.min(dicFallbackBenefitTotals.decExemptions, decGross) : dicFallbackBenefitTotals.decExemptions;
    const decDeductionsCapped = Math.max(0, dicFallbackBenefitTotals.decDeductions);
    const decTaxableOld = Math.max(0, decGross - decExemptionsCapped - decDeductionsCapped);
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
      decDeductions: decDeductionsCapped,
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
  const objSelectedRegimeBreakdown = asObjectRecord(objTaxSummary.objSelectedRegimeBreakdown);
  const objOldRegimeBreakdown = asObjectRecord(objTaxSummary.objOldRegimeBreakdown);
  const objNewRegimeBreakdown = asObjectRecord(objTaxSummary.objNewRegimeBreakdown);
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
  const blnApplyMaxLimitAtEntry = (objEditRow?.strMaxLimitAppliedAt ?? "ENTRY_LEVEL") === "ENTRY_LEVEL";
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
      return t("duplicate_investment_not_allowed", "Duplicate investment is not allowed.");
    }
    for (const objEntry of lstSectionEditEntries) {
      const strName = objEntry.strInvestmentName.trim();
      const decAmount = Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0);
      if (!strName) return t("investment_name_required_all_rows", "Investment name is required for all rows.");
      if (!objEntry.strAmountInput.trim()) return t("declared_amount_required_all_rows", "Declared amount is required for all rows.");
      if (!Number.isFinite(decAmount) || decAmount < 0) return t("all_row_amounts_valid_positive", "All row amounts must be valid positive values.");
      if (decAmount <= 0) return t("declared_amount_greater_zero_all_rows", "Declared amount must be greater than zero for all rows.");
      if (blnApplyMaxLimitAtEntry && decAmount > decAmountMaxInput) return `${t("amount_cannot_exceed", "Amount cannot exceed")} ${formatCurrency(decAmountMaxInput)}.`;
      if (objEditRow.blnProofRequired && decAmount > 0 && !objEntry.objProof && !objEntry.objProofFileInput) {
        return t("proof_upload_required_section", "Proof upload is required for this section.");
      }
    }
    if (blnApplyMaxLimitAtEntry && decActiveMaxLimit != null && decSectionEditTotal > decActiveMaxLimit) {
      return `${t("section_total_cannot_exceed", "Section total cannot exceed")} ${formatCurrency(decActiveMaxLimit)}.`;
    }
    return "";
  }, [objEditRow, lstSectionEditEntries, decActiveMaxLimit, blnApplyMaxLimitAtEntry, t]);
  const blnSaveEditDisabled = Boolean(strSectionEditError);
  const strSectionEditWarning = useMemo(() => {
    if (!objEditRow || blnApplyMaxLimitAtEntry) return "";
    for (const objEntry of lstSectionEditEntries) {
      const decAmount = Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0);
      if (decAmount > decAmountMaxInput) return `${t("amount", "Amount")} ${formatCurrency(decAmount)} ${t("exceeds", "exceeds")} ${formatCurrency(decAmountMaxInput)}. ${t("approval_limit_warning", "Limit is enforced at approval - please ensure the value is correct.")}`;
    }
    return "";
  }, [objEditRow, lstSectionEditEntries, blnApplyMaxLimitAtEntry, t]);

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
    const lstNextRows =
      objData.lstItems?.length
        ? objData.lstItems.map((objItem) => {
            const objRow: DeclarationRow = {
              intItemID: objItem.intItemID,
              strSection: objItem.strSection,
              strCategory: formatDeclarationKind((objItem as unknown as Record<string, unknown>).strDeclarationKind ?? (objItem as unknown as Record<string, unknown>).declaration_kind),
              strDescription: objItem.strDescription,
              strMaxLimitDisplay: objItem.strMaxLimit,
              decMaxEligibleAmount: objItem.decMaxEligibleAmount ?? objItem.decMaxLimitAmount ?? parseMaxLimit(objItem.strMaxLimit),
              strMaxLimitAppliedAt: normalizeMaxLimitAppliedAt(objItem.strMaxLimitAppliedAt ?? (objItem as unknown as Record<string, unknown>).max_limit_applied_at),
              blnProofRequired: resolveBooleanFlag(objItem.blnProofRequired ?? (objItem as unknown as Record<string, unknown>).blnIsProofRequired ?? (objItem as unknown as Record<string, unknown>).proof_required),
              decDeclaredAmount: objItem.decDeclaredAmount,
              strInvestmentName: objItem.strInvestmentName,
              strStatus: objItem.strStatus,
              objProof: objItem.objProof ?? null,
            };
            return { ...objRow, strStatus: resolveRowStatus(objRow) };
          })
        : [];
    setLstRows((lstPreviousRows) => (
      lstNextRows.length > 0 ? mergeSectionRules(lstNextRows, lstPreviousRows) : []
    ));
    setObjTaxSummary({
      decGrossSalary: objData.objSummary?.decGrossSalary ?? 0,
      decExemptions: objData.objSummary?.decExemptions ?? 0,
      decDeductions: objData.objSummary?.decDeductions ?? 0,
      decTaxableIncome: objData.objSummary?.decTaxableIncome ?? 0,
      decTaxableIncomeOld: objData.objSummary?.decTaxableIncomeOld ?? objData.objSummary?.decTaxableIncome ?? 0,
      decTaxableIncomeNew: objData.objSummary?.decTaxableIncomeNew ?? objData.objSummary?.decGrossSalary ?? 0,
      decOldTax: objData.objSummary?.decOldTax ?? 0,
      decNewTax: objData.objSummary?.decNewTax ?? 0,
      decSavings: objData.objSummary?.decSavings ?? 0,
      strSelectedSlabProfileCode: objData.objSummary?.strSelectedSlabProfileCode ?? "",
      strResidentialStatusCode: objData.objSummary?.strResidentialStatusCode ?? "",
      intAgeYears: objData.objSummary?.intAgeYears ?? null,
      objSelectedRegimeBreakdown: asObjectRecord(objData.objSummary?.objSelectedRegimeBreakdown) ?? null,
      objOldRegimeBreakdown: asObjectRecord(objData.objSummary?.objOldRegimeBreakdown) ?? null,
      objNewRegimeBreakdown: asObjectRecord(objData.objSummary?.objNewRegimeBreakdown) ?? null,
      blnSelectedRegimePayrollAligned: Boolean(objData.objSummary?.blnSelectedRegimePayrollAligned),
      strSelectedRegimeTaxBasis: objData.objSummary?.strSelectedRegimeTaxBasis ?? "declared",
      strSummaryNote: objData.objSummary?.strSummaryNote ?? "",
      strRecommendedRegime: (objData.objSummary?.strRecommendedRegime ?? "Old Regime") as Regime,
    });
    if (blnSummaryFallback) {
      setStrWarning(
        objData.objSummary?.strSummaryWarning?.trim()
          ? `Tax summary is in preview mode: ${objData.objSummary.strSummaryWarning}`
          : t("tax_summary_preview_missing_setup", "Tax summary is in preview mode due to missing tax setup.")
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
    const objCategoryRecord = objCategory as unknown as Record<string, unknown>;
    // The category's own Description field is internal admin/policy notes, not what employees
    // should see as the component's label — always use the synced Category Name here, matching
    // the same source the backend's buildDeclarationResponse uses.
    const strDescription = objCategory.strCategoryName;
    const decMaxLimitAmount = resolveMaxLimitAmount(objCategoryRecord);
    const strMaxLimitDisplay = decMaxLimitAmount == null ? "-" : formatCurrency(decMaxLimitAmount);
    const strCategory = formatDeclarationKind(objCategory.strDeclarationKind ?? objCategoryRecord.strKind ?? objCategoryRecord.declaration_kind);
    return {
      intItemID: null,
      strSection: objCategory.strSection || "",
      strCategory,
      strDescription,
      strApplicableRegime: normalizeApplicableRegime(
        objCategory.strApplicableRegime ??
        objCategoryRecord.applicableRegime ??
        objCategoryRecord.applicable_regime
      ),
      strMaxLimitDisplay,
      decMaxEligibleAmount: decMaxLimitAmount,
      strMaxLimitAppliedAt: normalizeMaxLimitAppliedAt(objCategory.strMaxLimitAppliedAt ?? objCategoryRecord.strMaximumLimitAppliedAt ?? objCategoryRecord.max_limit_applied_at ?? objCategoryRecord.maximum_limit_applied_at),
      blnProofRequired: resolveBooleanFlag(objCategory.blnProofRequired ?? objCategoryRecord.blnIsProofRequired ?? objCategoryRecord.proof_required),
      decDeclaredAmount: 0,
      strInvestmentName: "",
      strStatus: "Not Started",
    };
  }

  async function loadRowsFromCategoryMaster(): Promise<DeclarationRow[]> {
    const lstCandidatePaths = [
      "/masters/ess-declaration-categories",
      "/ess-declaration-categories",
      "/masters/tax-declaration-components",
    ];
    const lstCandidateMenuActions = [
      "ESS_IT_DECLARATION_VIEW",
      "MASTER_ESS_DECLARATION_CATEGORY_LIST",
    ];
    let objLastError: unknown = null;

    for (const strPath of lstCandidatePaths) {
      for (const strMenuAction of lstCandidateMenuActions) {
        try {
          const objCategoryResult = await requestEncryptedApi<EssDeclarationCategoryApiRecord[] | Record<string, unknown>>({
            strPath: `${ApiRoutePrefix.ApiV1}${strPath}`,
            strMethod: ApiRequestMethod.Get,
            strMenuAction,
            blnUseAuthHeader: true,
          });
          return dedupeDeclarationRows(
            resolveCategoryRows(objCategoryResult.Data)
              .filter((objCategory) => resolveBooleanFlag((objCategory as unknown as Record<string, unknown>).blnIsActive ?? (objCategory as unknown as Record<string, unknown>).is_active, true))
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

  function applyRegimeRows(strNextRegime: Regime, lstMasterRuleRows = lstMasterRows) {
    const lstVisibleMasterRows = filterMasterRowsByRegime(lstMasterRuleRows, strNextRegime);
    setLstRows((lstCurrentRows) => applyActiveMasterRules(lstCurrentRows, lstVisibleMasterRows));
  }

  async function getCurrentDeclaration(intPreferredDeclarationID?: number | null) {
    if (blnHrMode) {
      const intResolvedDeclarationID = intPreferredDeclarationID || intDeclarationID || intRouteDeclarationID;
      if (!intResolvedDeclarationID) {
        throw new Error("Declaration ID is required for HR IT declaration.");
      }
      return hrItDeclarationService.getDeclaration(intResolvedDeclarationID);
    }
    return itDeclarationService.getDeclaration(strFinancialYearCode);
  }

  async function startCurrentDeclaration(strRegime: Regime) {
    if (blnHrMode) {
      if (!intHrEmployeeID) {
        throw new Error("Employee is required for HR IT declaration.");
      }
      return hrItDeclarationService.startDeclaration(intHrEmployeeID, strFinancialYearCode, strRegime);
    }
    return itDeclarationService.startDeclaration(strFinancialYearCode, strRegime);
  }

  async function changeCurrentRegime(intResolvedDeclarationID: number, strRegime: Regime) {
    return blnHrMode
      ? hrItDeclarationService.changeRegime(intResolvedDeclarationID, strRegime)
      : itDeclarationService.changeRegime(intResolvedDeclarationID, strRegime);
  }

  async function saveCurrentItem(
    intResolvedDeclarationID: number,
    objPayload: { intItemID?: number | null; strSection: string; strInvestmentName: string; decDeclaredAmount: number }
  ) {
    return blnHrMode
      ? hrItDeclarationService.saveItem(intResolvedDeclarationID, objPayload)
      : itDeclarationService.saveItem(intResolvedDeclarationID, objPayload);
  }

  async function deleteCurrentItem(intResolvedDeclarationID: number, intItemIDToDelete: number) {
    return blnHrMode
      ? hrItDeclarationService.deleteItem(intResolvedDeclarationID, intItemIDToDelete)
      : itDeclarationService.deleteItem(intResolvedDeclarationID, intItemIDToDelete);
  }

  async function uploadCurrentProof(intResolvedDeclarationID: number, intItemIDToUpload: number, objFile: File, fnOnProgress?: FileUploadProgressHandler) {
    return blnHrMode
      ? hrItDeclarationService.uploadItemProof(intResolvedDeclarationID, intItemIDToUpload, objFile, undefined, fnOnProgress)
      : itDeclarationService.uploadItemProof(intResolvedDeclarationID, intItemIDToUpload, objFile, undefined, fnOnProgress);
  }

  async function previewCurrentProof(intItemIDToPreview: number) {
    if (!intDeclarationID) return;
    try {
      const objPreview = blnHrMode
        ? await hrItDeclarationService.previewItemProof(intDeclarationID, intItemIDToPreview)
        : await itDeclarationService.previewItemProof(intDeclarationID, intItemIDToPreview);
      const strUrl = base64ToObjectUrl(objPreview.strBase64Content, objPreview.strMimeType);
      openBlobUrlInNewTab(strUrl);
      window.setTimeout(() => URL.revokeObjectURL(strUrl), 60_000);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, t("unable_view_proof", "Unable to view uploaded proof.")));
    }
  }

  async function listCurrentInvestmentOptions(strSection: string) {
    return blnHrMode
      ? hrItDeclarationService.listInvestmentOptions(strSection)
      : itDeclarationService.listInvestmentOptions(strSection);
  }

  async function compareCurrentTax(intResolvedDeclarationID: number) {
    return blnHrMode
      ? hrItDeclarationService.compareTax(intResolvedDeclarationID)
      : itDeclarationService.compareTax(intResolvedDeclarationID);
  }

  async function submitCurrentDeclaration(intResolvedDeclarationID: number) {
    return blnHrMode
      ? hrItDeclarationService.submitDeclaration(intResolvedDeclarationID)
      : itDeclarationService.submitDeclaration(intResolvedDeclarationID);
  }

  async function loadDeclaration() {
    setBlnLoading(true);
    setStrError("");
    setStrWarning("");
    setBlnRetryRefresh(false);
    try {
      const objData = strRouteRegime ? await startCurrentDeclaration(strInitialRegime) : await getCurrentDeclaration();
      hydrateFromApi(objData);
      const lstMasterRowsLoaded = await loadRowsFromCategoryMaster().catch(() => []);
      setLstMasterRows(lstMasterRowsLoaded);
      const lstVisibleMasterRows = filterMasterRowsByRegime(
        lstMasterRowsLoaded,
        (objData.strSelectedRegime || strInitialRegime || "Old Regime") as Regime
      );
      if (!objData.lstItems?.length) {
        setLstRows(lstVisibleMasterRows.map((objRow) => ({ ...objRow, strStatus: resolveRowStatus(objRow) })));
      } else if (lstVisibleMasterRows.length > 0) {
        setLstRows((lstCurrentRows) => applyActiveMasterRules(lstCurrentRows, lstVisibleMasterRows));
      }
      if (blnRouteCompare) {
        setBlnCompareModalOpen(true);
      }
    } catch (objError) {
      const strApiError = formatApiErrorForUi(objError, t("unable_load_it_declaration", "Unable to load IT declaration."));
      const blnItDeclarationRouteMissing = objError instanceof ApiRequestError && objError.intStatusCode === 404;
      try {
        const lstMasterRows = await loadRowsFromCategoryMaster();
        setLstMasterRows(lstMasterRows);
        setLstRows(filterMasterRowsByRegime(lstMasterRows, strSelectedRegime || strInitialRegime || "Old Regime"));
        setBlnSummaryFromApi(false);
        if (lstMasterRows.length > 0) {
          setStrWarning(
            blnItDeclarationRouteMissing
              ? t("it_declaration_api_unavailable_loaded_master", "IT declaration API is not available in current backend build. Loaded declaration sections from Tax Declaration master.")
              : `${strApiError} ${t("loaded_declaration_sections_from_master", "Loaded declaration sections from Tax Declaration Component master.")}`
          );
        } else {
          setStrError(t("unable_refresh_declaration_summary", "Unable to refresh declaration summary. Please try again."));
          setBlnRetryRefresh(true);
        }
      } catch {
        setLstRows([]);
        setStrError(t("unable_refresh_declaration_summary", "Unable to refresh declaration summary. Please try again."));
        setBlnRetryRefresh(true);
      }
    } finally {
      setBlnLoading(false);
    }
  }

  useEffect(() => {
    if (blnRightsLoading) {
      return;
    }
    if (!objSearchParams.get("fy")) {
      objRouter.replace(strBackPath);
      return;
    }
    if (blnHrMode && !intHrEmployeeID && !intRouteDeclarationID) {
      objRouter.replace("/hr/it-declaration");
      return;
    }
    void loadDeclaration();
  }, [blnRightsLoading, strFinancialYearCode, strRouteRegime, blnRouteCompare, blnHrMode, intHrEmployeeID, intRouteDeclarationID, strBackPath]);

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
    if (!blnRegimeDirty || !strSelectedRegime || lstMasterRows.length === 0) return;
    applyRegimeRows(strSelectedRegime, lstMasterRows);
  }, [blnRegimeDirty, strSelectedRegime, lstMasterRows]);

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
    setBlnSaving(true);
    setStrSavingLabel(
      blnLocked
        ? t("comparing_tax", "Comparing tax...")
        : t("saving_changes_comparing", "Saving changes and comparing...")
    );
    setStrError("");
    try {
      const intResolvedDeclarationID = blnLocked
        ? (intDeclarationID ?? null)
        : await persistDraftToDb();
      if (!intResolvedDeclarationID) return;
      const objData = await compareCurrentTax(intResolvedDeclarationID);
      hydrateFromApi(objData);
      setBlnCompared(true);
      setBlnCompareModalOpen(true);
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, t("unable_compare_tax", "Unable to compare tax.")));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("saving", "Saving..."));
    }
  }

  async function saveDraft() {
    if (blnDeclarationReadOnly || !blnCanDraftDeclaration) return;
    setBlnSaving(true);
    setStrSavingLabel(t("saving_draft", "Saving draft..."));
    setStrError("");
    try {
      if (objEditRow) {
        await saveDeclarationEdit();
        setStrSuccessToast(t("draft_saved_successfully", "Draft saved successfully."));
        return;
      }
      await persistDraftToDb();
      setBlnDraftSaved(true);
      setStrSuccessToast(t("draft_saved_successfully", "Draft saved successfully."));
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, t("unable_save_declaration_draft", "Unable to save declaration draft.")));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("saving", "Saving..."));
    }
  }

  function openRegimeModal() {
    setStrRegimeDraft((strSelectedRegime || strRecommendedRegimeSelectable || "Old Regime") as Regime);
    setBlnRegimeModalOpen(true);
  }

  function openEditModal(objRow: DeclarationRow) {
    if (blnDeclarationReadOnly) {
      if (!blnCanViewDeclaration || objRow.decDeclaredAmount <= 0) return;
    }
    if (!blnStarted && !blnDeclarationReadOnly) {
      openRegimeModal();
      return;
    }
    setStrEditDialogError("");
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
    // The section's own Description/Category Name (objRow.strDescription) is NOT an
    // investment-name suggestion — it's the section's label (e.g. "Medical Insurance
    // Premium" for 80D) and must never be offered here. Only the employee's already-saved
    // custom investment name (if any) is a legitimate local hint before the real list loads.
    const lstFallbackOptions = getFallbackInvestmentOptions(objRow.strSection);
    const strSavedInvestmentName = objRow.strInvestmentName?.trim();
    const lstLocalHints = strSavedInvestmentName && strSavedInvestmentName !== "-" ? [strSavedInvestmentName] : [];
    const lstSeedOptions = Array.from(new Set([...lstFallbackOptions, ...lstLocalHints]));
    setLstInvestmentOptionsForRow(lstSeedOptions);
    void (async () => {
      try {
        const lstOptions = await listCurrentInvestmentOptions(objRow.strSection);
        const lstApiOptions = lstOptions
          .map((objOption) => objOption.strOptionName?.trim() || objOption.strOptionCode?.trim())
          .filter((strValue): strValue is string => Boolean(strValue));
        // Once the real master-configured list loads, it replaces the generic fallback
        // text entirely — only the employee's own saved custom name is preserved alongside it.
        const lstMerged = Array.from(new Set([...lstApiOptions, ...lstLocalHints]));
        setLstInvestmentOptionsForRow(lstMerged.length > 0 ? lstMerged : lstSeedOptions);
      } catch {
        setLstInvestmentOptionsForRow(lstSeedOptions);
      }
    })();
  }

  function closeEditModal() {
    setStrEditDialogError("");
    setObjEditRow(null);
    setLstSectionEditEntries([]);
    setLstInvestmentOptionsForRow([]);
  }

  function addInvestmentRow() {
    if (!objEditRow || blnDeclarationReadOnly || !blnCanEditDeclaration) return;
    const blnHasIncompleteRow = lstSectionEditEntries.some((objEntry) => {
      const strName = objEntry.strInvestmentName.trim();
      const decAmount = Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0);
      return !strName || !objEntry.strAmountInput.trim() || !Number.isFinite(decAmount) || decAmount <= 0;
    });
    if (blnHasIncompleteRow) {
      setStrWarning(t("complete_investment_before_adding", "Complete Investment name and Declared amount for current rows before adding a new investment."));
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

  async function ensureDeclarationAndSaveSingleItem(
    objPayload: {
      intItemID?: number | null;
      strSection: string;
      strInvestmentName: string;
      decDeclaredAmount: number;
    },
    setResolvedItemIDsThisSave?: Set<number>
  ) {
    const strRegimeToSave = (strSelectedRegime || strRecommendedRegimeSelectable || "Old Regime") as Regime;
    let intResolvedDeclarationID = intDeclarationID;
    let objLatestData: ItDeclarationDto | null = null;

    if (!intResolvedDeclarationID) {
      objLatestData = await startCurrentDeclaration(strRegimeToSave);
      intResolvedDeclarationID = objLatestData.intDeclarationID ?? null;
    } else if (blnRegimeDirty) {
      objLatestData = await changeCurrentRegime(intResolvedDeclarationID, strRegimeToSave);
    }

    if (!intResolvedDeclarationID) {
      throw new Error(t("unable_resolve_declaration_id_proof_upload", "Unable to resolve declaration ID for proof upload."));
    }

    objLatestData = await saveCurrentItem(intResolvedDeclarationID, objPayload);
    hydrateFromApi(objLatestData);

    // For a brand-new row (intItemID null) matching by section alone breaks down the moment a
    // section has more than one investment row ("Add Investment"): Array.find always resolves to
    // the FIRST item ever created for that section, so a second/third new row's proof silently
    // gets attached to the wrong (earlier) row instead of the one the user just picked a file for.
    // Excluding item IDs already claimed earlier in this same save cycle (see saveDeclarationEdit)
    // makes each new row resolve to the item POST /items/save just created for it.
    const objSavedItem = objLatestData.lstItems?.find((objItem) =>
      objPayload.intItemID != null
        ? objItem.intItemID === objPayload.intItemID
        : objItem.strSection === objPayload.strSection &&
          (objItem.intItemID == null || !setResolvedItemIDsThisSave?.has(objItem.intItemID))
    );
    if (objSavedItem?.intItemID != null) {
      setResolvedItemIDsThisSave?.add(objSavedItem.intItemID);
    }

    return {
      intDeclarationID: intResolvedDeclarationID,
      intItemID: objSavedItem?.intItemID ?? null,
    };
  }

  async function saveDeclarationEdit() {
    if (!objEditRow) return;
    if (blnDeclarationReadOnly || !blnCanEditDeclaration) {
      setStrEditDialogError(t("submitted_declaration_cannot_be_modified", "This IT declaration is already submitted or approved and cannot be modified."));
      return;
    }
    if (strSectionEditError) return;
    setBlnModalSaving(true);
    try {
      setStrEditDialogError("");
      setStrSavingLabel(t("saving_declaration_rows", "Saving declaration rows..."));
      setBlnSaving(true);
      let intLastResolvedDeclarationID = intDeclarationID;

      const lstRowsToDelete = lstSectionEditEntries.filter((objEntry) =>
        objEntry.intItemID != null &&
        !objEntry.strInvestmentName.trim() &&
        Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0) <= 0
      );
      for (const objDeleteEntry of lstRowsToDelete) {
        if (intDeclarationID && objDeleteEntry.intItemID) {
          const objData = await deleteCurrentItem(intDeclarationID, objDeleteEntry.intItemID);
          hydrateFromApi(objData);
        }
      }

      // Tracks item IDs already resolved earlier in this same save cycle, so a second/third new
      // row within the same section never matches the wrong (earlier) sibling row's item ID — see
      // ensureDeclarationAndSaveSingleItem. Pre-seeded with already-persisted rows' IDs too, since
      // those are never valid resolution targets for a *new* row's section-based match either.
      const setResolvedItemIDsThisSave = new Set<number>();
      for (const objEntry of lstSectionEditEntries) {
        if (objEntry.intItemID != null) setResolvedItemIDsThisSave.add(objEntry.intItemID);
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
        }, setResolvedItemIDsThisSave);
        intLastResolvedDeclarationID = objPersisted.intDeclarationID;
        if (objEntry.objProofFileInput && objPersisted.intItemID) {
          setStrActiveProofUploadClientKey(objEntry.strClientKey);
          setIntActiveProofUploadProgress(0);
          try {
            const objData = await uploadCurrentProof(objPersisted.intDeclarationID, objPersisted.intItemID, objEntry.objProofFileInput, setIntActiveProofUploadProgress);
            hydrateFromApi(objData);
          } finally {
            setStrActiveProofUploadClientKey(null);
          }
        }
      }

      // Always re-fetch declaration once all row operations are done, so modal reopen reflects persisted server rows.
      const objRefreshed = await getCurrentDeclaration(intLastResolvedDeclarationID);
      hydrateFromApi(objRefreshed);

      setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : "IN_PROGRESS"));
      setBlnCompared(false);
      setStrLastUpdated(getDateLabel());
      setObjEditRow(null);
      setLstSectionEditEntries([]);
      setBlnDraftSaved(true);
      setStrSuccessToast(t("declaration_rows_saved_successfully", "Declaration rows saved successfully."));
    } catch (objError) {
      // Previously uncaught: a thrown error here (e.g. proof upload rejected) left the dialog open
      // with no visible feedback at all — indistinguishable from "Save silently did nothing".
      setStrEditDialogError(formatApiErrorForUi(objError, t("unable_save_declaration_rows", "Unable to save declaration rows.")));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("saving", "Saving..."));
      setBlnModalSaving(false);
    }
  }

  async function confirmRegime() {
    if (blnDeclarationReadOnly || blnRegimeSwitchDisabled) return;
    setStrSelectedRegime(strRegimeDraft);
    setBlnRegimeDirty(true);
    setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : strCurrentStatus));
    setBlnCompared(false);
    setStrLastUpdated(getDateLabel());
    setBlnRegimeModalOpen(false);
  }

  async function submitDeclaration() {
    if (blnDeclarationReadOnly) return;
    if (!blnDeclarationConfirm) {
      setStrWarning(t("please_check_confirmation_checkbox", "Please check confirmation checkbox before final submit."));
      setBlnSubmitModalOpen(false);
      return;
    }
    setBlnSaving(true);
    setStrSavingLabel(t("saving_changes_submitting", "Saving changes and submitting..."));
    setStrError("");
    try {
      const intResolvedDeclarationID = await persistDraftToDb();
      if (!intResolvedDeclarationID) return;
      const objData = await submitCurrentDeclaration(intResolvedDeclarationID);
      hydrateFromApi(objData);
      setBlnSubmitModalOpen(false);
      setStrSuccessToast(t("declaration_submitted_successfully", "Declaration submitted successfully."));
      if (blnHrMode) {
        objRouter.push(strBackPath);
      }
    } catch (objError) {
      setStrError(formatApiErrorForUi(objError, t("unable_submit_declaration", "Unable to submit declaration.")));
    } finally {
      setBlnSaving(false);
      setStrSavingLabel(t("saving", "Saving..."));
    }
  }

  if (blnRightsLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_it_declaration", "Loading IT declaration...")} />;
  }

  if (!blnCanViewDeclaration) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">
          {strRightsError || t("access_not_available", "IT declaration access is not available for your user group.")}
        </Alert>
      </Box>
    );
  }

  if (blnLoading) {
    return <BlockingLoader blnOpen strLabel={t("loading_it_declaration", "Loading IT Declaration...")} />;
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
      objLatestData = await startCurrentDeclaration(strRegimeToSave);
      intResolvedDeclarationID = objLatestData.intDeclarationID ?? null;
    } else if (blnRegimeDirty) {
      objLatestData = await changeCurrentRegime(intResolvedDeclarationID, strRegimeToSave);
    }

    if (!intResolvedDeclarationID) {
      throw new Error(t("unable_resolve_declaration_id_draft_save", "Unable to resolve declaration ID for draft save."));
    }

    for (const objPendingRow of lstPendingRows) {
      objLatestData = await saveCurrentItem(intResolvedDeclarationID, objPendingRow);
    }

    if (objLatestData) {
      hydrateFromApi(objLatestData);
    }

    return intResolvedDeclarationID;
  }

  return (
    <Stack spacing={0.7} sx={{ pb: 1, pr: 0.2, height: "calc(100vh - 124px)", overflow: "hidden" }}>
      <BlockingLoader blnOpen={blnSaving} strLabel={strSavingLabel} intZIndex={1800} />

      <Paper sx={{ p: 0.9, borderRadius: "12px", border: strHeaderBorder, background: strHeaderBg, color: strHeaderTextColor }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", md: "center" }} gap={1}>
          <Stack spacing={0.3} alignItems="flex-start">
            <ITDeclarationStatusBadge strStatus={strDeclarationStatus || "draft"} strLabel={getStatusLabel(strDeclarationStatus || "draft")} />
            <Typography sx={{ color: strHeaderSubTextColor, fontSize: "0.74rem", lineHeight: 1.2 }}>{t("financial_year", "Financial Year")} {strFinancialYearCode}</Typography>
          </Stack>
          <Stack spacing={0.5} alignItems={{ xs: "flex-start", md: "flex-end" }}>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }} alignItems="center">
              <Button
                size="small"
                startIcon={<ArrowBackRoundedIcon />}
                sx={{ color: strHeaderBackButtonColor, minHeight: 30, px: 0.8, "&:hover": { backgroundColor: strHeaderBackButtonHoverBg } }}
                onClick={() => objRouter.push(strBackPath)}
                controlId="salary.it-declaration.back.button"
              >
                {t("back", "Back")}
              </Button>
              <RadioGroup
                row
                value={strSelectedRegime || "Old Regime"}
                onChange={(objEvent) => { setStrSelectedRegime(objEvent.target.value as Regime); setBlnRegimeDirty(true); }}
                sx={objHeaderRadioGroupSx}
              >
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="Old Regime" control={<Radio size="small" />} label={`${getRegimeLabel("Old Regime")}${objDerivedCalc.strRecommendedRegime === "Old Regime" ? ` (${t("recommended", "Recommended")})` : ""}`} />
                <FormControlLabel disabled={blnRegimeSwitchDisabled} value="New Regime" control={<Radio size="small" />} label={getRegimeLabel("New Regime")} />
              </RadioGroup>
              {blnDraftLikeActionsAllowed && !blnHideActionButtons ? (
                <>
                  {blnCanCompareDeclaration ? (
                    <Button variant="contained" size="small" onClick={() => void runCompareAndOpenModal()} disabled={!intDeclarationID && !blnHasAnyFilled} sx={objHeaderCompareTaxSx} data-controlid="salary.it-declaration.compare-tax.button">
                      {t("compare_tax", "Compare Tax")}
                    </Button>
                  ) : null}
                  {blnCanDraftDeclaration ? (
                    <Button data-controlid="salary.it-declaration.save-draft.button" variant="contained" size="small" onClick={() => void saveDraft()} disabled={blnLocked || !blnDraftLikeActionsAllowed} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f" }, "&.Mui-disabled": { backgroundColor: "rgba(11,63,115,0.52)", color: "rgba(255,255,255,0.92)" } }}>
                      {t("save_draft", "Save Draft")}
                    </Button>
                  ) : null}
                  {blnCanSubmitDeclaration ? (
                    <Button data-controlid="salary.it-declaration.submit.button" variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked || !blnDraftLikeActionsAllowed} onClick={() => setBlnSubmitModalOpen(true)} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#f59e0b", color: "#111827", fontWeight: 800, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#d97706" }, "&.Mui-disabled": { backgroundColor: "rgba(148,163,184,0.35)", color: "rgba(226,232,240,0.92)", border: "1px dashed rgba(203,213,225,0.65)", cursor: "not-allowed", boxShadow: "none" } }}>
                      {t("submit_declaration", "Submit Declaration")}
                    </Button>
                  ) : null}
                </>
              ) : blnLocked && intDeclarationID && blnCanCompareDeclaration ? (
                <Button variant="contained" size="small" onClick={() => void runCompareAndOpenModal()} sx={objHeaderCompareTaxSx} data-controlid="salary.it-declaration.compare-tax.button">
                  {t("compare_tax", "Compare Tax")}
                </Button>
              ) : null}
            </Stack>
            {!objRegimeConfig.blnAllowEmployeeOptOut ? (
              <>
                <Typography sx={{ fontSize: "0.72rem", color: strHeaderMutedTextColor }}>
                  {t("regime_locked_by_policy", "Regime is locked by policy. Default regime:")} {getRegimeLabel(objRegimeConfig.strDefaultRegime)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: strHeaderMutedTextColor }}>
                  {t("default_new_regime_warning", "If you do not submit your IT declaration before the deadline, the New Tax Regime will be applied by default.")}
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
            {t("draft_saved", "Draft saved")}
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
            {t("unsaved_changes", "Unsaved changes")}
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
                {blnRetryRefresh ? <Button color="inherit" size="small" onClick={() => void loadDeclaration()}>{t("retry", "Retry")}</Button> : null}
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
          <SummaryCard strLabel={t("declaration_status", "Declaration Status")} strValue={getStatusLabel(strDeclarationStatus || "draft")} strSubValue={`${t("last_updated", "Last updated")}: ${strLastUpdated}`} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel={t("selected_regime", "Selected Regime")} strValue={getRegimeLabel(strSelectedRegime || "Old Regime")} strSubValue={objDerivedCalc.strRecommendedRegime === "Either Regime" ? t("either_regime_works", "Either regime works") : objDerivedCalc.strRecommendedRegime === "Old Regime" ? t("recommended", "Recommended") : ""} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel={t("estimated_tax_saving", "Estimated Tax Saving")} strValue={formatCurrency(objDerivedCalc.decSavings)} strSubValue={objDerivedCalc.blnPreviewOnly ? t("estimated_preview_only", "Estimated preview only") : t("old_vs_new_regime", "(Old vs New Regime)")} objIcon={<SavingsOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            strLabel={t("gross_salary", "Gross Salary")}
            strValue={formatCurrency(objDerivedCalc.decGrossSalary)}
            strSubValue={objDerivedCalc.decGrossSalary > 0 ? t("from_payroll_data", "From payroll data") : t("payroll_gross_not_available", "Payroll gross not available")}
            objIcon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 18 }} />}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 0.8, borderRadius: "10px", border: "1px solid #dbe3ef" }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2}>
          {lstStepper.map((strStep, intIndex) => (
            <FlowNode key={strStep} strLabel={t(`step_${intIndex + 1}`, strStep)} intStep={intIndex + 1} blnActive={intIndex <= intActiveStep} />
          ))}
        </Stack>
      </Paper>
      <Grid container spacing={0.6} sx={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
        <Grid item xs={12} lg={9} sx={{ height: "100%", minHeight: 0 }}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.8} flexWrap="wrap" rowGap={0.6} sx={{ flex: "0 0 auto" }}>
              <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{t("your_declarations", "Your Declarations")}</Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TextField
                  select
                  size="small"
                  value={strSectionFilter}
                  onChange={(objEvent) => setStrSectionFilter(objEvent.target.value)}
                  sx={{ minWidth: 190 }}
                  label={t("filter_by_section", "Section")}
                  InputLabelProps={{ shrink: true }}
                >
                  <MenuItem value="All">{t("all_sections", "All Sections")}</MenuItem>
                  {lstSectionFilterOptions.map((objOption) => (
                    <MenuItem key={objOption.strSection} value={objOption.strSection}>
                      {objOption.strSection} - {objOption.strDescription}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
            <Box sx={{ flex: "1 1 auto", minHeight: 0, borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <CommonTable
                columns={lstDeclarationColumns}
                rows={lstDeclarationGridRows}
                rowIdField={"id"}
                defaultPageSize={500}
                minTableWidth={860}
                toolbarLeft={!blnDeclarationReadOnly && blnCanEditDeclaration ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddCircleOutlineRoundedIcon />}
                    onClick={openAddDeclarationFromTable}
                    sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f" } }}
                    controlId="salary.it-declaration.add.button"
                  >
                    {t("add_declaration", "Add Declaration")}
                  </Button>
                ) : undefined}
                withPaper={false}
                testIdPrefix="salary-it-declaration-list"
                emptyMessage={t("no_declaration_sections", "No declaration sections available. Check Tax Declaration Component master data and ESS IT declaration API.")}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={3} sx={{ height: "100%", minHeight: 0 }}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4, flex: "0 0 auto" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>{t("tax_summary_live", "Tax Summary (Live)")}</Typography>
              <Tooltip title={t("view_detailed_tax_calculation", "View detailed tax calculation")}>
                <IconButton size="small" onClick={() => setBlnTaxCalcInfoOpen(true)} sx={{ color: "#475569" }}>
                  <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <Stack spacing={0.45} sx={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("gross_salary", "Gross Salary")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decGrossSalary)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("total_exemptions", "Total Exemptions")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decExemptions)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("total_deductions", "Total Deductions")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decDeductions)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("taxable_income_old", "Taxable Income (Old)")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decTaxableOld)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("taxable_income_new", "Taxable Income (New)")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>{formatCurrency(objDerivedCalc.decTaxableNew)}</Typography></Stack>
              <Box sx={{ borderTop: "1px solid #e5e7eb", my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{t("estimated_tax_old", "Estimated Tax (Old)")}</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#15803d" }}>{formatCurrency(objDerivedCalc.decOldTax)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{t("estimated_tax_new", "Estimated Tax (New)")}</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c" }}>{formatCurrency(objDerivedCalc.decNewTax)}</Typography></Stack>
              {objSelectedRegimeBreakdown ? (
                <>
                  <Box sx={{ borderTop: "1px solid #e5e7eb", my: 0.4 }} />
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("slab_profile", "Slab Profile")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{String(objTaxSummary.strSelectedSlabProfileCode || getNumericValue(objSelectedRegimeBreakdown.strSlabProfileCode) || objSelectedRegimeBreakdown.strSlabProfileCode || "-")}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("standard_deduction", "Standard Deduction")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(getNumericValue(objSelectedRegimeBreakdown.decStandardDeductionAmount) ?? 0)}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("tax_before_rebate", "Tax Before Rebate")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(getNumericValue(objSelectedRegimeBreakdown.decTaxBeforeRebate) ?? 0)}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("rebate", "Rebate")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency((getNumericValue(objSelectedRegimeBreakdown.decRebateAmount) ?? 0) + (getNumericValue(objSelectedRegimeBreakdown.decMarginalRebateReliefAmount) ?? 0))}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("surcharge", "Surcharge")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency((getNumericValue(objSelectedRegimeBreakdown.decSurchargeAmount) ?? 0) - (getNumericValue(objSelectedRegimeBreakdown.decMarginalSurchargeReliefAmount) ?? 0))}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("cess", "Cess")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(getNumericValue(objSelectedRegimeBreakdown.decCessAmount) ?? 0)}</Typography></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.78rem", color: "#64748b" }}>{t("monthly_tds", "Monthly TDS")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(getNumericValue(objSelectedRegimeBreakdown.decMonthlyTds) ?? 0)}</Typography></Stack>
                </>
              ) : null}
              {objTaxSummary.blnSelectedRegimePayrollAligned && objTaxSummary.strSummaryNote ? (
                <Typography sx={{ fontSize: "0.73rem", color: "#166534", fontWeight: 700 }}>
                  {objTaxSummary.strSummaryNote}
                </Typography>
              ) : null}
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.74rem", color: "#64748b" }}>{t("estimated_preview_only", "Estimated preview only")}</Typography> : null}
              {objDerivedCalc.blnPreviewOnly && objDerivedCalc.blnRuleBasedFallback ? <Typography sx={{ fontSize: "0.73rem", color: "#94a3b8" }}>{t("rule_based_calculation_required", "Some sections require backend rule-based calculation.")}</Typography> : null}
            </Stack>
            <Paper sx={{ mt: 1, p: 1, borderRadius: "8px", border: "1px solid #bde3cb", backgroundColor: "#f0fdf4" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color: "#166534" }}>{t("recommended_regime", "Recommended Regime")}</Typography>
              <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: "#14532d" }}>{getRegimeLabel(objDerivedCalc.strRecommendedRegime)}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "#166534", mt: 0.2, fontWeight: 700 }}>{t("estimated_tax_saving", "Estimated Tax Saving")}: {formatCurrency(objDerivedCalc.decSavings)}</Typography>
            </Paper>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={blnRegimeModalOpen} onClose={() => setBlnRegimeModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("select_tax_regime", "Select Tax Regime")}</DialogTitle>
        <DialogContent>
          <RadioGroup value={strRegimeDraft} onChange={(objEvent) => setStrRegimeDraft(objEvent.target.value as Regime)}>
            <FormControlLabel value="Old Regime" control={<Radio />} label={`${getRegimeLabel("Old Regime")} (${t("recommended", "Recommended")})`} />
            <FormControlLabel value="New Regime" control={<Radio />} label={getRegimeLabel("New Regime")} />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnRegimeModalOpen(false)}>{t("cancel", "Cancel")}</Button>
          <Button variant="contained" onClick={() => void confirmRegime()}>{t("continue", "Continue")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(objEditRow)} onClose={closeEditModal} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ py: 1.1, px: 2 }}>{t("edit_declaration", "Edit Declaration")} ({objEditRow?.strSection})</DialogTitle>
        <DialogContent sx={{ pt: "8px !important", pb: "6px !important" }}>
          <Stack spacing={1}>
            {strEditDialogError ? (
              <Alert severity="error" onClose={() => setStrEditDialogError("")} sx={{ borderRadius: "8px" }}>
                {strEditDialogError}
              </Alert>
            ) : null}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {!blnDeclarationReadOnly && blnCanEditDeclaration ? (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddCircleOutlineRoundedIcon />}
                  sx={{ minHeight: 28, px: 1.05, fontSize: "0.74rem", textTransform: "none", borderRadius: "8px", backgroundColor: "#0b3f73", "&:hover": { backgroundColor: "#0a355f" } }}
                  onClick={addInvestmentRow}
                >
                  {t("add_investment", "Add Investment")}
                </Button>
              ) : <Box />}
              <Typography sx={{ color: "#334155", fontSize: "0.82rem", fontWeight: 800 }}>
                {t("section_total", "Section total")}: {formatCurrency(decSectionEditTotal)}
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
                          readOnly={blnDeclarationReadOnly || !blnCanEditDeclaration}
                          renderInput={(params) => {
                            const strCurrentName = objEntry.strInvestmentName.trim().toLowerCase();
                            const intDuplicateCount = lstSectionEditEntries.filter((objCurrent) => objCurrent.strInvestmentName.trim().toLowerCase() === strCurrentName && strCurrentName).length;
                            const blnDuplicate = intDuplicateCount > 1;
                            const blnMandatoryMissing = !objEntry.strInvestmentName.trim();
                            return (
                              <TextField
                                {...params}
                                label={t("investment_name_required", "Investment name *")}
                                size="small"
                                error={blnDuplicate || blnMandatoryMissing}
                                helperText={blnDuplicate ? t("duplicate_investment_not_allowed", "Duplicate investment is not allowed.") : blnMandatoryMissing ? t("investment_name_mandatory", "Investment name is mandatory.") : undefined}
                                InputProps={{ ...params.InputProps, readOnly: blnDeclarationReadOnly || !blnCanEditDeclaration }}
                                sx={{ "& .MuiInputBase-root": { minHeight: 34 } }}
                                fullWidth
                              />
                            );
                          }}
                        />
                      </Box>
                      <Box sx={{ width: { xs: "100%", lg: "19%" } }}>
                        <TextField
                          label={t("declared_amount_required", "Declared amount *")}
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
                          helperText={!objEntry.strAmountInput.trim() ? t("declared_amount_mandatory", "Declared amount is mandatory.") : Number((objEntry.strAmountInput || "").replace(/[^\d.]/g, "") || 0) <= 0 ? t("amount_greater_than_zero", "Amount must be greater than zero.") : undefined}
                          InputProps={{ readOnly: blnDeclarationReadOnly || !blnCanEditDeclaration }}
                          fullWidth
                        />
                      </Box>
                      <Stack direction="row" spacing={0.45} alignItems="center" sx={{ width: { xs: "100%", lg: "15%" }, pt: { lg: 0.25 } }}>
                        {!blnDeclarationReadOnly && blnCanEditDeclaration ? (
                          <FileUploadButton
                            controlId={`salary.it-declaration.proof-upload.${objEntry.strClientKey}`}
                            label={t("upload", "Upload")}
                            replaceLabel={t("replace", "Replace")}
                            hasExistingFile={Boolean(objEntry.objProof || objEntry.objProofFileInput)}
                            isUploading={strActiveProofUploadClientKey === objEntry.strClientKey}
                            progress={strActiveProofUploadClientKey === objEntry.strClientKey ? intActiveProofUploadProgress : undefined}
                            onFilesSelected={(lstSelected) => {
                              const objFile = lstSelected[0] ?? null;
                              setLstSectionEditEntries((lstCurrent) => lstCurrent.map((objCurrent) => (
                                objCurrent.strClientKey === objEntry.strClientKey ? { ...objCurrent, objProofFileInput: objFile } : objCurrent
                              )));
                            }}
                            onValidationError={(strMessage) => setStrEditDialogError(strMessage)}
                            sx={{
                              minHeight: 26,
                              px: 0.9,
                              py: 0.25,
                              fontSize: "0.72rem",
                              borderColor: "#2563eb",
                              color: "#1d4ed8",
                              backgroundColor: "#eff6ff",
                              "& .MuiSvgIcon-root": { color: "#1d4ed8", fontSize: "1rem" },
                              "&:hover": { borderColor: "#1d4ed8", backgroundColor: "#dbeafe" },
                            }}
                          />
                        ) : null}
                        {!blnDeclarationReadOnly && blnCanEditDeclaration ? (
                          <Tooltip title={t("delete", "Delete")}>
                            <IconButton
                              size="small"
                              sx={{ border: "1px solid #cbd5e1", borderRadius: "7px", color: "#475569", p: 0.45, "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" } }}
                              onClick={async () => {
                                if (objEntry.intItemID && intDeclarationID) {
                                  try {
                                    const objData = await deleteCurrentItem(intDeclarationID, objEntry.intItemID);
                                    hydrateFromApi(objData);
                                  } catch (objError) {
                                    setStrEditDialogError(formatApiErrorForUi(objError, t("unable_delete_investment_row", "Unable to delete investment row.")));
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
                        {objEntry.objProof && objEntry.intItemID ? (
                          <Tooltip title={t("view", "View")}>
                            <IconButton
                              size="small"
                              color="primary"
                              sx={{ border: "1px solid #cbd5e1", borderRadius: "7px", p: 0.45, "&:hover": { backgroundColor: "#f8fafc", borderColor: "#94a3b8" } }}
                              onClick={() => void previewCurrentProof(objEntry.intItemID as number)}
                            >
                              <VisibilityRoundedIcon fontSize="small" />
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
                          ? `${t("selected", "Selected")}: ${objEntry.objProofFileInput.name}`
                          : objEntry.objProof?.strFileName
                            ? `${t("uploaded", "Uploaded")}: ${objEntry.objProof.strFileName}`
                            : t("no_proof_uploaded", "No proof uploaded")}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
            {decActiveMaxLimit != null ? (
              <Typography sx={{ color: blnApplyMaxLimitAtEntry && decSectionEditTotal > decActiveMaxLimit ? "#b91c1c" : "#64748b", fontSize: "0.74rem", mt: -0.35 }}>
                {t("max_allowed", "Max allowed")}{!blnApplyMaxLimitAtEntry ? ` ${t("checked_at_approval_not_enforced", "(checked at approval, not enforced here)")}` : ""} {t("under", "under")} {objEditRow?.strSection}: {formatCurrency(decActiveMaxLimit)}
              </Typography>
            ) : null}
            <Typography sx={{ color: objEditRow?.blnProofRequired ? "#b45309" : "#64748b", fontSize: "0.74rem", mt: -0.35, fontWeight: 700 }}>
              {t("proof", "Proof")}: {objEditRow?.blnProofRequired ? t("mandatory", "Mandatory") : t("optional", "Optional")}
            </Typography>
            <Typography sx={{ color: "#b45309", fontSize: "0.72rem", mt: -0.15, lineHeight: 1.2, fontWeight: 600 }}>
              {t("supported_document_types", "Supported document types: PDF, JPG/JPEG, PNG. Max size: 500 KB.")}
            </Typography>
            {strSectionEditError ? (
              <Typography sx={{ fontSize: "0.73rem", color: "#b91c1c", fontWeight: 700, mt: 0.2 }}>{strSectionEditError}</Typography>
            ) : null}
            {strSectionEditWarning ? (
              <Typography sx={{ fontSize: "0.73rem", color: "#b45309", fontWeight: 700, mt: 0.2 }}>{strSectionEditWarning}</Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditModal}>{blnDeclarationReadOnly ? t("close", "Close") : t("cancel", "Cancel")}</Button>
          {!blnDeclarationReadOnly ? (
            <Button variant="contained" onClick={() => void saveDeclarationEdit()} disabled={blnSaveEditDisabled || blnModalSaving || !blnCanEditDeclaration}>
              {blnModalSaving ? <CircularProgress size={16} color="inherit" /> : t("save", "Save")}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={blnCompareModalOpen} onClose={() => setBlnCompareModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ py: 1, px: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography sx={{ fontWeight: 800 }}>{t("compare_tax", "Compare Tax")}</Typography>
            <Tooltip title={t("view_detailed_tax_calculation", "View detailed tax calculation")}>
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
                    <TableCell sx={{ fontWeight: 800 }}>{t("metric", "Metric")}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{getRegimeLabel("Old Regime")}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{getRegimeLabel("New Regime")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("taxable_income", "Taxable Income")}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableOld)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableNew)}</TableCell>
                  </TableRow>
                  {objOldRegimeBreakdown || objNewRegimeBreakdown ? (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t("standard_deduction", "Standard Deduction")}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objOldRegimeBreakdown?.decStandardDeductionAmount) ?? 0)}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objNewRegimeBreakdown?.decStandardDeductionAmount) ?? 0)}</TableCell>
                    </TableRow>
                  ) : null}
                  {objOldRegimeBreakdown || objNewRegimeBreakdown ? (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t("tax_before_rebate", "Tax Before Rebate")}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objOldRegimeBreakdown?.decTaxBeforeRebate) ?? 0)}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objNewRegimeBreakdown?.decTaxBeforeRebate) ?? 0)}</TableCell>
                    </TableRow>
                  ) : null}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("estimated_tax", "Estimated Tax")}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: objDerivedCalc.strRecommendedRegime === "Old Regime" ? "#166534" : "#0f172a", backgroundColor: objDerivedCalc.strRecommendedRegime === "Old Regime" ? "rgba(220,252,231,0.62)" : undefined }}>
                      {formatCurrency(objDerivedCalc.decOldTax)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: objDerivedCalc.strRecommendedRegime === "New Regime" ? "#166534" : "#0f172a", backgroundColor: objDerivedCalc.strRecommendedRegime === "New Regime" ? "rgba(220,252,231,0.62)" : undefined }}>
                      {formatCurrency(objDerivedCalc.decNewTax)}
                    </TableCell>
                  </TableRow>
                  {objOldRegimeBreakdown || objNewRegimeBreakdown ? (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>{t("monthly_tds", "Monthly TDS")}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objOldRegimeBreakdown?.decMonthlyTds) ?? 0)}</TableCell>
                      <TableCell>{formatCurrency(getNumericValue(objNewRegimeBreakdown?.decMonthlyTds) ?? 0)}</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
            <Paper sx={{ p: 1, borderRadius: "8px", border: "1px solid #bde3cb", backgroundColor: "#f0fdf4" }}>
              <Typography sx={{ color: "#166534", fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {t("recommended_regime", "Recommended Regime")}
              </Typography>
              <Typography sx={{ color: "#14532d", fontSize: "1rem", fontWeight: 900 }}>{getRegimeLabel(objDerivedCalc.strRecommendedRegime)}</Typography>
            </Paper>
            <Alert severity="info" sx={{ borderRadius: "10px" }}>
              <Typography sx={{ fontWeight: 800 }}>{t("estimated_savings", "Estimated Savings")}: {formatCurrency(objDerivedCalc.decSavings)}</Typography>
              <Typography sx={{ fontSize: "0.8rem", mt: 0.2 }}>
                {objDerivedCalc.strRecommendedRegime === "Either Regime" ? t("both_regimes_same_tax", "Both regimes currently result in the same estimated tax.") : `${getRegimeLabel(objDerivedCalc.strRecommendedRegime)} ${t("recommended_reason", "is recommended because it gives the lower estimated tax based on your current declaration entries.")}`}
              </Typography>
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.76rem", mt: 0.35 }}>{t("estimated_preview_only", "Estimated preview only")}</Typography> : null}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnCompareModalOpen(false)}>{t("back", "Back")}</Button>
          {!blnLocked && blnDraftLikeActionsAllowed && blnCanSubmitDeclaration ? (
            <Button variant="contained" onClick={() => { setBlnCompareModalOpen(false); setBlnSubmitModalOpen(true); }}>{t("continue_to_submit", "Continue to Submit")}</Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={blnTaxCalcInfoOpen} onClose={() => setBlnTaxCalcInfoOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ py: 1.1 }}>{t("tax_calculation_details", "Tax Calculation Details")}</DialogTitle>
        <DialogContent sx={{ pt: "10px !important" }}>
          <Stack spacing={1}>
            <Alert severity="info" sx={{ borderRadius: "8px" }}>
              <Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>
                {t("tax_calculation_info", "Old Regime taxable income is reduced by eligible exemptions. New Regime uses gross salary in this summary view.")}
              </Typography>
              {objDerivedCalc.blnPreviewOnly ? (
                <Typography sx={{ fontSize: "0.76rem", mt: 0.25 }}>
                  {t("showing_estimated_values", "Showing estimated values based on current saved/unsaved declaration inputs.")}
                </Typography>
              ) : null}
            </Alert>
            <Grid container spacing={0.8}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0.85, borderRadius: "8px", border: "1px solid #bfdbfe", background: "linear-gradient(140deg, #eff6ff 0%, #f8fbff 100%)", height: "100%" }}>
                  <Stack spacing={0.22}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e3a8a" }}>{t("formula_guide", "Formula Guide")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_a_gross_salary", "A = Gross Salary")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_b_eligible_exemptions", "B = Eligible Exemptions considered for that regime")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_taxable_income_a_b", "Taxable Income = A - B")}</Typography>
                    <Typography sx={{ fontSize: "0.73rem", color: "#475569", mt: 0.1 }}>
                      {t("formula_guide_note", "In this view, declaration-based exemptions are applied to Old Regime. For New Regime, B is shown as 0.")}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 0.85, borderRadius: "8px", border: "1px solid #bbf7d0", background: "linear-gradient(140deg, #f0fdf4 0%, #f8fff8 100%)", height: "100%" }}>
                  <Stack spacing={0.22}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: "#166534" }}>{t("tax_amount_formula_flow", "Tax Amount Formula Flow")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_c_taxable_income", "C = Taxable Income (A - B)")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_d_estimated_tax", "D = Estimated Tax (from regime slab rules in payroll tax engine)")}</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#1f2937" }}>{t("formula_effective_tax_rate", "Effective Tax Rate = D / C")}</Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "#475569", mt: 0.1 }}>
                  {t("old", "Old")}: {formatPercent(decOldEffectiveRate)} | {t("new", "New")}: {formatPercent(decNewEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {t("old_rate", "Old rate")} = {formatCurrency(objDerivedCalc.decOldTax)} / {formatCurrency(objDerivedCalc.decTaxableOld)} x 100 = {formatPercent(decOldEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "#64748b" }}>
                  {t("new_rate", "New rate")} = {formatCurrency(objDerivedCalc.decNewTax)} / {formatCurrency(objDerivedCalc.decTaxableNew)} x 100 = {formatPercent(decNewEffectiveRate)}
                </Typography>
                <Typography sx={{ fontSize: "0.73rem", color: "#475569" }}>
                  {t("estimated_savings_formula", "Estimated Savings = |Estimated Tax (Old) - Estimated Tax (New)|")}
                </Typography>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
            <TableContainer sx={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: "#f8fafc" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>{t("calculation_step", "Calculation Step")}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{getRegimeLabel("Old Regime")}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{getRegimeLabel("New Regime")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("gross_salary_a", "Gross Salary (A)")}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decGrossSalary)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decGrossSalary)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("total_declared_amount", "Total Declared Amount")}</TableCell>
                    <TableCell>{formatCurrency(decDeclaredTotal)}</TableCell>
                    <TableCell>{formatCurrency(decDeclaredTotal)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("eligible_exemptions_b", "Eligible Exemptions (B)")}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decExemptions)}</TableCell>
                    <TableCell>{formatCurrency(0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("taxable_income_a_b", "Taxable Income (A - B)")}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableOld)}</TableCell>
                    <TableCell>{formatCurrency(objDerivedCalc.decTaxableNew)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("estimated_tax", "Estimated Tax")}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(objDerivedCalc.decOldTax)}</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(objDerivedCalc.decNewTax)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{t("estimated_savings", "Estimated Savings")}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: "#166534" }}>{formatCurrency(objDerivedCalc.decSavings)}</TableCell>
                    <TableCell sx={{ color: "#64748b" }}>
                      {objDerivedCalc.strRecommendedRegime === "Either Regime" ? t("no_difference", "No difference") : `${getRegimeLabel(objDerivedCalc.strRecommendedRegime)} ${t("recommended_lower", "recommended")}`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnTaxCalcInfoOpen(false)}>{t("close", "Close")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnSubmitModalOpen} onClose={() => setBlnSubmitModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("submit_declaration", "Submit Declaration")}</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1}>
            <Paper sx={{ p: 0.9, borderRadius: "8px", border: "1px solid #dbe3ef", backgroundColor: "#f8fafc" }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.83rem", color: "#0f172a", mb: 0.4 }}>{t("declaration_summary", "Declaration Summary")}</Typography>
              <Stack spacing={0.35}>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("selected_regime", "Selected Regime")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{getRegimeLabel(strSelectedRegime || strRecommendedRegimeSelectable)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("total_declared_amount", "Total Declared Amount")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(decDeclaredTotal)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.8rem", color: "#64748b" }}>{t("estimated_savings", "Estimated Savings")}</Typography><Typography sx={{ fontSize: "0.8rem", fontWeight: 700 }}>{formatCurrency(objDerivedCalc.decSavings)}</Typography></Stack>
              </Stack>
              {objDerivedCalc.blnPreviewOnly ? <Typography sx={{ fontSize: "0.72rem", color: "#64748b", mt: 0.5 }}>{t("estimated_preview_only", "Estimated preview only")}</Typography> : null}
            </Paper>
            <Alert severity="warning" sx={{ borderRadius: "8px" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>{t("after_submission", "After submission:")}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>{t("editing_locked_after_submit", "Editing will be locked.")}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>{t("regime_cannot_change", "Selected regime cannot be changed.")}</Typography>
              <Typography sx={{ fontSize: "0.8rem" }}>{t("proofs_cannot_modify", "Uploaded proofs cannot be modified.")}</Typography>
            </Alert>
            <Typography sx={{ fontSize: "0.83rem", color: "#334155" }}>
              {t("submit_confirmation_message", "Please confirm that your declaration details and uploaded proofs are final and accurate before submitting.")}
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
              label={<Typography sx={{ fontSize: "0.8rem" }}>{t("confirm_details_correct", "I confirm details are correct (required before final submit).")}</Typography>}
            />
            {!blnDeclarationConfirm ? (
              <Typography sx={{ fontSize: "0.75rem", color: "#b45309", mt: -0.3 }}>
                {t("please_check_confirmation", "Please check this confirmation before submitting.")}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnSubmitModalOpen(false)}>{t("cancel", "Cancel")}</Button>
          {blnCanSubmitDeclaration ? (
            <Button variant="contained" onClick={() => void submitDeclaration()} disabled={blnSubmitModalLoading}>
              {blnSubmitModalLoading ? <CircularProgress size={16} color="inherit" /> : t("confirm_submit", "Confirm & Submit")}
            </Button>
          ) : null}
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
