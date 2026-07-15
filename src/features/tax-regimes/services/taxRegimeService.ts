import { authHelpers } from "@/lib/auth";
import {
  masterApiService,
  type TaxCessRuleApiRecord,
  type TaxRebateRuleApiRecord,
  type TaxRegimeApiRecord,
  type TaxRuleSetApiRecord,
  type TaxSlabApiRecord,
  type TaxSlabSetApiRecord,
  type TaxStandardDeductionRuleApiRecord,
  type TaxSurchargeSlabApiRecord,
} from "@/services/master/MasterApiService";
import type {
  PayrollLookupOption,
  TaxCessRuleFormValue,
  TaxRegimeDetailRecord,
  TaxRegimeFormOptions,
  TaxRegimeFormValues,
  TaxRegimeListRecord,
  TaxRegimeTextFormValue,
  TaxRebateRuleFormValue,
  TaxRuleWorkspaceRecord,
  TaxSlabLineFormValue,
  TaxSlabSetRecord,
  TaxStandardDeductionRuleFormValue,
  TaxSurchargeSlabFormValue,
} from "@/features/tax-regimes/types";

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentLanguageID() {
  return authHelpers.getLanguageID() || 1;
}

function normalizeFinancialYearCode(strValue?: string | null) {
  const strNormalizedValue = (strValue ?? "").trim();
  if (!strNormalizedValue) {
    return "";
  }
  return strNormalizedValue.replace(/^FY\s*/i, "");
}

function formatOptionalNumber(strValue: string) {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

function formatOptionalInteger(strValue: string) {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const intValue = Number.parseInt(strTrimmedValue, 10);
  return Number.isFinite(intValue) ? intValue : null;
}

function createTextRow(
  intLanguageID = getCurrentLanguageID(),
  strLanguageName = intLanguageID === 1 ? "English" : `Language ${intLanguageID}`,
): TaxRegimeTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID,
    strLanguageName,
    strRegimeName: "",
    strDescription: "",
  };
}

function mapTaxRegimeApiRecord(dicRecord: TaxRegimeApiRecord): TaxRegimeDetailRecord {
  const lstTexts = (dicRecord.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strRegimeName: dicText.strRegimeName,
    strDescription: dicText.strDescription ?? "",
  }));
  const strTaxYearCode = normalizeFinancialYearCode(dicRecord.strTaxYearCode ?? dicRecord.strEffectiveFromYear ?? "");
  const strEffectiveFromYear = normalizeFinancialYearCode(dicRecord.strEffectiveFromYear ?? dicRecord.strTaxYearCode ?? "");
  return {
    intID: dicRecord.intID,
    strRegimeCode: dicRecord.strRegimeCode,
    strRegimeName: dicRecord.strRegimeName,
    strCountryCode: dicRecord.strCountryCode,
    strTaxYearCode,
    strRegimeTypeCode: dicRecord.strRegimeTypeCode ?? "PROGRESSIVE",
    strRegimeTypeDisplay: dicRecord.strRegimeTypeDisplay ?? dicRecord.strRegimeTypeCode ?? "PROGRESSIVE",
    blnIsDefaultRegime: dicRecord.blnIsDefaultRegime ?? false,
    blnAllowEmployeeOptOut: dicRecord.blnAllowEmployeeOptOut ?? false,
    blnIsActive: dicRecord.blnIsActive,
    intSlabCount: dicRecord.intSlabCount ?? 0,
    intSlabProfileCount: dicRecord.intSlabProfileCount ?? 0,
    decStandardDeductionAmount: dicRecord.decStandardDeductionAmount ?? 0,
    blnStandardDeductionEnabled: dicRecord.blnStandardDeductionEnabled ?? false,
    blnRebateEnabled: dicRecord.blnRebateEnabled ?? false,
    blnSurchargeEnabled: dicRecord.blnSurchargeEnabled ?? false,
    blnCessEnabled: dicRecord.blnCessEnabled ?? false,
    intCountryID: dicRecord.intCountryID ?? null,
    strCurrencyCode: dicRecord.strCurrencyCode ?? (dicRecord.strCountryCode === "IN" ? "INR" : ""),
    strEffectiveFromYear,
    dtEffectiveFrom: dicRecord.dtEffectiveFrom ?? null,
    dtEffectiveTo: dicRecord.dtEffectiveTo ?? null,
    intRegimeTypeID: dicRecord.intRegimeTypeID ?? null,
    strTaxpayerTypeCode: dicRecord.strTaxpayerTypeCode ?? "INDIVIDUAL",
    strRoundingRuleCode: dicRecord.strRoundingRuleCode ?? "NEAREST_10",
    blnMarginalRebateEnabled: dicRecord.blnMarginalRebateEnabled ?? false,
    blnMarginalSurchargeReliefEnabled: dicRecord.blnMarginalSurchargeReliefEnabled ?? false,
    decCessRatePercent: dicRecord.decCessRatePercent ?? 0,
    intCalculationPriority: dicRecord.intCalculationPriority ?? 10,
    strLegalReference: dicRecord.strLegalReference ?? "",
    strConfigurationNotes: dicRecord.strConfigurationNotes ?? "",
    strDescription: dicRecord.strDescription ?? "",
    lstTexts: lstTexts.length > 0 ? lstTexts : [createTextRow()],
  };
}

function mapTaxSlabApiRecordToFormValue(dicRecord: TaxSlabApiRecord): TaxSlabLineFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode: dicRecord.strTaxYearCode ?? dicRecord.strFinancialYearCode,
    strSlabProfileCode: dicRecord.strSlabProfileCode ?? "GENERAL",
    strTaxpayerTypeCode: dicRecord.strTaxpayerTypeCode ?? "INDIVIDUAL",
    strResidentialStatusCode: dicRecord.strResidentialStatusCode ?? "RESIDENT",
    intAgeFromYears: dicRecord.intAgeFromYears?.toString() ?? "",
    intAgeToYears: dicRecord.intAgeToYears?.toString() ?? "",
    fltSlabFromAmount: dicRecord.fltSlabFromAmount.toString(),
    fltSlabToAmount: dicRecord.fltSlabToAmount?.toString() ?? "",
    fltTaxRatePercent: dicRecord.fltTaxRatePercent.toString(),
    decFixedTaxAmount: (dicRecord.decFixedTaxAmount ?? 0).toString(),
    intDisplayOrder: String(dicRecord.intDisplayOrder ?? 10),
    dtEffectiveFrom: dicRecord.dtEffectiveFrom ?? "",
    dtEffectiveTo: dicRecord.dtEffectiveTo ?? "",
    strLegalReference: dicRecord.strLegalReference ?? "",
    blnIsActive: dicRecord.blnIsActive,
  };
}

function mapTaxSlabSetApiRecord(dicRecord: TaxSlabSetApiRecord): TaxSlabSetRecord {
  const dicDetail = mapTaxRegimeApiRecord(dicRecord.objRegime);
  const setProfiles = new Set(dicRecord.lstSlabs.map((dicSlab) => dicSlab.strSlabProfileCode ?? "GENERAL"));
  dicDetail.intSlabProfileCount = setProfiles.size;
  return {
    objRegime: dicDetail,
    lstSlabs: dicRecord.lstSlabs.map((dicSlab) => ({
      intID: dicSlab.intID,
      strTaxYearCode: dicSlab.strTaxYearCode ?? dicSlab.strFinancialYearCode,
      strSlabProfileCode: dicSlab.strSlabProfileCode ?? "GENERAL",
      strTaxpayerTypeCode: dicSlab.strTaxpayerTypeCode ?? "INDIVIDUAL",
      strResidentialStatusCode: dicSlab.strResidentialStatusCode ?? "RESIDENT",
      intAgeFromYears: dicSlab.intAgeFromYears ?? null,
      intAgeToYears: dicSlab.intAgeToYears ?? null,
      fltSlabFromAmount: dicSlab.fltSlabFromAmount,
      fltSlabToAmount: dicSlab.fltSlabToAmount,
      fltTaxRatePercent: dicSlab.fltTaxRatePercent,
      decFixedTaxAmount: dicSlab.decFixedTaxAmount ?? 0,
      intDisplayOrder: dicSlab.intDisplayOrder ?? 10,
      dtEffectiveFrom: dicSlab.dtEffectiveFrom ?? null,
      dtEffectiveTo: dicSlab.dtEffectiveTo ?? null,
      strLegalReference: dicSlab.strLegalReference ?? null,
      blnIsActive: dicSlab.blnIsActive,
    })),
    lstFinancialYears: dicRecord.lstFinancialYears,
  };
}

function mapRuleWorkspace<TApiRecord, TFormValue>(
  dicRecord: TaxRuleSetApiRecord<TApiRecord>,
  fnMap: (dicRule: TApiRecord) => TFormValue,
): TaxRuleWorkspaceRecord<TFormValue> {
  return {
    objRegime: mapTaxRegimeApiRecord(dicRecord.objRegime),
    lstRecords: (dicRecord.lstRules ?? dicRecord.lstSlabs ?? []).map(fnMap),
  };
}

function toTaxRegimePayload(dicValues: TaxRegimeFormValues) {
  const intDefaultLanguageID = Number(dicValues.lstTexts[0]?.intLanguageID || getCurrentLanguageID());
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID && dicText.strRegimeName.trim(),
  ) ?? dicValues.lstTexts.find((dicText) => dicText.strRegimeName.trim());
  return {
    strRegimeCode: dicValues.strRegimeCode.trim().toUpperCase(),
    strRegimeName: dicPrimaryText?.strRegimeName.trim() || dicValues.strRegimeName.trim(),
    strCountryCode: dicValues.strCountryCode.trim().toUpperCase(),
    strCurrencyCode: dicValues.strCurrencyCode.trim().toUpperCase(),
    strTaxYearCode: dicValues.strTaxYearCode.trim(),
    strEffectiveFromYear: dicValues.strEffectiveFromYear.trim(),
    dtEffectiveFrom: dicValues.dtEffectiveFrom.trim() || null,
    dtEffectiveTo: dicValues.dtEffectiveTo.trim() || null,
    intRegimeTypeID: typeof dicValues.intRegimeTypeID === "number" ? dicValues.intRegimeTypeID : null,
    strRegimeTypeCode: dicValues.strRegimeTypeCode.trim().toUpperCase(),
    strTaxpayerTypeCode: dicValues.strTaxpayerTypeCode.trim().toUpperCase(),
    strRoundingRuleCode: dicValues.strRoundingRuleCode.trim().toUpperCase(),
    blnIsDefaultRegime: dicValues.blnIsDefaultRegime,
    blnAllowEmployeeOptOut: dicValues.blnIsDefaultRegime ? dicValues.blnAllowEmployeeOptOut : false,
    blnIsActive: dicValues.blnIsActive,
    blnStandardDeductionEnabled: dicValues.blnStandardDeductionEnabled,
    decStandardDeductionAmount: Number(dicValues.decStandardDeductionAmount || "0"),
    blnRebateEnabled: dicValues.blnRebateEnabled,
    blnMarginalRebateEnabled: dicValues.blnMarginalRebateEnabled,
    blnSurchargeEnabled: dicValues.blnSurchargeEnabled,
    blnMarginalSurchargeReliefEnabled: dicValues.blnMarginalSurchargeReliefEnabled,
    blnCessEnabled: dicValues.blnCessEnabled,
    decCessRatePercent: Number(dicValues.decCessRatePercent || "0"),
    intCalculationPriority: Number(dicValues.intCalculationPriority || "10"),
    strLegalReference: dicValues.strLegalReference.trim() || null,
    strConfigurationNotes: dicValues.strConfigurationNotes.trim() || null,
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.strRegimeName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strRegimeName: dicText.strRegimeName.trim(),
        strDescription: dicText.strDescription.trim() || null,
      })),
  };
}

function toTaxSlabPayload(lstSlabs: TaxSlabLineFormValue[]) {
  return {
    lstSlabs: lstSlabs.map((dicSlab) => ({
      strFinancialYearCode: dicSlab.strTaxYearCode.trim(),
      strTaxYearCode: dicSlab.strTaxYearCode.trim(),
      strSlabProfileCode: dicSlab.strSlabProfileCode.trim().toUpperCase(),
      strTaxpayerTypeCode: dicSlab.strTaxpayerTypeCode.trim().toUpperCase(),
      strResidentialStatusCode: dicSlab.strResidentialStatusCode.trim().toUpperCase(),
      intAgeFromYears: formatOptionalInteger(dicSlab.intAgeFromYears),
      intAgeToYears: formatOptionalInteger(dicSlab.intAgeToYears),
      fltSlabFromAmount: Number(dicSlab.fltSlabFromAmount.trim()),
      fltSlabToAmount: formatOptionalNumber(dicSlab.fltSlabToAmount),
      fltTaxRatePercent: Number(dicSlab.fltTaxRatePercent.trim()),
      decFixedTaxAmount: Number(dicSlab.decFixedTaxAmount.trim() || "0"),
      intDisplayOrder: Number(dicSlab.intDisplayOrder.trim() || "10"),
      dtEffectiveFrom: dicSlab.dtEffectiveFrom.trim() || null,
      dtEffectiveTo: dicSlab.dtEffectiveTo.trim() || null,
      strLegalReference: dicSlab.strLegalReference.trim() || null,
      blnRebateEligible: false,
      blnIsActive: dicSlab.blnIsActive,
    })),
  };
}

function mapStandardDeductionRule(dicRule: TaxStandardDeductionRuleApiRecord): TaxStandardDeductionRuleFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode: dicRule.strTaxYearCode,
    strIncomeSourceCode: dicRule.strIncomeSourceCode,
    strTaxpayerTypeCode: dicRule.strTaxpayerTypeCode,
    strResidentialStatusCode: dicRule.strResidentialStatusCode,
    strDeductionModeCode: dicRule.strDeductionModeCode,
    decDeductionAmount: dicRule.decDeductionAmount.toString(),
    decDeductionPercent: dicRule.decDeductionPercent?.toString() ?? "",
    decMaximumDeductionAmount: dicRule.decMaximumDeductionAmount?.toString() ?? "",
    dtEffectiveFrom: dicRule.dtEffectiveFrom,
    dtEffectiveTo: dicRule.dtEffectiveTo ?? "",
    blnIsActive: dicRule.blnIsActive,
    strLegalReference: dicRule.strLegalReference ?? "",
    strRemarks: dicRule.strRemarks ?? "",
  };
}

function mapRebateRule(dicRule: TaxRebateRuleApiRecord): TaxRebateRuleFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode: dicRule.strTaxYearCode,
    strRebateCode: dicRule.strRebateCode,
    strTaxpayerTypeCode: dicRule.strTaxpayerTypeCode,
    strResidentialStatusCode: dicRule.strResidentialStatusCode,
    decMinimumTotalIncome: dicRule.decMinimumTotalIncome.toString(),
    decMaximumTotalIncome: dicRule.decMaximumTotalIncome.toString(),
    strRebateModeCode: dicRule.strRebateModeCode,
    decMaximumRebateAmount: dicRule.decMaximumRebateAmount.toString(),
    decRebatePercent: dicRule.decRebatePercent?.toString() ?? "",
    blnMarginalReliefEnabled: dicRule.blnMarginalReliefEnabled,
    blnExcludesSpecialRateIncome: dicRule.blnExcludesSpecialRateIncome,
    dtEffectiveFrom: dicRule.dtEffectiveFrom,
    dtEffectiveTo: dicRule.dtEffectiveTo ?? "",
    blnIsActive: dicRule.blnIsActive,
    strLegalReference: dicRule.strLegalReference ?? "",
  };
}

function mapSurchargeSlab(dicRule: TaxSurchargeSlabApiRecord): TaxSurchargeSlabFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode: dicRule.strTaxYearCode,
    strSurchargeProfileCode: dicRule.strSurchargeProfileCode,
    decIncomeFromAmount: dicRule.decIncomeFromAmount.toString(),
    decIncomeToAmount: dicRule.decIncomeToAmount?.toString() ?? "",
    decSurchargeRatePercent: dicRule.decSurchargeRatePercent.toString(),
    blnMarginalReliefEnabled: dicRule.blnMarginalReliefEnabled,
    decMaximumRateCapPercent: dicRule.decMaximumRateCapPercent?.toString() ?? "",
    intDisplayOrder: String(dicRule.intDisplayOrder),
    dtEffectiveFrom: dicRule.dtEffectiveFrom,
    dtEffectiveTo: dicRule.dtEffectiveTo ?? "",
    blnIsActive: dicRule.blnIsActive,
    strLegalReference: dicRule.strLegalReference ?? "",
  };
}

function mapCessRule(dicRule: TaxCessRuleApiRecord): TaxCessRuleFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode: dicRule.strTaxYearCode,
    strCessCode: dicRule.strCessCode,
    strCessName: dicRule.strCessName,
    decCessRatePercent: dicRule.decCessRatePercent.toString(),
    strCalculationBaseCode: dicRule.strCalculationBaseCode,
    intDisplayOrder: String(dicRule.intDisplayOrder),
    dtEffectiveFrom: dicRule.dtEffectiveFrom,
    dtEffectiveTo: dicRule.dtEffectiveTo ?? "",
    blnIsActive: dicRule.blnIsActive,
    strLegalReference: dicRule.strLegalReference ?? "",
  };
}

function mapFormOptions(objResult: Awaited<ReturnType<typeof masterApiService.getTaxRegimeFormOptions>>["Data"]): TaxRegimeFormOptions {
  const lstFinancialYears = [...new Set((objResult.lstFinancialYears ?? []).map((strYearCode) => normalizeFinancialYearCode(strYearCode)).filter(Boolean))];
  const strDefaultEffectiveFromYear = normalizeFinancialYearCode(objResult.strDefaultEffectiveFromYear) || lstFinancialYears[0] || "";
  return {
    lstCountries: objResult.lstCountries?.length ? objResult.lstCountries : [{ intID: 1, strLabel: "India", strCode: "IN" }],
    lstFinancialYears,
    strDefaultEffectiveFromYear,
    lstRegimeTypeLookups: (objResult.lstRegimeTypeLookups?.length ? objResult.lstRegimeTypeLookups : [{
      intID: 1,
      strValueCode: "PROGRESSIVE",
      strDisplayName: "Progressive",
      strDescription: "Default progressive slab-based regime",
    }]) as PayrollLookupOption[],
    lstLanguages: objResult.lstLanguages?.length ? objResult.lstLanguages : [{ intID: 1, strLabel: "English", strCode: "en" }],
  };
}

export function createInitialTaxRegimeForm(): TaxRegimeFormValues {
  return {
    strRegimeCode: "",
    strRegimeName: "",
    strCountryCode: "IN",
    strCurrencyCode: "INR",
    strTaxYearCode: "",
    strEffectiveFromYear: "",
    dtEffectiveFrom: "",
    dtEffectiveTo: "",
    intRegimeTypeID: "",
    strRegimeTypeCode: "PROGRESSIVE",
    strTaxpayerTypeCode: "INDIVIDUAL",
    strRoundingRuleCode: "NEAREST_10",
    blnIsDefaultRegime: false,
    blnAllowEmployeeOptOut: false,
    blnIsActive: true,
    blnStandardDeductionEnabled: false,
    decStandardDeductionAmount: "0",
    blnRebateEnabled: false,
    blnMarginalRebateEnabled: false,
    blnSurchargeEnabled: false,
    blnMarginalSurchargeReliefEnabled: false,
    blnCessEnabled: true,
    decCessRatePercent: "0",
    intCalculationPriority: "10",
    strLegalReference: "",
    strConfigurationNotes: "",
    lstTexts: [createTextRow()],
  };
}

export function toTaxRegimeFormValues(dicRecord: TaxRegimeDetailRecord): TaxRegimeFormValues {
  return {
    strRegimeCode: dicRecord.strRegimeCode,
    strRegimeName: dicRecord.strRegimeName,
    strCountryCode: dicRecord.strCountryCode,
    strCurrencyCode: dicRecord.strCurrencyCode || (dicRecord.strCountryCode === "IN" ? "INR" : ""),
    strTaxYearCode: normalizeFinancialYearCode(dicRecord.strTaxYearCode),
    strEffectiveFromYear: normalizeFinancialYearCode(dicRecord.strEffectiveFromYear || dicRecord.strTaxYearCode),
    dtEffectiveFrom: dicRecord.dtEffectiveFrom ?? "",
    dtEffectiveTo: dicRecord.dtEffectiveTo ?? "",
    intRegimeTypeID: dicRecord.intRegimeTypeID ?? 1,
    strRegimeTypeCode: dicRecord.strRegimeTypeCode,
    strTaxpayerTypeCode: dicRecord.strTaxpayerTypeCode,
    strRoundingRuleCode: dicRecord.strRoundingRuleCode,
    blnIsDefaultRegime: dicRecord.blnIsDefaultRegime,
    blnAllowEmployeeOptOut: dicRecord.blnAllowEmployeeOptOut,
    blnIsActive: dicRecord.blnIsActive,
    blnStandardDeductionEnabled: dicRecord.blnStandardDeductionEnabled,
    decStandardDeductionAmount: String(dicRecord.decStandardDeductionAmount ?? 0),
    blnRebateEnabled: dicRecord.blnRebateEnabled,
    blnMarginalRebateEnabled: dicRecord.blnMarginalRebateEnabled,
    blnSurchargeEnabled: dicRecord.blnSurchargeEnabled,
    blnMarginalSurchargeReliefEnabled: dicRecord.blnMarginalSurchargeReliefEnabled,
    blnCessEnabled: dicRecord.blnCessEnabled,
    decCessRatePercent: String(dicRecord.decCessRatePercent ?? 0),
    intCalculationPriority: String(dicRecord.intCalculationPriority ?? 10),
    strLegalReference: dicRecord.strLegalReference,
    strConfigurationNotes: dicRecord.strConfigurationNotes,
    lstTexts: dicRecord.lstTexts.length > 0 ? dicRecord.lstTexts : [createTextRow()],
  };
}

export function createEmptyTaxSlabLine(strTaxYearCode = ""): TaxSlabLineFormValue {
  return {
    strRowID: createRowID(),
    strTaxYearCode,
    strSlabProfileCode: "GENERAL",
    strTaxpayerTypeCode: "INDIVIDUAL",
    strResidentialStatusCode: "RESIDENT",
    intAgeFromYears: "",
    intAgeToYears: "",
    fltSlabFromAmount: "",
    fltSlabToAmount: "",
    fltTaxRatePercent: "",
    decFixedTaxAmount: "0",
    intDisplayOrder: "10",
    dtEffectiveFrom: "",
    dtEffectiveTo: "",
    strLegalReference: "",
    blnIsActive: true,
  };
}

export function toTaxSlabFormValues(dicRecord: TaxSlabSetRecord): TaxSlabLineFormValue[] {
  return dicRecord.lstSlabs.length > 0
    ? dicRecord.lstSlabs.map((dicSlab) => mapTaxSlabApiRecordToFormValue({
      intID: dicSlab.intID,
      strFinancialYearCode: dicSlab.strTaxYearCode,
      fltSlabFromAmount: dicSlab.fltSlabFromAmount,
      fltSlabToAmount: dicSlab.fltSlabToAmount,
      fltTaxRatePercent: dicSlab.fltTaxRatePercent,
      blnRebateEligible: false,
      blnIsActive: dicSlab.blnIsActive,
      strTaxYearCode: dicSlab.strTaxYearCode,
      strSlabProfileCode: dicSlab.strSlabProfileCode,
      strTaxpayerTypeCode: dicSlab.strTaxpayerTypeCode,
      strResidentialStatusCode: dicSlab.strResidentialStatusCode,
      intAgeFromYears: dicSlab.intAgeFromYears,
      intAgeToYears: dicSlab.intAgeToYears,
      intDisplayOrder: dicSlab.intDisplayOrder,
      decFixedTaxAmount: dicSlab.decFixedTaxAmount,
      dtEffectiveFrom: dicSlab.dtEffectiveFrom,
      dtEffectiveTo: dicSlab.dtEffectiveTo,
      strLegalReference: dicSlab.strLegalReference,
    }))
    : [createEmptyTaxSlabLine(dicRecord.objRegime.strTaxYearCode)];
}

export const taxRegimeService = {
  async getTaxRegimes(): Promise<TaxRegimeListRecord[]> {
    const objResult = await masterApiService.getTaxRegimes(getCurrentLanguageID());
    return objResult.Data.map(mapTaxRegimeApiRecord);
  },

  async getTaxRegimeById(intTaxRegimeID: number): Promise<TaxRegimeDetailRecord> {
    const objResult = await masterApiService.getTaxRegime(intTaxRegimeID, getCurrentLanguageID());
    return mapTaxRegimeApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<TaxRegimeFormOptions> {
    const objResult = await masterApiService.getTaxRegimeFormOptions(getCurrentLanguageID());
    return mapFormOptions(objResult.Data);
  },

  async createTaxRegime(dicValues: TaxRegimeFormValues): Promise<TaxRegimeDetailRecord> {
    const objResult = await masterApiService.createTaxRegime(toTaxRegimePayload(dicValues));
    return mapTaxRegimeApiRecord(objResult.Data);
  },

  async updateTaxRegime(intTaxRegimeID: number, dicValues: TaxRegimeFormValues): Promise<TaxRegimeDetailRecord> {
    const objResult = await masterApiService.updateTaxRegime(intTaxRegimeID, toTaxRegimePayload(dicValues));
    return mapTaxRegimeApiRecord(objResult.Data);
  },

  async setTaxRegimeStatus(intTaxRegimeID: number, blnIsActive: boolean): Promise<TaxRegimeDetailRecord> {
    const objResult = await masterApiService.setTaxRegimeStatus(intTaxRegimeID, blnIsActive);
    return mapTaxRegimeApiRecord(objResult.Data);
  },

  async getTaxSlabs(intTaxRegimeID: number): Promise<TaxSlabSetRecord> {
    const objResult = await masterApiService.getTaxSlabs(intTaxRegimeID);
    return mapTaxSlabSetApiRecord(objResult.Data);
  },

  async saveTaxSlabs(intTaxRegimeID: number, lstSlabs: TaxSlabLineFormValue[]): Promise<TaxSlabSetRecord> {
    const objResult = await masterApiService.saveTaxSlabs(intTaxRegimeID, toTaxSlabPayload(lstSlabs));
    return mapTaxSlabSetApiRecord(objResult.Data);
  },

  async getTaxStandardDeductionRules(intTaxRegimeID: number): Promise<TaxRuleWorkspaceRecord<TaxStandardDeductionRuleFormValue>> {
    const objResult = await masterApiService.getTaxStandardDeductionRules(intTaxRegimeID);
    return mapRuleWorkspace(objResult.Data, mapStandardDeductionRule);
  },

  async saveTaxStandardDeductionRules(intTaxRegimeID: number, lstRules: TaxStandardDeductionRuleFormValue[]): Promise<TaxRuleWorkspaceRecord<TaxStandardDeductionRuleFormValue>> {
    const objResult = await masterApiService.saveTaxStandardDeductionRules(intTaxRegimeID, {
      lstRules: lstRules.map((dicRule) => ({
        intTaxRegimeID,
        strTaxYearCode: dicRule.strTaxYearCode.trim(),
        strIncomeSourceCode: dicRule.strIncomeSourceCode.trim().toUpperCase(),
        strTaxpayerTypeCode: dicRule.strTaxpayerTypeCode.trim().toUpperCase(),
        strResidentialStatusCode: dicRule.strResidentialStatusCode.trim().toUpperCase(),
        strDeductionModeCode: dicRule.strDeductionModeCode.trim().toUpperCase(),
        decDeductionAmount: Number(dicRule.decDeductionAmount || "0"),
        decDeductionPercent: formatOptionalNumber(dicRule.decDeductionPercent),
        decMaximumDeductionAmount: formatOptionalNumber(dicRule.decMaximumDeductionAmount),
        dtEffectiveFrom: dicRule.dtEffectiveFrom,
        dtEffectiveTo: dicRule.dtEffectiveTo.trim() || null,
        blnIsActive: dicRule.blnIsActive,
        strLegalReference: dicRule.strLegalReference.trim() || null,
        strRemarks: dicRule.strRemarks.trim() || null,
      })),
    });
    return mapRuleWorkspace(objResult.Data, mapStandardDeductionRule);
  },

  async getTaxRebateRules(intTaxRegimeID: number): Promise<TaxRuleWorkspaceRecord<TaxRebateRuleFormValue>> {
    const objResult = await masterApiService.getTaxRebateRules(intTaxRegimeID);
    return mapRuleWorkspace(objResult.Data, mapRebateRule);
  },

  async saveTaxRebateRules(intTaxRegimeID: number, lstRules: TaxRebateRuleFormValue[]): Promise<TaxRuleWorkspaceRecord<TaxRebateRuleFormValue>> {
    const objResult = await masterApiService.saveTaxRebateRules(intTaxRegimeID, {
      lstRules: lstRules.map((dicRule) => ({
        intTaxRegimeID,
        strTaxYearCode: dicRule.strTaxYearCode.trim(),
        strRebateCode: dicRule.strRebateCode.trim().toUpperCase(),
        strTaxpayerTypeCode: dicRule.strTaxpayerTypeCode.trim().toUpperCase(),
        strResidentialStatusCode: dicRule.strResidentialStatusCode.trim().toUpperCase(),
        decMinimumTotalIncome: Number(dicRule.decMinimumTotalIncome || "0"),
        decMaximumTotalIncome: Number(dicRule.decMaximumTotalIncome || "0"),
        strRebateModeCode: dicRule.strRebateModeCode.trim().toUpperCase(),
        decMaximumRebateAmount: Number(dicRule.decMaximumRebateAmount || "0"),
        decRebatePercent: formatOptionalNumber(dicRule.decRebatePercent),
        blnMarginalReliefEnabled: dicRule.blnMarginalReliefEnabled,
        blnExcludesSpecialRateIncome: dicRule.blnExcludesSpecialRateIncome,
        dtEffectiveFrom: dicRule.dtEffectiveFrom,
        dtEffectiveTo: dicRule.dtEffectiveTo.trim() || null,
        blnIsActive: dicRule.blnIsActive,
        strLegalReference: dicRule.strLegalReference.trim() || null,
      })),
    });
    return mapRuleWorkspace(objResult.Data, mapRebateRule);
  },

  async getTaxSurchargeSlabs(intTaxRegimeID: number): Promise<TaxRuleWorkspaceRecord<TaxSurchargeSlabFormValue>> {
    const objResult = await masterApiService.getTaxSurchargeSlabs(intTaxRegimeID);
    return mapRuleWorkspace(objResult.Data, mapSurchargeSlab);
  },

  async saveTaxSurchargeSlabs(intTaxRegimeID: number, lstRules: TaxSurchargeSlabFormValue[]): Promise<TaxRuleWorkspaceRecord<TaxSurchargeSlabFormValue>> {
    const objResult = await masterApiService.saveTaxSurchargeSlabs(intTaxRegimeID, {
      lstSlabs: lstRules.map((dicRule) => ({
        intTaxRegimeID,
        strTaxYearCode: dicRule.strTaxYearCode.trim(),
        strSurchargeProfileCode: dicRule.strSurchargeProfileCode.trim().toUpperCase(),
        decIncomeFromAmount: Number(dicRule.decIncomeFromAmount || "0"),
        decIncomeToAmount: formatOptionalNumber(dicRule.decIncomeToAmount),
        decSurchargeRatePercent: Number(dicRule.decSurchargeRatePercent || "0"),
        blnMarginalReliefEnabled: dicRule.blnMarginalReliefEnabled,
        decMaximumRateCapPercent: formatOptionalNumber(dicRule.decMaximumRateCapPercent),
        intDisplayOrder: Number(dicRule.intDisplayOrder || "10"),
        dtEffectiveFrom: dicRule.dtEffectiveFrom,
        dtEffectiveTo: dicRule.dtEffectiveTo.trim() || null,
        blnIsActive: dicRule.blnIsActive,
        strLegalReference: dicRule.strLegalReference.trim() || null,
      })),
    });
    return mapRuleWorkspace(objResult.Data, mapSurchargeSlab);
  },

  async getTaxCessRules(intTaxRegimeID: number): Promise<TaxRuleWorkspaceRecord<TaxCessRuleFormValue>> {
    const objResult = await masterApiService.getTaxCessRules(intTaxRegimeID);
    return mapRuleWorkspace(objResult.Data, mapCessRule);
  },

  async saveTaxCessRules(intTaxRegimeID: number, lstRules: TaxCessRuleFormValue[]): Promise<TaxRuleWorkspaceRecord<TaxCessRuleFormValue>> {
    const objResult = await masterApiService.saveTaxCessRules(intTaxRegimeID, {
      lstRules: lstRules.map((dicRule) => ({
        intTaxRegimeID,
        strTaxYearCode: dicRule.strTaxYearCode.trim(),
        strCessCode: dicRule.strCessCode.trim().toUpperCase(),
        strCessName: dicRule.strCessName.trim(),
        decCessRatePercent: Number(dicRule.decCessRatePercent || "0"),
        strCalculationBaseCode: dicRule.strCalculationBaseCode.trim().toUpperCase(),
        intDisplayOrder: Number(dicRule.intDisplayOrder || "10"),
        dtEffectiveFrom: dicRule.dtEffectiveFrom,
        dtEffectiveTo: dicRule.dtEffectiveTo.trim() || null,
        blnIsActive: dicRule.blnIsActive,
        strLegalReference: dicRule.strLegalReference.trim() || null,
      })),
    });
    return mapRuleWorkspace(objResult.Data, mapCessRule);
  },
};
