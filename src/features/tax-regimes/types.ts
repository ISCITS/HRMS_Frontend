export type TaxRegimeOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type TaxRegimeListRecord = {
  intID: number;
  strRegimeCode: string;
  strRegimeName: string;
  strCountryCode: string;
  blnIsDefaultRegime: boolean;
  blnAllowEmployeeOptOut: boolean;
  strEffectiveFromYear: string;
  blnIsActive: boolean;
  intSlabCount: number;
};

export type TaxRegimeDetailRecord = TaxRegimeListRecord;

export type TaxRegimeFormValues = {
  strRegimeCode: string;
  strRegimeName: string;
  strCountryCode: string;
  blnIsDefaultRegime: boolean;
  blnAllowEmployeeOptOut: boolean;
  strEffectiveFromYear: string;
  blnIsActive: boolean;
};

export type TaxRegimeFormOptions = {
  lstCountries: TaxRegimeOption[];
  lstFinancialYears: string[];
  strDefaultEffectiveFromYear: string;
};

export type TaxSlabLineFormValue = {
  strRowID: string;
  strFinancialYearCode: string;
  fltSlabFromAmount: string;
  fltSlabToAmount: string;
  fltTaxRatePercent: string;
  blnRebateEligible: boolean;
  blnIsActive: boolean;
};

export type TaxSlabSetRecord = {
  objRegime: TaxRegimeDetailRecord;
  lstSlabs: Array<{
    intID: number;
    strFinancialYearCode: string;
    fltSlabFromAmount: number;
    fltSlabToAmount: number | null;
    fltTaxRatePercent: number;
    blnRebateEligible: boolean;
    blnIsActive: boolean;
  }>;
  lstFinancialYears: string[];
};
