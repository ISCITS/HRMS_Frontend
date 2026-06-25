export type SalaryComponentListRecord = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  blnIsWages: boolean;
  strComponentCategory: string;
  strComponentGroup: string | null;
  strCalcMethod: string;
  strRoundingRule: string | null;
  strDefaultPeriodicity: string;
  strTaxTreatment: string | null;
  blnIncludeInPF: boolean;
  blnIncludeInESIC: boolean;
  blnIncludeInGratuity: boolean;
  blnIncludeInRemuneration: boolean;
  blnIncludeInTaxableIncome: boolean;
  blnIncludedInCtc: boolean;
  blnIncludeInPayslip: boolean;
  strPayslipSection: string | null;
  intDisplayOrder: number;
  blnIsReimbursement: boolean;
  blnIsFlexiBenefit: boolean;
  blnIsFlexiBasket?: boolean;
  strFlexiComponentType?: string | null;
  strReimbursementType: string | null;
  strSettlementMethod: string | null;
  blnRequiresBills: boolean;
  blnExpenseDateRequired?: boolean;
  blnAllowPartialApproval?: boolean;
  decAnnualLimitAmount: number | null;
  decMonthlyLimitAmount: number | null;
  strClaimLimitType: string | null;
  blnAllowExcessClaim: boolean;
  blnExcessClaimTaxable: boolean;
  intResidualComponentID: number | null;
  blnAutoPushToPayroll: boolean;
  blnFinanceSettlementRequired: boolean;
  blnIsEmployerContribution: boolean;
  blnIsEmployeeDeduction: boolean;
  blnDeclarationRequired: boolean;
  blnProofRequired: boolean;
  blnAllowManualOverride: boolean;
  blnIsActive: boolean;
  intDependencyCount: number;
};

export type SalaryComponentOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type SalaryComponentFlexiEligibilityQuestion = {
  intID: number;
  strQuestionCode: string;
  strAnswerType: string;
  strSourceType: string;
  blnIsEmployeeEditable: boolean;
  strDefaultLabel: string;
  strDefaultHelpText: string | null;
  strValueUnit: string | null;
  decMinValue: number | null;
  decMaxValue: number | null;
  objOptionJSON?: unknown;
  intDisplayOrder: number;
  blnIsActive: boolean;
  lstTexts: Array<{
    intLanguageID: number;
    strQuestionLabel: string;
    strHelpText: string | null;
  }>;
};

export type SalaryComponentFlexiEligibilityRuleFormValue = {
  strRowID: string;
  intID?: number;
  intEligibilityQuestionID: number | "";
  strOperator: string;
  strExpectedValue: string;
  strMinValue: string;
  strMaxValue: string;
  strMultiplierMode: string;
  strMultiplierCap: string;
  strIneligibleBehavior: string;
  strFailureMessage: string;
  blnIsRequired: boolean;
  blnIsActive: boolean;
  intDisplayOrder: number;
};

export type SalaryComponentTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strComponentName: string;
  strComponentDescription: string;
};

export type SalaryComponentFormValues = {
  strComponentCode: string;
  strComponentName: string;
  strComponentDescription: string;
  blnIsWages: boolean;
  strComponentCategory: string;
  strComponentGroup: string;
  strCalcMethod: string;
  strFormulaExpression: string;
  strRoundingRule: string;
  strDefaultPeriodicity: string;
  strTaxTreatment: string;
  blnIncludeInPF: boolean;
  blnIncludeInESIC: boolean;
  blnIncludeInGratuity: boolean;
  blnIncludeInRemuneration: boolean;
  blnIncludeInTaxableIncome: boolean;
  blnIncludeInPayslip: boolean;
  strPayslipSection: string;
  strDisplayOrder: string;
  blnIsFlexiBenefit: boolean;
  blnIsReimbursement: boolean;
  strReimbursementType: "none" | "ctc_based" | "non_ctc_based";
  blnIncludedInCtc: boolean;
  strSettlementMethod: "none" | "payroll" | "finance";
  blnRequiresBills: boolean;
  blnExpenseDateRequired: boolean;
  blnAllowPartialApproval: boolean;
  strClaimLimitType: "none" | "monthly" | "yearly" | "both";
  strAnnualLimitAmount: string;
  strMonthlyLimitAmount: string;
  blnAllowExcessClaim: boolean;
  blnExcessClaimTaxable: boolean;
  intResidualComponentID: number | "";
  blnAutoPushToPayroll: boolean;
  blnFinanceSettlementRequired: boolean;
  blnIsEmployerContribution: boolean;
  blnIsEmployeeDeduction: boolean;
  blnDeclarationRequired: boolean;
  blnProofRequired: boolean;
  blnAllowManualOverride: boolean;
  blnIsActive: boolean;
  lstDependencyComponentIDs: number[];
  lstFlexiEligibilityRules: SalaryComponentFlexiEligibilityRuleFormValue[];
  lstTexts: SalaryComponentTextFormValue[];
};

export type SalaryComponentDetailRecord = SalaryComponentListRecord & {
  strComponentDescription: string | null;
  strComponentGroup: string | null;
  strFormulaExpression: string | null;
  strRoundingRule: string | null;
  strTaxTreatment: string | null;
  intUsedInSalaryStructures: number;
  intAssignedEmployees: number;
  intFormulaReferences: number;
  lstDependencyComponentIDs: number[];
  lstFlexiEligibilityRules: Array<{
    intID?: number;
    intEligibilityQuestionID: number;
    strOperator: string;
    strExpectedValue: string | null;
    fltMinValue: number | null;
    fltMaxValue: number | null;
    strMultiplierMode: string;
    fltMultiplierCap: number | null;
    strIneligibleBehavior: string;
    strFailureMessage: string | null;
    blnIsRequired: boolean;
    blnIsActive: boolean;
    intDisplayOrder: number;
    objQuestion?: SalaryComponentFlexiEligibilityQuestion | null;
  }>;
  lstTexts: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strComponentName: string;
    strComponentDescription: string | null;
  }>;
  lstDependencyComponents: Array<{
    intSalaryComponentID: number;
    strComponentCode: string | null;
    strComponentName: string;
  }>;
};

export type SalaryComponentFormOptions = {
  lstLanguages: SalaryComponentOption[];
  lstDependencyComponents: SalaryComponentOption[];
  lstFlexiEligibilityQuestions: SalaryComponentFlexiEligibilityQuestion[];
  lstResidualComponents: SalaryComponentOption[];
  lstComponentCategories: string[];
  lstComponentGroups: string[];
  lstCalcMethods: string[];
  lstRoundingRules: string[];
  lstDefaultPeriodicities: string[];
  lstTaxTreatments: string[];
  lstReimbursementTypes: string[];
  lstSettlementMethods: string[];
  lstClaimLimitTypes: string[];
};
