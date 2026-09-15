import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";
import { resolveLookupDisplayLabel } from "@/features/payroll-lookups/utils/lookupLabel";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryComponentDetailRecord,
  SalaryComponentFlexiEligibilityRuleFormValue,
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
  SalaryComponentLookupOption,
  SalaryComponentListRecord,
  SalaryComponentTextFormValue
} from "@/features/salary-components/types";

let intRowIDSequence = 0;
let intRuleRowIDSequence = 0;

function createRowID() {
  intRowIDSequence += 1;
  return `salary-component-text-row-${intRowIDSequence}`;
}

function createRuleRowID() {
  intRuleRowIDSequence += 1;
  return `salary-component-flexi-rule-row-${intRuleRowIDSequence}`;
}

function formatOptionalText(strValue: string) {
  const strTrimmedValue = strValue.trim();
  return strTrimmedValue ? strTrimmedValue : null;
}

function isReimbursementCategory(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "") === "reimbursement";
}

function normalizeLookupCode(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function normalizeCategory(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function deriveIncludedInCtc(dicValues: SalaryComponentFormValues) {
  const strCategory = normalizeCategory(dicValues.strComponentCategory);
  if (strCategory === "deduction" || strCategory === "information") {
    return false;
  }
  if (["earning", "employercontribution", "contribution", "flexibucket", "flexibasket"].includes(strCategory)) {
    return true;
  }
  if (strCategory === "reimbursement") {
    return dicValues.blnIsFlexiBenefit || dicValues.strReimbursementType === "ctc_based";
  }
  return Boolean(dicValues.blnIncludedInCtc);
}

function isDependencyBackedCalculation(dicValues: SalaryComponentFormValues) {
  const strCategory = normalizeCategory(dicValues.strComponentCategory);
  const strCalcMethod = dicValues.strCalcMethod.trim().toLowerCase().replace(/[\s_-]+/g, "");
  return strCategory !== "reimbursement"
    && strCategory !== "flexibucket"
    && strCategory !== "flexibasket"
    && (strCalcMethod === "formula" || strCalcMethod === "percentage" || Boolean(dicValues.strFormulaExpression.trim()));
}

function normalizeIntegerList(lstValues: Array<number | string>) {
  return Array.from(
    new Set(
      lstValues
        .map((objValue) => Number(objValue))
        .filter((intValue) => Number.isInteger(intValue) && intValue > 0)
    )
  );
}

function sanitizeDependencyIDs(
  lstValues: Array<number | string>,
  intSalaryComponentID?: number
) {
  return normalizeIntegerList(lstValues).filter(
    (intValue) => !intSalaryComponentID || intValue !== intSalaryComponentID
  );
}

function mapLookupOptions(
  lstOptions: Array<{
    intID: number;
    strValueCode: string;
    strDisplayName: string;
    strDescription?: string | null;
    intDisplayOrder?: number | null;
    blnIsActive?: boolean;
    strLegacyValue?: string | null;
  }> | undefined,
  lstLegacyValues: string[] = []
): SalaryComponentLookupOption[] {
  if (lstOptions && lstOptions.length > 0) {
    return lstOptions.map((dicOption, intIndex) => ({
      intID: dicOption.intID,
      strValueCode: dicOption.strValueCode,
      strDisplayName: resolveLookupDisplayLabel({
        strDisplayName: dicOption.strDisplayName,
        strLegacyValue: dicOption.strLegacyValue,
        strValueCode: dicOption.strValueCode,
      }),
      strDescription: dicOption.strDescription ?? null,
      intDisplayOrder: Number(dicOption.intDisplayOrder ?? ((intIndex + 1) * 10)),
      blnIsActive: Boolean(dicOption.blnIsActive ?? true),
      strLegacyValue: dicOption.strLegacyValue ?? null,
    }));
  }

  return lstLegacyValues.map((strValue, intIndex) => ({
    intID: intIndex + 1,
    strValueCode: strValue,
    strDisplayName: resolveLookupDisplayLabel({
      strDisplayName: strValue,
      strLegacyValue: strValue,
      strValueCode: strValue,
    }),
    strDescription: null,
    intDisplayOrder: (intIndex + 1) * 10,
    blnIsActive: true,
    strLegacyValue: strValue,
  }));
}

function mapApiRecord(dicRecord: SalaryComponentApiRecord): SalaryComponentDetailRecord {
  const lstDependencyComponentIDs = sanitizeDependencyIDs(
    dicRecord.lstDependencyComponentIDs ?? [],
    dicRecord.intID
  );
  return {
    intID: dicRecord.intID,
    strRecordUUID: dicRecord.strRecordUUID,
    strComponentCode: dicRecord.strComponentCode,
    strComponentName: dicRecord.strComponentName,
    blnIsWages: Boolean(dicRecord.blnIsWages),
    strComponentDescription: dicRecord.strComponentDescription ?? null,
    intComponentCategoryID: dicRecord.intComponentCategoryID ?? null,
    strComponentCategory: dicRecord.strComponentCategory,
    intComponentGroupID: dicRecord.intComponentGroupID ?? null,
    strComponentGroup: dicRecord.strComponentGroup ?? null,
    intPayrollProcessingModeID: dicRecord.intPayrollProcessingModeID ?? null,
    strPayrollProcessingMode: dicRecord.strPayrollProcessingMode ?? null,
    intCalcMethodID: dicRecord.intCalcMethodID ?? null,
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression,
    decDefaultPercentageValue: dicRecord.decDefaultPercentageValue ?? null,
    intDefaultBasisComponentID: dicRecord.intDefaultBasisComponentID ?? null,
    intRoundingRuleID: dicRecord.intRoundingRuleID ?? null,
    strRoundingRule: dicRecord.strRoundingRule,
    intDefaultPeriodicityID: dicRecord.intDefaultPeriodicityID ?? null,
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    intTaxTreatmentID: dicRecord.intTaxTreatmentID ?? null,
    strTaxTreatment: dicRecord.strTaxTreatment,
    intCtcTreatmentID: dicRecord.intCtcTreatmentID ?? null,
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration ?? true),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome ?? true),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc ?? true),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip ?? true),
    intPayslipSectionID: dicRecord.intPayslipSectionID ?? null,
    strPayslipSection: dicRecord.strPayslipSection ?? null,
    intDisplayOrder: Number(dicRecord.intDisplayOrder ?? 10),
    intLwpTreatmentID: dicRecord.intLwpTreatmentID ?? null,
    strLwpTreatmentCode: dicRecord.strLwpTreatmentCode ?? "NONE",
    strLwpTreatment: dicRecord.strLwpTreatment ?? null,
    intLwpReducedAmountHandlingID: dicRecord.intLwpReducedAmountHandlingID ?? null,
    strLwpReducedAmountHandlingCode: dicRecord.strLwpReducedAmountHandlingCode ?? "NOT_APPLICABLE",
    strLwpReducedAmountHandling: dicRecord.strLwpReducedAmountHandling ?? null,
    strLwpProrationFormula: dicRecord.strLwpProrationFormula ?? null,
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsFlexiBasket: Boolean(dicRecord.blnIsFlexiBasket),
    intFlexiComponentTypeID: dicRecord.intFlexiComponentTypeID ?? null,
    strFlexiComponentType: dicRecord.strFlexiComponentType ?? null,
    intReimbursementTypeID: dicRecord.intReimbursementTypeID ?? null,
    strReimbursementType: dicRecord.strReimbursementType ?? null,
    intSettlementMethodID: dicRecord.intSettlementMethodID ?? null,
    strSettlementMethod: dicRecord.strSettlementMethod ?? null,
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    intApplicableTaxRegimeID: dicRecord.intApplicableTaxRegimeID ?? null,
    decAnnualLimitAmount: dicRecord.decAnnualLimitAmount ?? null,
    decMonthlyLimitAmount: dicRecord.decMonthlyLimitAmount ?? null,
    intClaimLimitTypeID: dicRecord.intClaimLimitTypeID ?? null,
    strClaimLimitType: dicRecord.strClaimLimitType ?? null,
    intFlexiBalanceHandlingID: dicRecord.intFlexiBalanceHandlingID ?? null,
    blnAllowExcessClaim: Boolean(dicRecord.blnAllowExcessClaim),
    blnExcessClaimTaxable: Boolean(dicRecord.blnExcessClaimTaxable),
    intResidualComponentID: dicRecord.intResidualComponentID ?? null,
    blnAutoPushToPayroll: Boolean(dicRecord.blnAutoPushToPayroll),
    blnFinanceSettlementRequired: Boolean(dicRecord.blnFinanceSettlementRequired),
    intUsedInSalaryStructures: Number(dicRecord.intUsedInSalaryStructures ?? 0),
    intAssignedEmployees: Number(dicRecord.intAssignedEmployees ?? 0),
    intFormulaReferences: Number(dicRecord.intFormulaReferences ?? 0),
    blnIsEmployerContribution: Boolean(dicRecord.blnIsEmployerContribution),
    blnIsEmployeeDeduction: Boolean(dicRecord.blnIsEmployeeDeduction),
    blnDeclarationRequired: Boolean(dicRecord.blnDeclarationRequired),
    blnProofRequired: Boolean(dicRecord.blnProofRequired),
    blnAllowManualOverride: Boolean(dicRecord.blnAllowManualOverride),
    blnIsActive: Boolean(dicRecord.blnIsActive),
    intDependencyCount: lstDependencyComponentIDs.length,
    lstDependencyComponentIDs,
    lstFlexiEligibilityRules: (dicRecord.lstFlexiEligibilityRules ?? []).map((dicRule) => ({
      intID: dicRule.intID,
      intEligibilityQuestionID: dicRule.intEligibilityQuestionID,
      strOperator: dicRule.strOperator,
      strExpectedValue: dicRule.strExpectedValue ?? null,
      fltMinValue: dicRule.fltMinValue ?? null,
      fltMaxValue: dicRule.fltMaxValue ?? null,
      strMultiplierMode: dicRule.strMultiplierMode,
      fltMultiplierCap: dicRule.fltMultiplierCap ?? null,
      strIneligibleBehavior: dicRule.strIneligibleBehavior,
      strFailureMessage: dicRule.strFailureMessage ?? null,
      blnIsRequired: Boolean(dicRule.blnIsRequired),
      blnIsActive: Boolean(dicRule.blnIsActive),
      intDisplayOrder: Number(dicRule.intDisplayOrder ?? 10),
      objQuestion: dicRule.objQuestion ? {
        intID: dicRule.objQuestion.intID,
        strQuestionCode: dicRule.objQuestion.strQuestionCode,
        strAnswerType: dicRule.objQuestion.strAnswerType,
        strSourceType: "",
        blnIsEmployeeEditable: true,
        strDefaultLabel: dicRule.objQuestion.strDefaultLabel,
        strDefaultHelpText: dicRule.objQuestion.strDefaultHelpText ?? null,
        strValueUnit: dicRule.objQuestion.strValueUnit ?? null,
        decMinValue: null,
        decMaxValue: null,
        objOptionJSON: dicRule.objQuestion.objOptionJSON,
        intDisplayOrder: 10,
        blnIsActive: true,
        lstTexts: (dicRule.objQuestion.lstTexts ?? []).map((dicText) => ({
          intLanguageID: dicText.intLanguageID,
          strQuestionLabel: dicText.strQuestionLabel,
          strHelpText: dicText.strHelpText ?? null,
        })),
      } : null,
    })),
    lstTexts: (dicRecord.lstTexts ?? []).map((dicText) => ({
      intLanguageID: dicText.intLanguageID,
      strLanguageName: dicText.strLanguageName,
      strComponentName: dicText.strComponentName,
      strComponentDescription: dicText.strComponentDescription
    })),
    lstDependencyComponents: dicRecord.lstDependencyComponents ?? []
  };
}

export function createEmptySalaryComponentTextRow(): SalaryComponentTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strComponentName: "",
    strComponentDescription: ""
  };
}

export function createEmptySalaryComponentFlexiEligibilityRuleRow(): SalaryComponentFlexiEligibilityRuleFormValue {
  return {
    strRowID: createRuleRowID(),
    intEligibilityQuestionID: "",
    strOperator: "equals",
    strExpectedValue: "",
    strMinValue: "",
    strMaxValue: "",
    strMultiplierMode: "none",
    strMultiplierCap: "",
    strIneligibleBehavior: "show_disabled",
    strFailureMessage: "",
    blnIsRequired: true,
    blnIsActive: true,
    intDisplayOrder: 10,
  };
}

export function createInitialSalaryComponentForm(): SalaryComponentFormValues {
  return {
    strComponentCode: "",
    strComponentName: "",
    strComponentDescription: "",
    blnIsWages: true,
    intComponentCategoryID: "",
    strComponentCategory: "",
    intComponentGroupID: "",
    strComponentGroup: "",
    intPayrollProcessingModeID: "",
    strPayrollProcessingMode: "REGULAR",
    intCalcMethodID: "",
    strCalcMethod: "fixed",
    strFormulaExpression: "",
    strDefaultPercentageValue: "",
    intDefaultBasisComponentID: "",
    intRoundingRuleID: "",
    strRoundingRule: "",
    intDefaultPeriodicityID: "",
    strDefaultPeriodicity: "monthly",
    intTaxTreatmentID: "",
    strTaxTreatment: "",
    intCtcTreatmentID: "",
    blnIncludeInPF: false,
    blnIncludeInESIC: false,
    blnIncludeInGratuity: false,
    blnIncludeInRemuneration: true,
    blnIncludeInTaxableIncome: true,
    blnIncludedInCtc: true,
    blnIncludeInPayslip: true,
    intPayslipSectionID: "",
    strPayslipSection: "",
    strDisplayOrder: "10",
    intLwpTreatmentID: "",
    strLwpTreatmentCode: "NONE",
    intLwpReducedAmountHandlingID: "",
    strLwpReducedAmountHandlingCode: "NOT_APPLICABLE",
    strLwpProrationFormula: "",
    blnIsFlexiBenefit: false,
    blnIsReimbursement: false,
    intReimbursementTypeID: "",
    strReimbursementType: "none",
    intSettlementMethodID: "",
    strSettlementMethod: "none",
    blnRequiresBills: false,
    blnExpenseDateRequired: true,
    blnAllowPartialApproval: true,
    intApplicableTaxRegimeID: "",
    intApplicableForWhichTaxRegime: 2,
    intClaimLimitTypeID: "",
    strClaimLimitType: "none",
    intFlexiComponentTypeID: "",
    intFlexiBalanceHandlingID: "",
    strAnnualLimitAmount: "",
    strMonthlyLimitAmount: "",
    blnAllowExcessClaim: false,
    blnExcessClaimTaxable: false,
    intResidualComponentID: "",
    blnAutoPushToPayroll: false,
    blnFinanceSettlementRequired: false,
    blnIsEmployerContribution: false,
    blnIsEmployeeDeduction: false,
    blnDeclarationRequired: false,
    blnProofRequired: false,
    blnAllowManualOverride: true,
    blnIsActive: true,
    lstDependencyComponentIDs: [],
    lstFlexiEligibilityRules: [],
    lstTexts: [createEmptySalaryComponentTextRow()]
  };
}

export function toSalaryComponentFormValues(dicRecord: SalaryComponentDetailRecord): SalaryComponentFormValues {
  return {
    strComponentCode: dicRecord.strComponentCode,
    strComponentName: dicRecord.strComponentName,
    strComponentDescription: dicRecord.strComponentDescription ?? "",
    blnIsWages: Boolean(dicRecord.blnIsWages),
    intComponentCategoryID: dicRecord.intComponentCategoryID ?? "",
    strComponentCategory: dicRecord.strComponentCategory,
    intComponentGroupID: dicRecord.intComponentGroupID ?? "",
    strComponentGroup: dicRecord.strComponentGroup ?? "",
    intPayrollProcessingModeID: dicRecord.intPayrollProcessingModeID ?? "",
    strPayrollProcessingMode: dicRecord.strPayrollProcessingMode ?? "REGULAR",
    intCalcMethodID: dicRecord.intCalcMethodID ?? "",
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression ?? "",
    strDefaultPercentageValue: dicRecord.decDefaultPercentageValue != null ? String(dicRecord.decDefaultPercentageValue) : "",
    intDefaultBasisComponentID: dicRecord.intDefaultBasisComponentID ?? "",
    intRoundingRuleID: dicRecord.intRoundingRuleID ?? "",
    strRoundingRule: dicRecord.strRoundingRule ?? "",
    intDefaultPeriodicityID: dicRecord.intDefaultPeriodicityID ?? "",
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    intTaxTreatmentID: dicRecord.intTaxTreatmentID ?? "",
    strTaxTreatment: dicRecord.strTaxTreatment ?? "",
    intCtcTreatmentID: dicRecord.intCtcTreatmentID ?? "",
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip),
    intPayslipSectionID: dicRecord.intPayslipSectionID ?? "",
    strPayslipSection: dicRecord.strPayslipSection ?? "",
    strDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
    intLwpTreatmentID: dicRecord.intLwpTreatmentID ?? "",
    strLwpTreatmentCode: dicRecord.strLwpTreatmentCode ?? "NONE",
    intLwpReducedAmountHandlingID: dicRecord.intLwpReducedAmountHandlingID ?? "",
    strLwpReducedAmountHandlingCode: dicRecord.strLwpReducedAmountHandlingCode ?? "NOT_APPLICABLE",
    strLwpProrationFormula: dicRecord.strLwpProrationFormula ?? "",
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    intReimbursementTypeID: dicRecord.intReimbursementTypeID ?? "",
    strReimbursementType: (dicRecord.strReimbursementType as SalaryComponentFormValues["strReimbursementType"]) ?? "none",
    intSettlementMethodID: dicRecord.intSettlementMethodID ?? "",
    strSettlementMethod: (dicRecord.strSettlementMethod as SalaryComponentFormValues["strSettlementMethod"]) ?? "none",
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    intApplicableTaxRegimeID: dicRecord.intApplicableTaxRegimeID ?? "",
    intApplicableForWhichTaxRegime: Number((dicRecord as SalaryComponentApiRecord).intApplicableForWhichTaxRegime ?? 2) as SalaryComponentFormValues["intApplicableForWhichTaxRegime"],
    intClaimLimitTypeID: dicRecord.intClaimLimitTypeID ?? "",
    strClaimLimitType: (dicRecord.strClaimLimitType as SalaryComponentFormValues["strClaimLimitType"]) ?? "none",
    intFlexiComponentTypeID: dicRecord.intFlexiComponentTypeID ?? "",
    intFlexiBalanceHandlingID: dicRecord.intFlexiBalanceHandlingID ?? "",
    strAnnualLimitAmount: dicRecord.decAnnualLimitAmount != null ? String(dicRecord.decAnnualLimitAmount) : "",
    strMonthlyLimitAmount: dicRecord.decMonthlyLimitAmount != null ? String(dicRecord.decMonthlyLimitAmount) : "",
    blnAllowExcessClaim: Boolean(dicRecord.blnAllowExcessClaim),
    blnExcessClaimTaxable: Boolean(dicRecord.blnExcessClaimTaxable),
    intResidualComponentID: dicRecord.intResidualComponentID ?? "",
    blnAutoPushToPayroll: Boolean(dicRecord.blnAutoPushToPayroll),
    blnFinanceSettlementRequired: Boolean(dicRecord.blnFinanceSettlementRequired),
    blnIsEmployerContribution: Boolean(dicRecord.blnIsEmployerContribution),
    blnIsEmployeeDeduction: Boolean(dicRecord.blnIsEmployeeDeduction),
    blnDeclarationRequired: Boolean(dicRecord.blnDeclarationRequired),
    blnProofRequired: Boolean(dicRecord.blnProofRequired),
    blnAllowManualOverride: Boolean(dicRecord.blnAllowManualOverride),
    blnIsActive: Boolean(dicRecord.blnIsActive),
    lstDependencyComponentIDs: dicRecord.lstDependencyComponentIDs,
    lstFlexiEligibilityRules: dicRecord.lstFlexiEligibilityRules.map((dicRule, intIndex) => ({
      strRowID: createRuleRowID(),
      intID: dicRule.intID,
      intEligibilityQuestionID: dicRule.intEligibilityQuestionID,
      strOperator: dicRule.strOperator,
      strExpectedValue: dicRule.strExpectedValue ?? "",
      strMinValue: dicRule.fltMinValue != null ? String(dicRule.fltMinValue) : "",
      strMaxValue: dicRule.fltMaxValue != null ? String(dicRule.fltMaxValue) : "",
      strMultiplierMode: dicRule.strMultiplierMode,
      strMultiplierCap: dicRule.fltMultiplierCap != null ? String(dicRule.fltMultiplierCap) : "",
      strIneligibleBehavior: dicRule.strIneligibleBehavior,
      strFailureMessage: dicRule.strFailureMessage ?? "",
      blnIsRequired: dicRule.blnIsRequired,
      blnIsActive: dicRule.blnIsActive,
      intDisplayOrder: dicRule.intDisplayOrder ?? ((intIndex + 1) * 10),
    })),
    lstTexts: dicRecord.lstTexts.length > 0
      ? dicRecord.lstTexts.map((dicText) => ({
          strRowID: createRowID(),
          intLanguageID: dicText.intLanguageID,
          strLanguageName: dicText.strLanguageName,
          strComponentName: dicText.strComponentName,
          strComponentDescription: dicText.strComponentDescription ?? ""
        }))
      : [createEmptySalaryComponentTextRow()]
  };
}

function toPayload(dicValues: SalaryComponentFormValues, intSalaryComponentID?: number) {
  const blnIsReimbursement = dicValues.blnIsReimbursement || isReimbursementCategory(dicValues.strComponentCategory);
  const blnIsFlexiReimbursement = isReimbursementCategory(dicValues.strComponentCategory) && dicValues.blnIsFlexiBenefit;
  const strReimbursementType = blnIsReimbursement ? (blnIsFlexiReimbursement ? "ctc_based" : dicValues.strReimbursementType) : "none";
  const strSettlementMethod = blnIsReimbursement
    ? (strReimbursementType === "non_ctc_based" ? "finance" : "payroll")
    : "none";
  const blnIncludedInCtc = deriveIncludedInCtc({
    ...dicValues,
    strReimbursementType,
    strSettlementMethod,
  });
  const decAnnualLimitAmount = dicValues.strAnnualLimitAmount.trim() ? Number(dicValues.strAnnualLimitAmount) : null;
  const decMonthlyLimitAmount = dicValues.strMonthlyLimitAmount.trim() ? Number(dicValues.strMonthlyLimitAmount) : null;
  const strClaimLimitType =
    decMonthlyLimitAmount != null && decAnnualLimitAmount != null
      ? "both"
      : decMonthlyLimitAmount != null
        ? "monthly"
        : decAnnualLimitAmount != null
          ? "yearly"
          : dicValues.strClaimLimitType;
  const blnPersistDependencyMapping = isDependencyBackedCalculation(dicValues);
  const blnPersistFlexiEligibilityRules = isReimbursementCategory(dicValues.strComponentCategory) && dicValues.blnIsFlexiBenefit;
  const strNormalizedCalcMethod = dicValues.strCalcMethod.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const intDefaultBasisComponentID = dicValues.intDefaultBasisComponentID === "" ? null : Number(dicValues.intDefaultBasisComponentID);
  const decDefaultPercentageValue = dicValues.strDefaultPercentageValue.trim() ? Number(dicValues.strDefaultPercentageValue) : null;
  const strLwpTreatmentCode = dicValues.strLwpTreatmentCode.trim() || "NONE";
  const blnLwpReducedAmountHandlingApplies = blnIsFlexiReimbursement && normalizeLookupCode(strLwpTreatmentCode) !== "none";
  const lstDependencyComponentIDs = sanitizeDependencyIDs(
    [
      ...(blnPersistDependencyMapping ? dicValues.lstDependencyComponentIDs : []),
      ...(strNormalizedCalcMethod === "percentage" && intDefaultBasisComponentID ? [intDefaultBasisComponentID] : []),
    ],
    intSalaryComponentID
  );
  return {
    strComponentCode: dicValues.strComponentCode.trim(),
    strComponentName: dicValues.strComponentName.trim(),
    strComponentDescription: formatOptionalText(dicValues.strComponentDescription),
    blnIsWages: dicValues.blnIsWages,
    intComponentCategoryID: dicValues.intComponentCategoryID === "" ? null : Number(dicValues.intComponentCategoryID),
    strComponentCategory: dicValues.strComponentCategory.trim(),
    intComponentGroupID: dicValues.intComponentGroupID === "" ? null : Number(dicValues.intComponentGroupID),
    strComponentGroup: formatOptionalText(dicValues.strComponentGroup),
    intPayrollProcessingModeID: dicValues.intPayrollProcessingModeID === "" ? null : Number(dicValues.intPayrollProcessingModeID),
    strPayrollProcessingMode: dicValues.strPayrollProcessingMode.trim() || "REGULAR",
    intCalcMethodID: dicValues.intCalcMethodID === "" ? null : Number(dicValues.intCalcMethodID),
    strCalcMethod: dicValues.strCalcMethod.trim(),
    strFormulaExpression: formatOptionalText(dicValues.strFormulaExpression),
    decDefaultPercentageValue,
    intDefaultBasisComponentID,
    intRoundingRuleID: dicValues.intRoundingRuleID === "" ? null : Number(dicValues.intRoundingRuleID),
    strRoundingRule: formatOptionalText(dicValues.strRoundingRule),
    intDefaultPeriodicityID: dicValues.intDefaultPeriodicityID === "" ? null : Number(dicValues.intDefaultPeriodicityID),
    strDefaultPeriodicity: dicValues.strDefaultPeriodicity.trim(),
    intTaxTreatmentID: dicValues.intTaxTreatmentID === "" ? null : Number(dicValues.intTaxTreatmentID),
    strTaxTreatment: formatOptionalText(dicValues.strTaxTreatment),
    intCtcTreatmentID: dicValues.intCtcTreatmentID === "" ? null : Number(dicValues.intCtcTreatmentID),
    blnIncludeInPF: dicValues.blnIncludeInPF,
    blnIncludeInESIC: dicValues.blnIncludeInESIC,
    blnIncludeInGratuity: dicValues.blnIncludeInGratuity,
    blnIncludeInRemuneration: dicValues.blnIncludeInRemuneration,
    blnIncludeInTaxableIncome: dicValues.blnIncludeInTaxableIncome,
    blnIncludedInCtc,
    blnIncludeInPayslip: dicValues.blnIncludeInPayslip,
    intPayslipSectionID: dicValues.blnIncludeInPayslip && dicValues.intPayslipSectionID !== "" ? Number(dicValues.intPayslipSectionID) : null,
    strPayslipSection: dicValues.blnIncludeInPayslip ? formatOptionalText(dicValues.strPayslipSection) : null,
    intDisplayOrder: dicValues.blnIncludeInPayslip ? Number(dicValues.strDisplayOrder) || 10 : 0,
    intLwpTreatmentID: dicValues.intLwpTreatmentID === "" ? null : Number(dicValues.intLwpTreatmentID),
    strLwpTreatmentCode,
    intLwpReducedAmountHandlingID: blnLwpReducedAmountHandlingApplies && dicValues.intLwpReducedAmountHandlingID !== "" ? Number(dicValues.intLwpReducedAmountHandlingID) : null,
    strLwpReducedAmountHandlingCode: blnLwpReducedAmountHandlingApplies ? (dicValues.strLwpReducedAmountHandlingCode.trim() || "NOT_APPLICABLE") : "NOT_APPLICABLE",
    strLwpProrationFormula: formatOptionalText(dicValues.strLwpProrationFormula),
    blnIsFlexiBenefit: dicValues.blnIsFlexiBenefit,
    blnIsReimbursement: blnIsReimbursement,
    intFlexiComponentTypeID: dicValues.intFlexiComponentTypeID === "" ? null : Number(dicValues.intFlexiComponentTypeID),
    intReimbursementTypeID: blnIsReimbursement && dicValues.intReimbursementTypeID !== "" ? Number(dicValues.intReimbursementTypeID) : null,
    strReimbursementType,
    intSettlementMethodID: blnIsReimbursement && dicValues.intSettlementMethodID !== "" ? Number(dicValues.intSettlementMethodID) : null,
    strSettlementMethod,
    blnRequiresBills: dicValues.blnRequiresBills,
    blnExpenseDateRequired: dicValues.blnExpenseDateRequired,
    intApplicableTaxRegimeID: blnIsReimbursement && dicValues.intApplicableTaxRegimeID !== "" ? Number(dicValues.intApplicableTaxRegimeID) : null,
    intApplicableForWhichTaxRegime: blnIsReimbursement ? Number(dicValues.intApplicableForWhichTaxRegime ?? 2) : 2,
    decAnnualLimitAmount,
    decMonthlyLimitAmount,
    intClaimLimitTypeID: dicValues.intClaimLimitTypeID === "" ? null : Number(dicValues.intClaimLimitTypeID),
    strClaimLimitType,
    intFlexiBalanceHandlingID: dicValues.intFlexiBalanceHandlingID === "" ? null : Number(dicValues.intFlexiBalanceHandlingID),
    blnAllowPartialApproval: dicValues.blnAllowPartialApproval,
    blnAllowExcessClaim: false,
    blnExcessClaimTaxable: false,
    intResidualComponentID: blnIsReimbursement ? null : (dicValues.intResidualComponentID === "" ? null : Number(dicValues.intResidualComponentID)),
    blnAutoPushToPayroll: dicValues.blnAutoPushToPayroll,
    blnFinanceSettlementRequired: dicValues.blnFinanceSettlementRequired,
    decReimbursementMaxClaimMonthlyLimit:
      blnIsReimbursement && (strClaimLimitType === "monthly" || strClaimLimitType === "both")
        ? decMonthlyLimitAmount
        : null,
    decReimbursementMaxClaimYearlyLimit:
      blnIsReimbursement && (strClaimLimitType === "yearly" || strClaimLimitType === "both")
        ? decAnnualLimitAmount
        : null,
    blnIsEmployerContribution: dicValues.blnIsEmployerContribution,
    blnIsEmployeeDeduction: dicValues.blnIsEmployeeDeduction,
    blnDeclarationRequired: dicValues.blnDeclarationRequired,
    blnProofRequired: dicValues.blnProofRequired,
    blnAllowManualOverride: dicValues.blnAllowManualOverride,
    blnIsActive: dicValues.blnIsActive,
    intLanguageID: Number(dicValues.lstTexts[0]?.intLanguageID || 1),
    lstDependencyComponentIDs,
    lstFlexiEligibilityRules: blnPersistFlexiEligibilityRules
      ? dicValues.lstFlexiEligibilityRules.map((dicRule) => ({
          ...(dicRule.intID ? { intID: dicRule.intID } : {}),
          intEligibilityQuestionID: Number(dicRule.intEligibilityQuestionID),
          strOperator: dicRule.strOperator,
          strExpectedValue: formatOptionalText(dicRule.strExpectedValue),
          fltMinValue: dicRule.strMinValue.trim() ? Number(dicRule.strMinValue) : null,
          fltMaxValue: dicRule.strMaxValue.trim() ? Number(dicRule.strMaxValue) : null,
          strMultiplierMode: dicRule.strMultiplierMode,
          fltMultiplierCap: dicRule.strMultiplierCap.trim() ? Number(dicRule.strMultiplierCap) : null,
          strIneligibleBehavior: dicRule.strIneligibleBehavior,
          strFailureMessage: formatOptionalText(dicRule.strFailureMessage),
          blnIsRequired: dicRule.blnIsRequired,
          blnIsActive: dicRule.blnIsActive,
          intDisplayOrder: dicRule.intDisplayOrder,
        }))
      : [],
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strComponentName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strComponentName: dicText.strComponentName.trim(),
        strComponentDescription: formatOptionalText(dicText.strComponentDescription)
      }))
  };
}

export const salaryComponentService = {
  async getSalaryComponents(): Promise<SalaryComponentListRecord[]> {
    const objResult = await masterApiService.getSalaryComponents();
    return objResult.Data.map((dicRecord) => {
      const dicDetail = mapApiRecord(dicRecord);
      return {
        intID: dicDetail.intID,
        strRecordUUID: dicDetail.strRecordUUID,
        strComponentCode: dicDetail.strComponentCode,
        strComponentName: dicDetail.strComponentName,
        blnIsWages: dicDetail.blnIsWages,
        strComponentCategory: dicDetail.strComponentCategory,
        strComponentGroup: dicDetail.strComponentGroup,
        strCalcMethod: dicDetail.strCalcMethod,
        strRoundingRule: dicDetail.strRoundingRule,
        strDefaultPeriodicity: dicDetail.strDefaultPeriodicity,
        strTaxTreatment: dicDetail.strTaxTreatment,
        blnIncludeInPF: dicDetail.blnIncludeInPF,
        blnIncludeInESIC: dicDetail.blnIncludeInESIC,
        blnIncludeInGratuity: dicDetail.blnIncludeInGratuity,
        blnIncludeInRemuneration: dicDetail.blnIncludeInRemuneration,
        blnIncludeInTaxableIncome: dicDetail.blnIncludeInTaxableIncome,
        blnIncludedInCtc: dicDetail.blnIncludedInCtc,
        blnIncludeInPayslip: dicDetail.blnIncludeInPayslip,
        strPayslipSection: dicDetail.strPayslipSection,
        intDisplayOrder: dicDetail.intDisplayOrder,
        blnIsReimbursement: dicDetail.blnIsReimbursement,
        blnIsFlexiBenefit: dicDetail.blnIsFlexiBenefit,
        blnIsFlexiBasket: Boolean(dicDetail.blnIsFlexiBasket),
        strFlexiComponentType: dicDetail.strFlexiComponentType,
        strReimbursementType: dicDetail.strReimbursementType,
        strSettlementMethod: dicDetail.strSettlementMethod,
        blnRequiresBills: dicDetail.blnRequiresBills,
        blnExpenseDateRequired: Boolean(dicDetail.blnExpenseDateRequired),
        blnAllowPartialApproval: Boolean(dicDetail.blnAllowPartialApproval),
        decAnnualLimitAmount: dicDetail.decAnnualLimitAmount,
        decMonthlyLimitAmount: dicDetail.decMonthlyLimitAmount,
        strClaimLimitType: dicDetail.strClaimLimitType,
        blnAllowExcessClaim: dicDetail.blnAllowExcessClaim,
        blnExcessClaimTaxable: dicDetail.blnExcessClaimTaxable,
        intResidualComponentID: dicDetail.intResidualComponentID,
        blnAutoPushToPayroll: dicDetail.blnAutoPushToPayroll,
        blnFinanceSettlementRequired: dicDetail.blnFinanceSettlementRequired,
        blnIsEmployerContribution: dicDetail.blnIsEmployerContribution,
        blnIsEmployeeDeduction: dicDetail.blnIsEmployeeDeduction,
        blnDeclarationRequired: dicDetail.blnDeclarationRequired,
        blnProofRequired: dicDetail.blnProofRequired,
        blnAllowManualOverride: dicDetail.blnAllowManualOverride,
        blnIsActive: dicDetail.blnIsActive,
        intDependencyCount: dicDetail.intDependencyCount
      };
    });
  },

  async getSalaryComponentById(strRecordUUID: string): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.getSalaryComponent(strRecordUUID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(intLanguageID?: number | null): Promise<SalaryComponentFormOptions> {
    const objResult = await masterApiService.getSalaryComponentFormOptions(intLanguageID ?? authHelpers.getLanguageID());
    return {
      ...objResult.Data,
      lstResidualComponents: objResult.Data.lstResidualComponents ?? [],
      lstFlexiEligibilityQuestions: (objResult.Data.lstFlexiEligibilityQuestions ?? []).map((dicQuestion) => ({
        intID: dicQuestion.intID,
        strQuestionCode: dicQuestion.strQuestionCode,
        strAnswerType: dicQuestion.strAnswerType,
        strSourceType: dicQuestion.strSourceType,
        blnIsEmployeeEditable: Boolean(dicQuestion.blnIsEmployeeEditable),
        strDefaultLabel: dicQuestion.strDefaultLabel,
        strDefaultHelpText: dicQuestion.strDefaultHelpText ?? null,
        strValueUnit: dicQuestion.strValueUnit ?? null,
        decMinValue: dicQuestion.decMinValue ?? null,
        decMaxValue: dicQuestion.decMaxValue ?? null,
        objOptionJSON: dicQuestion.objOptionJSON,
        intDisplayOrder: dicQuestion.intDisplayOrder,
        blnIsActive: Boolean(dicQuestion.blnIsActive),
        lstTexts: (dicQuestion.lstTexts ?? []).map((dicText) => ({
          intLanguageID: dicText.intLanguageID,
          strQuestionLabel: dicText.strQuestionLabel,
          strHelpText: dicText.strHelpText ?? null,
        })),
      })),
      lstComponentCategoryLookups: mapLookupOptions(objResult.Data.lstComponentCategoryLookups),
      lstComponentGroupLookups: mapLookupOptions(objResult.Data.lstComponentGroupLookups),
      lstCalcMethodLookups: mapLookupOptions(objResult.Data.lstCalcMethodLookups),
      lstRoundingRuleLookups: mapLookupOptions(objResult.Data.lstRoundingRuleLookups),
      lstDefaultPeriodicityLookups: mapLookupOptions(objResult.Data.lstDefaultPeriodicityLookups),
      lstTaxTreatmentLookups: mapLookupOptions(objResult.Data.lstTaxTreatmentLookups),
      lstCtcTreatmentLookups: mapLookupOptions(objResult.Data.lstCtcTreatmentLookups),
      lstReimbursementTypeLookups: mapLookupOptions(objResult.Data.lstReimbursementTypeLookups),
      lstSettlementMethodLookups: mapLookupOptions(objResult.Data.lstSettlementMethodLookups),
      lstClaimLimitTypeLookups: mapLookupOptions(objResult.Data.lstClaimLimitTypeLookups),
      lstFlexiComponentTypeLookups: mapLookupOptions(objResult.Data.lstFlexiComponentTypeLookups),
      lstFlexiBalanceHandlingLookups: mapLookupOptions(objResult.Data.lstFlexiBalanceHandlingLookups),
      lstPayslipSectionLookups: mapLookupOptions(objResult.Data.lstPayslipSectionLookups, ["Earnings", "Deductions", "Reimbursements", "Information", "Employer Contributions"]),
      lstLwpTreatmentLookups: mapLookupOptions(objResult.Data.lstLwpTreatmentLookups),
      lstLwpReducedAmountHandlingLookups: mapLookupOptions(objResult.Data.lstLwpReducedAmountHandlingLookups),
      lstApplicableTaxRegimeLookups: mapLookupOptions(objResult.Data.lstApplicableTaxRegimeLookups),
      lstReimbursementTypes: objResult.Data.lstReimbursementTypes ?? [],
      lstSettlementMethods: objResult.Data.lstSettlementMethods ?? [],
      lstClaimLimitTypes: objResult.Data.lstClaimLimitTypes ?? [],
    };
  },

  async createSalaryComponent(dicValues: SalaryComponentFormValues): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.createSalaryComponent(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updateSalaryComponent(
    strRecordUUID: string,
    dicValues: SalaryComponentFormValues,
    intSalaryComponentID?: number,
  ): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.updateSalaryComponent(
      strRecordUUID,
      // The internal id is only used to filter the component out of its own dependency mapping,
      // which is expressed in internal ids; it is not part of how the row is addressed.
      toPayload(dicValues, intSalaryComponentID)
    );
    return mapApiRecord(objResult.Data);
  },

  async translateSalaryComponentText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateMasterText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },

  async setSalaryComponentStatus(strRecordUUID: string, blnIsActive: boolean): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.setSalaryComponentStatus(strRecordUUID, blnIsActive);
    return mapApiRecord(objResult.Data);
  },

  async bulkSalaryComponentStatus(lstIDs: number[], blnIsActive: boolean): Promise<void> {
    await masterApiService.bulkSalaryComponentStatus(lstIDs, blnIsActive);
  },

  async deleteSalaryComponent(strRecordUUID: string): Promise<void> {
    await masterApiService.deleteSalaryComponent(strRecordUUID);
  },

  async bulkDeleteSalaryComponents(lstIDs: number[]): Promise<void> {
    await masterApiService.bulkSalaryComponentDelete(lstIDs);
  }
};
