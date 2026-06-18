export type SalaryStructureListRecord = {
  intID: number;
  strStructureCode: string;
  strStructureName: string;
  strCurrencyCode: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsDefault: boolean;
  blnIsActive: boolean;
  strScopeLabel: string;
  intComponentCount: number;
};

export type SalaryStructureOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
  blnIsFlexiBasket?: boolean;
  blnIsFlexiBenefit?: boolean;
  blnIncludedInCtc?: boolean;
  blnProofRequired?: boolean;
  strFlexiComponentType?: string;
  strComponentGroup?: string | null;
  strComponentCategory?: string | null;
  blnIsEmployerContribution?: boolean;
  intResidualComponentID?: number | null;
  decAnnualLimit?: number | null;
  decMonthlyLimit?: number | null;
  decAnnualLimitAmount?: number | null;
  decMonthlyLimitAmount?: number | null;
  decFlexiMaxYearlyAmount?: number | null;
  decFlexiMaxMonthlyAmount?: number | null;
  decReimbursementMaxClaimMonthlyLimit?: number | null;
  decReimbursementMaxClaimYearlyLimit?: number | null;
};

export type SalaryStructureFlexiMappingFormValue = {
  strRowID: string;
  intFlexiComponentID: number | "";
  strFlexiComponentCode: string;
  strFlexiComponentName: string;
  fltDefaultAmount: string;
  fltMaxAmount: string;
  blnIsActive: boolean;
};

export type SalaryStructureLineFormValue = {
  strRowID: string;
  intSalaryComponentID: number | "";
  intLineOrder: number;
  strValueSource: string;
  strComponentCode: string;
  strComponentName: string;
  blnIsFlexiBasketLine: boolean;
  strFlexiComponentRole: string;
  blnIncludedInCtc: boolean;
  strComponentCategory: string;
  fltFixedAmount: string;
  fltPercentageValue: string;
  intBasisComponentID: number | "";
  strFormulaExpression: string;
  fltMinAmount: string;
  fltMaxAmount: string;
  blnIsMandatory: boolean;
  blnIsActive: boolean;
  lstFlexiMappings: SalaryStructureFlexiMappingFormValue[];
};

export type SalaryStructureTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strStructureName: string;
  strStructureDescription: string;
};

export type SalaryStructureFormValues = {
  strStructureCode: string;
  strStructureName: string;
  strCurrencyCode: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsDefault: boolean;
  blnIsActive: boolean;
  lstTexts: SalaryStructureTextFormValue[];
  lstComponents: SalaryStructureLineFormValue[];
};

export type SalaryStructureCloneValues = {
  strStructureCode: string;
  strStructureName: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsDefault: boolean;
  lstTexts: SalaryStructureTextFormValue[];
};

export type SalaryStructureDetailRecord = SalaryStructureListRecord & {
  dicStructureSummary: {
    fltTotalCtc: number;
    fltFixedPay: number;
    fltVariablePay: number;
    fltFlexiBasket: number;
    fltEmployerContribution: number;
  };
  lstTexts: Array<{
    intLanguageID: number;
    strLanguageName: string;
    strStructureName: string;
    strStructureDescription: string | null;
  }>;
  lstComponents: Array<{
    intID: number;
    intSalaryComponentID: number;
    strComponentCode: string | null;
    strComponentName: string;
    blnIsFlexiBasketLine: boolean;
    strFlexiComponentRole: string | null;
    blnIncludedInCtc: boolean;
    strComponentCategory: string | null;
    intLineOrder: number;
    strValueSource: string;
    fltFixedAmount: number | null;
    fltPercentageValue: number | null;
    intBasisComponentID: number | null;
    strBasisComponentName: string | null;
    strFormulaExpression: string | null;
    fltMinAmount: number | null;
    fltMaxAmount: number | null;
    blnIsMandatory: boolean;
    blnIsActive: boolean;
    lstFlexiMappings?: Array<{
      intFlexiComponentID: number;
      strFlexiComponentCode: string | null;
      strFlexiComponentName: string | null;
      fltDefaultAmount: number | null;
      fltMaxAmount: number | null;
      blnIsActive: boolean;
    }>;
  }>;
};

export type SalaryStructureFormOptions = {
  lstSalaryComponents: SalaryStructureOption[];
  lstLanguages: SalaryStructureOption[];
  lstValueSources: string[];
  lstCurrencies: string[];
};
