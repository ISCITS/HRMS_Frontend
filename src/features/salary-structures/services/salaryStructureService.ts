import {
  masterApiService,
  type SalaryStructureApiRecord,
  type SalaryStructureComponentApiRecord,
  type SalaryStructureTextApiRecord
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";
import type {
  SalaryStructureCloneValues,
  SalaryStructureDetailRecord,
  SalaryStructureFormOptions,
  SalaryStructureFormValues,
  SalaryStructureLineFormValue,
  SalaryStructureListRecord,
  SalaryStructureTextFormValue
} from "@/features/salary-structures/types";

let intRowIDSequence = 0;

function createRowID() {
  intRowIDSequence += 1;
  return `salary-structure-row-${intRowIDSequence}`;
}

function formatOptionalText(strValue: string) {
  const strTrimmedValue = strValue.trim();
  return strTrimmedValue ? strTrimmedValue : null;
}

function formatOptionalNumber(strValue: string) {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

function formatOptionalInteger(objValue: number | string | "") {
  if (objValue === "" || objValue === null || objValue === undefined) {
    return null;
  }
  const intValue = Number(objValue);
  return Number.isInteger(intValue) && intValue > 0 ? intValue : null;
}

function mapTextToFormValue(dicText: SalaryStructureTextApiRecord): SalaryStructureTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName ?? "",
    strStructureName: dicText.strStructureName,
    strStructureDescription: dicText.strStructureDescription ?? ""
  };
}

function mapLineToFormValue(dicLine: SalaryStructureComponentApiRecord): SalaryStructureLineFormValue {
  return {
    strRowID: createRowID(),
    intSalaryComponentID: dicLine.intSalaryComponentID,
    intLineOrder: dicLine.intLineOrder,
    strValueSource: dicLine.strValueSource,
    strComponentCode: dicLine.strComponentCode ?? "",
    strComponentName: dicLine.strComponentName,
    blnIsFlexiBasketLine: Boolean(dicLine.blnIsFlexiBasketLine),
    strFlexiComponentRole: dicLine.strFlexiComponentRole ?? "normal",
    blnIncludedInCtc: Boolean(dicLine.blnIncludedInCtc ?? true),
    strComponentCategory: dicLine.strComponentCategory ?? "",
    fltFixedAmount: dicLine.fltFixedAmount?.toString() ?? "",
    fltPercentageValue: dicLine.fltPercentageValue?.toString() ?? "",
    intBasisComponentID: dicLine.intBasisComponentID ?? "",
    strFormulaExpression: dicLine.strFormulaExpression ?? "",
    fltMinAmount: dicLine.fltMinAmount?.toString() ?? "",
    fltMaxAmount: dicLine.fltMaxAmount?.toString() ?? "",
    blnIsMandatory: dicLine.blnIsMandatory,
    blnIsActive: dicLine.blnIsActive
  };
}

function mapApiRecord(dicRecord: SalaryStructureApiRecord): SalaryStructureDetailRecord {
  return {
    intID: dicRecord.intID,
    strStructureCode: dicRecord.strStructureCode,
    strStructureName: dicRecord.strStructureName,
    strCurrencyCode: dicRecord.strCurrencyCode,
    dtEffectiveFrom: dicRecord.dtEffectiveFrom,
    dtEffectiveTo: dicRecord.dtEffectiveTo,
    blnIsDefault: dicRecord.blnIsDefault,
    blnIsActive: dicRecord.blnIsActive,
    strScopeLabel: dicRecord.strScopeLabel ?? "Company",
    intComponentCount: dicRecord.intComponentCount ?? dicRecord.lstComponents.length,
    dicStructureSummary: {
      fltTotalCtc: Number(dicRecord.dicStructureSummary?.fltTotalCtc ?? 0),
      fltFixedPay: Number(dicRecord.dicStructureSummary?.fltFixedPay ?? 0),
      fltVariablePay: Number(dicRecord.dicStructureSummary?.fltVariablePay ?? 0),
      fltFlexiBasket: Number(dicRecord.dicStructureSummary?.fltFlexiBasket ?? 0),
      fltEmployerContribution: Number(dicRecord.dicStructureSummary?.fltEmployerContribution ?? 0),
    },
    lstTexts: (dicRecord.lstTexts ?? []).map((dicText) => ({
      intLanguageID: dicText.intLanguageID,
      strLanguageName: dicText.strLanguageName ?? `Language ${dicText.intLanguageID}`,
      strStructureName: dicText.strStructureName,
      strStructureDescription: dicText.strStructureDescription
    })),
    lstComponents: (dicRecord.lstComponents ?? []).map((dicLine) => ({
      intID: dicLine.intID,
      intSalaryComponentID: dicLine.intSalaryComponentID,
      strComponentCode: dicLine.strComponentCode ?? null,
      strComponentName: dicLine.strComponentName,
      blnIsFlexiBasketLine: Boolean(dicLine.blnIsFlexiBasketLine),
      strFlexiComponentRole: dicLine.strFlexiComponentRole ?? null,
      blnIncludedInCtc: Boolean(dicLine.blnIncludedInCtc ?? true),
      strComponentCategory: dicLine.strComponentCategory ?? null,
      intLineOrder: dicLine.intLineOrder,
      strValueSource: dicLine.strValueSource,
      fltFixedAmount: dicLine.fltFixedAmount,
      fltPercentageValue: dicLine.fltPercentageValue,
      intBasisComponentID: dicLine.intBasisComponentID,
      strBasisComponentName: dicLine.strBasisComponentName ?? null,
      strFormulaExpression: dicLine.strFormulaExpression,
      fltMinAmount: dicLine.fltMinAmount,
      fltMaxAmount: dicLine.fltMaxAmount,
      blnIsMandatory: dicLine.blnIsMandatory,
      blnIsActive: dicLine.blnIsActive
    }))
  };
}

function toFormPayload(dicValues: SalaryStructureFormValues) {
  return {
    strStructureCode: dicValues.strStructureCode.trim(),
    strStructureName: dicValues.strStructureName.trim(),
    strCurrencyCode: dicValues.strCurrencyCode.trim(),
    dtEffectiveFrom: dicValues.dtEffectiveFrom,
    dtEffectiveTo: dicValues.dtEffectiveTo || null,
    blnIsDefault: dicValues.blnIsDefault,
    blnIsActive: dicValues.blnIsActive,
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strStructureName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strStructureName: dicText.strStructureName.trim(),
        strStructureDescription: formatOptionalText(dicText.strStructureDescription)
      })),
    lstComponents: dicValues.lstComponents
      .map((dicLine) => ({
        ...dicLine,
        intSalaryComponentID: formatOptionalInteger(dicLine.intSalaryComponentID),
        intBasisComponentID: formatOptionalInteger(dicLine.intBasisComponentID)
      }))
      .filter((dicLine) => dicLine.intSalaryComponentID !== null)
      .map((dicLine) => ({
        intSalaryComponentID: dicLine.intSalaryComponentID,
        intLineOrder: dicLine.intLineOrder,
        strValueSource: dicLine.strValueSource,
        blnIsFlexiBasketLine: dicLine.blnIsFlexiBasketLine,
        strFlexiComponentRole: dicLine.strFlexiComponentRole,
        fltFixedAmount: formatOptionalNumber(dicLine.fltFixedAmount),
        fltPercentageValue: formatOptionalNumber(dicLine.fltPercentageValue),
        intBasisComponentID: dicLine.intBasisComponentID,
        strFormulaExpression: formatOptionalText(dicLine.strFormulaExpression),
        fltMinAmount: formatOptionalNumber(dicLine.fltMinAmount),
        fltMaxAmount: formatOptionalNumber(dicLine.fltMaxAmount),
        blnIsMandatory: dicLine.blnIsMandatory,
        blnIsActive: dicLine.blnIsActive
      }))
  };
}

function toClonePayload(dicValues: SalaryStructureCloneValues) {
  return {
    strStructureCode: dicValues.strStructureCode.trim(),
    strStructureName: dicValues.strStructureName.trim(),
    dtEffectiveFrom: dicValues.dtEffectiveFrom,
    dtEffectiveTo: dicValues.dtEffectiveTo || null,
    blnIsDefault: dicValues.blnIsDefault,
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strStructureName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strStructureName: dicText.strStructureName.trim(),
        strStructureDescription: formatOptionalText(dicText.strStructureDescription)
      }))
  };
}

export function createEmptyTextRow(): SalaryStructureTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strStructureName: "",
    strStructureDescription: ""
  };
}

export function createEmptyLineRow(intLineOrder: number): SalaryStructureLineFormValue {
  return {
    strRowID: createRowID(),
    intSalaryComponentID: "",
    intLineOrder,
    strValueSource: "Fixed",
    strComponentCode: "",
    strComponentName: "",
    blnIsFlexiBasketLine: false,
    strFlexiComponentRole: "normal",
    blnIncludedInCtc: true,
    strComponentCategory: "",
    fltFixedAmount: "",
    fltPercentageValue: "",
    intBasisComponentID: "",
    strFormulaExpression: "",
    fltMinAmount: "",
    fltMaxAmount: "",
    blnIsMandatory: true,
    blnIsActive: true
  };
}

export function createInitialSalaryStructureForm(): SalaryStructureFormValues {
  return {
    strStructureCode: "",
    strStructureName: "",
    strCurrencyCode: "INR",
    dtEffectiveFrom: new Date().toISOString().slice(0, 10),
    dtEffectiveTo: "",
    blnIsDefault: false,
    blnIsActive: true,
    lstTexts: [createEmptyTextRow()],
    lstComponents: [createEmptyLineRow(10)]
  };
}

export function createCloneForm(dicDetail: SalaryStructureDetailRecord): SalaryStructureCloneValues {
  return {
    strStructureCode: `${dicDetail.strStructureCode}-COPY`,
    strStructureName: `${dicDetail.strStructureName} Copy`,
    dtEffectiveFrom: new Date().toISOString().slice(0, 10),
    dtEffectiveTo: "",
    blnIsDefault: false,
    lstTexts: dicDetail.lstTexts.length > 0 ? dicDetail.lstTexts.map(mapTextToFormValue) : [createEmptyTextRow()]
  };
}

export function toSalaryStructureFormValues(dicRecord: SalaryStructureDetailRecord): SalaryStructureFormValues {
  return {
    strStructureCode: dicRecord.strStructureCode,
    strStructureName: dicRecord.strStructureName,
    strCurrencyCode: dicRecord.strCurrencyCode,
    dtEffectiveFrom: dicRecord.dtEffectiveFrom,
    dtEffectiveTo: dicRecord.dtEffectiveTo ?? "",
    blnIsDefault: dicRecord.blnIsDefault,
    blnIsActive: dicRecord.blnIsActive,
    lstTexts: dicRecord.lstTexts.length > 0 ? dicRecord.lstTexts.map(mapTextToFormValue) : [createEmptyTextRow()],
    lstComponents: dicRecord.lstComponents.length > 0 ? dicRecord.lstComponents.map(mapLineToFormValue) : [createEmptyLineRow(10)]
  };
}

export const salaryStructureService = {
  async getSalaryStructures(): Promise<SalaryStructureListRecord[]> {
    const objResult = await masterApiService.getSalaryStructures();
    return objResult.Data.map((dicRecord) => {
      const dicDetail = mapApiRecord(dicRecord);
      return {
        intID: dicDetail.intID,
        strStructureCode: dicDetail.strStructureCode,
        strStructureName: dicDetail.strStructureName,
        strCurrencyCode: dicDetail.strCurrencyCode,
        dtEffectiveFrom: dicDetail.dtEffectiveFrom,
        dtEffectiveTo: dicDetail.dtEffectiveTo,
        blnIsDefault: dicDetail.blnIsDefault,
        blnIsActive: dicDetail.blnIsActive,
        strScopeLabel: dicDetail.strScopeLabel,
        intComponentCount: dicDetail.intComponentCount
      };
    });
  },

  async getSalaryStructureById(intSalaryStructureID: number): Promise<SalaryStructureDetailRecord> {
    const objResult = await masterApiService.getSalaryStructure(intSalaryStructureID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<SalaryStructureFormOptions> {
    const objResult = await masterApiService.getSalaryStructureFormOptions(authHelpers.getLanguageID() ?? 1);
    return objResult.Data;
  },

  async createSalaryStructure(dicValues: SalaryStructureFormValues): Promise<SalaryStructureDetailRecord> {
    const objResult = await masterApiService.createSalaryStructure(toFormPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updateSalaryStructure(intSalaryStructureID: number, dicValues: SalaryStructureFormValues): Promise<SalaryStructureDetailRecord> {
    const objResult = await masterApiService.updateSalaryStructure(intSalaryStructureID, toFormPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async translateSalaryStructureText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateMasterText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },

  async cloneSalaryStructure(intSalaryStructureID: number, dicValues: SalaryStructureCloneValues): Promise<SalaryStructureDetailRecord> {
    const objResult = await masterApiService.cloneSalaryStructure(intSalaryStructureID, toClonePayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async setSalaryStructureStatus(intSalaryStructureID: number, blnIsActive: boolean): Promise<SalaryStructureDetailRecord> {
    const objResult = await masterApiService.setSalaryStructureStatus(intSalaryStructureID, blnIsActive);
    return mapApiRecord(objResult.Data);
  },

  async deleteSalaryStructure(intSalaryStructureID: number): Promise<void> {
    await masterApiService.deleteSalaryStructure(intSalaryStructureID);
  }
};
