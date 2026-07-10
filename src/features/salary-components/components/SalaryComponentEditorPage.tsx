"use client";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useMemo, useState, type Dispatch, type InputHTMLAttributes, type SetStateAction } from "react";
import { useRouter } from "next/navigation";

import ActiveStatusSwitch from "@/components/master/ActiveStatusSwitch";
import styles from "@/components/master/MasterScreen.module.css";
import { useModuleActionAccess } from "@/features/security/hooks/useModuleActionAccess";
import { useSalaryComponentLabels } from "@/features/salary-components/hooks/useSalaryComponentLabels";
import {
  createEmptySalaryComponentFlexiEligibilityRuleRow,
  createEmptySalaryComponentTextRow,
  createInitialSalaryComponentForm,
  salaryComponentService,
  toSalaryComponentFormValues
} from "@/features/salary-components/services/salaryComponentService";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryComponentDetailRecord,
  SalaryComponentFlexiEligibilityQuestion,
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
  SalaryComponentLookupOption,
  SalaryComponentTextFormValue
} from "@/features/salary-components/types";

type SalaryComponentEditorPageProps = {
  strMode: "add" | "edit";
  intSalaryComponentID?: number;
  strBackRoute?: string;
};

const lstSalaryComponentModuleCodes = ["SALARY_COMPONENT", "SALARY_COMPONENTS", "MASTER_SALARY_COMPONENT"];

function parseMultiSelectNumberValues(objValue: string | string[]) {
  const lstRawValues = Array.isArray(objValue) ? objValue : objValue.split(",");
  return lstRawValues
    .map((strValue) => Number(strValue))
    .filter((intValue) => Number.isInteger(intValue) && intValue > 0);
}

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function resolveSelectValue(lstOptions: string[], strValue: string | null | undefined) {
  if (!strValue) {
    return "";
  }
  const strNormalizedValue = normalizeSelectToken(strValue);
  const strMatchedValue = lstOptions.find(
    (strOption) => normalizeSelectToken(strOption) === strNormalizedValue
  );
  return strMatchedValue ?? strValue;
}

function normalizeLookupToken(strValue: string | null | undefined) {
  return normalizeSelectToken(strValue ?? "");
}

function findLookupOption(
  lstOptions: SalaryComponentLookupOption[] | undefined,
  intID: number | "",
) {
  if (intID !== "") {
    return lstOptions?.find((dicOption) => dicOption.intID === intID);
  }
  return undefined;
}

function findLookupOptionByValue(
  lstOptions: SalaryComponentLookupOption[] | undefined,
  strValue?: string | null,
) {
  const strNormalizedValue = normalizeLookupToken(strValue);
  if (!strNormalizedValue) {
    return undefined;
  }

  return lstOptions?.find((dicOption) => (
    normalizeLookupToken(dicOption.strValueCode) === strNormalizedValue
    || normalizeLookupToken(dicOption.strDisplayName) === strNormalizedValue
    || normalizeLookupToken(dicOption.strLegacyValue) === strNormalizedValue
  ));
}

function resolveLookupCode(
  lstOptions: SalaryComponentLookupOption[] | undefined,
  intID: number | "",
) {
  return findLookupOption(lstOptions, intID)?.strValueCode ?? "";
}

function resolveLookupID(
  lstOptions: SalaryComponentLookupOption[] | undefined,
  strValue?: string | null,
) {
  return findLookupOptionByValue(lstOptions, strValue)?.intID ?? "";
}

function syncLookupBackedFields(
  dicValues: SalaryComponentFormValues,
  objOptions: SalaryComponentFormOptions,
  blnUseTextFallback = true,
): SalaryComponentFormValues {
  type LookupIDField =
    | "intComponentCategoryID"
    | "intComponentGroupID"
    | "intCalcMethodID"
    | "intRoundingRuleID"
    | "intDefaultPeriodicityID"
    | "intTaxTreatmentID"
    | "intReimbursementTypeID"
    | "intSettlementMethodID"
    | "intClaimLimitTypeID"
    | "intPayslipSectionID";
  type LookupTextField =
    | "strComponentCategory"
    | "strComponentGroup"
    | "strCalcMethod"
    | "strRoundingRule"
    | "strDefaultPeriodicity"
    | "strTaxTreatment"
    | "strReimbursementType"
    | "strSettlementMethod"
    | "strClaimLimitType"
    | "strPayslipSection";

  const lstFieldMappings: Array<{
    strIDField: LookupIDField;
    strLegacyField: LookupTextField;
    lstOptions: SalaryComponentLookupOption[] | undefined;
  }> = [
    {
      strIDField: "intComponentCategoryID",
      strLegacyField: "strComponentCategory",
      lstOptions: objOptions.lstComponentCategoryLookups,
    },
    {
      strIDField: "intComponentGroupID",
      strLegacyField: "strComponentGroup",
      lstOptions: objOptions.lstComponentGroupLookups,
    },
    {
      strIDField: "intCalcMethodID",
      strLegacyField: "strCalcMethod",
      lstOptions: objOptions.lstCalcMethodLookups,
    },
    {
      strIDField: "intRoundingRuleID",
      strLegacyField: "strRoundingRule",
      lstOptions: objOptions.lstRoundingRuleLookups,
    },
    {
      strIDField: "intDefaultPeriodicityID",
      strLegacyField: "strDefaultPeriodicity",
      lstOptions: objOptions.lstDefaultPeriodicityLookups,
    },
    {
      strIDField: "intTaxTreatmentID",
      strLegacyField: "strTaxTreatment",
      lstOptions: objOptions.lstTaxTreatmentLookups,
    },
    {
      strIDField: "intReimbursementTypeID",
      strLegacyField: "strReimbursementType",
      lstOptions: objOptions.lstReimbursementTypeLookups,
    },
    {
      strIDField: "intSettlementMethodID",
      strLegacyField: "strSettlementMethod",
      lstOptions: objOptions.lstSettlementMethodLookups,
    },
    {
      strIDField: "intClaimLimitTypeID",
      strLegacyField: "strClaimLimitType",
      lstOptions: objOptions.lstClaimLimitTypeLookups,
    },
    {
      strIDField: "intPayslipSectionID",
      strLegacyField: "strPayslipSection",
      lstOptions: objOptions.lstPayslipSectionLookups,
    },
  ];

  const dicNextValues = { ...dicValues };
  function applyLookupField<TIDField extends LookupIDField, TTextField extends LookupTextField>(
    strIDField: TIDField,
    strLegacyField: TTextField,
    lstOptions: SalaryComponentLookupOption[] | undefined,
  ) {
    const dicOptionFromID = findLookupOption(lstOptions, dicNextValues[strIDField]);
    const dicOptionFromValue = blnUseTextFallback
      ? findLookupOptionByValue(
          lstOptions,
          dicNextValues[strLegacyField],
        )
      : undefined;
    const dicOption = dicOptionFromID ?? dicOptionFromValue;
    if (!dicOption) {
      return;
    }
    dicNextValues[strIDField] = dicOption.intID as SalaryComponentFormValues[TIDField];
    dicNextValues[strLegacyField] = (
      dicOption.strLegacyValue
      ?? dicOption.strDisplayName
      ?? dicOption.strValueCode
    ) as SalaryComponentFormValues[TTextField];
  }

  lstFieldMappings.forEach(({ strIDField, strLegacyField, lstOptions }) => {
    applyLookupField(strIDField, strLegacyField, lstOptions);
  });

  return dicNextValues;
}

function haveLookupBackedFieldsChanged(
  dicPrevious: SalaryComponentFormValues,
  dicNext: SalaryComponentFormValues,
) {
  return (
    dicPrevious.intComponentCategoryID !== dicNext.intComponentCategoryID
    || dicPrevious.strComponentCategory !== dicNext.strComponentCategory
    || dicPrevious.intComponentGroupID !== dicNext.intComponentGroupID
    || dicPrevious.strComponentGroup !== dicNext.strComponentGroup
    || dicPrevious.intCalcMethodID !== dicNext.intCalcMethodID
    || dicPrevious.strCalcMethod !== dicNext.strCalcMethod
    || dicPrevious.intRoundingRuleID !== dicNext.intRoundingRuleID
    || dicPrevious.strRoundingRule !== dicNext.strRoundingRule
    || dicPrevious.intDefaultPeriodicityID !== dicNext.intDefaultPeriodicityID
    || dicPrevious.strDefaultPeriodicity !== dicNext.strDefaultPeriodicity
    || dicPrevious.intTaxTreatmentID !== dicNext.intTaxTreatmentID
    || dicPrevious.strTaxTreatment !== dicNext.strTaxTreatment
    || dicPrevious.intReimbursementTypeID !== dicNext.intReimbursementTypeID
    || dicPrevious.strReimbursementType !== dicNext.strReimbursementType
    || dicPrevious.intSettlementMethodID !== dicNext.intSettlementMethodID
    || dicPrevious.strSettlementMethod !== dicNext.strSettlementMethod
    || dicPrevious.intClaimLimitTypeID !== dicNext.intClaimLimitTypeID
    || dicPrevious.strClaimLimitType !== dicNext.strClaimLimitType
    || dicPrevious.intPayslipSectionID !== dicNext.intPayslipSectionID
    || dicPrevious.strPayslipSection !== dicNext.strPayslipSection
  );
}

function handleLookupSelection(
  setDicForm: Dispatch<SetStateAction<SalaryComponentFormValues>>,
  strIDField: keyof SalaryComponentFormValues,
  strLegacyField: keyof SalaryComponentFormValues,
  lstOptions: SalaryComponentLookupOption[] | undefined,
  intSelectedID: number | "",
) {
  const dicOption = findLookupOption(lstOptions, intSelectedID);
  setDicForm((dicPrevious) => ({
    ...dicPrevious,
    [strIDField]: intSelectedID,
    [strLegacyField]: dicOption?.strLegacyValue ?? dicOption?.strDisplayName ?? dicOption?.strValueCode ?? "",
  }));
}

function buildInputTestIdProps(strTestId: string) {
  return {
    "data-controlid": strTestId,
  } as InputHTMLAttributes<HTMLInputElement>;
}

function buildSelectTestIdProps(strTestId: string) {
  return {
    "data-controlid": strTestId,
    inputProps: buildInputTestIdProps(strTestId),
  };
}

function getCategoryLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "earning":
      return "Earning";
    case "deduction":
      return "Deduction";
    case "employer":
    case "employercontribution":
    case "contribution":
      return "Employer Contribution";
    case "flexibucket":
    case "flexibasket":
      return "Flexi Bucket";
    case "reimbursement":
      return "Reimbursement";
    case "information":
      return "Information";
    default:
      return strValue;
  }
}

function isCategory(strValue: string, strExpected: string) {
  return normalizeSelectToken(strValue) === normalizeSelectToken(strExpected);
}

function isCalculationMethod(strValue: string, ...lstExpected: string[]) {
  const strNormalized = normalizeSelectToken(strValue);
  return lstExpected.some((strExpected) => strNormalized === normalizeSelectToken(strExpected));
}

function getDefaultOperatorForAnswerType(strAnswerType: string | null | undefined) {
  return strAnswerType === "number" ? "greater_than_or_equal" : "equals";
}

function getRuleConditionOptions(strAnswerType: string | null | undefined) {
  if (strAnswerType === "number") {
    return [
      { value: "greater_than_or_equal", label: "At least" },
      { value: "greater_than", label: "More than" },
      { value: "less_than_or_equal", label: "At most" },
      { value: "less_than", label: "Less than" },
      { value: "between", label: "Between" },
    ];
  }
  return [
    { value: "equals", label: "Is" },
    { value: "not_equals", label: "Is not" },
  ];
}

function getWageTypeLabel(strValue: "wages" | "nonWages") {
  return strValue === "wages" ? "Wage Component" : "Non-Wage Component";
}

function getTaxTreatmentLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "taxable":
      return "Taxable";
    case "exempt":
      return "Exempt";
    case "partialexempt":
      return "Partially Exempt";
    case "pretax":
      return "Pre-Tax Deduction";
    case "nontaxable":
    case "nontax":
      return "Non-Taxable";
    case "deferred":
      return "Deferred";
    default:
      return strValue;
  }
}

function getPayslipSectionLabel(strValue: string) {
  switch (normalizeSelectToken(strValue)) {
    case "earnings":
      return "Earnings";
    case "deductions":
      return "Deductions";
    case "reimbursements":
      return "Reimbursements";
    case "information":
      return "Information";
    case "employercontributions":
      return "Employer Contributions";
    default:
      return strValue;
  }
}

function resolveEligibilityQuestionLabel(dicQuestion: SalaryComponentFlexiEligibilityQuestion | undefined, intLanguageID: number) {
  if (!dicQuestion) {
    return "";
  }
  return dicQuestion.lstTexts.find((dicText) => dicText.intLanguageID === intLanguageID)?.strQuestionLabel
    ?? dicQuestion.strDefaultLabel;
}

function resolveEligibilityQuestionHelpText(dicQuestion: SalaryComponentFlexiEligibilityQuestion | undefined, intLanguageID: number) {
  if (!dicQuestion) {
    return "";
  }
  return dicQuestion.lstTexts.find((dicText) => dicText.intLanguageID === intLanguageID)?.strHelpText
    ?? dicQuestion.strDefaultHelpText
    ?? "";
}

function deriveCtcTreatment(dicValues: SalaryComponentFormValues) {
  if (isCategory(dicValues.strComponentCategory, "deduction") || isCategory(dicValues.strComponentCategory, "information")) {
    return false;
  }
  if (
    isCategory(dicValues.strComponentCategory, "earning")
    || isCategory(dicValues.strComponentCategory, "employer contribution")
    || isCategory(dicValues.strComponentCategory, "contribution")
    || isCategory(dicValues.strComponentCategory, "flexi bucket")
    || isCategory(dicValues.strComponentCategory, "flexi basket")
  ) {
    return true;
  }
  if (isCategory(dicValues.strComponentCategory, "reimbursement")) {
    return dicValues.blnIsFlexiBenefit || dicValues.strReimbursementType === "ctc_based";
  }
  return Boolean(dicValues.blnIncludedInCtc);
}

export default function SalaryComponentEditorPage({
  strMode,
  intSalaryComponentID,
  strBackRoute
}: SalaryComponentEditorPageProps) {
  const objRouter = useRouter();
  const { t } = useSalaryComponentLabels();
  const { blnLoading: blnRightsLoading, strError: strRightsError, canDoAny, canViewAny } = useModuleActionAccess(lstSalaryComponentModuleCodes);
  const [intCurrentLanguageID, setIntCurrentLanguageID] = useState<number | null>(() => authHelpers.getLanguageID());
  const [objFormOptions, setObjFormOptions] = useState<SalaryComponentFormOptions | null>(null);
  const [dicForm, setDicForm] = useState<SalaryComponentFormValues>(createInitialSalaryComponentForm());
  const [objDetail, setObjDetail] = useState<SalaryComponentDetailRecord | null>(null);
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
  const strResolvedBackRoute = strBackRoute?.startsWith("/") ? strBackRoute : "/salary-components";

  useEffect(() => {
    function syncLanguage() {
      setIntCurrentLanguageID(authHelpers.getLanguageID());
    }

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("hrms:language-changed", syncLanguage as EventListener);
    return () => {
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("hrms:language-changed", syncLanguage as EventListener);
    };
  }, []);

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
        const objOptions = await salaryComponentService.getFormOptions(intCurrentLanguageID);
        if (!blnMounted) {
          return;
        }
        setObjFormOptions(objOptions);
        if (strMode === "edit" && intSalaryComponentID) {
          const dicDetail = await salaryComponentService.getSalaryComponentById(intSalaryComponentID);
          if (!blnMounted) {
            return;
          }
          setObjDetail(dicDetail);
          setDicForm(
            syncLookupBackedFields(
              ensureTenantLanguageRows(toSalaryComponentFormValues(dicDetail)),
              objOptions,
              false
            )
          );
        } else {
          const intEnglishID = objOptions.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "en")?.intID ?? objOptions.lstLanguages[0]?.intID ?? "";
          setDicForm((dicPrevious) => syncLookupBackedFields({
            ...dicPrevious,
            lstTexts: dicPrevious.lstTexts.map((dicText, intIndex) => intIndex === 0
              ? {
                  ...dicText,
                  intLanguageID: intEnglishID,
                  strLanguageName: objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intEnglishID)?.strLabel ?? ""
                }
              : dicText)
          }, objOptions));
        }
      } catch (objError) {
        if (blnMounted) {
          setStrError(objError instanceof Error ? objError.message : "Unable to load salary component workspace.");
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
  }, [blnCanLoadWorkspace, blnRightsLoading, intCurrentLanguageID, intSalaryComponentID, strMode]);

  const dicDependencyOptionByID = useMemo(() => {
    return new Map((objFormOptions?.lstDependencyComponents ?? []).map((dicOption) => [dicOption.intID, dicOption]));
  }, [objFormOptions]);
  const lstFlexiEligibilityQuestions = objFormOptions?.lstFlexiEligibilityQuestions ?? [];
  const dicFlexiEligibilityQuestionByID = useMemo(() => {
    return new Map(lstFlexiEligibilityQuestions.map((dicQuestion) => [dicQuestion.intID, dicQuestion]));
  }, [lstFlexiEligibilityQuestions]);
  const lstCategoryOptions = objFormOptions?.lstComponentCategoryLookups ?? [];
  const lstGroupOptions = objFormOptions?.lstComponentGroupLookups ?? [];
  const lstCalcMethodOptions = objFormOptions?.lstCalcMethodLookups ?? [];
  const lstRoundingRuleOptions = objFormOptions?.lstRoundingRuleLookups ?? [];
  const lstDefaultPeriodicityOptions = objFormOptions?.lstDefaultPeriodicityLookups ?? [];
  const lstTaxTreatmentOptions = objFormOptions?.lstTaxTreatmentLookups ?? [];
  const lstReimbursementTypeOptions = objFormOptions?.lstReimbursementTypeLookups ?? [];
  const lstSettlementMethodOptions = objFormOptions?.lstSettlementMethodLookups ?? [];
  const lstClaimLimitTypeOptions = objFormOptions?.lstClaimLimitTypeLookups ?? [];
  const lstPayslipSections = objFormOptions?.lstPayslipSectionLookups ?? [];
  const strCategoryCode = resolveLookupCode(lstCategoryOptions, dicForm.intComponentCategoryID);
  const strCalcMethodCode = resolveLookupCode(lstCalcMethodOptions, dicForm.intCalcMethodID);
  const strClaimLimitTypeCode = resolveLookupCode(objFormOptions?.lstClaimLimitTypeLookups, dicForm.intClaimLimitTypeID);
  const blnIsEarningCategory = isCategory(strCategoryCode, "earning");
  const blnIsDeductionCategory = isCategory(strCategoryCode, "deduction");
  const blnIsEmployerContributionCategory = isCategory(strCategoryCode, "employer contribution") || isCategory(strCategoryCode, "contribution");
  const blnIsReimbursementCategory = isCategory(strCategoryCode, "reimbursement");
  const blnIsFlexiBucketCategory = isCategory(strCategoryCode, "flexi bucket") || isCategory(strCategoryCode, "flexi basket");
  const blnIsInformationCategory = isCategory(strCategoryCode, "information");
  const blnShowFlexiSection = blnIsReimbursementCategory || blnIsFlexiBucketCategory;
  const blnShowFlexiBucketConfiguration = blnIsFlexiBucketCategory;
  const blnShowFlexiReimbursementConfiguration = blnIsReimbursementCategory;
  const blnIsFlexiReimbursement = blnIsReimbursementCategory && dicForm.blnIsFlexiBenefit;
  const blnDerivedIncludedInCtc = deriveCtcTreatment(dicForm);
  const blnWageTypeDisabled = blnFieldDisabled || !blnIsEarningCategory;
  const blnHideWageType = blnIsDeductionCategory || blnIsEmployerContributionCategory;
  const blnShowExpenseDateRequired = blnIsReimbursementCategory;
  const lstTaxRegimeApplicabilityOptions = [
    { value: 2, label: "Both" },
    { value: 1, label: "New Regime" },
    { value: 0, label: "Old Regime" },
  ] as const;
  const blnShowCalculationDependencies = isCalculationMethod(strCalcMethodCode, "formula");
  const blnShowFormulaExpression = isCalculationMethod(strCalcMethodCode, "formula");
  const blnShowPercentageCalculationFields = isCalculationMethod(strCalcMethodCode, "percentage");
  const blnShowManualCalculationHelp = isCalculationMethod(strCalcMethodCode, "manual");
  const blnShowRemunerationFlag = blnIsEarningCategory;
  const blnShowStatutoryFlags = blnIsEarningCategory;
  const blnShowOnlyActiveAndOverride = blnIsDeductionCategory;
  const blnShowEmployerContributionFlags = blnIsEmployerContributionCategory;
  const blnShowInformationFlags = blnIsInformationCategory;
  const blnShowPayrollProcessingGroup = blnShowRemunerationFlag || blnShowOnlyActiveAndOverride;
  const blnShowContributionTypeGroup = blnIsEarningCategory || blnIsEmployerContributionCategory;
  const blnShowFlagsSection = blnShowStatutoryFlags || blnShowPayrollProcessingGroup || blnShowContributionTypeGroup;
  const blnApplyMonthlyLimit = strClaimLimitTypeCode === "monthly" || strClaimLimitTypeCode === "both";
  const blnApplyYearlyLimit = strClaimLimitTypeCode === "yearly" || strClaimLimitTypeCode === "both";
  const intEnglishLanguageID =
    objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "en")?.intID
    ?? null;
  const intHindiLanguageID =
    objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.strCode?.toLowerCase() === "hi")?.intID
    ?? null;
  const intDefaultLanguageID =
    intEnglishLanguageID
    ?? authHelpers.getLanguageID()
    ?? objFormOptions?.lstLanguages[0]?.intID
    ?? 1;
  const intSecondaryLanguageID =
    intHindiLanguageID
    ?? authHelpers.getSecondaryLanguageID()
    ?? objFormOptions?.lstLanguages.find((dicLanguage) => dicLanguage.intID !== intDefaultLanguageID)?.intID
    ?? intDefaultLanguageID;

  function buildFixedLanguageRow(
    intLanguageID: number,
    strComponentName: string,
    strComponentDescription: string,
    lstExistingTexts: SalaryComponentTextFormValue[],
  ) {
    const dicExistingText = lstExistingTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intLanguageID
    ) ?? createEmptySalaryComponentTextRow();
    const dicLanguage = (objFormOptions?.lstLanguages ?? []).find((dicOption) => dicOption.intID === intLanguageID);
    return {
      ...dicExistingText,
      intLanguageID,
      strLanguageName: dicLanguage?.strLabel ?? dicExistingText.strLanguageName ?? "",
      strComponentName,
      strComponentDescription,
    };
  }

  function ensureUniqueTextRowIDs(lstTexts: SalaryComponentTextFormValue[]) {
    const setUsedRowIDs = new Set<string>();
    return lstTexts.map((dicText) => {
      const strCandidateRowID = dicText.strRowID?.trim() || createEmptySalaryComponentTextRow().strRowID;
      if (!setUsedRowIDs.has(strCandidateRowID)) {
        setUsedRowIDs.add(strCandidateRowID);
        return dicText;
      }
      const strNewRowID = createEmptySalaryComponentTextRow().strRowID;
      setUsedRowIDs.add(strNewRowID);
      return {
        ...dicText,
        strRowID: strNewRowID,
      };
    });
  }

  function ensureTenantLanguageRows(dicValues: SalaryComponentFormValues) {
    const dicDefaultRow = buildFixedLanguageRow(
      intDefaultLanguageID,
      dicValues.strComponentName,
      dicValues.strComponentDescription,
      dicValues.lstTexts,
    );
    const dicSecondaryExistingText = dicValues.lstTexts.find(
      (dicText) => Number(dicText.intLanguageID) === intSecondaryLanguageID
    );
    const dicSecondaryRow = buildFixedLanguageRow(
      intSecondaryLanguageID,
      dicSecondaryExistingText?.strComponentName ?? "",
      dicSecondaryExistingText?.strComponentDescription ?? "",
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

  function syncEnglishComponentText(strComponentName: string, strComponentDescription: string) {
    setDicForm((dicPrevious) => {
      const dicNext = ensureTenantLanguageRows({
        ...dicPrevious,
        strComponentName,
        strComponentDescription,
      });
      return {
        ...dicNext,
        lstTexts: dicNext.lstTexts.map((dicText, intIndex) => intIndex === 0
          ? {
              ...dicText,
              strComponentName,
              strComponentDescription,
            }
          : dicText),
      };
    });
  }

  function updateRootField<TKey extends keyof SalaryComponentFormValues>(strField: TKey, objValue: SalaryComponentFormValues[TKey]) {
    setDicForm((dicPrevious) => ({ ...dicPrevious, [strField]: objValue }));
  }

  function updateFlexiEligibilityRule(
    strRowID: string,
    strField: keyof SalaryComponentFormValues["lstFlexiEligibilityRules"][number],
    objValue: string | number | boolean,
  ) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstFlexiEligibilityRules: dicPrevious.lstFlexiEligibilityRules.map((dicRule) => {
        if (dicRule.strRowID !== strRowID) {
          return dicRule;
        }
        if (strField === "intEligibilityQuestionID") {
          const objQuestion = dicFlexiEligibilityQuestionByID.get(Number(objValue));
          const strOperator = getDefaultOperatorForAnswerType(objQuestion?.strAnswerType);
          return {
            ...dicRule,
            intEligibilityQuestionID: objValue as number | "",
            strOperator,
            strExpectedValue: "",
            strMinValue: "",
            strMaxValue: "",
            strMultiplierMode: "none",
            strMultiplierCap: "",
          };
        }
        if (strField === "strOperator") {
          return {
            ...dicRule,
            strOperator: String(objValue),
            strExpectedValue: dicRule.strExpectedValue,
            strMinValue: "",
            strMaxValue: "",
          };
        }
        if (strField === "strMultiplierMode" && objValue === "none") {
          return {
            ...dicRule,
            strMultiplierMode: "none",
            strMultiplierCap: "",
          };
        }
        return { ...dicRule, [strField]: objValue };
      }),
    }));
  }

  function handleAddFlexiEligibilityRule() {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstFlexiEligibilityRules: [
        ...dicPrevious.lstFlexiEligibilityRules,
        {
          ...createEmptySalaryComponentFlexiEligibilityRuleRow(),
          intDisplayOrder: (dicPrevious.lstFlexiEligibilityRules.length + 1) * 10,
        },
      ],
    }));
  }

  function handleRemoveFlexiEligibilityRule(strRowID: string) {
    setDicForm((dicPrevious) => ({
      ...dicPrevious,
      lstFlexiEligibilityRules: dicPrevious.lstFlexiEligibilityRules.filter((dicRule) => dicRule.strRowID !== strRowID),
    }));
  }

  function updateClaimLimitToggle(strLimitType: "monthly" | "yearly", blnChecked: boolean) {
    setDicForm((dicPrevious) => {
      const blnMonthly = strLimitType === "monthly"
        ? blnChecked
        : dicPrevious.strClaimLimitType === "monthly" || dicPrevious.strClaimLimitType === "both";
      const blnYearly = strLimitType === "yearly"
        ? blnChecked
        : dicPrevious.strClaimLimitType === "yearly" || dicPrevious.strClaimLimitType === "both";
      let strClaimLimitType: SalaryComponentFormValues["strClaimLimitType"] = "none";
      if (blnMonthly && blnYearly) {
        strClaimLimitType = "both" as SalaryComponentFormValues["strClaimLimitType"];
      } else if (blnMonthly) {
        strClaimLimitType = "monthly";
      } else if (blnYearly) {
        strClaimLimitType = "yearly";
      }
      return {
        ...dicPrevious,
        strClaimLimitType,
        strMonthlyLimitAmount: blnMonthly ? dicPrevious.strMonthlyLimitAmount : "",
        strAnnualLimitAmount: blnYearly ? dicPrevious.strAnnualLimitAmount : "",
      };
    });
  }

  function updateTextRow(strRowID: string, strField: keyof SalaryComponentTextFormValue, objValue: string | number) {
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
    const strSourceComponentName = dicForm.strComponentName.trim();
    const strSourceComponentDescription = dicForm.strComponentDescription.trim();
    const strSourceSignature = `${strSourceComponentName}||${strSourceComponentDescription}`;

    if (!dicSelectedLanguage || intLanguageID === intDefaultLanguageID || !strSourceComponentName) {
      return;
    }

    const dicCurrentRow = dicForm.lstTexts.find((dicText) => dicText.strRowID === strRowID);
    const strLastTranslatedSource = (dicLastTranslatedSourceByRow[strRowID] ?? "").trim();
    const blnShouldTranslate =
      !dicCurrentRow?.strComponentName.trim()
      || strLastTranslatedSource !== strSourceSignature;

    if (!blnShouldTranslate) {
      return;
    }

    setDicTextTranslationLoading((dicPrevious) => ({ ...dicPrevious, [strRowID]: true }));
    try {
      const [strTranslatedName, strTranslatedDescription] = await Promise.all([
        salaryComponentService.translateSalaryComponentText(
          strSourceComponentName,
          intDefaultLanguageID,
          intLanguageID,
        ),
        strSourceComponentDescription
          ? salaryComponentService.translateSalaryComponentText(
              strSourceComponentDescription,
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
              strComponentName: strTranslatedName,
              strComponentDescription: strTranslatedDescription,
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

  useEffect(() => {
    if (!objFormOptions) {
      return;
    }
    setDicForm((dicPrevious) => {
      const dicNext = syncLookupBackedFields(dicPrevious, objFormOptions);
      return haveLookupBackedFieldsChanged(dicPrevious, dicNext) ? dicNext : dicPrevious;
    });
  }, [objFormOptions, dicForm.intComponentCategoryID, dicForm.intComponentGroupID, dicForm.intCalcMethodID, dicForm.intRoundingRuleID, dicForm.intDefaultPeriodicityID, dicForm.intTaxTreatmentID, dicForm.intReimbursementTypeID, dicForm.intSettlementMethodID, dicForm.intClaimLimitTypeID, dicForm.intPayslipSectionID]);

  useEffect(() => {
    setDicForm((dicPrevious) => {
      const strCategoryValue = resolveLookupCode(lstCategoryOptions, dicPrevious.intComponentCategoryID) || dicPrevious.strComponentCategory;
      const strReimbursementTypeValue = resolveLookupCode(lstReimbursementTypeOptions, dicPrevious.intReimbursementTypeID) || dicPrevious.strReimbursementType;
      const strSettlementMethodValue = resolveLookupCode(lstSettlementMethodOptions, dicPrevious.intSettlementMethodID) || dicPrevious.strSettlementMethod;
      const strPayslipSectionValue = resolveLookupCode(lstPayslipSections, dicPrevious.intPayslipSectionID) || dicPrevious.strPayslipSection;
      const blnReimbursementCategory = isCategory(strCategoryValue, "reimbursement");
      const blnFlexiBucketCategory = isCategory(strCategoryValue, "flexi bucket") || isCategory(strCategoryValue, "flexi basket");
      const blnDeductionCategory = isCategory(strCategoryValue, "deduction");
      const blnEmployerContributionCategory = isCategory(strCategoryValue, "employer contribution") || isCategory(strCategoryValue, "contribution");
      const blnEarningCategory = isCategory(strCategoryValue, "earning");
      const blnInformationCategory = isCategory(strCategoryValue, "information");
      const dicNext = {
        ...dicPrevious,
        strComponentCategory: strCategoryValue,
        blnIsReimbursement: blnReimbursementCategory,
        blnIsEmployeeDeduction: blnDeductionCategory,
        blnIsEmployerContribution: blnEmployerContributionCategory,
      };
      const applyLookupValue = (
        strIDField: keyof SalaryComponentFormValues,
        strTextField: keyof SalaryComponentFormValues,
        lstOptions: SalaryComponentLookupOption[] | undefined,
        strValue: string,
      ) => {
        dicNext[strIDField] = resolveLookupID(lstOptions, strValue) as SalaryComponentFormValues[keyof SalaryComponentFormValues];
        dicNext[strTextField] = strValue as SalaryComponentFormValues[keyof SalaryComponentFormValues];
      };
      if (blnFlexiBucketCategory) {
        dicNext.strComponentGroup = "Benefits";
        dicNext.blnIsFlexiBenefit = true;
        dicNext.blnIncludedInCtc = true;
        dicNext.blnIsWages = false;
        dicNext.blnIncludeInPF = false;
        dicNext.blnIncludeInESIC = false;
        dicNext.blnIncludeInGratuity = false;
        dicNext.blnIncludeInRemuneration = false;
        dicNext.blnIncludeInPayslip = false;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "");
        applyLookupValue("intReimbursementTypeID", "strReimbursementType", lstReimbursementTypeOptions, "none");
        applyLookupValue("intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, "none");
        dicNext.blnRequiresBills = false;
        dicNext.blnExpenseDateRequired = true;
        dicNext.blnAllowPartialApproval = true;
        applyLookupValue("intClaimLimitTypeID", "strClaimLimitType", lstClaimLimitTypeOptions, "none");
        dicNext.strMonthlyLimitAmount = "";
        dicNext.strAnnualLimitAmount = "";
      } else if (blnReimbursementCategory && dicNext.blnIsFlexiBenefit) {
        applyLookupValue("intReimbursementTypeID", "strReimbursementType", lstReimbursementTypeOptions, "ctc_based");
        dicNext.blnIncludedInCtc = true;
        applyLookupValue("intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, "payroll");
        dicNext.blnIncludeInPayslip = true;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "reimbursements");
      } else if (isCategory(strReimbursementTypeValue, "ctc_based")) {
        dicNext.blnIncludedInCtc = true;
        applyLookupValue("intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, "payroll");
        if (blnReimbursementCategory) {
          dicNext.blnIncludeInPayslip = true;
          applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "reimbursements");
        }
      } else if (isCategory(strReimbursementTypeValue, "non_ctc_based")) {
        dicNext.blnIncludedInCtc = false;
        applyLookupValue("intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, "finance");
        dicNext.blnIncludeInPayslip = false;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "");
      }
      if (isCategory(strSettlementMethodValue, "finance")) {
        dicNext.blnAutoPushToPayroll = false;
        dicNext.blnFinanceSettlementRequired = true;
      } else if (isCategory(strSettlementMethodValue, "payroll")) {
        dicNext.blnFinanceSettlementRequired = false;
      }
      if (blnReimbursementCategory) {
        dicNext.blnIsWages = false;
        dicNext.blnIncludeInPF = false;
        dicNext.blnIncludeInESIC = false;
        dicNext.blnIncludeInGratuity = false;
        dicNext.blnIncludeInRemuneration = false;
      }
      if (blnDeductionCategory || blnEmployerContributionCategory) {
        dicNext.blnIsWages = false;
        dicNext.blnIncludeInPF = false;
        dicNext.blnIncludeInESIC = false;
        dicNext.blnIncludeInGratuity = false;
      }
      if (blnDeductionCategory) {
        dicNext.blnIncludedInCtc = false;
        dicNext.blnIncludeInRemuneration = false;
        dicNext.blnIncludeInPayslip = true;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "deductions");
      }
      if (blnEarningCategory) {
        dicNext.blnIncludedInCtc = true;
        dicNext.blnIncludeInPayslip = true;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "earnings");
      }
      if (blnEmployerContributionCategory) {
        dicNext.blnIncludedInCtc = true;
        if (!strPayslipSectionValue) {
          applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "employer contributions");
        }
      }
      if (blnInformationCategory) {
        dicNext.blnIncludedInCtc = false;
        dicNext.blnIncludeInPF = false;
        dicNext.blnIncludeInESIC = false;
        dicNext.blnIncludeInGratuity = false;
        dicNext.blnIncludeInRemuneration = false;
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, dicNext.blnIncludeInPayslip ? "information" : "");
      }
      if (!dicNext.blnIncludeInPayslip) {
        applyLookupValue("intPayslipSectionID", "strPayslipSection", lstPayslipSections, "");
      }
      if (!blnReimbursementCategory) {
        dicNext.blnIsFlexiBenefit = blnFlexiBucketCategory;
        dicNext.lstFlexiEligibilityRules = [];
        applyLookupValue("intReimbursementTypeID", "strReimbursementType", lstReimbursementTypeOptions, "none");
        applyLookupValue("intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, "none");
        dicNext.blnRequiresBills = false;
        dicNext.blnAutoPushToPayroll = false;
        dicNext.blnFinanceSettlementRequired = false;
        applyLookupValue("intClaimLimitTypeID", "strClaimLimitType", lstClaimLimitTypeOptions, "none");
        dicNext.strMonthlyLimitAmount = "";
        dicNext.strAnnualLimitAmount = "";
      }
      if (!blnFlexiBucketCategory) {
        dicNext.intResidualComponentID = blnReimbursementCategory ? "" : dicNext.intResidualComponentID;
      }
      if (dicNext.blnRequiresBills) {
        dicNext.blnProofRequired = true;
      }
      if (
        dicNext.strReimbursementType === dicPrevious.strReimbursementType
        && dicNext.blnIsFlexiBenefit === dicPrevious.blnIsFlexiBenefit
        && dicNext.blnIsReimbursement === dicPrevious.blnIsReimbursement
        && dicNext.blnIncludedInCtc === dicPrevious.blnIncludedInCtc
        && dicNext.strSettlementMethod === dicPrevious.strSettlementMethod
        && dicNext.blnAutoPushToPayroll === dicPrevious.blnAutoPushToPayroll
        && dicNext.blnFinanceSettlementRequired === dicPrevious.blnFinanceSettlementRequired
        && dicNext.blnProofRequired === dicPrevious.blnProofRequired
        && dicNext.blnIsEmployeeDeduction === dicPrevious.blnIsEmployeeDeduction
        && dicNext.blnIsEmployerContribution === dicPrevious.blnIsEmployerContribution
        && dicNext.blnIsWages === dicPrevious.blnIsWages
        && dicNext.strComponentGroup === dicPrevious.strComponentGroup
        && dicNext.blnIncludeInPayslip === dicPrevious.blnIncludeInPayslip
        && dicNext.strPayslipSection === dicPrevious.strPayslipSection
      ) {
        return dicPrevious;
      }
      return dicNext;
    });
  }, [dicForm.intComponentCategoryID, dicForm.intReimbursementTypeID, dicForm.intSettlementMethodID, dicForm.intPayslipSectionID, dicForm.blnRequiresBills, dicForm.blnIncludeInPayslip, dicForm.blnIsFlexiBenefit, lstCategoryOptions, lstClaimLimitTypeOptions, lstPayslipSections, lstReimbursementTypeOptions, lstSettlementMethodOptions]);

  async function handleSave() {
    if (!blnCanSave) {
      return;
    }
    if (!dicForm.strComponentCode.trim() || !dicForm.strComponentName.trim() || !dicForm.strComponentCategory.trim() || !dicForm.strCalcMethod.trim()) {
      setStrError(t("salary_component_required_fields", "Component code, name, category, and calculation method are required."));
      return;
    }
    if (blnIsFlexiBucketCategory && !dicForm.intResidualComponentID) {
      setStrError(t("residual_component_required", "Residual Component is required for Flexi Bucket."));
      return;
    }
    if (dicForm.strReimbursementType === "non_ctc_based" && dicForm.blnIncludedInCtc) {
      setStrError(t("non_ctc_not_in_ctc", "Non-CTC reimbursement cannot be included in CTC."));
      return;
    }
    if (dicForm.strSettlementMethod === "finance" && dicForm.blnAutoPushToPayroll) {
      setStrError(t("finance_cannot_auto_push", "Finance settlement cannot auto-push to payroll."));
      return;
    }
    if (dicForm.blnIncludeInPayslip && !dicForm.strPayslipSection.trim()) {
      setStrError(t("payslip_section_required", "Payslip Section is required when Show on Payslip is enabled."));
      return;
    }
    if (dicForm.blnIncludeInPayslip && (!dicForm.strDisplayOrder.trim() || Number(dicForm.strDisplayOrder) <= 0)) {
      setStrError(t("display_order_required", "Display Order is required when Show on Payslip is enabled."));
      return;
    }
    if (blnShowPercentageCalculationFields) {
      if (!dicForm.intDefaultBasisComponentID) {
        setStrError(t("base_component_required", "Base Component is required for percentage calculation method."));
        return;
      }
      if (!dicForm.strDefaultPercentageValue.trim() || Number(dicForm.strDefaultPercentageValue) < 0) {
        setStrError(t("percentage_value_required", "Percentage value is required for percentage calculation method."));
        return;
      }
    }
    if (blnApplyMonthlyLimit && (!dicForm.strMonthlyLimitAmount.trim() || Number(dicForm.strMonthlyLimitAmount) <= 0)) {
      setStrError(t("monthly_limit_required", "Policy Monthly Limit Amount is required and must be greater than 0."));
      return;
    }
    if (blnApplyYearlyLimit && (!dicForm.strAnnualLimitAmount.trim() || Number(dicForm.strAnnualLimitAmount) <= 0)) {
      setStrError(t("yearly_limit_required", "Policy Yearly Limit Amount is required and must be greater than 0."));
      return;
    }
    if (blnIsFlexiReimbursement) {
      const setActiveQuestionIDs = new Set<number>();
      for (const dicRule of dicForm.lstFlexiEligibilityRules) {
        const objQuestion = dicFlexiEligibilityQuestionByID.get(Number(dicRule.intEligibilityQuestionID));
        if (!objQuestion) {
          setStrError(t("eligibility_question_required", "Eligibility Question is required for each rule row."));
          return;
        }
        if (!dicRule.strOperator.trim()) {
          setStrError(t("eligibility_operator_required", "Rule condition is required for each rule row."));
          return;
        }
        if (dicRule.blnIsActive) {
          if (setActiveQuestionIDs.has(objQuestion.intID)) {
            setStrError(t("eligibility_duplicate_question", "Cannot add duplicate active rule for the same eligibility question."));
            return;
          }
          setActiveQuestionIDs.add(objQuestion.intID);
        }
        if (objQuestion.strAnswerType === "boolean" && !dicRule.strExpectedValue.trim()) {
          setStrError(t("eligibility_boolean_expected_required", "Boolean questions require a required answer."));
          return;
        }
        if (objQuestion.strAnswerType === "number") {
          if (dicRule.strOperator === "between") {
            if (!dicRule.strMinValue.trim() || !dicRule.strMaxValue.trim()) {
              setStrError(t("eligibility_between_required", "Between rule condition requires both minimum and maximum values."));
              return;
            }
          } else if (["greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"].includes(dicRule.strOperator) && !dicRule.strMinValue.trim()) {
            setStrError(t("eligibility_number_threshold_required", "Number rules require a required value."));
            return;
          }
        }
        if (dicRule.strMultiplierMode !== "none" && (!dicRule.strMultiplierCap.trim() || Number(dicRule.strMultiplierCap) <= 0)) {
          setStrError(t("eligibility_multiplier_cap_required", "Multiplier Cap is required and must be greater than 0 when multiplier mode is enabled."));
          return;
        }
      }
    }
    setBlnSaving(true);
    setStrError("");
    try {
      const dicSavedRecord = strMode === "edit" && intSalaryComponentID
        ? await salaryComponentService.updateSalaryComponent(intSalaryComponentID, dicForm)
        : await salaryComponentService.createSalaryComponent(dicForm);
      setObjDetail(dicSavedRecord);
      setDicForm((dicPrevious) => {
        const dicNextForm = toSalaryComponentFormValues(dicSavedRecord);
        return objFormOptions
          ? syncLookupBackedFields(dicNextForm, objFormOptions)
          : {
              ...dicPrevious,
              ...dicNextForm,
            };
      });
      setStrSuccess(
        strMode === "edit"
          ? t("salary_component_updated", "Salary component updated successfully.")
          : t("salary_component_created", "Salary component created successfully.")
      );
      if (strMode === "add") {
        objRouter.push(`/salary-components/edit/${dicSavedRecord.intID}?backRoute=${encodeURIComponent(strResolvedBackRoute)}`);
      }
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to save salary component.");
    } finally {
      setBlnSaving(false);
    }
  }

  if (blnLoading || blnRightsLoading) {
    return (
      <Box data-controlid="salary-components.editor.loading.state" sx={{ minHeight: 360, display: "grid", placeItems: "center" }}>
        <Stack spacing={1.5} alignItems="center">
          <CircularProgress />
          <Typography sx={{ color: "#64748b" }}>{t("loading_salary_component_workspace", "Loading salary component workspace...")}</Typography>
        </Stack>
      </Box>
    );
  }

  if (!blnCanLoadWorkspace) {
    return (
      <Box className={styles.emptyState} data-controlid="salary-components.editor.access-denied.state">
        <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>
          {strMode === "add"
            ? t("access_denied_add", "Salary component create access is not available for your user group.")
            : t("access_denied", "Salary component access is not available for your user group.")}
        </Typography>
        <Typography sx={{ mt: 1, color: "#64748b" }}>
          {t("access_denied_help", "Contact your administrator if you need salary component access.")}
        </Typography>
        {strRightsError ? <Typography data-controlid="salary-components.editor.rights-error.message" sx={{ mt: 1, color: "#b45309", fontSize: "0.85rem" }}>{strRightsError}</Typography> : null}
      </Box>
    );
  }

  return (
    <Stack data-controlid="salary-components.editor.page" spacing={2.5} sx={{ height: "100%", overflow: "auto", pr: 0.5 }}>
      <Paper sx={{ borderRadius: "28px", p: { xs: 2, md: 3 }, border: "1px solid rgba(148,163,184,0.18)", background: "linear-gradient(135deg, #f9fbff 0%, #eef4ff 50%, #f8fafc 100%)" }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
            <Box>
              <Typography sx={{ fontSize: "1.7rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }}>
                {strMode === "edit"
                  ? t("edit_salary_component", "Edit Salary Component")
                  : t("add_salary_component", "Add Salary Component")}
              </Typography>
              <Typography sx={{ color: "#64748b", mt: 0.75 }}>
                {t(
                  "editor_description",
                  "Configure calculation rules, compliance flags, multilingual labels, and dependency mapping in one reusable component master."
                )}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ width: { xs: "100%", sm: "auto" } }}>
              <Button
                data-controlid="salary-components.editor.back.button"
                className={styles.secondaryButton}
                startIcon={<ArrowBackRoundedIcon />}
                onClick={() => objRouter.push(strResolvedBackRoute)}
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
                }}

              >
                {t("back_button", "Back")}
              </Button>
              <Button
                data-controlid="salary-components.editor.save.button"
                className={styles.primaryButton}
                startIcon={<SaveRoundedIcon />}
                onClick={handleSave}
                disabled={!blnCanSave || blnSaving}
                 sx={{
                  borderRadius: "14px",
                  height: 38,
                  minHeight: 38,
                  py: 0,
                  px: 2.25,
                  minWidth: 168,
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
                {blnSaving ? t("saving", "Saving...") : t("save_component", "Save Component")}
              </Button>
            </Stack>
          </Stack>

          {strError ? <Alert data-controlid="salary-components.editor.error.alert" severity="error" onClose={() => setStrError("")}>{strError}</Alert> : null}
          {strSuccess ? <Alert data-controlid="salary-components.editor.success.alert" severity="success" onClose={() => setStrSuccess("")}>{strSuccess}</Alert> : null}
          {blnReadOnly ? <Alert data-controlid="salary-components.editor.read-only.alert" severity="info">{t("read_only_mode", "You have view-only access for Salary Component.")}</Alert> : null}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>1. {t("basic_information", "Basic Information")}</Typography>
          <FormControlLabel
            sx={{ m: 0 }}
            control={<ActiveStatusSwitch testId="salary-components.editor.active-component.switch" blnIsActive={dicForm.blnIsActive} onChange={(blnChecked) => updateRootField("blnIsActive", blnChecked)} disabled={blnFieldDisabled} />}
            label={t("active_component", "Active Component")}
          />
        </Stack>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField
            label={t("component_name", "Component Name")}
            value={dicForm.strComponentName}
            onChange={(objEvent) => syncEnglishComponentText(objEvent.target.value, dicForm.strComponentDescription)}
            disabled={blnFieldDisabled}
            fullWidth
            data-controlid="salary-components.editor.component-name.input"
            inputProps={buildInputTestIdProps("salary-components.editor.component-name.input")}
          />

          <TextField select label={t("component_category", "Component Category")} value={dicForm.intComponentCategoryID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intComponentCategoryID", "strComponentCategory", lstCategoryOptions, Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.component-category.select")}>
            {lstCategoryOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.component-category.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{getCategoryLabel(dicOption.strDisplayName)}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.75, minHeight: 56 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "0.875rem", color: "rgba(15, 23, 42, 0.6)", whiteSpace: "nowrap" }}>
                {t("ctc_treatment", "CTC Treatment")}:
              </Typography>
              <Chip
                size="small"
                color={blnDerivedIncludedInCtc ? "success" : "default"}
                label={blnDerivedIncludedInCtc ? t("included_in_ctc", "Included in CTC") : t("not_included_in_ctc", "Not Included in CTC")}
                sx={{ flexShrink: 0, fontWeight: 700 }}
                data-controlid="salary-components.editor.ctc-treatment.chip"
              />
            </Box>
            <Typography sx={{ color: "#64748b", fontSize: "0.78rem", lineHeight: 1.35 }}>
              {t("ctc_treatment_help", "CTC Treatment is derived from component category and reimbursement configuration.")}
            </Typography>
          </Box>
          <TextField select label={t("component_group", "Component Group")} value={dicForm.intComponentGroupID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intComponentGroupID", "strComponentGroup", lstGroupOptions, objEvent.target.value === "" ? "" : Number(objEvent.target.value))} disabled={blnFieldDisabled || blnIsFlexiBucketCategory} fullWidth {...buildSelectTestIdProps("salary-components.editor.component-group.select")}>
            <MenuItem value="" data-controlid="salary-components.editor.component-group.none.option">{t("none", "None")}</MenuItem>
            {lstGroupOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.component-group.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{dicOption.strDisplayName}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("component_code", "Component Code")}
            value={dicForm.strComponentCode}
            onChange={(objEvent) => updateRootField("strComponentCode", objEvent.target.value.toUpperCase())}
            disabled={blnFieldDisabled || strMode === "edit"}
            helperText={strMode === "edit"
              ? t("component_code_read_only_help", "Component code can be entered during creation and is read-only after save.")
              : t("component_code_create_help", "Set the internal component code used for system references.")}
            fullWidth
            data-controlid="salary-components.editor.component-code.input"
            inputProps={buildInputTestIdProps("salary-components.editor.component-code.input")}
          />
          {!blnHideWageType ? (
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, minHeight: 56 }}>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                <Typography sx={{ fontSize: "0.875rem", color: "rgba(15, 23, 42, 0.6)", whiteSpace: "nowrap" }}>
                  {t("wage_type", "Wage Type")}
                </Typography>
                <RadioGroup
                  row
                  value={dicForm.blnIsWages ? "wages" : "nonWages"}
                  onChange={(objEvent) => updateRootField("blnIsWages", objEvent.target.value === "wages")}
                  sx={{ flexWrap: "nowrap" }}
                >
                  <FormControlLabel
                    value="wages"
                    control={<Radio disabled={blnWageTypeDisabled} inputProps={buildInputTestIdProps("salary-components.editor.wage-type.wages.radio")} />}
                    label={t("wages", getWageTypeLabel("wages"))}
                    disabled={blnWageTypeDisabled}
                  />
                  <FormControlLabel
                    value="nonWages"
                    control={<Radio disabled={blnWageTypeDisabled} inputProps={buildInputTestIdProps("salary-components.editor.wage-type.non-wages.radio")} />}
                    label={t("non_wages", getWageTypeLabel("nonWages"))}
                    disabled={blnWageTypeDisabled}
                  />
                </RadioGroup>
              </Box>
              <Typography sx={{ color: "#64748b", fontSize: "0.75rem", lineHeight: 1.66 }}>
                {t("wage_type_help", "Determines whether the component is considered part of wages for statutory calculations.")}
              </Typography>
            </Box>
          ) : null}
          <TextField
            label={t("description", "Description")}
            value={dicForm.strComponentDescription}
            onChange={(objEvent) => syncEnglishComponentText(dicForm.strComponentName, objEvent.target.value)}
            disabled={blnFieldDisabled}
            fullWidth
            data-controlid="salary-components.editor.description.input"
            inputProps={buildInputTestIdProps("salary-components.editor.description.input")}
            sx={{ gridColumn: { xs: "1 / -1", md: "1 / -1" } }}
          />
        </Box>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>2. {t("calculation_setup", "Calculation Setup")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField select label={t("calculation_method", "Calculation Method")} value={dicForm.intCalcMethodID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intCalcMethodID", "strCalcMethod", lstCalcMethodOptions, Number(objEvent.target.value))} disabled={blnFieldDisabled} helperText={t("calculation_method_help", "Defines how the component amount is calculated.")} fullWidth {...buildSelectTestIdProps("salary-components.editor.calculation-method.select")}>
            {lstCalcMethodOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.calculation-method.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{dicOption.strDisplayName}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("rounding_rule", "Rounding Rule")} value={dicForm.intRoundingRuleID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intRoundingRuleID", "strRoundingRule", lstRoundingRuleOptions, objEvent.target.value === "" ? "" : Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.rounding-rule.select")}>
            {lstRoundingRuleOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.rounding-rule.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{dicOption.strDisplayName}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("default_periodicity", "Default Periodicity")} value={dicForm.intDefaultPeriodicityID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intDefaultPeriodicityID", "strDefaultPeriodicity", lstDefaultPeriodicityOptions, Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.default-periodicity.select")}>
            {lstDefaultPeriodicityOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.default-periodicity.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{dicOption.strDisplayName}</MenuItem>
            ))}
          </TextField>
          <TextField select label={t("tax_treatment", "Tax Treatment")} value={dicForm.intTaxTreatmentID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intTaxTreatmentID", "strTaxTreatment", lstTaxTreatmentOptions, objEvent.target.value === "" ? "" : Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth {...buildSelectTestIdProps("salary-components.editor.tax-treatment.select")}>
            <MenuItem value="" data-controlid="salary-components.editor.tax-treatment.none.option">{t("none", "None")}</MenuItem>
            {lstTaxTreatmentOptions.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.tax-treatment.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{getTaxTreatmentLabel(dicOption.strDisplayName)}</MenuItem>
            ))}
          </TextField>
          {blnShowPercentageCalculationFields ? (
            <TextField
              select
              label={t("base_component", "Base Component")}
              value={dicForm.intDefaultBasisComponentID}
              onChange={(objEvent) => updateRootField("intDefaultBasisComponentID", objEvent.target.value === "" ? "" : Number(objEvent.target.value))}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.default-basis-component.select")}
            >
              <MenuItem value="" data-controlid="salary-components.editor.default-basis-component.select.option">{t("select", "Select")}</MenuItem>
              {(objFormOptions?.lstDependencyComponents ?? [])
                .filter((dicOption) => dicOption.intID !== intSalaryComponentID)
                .map((dicOption) => (
                  <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.default-basis-component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>
                    {dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}
                  </MenuItem>
                ))}
            </TextField>
          ) : null}
          {blnShowPercentageCalculationFields ? (
            <TextField
              type="number"
              label={t("percentage_value", "%")}
              value={dicForm.strDefaultPercentageValue}
              onChange={(objEvent) => updateRootField("strDefaultPercentageValue", objEvent.target.value)}
              disabled={blnFieldDisabled}
              fullWidth
              data-controlid="salary-components.editor.default-percentage-value.input"
              inputProps={{ ...buildInputTestIdProps("salary-components.editor.default-percentage-value.input"), min: 0, step: "0.01" }}
            />
          ) : null}
          {blnShowFormulaExpression ? (
            <Box sx={{ gridColumn: { xs: "1 / -1", md: "span 2" } }}>
              <TextField
                label={t("formula_expression", "Formula Expression")}
                value={dicForm.strFormulaExpression}
                onChange={(objEvent) => updateRootField("strFormulaExpression", objEvent.target.value)}
                disabled={blnFieldDisabled}
                fullWidth
                data-controlid="salary-components.editor.formula-expression.input"
                inputProps={buildInputTestIdProps("salary-components.editor.formula-expression.input")}
              />
              <Typography sx={{ color: "#64748b", fontSize: "0.82rem", mt: 0.75, lineHeight: 1.5 }}>
                {t("formula_expression_help", "Applicable only for formula-based calculation methods. Available system variables: WAGE_TOTAL, NON_WAGE_TOTAL, DEEMED_WAGE_BASE, DEEMED_WAGE_SHORTFALL, CTC_ANNUAL, GROSS_ANNUAL. Example: DEEMED_WAGE_BASE * 0.08")}
              </Typography>
            </Box>
          ) : null}
        </Box>
        {blnShowManualCalculationHelp ? (
          <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 1.5 }}>
            {t("manual_calculation_help", "Amount will be configured in Salary Structure / Employee Salary.")}
          </Typography>
        ) : null}
      </Paper>

      {blnShowFlexiBucketConfiguration ? (
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>3. {t("flexi_bucket_settings", "Flexi Bucket Settings")}</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(320px, 420px)" }, alignItems: "start" }}>
            <TextField
              select
              label={t("residual_component", "Residual Component")}
              value={dicForm.intResidualComponentID}
              onChange={(objEvent) => updateRootField("intResidualComponentID", objEvent.target.value === "" ? "" : Number(objEvent.target.value))}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.residual-component.select")}
            >
              <MenuItem value="" data-controlid="salary-components.editor.residual-component.none.option">{t("none", "None")}</MenuItem>
              {(objFormOptions?.lstResidualComponents ?? []).filter((dicOption) => dicOption.intID !== intSalaryComponentID).map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.residual-component.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}>{dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel}</MenuItem>
              ))}
            </TextField>
          </Box>
        </Paper>
      ) : null}

      {blnShowFlexiReimbursementConfiguration ? (
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>3. {t("reimbursement_configuration", "Reimbursement Configuration")}</Typography>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 0.9fr) repeat(5, minmax(0, 1fr))" }, alignItems: "start" }}>
            <FormControlLabel sx={{ m: 0, minHeight: 56, alignItems: "center" }} control={<Switch checked={dicForm.blnIsFlexiBenefit} onChange={(objEvent) => setDicForm((dicPrevious) => ({
              ...dicPrevious,
              blnIsFlexiBenefit: objEvent.target.checked,
              intReimbursementTypeID: objEvent.target.checked ? (findLookupOptionByValue(lstReimbursementTypeOptions, "ctc_based")?.intID ?? "") : "",
              strReimbursementType: objEvent.target.checked ? "ctc_based" : "none",
              intSettlementMethodID: objEvent.target.checked ? (findLookupOptionByValue(lstSettlementMethodOptions, "payroll")?.intID ?? "") : "",
              strSettlementMethod: objEvent.target.checked ? "payroll" : "none",
            }))} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.is-flexi-benefit.switch")} />} label={t("is_flexi_reimbursement", blnIsReimbursementCategory ? "Is Flexi Reimbursement" : "Is Flexi Benefit")} />
            <TextField
              select
              label={t("reimbursement_type", "Reimbursement Type")}
              value={dicForm.intReimbursementTypeID}
              onChange={(objEvent) => handleLookupSelection(setDicForm, "intReimbursementTypeID", "strReimbursementType", lstReimbursementTypeOptions, objEvent.target.value === "" ? "" : Number(objEvent.target.value))}
              disabled={blnFieldDisabled || !dicForm.blnIsReimbursement || blnIsFlexiReimbursement}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.reimbursement-type.select")}
            >
              <MenuItem value="" data-controlid="salary-components.editor.reimbursement-type.none.option">{t("select", "Select")}</MenuItem>
              {lstReimbursementTypeOptions.map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.reimbursement-type.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{t(`reimbursement_type_${dicOption.strValueCode}`, dicOption.strDisplayName)}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("settlement_method", "Settlement Method")}
              value={dicForm.intSettlementMethodID}
              onChange={(objEvent) => handleLookupSelection(setDicForm, "intSettlementMethodID", "strSettlementMethod", lstSettlementMethodOptions, objEvent.target.value === "" ? "" : Number(objEvent.target.value))}
              disabled={blnFieldDisabled || blnIsFlexiReimbursement || dicForm.intReimbursementTypeID !== ""}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.settlement-method.select")}
            >
              <MenuItem value="" data-controlid="salary-components.editor.settlement-method.none.option">{t("select", "Select")}</MenuItem>
              {lstSettlementMethodOptions.map((dicOption) => (
                <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.settlement-method.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{t(`settlement_method_${dicOption.strValueCode}`, dicOption.strDisplayName)}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("applicable_for_which_tax_regime", "Applicable For Which Tax Regime")}
              value={dicForm.intApplicableForWhichTaxRegime}
              onChange={(objEvent) => updateRootField("intApplicableForWhichTaxRegime", Number(objEvent.target.value) as SalaryComponentFormValues["intApplicableForWhichTaxRegime"])}
              disabled={blnFieldDisabled}
              fullWidth
              {...buildSelectTestIdProps("salary-components.editor.applicable-tax-regime.select")}
            >
              {lstTaxRegimeApplicabilityOptions.map((dicOption) => (
                <MenuItem key={dicOption.value} value={dicOption.value} data-controlid={`salary-components.editor.applicable-tax-regime.${dicOption.value}.option`}>
                  {t(`applicable_tax_regime_${dicOption.value}`, dicOption.label)}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <FormControlLabel control={<Switch checked={blnApplyMonthlyLimit} onChange={(objEvent) => updateClaimLimitToggle("monthly", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.apply-monthly-limit.switch")} />} label={t("apply_policy_monthly_limit", "Apply Policy Monthly Limit")} />
              {blnApplyMonthlyLimit ? (
                <TextField
                  type="number"
                  label={t("policy_monthly_limit_amount", "Policy Monthly Limit Amount")}
                  value={dicForm.strMonthlyLimitAmount}
                  onChange={(objEvent) => updateRootField("strMonthlyLimitAmount", objEvent.target.value)}
                  disabled={blnFieldDisabled}
                  fullWidth
                  data-controlid="salary-components.editor.monthly-limit-amount.input"
                  inputProps={{ ...buildInputTestIdProps("salary-components.editor.monthly-limit-amount.input"), min: 0, step: "0.01" }}
                />
              ) : null}
            </Box>
            <Box sx={{ display: "grid", gap: 1.25 }}>
              <FormControlLabel control={<Switch checked={blnApplyYearlyLimit} onChange={(objEvent) => updateClaimLimitToggle("yearly", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.apply-yearly-limit.switch")} />} label={t("apply_policy_yearly_limit", "Apply Policy Yearly Limit")} />
              {blnApplyYearlyLimit ? (
                <TextField
                  type="number"
                  label={t("policy_yearly_limit_amount", "Policy Yearly Limit Amount")}
                  value={dicForm.strAnnualLimitAmount}
                  onChange={(objEvent) => updateRootField("strAnnualLimitAmount", objEvent.target.value)}
                  disabled={blnFieldDisabled}
                  fullWidth
                  data-controlid="salary-components.editor.annual-limit-amount.input"
                  inputProps={{ ...buildInputTestIdProps("salary-components.editor.annual-limit-amount.input"), min: 0, step: "0.01" }}
                />
              ) : null}
            </Box>
          </Box>
          <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 1.25 }}>
            {t("policy_limit_help", "These are organisation-level maximum limits. Salary Structure or Employee Salary can define lower employee-specific entitlement.")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
              gap: { xs: 1.25, md: 1.5 },
              mt: 1.5,
              width: "100%",
            }}
          >
            <FormControlLabel sx={{ m: 0 }} control={<Switch size="small" checked={dicForm.blnRequiresBills} onChange={(objEvent) => updateRootField("blnRequiresBills", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.requires-bills.switch")} />} label={t("bill_document_required", "Bill / Document Required")} />
            {blnShowExpenseDateRequired ? <FormControlLabel sx={{ m: 0 }} control={<Switch size="small" checked={dicForm.blnExpenseDateRequired} onChange={(objEvent) => updateRootField("blnExpenseDateRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.expense-date-required.switch")} />} label={t("expense_date_required", "Expense Date Required")} /> : null}
            <FormControlLabel sx={{ m: 0 }} control={<Switch size="small" checked={dicForm.blnAllowPartialApproval} onChange={(objEvent) => updateRootField("blnAllowPartialApproval", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.allow-partial-approval.switch")} />} label={t("allow_partial_approval", "Allow Partial Approval")} />
          </Box>
        </Paper>
      ) : null}

      {blnIsFlexiReimbursement ? (
        <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>4. {t("flexi_eligibility_rules", "Flexi Eligibility Rules")}</Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
                {t("flexi_eligibility_rules_help", "Define employee eligibility conditions for this Flexi reimbursement. Components without eligibility rules are available by default if allowed in salary structure.")}
              </Typography>
              <Typography sx={{ color: "#64748b", fontSize: "0.86rem", mt: 0.75 }}>
                {t("flexi_eligibility_rules_note", "Eligibility is evaluated during ESS Flexi Declaration. Ineligible components will be hidden or disabled based on this rule.")}
              </Typography>
            </Box>
            <Button
              className={styles.secondaryButton}
              startIcon={<AddRoundedIcon />}
              onClick={handleAddFlexiEligibilityRule}
              disabled={blnFieldDisabled}
              data-controlid="salary-components.editor.flexi-eligibility.add-rule.button"
              sx={{
                alignSelf: { xs: "stretch", md: "flex-start" },
                borderRadius: "14px",
                height: 38,
                minHeight: 38,
                px: 2.25,
                py: 0,
                whiteSpace: "nowrap",
              }}
            >
              {t("add_rule", "Add Rule")}
            </Button>
          </Stack>
          {dicForm.lstFlexiEligibilityRules.length === 0 ? (
            <Alert severity="info">{t("flexi_eligibility_rules_empty", "No eligibility rules configured. This component will be available by default when allowed in salary structure.")}</Alert>
          ) : (
            <Stack spacing={1.5}>
              {dicForm.lstFlexiEligibilityRules.map((dicRule, intIndex) => {
                const objQuestion = dicFlexiEligibilityQuestionByID.get(Number(dicRule.intEligibilityQuestionID));
                const lstSelectOptions = Array.isArray(objQuestion?.objOptionJSON) ? objQuestion.objOptionJSON : [];
                const blnBooleanQuestion = objQuestion?.strAnswerType === "boolean";
                const blnNumberQuestion = objQuestion?.strAnswerType === "number";
                const blnSelectQuestion = objQuestion?.strAnswerType === "select";
                const lstRuleConditionOptions = getRuleConditionOptions(objQuestion?.strAnswerType);
                return (
                  <Box key={dicRule.strRowID} data-controlid="salary-components.editor.flexi-eligibility.rule.row" data-row-key={dicRule.strRowID} sx={{ border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", p: 1.5, background: "#f8fafc" }}>
                    <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1}>
                      <Typography sx={{ fontWeight: 700, color: "#0f172a" }}>{t("rule_title", "Rule")} {intIndex + 1}</Typography>
                      <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveFlexiEligibilityRule(dicRule.strRowID)} disabled={blnFieldDisabled} data-controlid="salary-components.editor.flexi-eligibility.remove-rule.button" data-row-key={dicRule.strRowID}>
                        {t("remove_rule", "Remove Rule")}
                      </Button>
                    </Stack>
                    <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, mt: 1.25 }}>
                      <TextField select label={t("eligibility_question", "Eligibility Question")} value={dicRule.intEligibilityQuestionID} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "intEligibilityQuestionID", objEvent.target.value === "" ? "" : Number(objEvent.target.value))} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.question.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.question.select"), "data-row-key": dicRule.strRowID }}>
                        <MenuItem value="" data-controlid="salary-components.editor.flexi-eligibility.question.select.option">{t("select", "Select")}</MenuItem>
                        {lstFlexiEligibilityQuestions.map((dicQuestion) => (
                          <MenuItem key={dicQuestion.intID} value={dicQuestion.intID} data-controlid={`salary-components.editor.flexi-eligibility.question.${dicQuestion.intID}.option`}>{resolveEligibilityQuestionLabel(dicQuestion, intDefaultLanguageID)}</MenuItem>
                        ))}
                      </TextField>
                      <TextField select label={t("rule_condition", "Rule Condition")} value={dicRule.strOperator} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strOperator", objEvent.target.value)} disabled={blnFieldDisabled || !objQuestion} fullWidth data-controlid="salary-components.editor.flexi-eligibility.condition.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.condition.select"), "data-row-key": dicRule.strRowID }}>
                        {lstRuleConditionOptions.map((dicOption) => (
                          <MenuItem key={dicOption.value} value={dicOption.value} data-controlid={`salary-components.editor.flexi-eligibility.condition.${normalizeSelectToken(dicOption.value)}.option`}>{t(`eligibility_rule_condition_${dicOption.value}`, dicOption.label)}</MenuItem>
                        ))}
                      </TextField>
                      {blnBooleanQuestion ? (
                        <TextField select label={t("required_answer", "Required Answer")} value={dicRule.strExpectedValue} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strExpectedValue", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.boolean-answer.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.boolean-answer.select"), "data-row-key": dicRule.strRowID }}>
                          <MenuItem value="" data-controlid="salary-components.editor.flexi-eligibility.boolean-answer.select.option">{t("select", "Select")}</MenuItem>
                          <MenuItem value="true" data-controlid="salary-components.editor.flexi-eligibility.boolean-answer.true.option">{t("yes", "Yes")}</MenuItem>
                          <MenuItem value="false" data-controlid="salary-components.editor.flexi-eligibility.boolean-answer.false.option">{t("no", "No")}</MenuItem>
                        </TextField>
                      ) : null}
                      {blnSelectQuestion ? (
                        <TextField select={lstSelectOptions.length > 0} label={t("required_answer", "Required Answer")} value={dicRule.strExpectedValue} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strExpectedValue", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.select-answer.input" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.select-answer.input"), "data-row-key": dicRule.strRowID }}>
                          {lstSelectOptions.length > 0 ? <MenuItem value="" data-controlid="salary-components.editor.flexi-eligibility.select-answer.select.option">{t("select", "Select")}</MenuItem> : null}
                          {lstSelectOptions.map((objOption) => {
                            const strOptionLabel = typeof objOption === "string" ? objOption : String((objOption as { label?: string; value?: string }).label ?? (objOption as { value?: string }).value ?? "");
                            const strOptionValue = typeof objOption === "string" ? objOption : String((objOption as { value?: string; label?: string }).value ?? (objOption as { label?: string }).label ?? "");
                            return <MenuItem key={strOptionValue} value={strOptionValue} data-controlid={`salary-components.editor.flexi-eligibility.select-answer.${normalizeSelectToken(strOptionValue)}.option`}>{strOptionLabel}</MenuItem>;
                          })}
                        </TextField>
                      ) : null}
                      {blnNumberQuestion ? (
                        <>
                          <TextField label={dicRule.strOperator === "between" ? t("minimum_value", "Minimum Value") : t("required_value", "Required Value")} value={dicRule.strMinValue} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strMinValue", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.min-value.input" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.min-value.input"), "data-row-key": dicRule.strRowID }} />
                          {dicRule.strOperator === "between" ? <TextField label={t("maximum_value", "Maximum Value")} value={dicRule.strMaxValue} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strMaxValue", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.max-value.input" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.max-value.input"), "data-row-key": dicRule.strRowID }} /> : null}
                        </>
                      ) : null}
                      <TextField select label={t("multiplier", "Multiplier")} value={dicRule.strMultiplierMode} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strMultiplierMode", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.multiplier.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.multiplier.select"), "data-row-key": dicRule.strRowID }}>
                        {["none", "by_answer_value", "by_dependent_child_count"].map((strMode) => (
                          <MenuItem key={strMode} value={strMode} data-controlid={`salary-components.editor.flexi-eligibility.multiplier.${normalizeSelectToken(strMode)}.option`}>{strMode}</MenuItem>
                        ))}
                      </TextField>
                      {dicRule.strMultiplierMode !== "none" ? <TextField label={t("multiplier_cap", "Multiplier Cap")} value={dicRule.strMultiplierCap} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strMultiplierCap", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.multiplier-cap.input" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.multiplier-cap.input"), "data-row-key": dicRule.strRowID }} /> : null}
                      <TextField select label={t("when_not_eligible", "When not eligible")} value={dicRule.strIneligibleBehavior} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strIneligibleBehavior", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.ineligible-behavior.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.ineligible-behavior.select"), "data-row-key": dicRule.strRowID }}>
                        <MenuItem value="show_disabled" data-controlid="salary-components.editor.flexi-eligibility.ineligible-behavior.show-disabled.option">{t("show_disabled", "Show disabled")}</MenuItem>
                        <MenuItem value="hide" data-controlid="salary-components.editor.flexi-eligibility.ineligible-behavior.hide.option">{t("hide", "Hide")}</MenuItem>
                      </TextField>
                      <TextField label={t("failure_message", "Failure Message")} value={dicRule.strFailureMessage} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "strFailureMessage", objEvent.target.value)} disabled={blnFieldDisabled} fullWidth data-controlid="salary-components.editor.flexi-eligibility.failure-message.input" inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.failure-message.input"), "data-row-key": dicRule.strRowID }} />
                    </Box>
                    <Box sx={{ display: "flex", gap: 2, mt: 1.25, flexWrap: "wrap" }}>
                      <FormControlLabel control={<Switch size="small" checked={dicRule.blnIsRequired} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "blnIsRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.required.switch"), "data-row-key": dicRule.strRowID }} />} label={t("required", "Required")} />
                      <FormControlLabel control={<Switch size="small" checked={dicRule.blnIsActive} onChange={(objEvent) => updateFlexiEligibilityRule(dicRule.strRowID, "blnIsActive", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={{ ...buildInputTestIdProps("salary-components.editor.flexi-eligibility.active.switch"), "data-row-key": dicRule.strRowID }} />} label={t("active", "Active")} />
                    </Box>
                    {objQuestion ? <Typography sx={{ color: "#64748b", fontSize: "0.84rem", mt: 1 }}>{resolveEligibilityQuestionHelpText(objQuestion, intDefaultLanguageID)}</Typography> : null}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>
      ) : null}

      {blnShowFlagsSection ? (
      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? (blnIsFlexiReimbursement ? "5." : "4.") : "3."} {t("statutory_and_payroll_flags", "Statutory & Payroll Flags")}</Typography>
        <Box sx={{ border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", overflow: "hidden", background: "#fff" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${(blnShowPayrollProcessingGroup ? 1 : 0) + (blnShowContributionTypeGroup ? 1 : 0) + (blnShowStatutoryFlags ? 1 : 0)}, minmax(0, 1fr))` }, borderBottom: "1px solid rgba(203,213,225,0.8)" }}>
            {blnShowStatutoryFlags ? (
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontWeight: 800, color: "#334155" }}>{t("statutory", "Statutory")}</Typography>
              </Box>
            ) : null}
            {blnShowPayrollProcessingGroup ? (
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontWeight: 800, color: "#334155" }}>{t("payroll_processing", "Payroll Processing")}</Typography>
              </Box>
            ) : null}
            {blnShowContributionTypeGroup ? (
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontWeight: 800, color: "#334155" }}>{t("contribution_type", "Contribution Type")}</Typography>
              </Box>
            ) : null}
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `repeat(${(blnShowPayrollProcessingGroup ? 1 : 0) + (blnShowContributionTypeGroup ? 1 : 0) + (blnShowStatutoryFlags ? 1 : 0)}, minmax(0, 1fr))` }, alignItems: "start" }}>
            {blnShowStatutoryFlags ? (
              <Box sx={{ px: 3, py: 2.25 }}>
                <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 3, alignItems: "center", minWidth: 0 }}>
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIncludeInPF} onChange={(objEvent) => updateRootField("blnIncludeInPF", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-pf.switch")} />} label={t("include_in_pf", "Include In PF")} />
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIncludeInESIC} onChange={(objEvent) => updateRootField("blnIncludeInESIC", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-esic.switch")} />} label={t("include_in_esic", "Include In ESIC")} />
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIncludeInGratuity} onChange={(objEvent) => updateRootField("blnIncludeInGratuity", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-gratuity.switch")} />} label={t("include_in_gratuity", "Include In Gratuity")} />
                </Box>
              </Box>
            ) : null}
            {blnShowPayrollProcessingGroup ? (
              <Box sx={{ px: 3, py: 2.25 }}>
                <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 3, alignItems: "center", minWidth: 0 }}>
                  {blnShowRemunerationFlag ? <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIncludeInRemuneration} onChange={(objEvent) => updateRootField("blnIncludeInRemuneration", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.include-in-remuneration.switch")} />} label={t("include_in_remuneration", "Include In Remuneration")} /> : null}
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnAllowManualOverride} onChange={(objEvent) => updateRootField("blnAllowManualOverride", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.allow-manual-override.switch")} />} label={t("allow_manual_override", "Allow Manual Override")} />
                </Box>
              </Box>
            ) : null}
            {blnShowContributionTypeGroup ? (
              <Box sx={{ px: 3, py: 2.25 }}>
                <Box sx={{ display: "flex", flexWrap: "nowrap", gap: 3, alignItems: "center", minWidth: 0 }}>
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIsEmployeeDeduction} disabled inputProps={buildInputTestIdProps("salary-components.editor.employee-deduction.switch")} />} label={t("employee_deduction", "Employee Deduction")} />
                  <FormControlLabel sx={{ m: 0 }} control={<Switch checked={dicForm.blnIsEmployerContribution} disabled inputProps={buildInputTestIdProps("salary-components.editor.employer-contribution.switch")} />} label={t("employer_contribution", "Employer Contribution")} />
                </Box>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Paper>
      ) : null}

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "5." : "4."} {t("payslip_configuration", "Payslip Configuration")}</Typography>
        {blnIsFlexiBucketCategory ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t(
              "flexi_bucket_payslip_help",
              "Flexi Pay itself stays hidden on the payslip. If nothing is allocated, the selected residual component appears on the payslip. If allocations are made, the allocated flexi components appear instead."
            )}
          </Alert>
        ) : null}
        <Box
          sx={{
            display: "grid",
            gap: 2,
            alignItems: "start",
            gridTemplateColumns: { xs: "1fr", md: "minmax(220px, 280px) repeat(2, minmax(0, 1fr))" },
            mb: 1.5,
          }}
        >
          <FormControlLabel
            sx={{ m: 0, pt: { xs: 0, md: 1.25 }, minHeight: 56, alignItems: "center" }}
            control={<Switch checked={dicForm.blnIncludeInPayslip} onChange={(objEvent) => updateRootField("blnIncludeInPayslip", objEvent.target.checked)} disabled={blnFieldDisabled || blnIsFlexiBucketCategory} inputProps={buildInputTestIdProps("salary-components.editor.include-in-payslip.switch")} />}
            label={t("show_on_payslip", "Show on Payslip")}
          />
          <TextField select label={t("payslip_section", "Payslip Section")} value={dicForm.intPayslipSectionID} onChange={(objEvent) => handleLookupSelection(setDicForm, "intPayslipSectionID", "strPayslipSection", lstPayslipSections, objEvent.target.value === "" ? "" : Number(objEvent.target.value))} disabled={blnFieldDisabled || blnIsFlexiBucketCategory || !dicForm.blnIncludeInPayslip} fullWidth {...buildSelectTestIdProps("salary-components.editor.payslip-section.select")}>
            <MenuItem value="" data-controlid="salary-components.editor.payslip-section.none.option">{t("none", "None")}</MenuItem>
            {lstPayslipSections.map((dicOption) => (
              <MenuItem key={dicOption.intID} value={dicOption.intID} data-controlid={`salary-components.editor.payslip-section.${normalizeSelectToken(dicOption.strValueCode)}.option`}>{t(`payslip_section_${normalizeSelectToken(dicOption.strValueCode)}`, getPayslipSectionLabel(dicOption.strDisplayName))}</MenuItem>
            ))}
          </TextField>
          <TextField label={t("display_order", "Display Order")} value={dicForm.strDisplayOrder} onChange={(objEvent) => updateRootField("strDisplayOrder", objEvent.target.value.replace(/\D/g, ""))} disabled={blnFieldDisabled || blnIsFlexiBucketCategory || !dicForm.blnIncludeInPayslip} fullWidth data-controlid="salary-components.editor.display-order.input" inputProps={buildInputTestIdProps("salary-components.editor.display-order.input")} />
        </Box>
     </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "6." : "5."} {t("tax_declaration_configuration", "Tax / Declaration Configuration")}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControlLabel control={<Switch checked={dicForm.blnDeclarationRequired} onChange={(objEvent) => updateRootField("blnDeclarationRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.declaration-required.switch")} />} label={t("declaration_required", "Declaration required")} />
          {!blnIsReimbursementCategory ? <FormControlLabel control={<Switch checked={dicForm.blnProofRequired} onChange={(objEvent) => updateRootField("blnProofRequired", objEvent.target.checked)} disabled={blnFieldDisabled} inputProps={buildInputTestIdProps("salary-components.editor.proof-required.switch")} />} label={t("proof_required_tax_exemption", "Proof Required for Tax Exemption")} /> : null}
        </Stack>
      </Paper>

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#0f172a" }}>{blnShowFlexiSection ? "7." : "6."} {t("translations", "Translations")}</Typography>
            <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mt: 0.4 }}>
              {t("multilingual_text_help", "Add translated component names and descriptions for supported languages.")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.1, alignItems: "center", ml: "auto" }}>
            <Button className={styles.secondaryButton} startIcon={<AddRoundedIcon />} onClick={handleAddLanguageRow} disabled data-controlid="salary-components.editor.multilingual.add-language.button">
              {t("add_language", "Add Language")}
            </Button>
            <Button
              className={styles.primaryButton}
              onClick={() => void handleTranslateClick()}
              disabled={blnFieldDisabled || dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]}
              data-controlid="salary-components.editor.multilingual.translate.button"
            >
              {dicTextTranslationLoading[dicForm.lstTexts[1]?.strRowID ?? ""]
                ? <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                : t("translate", "AI Translate")}
            </Button>
          </Box>
        </Stack>
        <Stack spacing={1.5}>
          {dicForm.lstTexts.map((dicText, intIndex) => (
            <Box key={dicText.strRowID} sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "220px 1fr 1.1fr auto" }, alignItems: "start", border: "1px solid rgba(203,213,225,0.8)", borderRadius: "18px", p: 1.5, background: "#f8fafc" }}>
              <TextField select label={t("language", "Language")} value={dicText.intLanguageID} onChange={(objEvent) => updateTextRow(dicText.strRowID, "intLanguageID", Number(objEvent.target.value))} disabled fullWidth data-controlid="salary-components.editor.multilingual.language.select" inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.language.select"), "data-row-key": dicText.strRowID }}>
                {(objFormOptions?.lstLanguages ?? []).map((dicLanguage) => (
                  <MenuItem key={dicLanguage.intID} value={dicLanguage.intID} data-controlid={`salary-components.editor.multilingual.language.${dicLanguage.intID}.option`}>{dicLanguage.strLabel}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("component_name", "Component Name")}
                value={dicText.strComponentName}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentName", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                data-controlid="salary-components.editor.multilingual.component-name.input"
                inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.component-name.input"), "data-row-key": dicText.strRowID }}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <TextField
                label={t("description", "Description")}
                value={dicText.strComponentDescription}
                onChange={(objEvent) => updateTextRow(dicText.strRowID, "strComponentDescription", objEvent.target.value)}
                disabled={blnFieldDisabled || intIndex === 0}
                data-controlid="salary-components.editor.multilingual.description.input"
                inputProps={{ ...buildInputTestIdProps("salary-components.editor.multilingual.description.input"), "data-row-key": dicText.strRowID }}
                InputProps={{
                  endAdornment: dicTextTranslationLoading[dicText.strRowID]
                    ? <InputAdornment position="end"><CircularProgress size={18} sx={{ color: "#2563eb" }} /></InputAdornment>
                    : undefined
                }}
                fullWidth
              />
              <Button color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleRemoveLanguageRow(dicText.strRowID)} disabled data-controlid="salary-components.editor.multilingual.remove.button" data-row-key={dicText.strRowID} sx={{ minHeight: 54 }}>
                {t("remove_button", "Remove")}
              </Button>
            </Box>
          ))}
        </Stack>
      </Paper>

      {blnShowCalculationDependencies ? (
      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "8." : "7."} {t("calculation_dependencies", "Calculation Dependencies")}</Typography>
        <Typography sx={{ color: "#64748b", fontSize: "0.9rem", mb: 1.25 }}>
          {t("dependency_mapping_help", "Select salary components required for formula calculations.")}
        </Typography>
        <Box sx={{ maxWidth: 540 }}>
          <TextField
            select
            label={t("dependency_components", "Dependency Components")}
            value={dicForm.lstDependencyComponentIDs}
            onChange={(objEvent) => updateRootField("lstDependencyComponentIDs", parseMultiSelectNumberValues(objEvent.target.value))}
            data-controlid="salary-components.editor.dependency-components.select"
            inputProps={buildInputTestIdProps("salary-components.editor.dependency-components.select")}
            SelectProps={{ multiple: true, renderValue: (lstSelected) => (
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                {(lstSelected as Array<string | number>).map((objValue) => {
                  const intValue = Number(objValue);
                  const dicOption = dicDependencyOptionByID.get(intValue);
                  return <Chip key={String(objValue)} size="small" data-controlid="salary-components.editor.dependency-components.selected.chip" data-option-key={String(objValue)} label={dicOption?.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption?.strLabel ?? String(objValue)} />;
                })}
              </Box>
            ) }}
            disabled={blnFieldDisabled}
            fullWidth
          >
            {(objFormOptions?.lstDependencyComponents ?? [])
              .filter((dicOption) => dicOption.intID !== intSalaryComponentID)
              .map((dicOption) => (
                <MenuItem
                  key={dicOption.intID}
                  value={dicOption.intID}
                  data-controlid={`salary-components.editor.dependency-components.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.option`}
                  data-option-key={dicOption.intID}
                >
                  <Checkbox
                    data-controlid={`salary-components.editor.dependency-components.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.checkbox`}
                    data-option-key={dicOption.intID}
                    size="small"
                    checked={dicForm.lstDependencyComponentIDs.includes(dicOption.intID)}
                    inputProps={{
                      ...buildInputTestIdProps(`salary-components.editor.dependency-components.${normalizeSelectToken(dicOption.strCode || dicOption.strLabel)}.checkbox`),
                      "data-option-key": String(dicOption.intID)
                    } as InputHTMLAttributes<HTMLInputElement>}
                    sx={{ mr: 1 }}
                  />
                  <ListItemText primary={dicOption.strCode ? `${dicOption.strCode} - ${dicOption.strLabel}` : dicOption.strLabel} />
                </MenuItem>
              ))}
          </TextField>
        </Box>
      </Paper>
      ) : null}

      <Paper sx={{ borderRadius: "24px", p: 2.5, border: "1px solid rgba(148,163,184,0.18)" }}>
        <Typography sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>{blnShowFlexiSection ? "9." : "8."} {t("usage_information", "Usage Information")}</Typography>
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>{t("used_in_salary_structures", "Used In Salary Structures")}</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intUsedInSalaryStructures ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>{t("assigned_employees", "Assigned Employees")}</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intAssignedEmployees ?? 0}</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: "18px" }}>
            <Typography sx={{ color: "#64748b", fontSize: "0.85rem" }}>{t("formula_references", "Formula References")}</Typography>
            <Typography sx={{ fontWeight: 800, color: "#0f172a", fontSize: "1.4rem" }}>{objDetail?.intFormulaReferences ?? 0}</Typography>
          </Paper>
        </Box>
      </Paper>
    </Stack>
  );
}
