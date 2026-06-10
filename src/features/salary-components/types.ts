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
  blnIncludeInPayslip: boolean;
  strPayslipSection: string | null;
  intDisplayOrder: number;
  blnIsReimbursement: boolean;
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
  strClaimLimitType: "none" | "monthly" | "yearly";
  strMaximumClaimAmount: string;
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
  lstComponentCategories: string[];
  lstComponentGroups: string[];
  lstCalcMethods: string[];
  lstRoundingRules: string[];
  lstDefaultPeriodicities: string[];
  lstTaxTreatments: string[];
};
