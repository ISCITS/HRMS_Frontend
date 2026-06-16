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
  strReimbursementType: string | null;
  strSettlementMethod: string | null;
  blnRequiresBills: boolean;
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
  strClaimLimitType: "none" | "monthly" | "yearly";
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
