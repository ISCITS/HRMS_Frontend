"use client";

import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
  strMaxLimit: string;
  decDeclaredAmount: number;
  strInvestmentName: string;
  strStatus: "Completed" | "In Progress" | "Not Started";
};

const lstStepper = ["Select Tax Regime", "Enter Declarations", "Compare Tax", "Final Submit"];
const strFinancialYearCode = "2025-2026";
const intDeclarationTableMaxHeight = 420;

function formatCurrency(decValue: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(decValue || 0)}`;
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
}

function getStatusTextColor(strStatus: DeclarationRow["strStatus"]) {
  if (strStatus === "Completed") return "#15803d";
  if (strStatus === "In Progress") return "#c2410c";
  return "#b91c1c";
}

function getDeclarationRowKey(objRow: DeclarationRow) {
  return `${objRow.strSection.trim().toLowerCase()}|${objRow.strDescription.trim().toLowerCase()}`;
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
    const blnPickCurrent =
      (!blnExistingHasItemId && blnCurrentHasItemId) ||
      objRow.decDeclaredAmount > objExisting.decDeclaredAmount;

    if (blnPickCurrent) {
      dicByCompositeKey.set(strKey, objRow);
    }
  }
  return Array.from(dicByCompositeKey.values());
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
  const [strSelectedRegime, setStrSelectedRegime] = useState<Regime | "">("");
  const [lstRows, setLstRows] = useState<DeclarationRow[]>([]);
  const [strLastUpdated, setStrLastUpdated] = useState(getDateLabel());
  const [blnDraftSaved, setBlnDraftSaved] = useState(false);
  const [strError, setStrError] = useState("");
  const [strWarning, setStrWarning] = useState("");
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

  const [objEditRow, setObjEditRow] = useState<DeclarationRow | null>(null);
  const [strInvestmentNameInput, setStrInvestmentNameInput] = useState("");
  const [strAmountInput, setStrAmountInput] = useState("");
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

  const blnLocked = strFlowStatus === "SUBMITTED";
  const blnRegimeSwitchDisabled = blnLocked || !objRegimeConfig.blnAllowEmployeeOptOut;
  const blnStarted = strFlowStatus !== "NOT_STARTED";
  const blnHasAnyFilled = useMemo(() => lstRows.some((objRow) => objRow.decDeclaredAmount > 0), [lstRows]);
  const decDeclaredTotal = useMemo(() => lstRows.reduce((decTotal, objRow) => decTotal + objRow.decDeclaredAmount, 0), [lstRows]);
  const decTaxableIncome = objTaxSummary.decTaxableIncome;
  const decOldTax = objTaxSummary.decOldTax;
  const decNewTax = objTaxSummary.decNewTax;
  const decSavings = objTaxSummary.decSavings;
  const decGrossSalary = Math.max(0, objTaxSummary.decGrossSalary || 0);
  const decExemptionsRaw = Math.max(0, objTaxSummary.decExemptions || 0);
  const decDisplayExemptions = decGrossSalary > 0 ? Math.min(decExemptionsRaw, decGrossSalary) : decExemptionsRaw;
  const decDisplayTaxableOld = decGrossSalary > 0 ? Math.max(0, decGrossSalary - decDisplayExemptions) : Math.max(0, decTaxableIncome);
  const decDisplayTaxableNew = decGrossSalary;
  const blnSummaryNormalized = decGrossSalary > 0 && decExemptionsRaw > decGrossSalary;
  const strRecommendedRegime: Regime = objTaxSummary.strRecommendedRegime;
  const intActiveStep = useMemo(() => {
    if (strFlowStatus === "NOT_STARTED") return 0;
    if (strFlowStatus === "REGIME_SELECTED") return 1;
    if (strFlowStatus === "IN_PROGRESS") return 2;
    return 3;
  }, [strFlowStatus]);

  function hydrateFromApi(objData: ItDeclarationDto) {
    setIntDeclarationID(objData.intDeclarationID ?? null);
    setStrFlowStatus(objData.strFlowStatus as FlowStatus);
    setStrSelectedRegime((objData.strSelectedRegime || "") as Regime | "");
    setStrLastUpdated(objData.strLastUpdated || getDateLabel());
    setLstRows(
      objData.lstItems?.length
        ? dedupeDeclarationRows(
            objData.lstItems.map((objItem) => ({
              intItemID: objItem.intItemID,
              strSection: objItem.strSection,
              strDescription: objItem.strDescription,
              strMaxLimit: objItem.strMaxLimit,
              decDeclaredAmount: objItem.decDeclaredAmount,
              strInvestmentName: objItem.strInvestmentName,
              strStatus: objItem.strStatus,
            }))
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
  }

  function mapCategoryToRow(objCategory: EssDeclarationCategoryApiRecord): DeclarationRow {
    const strDescription = objCategory.strCategoryDescription?.trim() || objCategory.strCategoryName;
    const strMaxLimit = objCategory.decMaxLimitAmount == null ? "-" : formatCurrency(objCategory.decMaxLimitAmount);
    return {
      intItemID: null,
      strSection: objCategory.strCategoryCode,
      strDescription,
      strMaxLimit,
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
    try {
      const objData = await itDeclarationService.getDeclaration(strFinancialYearCode);
      hydrateFromApi(objData);
      if (!objData.lstItems?.length) {
        const lstMasterRows = await loadRowsFromCategoryMaster();
        setLstRows(lstMasterRows);
      }
    } catch (objError) {
      const strApiError = formatApiErrorForUi(objError, "Unable to load IT declaration.");
      const blnItDeclarationRouteMissing = objError instanceof ApiRequestError && objError.intStatusCode === 404;
      try {
        const lstMasterRows = await loadRowsFromCategoryMaster();
        setLstRows(lstMasterRows);
        if (lstMasterRows.length > 0) {
          setStrWarning(
            blnItDeclarationRouteMissing
              ? "IT declaration API is not available in current backend build. Loaded declaration sections from Tax Declaration master."
              : `${strApiError} Loaded declaration sections from Tax Declaration Component master.`
          );
        } else {
          setStrError(strApiError);
        }
      } catch {
        setLstRows([]);
        setStrError(strApiError);
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
    const intTimer = window.setTimeout(() => setBlnDraftSaved(false), 1500);
    return () => window.clearTimeout(intTimer);
  }, [blnDraftSaved]);

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
    setStrRegimeDraft((strSelectedRegime || strRecommendedRegime || "Old Regime") as Regime);
    setBlnRegimeModalOpen(true);
  }

  function openEditModal(objRow: DeclarationRow) {
    if (blnLocked) return;
    if (!blnStarted) {
      openRegimeModal();
      return;
    }
    setObjEditRow(objRow);
    setStrInvestmentNameInput(objRow.strInvestmentName);
    setStrAmountInput(objRow.decDeclaredAmount ? String(objRow.decDeclaredAmount) : "");
  }

  async function saveDeclarationEdit() {
    if (!objEditRow) return;
    const decAmount = Math.max(0, Number(strAmountInput || 0));
    const strInvestmentName = strInvestmentNameInput.trim();
    const strDirtyKey = objEditRow.intItemID != null ? `id-${objEditRow.intItemID}` : `${objEditRow.strSection}-${objEditRow.strDescription}`;
    setLstRows((lstCurrentRows) =>
      lstCurrentRows.map((objRow) =>
        (objRow.intItemID != null && objEditRow.intItemID != null && objRow.intItemID === objEditRow.intItemID) ||
        (objRow.intItemID == null && objEditRow.intItemID == null && objRow.strSection === objEditRow.strSection && objRow.strDescription === objEditRow.strDescription)
          ? {
              ...objRow,
              strInvestmentName,
              decDeclaredAmount: decAmount,
              strStatus: decAmount > 0 ? "Completed" : "Not Started",
            }
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
    setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : "IN_PROGRESS"));
    setStrLastUpdated(getDateLabel());
    setObjEditRow(null);
    setBlnDraftSaved(true);
  }

  async function confirmRegime() {
    setStrSelectedRegime(strRegimeDraft);
    setBlnRegimeDirty(true);
    setStrFlowStatus((strCurrentStatus) => (strCurrentStatus === "NOT_STARTED" ? "REGIME_SELECTED" : strCurrentStatus));
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
    const strRegimeToSave = (strSelectedRegime || strRecommendedRegime || "Old Regime") as Regime;
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
            <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent={{ xs: "flex-start", md: "flex-end" }}>
              <RadioGroup
                row
                value={strSelectedRegime || "Old Regime"}
                disabled={blnRegimeSwitchDisabled}
                onChange={(objEvent) => { setStrSelectedRegime(objEvent.target.value as Regime); setBlnRegimeDirty(true); }}
                sx={{
                  mr: { md: 0.5 },
                  "& .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.95)", fontSize: "0.8rem" },
                  "& .MuiRadio-root": { color: "rgba(239,252,255,0.95)" },
                  "& .Mui-checked": { color: "#ffffff !important" },
                }}
              >
                <FormControlLabel value="Old Regime" control={<Radio size="small" />} label={`Old Regime${strRecommendedRegime === "Old Regime" ? " (Recommended)" : ""}`} />
                <FormControlLabel value="New Regime" control={<Radio size="small" />} label="New Regime" />
              </RadioGroup>
              <Button variant="contained" size="small" onClick={() => void saveDraft()} disabled={blnLocked} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0b3f73", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0a355f" } }}>
                Save Draft
              </Button>
              <Button variant="contained" size="small" disabled={!blnHasAnyFilled || blnLocked} onClick={() => void runCompareAndOpenModal()} sx={{ minHeight: 30, borderRadius: "8px", backgroundColor: "#0e7490", color: "#ffffff", fontWeight: 700, fontSize: "0.76rem", textTransform: "none", boxShadow: "none", "&:hover": { backgroundColor: "#0b5f75" } }}>
                Compare Tax
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
            <FormControlLabel
              sx={{ m: 0, mt: -0.2, "& .MuiFormControlLabel-label": { color: "rgba(239,252,255,0.95)" } }}
              control={<Checkbox size="small" checked={blnDeclarationConfirm} onChange={(objEvent) => { const blnChecked = objEvent.target.checked; setBlnDeclarationConfirm(blnChecked); if (blnChecked && strWarning === "Please check confirmation checkbox before final submit.") { setStrWarning(""); } }} sx={{ color: "rgba(239,252,255,0.95)", "&.Mui-checked": { color: "#ffffff" } }} />}
              label={<Typography sx={{ fontSize: "0.76rem" }}>I confirm details are correct (required before final submit).</Typography>}
            />
            {!objRegimeConfig.blnAllowEmployeeOptOut ? (
              <Typography sx={{ fontSize: "0.72rem", color: "rgba(239,252,255,0.85)" }}>
                Regime is locked by policy. Default regime: {objRegimeConfig.strDefaultRegime}
              </Typography>
            ) : null}
          </Stack>
        </Stack>
      </Paper>

      <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ borderRadius: "8px", border: "1px solid rgba(251,146,60,0.35)", backgroundColor: "rgba(255,237,213,0.62)", py: 0.05, "& .MuiAlert-message": { fontSize: "0.8rem" } }}>
        If you do not submit your IT declaration before the deadline, the New Tax Regime will be applied by default.
      </Alert>

      {blnDraftSaved ? <Alert severity="success" sx={{ borderRadius: "8px", py: 0.1 }}>Draft saved</Alert> : null}
      {strWarning ? <Alert severity="warning" sx={{ borderRadius: "8px", py: 0.1 }}>{strWarning}</Alert> : null}
      {blnSummaryNormalized ? (
        <Alert severity="info" sx={{ borderRadius: "8px", py: 0.1 }}>
          Tax summary was normalized for display because exemptions exceeded gross salary.
        </Alert>
      ) : null}
      {strError ? <Alert severity="error" sx={{ borderRadius: "8px", py: 0.1 }}>{strError}</Alert> : null}

      <Grid container spacing={0.8}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Declaration Status" strValue={strFlowStatus === "SUBMITTED" ? "Submitted" : blnHasAnyFilled ? "Draft" : "Not Started"} strSubValue={`Last updated: ${strLastUpdated}`} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Selected Regime" strValue={strSelectedRegime || "Old Regime"} strSubValue={strRecommendedRegime === "Old Regime" ? "Recommended" : ""} objIcon={<VerifiedUserOutlinedIcon sx={{ fontSize: 18 }} />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard strLabel="Estimated Tax Saving" strValue={formatCurrency(decSavings)} strSubValue="(Old vs New Regime)" objIcon={<SavingsOutlinedIcon sx={{ fontSize: 18 }} />} />
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
                  ) : lstRows.map((objRow, intIndex) => (
                    <TableRow key={objRow.intItemID ?? `${objRow.strSection}-${intIndex}`} hover sx={{ height: 56 }}>
                      <TableCell sx={{ fontWeight: 700 }}>{objRow.strSection}</TableCell>
                      <TableCell>{objRow.strDescription}</TableCell>
                      <TableCell>{formatCurrency(objRow.decDeclaredAmount)}</TableCell>
                      <TableCell>{objRow.strMaxLimit}</TableCell>
                      <TableCell><Typography sx={{ fontSize: "0.8rem", fontWeight: 700, color: getStatusTextColor(objRow.strStatus) }}>{objRow.strStatus}</Typography></TableCell>
                      <TableCell align="right"><Button variant="text" size="small" sx={{ fontSize: "0.76rem", fontWeight: 700 }} disabled={blnLocked} onClick={() => openEditModal(objRow)}>{objRow.decDeclaredAmount > 0 ? "View / Edit" : blnStarted ? "Add" : "Start"}</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 1.1, borderRadius: "10px", border: "1px solid #dbe3ef", height: "100%" }}>
            <Typography sx={{ fontWeight: 800, mb: 1, fontSize: "0.95rem" }}>Tax Summary (Live)</Typography>
            <Stack spacing={0.72}>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem" }}>Gross Salary</Typography><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(decGrossSalary)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem" }}>Total Exemptions</Typography><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(decDisplayExemptions || decDeclaredTotal)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem" }}>Taxable Income (Old)</Typography><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(decDisplayTaxableOld)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem" }}>Taxable Income (New)</Typography><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>{formatCurrency(decDisplayTaxableNew)}</Typography></Stack>
              <Box sx={{ borderTop: "1px solid #e5e7eb", my: 0.4 }} />
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Estimated Tax (Old)</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#15803d" }}>{formatCurrency(decOldTax)}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Estimated Tax (New)</Typography><Typography sx={{ fontSize: "0.86rem", fontWeight: 800, color: "#b91c1c" }}>{formatCurrency(decNewTax)}</Typography></Stack>
            </Stack>
            <Paper sx={{ mt: 1, p: 1, borderRadius: "8px", border: "1px solid #bde3cb", backgroundColor: "#f0fdf4" }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>Recommended Regime</Typography>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#166534" }}>{strRecommendedRegime}</Typography>
              <Typography sx={{ fontSize: "0.76rem", color: "#166534", mt: 0.2 }}>Estimated Tax Saving: {formatCurrency(decSavings)}</Typography>
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

      <Dialog open={Boolean(objEditRow)} onClose={() => setObjEditRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Declaration ({objEditRow?.strSection})</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1.2}>
            <TextField label="Investment name" size="small" value={strInvestmentNameInput} onChange={(objEvent) => setStrInvestmentNameInput(objEvent.target.value)} fullWidth />
            <TextField label="Amount input" size="small" type="number" value={strAmountInput} onChange={(objEvent) => setStrAmountInput(objEvent.target.value)} fullWidth />
            <Typography sx={{ color: "#475569", fontSize: "0.86rem" }}>Total amount: {formatCurrency(Math.max(0, Number(strAmountInput || 0)))}</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setObjEditRow(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => void saveDeclarationEdit()}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnCompareModalOpen} onClose={() => setBlnCompareModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Compare Tax</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Stack spacing={1}>
            <Typography>Taxable Income (Old): {formatCurrency(decDisplayTaxableOld)}</Typography>
            <Typography>Taxable Income (New): {formatCurrency(decDisplayTaxableNew)}</Typography>
            <Typography>Old Regime Estimated Tax: {formatCurrency(decOldTax)}</Typography>
            <Typography>New Regime Estimated Tax: {formatCurrency(decNewTax)}</Typography>
            <Alert severity="info" sx={{ borderRadius: "10px" }}>You save {formatCurrency(decSavings)} with {strRecommendedRegime}</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnCompareModalOpen(false)}>Close</Button>
          <Button variant="contained" onClick={() => setBlnCompareModalOpen(false)}>Proceed</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={blnSubmitModalOpen} onClose={() => setBlnSubmitModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Submit Declaration</DialogTitle>
        <DialogContent sx={{ pt: "12px !important" }}>
          <Typography>Are you sure you want to submit? Editing will be locked.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBlnSubmitModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitDeclaration()}>Submit</Button>
        </DialogActions>
      </Dialog>

    </Stack>
  );
}
