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
};

export type SalaryStructureLineFormValue = {
  strRowID: string;
  intSalaryComponentID: number | "";
  intLineOrder: number;
  strValueSource: string;
  strComponentCode: string;
  strComponentName: string;
  fltFixedAmount: string;
  fltPercentageValue: string;
  intBasisComponentID: number | "";
  strFormulaExpression: string;
  fltMinAmount: string;
  fltMaxAmount: string;
  blnIsMandatory: boolean;
  blnIsActive: boolean;
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
  }>;
};

export type SalaryStructureFormOptions = {
  lstSalaryComponents: SalaryStructureOption[];
  lstLanguages: SalaryStructureOption[];
  lstValueSources: string[];
  lstCurrencies: string[];
};
