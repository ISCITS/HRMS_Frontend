export type TaxRegimeOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
};

export type PayrollLookupOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
  strDescription?: string | null;
};

export type TaxRegimeTextFormValue = {
  strRowID: string;
  intLanguageID: number;
  strLanguageName: string;
  strRegimeName: string;
  strDescription: string;
};

export type TaxRegimeListRecord = {
  intID: number;
  strRegimeCode: string;
  strRegimeName: string;
  strCountryCode: string;
  strTaxYearCode: string;
  strRegimeTypeCode: string;
  strRegimeTypeDisplay: string;
  blnIsDefaultRegime: boolean;
  blnAllowEmployeeOptOut: boolean;
  blnIsActive: boolean;
  intSlabCount: number;
  intSlabProfileCount: number;
  decStandardDeductionAmount: number;
  blnStandardDeductionEnabled: boolean;
  blnRebateEnabled: boolean;
  blnSurchargeEnabled: boolean;
  blnCessEnabled: boolean;
};

export type TaxRegimeDetailRecord = TaxRegimeListRecord & {
  intCountryID: number | null;
  strCurrencyCode: string;
  strEffectiveFromYear: string;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  intRegimeTypeID: number | null;
  strTaxpayerTypeCode: string;
  strRoundingRuleCode: string;
  blnMarginalRebateEnabled: boolean;
  blnMarginalSurchargeReliefEnabled: boolean;
  decCessRatePercent: number;
  intCalculationPriority: number;
  strLegalReference: string;
  strConfigurationNotes: string;
  strDescription: string;
  lstTexts: TaxRegimeTextFormValue[];
};

export type TaxRegimeFormValues = {
  strRegimeCode: string;
  strRegimeName: string;
  strCountryCode: string;
  strCurrencyCode: string;
  strTaxYearCode: string;
  strEffectiveFromYear: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  intRegimeTypeID: number | "";
  strRegimeTypeCode: string;
  strTaxpayerTypeCode: string;
  strRoundingRuleCode: string;
  blnIsDefaultRegime: boolean;
  blnAllowEmployeeOptOut: boolean;
  blnIsActive: boolean;
  blnStandardDeductionEnabled: boolean;
  decStandardDeductionAmount: string;
  blnRebateEnabled: boolean;
  blnMarginalRebateEnabled: boolean;
  blnSurchargeEnabled: boolean;
  blnMarginalSurchargeReliefEnabled: boolean;
  blnCessEnabled: boolean;
  decCessRatePercent: string;
  intCalculationPriority: string;
  strLegalReference: string;
  strConfigurationNotes: string;
  lstTexts: TaxRegimeTextFormValue[];
};

export type TaxRegimeFormOptions = {
  lstCountries: TaxRegimeOption[];
  lstFinancialYears: string[];
  strDefaultEffectiveFromYear: string;
  lstRegimeTypeLookups: PayrollLookupOption[];
  lstLanguages: TaxRegimeOption[];
};

export type TaxSlabLineFormValue = {
  strRowID: string;
  strTaxYearCode: string;
  strSlabProfileCode: string;
  strTaxpayerTypeCode: string;
  strResidentialStatusCode: string;
  intAgeFromYears: string;
  intAgeToYears: string;
  fltSlabFromAmount: string;
  fltSlabToAmount: string;
  fltTaxRatePercent: string;
  decFixedTaxAmount: string;
  intDisplayOrder: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  strLegalReference: string;
  blnIsActive: boolean;
};

export type TaxSlabSetRecord = {
  objRegime: TaxRegimeDetailRecord;
  lstSlabs: Array<{
    intID: number;
    strTaxYearCode: string;
    strSlabProfileCode: string;
    strTaxpayerTypeCode: string;
    strResidentialStatusCode: string;
    intAgeFromYears: number | null;
    intAgeToYears: number | null;
    fltSlabFromAmount: number;
    fltSlabToAmount: number | null;
    fltTaxRatePercent: number;
    decFixedTaxAmount: number;
    intDisplayOrder: number;
    dtEffectiveFrom: string | null;
    dtEffectiveTo: string | null;
    strLegalReference: string | null;
    blnIsActive: boolean;
  }>;
  lstFinancialYears: string[];
};

export type TaxStandardDeductionRuleFormValue = {
  strRowID: string;
  strTaxYearCode: string;
  strIncomeSourceCode: string;
  strTaxpayerTypeCode: string;
  strResidentialStatusCode: string;
  strDeductionModeCode: string;
  decDeductionAmount: string;
  decDeductionPercent: string;
  decMaximumDeductionAmount: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
  strLegalReference: string;
  strRemarks: string;
};

export type TaxRebateRuleFormValue = {
  strRowID: string;
  strTaxYearCode: string;
  strRebateCode: string;
  strTaxpayerTypeCode: string;
  strResidentialStatusCode: string;
  decMinimumTotalIncome: string;
  decMaximumTotalIncome: string;
  strRebateModeCode: string;
  decMaximumRebateAmount: string;
  decRebatePercent: string;
  blnMarginalReliefEnabled: boolean;
  blnExcludesSpecialRateIncome: boolean;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
  strLegalReference: string;
};

export type TaxSurchargeSlabFormValue = {
  strRowID: string;
  strTaxYearCode: string;
  strSurchargeProfileCode: string;
  decIncomeFromAmount: string;
  decIncomeToAmount: string;
  decSurchargeRatePercent: string;
  blnMarginalReliefEnabled: boolean;
  decMaximumRateCapPercent: string;
  intDisplayOrder: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
  strLegalReference: string;
};

export type TaxCessRuleFormValue = {
  strRowID: string;
  strTaxYearCode: string;
  strCessCode: string;
  strCessName: string;
  decCessRatePercent: string;
  strCalculationBaseCode: string;
  intDisplayOrder: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string;
  blnIsActive: boolean;
  strLegalReference: string;
};

export type TaxRuleWorkspaceRecord<TRecord> = {
  objRegime: TaxRegimeDetailRecord;
  lstRecords: TRecord[];
};
