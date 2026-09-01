"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LocalGasStationRoundedIcon from "@mui/icons-material/LocalGasStationRounded";
import LocalPhoneRoundedIcon from "@mui/icons-material/LocalPhoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryStructureLabels } from "@/features/salary-structures/hooks/useSalaryStructureLabels";
import {
  createEmptyFlexiMappingRow,
  createEmptyLineRow,
  createEmptyTextRow,
  createInitialSalaryStructureForm,
  normalizeSalaryStructureLineOrders,
  normalizeSalaryStructureFlexiRole,
  salaryStructureService,
  toSalaryStructureFormValues
} from "@/features/salary-structures/services/salaryStructureService";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryStructureFormOptions,
  SalaryStructureFormValues,
  SalaryStructureFlexiMappingFormValue,
  SalaryStructureLineFormValue,
  SalaryStructureTextFormValue
} from "@/features/salary-structures/types";

type SalaryStructureEditorPageProps = {
  strMode: "add" | "edit";
  intSalaryStructureID?: number;
};

const lstSalaryStructureModuleCodes = ["SALARY_STRUCTURE", "SALARY_STRUCTURES", "MASTER_SALARY_STRUCTURE"];

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function buildInputTestIdProps(strTestId: string, objExtraProps?: Record<string, string>) {
  return {
    "controlId": strTestId,
    ...objExtraProps,
  } as Record<string, string>;
}

function buildSelectDisplayTestIdProps(strTestId: string, objExtraProps?: Record<string, string>) {
  return {
    "controlId": strTestId,
    ...objExtraProps,
  } as Record<string, string>;
}

function getAutomationProps(strControlId?: string) {
  return strControlId ? ({ "data-controlid": strControlId } as const) : {};
}

function isFlexiBucketToken(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken.includes("flexipay") || strToken.includes("flexibucket") || strToken.includes("flexibasket");
}

function normalizeLineOrder(objValue: number | string, intFallbackValue = 10) {
  const intValue = Number(objValue);
  return Number.isInteger(intValue) && intValue >= 1 ? intValue : intFallbackValue;
}

function compareLineOrder(dicLeft: SalaryStructureLineFormValue, dicRight: SalaryStructureLineFormValue) {
  return Number(dicLeft.intLineOrder || 0) - Number(dicRight.intLineOrder || 0)
    || Number(dicLeft.intSalaryComponentID || 0) - Number(dicRight.intSalaryComponentID || 0)
    || dicLeft.strRowID.localeCompare(dicRight.strRowID);
}

function parseOptionalSelectNumber(strValue: string) {
  if (!strValue) {
    return "";
  }
  const intValue = Number(strValue);
  return Number.isInteger(intValue) && intValue > 0 ? intValue : "";
}

function formatSummaryAmount(fltValue: number) {
  return fltValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatFlexiAmount(fltValue: number | null | undefined) {
  return Number(fltValue ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatOptionalLimit(fltValue: number | null) {
  return fltValue == null ? "" : formatSummaryAmount(fltValue);
}

function formatReadonlyLimit(fltValue: number | null) {
  return fltValue == null ? "-" : formatSummaryAmount(fltValue);
}

function sanitizeDecimalInput(strValue: string) {
  const strSanitized = strValue.replace(/[^\d.,]/g, "");
  const [strFirstPart, ...lstRestParts] = strSanitized.split(".");
  return lstRestParts.length === 0 ? strFirstPart : `${strFirstPart}.${lstRestParts.join("")}`;
}

function formatNormalizedAmount(fltValue: number, intPrecision = 6) {
  if (!Number.isFinite(fltValue)) {
    return "";
  }
  const fltNearestInteger = Math.round(fltValue);
  if (Math.abs(fltValue - fltNearestInteger) < 0.05) {
    return String(fltNearestInteger);
  }
  const fltRoundedValue = Number(fltValue.toFixed(intPrecision));
  return fltRoundedValue.toString();
}

function parseCommaAmount(strValue: string) {
  return Number(strValue.replace(/,/g, ""));
}

function getLowerCap(fltPolicyLimit: number | null, fltStructureCap: number | null) {
  if (fltStructureCap == null) {
    return null;
  }
  return fltPolicyLimit == null ? fltStructureCap : Math.min(fltPolicyLimit, fltStructureCap);
}

function getComponentValueSource(dicComponent: SalaryStructureFormOptions["lstSalaryComponents"][number] | undefined, strFallbackValueSource: string) {
  const strRawValueSource = String(dicComponent?.strCalcMethod ?? dicComponent?.strValueSource ?? strFallbackValueSource ?? "Fixed");
  const strToken = normalizeSelectToken(strRawValueSource);
  if (strToken === "percentage" || strToken === "percent") {
    return "Percentage";
  }
  if (strToken === "formula" || strToken === "calculated") {
    return "Formula";
  }
  return "Fixed";
}

function resolveValueSourceOption(
  lstValueSources: Array<{ intID: number; strLabel: string; strCode?: string; strValueCode?: string }>,
  strRawValueSource: string
) {
  const strNormalizedValue = normalizeSelectToken(strRawValueSource);
  const dicMatchedOption = lstValueSources.find((dicOption) =>
    normalizeSelectToken(dicOption.strLabel) === strNormalizedValue
    || normalizeSelectToken(dicOption.strCode ?? "") === strNormalizedValue
    || normalizeSelectToken(dicOption.strValueCode ?? "") === strNormalizedValue
  );
  if (dicMatchedOption) {
    return dicMatchedOption;
  }
  if (strNormalizedValue === "percentage" || strNormalizedValue === "percent") {
    return lstValueSources.find((dicOption) => normalizeSelectToken(dicOption.strLabel) === "percentage") ?? { intID: 0, strLabel: "Percentage" };
  }
  if (strNormalizedValue === "formula" || strNormalizedValue === "calculated") {
    return lstValueSources.find((dicOption) => normalizeSelectToken(dicOption.strLabel) === "formula") ?? { intID: 0, strLabel: "Formula" };
  }
  return lstValueSources.find((dicOption) => normalizeSelectToken(dicOption.strLabel) === "fixed") ?? { intID: 0, strLabel: "Fixed" };
}

function getValueSourceOptionByID(
  lstValueSources: Array<{ intID: number; strLabel: string; strCode?: string; strValueCode?: string }>,
  intValueSourceID: number | "",
  strFallbackValueSource: string
) {
  if (intValueSourceID !== "") {
    const dicMatchedOption = lstValueSources.find((dicOption) => dicOption.intID === intValueSourceID);
    if (dicMatchedOption) {
      return dicMatchedOption;
    }
  }
  return resolveValueSourceOption(lstValueSources, strFallbackValueSource);
}

function getComponentBasisComponentID(dicComponent: SalaryStructureFormOptions["lstSalaryComponents"][number] | undefined) {
  if (dicComponent?.intBasisComponentID) {
    return dicComponent.intBasisComponentID;
  }
  const intDependencyID = dicComponent?.lstDependencyComponentIDs?.find((intComponentID) => Number.isInteger(Number(intComponentID)) && Number(intComponentID) > 0);
  return intDependencyID ? Number(intDependencyID) : "";
}

function getComponentPercentageValue(dicComponent: SalaryStructureFormOptions["lstSalaryComponents"][number] | undefined) {
  return dicComponent?.fltPercentageValue ?? dicComponent?.decPercentageValue ?? null;
}

function isWageComponent(
  dicLine: { intSalaryComponentID?: number | "" | null },
  dicSalaryComponentByID?: Map<number, SalaryStructureFormOptions["lstSalaryComponents"][number]>
) {
  const intSalaryComponentID =
    typeof dicLine.intSalaryComponentID === "number"
      ? dicLine.intSalaryComponentID
      : Number(dicLine.intSalaryComponentID);
  const dicSalaryComponent = Number.isFinite(intSalaryComponentID) && intSalaryComponentID > 0
    ? dicSalaryComponentByID?.get(intSalaryComponentID)
    : undefined;
  return Boolean(dicSalaryComponent?.blnIsWages);
}

function getFlexiComponentIcon(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  if (strToken.includes("meal") || strToken.includes("food")) {
    return <RestaurantRoundedIcon fontSize="small" />;
  }
  if (strToken.includes("fuel") || strToken.includes("petrol")) {
    return <LocalGasStationRoundedIcon fontSize="small" />;
  }
  if (strToken.includes("phone") || strToken.includes("telephone") || strToken.includes("mobile")) {
    return <LocalPhoneRoundedIcon fontSize="small" />;
  }
  if (strToken.includes("lta") || strToken.includes("travel")) {
    return <FlightTakeoffRoundedIcon fontSize="small" />;
  }
  if (strToken.includes("driver")) {
    return <PersonRoundedIcon fontSize="small" />;
  }
  return <RestaurantRoundedIcon fontSize="small" />;
}

function isFlexiBasketLine(dicLine: SalaryStructureLineFormValue) {
  const strRole = normalizeSelectToken(dicLine.strFlexiComponentRole);
  return Boolean(
    dicLine.blnIsFlexiBasketLine
    || strRole === "basket"
    || isFlexiBucketToken(dicLine.strFlexiComponentRole)
    || isFlexiBucketToken(dicLine.strComponentCode)
    || isFlexiBucketToken(dicLine.strComponentName)
  );
}

function getFlexiRoleForComponent(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  const strFlexiType = normalizeSelectToken(String(dicComponent?.strFlexiComponentType ?? ""));
  const strCategory = normalizeSelectToken(String(dicComponent?.strComponentCategory ?? ""));
  const strGroup = normalizeSelectToken(String(dicComponent?.strComponentGroup ?? ""));
  if (
    dicComponent?.blnIsFlexiBasket
    || strFlexiType === "basket"
    || isFlexiBucketToken(String(dicComponent?.strFlexiComponentType ?? ""))
    || isFlexiBucketToken(String(dicComponent?.strComponentCategory ?? ""))
    || isFlexiBucketToken(String(dicComponent?.strComponentGroup ?? ""))
    || isFlexiBucketToken(String(dicComponent?.strCode ?? ""))
    || isFlexiBucketToken(String(dicComponent?.strLabel ?? ""))
  ) {
    return "Flexi Bucket";
  }
  if (dicComponent?.blnIsEmployerContribution || strCategory === "employercontribution" || strGroup === "employercontribution" || strGroup === "contribution") {
    return "Employer Contribution";
  }
  if (dicComponent?.blnIsEmployeeDeduction || strCategory === "deduction" || strGroup === "deduction") {
    return "Deduction";
  }
  if (strCategory === "information" || strGroup === "information") {
    return "Information";
  }
  return "Normal";
}

function getFlexiRoleForLine(dicLine: SalaryStructureLineFormValue, dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  if (isFlexiBasketLine(dicLine)) {
    return "Flexi Bucket";
  }
  return getFlexiRoleForComponent(dicComponent);
}

function isFlexiEntitlementHostLine(dicLine: SalaryStructureLineFormValue, dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return getFlexiRoleForLine(dicLine, dicComponent) === "Flexi Bucket";
}

function getFlexiRoleTokenForComponent(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  const strRole = getFlexiRoleForComponent(dicComponent);
  if (strRole === "Flexi Bucket") {
    return "basket";
  }
  if (dicComponent && isFlexiEligibleComponent(dicComponent)) {
    return "option";
  }
  if (dicComponent?.blnIsResidualComponent || normalizeSelectToken(String(dicComponent?.strFlexiComponentType ?? "")) === "residual") {
    return "residual";
  }
  return "normal";
}

function isFlexiEligibleComponent(dicOption: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  if (dicOption.intFlexiComponentEligibilityID) {
    return dicOption.blnIsActive !== false;
  }
  if (typeof dicOption.blnIsFlexiComponentEligible === "boolean") {
    return dicOption.blnIsFlexiComponentEligible && dicOption.blnIsActive !== false;
  }
  return Boolean(
    dicOption.blnIsActive !== false
    && dicOption.blnIsReimbursement
    && dicOption.blnIsFlexiBenefit
    && getFlexiRoleForComponent(dicOption) === "Normal"
    && normalizeSelectToken(dicOption.strCode ?? "") !== "flexipay"
  );
}

function isReimbursementComponent(dicOption: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return Boolean(
    dicOption.blnIsActive !== false
    && dicOption.blnIsReimbursement
    && getFlexiRoleForComponent(dicOption) === "Normal"
    && normalizeSelectToken(dicOption.strCode ?? "") !== "flexipay"
  );
}

function getEligibilitySummary(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  const strSummary = String(dicComponent?.strEligibilitySummary ?? "").trim();
  return strSummary || "Eligible by default";
}

function getTaxTreatmentLabel(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  if (dicComponent?.strTaxTreatment) {
    return dicComponent.strTaxTreatment;
  }
  if (dicComponent?.blnIsExempt) {
    return "Exempt";
  }
  if (dicComponent?.blnIsPartiallyExempt) {
    return "Partially Exempt";
  }
  if (dicComponent?.blnIsTaxable) {
    return "Taxable";
  }
  return "";
}

function getSettlementMode(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return dicComponent?.strReimbursementSettlementMode ?? dicComponent?.strSettlementMethod ?? "";
}

function getComponentMonthlyLimit(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return dicComponent?.decReimbursementMaxClaimMonthlyLimit
    ?? dicComponent?.decMonthlyLimit
    ?? dicComponent?.decFlexiMaxMonthlyAmount
    ?? dicComponent?.decMonthlyLimitAmount
    ?? null;
}

function getComponentAnnualLimit(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return dicComponent?.decReimbursementMaxClaimYearlyLimit
    ?? dicComponent?.decAnnualLimit
    ?? dicComponent?.decFlexiMaxYearlyAmount
    ?? dicComponent?.decAnnualLimitAmount
    ?? null;
}

function clampAmountToLimit(strValue: string | number | boolean, fltLimit: number | null) {
  const strAmount = String(strValue ?? "").trim();
  if (!strAmount) {
    return "";
  }
  const fltAmount = parseCommaAmount(strAmount);
  if (!Number.isFinite(fltAmount)) {
    return strAmount;
  }
  if (fltLimit != null && fltAmount > fltLimit) {
    return Number(fltLimit.toFixed(2)).toString();
  }
  return strAmount;
}

function sanitizeFormulaVariable(strCode: string) {
  return strCode.trim().replace(/[^A-Za-z0-9_]/g, "_");
}

function normalizeFormulaExpressionInput(strValue: string) {
  return strValue.toUpperCase();
}

export default function SalaryStructureEditorPage({
  strMode,
  intSalaryStructureID
}: SalaryStructureEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useSalaryStructureLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstSalaryStructureModuleCodes);
  const [objFormOptions, setObjFormOptions] = useState<SalaryStructureFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<SalaryStructureFormValues>(createInitialSalaryStructureForm());
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  const [strSuccess, setStrSuccess] = useState("");
  const [dicTextTranslationLoading, setDicTextTranslationLoading] = useState<Record<string, boolean>>({});
  const [dicLastTranslatedSourceByRow, setDicLastTranslatedSourceByRow] = useState<Record<string, string>>({});
  const [strAddModeFlexiHostRowID, setStrAddModeFlexiHostRowID] = useState("");

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnReadOnly = strMode === "edit" && blnCanView && !blnCanEdit;
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = strMode === "add" ? blnCanAdd : blnCanEdit;
  const blnFieldDisabled = blnSaving || blnReadOnly || !blnCanSave;
  const strPageHeading = strMode === "add"
    ? t("add_salary_structure", "Add Salary Structure")
    : t("edit_salary_structure", "Edit Salary Structure");

  useEffect(() => {
    let blnMounted = true;

    async function loadData() {
      if (blnRightsLoading) {
        return;
      }
      if (!blnCanLoadWorkspace) {
        if (blnMounted) {
          setBlnLoading(false);
        }
        return;
      }
      setBlnLoading(true);
      setStrError("");
      try {
        const objOptionsPromise = salaryStructureService.getFormOptions();
        const dicDetailPromise = strMode === "edit" && intSalaryStructureID
          ? salaryStructureService.getSalaryStructureById(intSalaryStructureID)
          : Promise.resolve(null);
        const [objOptions, dicDetail] = await Promise.all([objOptionsPromise, dicDetailPromise]);
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);

        if (dicDetail) {
          setDicForm(applyFlexiEligibilityToForm(toSalaryStructureFormValues(dicDetail), objOptions));
        } else {
          const intEnglishID = objOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "en")?.intID ?? objOptions.lstLanguages[0]?.intID ?? "";
          setDicForm((dicPrevious) => ({
            ...dicPrevious,
            lstTexts: dicPrevious.lstTexts.map((dicText, intIndex) => intIndex === 0
              ? {
                ...dicText,
                intLanguageID: intEnglishID,
                strLanguageName: objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intEnglishID)?.strLabel ?? ""
              }
              : dicText)
          }));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load salary structure workspace.");
        }
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadData().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [blnCanLoadWorkspace, blnRightsLoading, intSalaryStructureID, strMode]);

  const dicComponentByID = useMemo(() => {
    return new Map((objFormOptions?.lstSalaryComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);
  const lstFormulaVariableCodes = useMemo(() => {
    const setCodes = new Set<string>();
    dicForm.lstComponents.forEach((dicLine) => {
      const intSalaryComponentID = Number(dicLine.intSalaryComponentID);
      if (!Number.isFinite(intSalaryComponentID) || intSalaryComponentID <= 0) {
        return;
      }
      const dicComponent = dicComponentByID.get(intSalaryComponentID);
      const strCode = String(dicLine.strComponentCode || dicComponent?.strCode || "").trim();
      if (strCode) {
        setCodes.add(strCode);
      }
    });
    setCodes.add("DEEMED_WAGE_BASE");
    return Array.from(setCodes).sort((strLeft, strRight) => strLeft.localeCompare(strRight));
  }, [dicComponentByID, dicForm.lstComponents]);
  const lstValueSourceOptions = objFormOptions?.lstValueSourceLookups ?? [];
  const lstSortedComponentLines = useMemo(() => {
    return [...dicForm.lstComponents].sort(compareLineOrder);
  }, [dicForm.lstComponents]);
  const lstFlexiEligibleComponents = useMemo(() => {
    return (objFormOptions?.lstSalaryComponents ?? []).filter(isFlexiEligibleComponent);
  }, [objFormOptions]);
  const strFlexiEligibleComponentSignature = useMemo(() => {
    return lstFlexiEligibleComponents.map((dicComponent) => dicComponent.intID).join("|");
  }, [lstFlexiEligibleComponents]);
  const lstFlexiBasketLines = useMemo(() => {
    const lstDetectedFlexiLines = dicForm.lstComponents.filter((dicLine) => {
      const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
      return isFlexiEntitlementHostLine(dicLine, dicComponent);
    });
    if (strMode !== "add" || !strAddModeFlexiHostRowID || lstDetectedFlexiLines.some((dicLine) => dicLine.strRowID === strAddModeFlexiHostRowID)) {
      return lstDetectedFlexiLines;
    }
    const dicPendingFlexiLine = dicForm.lstComponents.find((dicLine) => dicLine.strRowID === strAddModeFlexiHostRowID);
    return dicPendingFlexiLine ? [...lstDetectedFlexiLines, dicPendingFlexiLine] : lstDetectedFlexiLines;
  }, [dicComponentByID, dicForm.lstComponents, strAddModeFlexiHostRowID, strMode]);
  const strFlexiBasketLineSignature = useMemo(() => {
    return lstFlexiBasketLines.map((dicLine) => dicLine.strRowID).join("|");
  }, [lstFlexiBasketLines]);
  const dicStructureSummary = useMemo(() => {
    function getSummaryComponentName(
      dicLine: SalaryStructureLineFormValue,
      dicComponent: SalaryStructureFormOptions["lstSalaryComponents"][number] | undefined,
    ) {
      return dicLine.strComponentName.trim()
        || dicComponent?.strLabel?.trim()
        || dicLine.strComponentCode.trim()
        || dicComponent?.strCode?.trim()
        || t("salary_component", "Salary Component");
    }

    const dicTotals = dicForm.lstComponents.reduce(
      (dicTotals, dicLine) => {
        if (dicLine.intSalaryComponentID === "") {
          return dicTotals;
        }
        const blnIsActiveLine = dicLine.blnIsActive !== false;
        const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
        const fltMonthlyAmount = parseLineAmount(dicLine.fltFixedAmount) ?? 0;
        const fltYearlyAmount = fltMonthlyAmount * 12;
        const blnIncludedInCtc = Boolean(dicComponent?.blnIncludedInCtc ?? dicLine.blnIncludedInCtc);
        const blnIsFlexiBasket = Boolean(isFlexiBasketLine(dicLine) || dicComponent?.blnIsFlexiBasket || normalizeSelectToken(String(dicComponent?.strCode ?? "")) === "flexipay");
        const strRole = getFlexiRoleForLine(dicLine, dicComponent);
        const strGroup = normalizeSelectToken(String(dicComponent?.strComponentGroup ?? ""));
        const strCategory = normalizeSelectToken(String(dicComponent?.strComponentCategory ?? ""));
        const blnIsEmployerContribution = Boolean(dicComponent?.blnIsEmployerContribution);
        const blnIsEmployeeDeduction = Boolean(dicComponent?.blnIsEmployeeDeduction);
        const strFlexiType = normalizeSelectToken(String(dicComponent?.strFlexiComponentType ?? ""));
        const blnIsEarning = strCategory === "earning";
        const blnIsFixedPayEarning = strCategory === "earning" && strGroup === "fixedpay";
        const blnIsDeductionLike = strRole === "Deduction"
          || blnIsEmployeeDeduction
          || strCategory === "deduction"
          || strCategory === "employeecontribution"
          || strCategory === "recovery"
          || strCategory === "pt"
          || strCategory === "tds"
          || strGroup === "deduction"
          || strGroup === "employeecontribution"
          || strGroup === "recovery"
          || strGroup === "pt"
          || strGroup === "tds";
        const blnIsEmployerContributionLike = strRole === "Employer Contribution"
          || blnIsEmployerContribution
          || strCategory === "contribution"
          || strCategory === "employercontribution"
          || strGroup === "contribution"
          || strGroup === "employercontribution";
        const blnIsInformationLike = strRole === "Information" || strCategory === "information" || strGroup === "information";
        const blnIsPayableGrossComponent = blnIsActiveLine && (
          blnIsFlexiBasket
          || (blnIsEarning && !blnIsDeductionLike && !blnIsEmployerContributionLike && !blnIsInformationLike)
        );
        const dicSummaryComponent = {
          strName: getSummaryComponentName(dicLine, dicComponent),
          fltAnnualAmount: fltYearlyAmount,
        };

        if (blnIsActiveLine && blnIncludedInCtc && (blnIsFlexiBasket || blnIsEmployerContributionLike || (blnIsEarning && !blnIsDeductionLike && !blnIsInformationLike))) {
          dicTotals.fltTotalCtc += fltYearlyAmount;
          dicTotals.lstCtcComponents.push(dicSummaryComponent);
        }
        if (blnIsActiveLine && (blnIsFlexiBasket || strFlexiType === "basket")) {
          dicTotals.fltFlexiBasket += fltYearlyAmount;
          dicTotals.lstFlexiBasketComponents.push(dicSummaryComponent);
        } else if (blnIsActiveLine && blnIsEmployerContributionLike) {
          dicTotals.fltEmployerContribution += fltYearlyAmount;
          dicTotals.lstEmployerContributionComponents.push(dicSummaryComponent);
        } else if (blnIsActiveLine && strGroup === "variablepay" && blnIsEarning) {
          dicTotals.fltVariablePay += fltYearlyAmount;
          dicTotals.lstVariablePayComponents.push(dicSummaryComponent);
        } else if (blnIsActiveLine && blnIsFixedPayEarning) {
          dicTotals.fltFixedPay += fltYearlyAmount;
        }
        if (blnIsPayableGrossComponent) {
          dicTotals.fltGrossAnnual += fltYearlyAmount;
          dicTotals.lstGrossComponents.push(dicSummaryComponent);
        }
        return dicTotals;
      },
      {
        fltTotalCtc: 0,
        fltGrossAnnual: 0,
        fltFixedPay: 0,
        fltVariablePay: 0,
        fltFlexiBasket: 0,
        fltEmployerContribution: 0,
        lstCtcComponents: [] as Array<{ strName: string; fltAnnualAmount: number }>,
        lstGrossComponents: [] as Array<{ strName: string; fltAnnualAmount: number }>,
        lstVariablePayComponents: [] as Array<{ strName: string; fltAnnualAmount: number }>,
        lstEmployerContributionComponents: [] as Array<{ strName: string; fltAnnualAmount: number }>,
        lstFlexiBasketComponents: [] as Array<{ strName: string; fltAnnualAmount: number }>,
      }
    );
    const fltGrossAnnual = dicTotals.fltGrossAnnual;
    return {
      fltTotalCtc: dicTotals.fltTotalCtc,
      fltGrossAnnual,
      fltGrossMonthly: fltGrossAnnual / 12,
      fltFixedPay: dicTotals.fltFixedPay,
      fltVariablePay: dicTotals.fltVariablePay,
      fltFlexiBasket: dicTotals.fltFlexiBasket,
      fltEmployerContribution: dicTotals.fltEmployerContribution,
      lstCtcComponents: dicTotals.lstCtcComponents,
      lstGrossComponents: dicTotals.lstGrossComponents,
      lstVariablePayComponents: dicTotals.lstVariablePayComponents,
      lstEmployerContributionComponents: dicTotals.lstEmployerContributionComponents,
      lstFlexiBasketComponents: dicTotals.lstFlexiBasketComponents,
    };
  }, [dicComponentByID, dicForm.lstComponents, t]);
  const dicFlexiSummary = useMemo(() => {
    const dicBucketLine = lstFlexiBasketLines[0];
    const fltBucketAnnual = dicBucketLine ? (parseLineAmount(dicBucketLine.fltFixedAmount) ?? 0) * 12 : 0;
    const fltDefaultAllocatedAnnual = (dicBucketLine?.lstFlexiMappings ?? []).reduce((fltTotal, dicMapping) => {
      if (!dicMapping.blnIsActive) {
        return fltTotal;
      }
      return fltTotal + ((parseLineAmount(dicMapping.fltDefaultAmount) ?? 0) * 12);
    }, 0);
    const fltEntitlementAnnual = dicForm.lstComponents.flatMap((dicLine) => dicLine.lstFlexiMappings).reduce((fltTotal, dicMapping) => {
      if (!dicMapping.blnIsActive || dicMapping.intFlexiComponentID === "") {
        return fltTotal;
      }
      const fltAnnualEntitlement = parseLineAmount(dicMapping.fltMaxAmount) ?? 0;
      return fltAnnualEntitlement > 0 ? fltTotal + fltAnnualEntitlement : fltTotal;
    }, 0);
    const dicBucketComponent = dicComponentByID.get(Number(dicBucketLine?.intSalaryComponentID));
    const dicResidualComponent = dicComponentByID.get(Number(dicBucketComponent?.intResidualComponentID));
    const lstEntitlementComponents = dicForm.lstComponents.flatMap((dicLine) => dicLine.lstFlexiMappings)
      .filter((dicMapping) => dicMapping.blnIsActive && dicMapping.intFlexiComponentID !== "")
      .map((dicMapping) => ({
        strName: dicMapping.strFlexiComponentName.trim() || dicMapping.strFlexiComponentCode.trim() || t("flexi_component", "Flexi Component"),
        fltAnnualAmount: Math.max(parseLineAmount(dicMapping.fltMaxAmount) ?? 0, 0),
      }))
      .filter((dicComponent) => dicComponent.fltAnnualAmount > 0);
    return {
      fltDefaultAllocatedAnnual,
      fltDefaultBalanceAnnual: Math.max(0, fltBucketAnnual - fltDefaultAllocatedAnnual),
      fltEntitlementAnnual,
      fltResidualTaxableProjection: Math.max(0, fltBucketAnnual - fltEntitlementAnnual),
      strResidualComponentName: dicResidualComponent?.strLabel ?? "",
      lstEntitlementComponents,
    };
  }, [dicComponentByID, dicForm.lstComponents, lstFlexiBasketLines, t]);
  const lstCompensationWarnings = useMemo(() => {
    const lstWarnings: Array<{ strSeverity: "error" | "warning" | "info"; strMessage: string }> = [];
    const blnHasActiveFlexiOption = dicForm.lstComponents.some((dicLine) =>
      dicLine.lstFlexiMappings.some((dicMapping) => dicMapping.blnIsActive && dicMapping.intFlexiComponentID !== "")
    );
    const blnHasZeroEntitlementFlexi = dicForm.lstComponents.some((dicLine) =>
      dicLine.lstFlexiMappings.some((dicMapping) =>
        dicMapping.blnIsActive
        && dicMapping.intFlexiComponentID !== ""
        && (parseLineAmount(dicMapping.fltMaxAmount) ?? 0) <= 0
      )
    );
    if (dicFlexiSummary.fltEntitlementAnnual > dicStructureSummary.fltFlexiBasket) {
      lstWarnings.push({ strSeverity: "error", strMessage: t("flexi_entitlement_total_exceeds_basket", "Flexi Entitlement Total cannot exceed Flexi Basket Amount.") });
    }
    if (lstFlexiBasketLines.length > 0 && !blnHasActiveFlexiOption) {
      lstWarnings.push({ strSeverity: "warning", strMessage: t("flexi_bucket_without_options", "Flexi Bucket exists but no active Flexi components are configured.") });
    }
    if (blnHasActiveFlexiOption && lstFlexiBasketLines.length === 0) {
      lstWarnings.push({ strSeverity: "error", strMessage: t("flexi_options_without_bucket", "Flexi components cannot be added unless the structure has an active Flexi Bucket line.") });
    }
    if (dicStructureSummary.fltTotalCtc <= 0) {
      lstWarnings.push({ strSeverity: "warning", strMessage: t("annual_ctc_zero_warning", "Annual CTC is zero.") });
    }
    if (blnHasZeroEntitlementFlexi) {
      lstWarnings.push({ strSeverity: "warning", strMessage: t("flexi_zero_entitlement_warning", "Active Flexi components with zero Annual Entitlement should be deactivated or assigned a value greater than 0.") });
    }
    return lstWarnings;
  }, [dicFlexiSummary.fltEntitlementAnnual, dicForm.lstComponents, dicStructureSummary.fltFlexiBasket, dicStructureSummary.fltTotalCtc, lstFlexiBasketLines.length, t]);
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions?.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();

  function buildFixedLanguageRow(
    intLanguageID: number,
    strStructureName: string,
    strStructureDescription: string,
    lstExistingTexts: SalaryStructureTextFormValue[],
  ) {
    const dicExistingText = lstExistingTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intLanguageID
    ) ?? createEmptyTextRow();
    const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === intLanguageID);
    return {
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText.strLanguageName ?? "",
      strStructureName,
      strStructureDescription,
    };
  }

  function ensureUniqueTextRowIDs(lstTexts: SalaryStructureTextFormValue[]) {
    const setUsedRowIDs = new Set<string>();
    return lstTexts.map((dicText) => {
      const strCandidateRowID = dicText.strRowID?.trim() || createEmptyTextRow().strRowID;
      if (!setUsedRowIDs.has(strCandidateRowID)) {
        setUsedRowIDs.add(strCandidateRowID);
        return dicText;
      }
      const strNewRowID = createEmptyTextRow().strRowID;
      setUsedRowIDs.add(strNewRowID);
      return {
        ...dicText,
        strRowID: strNewRowID,
      };
    });
  }

  function ensureTenantLanguageRows(dicValues: SalaryStructureFormValues) {
    const dicDefaultExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID
    );
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.strStructureName,
      dicDefaultExistingText?.strStructureDescription ?? dicValues.lstTexts[0]?.strStructureDescription ?? "",
      dicValues.lstTexts,
    );
    if (!intSecondaryLanguageID || intSecondaryLanguageID === intDefaultLanguageID) {
      return {
        ...dicValues,
        lstTexts: ensureUniqueTextRowIDs([dicDefaultRow]),
      };
    }
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strStructureName ?? "",
      dicSecondaryExistingText?.strStructureDescription ?? "",
      dicValues.lstTexts,
    );
    return {
      ...dicValues,
      lstTexts: ensureUniqueTextRowIDs([dicDefaultRow, dicSecondaryRow]),
    };
  }

  function syncDefaultStructureText(strStructureName: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows({
        ...dicPrevious,
        strStructureName,
      });
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? {
            ...dicText,
            strStructureName,
          }
          : dicText),
      };
    });
  }

  function updateRootField<TKey extends keyof SalaryStructureFormValues>(strField: TKey, objValue: SalaryStructureFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateTextRow(strRowID: string, strField: keyof SalaryStructureTextFormValue, objValue: string | number) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.map((dicText) => {
        if (dicText.strRowID !== strRowID) {
          return dicText;
        }
        if (strField === "intLanguageID") {
          const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === Number(objValue));
          return {
            ...dicText,
            intLanguageID: Number(objValue),
            strLanguageName: dicLanguage?.strLabel ?? ""
          };
        }
        return { ...dicText, [strField]: objValue };
      })
    }));
  }

  function formatCalculatedLineAmount(fltValue: number) {
    if (!Number.isFinite(fltValue)) {
      return "";
    }
    return formatNormalizedAmount(fltValue, 2);
  }

  function parseLineAmount(objValue: string | number | boolean | "") {
    const strValue = String(objValue ?? "").trim();
    if (!strValue) {
      return null;
    }
    const fltValue = parseCommaAmount(strValue);
    return Number.isFinite(fltValue) ? fltValue : null;
  }

  function evaluateFormulaExpression(strExpression: string, dicVariables: Record<string, number>) {
    const lstTokens = strExpression.match(/[A-Za-z_][A-Za-z0-9_]*|(?:\d+(?:\.\d+)?|\.\d+)|[()+\-*/,]/g) ?? [];
    let intIndex = 0;

    function peekToken() {
      return lstTokens[intIndex] ?? "";
    }

    function consumeToken(strExpected?: string) {
      const strToken = lstTokens[intIndex] ?? "";
      if (strExpected && strToken !== strExpected) {
        throw new Error("Unexpected token.");
      }
      intIndex += 1;
      return strToken;
    }

    function parseExpression(): number {
      let fltValue = parseTerm();
      while (peekToken() === "+" || peekToken() === "-") {
        const strOperator = consumeToken();
        const fltRight = parseTerm();
        fltValue = strOperator === "+" ? fltValue + fltRight : fltValue - fltRight;
      }
      return fltValue;
    }

    function parseTerm(): number {
      let fltValue = parseFactor();
      while (peekToken() === "*" || peekToken() === "/") {
        const strOperator = consumeToken();
        const fltRight = parseFactor();
        fltValue = strOperator === "*"
          ? fltValue * fltRight
          : (fltRight !== 0 ? fltValue / fltRight : 0);
      }
      return fltValue;
    }

    function parseFunction(strFunctionName: string) {
      consumeToken("(");
      const lstArgs: number[] = [];
      if (peekToken() !== ")") {
        lstArgs.push(parseExpression());
        while (peekToken() === ",") {
          consumeToken(",");
          lstArgs.push(parseExpression());
        }
      }
      consumeToken(")");
      if (strFunctionName === "min") {
        return Math.min(...lstArgs);
      }
      if (strFunctionName === "max") {
        return Math.max(...lstArgs);
      }
      if (strFunctionName === "round") {
        return Number((lstArgs[0] ?? 0).toFixed(Math.trunc(lstArgs[1] ?? 0)));
      }
      throw new Error("Unsupported function.");
    }

    function parseFactor(): number {
      const strToken = peekToken();
      if (strToken === "+") {
        consumeToken("+");
        return parseFactor();
      }
      if (strToken === "-") {
        consumeToken("-");
        return -parseFactor();
      }
      if (strToken === "(") {
        consumeToken("(");
        const fltValue = parseExpression();
        consumeToken(")");
        return fltValue;
      }
      if (/^(?:\d|\.\d)/.test(strToken)) {
        consumeToken();
        return Number(strToken);
      }
      if (/^[A-Za-z_]/.test(strToken)) {
        const strName = consumeToken();
        if (peekToken() === "(") {
          return parseFunction(strName.toLowerCase());
        }
        if (typeof dicVariables[strName] === "undefined") {
          throw new Error("Unknown variable.");
        }
        return dicVariables[strName];
      }
      throw new Error("Unexpected formula expression.");
    }

    try {
      const fltValue = parseExpression();
      return intIndex === lstTokens.length && Number.isFinite(fltValue) ? fltValue : null;
    } catch {
      return null;
    }
  }

  function recalculateDerivedLineAmounts(lstComponents: SalaryStructureLineFormValue[]) {
    const dicComputedMonthlyByComponentID = new Map<number, number>();
    const dicFormulaVariables: Record<string, number> = {};
    const dicFormulaAggregates = {
      wageMonthly: 0,
      nonWageMonthly: 0,
      ctcAnnual: 0,
      grossAnnual: 0,
    };

    function setFormulaVariable(strName: string, fltValue: number) {
      dicFormulaVariables[strName] = fltValue;
      dicFormulaVariables[strName.toLowerCase()] = fltValue;
    }

    function updateStatutoryFormulaVariables() {
      const decMinimumRequiredMonthly = dicFormulaAggregates.ctcAnnual > 0
        ? (dicFormulaAggregates.ctcAnnual * 0.5) / 12
        : 0;
      const decShortfallMonthly = Math.max(decMinimumRequiredMonthly - dicFormulaAggregates.wageMonthly, 0);
      setFormulaVariable("WAGE_TOTAL", Number(dicFormulaAggregates.wageMonthly.toFixed(2)));
      setFormulaVariable("NON_WAGE_TOTAL", Number(dicFormulaAggregates.nonWageMonthly.toFixed(2)));
      setFormulaVariable("MINIMUM_REQUIRED_WAGE", Number(decMinimumRequiredMonthly.toFixed(2)));
      setFormulaVariable("DEEMED_WAGE", Number((dicFormulaAggregates.wageMonthly + decShortfallMonthly).toFixed(2)));
      setFormulaVariable("DEEMED_WAGE_BASE", Number((dicFormulaAggregates.wageMonthly + decShortfallMonthly).toFixed(2)));
      setFormulaVariable("DEEMED_WAGE_SHORTFALL", Number(decShortfallMonthly.toFixed(2)));
      setFormulaVariable("CTC_ANNUAL", Number(dicFormulaAggregates.ctcAnnual.toFixed(2)));
      setFormulaVariable("GROSS_ANNUAL", Number(dicFormulaAggregates.grossAnnual.toFixed(2)));
    }

    updateStatutoryFormulaVariables();
    return [...lstComponents]
      .sort((dicLeft, dicRight) =>
        Number(dicLeft.intLineOrder || 0) - Number(dicRight.intLineOrder || 0)
        || Number(dicLeft.intSalaryComponentID || 0) - Number(dicRight.intSalaryComponentID || 0)
      )
      .reduce((lstCalculated, dicLine) => {
        let fltCalculatedAmount = parseLineAmount(dicLine.fltFixedAmount);
        const strValueSource = normalizeSelectToken(dicLine.strValueSource);

        if (strValueSource === "percentage") {
          const fltPercentage = parseLineAmount(dicLine.fltPercentageValue);
          const fltBasisAmount = dicComputedMonthlyByComponentID.get(Number(dicLine.intBasisComponentID));
          fltCalculatedAmount = fltPercentage !== null && fltBasisAmount !== undefined
            ? (fltBasisAmount * fltPercentage) / 100
            : null;
        } else if (strValueSource === "formula") {
          fltCalculatedAmount = dicLine.strFormulaExpression.trim()
            ? evaluateFormulaExpression(dicLine.strFormulaExpression, dicFormulaVariables)
            : null;
        }

        const dicCalculatedLine = strValueSource === "percentage" || strValueSource === "formula"
          ? { ...dicLine, fltFixedAmount: fltCalculatedAmount !== null ? formatCalculatedLineAmount(fltCalculatedAmount) : "" }
          : dicLine;
        const fltResolvedAmount = parseLineAmount(dicCalculatedLine.fltFixedAmount);
        const dicComponent = dicComponentByID.get(Number(dicCalculatedLine.intSalaryComponentID));
        if (dicCalculatedLine.intSalaryComponentID !== "" && fltResolvedAmount !== null) {
          const intSalaryComponentID = Number(dicCalculatedLine.intSalaryComponentID);
          dicComputedMonthlyByComponentID.set(intSalaryComponentID, fltResolvedAmount);
          const strRawCode = dicCalculatedLine.strComponentCode.trim();
          const strSanitizedCode = sanitizeFormulaVariable(strRawCode);
          if (strRawCode) {
            dicFormulaVariables[strRawCode] = fltResolvedAmount;
            dicFormulaVariables[strRawCode.toLowerCase()] = fltResolvedAmount;
          }
          if (strSanitizedCode) {
            dicFormulaVariables[strSanitizedCode] = fltResolvedAmount;
            dicFormulaVariables[strSanitizedCode.toLowerCase()] = fltResolvedAmount;
          }
          if (dicComponent?.blnIncludedInCtc !== false) {
            dicFormulaAggregates.ctcAnnual += fltResolvedAmount * 12;
            if (isWageComponent({ intSalaryComponentID }, dicComponentByID)) {
              dicFormulaAggregates.wageMonthly += fltResolvedAmount;
            } else {
              dicFormulaAggregates.nonWageMonthly += fltResolvedAmount;
            }
          }
          if (
            dicComponent
            && !dicComponent.blnIsEmployerContribution
            && normalizeSelectToken(dicComponent.strComponentCategory ?? "") !== "deduction"
            && normalizeSelectToken(dicComponent.strComponentCategory ?? "") !== "information"
          ) {
            dicFormulaAggregates.grossAnnual += fltResolvedAmount * 12;
          }
          updateStatutoryFormulaVariables();
        }
        return lstCalculated.map((dicExistingLine) =>
          dicExistingLine.strRowID === dicCalculatedLine.strRowID ? dicCalculatedLine : dicExistingLine
        );
      }, lstComponents);
  }

  function recalculateSalaryStructureForm(dicValues: SalaryStructureFormValues) {
    return {
      ...dicValues,
      lstComponents: recalculateDerivedLineAmounts(dicValues.lstComponents)
    };
  }

  function applyFlexiEligibilityToForm(dicValues: SalaryStructureFormValues, dicOptions: SalaryStructureFormOptions | null) {
    const dicFlexiComponentByID = new Map((dicOptions?.lstSalaryComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
    return {
      ...dicValues,
      lstComponents: dicValues.lstComponents.map((dicLine) => ({
        ...dicLine,
        lstFlexiMappings: dicLine.lstFlexiMappings.map((dicMapping) => {
          if (dicMapping.intFlexiComponentID === "") {
            return dicMapping;
          }
          const dicComponent = dicFlexiComponentByID.get(Number(dicMapping.intFlexiComponentID));
          if (!dicComponent || !isFlexiEligibleComponent(dicComponent)) {
            return {
              ...dicMapping,
              intFlexiComponentEligibilityID: null,
              blnIsActive: false,
            };
          }
          return {
            ...dicMapping,
            intFlexiComponentEligibilityID: dicComponent.intFlexiComponentEligibilityID ?? null,
            // blnIsActive: isFlexiComponentEligibilityActive(dicComponent),
          };
        }),
      })),
    };
  }

  function getAutofilledFlexiYearlyAmount(strMonthlyAmount: string | number | boolean, fltAnnualLimit: number | null) {
    const fltMonthlyAmount = parseLineAmount(strMonthlyAmount);
    if (fltMonthlyAmount === null) {
      return "";
    }
    const fltYearlyAmount = fltMonthlyAmount * 12;
    return clampAmountToLimit(formatCalculatedLineAmount(fltYearlyAmount), fltAnnualLimit);
  }

  function getMonthlyAmountFromAnnual(strAnnualAmount: string | number | boolean) {
    const fltAnnualAmount = parseLineAmount(strAnnualAmount);
    if (fltAnnualAmount === null) {
      return "";
    }
    return formatNormalizedAmount(fltAnnualAmount / 12, 6);
  }

  function getAnnualAmountFromMonthly(strMonthlyAmount: string | number | boolean) {
    const fltMonthlyAmount = parseLineAmount(strMonthlyAmount);
    if (fltMonthlyAmount === null) {
      return "";
    }
    return formatCalculatedLineAmount(fltMonthlyAmount * 12);
  }

  function updateLineRow(strRowID: string, strField: keyof SalaryStructureLineFormValue, objValue: string | number | boolean) {
    const dicSelectedComponent = strField === "intSalaryComponentID" ? dicComponentByID.get(Number(objValue)) : undefined;
    if (strMode === "add" && strField === "intSalaryComponentID") {
      setStrAddModeFlexiHostRowID(getFlexiRoleForComponent(dicSelectedComponent) === "Flexi Bucket" ? strRowID : "");
    }
    setDicForm((dicPrevious) => {
      const lstUpdatedComponents: SalaryStructureLineFormValue[] = dicPrevious.lstComponents.map((dicLine) => {
        if (dicLine.strRowID !== strRowID) {
          return dicLine;
        }
        if (strField === "intSalaryComponentID") {
          const dicComponent = dicSelectedComponent;
          const blnIsFlexiBasket = getFlexiRoleForComponent(dicComponent) === "Flexi Bucket";
          const dicValueSourceOption = resolveValueSourceOption(
            lstValueSourceOptions,
            getComponentValueSource(dicComponent, dicLine.strValueSource)
          );
          const strValueSource = dicValueSourceOption.strLabel;
          const objBasisComponentID = getComponentBasisComponentID(dicComponent);
          const fltComponentPercentageValue = getComponentPercentageValue(dicComponent);
          const setMappedComponentIDs = new Set(
            dicLine.lstFlexiMappings
              .map((dicMapping) => Number(dicMapping.intFlexiComponentID))
              .filter((intComponentID) => Number.isFinite(intComponentID) && intComponentID > 0)
          );
          const lstMissingFlexiMappings = blnIsFlexiBasket
            ? lstFlexiEligibleComponents
              .filter((dicFlexiComponent) => !setMappedComponentIDs.has(dicFlexiComponent.intID))
              .map((dicFlexiComponent) => ({
                ...createEmptyFlexiMappingRow(),
                intFlexiComponentID: dicFlexiComponent.intID,
                strFlexiComponentCode: dicFlexiComponent.strCode ?? "",
                strFlexiComponentName: dicFlexiComponent.strLabel,
                fltDefaultAmount: "0",
                fltMaxAmount: "0",
                blnIsActive: true,
              }))
            : [];
          return {
            ...dicLine,
            intSalaryComponentID: Number(objValue),
            strComponentCode: dicComponent?.strCode ?? "",
            strComponentName: dicComponent?.strLabel ?? "",
            strCalcMethod: dicComponent?.strCalcMethod ?? "",
            strTaxTreatment: dicComponent?.strTaxTreatment ?? "",
            strWageType: dicComponent?.strWageType
              ?? (dicComponent?.blnIsWages ? "Wages" : "Non Wages"),
            strRoundingRule: dicComponent?.strRoundingRule ?? "",
            strPayslipSection: dicComponent?.strPayslipSection ?? "",
            strPayslipSectionSnapshotCode: dicComponent?.strPayslipSection ?? "",
            intLwpTreatmentSnapshotID: dicComponent?.intLwpTreatmentID ?? "",
            strLwpTreatmentSnapshotCode: dicComponent?.strLwpTreatmentCode ?? "",
            strLwpTreatment: dicComponent?.strLwpTreatment ?? dicComponent?.strLwpTreatmentCode ?? "",
            intLwpReducedAmountHandlingSnapshotID: dicComponent?.intLwpReducedAmountHandlingID ?? "",
            strLwpReducedAmountHandlingSnapshotCode: dicComponent?.strLwpReducedAmountHandlingCode ?? "",
            strLwpReducedAmountHandling: dicComponent?.strLwpReducedAmountHandling ?? dicComponent?.strLwpReducedAmountHandlingCode ?? "",
            strLwpProrationFormulaSnapshot: dicComponent?.strLwpProrationFormula ?? "",
            intComponentCategorySnapshotID: dicComponent?.intComponentCategoryID ?? "",
            intCtcTreatmentSnapshotID: dicComponent?.intCtcTreatmentID ?? "",
            intTaxTreatmentSnapshotID: dicComponent?.intTaxTreatmentID ?? "",
            intPayslipSectionSnapshotID: dicComponent?.intPayslipSectionID ?? "",
            intReimbursementTypeSnapshotID: dicComponent?.intReimbursementTypeID ?? "",
            intSettlementModeSnapshotID: dicComponent?.intSettlementModeID ?? "",
            blnIsFlexiBasketLine: blnIsFlexiBasket,
            strFlexiComponentRole: getFlexiRoleTokenForComponent(dicComponent),
            blnIncludedInCtc: Boolean(dicComponent?.blnIncludedInCtc ?? true),
            strComponentCategory: dicComponent?.strComponentCategory ?? "",
            intValueSourceID: dicValueSourceOption.intID || dicComponent?.intValueSourceID || "",
            strValueSource,
            strFormulaExpression: normalizeSelectToken(strValueSource) === "formula"
              ? (dicComponent?.strFormulaExpression ?? "")
              : "",
            fltFixedAmount: normalizeSelectToken(strValueSource) === "fixed" ? dicLine.fltFixedAmount : "",
            fltFormulaAmount: normalizeSelectToken(strValueSource) === "formula" ? dicLine.fltFormulaAmount : "",
            fltPercentageAmount: normalizeSelectToken(strValueSource) === "percentage" ? dicLine.fltPercentageAmount : "",
            intBasisComponentID: normalizeSelectToken(strValueSource) === "percentage" ? (objBasisComponentID || dicLine.intBasisComponentID) : "",
            fltPercentageValue: normalizeSelectToken(strValueSource) === "percentage" ? (fltComponentPercentageValue?.toString() ?? dicLine.fltPercentageValue) : "",
            fltMinAmount: dicComponent?.fltMinAmount?.toString() ?? dicLine.fltMinAmount,
            fltMaxAmount: dicComponent?.fltMaxAmount?.toString() ?? dicLine.fltMaxAmount,
            blnIsMandatory: dicComponent?.blnIsMandatory ?? dicLine.blnIsMandatory,
            blnIsActive: dicLine.blnIsActive ?? true,
            intLineOrder: normalizeLineOrder(
              dicComponent?.intDefaultLineOrder ?? dicComponent?.intDisplayOrder ?? dicLine.intLineOrder,
              dicLine.intLineOrder || 10
            ),
            lstFlexiMappings: blnIsFlexiBasket ? [...dicLine.lstFlexiMappings, ...lstMissingFlexiMappings] : []
          };
        }
        if (strField === "strValueSource") {
          const dicSelectedValueSource = getValueSourceOptionByID(lstValueSourceOptions, Number(objValue), String(objValue));
          const strNormalizedValueSource = normalizeSelectToken(dicSelectedValueSource.strLabel);
          if (strNormalizedValueSource === "fixed") {
            return {
              ...dicLine,
              intValueSourceID: Number(objValue),
              strValueSource: dicSelectedValueSource.strLabel,
              fltFormulaAmount: "",
              fltPercentageAmount: "",
              fltPercentageValue: "",
              intBasisComponentID: "",
              strFormulaExpression: ""
            };
          }
          if (strNormalizedValueSource === "percentage" || strNormalizedValueSource === "percent") {
            return {
              ...dicLine,
              intValueSourceID: Number(objValue),
              strValueSource: dicSelectedValueSource.strLabel,
              fltPercentageAmount: dicLine.fltFixedAmount,
              fltFormulaAmount: "",
              strFormulaExpression: ""
            };
          }
          return {
            ...dicLine,
            intValueSourceID: Number(objValue),
            strValueSource: dicSelectedValueSource.strLabel,
            fltFormulaAmount: dicLine.fltFixedAmount,
            fltPercentageAmount: "",
            fltFixedAmount: "",
            fltPercentageValue: "",
            intBasisComponentID: "" as const
          };
        }
        if (strField === "fltFixedAmount") {
          return {
            ...dicLine,
            fltFixedAmount: sanitizeDecimalInput(String(objValue))
          };
        }
        if (strField === "strFormulaExpression") {
          return {
            ...dicLine,
            strFormulaExpression: normalizeFormulaExpressionInput(String(objValue))
          };
        }
        if (strField === "intLineOrder") {
          return {
            ...dicLine,
            intLineOrder: normalizeLineOrder(Number(objValue), dicLine.intLineOrder || 10)
          };
        }
        return { ...dicLine, [strField]: objValue } as SalaryStructureLineFormValue;
      });
      return {
        ...dicPrevious,
        lstComponents: recalculateDerivedLineAmounts(lstUpdatedComponents)
      };
    });
  }

  function handleAddLanguageRow() {
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }

  function handleRemoveLanguageRow(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstTexts: dicPrevious.lstTexts.filter((dicText) => dicText.strRowID !== strRowID)
    }));
  }

  async function translateTextRow(strRowID: string, intLanguageID: number) {
    const dicSelectedLanguage = (objFormOptions?.lstLanguages ?? []).find((dicLanguage) => dicLanguage.intID === intLanguageID);
    const strSourceStructureName = dicForm.strStructureName.trim();
    const strSourceStructureDescription = (
      dicForm.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID)?.strStructureDescription
      ?? dicForm.lstTexts[0]?.strStructureDescription
      ?? ""
    ).trim();
    const strSourceSignature = `${strSourceStructureName}||${strSourceStructureDescription}`;

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceStructureName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strStructureName.trim()
      || strLastTranslatedSource !== strSourceSignature;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const [strTranslatedName, strTranslatedDescription] = await Promise.all([
        salaryStructureService.translateSalaryStructureText(
          strSourceStructureName,
          intDefaultLanguageID,
          intLanguageID,
        ),
        strSourceStructureDescription
          ? salaryStructureService.translateSalaryStructureText(
            strSourceStructureDescription,
            intDefaultLanguageID,
            intLanguageID,
          )
          : Promise.resolve(""),
      ]);
      setDicForm((dicPrevious) => ({
        ...dicPrevious,
        lstTexts: dicPrevious.lstTexts.map((dicText) => dicText.strRowID === strRowID
          ? {
            ...dicText,
            intLanguageID,
            strLanguageName: dicSelectedLanguage.strLabel,
            strStructureName: strTranslatedName,
            strStructureDescription: strTranslatedDescription,
          }
          : dicText),
      }));
      setDicLastTranslatedSourceByRow((dicPrevious) => ({
        ...dicPrevious,
        [strRowID]: strSourceSignature,
      }));
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : t("request_failed", "Translation request failed."));
    } finally {
      setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: false }));
    }
  }

  async function handleTranslateClick() {
    const dicSecondaryRow = dicForm.lstTexts[1];
    if (!dicSecondaryRow) {
      return;
    }
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID));
  }

  useEffect(() => {
    if ((objFormOptions?.lstLanguages ?? []).length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions?.lstLanguages.length]);

  useEffect(() => {
    if (strMode !== "add" || lstFlexiEligibleComponents.length === 0) {
      return;
    }
    setDicForm((dicPrevious) => {
      let blnChanged = false;
      const lstComponents = dicPrevious.lstComponents.map((dicLine) => {
        const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
        if (!isFlexiEntitlementHostLine(dicLine, dicComponent)) {
          return dicLine;
        }
        const setMappedComponentIDs = new Set(
          dicLine.lstFlexiMappings
            .map((dicMapping) => Number(dicMapping.intFlexiComponentID))
            .filter((intComponentID) => Number.isFinite(intComponentID) && intComponentID > 0)
        );
        const lstMissingMappings = lstFlexiEligibleComponents
          .filter((dicComponent) => !setMappedComponentIDs.has(dicComponent.intID))
          .map((dicComponent) => ({
            ...createEmptyFlexiMappingRow(),
            intFlexiComponentID: dicComponent.intID,
            strFlexiComponentCode: dicComponent.strCode ?? "",
            strFlexiComponentName: dicComponent.strLabel,
            fltDefaultAmount: "0",
            fltMaxAmount: "0",
            blnIsActive: true,
          }));
        if (lstMissingMappings.length === 0) {
          return dicLine;
        }
        blnChanged = true;
        return {
          ...dicLine,
          lstFlexiMappings: [...dicLine.lstFlexiMappings, ...lstMissingMappings],
        };
      });
      return blnChanged ? { ...dicPrevious, lstComponents } : dicPrevious;
    });
  }, [dicComponentByID, strFlexiBasketLineSignature, strFlexiEligibleComponentSignature, lstFlexiEligibleComponents, strMode]);

  function updateFlexiMappingRow(
    strLineRowID: string,
    strMappingRowID: string,
    strField: keyof SalaryStructureFlexiMappingFormValue,
    objValue: string | number | boolean
  ) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.map((dicLine) => {
        if (dicLine.strRowID !== strLineRowID) {
          return dicLine;
        }
        return {
          ...dicLine,
          lstFlexiMappings: dicLine.lstFlexiMappings.map((dicMapping) => {
            if (dicMapping.strRowID !== strMappingRowID) {
              return dicMapping;
            }
            if (strField === "intFlexiComponentID") {
              const dicComponent = dicComponentByID.get(Number(objValue));
              const strAnnualAmount = clampAmountToLimit(dicMapping.fltMaxAmount, getComponentAnnualLimit(dicComponent));
              const strMonthlyAmount = getMonthlyAmountFromAnnual(strAnnualAmount);
              return {
                ...dicMapping,
                intFlexiComponentEligibilityID: dicComponent?.intFlexiComponentEligibilityID ?? null,
                intFlexiComponentID: parseOptionalSelectNumber(String(objValue)),
                strFlexiComponentCode: dicComponent?.strCode ?? "",
                strFlexiComponentName: dicComponent?.strLabel ?? "",
                // blnIsActive: isFlexiComponentEligibilityActive(dicComponent),
                fltDefaultAmount: strMonthlyAmount,
                fltMaxAmount: strAnnualAmount
              };
            }
            if (strField === "fltDefaultAmount") {
              const dicComponent = dicComponentByID.get(Number(dicMapping.intFlexiComponentID));
              const strMonthlyAmount = clampAmountToLimit(sanitizeDecimalInput(String(objValue)), getComponentMonthlyLimit(dicComponent));
              return {
                ...dicMapping,
                fltDefaultAmount: strMonthlyAmount,
                fltMaxAmount: getAutofilledFlexiYearlyAmount(strMonthlyAmount, getComponentAnnualLimit(dicComponent))
              };
            }
            if (strField === "fltMaxAmount") {
              const dicComponent = dicComponentByID.get(Number(dicMapping.intFlexiComponentID));
              const strAnnualAmount = clampAmountToLimit(sanitizeDecimalInput(String(objValue)), getComponentAnnualLimit(dicComponent));
              return {
                ...dicMapping,
                fltMaxAmount: strAnnualAmount,
                fltDefaultAmount: getMonthlyAmountFromAnnual(strAnnualAmount)
              };
            }
            return { ...dicMapping, [strField]: objValue };
          })
        };
      })
    }));
  }

  function handleAddFlexiMappingRow(strLineRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.map((dicLine) => dicLine.strRowID === strLineRowID
        ? { ...dicLine, lstFlexiMappings: [...dicLine.lstFlexiMappings, createEmptyFlexiMappingRow()] }
        : dicLine)
    }));
  }

  function handleRemoveFlexiMappingRow(strLineRowID: string, strMappingRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.map((dicLine) => dicLine.strRowID === strLineRowID
        ? { ...dicLine, lstFlexiMappings: dicLine.lstFlexiMappings.filter((dicMapping) => dicMapping.strRowID !== strMappingRowID) }
        : dicLine)
    }));
  }

  function handleAddLineRow() {
    setDicForm((dicPrevious) => {
      const lstNormalizedComponents = normalizeSalaryStructureLineOrders(dicPrevious.lstComponents);
      return {
        ...dicPrevious,
        lstComponents: [
          ...lstNormalizedComponents,
          createEmptyLineRow((lstNormalizedComponents.length + 1) * 10)
        ]
      };
    });
  }

  function handleRemoveLineRow(strRowID: string) {
    setDicForm((dicPrevious) => {
      if (dicPrevious.lstComponents.length === 1) {
        return dicPrevious;
      }
      return {
        ...dicPrevious,
        lstComponents: normalizeSalaryStructureLineOrders(
          dicPrevious.lstComponents.filter((dicLine) => dicLine.strRowID !== strRowID)
        )
      };
    });
  }

  function validateFlexiMappings() {
    const lstActiveMappings = dicForm.lstComponents.flatMap((dicLine) =>
      dicLine.lstFlexiMappings.filter((dicMapping) => dicMapping.blnIsActive && dicMapping.intFlexiComponentID !== "")
    );
    if (lstActiveMappings.length > 0 && lstFlexiBasketLines.length === 0) {
      return t("flexi_options_without_bucket", "Flexi components cannot be added unless the structure has an active Flexi Bucket line.");
    }
    for (const dicLine of dicForm.lstComponents.filter(isFlexiBasketLine)) {
      const setFlexiComponentIDs = new Set<number>();
      let fltTotalDefaultAmount = 0;
      let fltTotalYearlyAmount = 0;
      const fltBasketAmount = parseLineAmount(dicLine.fltFixedAmount) ?? 0;
      const fltBasketYearlyAmount = fltBasketAmount * 12;

      for (const dicMapping of dicLine.lstFlexiMappings) {
        if (dicMapping.intFlexiComponentID === "") {
          continue;
        }

        const intFlexiComponentID = Number(dicMapping.intFlexiComponentID);
        if (setFlexiComponentIDs.has(intFlexiComponentID)) {
          return t("duplicate_flexi_components_not_allowed", "Duplicate flexi components are not allowed.");
        }
        setFlexiComponentIDs.add(intFlexiComponentID);

        const fltDefaultAmount = parseLineAmount(dicMapping.fltDefaultAmount);
        const fltMaxAmount = parseLineAmount(dicMapping.fltMaxAmount);
        const dicComponent = dicComponentByID.get(intFlexiComponentID);
        const fltMonthlyLimit = getComponentMonthlyLimit(dicComponent);
        const fltAnnualLimit = getComponentAnnualLimit(dicComponent);
        if (!dicComponent || !isFlexiEligibleComponent(dicComponent)) {
          return t("flexi_component_not_eligible", "Flexi Component Entitlements must reference active Flexi Option salary components.");
        }
        if (fltDefaultAmount === null || fltDefaultAmount < 0) {
          return t("flexi_default_amount_non_negative", "Default monthly allocation must be 0 or greater.");
        }
        if (fltMaxAmount === null || fltMaxAmount < 0) {
          return t("flexi_yearly_amount_non_negative", "Annual cap must be 0 or greater.");
        }
        if (fltDefaultAmount * 12 > fltMaxAmount) {
          return t("flexi_default_exceeds_cap", "Default annual allocation cannot exceed annual cap.");
        }
        if (fltMonthlyLimit != null && fltDefaultAmount > fltMonthlyLimit) {
          return t("flexi_monthly_amount_exceeds_limit", "Flexi monthly amount cannot exceed the salary component monthly limit.");
        }
        if (fltAnnualLimit != null && fltMaxAmount > fltAnnualLimit) {
          return t("flexi_yearly_amount_exceeds_limit", "Flexi yearly amount cannot exceed the salary component annual limit.");
        }
        fltTotalDefaultAmount += fltDefaultAmount;
        fltTotalYearlyAmount += fltMaxAmount;
      }

      if (fltTotalDefaultAmount > fltBasketAmount) {
        return t("flexi_default_total_exceeds_basket", "Total flexi default amount cannot exceed Flexi Basket amount.");
      }
      if (fltTotalYearlyAmount > fltBasketYearlyAmount) {
        return t("flexi_yearly_total_exceeds_basket", "Total flexi yearly amount cannot exceed Flexi Basket yearly amount.");
      }
      if (setFlexiComponentIDs.size > 0 && fltBasketYearlyAmount <= 0) {
        return t("flexi_bucket_amount_required", "Flexi Bucket amount must be greater than 0 when Flexi components are active.");
      }
    }
    return "";
  }

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strStructureCode.trim() || !dicForm.strStructureName.trim() || !dicForm.dtEffectiveFrom) {
      setStrError("Structure code, structure name, and effective from date are required.");
      return;
    }
    if (dicForm.lstComponents.filter((dicLine) => dicLine.intSalaryComponentID !== "").length === 0) {
      setStrError("At least one component line is required.");
      return;
    }
    const lstSelectedComponents = dicForm.lstComponents.filter((dicLine) => dicLine.intSalaryComponentID !== "");
    const setUsedLineOrders = new Set<number>();
    for (const dicLine of lstSelectedComponents) {
      const intLineOrder = Number(dicLine.intLineOrder);
      if (!Number.isInteger(intLineOrder) || intLineOrder <= 0) {
        setStrError(t("invalid_line_order", "Line order must be a positive whole number."));
        return;
      }
      if (setUsedLineOrders.has(intLineOrder)) {
        setStrError(t("duplicate_line_order_not_allowed", "Duplicate line order is not allowed."));
        return;
      }
      setUsedLineOrders.add(intLineOrder);
    }
    const lstFlexiBasketLines = lstSelectedComponents.filter((dicLine) => {
      const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
      return isFlexiEntitlementHostLine(dicLine, dicComponent);
    });
    const intFlexiBasketCount = lstFlexiBasketLines.length;
    if (intFlexiBasketCount > 1) {
      setStrError(t("single_flexi_pay_only", "Only one Flexi Bucket line is allowed in one salary structure."));
      return;
    }
    for (const dicLine of lstFlexiBasketLines) {
      const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
      const fltAmount = parseLineAmount(dicLine.fltFixedAmount) ?? 0;
      if (!dicLine.blnIncludedInCtc || fltAmount <= 0 || dicComponent?.blnIsWages || dicComponent?.blnIncludeInPayslip) {
        setStrError(t("invalid_flexi_bucket_configuration", "Flexi Bucket must be active, included in CTC, greater than 0, non-wage, and hidden from payslip earnings by default."));
        return;
      }
    }
    const strFlexiMappingError = validateFlexiMappings();
    if (strFlexiMappingError) {
      setStrError(strFlexiMappingError);
      return;
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedRecord = strMode === "edit" && intSalaryStructureID
        ? await salaryStructureService.updateSalaryStructure(intSalaryStructureID, dicForm)
        : await salaryStructureService.createSalaryStructure(dicForm);
      const objLatestOptions = await salaryStructureService.getFormOptions();
      setObjFormOptions(objLatestOptions);
      setDicForm(
        applyFlexiEligibilityToForm(
          recalculateSalaryStructureForm(toSalaryStructureFormValues(dicSavedRecord)),
          objLatestOptions
        )
      );
      setStrSuccess(
        strMode === "edit"
          ? t("salary_structure_updated", "Salary structure updated successfully.")
          : t("salary_structure_created", "Salary structure created successfully.")
      );
      if (strMode === "add") {
        objRouter.push(`/salary-structures/edit/${dicSavedRecord.intID}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save salary structure.");
    } finally {
      setBlnSaving(false);
    }
  }

  function renderCompensationCalculationTooltip(
    strLogic: string,
    lstComponents: Array<{ strName: string; fltAnnualAmount: number }>,
    fltResult: number,
    intAnnualDivisor = 1,
  ) {
    return (
      <Box sx={{ maxHeight: 420, minWidth: 260, overflowY: "auto", p: 0.5 }}>
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, mb: 0.5 }}>
          {t("calculation_details", "Calculation details")}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", lineHeight: 1.4, mb: 1, opacity: 0.9 }}>
          {strLogic}
        </Typography>
        {lstComponents.length > 0 ? (
          <Stack spacing={0.45}>
            {lstComponents.map((dicComponent, intIndex) => (
              <Stack key={`${dicComponent.strName}-${intIndex}`} direction="row" justifyContent="space-between" spacing={2}>
                <Typography sx={{ fontSize: "0.72rem", overflowWrap: "anywhere" }}>{dicComponent.strName}</Typography>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                  ₹ {formatSummaryAmount(dicComponent.fltAnnualAmount / intAnnualDivisor)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: "0.72rem", fontStyle: "italic", opacity: 0.85 }}>
            {t("no_contributing_components", "No contributing components")}
          </Typography>
        )}
        <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ borderTop: "1px solid rgba(255,255,255,0.35)", mt: 1, pt: 0.75 }}>
          <Typography sx={{ fontSize: "0.74rem", fontWeight: 800 }}>{t("calculated_total", "Calculated total")}</Typography>
          <Typography sx={{ fontSize: "0.74rem", fontWeight: 800, whiteSpace: "nowrap" }}>
            ₹ {formatSummaryAmount(fltResult)}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_salary_structure_workspace", "Loading salary structure workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Salary structure create access is not available for your user group.")
            : t("access_denied", "Salary structure access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need salary structure access.")}
        </Typography>
        {strRightsError ? <Typography sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper
        sx={{
          borderRadius: "22px",
          p: { xs: 1.5, md: 2 },
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)"
        }}
      >
        <Stack spacing={1.25}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.25}>
            <Box>
              <Typography
                component="h1"
                sx={{
                  color: "#0f172a",
                  fontSize: { xs: "1.35rem", md: "1.65rem" },
                  fontWeight: 800,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.2
                }}
              >
                {strPageHeading}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.35, fontSize: "0.9rem", lineHeight: 1.35 }}>
                {t(
                  "editor_description",
                  "Define structure header, company scope dates, multilingual text, and component-wise calculation rules in one workflow."
                )}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/salary-structures")}
                {...getAutomationProps("salary-structures.editor.back.button")}
                sx={{
                  borderRadius: "14px",
                  height: 34,
                  minHeight: 34,
                  py: 0,
                  px: 2.25,
                  minWidth: 100,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {t("back_button", "Back")}
              </Button>
              <Button
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={handleSave}
                disabled={!blnCanSave || blnSaving}
                {...getAutomationProps("salary-structures.editor.save.button")}
                sx={{
                  borderRadius: "14px",
                  height: 34,
                  minHeight: 34,
                  py: 0,
                  px: 2.25,
                  minWidth: 100,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}
              >
                {blnSaving ? t("saving", "Saving...") : t("save_button", "Save")}
              </Button>
            </Stack>
          </Stack>

          {strError ? <Alert severity="error" onClose={() => setStrError("")} sx={{ borderRadius: 0 }}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")} sx={{ borderRadius: 0 }}>{strSuccess}</Alert> : null}
          {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Salary Structure.")}</Alert> : null}
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            {t("structure_header", "Structure Header")}
          </Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
            <TextField
              label={t("structure_code", "Structure Code")}
              value={dicForm.strStructureCode}
              onChange={(objEvent) => updateRootField("strStructureCode", objEvent.target.value.toUpperCase())}
              disabled={blnFieldDisabled || strMode === "edit"}
              fullWidth
              controlId="salary-structures.editor.structure-code.input"
              inputProps={{
                ...buildInputTestIdProps("salary-structures.editor.structure-code.input"),
                readOnly: strMode === "edit"
              }}
              required
            />
            <TextField
              label={t("structure_name", "Structure Name")}
              value={dicForm.strStructureName}
              onChange={(objEvent) => syncDefaultStructureText(objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              controlId="salary-structures.editor.structure-name.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.structure-name.input")}
              required
            />
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={1.5} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("scope_and_dates", "Scope and Dates")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControlLabel
                control={<Switch checked={dicForm.blnIsDefault} onChange={(objEvent) => updateRootField("blnIsDefault", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-structures.editor.default-structure.switch")} />}
                label={t("default_structure", "Default Structure")}
              />
              <FormControlLabel
                control={<ActiveStatusSwitch testId="salary-structures.editor.active-structure.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateRootField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
                label={t("active_structure", "Active Structure")}
              />
            </Stack>
          </Stack>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}>
            <TextField
              select
              label={t("currency", "Currency")}
              value={dicForm.strCurrencyCode}
              onChange={(objEvent) => updateRootField("strCurrencyCode", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              controlId="salary-structures.editor.currency.select"
              inputProps={buildInputTestIdProps("salary-structures.editor.currency.select")}
              SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.currency.select") }}
            >
              {(objFormOptions?.lstCurrencies ?? []).map((strCurrencyCode) => (
                <MenuItem key={strCurrencyCode} value={strCurrencyCode} controlId={`salary-structures.editor.currency.${normalizeSelectToken(strCurrencyCode)}.option`}>{strCurrencyCode}</MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label={t("effective_from", "Effective From")}
              value={dicForm.dtEffectiveFrom}
              onChange={(objEvent) => updateRootField("dtEffectiveFrom", objEvent.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={blnFieldDisabled}
              fullWidth
              controlId="salary-structures.editor.effective-from.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.effective-from.input")}
              required
            />
            <TextField
              type="date"
              label={t("effective_to", "Effective To")}
              value={dicForm.dtEffectiveTo}
              onChange={(objEvent) => updateRootField("dtEffectiveTo", objEvent.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={blnFieldDisabled}
              fullWidth
              controlId="salary-structures.editor.effective-to.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.effective-to.input")}
            />
          </Box>
        </Paper>
      </Box>

      <Box>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" } }}>
          <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
            <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ borderBottom: "1px solid #d9e6ef", px: 2, py: 1.2 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  {t("component_line_configuration", "Salary Component Lines")}
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
                  {t(
                    "component_line_configuration_help",
                    "Configure line order, value source, fixed or percentage rules, basis components, formula logic, range controls, and active flags in the same master-grid style."
                  )}
                </Typography>
              </Box>
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />}
                controlId="salary-structures.editor.add-line.button"
                onClick={handleAddLineRow} disabled={blnFieldDisabled}
                sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 100,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  "& .MuiButton-startIcon": {
                    mr: 0.75,
                    "& svg": {
                      fontSize: "1rem"
                    }
                  }
                }}>
                {t("add_line", "Add Line")}
              </Button>
            </Stack>
          <Box
            sx={{
              overflowX: "auto",
              "& .MuiInputBase-root.MuiInputBase-sizeSmall": {
                minHeight: 34
              },
              "& .MuiInputBase-input.MuiInputBase-inputSizeSmall": {
                fontSize: "0.82rem",
                py: 0.75
              },
              "& .MuiSelect-select.MuiInputBase-inputSizeSmall": {
                fontSize: "0.82rem",
                py: 0.75
              },
              "& .MuiSwitch-root": {
                mt: -0.4
              }
            }}
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ left: 0, minWidth: 106, position: "sticky", zIndex: 4 }}>{t("line_order", "Line Order")}</th>
                  <th style={{ left: 106, minWidth: 320, position: "sticky", zIndex: 4 }}>{t("salary_component", "Salary Component")}</th>
                  <th>{t("value_source", "Value Source")}</th>
                  <th>{t("yearly_amount", "Yearly Amount")}</th>
                  <th>{t("monthly_amount", "Monthly Amount")}</th>
                  <th>{t("percentage_value", "% Value")}</th>
                  <th>{t("basis_component", "Basis Component")}</th>
                  <th>{t("formula", "Formula")}</th>
                  <th>{t("min_amount", "Min")}</th>
                  <th>{t("max_amount", "Max")}</th>
                  <th>{t("mandatory", "Mandatory")}</th>
                  <th>{t("active", "Active")}</th>
                  <th>{t("action", "Action")}</th>
                </tr>
              </thead>
              <tbody>
                {lstSortedComponentLines.map((dicLine) => {
                  const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
                  const strLineYearlyAmount = getAnnualAmountFromMonthly(dicLine.fltFixedAmount);
                  const strFlexiRoleBadge = getFlexiRoleForLine(dicLine, dicComponent);
                  const lstLineBadges = dicComponent ? [
                    dicComponent.blnIncludedInCtc === false ? t("non_ctc", "Non-CTC") : t("ctc", "CTC"),
                    getTaxTreatmentLabel(dicComponent) || t("tax_not_configured", "Tax not configured"),
                    dicComponent.blnIsWages ? t("wage", "Wage") : t("non_wage", "Non-Wage"),
                    dicComponent.strComponentGroup || t("component_group_unset", "Component Group not set"),
                    strFlexiRoleBadge !== "Normal" ? strFlexiRoleBadge : null,
                    dicComponent.strLwpTreatmentCode && dicComponent.strLwpTreatmentCode !== "NONE"
                      ? `${t("lwp", "LWP")}: ${t(`lwp_treatment_${normalizeSelectToken(dicComponent.strLwpTreatmentCode)}`, dicComponent.strLwpTreatmentCode)}`
                      : null,
                  ].filter(Boolean) : [];
                  const strPolicyNotConfigured = t("not_configured", "Not configured");
                  const objPolicyTooltip = (
                    <Stack spacing={0.45}>
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 800 }}>
                        {t("component_policy_snapshot", "Component Policy Snapshot")}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem" }}>
                        {t("payslip_section", "Payslip Section")}: {dicLine.strPayslipSection || dicLine.strPayslipSectionSnapshotCode || strPolicyNotConfigured}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem" }}>
                        {t("lwp_treatment", "LWP Treatment")}: {dicLine.strLwpTreatment || dicLine.strLwpTreatmentSnapshotCode || strPolicyNotConfigured}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem" }}>
                        {t("lwp_reduced_amount_handling", "Reduced Amount Handling")}: {dicLine.strLwpReducedAmountHandling || dicLine.strLwpReducedAmountHandlingSnapshotCode || strPolicyNotConfigured}
                      </Typography>
                      {dicLine.strLwpProrationFormulaSnapshot ? (
                        <Typography sx={{ fontSize: "0.7rem" }}>
                          {t("custom_proration_formula", "Custom Proration Formula")}: {dicLine.strLwpProrationFormulaSnapshot}
                        </Typography>
                      ) : null}
                      {isFlexiBasketLine(dicLine) ? (
                        <Typography sx={{ fontSize: "0.68rem", color: "#cbd5e1" }}>
                          {t(
                            "flexi_basket_lwp_not_directly_prorated",
                            "Flexi Basket is not directly prorated. Individual declared options follow their component policy."
                          )}
                        </Typography>
                      ) : null}
                    </Stack>
                  );
                  return (
                  <tr key={dicLine.strRowID}>
                    <td style={{ background: "#ffffff", left: 0, paddingBottom: 4, paddingTop: 4, position: "sticky", verticalAlign: "top", zIndex: 2 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={dicLine.intLineOrder}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intLineOrder", Number(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        controlId="salary-structures.editor.line.line-order.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.line-order.input", { "data-row-key": dicLine.strRowID, min: "1", step: "1" })}
                        sx={{ width: 78 }}
                      />
                    </td>
                    <td style={{ background: "#ffffff", left: 106, paddingBottom: 4, paddingTop: 4, position: "sticky", verticalAlign: "top", zIndex: 2 }}>
                      <Stack spacing={0.45} sx={{ minWidth: 280, maxWidth: 320 }}>
                        <Stack direction="row" spacing={0.45} sx={{ alignItems: "center" }}>
                          <TextField
                            select
                            size="small"
                            value={dicLine.intSalaryComponentID}
                            onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intSalaryComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                            disabled={blnFieldDisabled}
                            controlId="salary-structures.editor.line.salary-component.select"
                            inputProps={buildInputTestIdProps("salary-structures.editor.line.salary-component.select", { "data-row-key": dicLine.strRowID })}
                            SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.salary-component.select", { "data-row-key": dicLine.strRowID }) }}
                            sx={{ flex: 1 }}
                          >
                            {(objFormOptions?.lstSalaryComponents ?? []).map((dicOption) => (
                              <MenuItem key={dicOption.intID} value={dicOption.intID} controlId={`salary-structures.editor.line.salary-component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                                {dicOption.strLabel}
                              </MenuItem>
                            ))}
                          </TextField>
                          {dicLine.intSalaryComponentID ? (
                            <Tooltip
                              title={objPolicyTooltip}
                              arrow
                              enterTouchDelay={0}
                              slotProps={{
                                tooltip: {
                                  sx: {
                                    borderRadius: 0
                                  }
                                },
                                arrow: {
                                  sx: {
                                    "&::before": {
                                      borderRadius: 0
                                    }
                                  }
                                }
                              }}
                            >
                              <IconButton
                                size="small"
                                aria-label={t("component_policy_snapshot", "Component Policy Snapshot")}
                                controlId="salary-structures.editor.line.policy-snapshot.tooltip"
                                sx={{
                                  color: "#64748b",
                                  flexShrink: 0,
                                  height: 20,
                                  p: 0,
                                  width: 20
                                }}
                              >
                                <InfoOutlinedIcon sx={{ fontSize: "0.9rem" }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                        </Stack>
                        <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ alignItems: "center", minHeight: 18 }}>
                          {lstLineBadges.length === 0 ? (
                            <Typography sx={{ color: "#94a3b8", fontSize: "0.68rem" }}>-</Typography>
                          ) : lstLineBadges.map((strBadge) => (
                            <Box
                              key={strBadge}
                              sx={{
                                background: "#f2f4f7",
                                borderRadius: "6px",
                                color: "#334155",
                                fontSize: "0.64rem",
                                fontWeight: 600,
                                lineHeight: 1,
                                px: 0.8,
                                py: 0.45
                              }}
                            >
                              {strBadge}
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        select
                        size="small"
                        value={getValueSourceOptionByID(lstValueSourceOptions, dicLine.intValueSourceID, dicLine.strValueSource).intID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strValueSource", Number(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        controlId="salary-structures.editor.line.value-source.select"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.value-source.select", { "data-row-key": dicLine.strRowID })}
                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.value-source.select", { "data-row-key": dicLine.strRowID }) }}
                        sx={{ minWidth: 136 }}
                      >
                        {lstValueSourceOptions.map((dicValueSource) => (
                          <MenuItem key={dicValueSource.intID} value={dicValueSource.intID} controlId={`salary-structures.editor.line.value-source.${normalizeSelectToken(dicValueSource.strCode || dicValueSource.strLabel)}.option`}>{dicValueSource.strLabel}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        value={strLineYearlyAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltFixedAmount", getMonthlyAmountFromAnnual(objEvent.target.value))}
                        disabled={blnFieldDisabled || normalizeSelectToken(dicLine.strValueSource) !== "fixed"}
                        controlId="salary-structures.editor.line.yearly-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.yearly-amount.input", {
                          "data-row-key": dicLine.strRowID,
                          inputMode: "decimal",
                          pattern: "[0-9]*[.]?[0-9]*"
                        })}
                        sx={{ minWidth: 128 }}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        value={dicLine.fltFixedAmount}
                        disabled
                        controlId="salary-structures.editor.line.fixed-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.fixed-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 118 }}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        value={dicLine.fltPercentageValue}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltPercentageValue", objEvent.target.value)}
                        disabled={blnFieldDisabled || normalizeSelectToken(dicLine.strValueSource) !== "percentage"}
                        controlId="salary-structures.editor.line.percentage-value.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.percentage-value.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ width: 50 }}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        select
                        size="small"
                        value={dicLine.intBasisComponentID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intBasisComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                        disabled={blnFieldDisabled || normalizeSelectToken(dicLine.strValueSource) !== "percentage"}
                        controlId="salary-structures.editor.line.basis-component.select"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.basis-component.select", { "data-row-key": dicLine.strRowID })}
                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.basis-component.select", { "data-row-key": dicLine.strRowID }) }}
                        sx={{ minWidth: 188 }}
                      >
                        <MenuItem value="" controlId="salary-structures.editor.line.basis-component.none.option">{t("none", "None")}</MenuItem>
                        {dicForm.lstComponents
                          .filter((dicBasis) => dicBasis.strRowID !== dicLine.strRowID && dicBasis.intSalaryComponentID !== "")
                          .map((dicBasis) => (
                            <MenuItem key={dicBasis.strRowID} value={Number(dicBasis.intSalaryComponentID)} controlId={`salary-structures.editor.line.basis-component.${normalizeSelectToken(dicBasis.strComponentCode || dicBasis.strComponentName)}.option`}>
                              {dicBasis.strComponentCode ? `${dicBasis.strComponentCode} - ${dicBasis.strComponentName}` : dicBasis.strComponentName}
                            </MenuItem>
                          ))}
                      </TextField>
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      {(() => {
                        const blnIsFormulaValueSource = normalizeSelectToken(dicLine.strValueSource) === "formula";
                        const objFormulaHelpTooltip = (
                          <Stack spacing={0.5}>
                            <Typography sx={{ fontSize: "0.72rem", fontWeight: 800 }}>
                              {t("formula_variables_title", "Available formula codes")}
                            </Typography>
                            {lstFormulaVariableCodes.length > 0 ? (
                              <Stack spacing={0.25}>
                                {lstFormulaVariableCodes.map((strCode) => (
                                  <Typography key={strCode} sx={{ fontSize: "0.7rem", lineHeight: 1.35 }}>
                                    - {strCode}
                                  </Typography>
                                ))}
                              </Stack>
                            ) : (
                              <Typography sx={{ fontSize: "0.7rem", lineHeight: 1.45 }}>
                                {t("formula_variables_empty", "No salary component codes are available in this structure yet.")}
                              </Typography>
                            )}
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700 }}>
                              {t("formula_example_label", "Example")}: DEEMED_WAGE_BASE * 0.08
                            </Typography>
                          </Stack>
                        );
                        return (
                      <TextField
                        size="small"
                        value={dicLine.strFormulaExpression}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strFormulaExpression", objEvent.target.value)}
                        disabled={blnFieldDisabled || !blnIsFormulaValueSource}
                        controlId="salary-structures.editor.line.formula.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.formula.input", { "data-row-key": dicLine.strRowID })}
                        helperText=" "
                        InputProps={blnIsFormulaValueSource ? {
                          endAdornment: (
                            <InputAdornment position="end">
                              <Tooltip
                                title={objFormulaHelpTooltip}
                                arrow
                                enterTouchDelay={0}
                                slotProps={{
                                  tooltip: {
                                    sx: {
                                      borderRadius: 0
                                    }
                                  },
                                  arrow: {
                                    sx: {
                                      "&::before": {
                                        borderRadius: 0
                                      }
                                    }
                                  }
                                }}
                              >
                                <IconButton
                                  size="small"
                                  edge="end"
                                  controlId="salary-structures.editor.line.formula.tooltip"
                                  sx={{ color: "#64748b", mr: -0.5 }}
                                >
                                  <InfoOutlinedIcon sx={{ fontSize: "0.95rem" }} />
                                </IconButton>
                              </Tooltip>
                            </InputAdornment>
                          )
                        } : undefined}
                        sx={{ minWidth: 230 }}
                      />
                        );
                      })()}
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        value={dicLine.fltMinAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMinAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        controlId="salary-structures.editor.line.min-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.min-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 108 }}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <TextField
                        size="small"
                        value={dicLine.fltMaxAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMaxAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        controlId="salary-structures.editor.line.max-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.max-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 108 }}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <Switch
                        checked={dicLine.blnIsMandatory}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "blnIsMandatory", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.mandatory.switch", { "data-row-key": dicLine.strRowID })}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <ActiveStatusSwitch
                        blnIsActive={dicLine.blnIsActive}
                        onChange={(blnChecked) => updateLineRow(dicLine.strRowID, "blnIsActive", blnChecked)}
                        disabled={blnFieldDisabled}
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.active.switch", { "data-row-key": dicLine.strRowID })}
                      />
                    </td>
                    <td style={{ paddingBottom: 4, paddingTop: 4, verticalAlign: "top" }}>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveLineRow(dicLine.strRowID)}
                        disabled={blnFieldDisabled}
                        controlId="salary-structures.editor.line.remove.button"
                        data-row-key={dicLine.strRowID}
                        aria-label={t("remove_button", "Remove")}
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
          </Paper>
          <Paper variant="outlined" sx={{ alignSelf: "start", borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
            <Typography sx={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 800, mb: 2 }}>
              {t("salary_breakdown_impact", "Compensation Summary")}
            </Typography>
            <Stack spacing={1.6}>
              {[
                {
                  strLabel: t("annual_ctc", "Annual CTC"), fltValue: dicStructureSummary.fltTotalCtc, strColor: "#0757b8",
                  strLogic: t("annual_ctc_calculation_logic", "Sum of annual amounts (monthly amount × 12) for active earnings, Flexi Basket, and employer contributions marked as Included in CTC."),
                  lstComponents: dicStructureSummary.lstCtcComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("monthly_ctc", "Monthly CTC"), fltValue: dicStructureSummary.fltTotalCtc / 12, strColor: "#0757b8",
                  strLogic: t("monthly_ctc_calculation_logic", "Annual CTC ÷ 12. Each amount below is the component's monthly contribution."),
                  lstComponents: dicStructureSummary.lstCtcComponents, intAnnualDivisor: 12,
                },
                {
                  strLabel: t("gross_annual", "Gross Annual"), fltValue: dicStructureSummary.fltGrossAnnual, strColor: "#0f172a",
                  strLogic: t("gross_annual_calculation_logic", "Sum of annual amounts for active payable earnings and Flexi Basket. Deductions, employer contributions, and information-only components are excluded."),
                  lstComponents: dicStructureSummary.lstGrossComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("gross_monthly", "Gross Monthly"), fltValue: dicStructureSummary.fltGrossMonthly, strColor: "#0f172a",
                  strLogic: t("gross_monthly_calculation_logic", "Gross Annual ÷ 12. Each amount below is the component's monthly contribution."),
                  lstComponents: dicStructureSummary.lstGrossComponents, intAnnualDivisor: 12,
                },
                {
                  strLabel: t("variable_pay", "Variable Pay"), fltValue: dicStructureSummary.fltVariablePay, strColor: "#0f172a",
                  strLogic: t("variable_pay_calculation_logic", "Sum of annual amounts for active earning components in the Variable Pay group."),
                  lstComponents: dicStructureSummary.lstVariablePayComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("employer_contributions", "Employer Contributions"), fltValue: dicStructureSummary.fltEmployerContribution, strColor: "#0f172a",
                  strLogic: t("employer_contributions_calculation_logic", "Sum of annual amounts for active components classified as employer contributions."),
                  lstComponents: dicStructureSummary.lstEmployerContributionComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("flexi_basket_amount", "Flexi Basket Amount"), fltValue: dicStructureSummary.fltFlexiBasket, strColor: "#067647",
                  strLogic: t("flexi_basket_calculation_logic", "Sum of annual amounts for active components classified as a Flexi Basket."),
                  lstComponents: dicStructureSummary.lstFlexiBasketComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("flexi_entitlement_total", "Flexi Entitlement Total"), fltValue: dicFlexiSummary.fltEntitlementAnnual, strColor: "#0f766e",
                  strLogic: t("flexi_entitlement_calculation_logic", "Sum of the annual entitlement limits for active Flexi component mappings."),
                  lstComponents: dicFlexiSummary.lstEntitlementComponents, intAnnualDivisor: 1,
                },
                {
                  strLabel: t("residual_flexi_capacity", "Residual Flexi Capacity"), fltValue: dicFlexiSummary.fltResidualTaxableProjection, strColor: "#b45309",
                  strLogic: t("residual_flexi_calculation_logic", "Flexi Basket Amount − Flexi Entitlement Total, with a minimum result of zero."),
                  lstComponents: [
                    { strName: t("flexi_basket_amount", "Flexi Basket Amount"), fltAnnualAmount: dicStructureSummary.fltFlexiBasket },
                    { strName: t("less_flexi_entitlement_total", "Less: Flexi Entitlement Total"), fltAnnualAmount: -dicFlexiSummary.fltEntitlementAnnual },
                  ],
                  intAnnualDivisor: 1,
                },
              ].map((dicSummaryItem, intSummaryIndex) => {
                return (
                  <Stack key={`summary-${intSummaryIndex}-${dicSummaryItem.strLabel}`} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ color: "#172554", fontSize: "0.84rem", whiteSpace: "nowrap" }}>{dicSummaryItem.strLabel}</Typography>
                    <Tooltip
                      arrow
                      placement="left"
                      enterTouchDelay={0}
                      slotProps={{ tooltip: { sx: { maxWidth: 420 } } }}
                      title={renderCompensationCalculationTooltip(dicSummaryItem.strLogic, dicSummaryItem.lstComponents, dicSummaryItem.fltValue, dicSummaryItem.intAnnualDivisor)}
                    >
                      <Typography
                        component="span"
                        tabIndex={0}
                        aria-label={`${dicSummaryItem.strLabel}: ₹ ${formatSummaryAmount(dicSummaryItem.fltValue)}. ${t("hover_for_calculation", "Hover for calculation details.")}`}
                        data-controlid={`salary-structures.editor.compensation-summary.${normalizeSelectToken(dicSummaryItem.strLabel)}.amount`}
                        sx={{ borderBottom: "1px dotted currentColor", color: dicSummaryItem.strColor, cursor: "help", fontSize: "0.84rem", fontWeight: 800, ml: 1.5, textAlign: "right", whiteSpace: "nowrap" }}
                      >
                        ₹ {formatFlexiAmount(dicSummaryItem.fltValue)}
                      </Typography>
                    </Tooltip>
                  </Stack>
                );
              })}
              {lstCompensationWarnings.map((dicWarning) => (
                <Alert key={dicWarning.strMessage} severity={dicWarning.strSeverity} sx={{ py: 0.4, "& .MuiAlert-message": { fontSize: "0.78rem" } }}>
                  {dicWarning.strMessage}
                </Alert>
              ))}
              <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1.4 }}>
                <Stack direction="row" spacing={0.8} alignItems="flex-start">
                  <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                  <Typography sx={{ color: "#172554", fontSize: "0.78rem", lineHeight: 1.45 }}>
                    {t("salary_breakdown_impact_help", "Amounts are estimated at structure level. Final employee payroll impact depends on employee salary assignment, eligibility, and payroll processing.")}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>

        {lstFlexiBasketLines.length > 0 ? (
          <Box sx={{ mt: 2.5 }}>
            <Stack spacing={1.5}>
              {lstFlexiBasketLines.map((dicLine) => {
                return (
                <Box key={dicLine.strRowID}>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "1fr" }}>
                    <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
                      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ borderBottom: "1px solid #d9e6ef", px: 2, py: 1.2 }}>
                        <Box>
                          <Typography sx={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 800 }}>
                            {t("flexi_component_entitlements", "Flexi Component Entitlements")}
                          </Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mt: 0.35 }}>
                            {t("flexi_component_entitlements_help", "Define structure-level annual entitlement for Flexi components available to employees. Employee-specific eligibility and selection are handled separately.")}
                          </Typography>
                        </Box>
                        <Button
                          className={styles.primaryButton}
                          startIcon={<AddRoundedIcon />}
                          onClick={() => handleAddFlexiMappingRow(dicLine.strRowID)}
                          disabled={blnFieldDisabled || lstFlexiEligibleComponents.length === 0}
                          controlId="salary-structures.editor.flexi-mapping.add.button"
                          data-row-key={dicLine.strRowID}
                        >
                          {t("add_flexi_component", "Add")}
                        </Button>
                      </Stack>
                      <Box sx={{ overflowX: "auto" }}>
                        <Box component="table" sx={{ borderCollapse: "collapse", minWidth: 1360, width: "100%" }}>
                          <Box component="thead" sx={{ "& th": { borderBottom: "1px solid #d9e6ef", color: "#0f172a", fontSize: "0.77rem", fontWeight: 700, px: 2, py: 1.2, textAlign: "left", whiteSpace: "nowrap" } }}>
                            <tr>
                              <th>{t("component", "Component")}</th>
                              <th>{t("policy_annual_limit", "Policy Annual Limit")}</th>
                              <th>{t("policy_monthly_limit", "Policy Monthly Limit")}</th>
                              <th>{t("annual_entitlement", "Annual Entitlement")}</th>
                              <th>{t("monthly_equivalent", "Monthly Equivalent")}</th>
                              <th>{t("proof_required", "Proof Required")}</th>
                              <th>{t("eligibility", "Eligibility")}</th>
                              <th>{t("active", "Active")}</th>
                              <th>{t("action", "Action")}</th>
                            </tr>
                          </Box>
                          <Box component="tbody" sx={{ "& td": { borderBottom: "1px solid #d9e6ef", color: "#172554", fontSize: "0.84rem", px: 2, py: 1.15, verticalAlign: "middle", whiteSpace: "nowrap" } }}>
                            {dicLine.lstFlexiMappings.length === 0 ? (
                              <tr>
                                <td className={styles.emptyState} colSpan={9}>{t("no_flexi_components_mapped", "No flexi components mapped.")}</td>
                              </tr>
                            ) : dicLine.lstFlexiMappings.map((dicMapping) => {
                              const dicFlexiComponent = dicComponentByID.get(Number(dicMapping.intFlexiComponentID));
                              const blnShowComponentSelect = dicMapping.intFlexiComponentID === "" || (dicFlexiComponent ? isFlexiEligibleComponent(dicFlexiComponent) : false);
                              const fltAnnualLimit = getComponentAnnualLimit(dicFlexiComponent);
                              const fltMonthlyPolicyLimit = getComponentMonthlyLimit(dicFlexiComponent);
                              const strMonthlyLimit = getMonthlyAmountFromAnnual(dicMapping.fltMaxAmount);
                              const strEligibilitySummary = getEligibilitySummary(dicFlexiComponent);
                              const blnFlexiEligibilityInactive = !dicMapping.blnIsActive;
                              return (
                              <tr key={dicMapping.strRowID}>
                                <td>
                                  <Stack direction="row" spacing={1.15} alignItems="center">
                                    <Box sx={{ alignItems: "center", background: "#eaf3ff", border: "1px solid #cfe3ff", borderRadius: "4px", color: "#0b57b7", display: "inline-flex", height: 34, justifyContent: "center", width: 34 }}>
                                      {getFlexiComponentIcon(dicFlexiComponent?.strLabel || dicMapping.strFlexiComponentName || "")}
                                    </Box>
                                    {blnShowComponentSelect ? (
                                      <TextField
                                        select
                                        size="small"
                                        value={dicMapping.intFlexiComponentID}
                                        onChange={(objEvent) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "intFlexiComponentID", objEvent.target.value)}
                                        disabled={blnFieldDisabled}
                                        controlId="salary-structures.editor.flexi-mapping.component.select"
                                        inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.component.select", { "data-row-key": dicMapping.strRowID })}
                                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.flexi-mapping.component.select", { "data-row-key": dicMapping.strRowID }) }}
                                        sx={{ minWidth: 200, "& .MuiSelect-select": { fontSize: "0.84rem" } }}
                                      >
                                        <MenuItem value="" controlId="salary-structures.editor.flexi-mapping.component.none.option">{t("select_component", "Select Component")}</MenuItem>
                                        {lstFlexiEligibleComponents.map((dicOption) => (
                                          <MenuItem key={dicOption.intID} value={dicOption.intID} controlId={`salary-structures.editor.flexi-mapping.component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                                            {dicOption.strLabel}
                                          </MenuItem>
                                        ))}
                                      </TextField>
                                    ) : (
                                      <TextField
                                        size="small"
                                        value={dicFlexiComponent?.strLabel || dicMapping.strFlexiComponentName}
                                        disabled
                                        controlId="salary-structures.editor.flexi-mapping.component.display"
                                        inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.component.display", { "data-row-key": dicMapping.strRowID })}
                                        sx={{ minWidth: 200, "& .MuiInputBase-input": { fontSize: "0.84rem" } }}
                                      />
                                    )}
                                  </Stack>
                                </td>
                                <td>
                                  {formatReadonlyLimit(fltAnnualLimit)}
                                </td>
                                <td>
                                  {formatReadonlyLimit(fltMonthlyPolicyLimit)}
                                </td>
                                <td>
                                  <TextField
                                    size="small"
                                    value={dicMapping.fltMaxAmount}
                                    onChange={(objEvent) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "fltMaxAmount", objEvent.target.value)}
                                    disabled={blnFieldDisabled || blnFlexiEligibilityInactive}
                                    controlId="salary-structures.editor.flexi-mapping.max-amount.input"
                                    inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.max-amount.input", {
                                      "data-row-key": dicMapping.strRowID,
                                      inputMode: "decimal",
                                      pattern: "[0-9]*[.]?[0-9]*",
                                      ...(fltAnnualLimit != null ? { max: String(fltAnnualLimit) } : {})
                                    })}
                                    sx={{ width: 126, "& .MuiInputBase-input": { fontSize: "0.84rem", py: 0.9 } }}
                                  />
                                </td>
                                <td>
                                  <TextField
                                    size="small"
                                    value={strMonthlyLimit}
                                    disabled
                                    controlId="salary-structures.editor.flexi-mapping.default-amount.input"
                                    inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.default-amount.input", { "data-row-key": dicMapping.strRowID })}
                                    sx={{ width: 126, "& .MuiInputBase-input": { fontSize: "0.84rem", py: 0.9 } }}
                                  />
                                </td>
                                <td>{(dicMapping.blnRequiresBills ?? dicFlexiComponent?.blnRequiresBills) ? t("yes", "Yes") : t("no", "No")}</td>
                                <td>
                                  <Tooltip
                                    title={strEligibilitySummary === "Eligible by default"
                                      ? t("flexi_default_eligibility_tooltip", "This component is eligible by default if allowed in this salary structure.")
                                      : strEligibilitySummary}
                                  >
                                    <Typography sx={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                                      {strEligibilitySummary}
                                    </Typography>
                                  </Tooltip>
                                </td>
                                <td>
                                  <Stack direction="row" spacing={0.35} alignItems="center">
                                    <ActiveStatusSwitch
                                      blnIsActive={dicMapping.blnIsActive}
                                      onChange={(blnChecked) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "blnIsActive", blnChecked)}
                                      disabled={blnFieldDisabled}
                                      inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.active.switch", { "data-row-key": dicMapping.strRowID })}
                                    />
                                  </Stack>
                                </td>
                                <td>
                                  <Stack direction="row" spacing={0.35} alignItems="center">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleRemoveFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID)}
                                      disabled={blnFieldDisabled || blnFlexiEligibilityInactive}
                                      controlId="salary-structures.editor.flexi-mapping.remove.button"
                                      data-row-key={dicMapping.strRowID}
                                      aria-label={t("remove_button", "Remove")}
                                    >
                                      <DeleteOutlineRoundedIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                </td>
                              </tr>
                              );
                            })}
                          </Box>
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: "#475569", fontSize: "0.78rem", px: 2, py: 1.4 }}>
                        <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18 }} />
                        <Typography sx={{ color: "#475569", fontSize: "0.78rem" }}>
                          {t("annual_entitlement_calculates_monthly", "Monthly Equivalent is calculated automatically from Annual Entitlement.")}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Box>
                </Box>
                );
              })}
            </Stack>
          </Box>
        ) : null}
      </Box>

      {intSecondaryLanguageID ? (
      <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              {t("multilingual_text", "Multilingual Text")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t(
                "multilingual_text_help",
                "Maintain translated structure names and descriptions without exposing system fields."
              )}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
            <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} disabled controlId="salary-structures.editor.multilingual.add-language.button">
              {t("add_language", "Add Language")}
            </Button>
            <Button
              className={styles.primaryButton}
              onClick={() => void handleTranslateClick()}
              disabled={blnFieldDisabled || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
              controlId="salary-structures.editor.multilingual.translate.button"
            >
              {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]
                ? <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                : t("translate", "AI Translate")}
            </Button>
          </Box>
        </Stack>
        <Stack spacing={1.5}>
          {dicForm.lstTexts.map((dicText, intIndex) => (
            <Box
              key={dicText.strRowID}
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" },
                alignItems: "center",
                border: "1px solid rgba(203,213,225,0.8)",
                borderRadius: "18px",
                p: 1.5,
                background: "#f8fafc"
              }}
            >
              <TextField
                select
                label={t("language", "Language")}
                value={dicText.intLanguageID}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))}
                disabled
                fullWidth
                controlId="salary-structures.editor.multilingual.language.select"
                inputProps={buildInputTestIdProps("salary-structures.editor.multilingual.language.select", { "data-row-key": dicText.strRowID })}
                SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.multilingual.language.select", { "data-row-key": dicText.strRowID }) }}
              >
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID} controlId={`salary-structures.editor.multilingual.language.${dicLanguage.intID}.option`}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("structure_name", "Structure Name")}
                value={dicText.strStructureName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStructureName", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                controlId="salary-structures.editor.multilingual.structure-name.input"
                inputProps={buildInputTestIdProps("salary-structures.editor.multilingual.structure-name.input", { "data-row-key": dicText.strRowID })}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <TextField
                label={t("description", "Description")}
                value={dicText.strStructureDescription}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStructureDescription", objEvent.target.value)}
                disabled={blnFieldDisabled}
                controlId="salary-structures.editor.multilingual.description.input"
                inputProps={buildInputTestIdProps("salary-structures.editor.multilingual.description.input", { "data-row-key": dicText.strRowID })}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} disabled controlId="salary-structures.editor.multilingual.remove.button" data-row-key={dicText.strRowID} sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>
      ) : null}
    </Stack>
  );
}
