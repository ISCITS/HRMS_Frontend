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
    "data-testid": strTestId,
    ...objExtraProps,
  } as Record<string, string>;
}

function buildSelectDisplayTestIdProps(strTestId: string, objExtraProps?: Record<string, string>) {
  return {
    "data-testid": strTestId,
    ...objExtraProps,
  } as Record<string, string>;
}

function getNextLineOrder(lstLines: SalaryStructureLineFormValue[]) {
  if (lstLines.length === 0) {
    return 10;
  }
  return Math.max(...lstLines.map((dicLine) => dicLine.intLineOrder)) + 10;
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

function formatFlexiAmount(fltValue: number) {
  return fltValue.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function formatOptionalLimit(fltValue: number | null) {
  return fltValue == null ? "" : formatSummaryAmount(fltValue);
}

function sanitizeDecimalInput(strValue: string) {
  const strSanitized = strValue.replace(/[^\d.]/g, "");
  const [strFirstPart, ...lstRestParts] = strSanitized.split(".");
  return lstRestParts.length === 0 ? strFirstPart : `${strFirstPart}.${lstRestParts.join("")}`;
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
  return Boolean(
    dicLine.blnIsFlexiBasketLine
    || normalizeSelectToken(dicLine.strFlexiComponentRole) === "basket"
    || normalizeSelectToken(dicLine.strFlexiComponentRole) === "flexibasket"
    || normalizeSelectToken(dicLine.strComponentCode) === "flexipay"
  );
}

function isFlexiEligibleComponent(dicOption: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return Boolean(
    dicOption.blnIsFlexiBenefit
    && dicOption.blnIncludedInCtc
    && normalizeSelectToken(dicOption.strCode ?? "") !== "flexipay"
  );
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

function getComponentID(dicComponent?: SalaryStructureFormOptions["lstSalaryComponents"][number]) {
  return dicComponent?.intID ?? "";
}

function clampAmountToLimit(strValue: string | number | boolean, fltLimit: number | null) {
  const strAmount = String(strValue ?? "").trim();
  if (!strAmount) {
    return "";
  }
  const fltAmount = Number(strAmount);
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

  const blnCanView = canViewAny();
  const blnCanAdd = canDoAny("add");
  const blnCanEdit = canDoAny("edit");
  const blnReadOnly = strMode === "edit" && blnCanView && !blnCanEdit;
  const blnCanLoadWorkspace = strMode === "add" ? blnCanAdd : blnCanView;
  const blnCanSave = strMode === "add" ? blnCanAdd : blnCanEdit;
  const blnFieldDisabled = blnSaving || blnReadOnly || !blnCanSave;

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
        const objOptions = await salaryStructureService.getFormOptions();
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);

        if (strMode === "edit" && intSalaryStructureID) {
          const dicDetail = await salaryStructureService.getSalaryStructureById(intSalaryStructureID);
          if (!blnMounted) {
            return;
          }
          setDicForm(recalculateSalaryStructureForm(toSalaryStructureFormValues(dicDetail)));
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
  const lstFlexiEligibleComponents = useMemo(() => {
    return (objFormOptions?.lstSalaryComponents ?? []).filter(isFlexiEligibleComponent);
  }, [objFormOptions]);
  const lstFlexiBasketLines = useMemo(() => {
    return dicForm.lstComponents.filter(isFlexiBasketLine);
  }, [dicForm.lstComponents]);
  const dicStructureSummary = useMemo(() => {
    return dicForm.lstComponents.reduce(
      (dicTotals, dicLine) => {
        if (dicLine.intSalaryComponentID === "") {
          return dicTotals;
        }
        const dicComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
        const fltMonthlyAmount = Number(dicLine.fltFixedAmount || 0);
        const fltYearlyAmount = fltMonthlyAmount * 12;
        const blnIncludedInCtc = Boolean(dicComponent?.blnIncludedInCtc ?? dicLine.blnIncludedInCtc);
        const blnIsFlexiBasket = Boolean(dicLine.blnIsFlexiBasketLine || dicComponent?.blnIsFlexiBasket || dicComponent?.strCode === "FLEXI_PAY");
        const strGroup = normalizeSelectToken(String(dicComponent?.strComponentGroup ?? ""));
        const strCategory = normalizeSelectToken(String(dicComponent?.strComponentCategory ?? ""));
        const blnIsEmployerContribution = Boolean(dicComponent?.blnIsEmployerContribution);
        const strFlexiType = normalizeSelectToken(String(dicComponent?.strFlexiComponentType ?? ""));
        if (blnIncludedInCtc) {
          dicTotals.fltTotalCtc += fltYearlyAmount;
        }
        if (blnIsFlexiBasket || strFlexiType === "basket") {
          dicTotals.fltFlexiBasket += fltYearlyAmount;
        } else if (blnIsEmployerContribution || strCategory === "contribution" || strCategory === "employercontribution") {
          dicTotals.fltEmployerContribution += fltYearlyAmount;
        } else if (strGroup === "variablepay") {
          dicTotals.fltVariablePay += fltYearlyAmount;
        } else {
          dicTotals.fltFixedPay += fltYearlyAmount;
        }
        return dicTotals;
      },
      { fltTotalCtc: 0, fltFixedPay: 0, fltVariablePay: 0, fltFlexiBasket: 0, fltEmployerContribution: 0 }
    );
  }, [dicComponentByID, dicForm.lstComponents]);
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objFormOptions?.lstLanguages[0]?.intID ?? 1;
  const intSecondaryLanguageID =
    authHelpers.getSecondaryLanguageID()
    ?? objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID
    ?? intDefaultLanguageID;

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
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strStructureName ?? "",
      dicSecondaryExistingText?.strStructureDescription ?? "",
      dicValues.lstTexts,
    );
    const lstRows = intSecondaryLanguageID === intDefaultLanguageID
      ? [dicDefaultRow]
      : [dicDefaultRow, dicSecondaryRow];
    return {
      ...dicValues,
      lstTexts: ensureUniqueTextRowIDs(lstRows),
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
    return Number(fltValue.toFixed(2)).toString();
  }

  function parseLineAmount(objValue: string | number | boolean | "") {
    const strValue = String(objValue ?? "").trim();
    if (!strValue) {
      return null;
    }
    const fltValue = Number(strValue);
    return Number.isFinite(fltValue) ? fltValue : null;
  }

  function evaluateFormulaExpression(strExpression: string, dicVariables: Record<string, number>) {
    const lstTokens = strExpression.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+\-*/,]/g) ?? [];
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
      if (/^\d/.test(strToken)) {
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
        if (dicCalculatedLine.intSalaryComponentID !== "" && fltResolvedAmount !== null) {
          dicComputedMonthlyByComponentID.set(Number(dicCalculatedLine.intSalaryComponentID), fltResolvedAmount);
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

  function getAutofilledFlexiYearlyAmount(strMonthlyAmount: string | number | boolean, fltAnnualLimit: number | null) {
    const fltMonthlyAmount = parseLineAmount(strMonthlyAmount);
    if (fltMonthlyAmount === null) {
      return "";
    }
    const fltYearlyAmount = fltMonthlyAmount * 12;
    return clampAmountToLimit(formatCalculatedLineAmount(fltYearlyAmount), fltAnnualLimit);
  }

  function updateLineRow(strRowID: string, strField: keyof SalaryStructureLineFormValue, objValue: string | number | boolean) {
    setDicForm((dicPrevious) => {
      const lstUpdatedComponents: SalaryStructureLineFormValue[] = dicPrevious.lstComponents.map((dicLine) => {
        if (dicLine.strRowID !== strRowID) {
          return dicLine;
        }
        if (strField === "intSalaryComponentID") {
          const dicComponent = dicComponentByID.get(Number(objValue));
          const blnIsFlexiBasket = Boolean(dicComponent?.blnIsFlexiBasket || dicComponent?.strCode === "FLEXI_PAY" || dicComponent?.strFlexiComponentType === "basket");
          return {
            ...dicLine,
            intSalaryComponentID: Number(objValue),
            strComponentCode: dicComponent?.strCode ?? "",
            strComponentName: dicComponent?.strLabel ?? "",
            blnIsFlexiBasketLine: blnIsFlexiBasket,
            strFlexiComponentRole: blnIsFlexiBasket ? "basket" : (dicComponent?.strFlexiComponentType ?? "normal"),
            blnIncludedInCtc: Boolean(dicComponent?.blnIncludedInCtc ?? true),
            strComponentCategory: "",
            lstFlexiMappings: blnIsFlexiBasket ? dicLine.lstFlexiMappings : []
          };
        }
        if (strField === "strValueSource") {
          if (objValue === "Fixed") {
            return {
              ...dicLine,
              strValueSource: "Fixed",
              fltPercentageValue: "",
              intBasisComponentID: "",
              strFormulaExpression: ""
            };
          }
          if (objValue === "Percentage") {
            return {
              ...dicLine,
              strValueSource: "Percentage",
              strFormulaExpression: ""
            };
          }
          return {
            ...dicLine,
            strValueSource: "Formula",
            fltFixedAmount: "",
            fltPercentageValue: "",
            intBasisComponentID: "" as const
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
    await translateTextRow(dicSecondaryRow.strRowID, Number(dicSecondaryRow.intLanguageID) || intSecondaryLanguageID);
  }

  useEffect(() => {
    if ((objFormOptions?.lstLanguages ?? []).length === 0) {
      return;
    }
    setDicForm((dicPrevious) => ensureTenantLanguageRows(dicPrevious));
  }, [intDefaultLanguageID, intSecondaryLanguageID, objFormOptions?.lstLanguages.length]);

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
              const strMonthlyAmount = clampAmountToLimit(dicMapping.fltDefaultAmount, getComponentMonthlyLimit(dicComponent));
              return {
                ...dicMapping,
                intFlexiComponentID: parseOptionalSelectNumber(String(objValue)),
                strFlexiComponentCode: dicComponent?.strCode ?? "",
                strFlexiComponentName: dicComponent?.strLabel ?? "",
                fltDefaultAmount: strMonthlyAmount,
                fltMaxAmount: strMonthlyAmount
                  ? getAutofilledFlexiYearlyAmount(strMonthlyAmount, getComponentAnnualLimit(dicComponent))
                  : clampAmountToLimit(dicMapping.fltMaxAmount, getComponentAnnualLimit(dicComponent))
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
              const strAnnualAmount = clampAmountToLimit(objValue, getComponentAnnualLimit(dicComponent));
              return {
                ...dicMapping,
                fltMaxAmount: strAnnualAmount
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
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: [...dicPrevious.lstComponents, createEmptyLineRow(getNextLineOrder(dicPrevious.lstComponents))]
    }));
  }

  function handleRemoveLineRow(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstComponents: dicPrevious.lstComponents.length === 1 ? dicPrevious.lstComponents : dicPrevious.lstComponents.filter((dicLine) => dicLine.strRowID !== strRowID)
    }));
  }

  function validateFlexiMappings() {
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
        if (fltDefaultAmount === null || fltDefaultAmount < 0) {
          return t("flexi_default_amount_non_negative", "Flexi default amount must be 0 or greater.");
        }
        if (fltMaxAmount === null || fltMaxAmount < 0) {
          return t("flexi_yearly_amount_non_negative", "Flexi yearly amount must be 0 or greater.");
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
    const intFlexiBasketCount = lstSelectedComponents.filter((dicLine) => dicLine.strComponentCode === "FLEXI_PAY" || dicLine.blnIsFlexiBasketLine).length;
    if (intFlexiBasketCount > 1) {
      setStrError(t("single_flexi_pay_only", "Only one FLEXI_PAY component is allowed in one salary structure."));
      return;
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
      setDicForm(toSalaryStructureFormValues(dicSavedRecord));
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
              <Typography sx={{ fontSize: { xs: "1.35rem", md: "1.5rem" }, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.15 }}>
                {strMode === "edit"
                  ? t("edit_salary_structure", "Edit Salary Structure")
                  : t("add_salary_structure", "Add Salary Structure")}
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
                data-testid="salary-structures.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push("/salary-structures")}
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
                data-testid="salary-structures.editor.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={handleSave}
                disabled={!blnCanSave || blnSaving}
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

          {strError ? <Alert severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
          {blnReadOnly ? <Alert severity="info">{t("read_only_mode", "You have view-only access for Salary Structure.")}</Alert> : null}
        </Stack>
      </Paper>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
        <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            1. {t("structure_header", "Structure Header")}
          </Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
            <TextField
              label={t("structure_code", "Structure Code")}
              value={dicForm.strStructureCode}
              onChange={(objEvent) => updateRootField("strStructureCode", objEvent.target.value.toUpperCase())}
              disabled={blnFieldDisabled}
              fullWidth
              data-testid="salary-structures.editor.structure-code.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.structure-code.input")}
              required
            />
            <TextField
              label={t("structure_name", "Structure Name")}
              value={dicForm.strStructureName}
              onChange={(objEvent) => syncDefaultStructureText(objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              data-testid="salary-structures.editor.structure-name.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.structure-name.input")}
              required
            />
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
            2. {t("scope_and_dates", "Scope and Dates")}
          </Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(3, minmax(0, 1fr))" } }}>
            <TextField
              select
              label={t("currency", "Currency")}
              value={dicForm.strCurrencyCode}
              onChange={(objEvent) => updateRootField("strCurrencyCode", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              data-testid="salary-structures.editor.currency.select"
              inputProps={buildInputTestIdProps("salary-structures.editor.currency.select")}
              SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.currency.select") }}
            >
              {(objFormOptions?.lstCurrencies ?? []).map((strCurrencyCode) => (
                <MenuItem key={strCurrencyCode} value={strCurrencyCode} data-testid={`salary-structures.editor.currency.${normalizeSelectToken(strCurrencyCode)}.option`}>{strCurrencyCode}</MenuItem>
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
              data-testid="salary-structures.editor.effective-from.input"
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
              data-testid="salary-structures.editor.effective-to.input"
              inputProps={buildInputTestIdProps("salary-structures.editor.effective-to.input")}
            />
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5 }}>
            <FormControlLabel
              control={<Switch checked={dicForm.blnIsDefault} onChange={(objEvent) => updateRootField("blnIsDefault", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-structures.editor.default-structure.switch")} />}
              label={t("default_structure", "Default Structure")}
            />
            <FormControlLabel
              control={<ActiveStatusSwitch testId="salary-structures.editor.active-structure.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateRootField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
              label={t("active_structure", "Active Structure")}
            />
          </Stack>
        </Paper>
      </Box>

      <Box>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" } }}>
          <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
            <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ borderBottom: "1px solid #d9e6ef", px: 2, py: 1.2 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
                  3. {t("component_line_configuration", "Component Line Configuration")}
                </Typography>
                <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
                  {t(
                    "component_line_configuration_help",
                    "Configure line order, value source, fixed or percentage rules, basis components, formula logic, range controls, and active flags in the same master-grid style."
                  )}
                </Typography>
              </Box>
              <Button className={styles.primaryButton} startIcon={<AddRoundedIcon />}
                data-testid="salary-structures.editor.add-line.button"
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
          <Box sx={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ left: 0, minWidth: 106, position: "sticky", zIndex: 4 }}>{t("line_order", "Line Order")}</th>
                  <th style={{ left: 106, minWidth: 250, position: "sticky", zIndex: 4 }}>{t("salary_component", "Salary Component")}</th>
                  <th>{t("flexi_role", "Flexi Role")}</th>
                  <th>{t("value_source", "Value Source")}</th>
                  <th>{t("monthly_amount", "Monthly Amount")}</th>
                  <th>{t("yearly_amount", "Yearly Amount")}</th>
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
                {dicForm.lstComponents.map((dicLine) => {
                  const fltLineMonthlyAmount = parseLineAmount(dicLine.fltFixedAmount) ?? 0;
                  const strLineYearlyAmount = formatSummaryAmount(fltLineMonthlyAmount * 12);
                  return (
                  <tr key={dicLine.strRowID}>
                    <td style={{ background: "#ffffff", left: 0, position: "sticky", zIndex: 2 }}>
                      <TextField
                        type="number"
                        size="small"
                        value={dicLine.intLineOrder}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intLineOrder", Number(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.line-order.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.line-order.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ width: 86 }}
                      />
                    </td>
                    <td style={{ background: "#ffffff", left: 106, position: "sticky", zIndex: 2 }}>
                      <TextField
                        select
                        size="small"
                        value={dicLine.intSalaryComponentID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intSalaryComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.salary-component.select"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.salary-component.select", { "data-row-key": dicLine.strRowID })}
                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.salary-component.select", { "data-row-key": dicLine.strRowID }) }}
                        sx={{ width: 230 }}
                      >
                        {(objFormOptions?.lstSalaryComponents ?? []).map((dicOption) => (
                          <MenuItem key={dicOption.intID} value={dicOption.intID} data-testid={`salary-structures.editor.line.salary-component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                            {dicOption.strLabel}
                          </MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <Typography sx={{ width: 76, fontSize: "0.8rem", fontWeight: dicLine.blnIsFlexiBasketLine ? 800 : 600, color: dicLine.blnIsFlexiBasketLine ? "#0f766e" : "#64748b" }}>
                        {dicLine.blnIsFlexiBasketLine ? t("flexi_basket", "Flexi Basket") : t("normal_component", "Normal")}
                      </Typography>
                    </td>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.strValueSource}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strValueSource", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.value-source.select"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.value-source.select", { "data-row-key": dicLine.strRowID })}
                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.value-source.select", { "data-row-key": dicLine.strRowID }) }}
                        sx={{ minWidth: 150 }}
                      >
                        {(objFormOptions?.lstValueSources ?? []).map((strValueSource) => (
                          <MenuItem key={strValueSource} value={strValueSource} data-testid={`salary-structures.editor.line.value-source.${normalizeSelectToken(strValueSource)}.option`}>{strValueSource}</MenuItem>
                        ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltFixedAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltFixedAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Fixed"}
                        data-testid="salary-structures.editor.line.fixed-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.fixed-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 130 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={strLineYearlyAmount}
                        disabled
                        data-testid="salary-structures.editor.line.yearly-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.yearly-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 140 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltPercentageValue}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltPercentageValue", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Percentage"}
                        data-testid="salary-structures.editor.line.percentage-value.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.percentage-value.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ width: 55 }}
                      />
                    </td>
                    <td>
                      <TextField
                        select
                        size="small"
                        value={dicLine.intBasisComponentID}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "intBasisComponentID", parseOptionalSelectNumber(objEvent.target.value))}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Percentage"}
                        data-testid="salary-structures.editor.line.basis-component.select"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.basis-component.select", { "data-row-key": dicLine.strRowID })}
                        SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.line.basis-component.select", { "data-row-key": dicLine.strRowID }) }}
                        sx={{ minWidth: 210 }}
                      >
                        <MenuItem value="" data-testid="salary-structures.editor.line.basis-component.none.option">{t("none", "None")}</MenuItem>
                        {dicForm.lstComponents
                          .filter((dicBasis) => dicBasis.strRowID !== dicLine.strRowID && dicBasis.intSalaryComponentID !== "")
                          .map((dicBasis) => (
                            <MenuItem key={dicBasis.strRowID} value={Number(dicBasis.intSalaryComponentID)} data-testid={`salary-structures.editor.line.basis-component.${normalizeSelectToken(dicBasis.strComponentCode || dicBasis.strComponentName)}.option`}>
                              {dicBasis.strComponentCode ? `${dicBasis.strComponentCode} - ${dicBasis.strComponentName}` : dicBasis.strComponentName}
                            </MenuItem>
                          ))}
                      </TextField>
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.strFormulaExpression}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "strFormulaExpression", objEvent.target.value)}
                        disabled={blnFieldDisabled || dicLine.strValueSource !== "Formula"}
                        data-testid="salary-structures.editor.line.formula.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.formula.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 210 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltMinAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMinAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.min-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.min-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 120 }}
                      />
                    </td>
                    <td>
                      <TextField
                        size="small"
                        value={dicLine.fltMaxAmount}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "fltMaxAmount", objEvent.target.value)}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.max-amount.input"
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.max-amount.input", { "data-row-key": dicLine.strRowID })}
                        sx={{ minWidth: 120 }}
                      />
                    </td>
                    <td>
                      <Switch
                        checked={dicLine.blnIsMandatory}
                        onChange={(objEvent) => updateLineRow(dicLine.strRowID, "blnIsMandatory", objEvent.target.checked)}
                        disabled={blnFieldDisabled}
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.mandatory.switch", { "data-row-key": dicLine.strRowID })}
                      />
                    </td>
                    <td>
                      <ActiveStatusSwitch
                        blnIsActive={dicLine.blnIsActive}
                        onChange={(blnChecked) => updateLineRow(dicLine.strRowID, "blnIsActive", blnChecked)}
                        disabled={blnFieldDisabled}
                        inputProps={buildInputTestIdProps("salary-structures.editor.line.active.switch", { "data-row-key": dicLine.strRowID })}
                      />
                    </td>
                    <td>
                      <IconButton
                        color="error"
                        onClick={() => handleRemoveLineRow(dicLine.strRowID)}
                        disabled={blnFieldDisabled}
                        data-testid="salary-structures.editor.line.remove.button"
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
              {t("salary_breakdown_impact", "Salary Breakdown Impact")}
            </Typography>
            <Stack spacing={1.6}>
              {[
                [t("annual_ctc", "Annual CTC"), formatFlexiAmount(dicStructureSummary.fltTotalCtc), "#0757b8"],
                [t("fixed_pay", "Fixed Pay"), formatFlexiAmount(dicStructureSummary.fltFixedPay), "#0f172a"],
                [t("variable_pay", "Variable Pay"), formatFlexiAmount(dicStructureSummary.fltVariablePay), "#0f172a"],
                [t("flexi_basket", "Flexi Basket"), formatFlexiAmount(dicStructureSummary.fltFlexiBasket), "#067647"],
                [t("employee_contribution", "Employee Contribution"), formatFlexiAmount(dicStructureSummary.fltEmployerContribution), "#0f172a"],
              ].map(([strLabel, strValue, strColor]) => (
                <Stack key={strLabel} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: "#172554", fontSize: "0.84rem" }}>{strLabel}</Typography>
                  <Typography sx={{ color: strColor, fontSize: "0.84rem", fontWeight: 800 }}>₹ {strValue}</Typography>
                </Stack>
              ))}
              <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1.4 }}>
                <Stack direction="row" spacing={0.8} alignItems="flex-start">
                  <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                  <Typography sx={{ color: "#172554", fontSize: "0.78rem", lineHeight: 1.45 }}>
                    {t("salary_breakdown_impact_help", "Amounts are recalculated in real time based on your declarations. Final impact will be reflected in employee payslip.")}
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
                const fltBasketMonthlyAmount = parseLineAmount(dicLine.fltFixedAmount) ?? 0;
                const fltBasketYearlyAmount = fltBasketMonthlyAmount * 12;
                const fltAllocatedMonthlyAmount = dicLine.lstFlexiMappings.reduce((fltTotal, dicMapping) => fltTotal + (parseLineAmount(dicMapping.fltDefaultAmount) ?? 0), 0);
                const fltAllocatedYearlyAmount = dicLine.lstFlexiMappings.reduce((fltTotal, dicMapping) => fltTotal + (parseLineAmount(dicMapping.fltMaxAmount) ?? 0), 0);
                const fltPendingMonthlyAmount = Math.max(fltBasketMonthlyAmount - fltAllocatedMonthlyAmount, 0);
                const fltPendingYearlyAmount = Math.max(fltBasketYearlyAmount - fltAllocatedYearlyAmount, 0);
                const dicFlexiPayComponent = dicComponentByID.get(Number(dicLine.intSalaryComponentID));
                const intResidualComponentID = Number(dicFlexiPayComponent?.intResidualComponentID);
                const dicResidualComponent = Number.isFinite(intResidualComponentID) && intResidualComponentID > 0
                  ? (dicComponentByID.get(intResidualComponentID)
                    ?? (objFormOptions?.lstSalaryComponents ?? []).find((dicComponent) => Number(getComponentID(dicComponent)) === intResidualComponentID))
                  : undefined;
                const strResidualComponentName = dicResidualComponent?.strLabel
                  ?? (dicFlexiPayComponent?.intResidualComponentID ? t("residual_component_not_found", "Residual component not found") : "")
                  ?? "";
                return (
                <Box key={dicLine.strRowID}>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 300px" } }}>
                    <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", overflow: "hidden" }}>
                      <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" spacing={1.5} sx={{ borderBottom: "1px solid #d9e6ef", px: 2, py: 1.2 }}>
                        <Box>
                          <Typography sx={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 800 }}>
                            4. {t("flexi_components", "Flexi Components")}
                          </Typography>
                          <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mt: 0.35 }}>
                            {t("flexi_components_declaration_standard_help", "Map employee-selectable flexi benefits and monthly declaration limits as per payroll and tax declaration policy.")}
                          </Typography>
                        </Box>
                        <Button
                          className={styles.primaryButton}
                          startIcon={<AddRoundedIcon />}
                          onClick={() => handleAddFlexiMappingRow(dicLine.strRowID)}
                          disabled={blnFieldDisabled || lstFlexiEligibleComponents.length === 0}
                          data-testid="salary-structures.editor.flexi-mapping.add.button"
                          data-row-key={dicLine.strRowID}
                        >
                          {t("add_flexi_component", "Add")}
                        </Button>
                      </Stack>
                      <Box sx={{ overflowX: "auto" }}>
                        <Box component="table" sx={{ borderCollapse: "collapse", minWidth: 760, width: "100%" }}>
                          <Box component="thead" sx={{ "& th": { borderBottom: "1px solid #d9e6ef", color: "#0f172a", fontSize: "0.77rem", fontWeight: 700, px: 2, py: 1.2, textAlign: "left", whiteSpace: "nowrap" } }}>
                            <tr>
                              <th>{t("component", "Component")}</th>
                              <th>{t("monthly_equivalent", "Monthly Equivalent")} (₹)</th>
                              <th>{t("declared_annual", "Declared Annual")} (₹)</th>
                              <th>{t("proof_required", "Proof Required")}</th>
                              <th>{t("status", "Status")}</th>
                              <th>{t("action", "Action")}</th>
                            </tr>
                          </Box>
                          <Box component="tbody" sx={{ "& td": { borderBottom: "1px solid #d9e6ef", color: "#172554", fontSize: "0.84rem", px: 2, py: 1.15, verticalAlign: "middle", whiteSpace: "nowrap" } }}>
                            {dicLine.lstFlexiMappings.length === 0 ? (
                              <tr>
                                <td className={styles.emptyState} colSpan={6}>{t("no_flexi_components_mapped", "No flexi components mapped.")}</td>
                              </tr>
                            ) : dicLine.lstFlexiMappings.map((dicMapping) => {
                              const dicFlexiComponent = dicComponentByID.get(Number(dicMapping.intFlexiComponentID));
                              const fltMonthlyLimit = getComponentMonthlyLimit(dicFlexiComponent);
                              const fltDeclaredAnnual = parseLineAmount(dicMapping.fltMaxAmount) ?? 0;
                              return (
                              <tr key={dicMapping.strRowID}>
                                <td>
                                  <Stack direction="row" spacing={1.15} alignItems="center">
                                    <Box sx={{ alignItems: "center", background: "#eaf3ff", border: "1px solid #cfe3ff", borderRadius: "4px", color: "#0b57b7", display: "inline-flex", height: 34, justifyContent: "center", width: 34 }}>
                                      {getFlexiComponentIcon(dicFlexiComponent?.strLabel || dicMapping.strFlexiComponentName || "")}
                                    </Box>
                                    <TextField
                                      select
                                      size="small"
                                      value={dicMapping.intFlexiComponentID}
                                      onChange={(objEvent) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "intFlexiComponentID", objEvent.target.value)}
                                      disabled={blnFieldDisabled}
                                      data-testid="salary-structures.editor.flexi-mapping.component.select"
                                      inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.component.select", { "data-row-key": dicMapping.strRowID })}
                                      SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.flexi-mapping.component.select", { "data-row-key": dicMapping.strRowID }) }}
                                      sx={{ minWidth: 200, "& .MuiSelect-select": { fontSize: "0.84rem" } }}
                                    >
                                      <MenuItem value="" data-testid="salary-structures.editor.flexi-mapping.component.none.option">{t("select_component", "Select Component")}</MenuItem>
                                      {lstFlexiEligibleComponents.map((dicOption) => (
                                        <MenuItem key={dicOption.intID} value={dicOption.intID} data-testid={`salary-structures.editor.flexi-mapping.component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                                          {dicOption.strLabel}
                                        </MenuItem>
                                      ))}
                                    </TextField>
                                  </Stack>
                                </td>
                                <td>
                                  <TextField
                                    size="small"
                                    value={dicMapping.fltDefaultAmount}
                                    onChange={(objEvent) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "fltDefaultAmount", objEvent.target.value)}
                                    disabled={blnFieldDisabled}
                                    data-testid="salary-structures.editor.flexi-mapping.default-amount.input"
                                    inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.default-amount.input", {
                                      "data-row-key": dicMapping.strRowID,
                                      inputMode: "decimal",
                                      pattern: "[0-9]*[.]?[0-9]*",
                                      ...(fltMonthlyLimit != null ? { max: String(fltMonthlyLimit) } : {})
                                    })}
                                    sx={{ width: 126, "& .MuiInputBase-input": { fontSize: "0.84rem", py: 0.9 } }}
                                  />
                                </td>
                                <td>{formatFlexiAmount(fltDeclaredAnnual)}</td>
                                <td>{dicFlexiComponent?.blnProofRequired ? t("yes", "Yes") : t("no", "No")}</td>
                                <td>
                                  <Box sx={{ background: dicMapping.blnIsActive ? "#dcf8e8" : "#dbeafe", borderRadius: "4px", color: dicMapping.blnIsActive ? "#067647" : "#0757b8", display: "inline-flex", fontSize: "0.75rem", fontWeight: 700, px: 1, py: 0.45 }}>
                                    {dicMapping.blnIsActive ? t("allocated", "Allocated") : t("not_allocated", "Not Allocated")}
                                  </Box>
                                </td>
                                <td>
                                  <Stack direction="row" spacing={0.35} alignItems="center">
                                    <ActiveStatusSwitch
                                      blnIsActive={dicMapping.blnIsActive}
                                      onChange={(blnChecked) => updateFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID, "blnIsActive", blnChecked)}
                                      disabled={blnFieldDisabled}
                                      inputProps={buildInputTestIdProps("salary-structures.editor.flexi-mapping.active.switch", { "data-row-key": dicMapping.strRowID })}
                                    />
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleRemoveFlexiMappingRow(dicLine.strRowID, dicMapping.strRowID)}
                                      disabled={blnFieldDisabled}
                                      data-testid="salary-structures.editor.flexi-mapping.remove.button"
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
                          {t("monthly_declarations_calculate_annual", "Monthly declarations are used to calculate declared annual amounts.")}
                        </Typography>
                      </Stack>
                    </Paper>
                    <Paper variant="outlined" sx={{ alignSelf: "start", borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
                      <Typography sx={{ color: "#0f172a", fontSize: "0.95rem", fontWeight: 800, mb: 2 }}>
                        {t("flexi_basket_summary", "Flexi Basket Summary")}
                      </Typography>
                      <Stack spacing={1.6}>
                        {[
                          [t("basket_available", "Basket Available"), formatFlexiAmount(fltBasketYearlyAmount), "#0f172a"],
                          [t("allocated", "Allocated"), formatFlexiAmount(fltAllocatedYearlyAmount), "#067647"],
                          [t("balance", "Balance"), formatFlexiAmount(fltPendingYearlyAmount), "#0f172a"],
                        ].map(([strLabel, strValue, strColor]) => (
                          <Stack key={strLabel} direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ color: "#172554", fontSize: "0.84rem" }}>{strLabel}</Typography>
                            <Typography sx={{ color: strColor, fontSize: "0.84rem", fontWeight: 800 }}>₹ {strValue}</Typography>
                          </Stack>
                        ))}
                        <Box sx={{ borderTop: "1px solid #d9e6ef", pt: 1.6 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography sx={{ color: "#172554", fontSize: "0.84rem" }}>{t("residual_taxable_amount", "Residual Taxable Amount")}</Typography>
                              <InfoOutlinedIcon sx={{ color: "#64748b", fontSize: 16 }} />
                            </Stack>
                            <Typography sx={{ color: "#0757b8", fontSize: "0.84rem", fontWeight: 800 }}>₹ {formatFlexiAmount(fltPendingYearlyAmount)}</Typography>
                          </Stack>
                          {strResidualComponentName ? (
                            <Typography sx={{ color: "#64748b", fontSize: "0.76rem", mt: 0.6 }}>
                              {t("residual_component", "Residual Component")}: {strResidualComponentName}
                            </Typography>
                          ) : null}
                        </Box>
                        <Box sx={{ background: "#eef6ff", border: "1px solid #cfe3ff", borderRadius: "6px", p: 1.4 }}>
                          <Stack direction="row" spacing={0.8} alignItems="flex-start">
                            <InfoOutlinedIcon sx={{ color: "#0757b8", fontSize: 18, mt: 0.1 }} />
                            <Box>
                              <Typography sx={{ color: "#0757b8", fontSize: "0.82rem", fontWeight: 800 }}>
                                {t("payroll_impact", "Payroll Impact")}
                              </Typography>
                              <Typography sx={{ color: "#172554", fontSize: "0.78rem", lineHeight: 1.45, mt: 0.4 }}>
                                {t("flexi_payroll_impact_help", "Final allocated amount will be considered for payroll calculation and payroll processing.")}
                              </Typography>
                            </Box>
                          </Stack>
                        </Box>
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

      <Paper variant="outlined" sx={{ borderColor: "#d9e6ef", borderRadius: "8px", boxShadow: "0 1px 5px rgba(15, 23, 42, 0.08)", p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
              5. {t("multilingual_text", "Multilingual Text")}
            </Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t(
                "multilingual_text_help",
                "Maintain translated structure names and descriptions without exposing system fields."
              )}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
            <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} disabled data-testid="salary-structures.editor.multilingual.add-language.button">
              {t("add_language", "Add Language")}
            </Button>
            <Button
              className={styles.primaryButton}
              onClick={() => void handleTranslateClick()}
              disabled={blnFieldDisabled || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
              data-testid="salary-structures.editor.multilingual.translate.button"
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
                alignItems: "start",
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
                data-testid="salary-structures.editor.multilingual.language.select"
                inputProps={buildInputTestIdProps("salary-structures.editor.multilingual.language.select", { "data-row-key": dicText.strRowID })}
                SelectProps={{ SelectDisplayProps: buildSelectDisplayTestIdProps("salary-structures.editor.multilingual.language.select", { "data-row-key": dicText.strRowID }) }}
              >
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID} data-testid={`salary-structures.editor.multilingual.language.${dicLanguage.intID}.option`}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("structure_name", "Structure Name")}
                value={dicText.strStructureName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strStructureName", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                data-testid="salary-structures.editor.multilingual.structure-name.input"
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
                data-testid="salary-structures.editor.multilingual.description.input"
                inputProps={buildInputTestIdProps("salary-structures.editor.multilingual.description.input", { "data-row-key": dicText.strRowID })}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} disabled data-testid="salary-structures.editor.multilingual.remove.button" data-row-key={dicText.strRowID} sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
