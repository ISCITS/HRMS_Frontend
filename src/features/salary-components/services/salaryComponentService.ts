import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";
import type {
  SalaryComponentDetailRecord,
  SalaryComponentFlexiEligibilityRuleFormValue,
  SalaryComponentFormOptions,
  SalaryComponentFormValues,
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

function mapApiRecord(dicRecord: SalaryComponentApiRecord): SalaryComponentDetailRecord {
  const lstDependencyComponentIDs = sanitizeDependencyIDs(
    dicRecord.lstDependencyComponentIDs ?? [],
    dicRecord.intID
  );
  return {
    intID: dicRecord.intID,
    strComponentCode: dicRecord.strComponentCode,
    strComponentName: dicRecord.strComponentName,
    blnIsWages: Boolean(dicRecord.blnIsWages),
    strComponentDescription: dicRecord.strComponentDescription ?? null,
    strComponentCategory: dicRecord.strComponentCategory,
    strComponentGroup: dicRecord.strComponentGroup ?? null,
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression,
    decDefaultPercentageValue: dicRecord.decDefaultPercentageValue ?? null,
    intDefaultBasisComponentID: dicRecord.intDefaultBasisComponentID ?? null,
    strRoundingRule: dicRecord.strRoundingRule,
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    strTaxTreatment: dicRecord.strTaxTreatment,
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration ?? true),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome ?? true),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc ?? true),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip ?? true),
    strPayslipSection: dicRecord.strPayslipSection ?? null,
    intDisplayOrder: Number(dicRecord.intDisplayOrder ?? 10),
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsFlexiBasket: Boolean(dicRecord.blnIsFlexiBasket),
    strFlexiComponentType: dicRecord.strFlexiComponentType ?? null,
    strReimbursementType: dicRecord.strReimbursementType ?? null,
    strSettlementMethod: dicRecord.strSettlementMethod ?? null,
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    decAnnualLimitAmount: dicRecord.decAnnualLimitAmount ?? null,
    decMonthlyLimitAmount: dicRecord.decMonthlyLimitAmount ?? null,
    strClaimLimitType: dicRecord.strClaimLimitType ?? null,
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
    strComponentCategory: "",
    strComponentGroup: "",
    strCalcMethod: "fixed",
    strFormulaExpression: "",
    strDefaultPercentageValue: "",
    intDefaultBasisComponentID: "",
    strRoundingRule: "",
    strDefaultPeriodicity: "monthly",
    strTaxTreatment: "",
    blnIncludeInPF: false,
    blnIncludeInESIC: false,
    blnIncludeInGratuity: false,
    blnIncludeInRemuneration: true,
    blnIncludeInTaxableIncome: true,
    blnIncludedInCtc: true,
    blnIncludeInPayslip: true,
    strPayslipSection: "Earnings",
    strDisplayOrder: "10",
    blnIsFlexiBenefit: false,
    blnIsReimbursement: false,
    strReimbursementType: "none",
    strSettlementMethod: "none",
    blnRequiresBills: false,
    blnExpenseDateRequired: true,
    blnAllowPartialApproval: true,
    strClaimLimitType: "none",
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
    strComponentCategory: dicRecord.strComponentCategory,
    strComponentGroup: dicRecord.strComponentGroup ?? "",
    strCalcMethod: dicRecord.strCalcMethod,
    strFormulaExpression: dicRecord.strFormulaExpression ?? "",
    strDefaultPercentageValue: dicRecord.decDefaultPercentageValue != null ? String(dicRecord.decDefaultPercentageValue) : "",
    intDefaultBasisComponentID: dicRecord.intDefaultBasisComponentID ?? "",
    strRoundingRule: dicRecord.strRoundingRule ?? "",
    strDefaultPeriodicity: dicRecord.strDefaultPeriodicity,
    strTaxTreatment: dicRecord.strTaxTreatment ?? "",
    blnIncludeInPF: Boolean(dicRecord.blnIncludeInPF),
    blnIncludeInESIC: Boolean(dicRecord.blnIncludeInESIC),
    blnIncludeInGratuity: Boolean(dicRecord.blnIncludeInGratuity),
    blnIncludeInRemuneration: Boolean(dicRecord.blnIncludeInRemuneration),
    blnIncludeInTaxableIncome: Boolean(dicRecord.blnIncludeInTaxableIncome),
    blnIncludedInCtc: Boolean(dicRecord.blnIncludedInCtc),
    blnIncludeInPayslip: Boolean(dicRecord.blnIncludeInPayslip),
    strPayslipSection: dicRecord.strPayslipSection ?? "",
    strDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
    blnIsFlexiBenefit: Boolean(dicRecord.blnIsFlexiBenefit),
    blnIsReimbursement: Boolean(dicRecord.blnIsReimbursement),
    strReimbursementType: (dicRecord.strReimbursementType as SalaryComponentFormValues["strReimbursementType"]) ?? "none",
    strSettlementMethod: (dicRecord.strSettlementMethod as SalaryComponentFormValues["strSettlementMethod"]) ?? "none",
    blnRequiresBills: Boolean(dicRecord.blnRequiresBills),
    blnExpenseDateRequired: Boolean(dicRecord.blnExpenseDateRequired ?? true),
    blnAllowPartialApproval: Boolean(dicRecord.blnAllowPartialApproval ?? dicRecord.blnAllowExcessClaim),
    strClaimLimitType: (dicRecord.strClaimLimitType as SalaryComponentFormValues["strClaimLimitType"]) ?? "none",
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
    strComponentCategory: dicValues.strComponentCategory.trim(),
    strComponentGroup: formatOptionalText(dicValues.strComponentGroup),
    strCalcMethod: dicValues.strCalcMethod.trim(),
    strFormulaExpression: formatOptionalText(dicValues.strFormulaExpression),
    decDefaultPercentageValue,
    intDefaultBasisComponentID,
    strRoundingRule: formatOptionalText(dicValues.strRoundingRule),
    strDefaultPeriodicity: dicValues.strDefaultPeriodicity.trim(),
    strTaxTreatment: formatOptionalText(dicValues.strTaxTreatment),
    blnIncludeInPF: dicValues.blnIncludeInPF,
    blnIncludeInESIC: dicValues.blnIncludeInESIC,
    blnIncludeInGratuity: dicValues.blnIncludeInGratuity,
    blnIncludeInRemuneration: dicValues.blnIncludeInRemuneration,
    blnIncludeInTaxableIncome: dicValues.blnIncludeInTaxableIncome,
    blnIncludedInCtc,
    blnIncludeInPayslip: dicValues.blnIncludeInPayslip,
    strPayslipSection: dicValues.blnIncludeInPayslip ? formatOptionalText(dicValues.strPayslipSection) : null,
    intDisplayOrder: dicValues.blnIncludeInPayslip ? Number(dicValues.strDisplayOrder) || 10 : 10,
    blnIsFlexiBenefit: dicValues.blnIsFlexiBenefit,
    blnIsReimbursement: blnIsReimbursement,
    strReimbursementType,
    strSettlementMethod,
    blnRequiresBills: dicValues.blnRequiresBills,
    blnExpenseDateRequired: dicValues.blnExpenseDateRequired,
    decAnnualLimitAmount,
    decMonthlyLimitAmount,
    strClaimLimitType,
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

  async getSalaryComponentById(intSalaryComponentID: number): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.getSalaryComponent(intSalaryComponentID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<SalaryComponentFormOptions> {
    const objResult = await masterApiService.getSalaryComponentFormOptions();
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
      lstReimbursementTypes: objResult.Data.lstReimbursementTypes ?? [],
      lstSettlementMethods: objResult.Data.lstSettlementMethods ?? [],
      lstClaimLimitTypes: objResult.Data.lstClaimLimitTypes ?? [],
    };
  },

  async createSalaryComponent(dicValues: SalaryComponentFormValues): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.createSalaryComponent(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updateSalaryComponent(intSalaryComponentID: number, dicValues: SalaryComponentFormValues): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.updateSalaryComponent(
      intSalaryComponentID,
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

  async setSalaryComponentStatus(intSalaryComponentID: number, blnIsActive: boolean): Promise<SalaryComponentDetailRecord> {
    const objResult = await masterApiService.setSalaryComponentStatus(intSalaryComponentID, blnIsActive);
    return mapApiRecord(objResult.Data);
  },

  async bulkSalaryComponentStatus(lstIDs: number[], blnIsActive: boolean): Promise<void> {
    await masterApiService.bulkSalaryComponentStatus(lstIDs, blnIsActive);
  },

  async deleteSalaryComponent(intSalaryComponentID: number): Promise<void> {
    await masterApiService.deleteSalaryComponent(intSalaryComponentID);
  },

  async bulkDeleteSalaryComponents(lstIDs: number[]): Promise<void> {
    await masterApiService.bulkSalaryComponentDelete(lstIDs);
  }
};
