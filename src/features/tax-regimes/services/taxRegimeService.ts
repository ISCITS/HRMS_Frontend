import {
  masterApiService,
  type TaxRegimeApiRecord,
  type TaxSlabApiRecord,
  type TaxSlabSetApiRecord
} from "@/services/master/MasterApiService";
import type {
  TaxRegimeDetailRecord,
  TaxRegimeFormOptions,
  TaxRegimeFormValues,
  TaxRegimeListRecord,
  TaxSlabLineFormValue,
  TaxSlabSetRecord
} from "@/features/tax-regimes/types";

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatOptionalNumber(strValue: string) {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

function mapTaxRegimeApiRecord(dicRecord: TaxRegimeApiRecord): TaxRegimeDetailRecord {
  return {
    intID: dicRecord.intID,
    strRegimeCode: dicRecord.strRegimeCode,
    strRegimeName: dicRecord.strRegimeName,
    strCountryCode: dicRecord.strCountryCode,
    blnIsActive: dicRecord.blnIsActive,
    intSlabCount: dicRecord.intSlabCount ?? 0
  };
}

function mapTaxSlabApiRecordToFormValue(dicRecord: TaxSlabApiRecord): TaxSlabLineFormValue {
  return {
    strRowID: createRowID(),
    strFinancialYearCode: dicRecord.strFinancialYearCode,
    fltSlabFromAmount: dicRecord.fltSlabFromAmount.toString(),
    fltSlabToAmount: dicRecord.fltSlabToAmount?.toString() ?? "",
    fltTaxRatePercent: dicRecord.fltTaxRatePercent.toString(),
    blnRebateEligible: dicRecord.blnRebateEligible,
    blnIsActive: dicRecord.blnIsActive
  };
}

function mapTaxSlabSetApiRecord(dicRecord: TaxSlabSetApiRecord): TaxSlabSetRecord {
  return {
    objRegime: mapTaxRegimeApiRecord(dicRecord.objRegime),
    lstSlabs: dicRecord.lstSlabs.map((dicSlab) => ({
      intID: dicSlab.intID,
      strFinancialYearCode: dicSlab.strFinancialYearCode,
      fltSlabFromAmount: dicSlab.fltSlabFromAmount,
      fltSlabToAmount: dicSlab.fltSlabToAmount,
      fltTaxRatePercent: dicSlab.fltTaxRatePercent,
      blnRebateEligible: dicSlab.blnRebateEligible,
      blnIsActive: dicSlab.blnIsActive
    })),
    lstFinancialYears: dicRecord.lstFinancialYears
  };
}

function toTaxRegimePayload(dicValues: TaxRegimeFormValues) {
  return {
    strRegimeCode: dicValues.strRegimeCode.trim().toUpperCase(),
    strRegimeName: dicValues.strRegimeName.trim(),
    strCountryCode: dicValues.strCountryCode.trim().toUpperCase(),
    blnIsActive: dicValues.blnIsActive
  };
}

function toTaxSlabPayload(lstSlabs: TaxSlabLineFormValue[]) {
  return {
    lstSlabs: lstSlabs.map((dicSlab) => ({
      strFinancialYearCode: dicSlab.strFinancialYearCode.trim(),
      fltSlabFromAmount: Number(dicSlab.fltSlabFromAmount.trim()),
      fltSlabToAmount: formatOptionalNumber(dicSlab.fltSlabToAmount),
      fltTaxRatePercent: Number(dicSlab.fltTaxRatePercent.trim()),
      blnRebateEligible: dicSlab.blnRebateEligible,
      blnIsActive: dicSlab.blnIsActive
    }))
  };
}

export function createInitialTaxRegimeForm(): TaxRegimeFormValues {
  return {
    strRegimeCode: "",
    strRegimeName: "",
    strCountryCode: "IN",
    blnIsActive: true
  };
}

export function toTaxRegimeFormValues(dicRecord: TaxRegimeDetailRecord): TaxRegimeFormValues {
  return {
    strRegimeCode: dicRecord.strRegimeCode,
    strRegimeName: dicRecord.strRegimeName,
    strCountryCode: dicRecord.strCountryCode,
    blnIsActive: dicRecord.blnIsActive
  };
}

export function createEmptyTaxSlabLine(strFinancialYearCode = ""): TaxSlabLineFormValue {
  return {
    strRowID: createRowID(),
    strFinancialYearCode,
    fltSlabFromAmount: "",
    fltSlabToAmount: "",
    fltTaxRatePercent: "",
    blnRebateEligible: false,
    blnIsActive: true
  };
}

export function toTaxSlabFormValues(dicRecord: TaxSlabSetRecord): TaxSlabLineFormValue[] {
  return dicRecord.lstSlabs.length > 0
    ? dicRecord.lstSlabs.map(mapTaxSlabApiRecordToFormValue)
    : [createEmptyTaxSlabLine(dicRecord.lstFinancialYears[0] ?? "")];
}

export const taxRegimeService = {
  async getTaxRegimes(): Promise<TaxRegimeListRecord[]> {
    const objResult = await masterApiService.getTaxRegimes();
    return objResult.Data.map(mapTaxRegimeApiRecord);
  },

  async getTaxRegimeById(intTaxRegimeID: number): Promise<TaxRegimeDetailRecord> {
    const objResult = await masterApiService.getTaxRegime(intTaxRegimeID);
    return mapTaxRegimeApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<TaxRegimeFormOptions> {
    const objResult = await masterApiService.getTaxRegimeFormOptions();
    return objResult.Data;
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
  }
};
