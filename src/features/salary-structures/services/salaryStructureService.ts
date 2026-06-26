import {
  masterApiService,
  type FlexiComponentEligibilityApiRecord,
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
  SalaryStructureFlexiMappingFormValue,
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
  const strTrimmedValue = strValue.trim().replace(/,/g, "");
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

function normalizeSelectToken(strValue: string) {
  return strValue.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isFlexiBucketToken(strValue: string) {
  const strToken = normalizeSelectToken(strValue);
  return strToken.includes("flexipay") || strToken.includes("flexibucket") || strToken.includes("flexibasket");
}

export function normalizeSalaryStructureFlexiRole(strValue?: string | null) {
  const strRole = (strValue ?? "").trim().toLowerCase();
  return strRole && strRole !== "none" ? strRole : "normal";
}

function isFlexiBasketLinePayload(dicLine: Pick<SalaryStructureLineFormValue, "blnIsFlexiBasketLine" | "strFlexiComponentRole" | "strComponentCode" | "strComponentName">) {
  const strRole = normalizeSelectToken(dicLine.strFlexiComponentRole);
  return Boolean(
    dicLine.blnIsFlexiBasketLine
    || strRole === "basket"
    || isFlexiBucketToken(dicLine.strFlexiComponentRole)
    || isFlexiBucketToken(dicLine.strComponentCode)
    || isFlexiBucketToken(dicLine.strComponentName)
  );
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

function mapFlexiMappingToFormValue(dicMapping: {
  intFlexiComponentEligibilityID?: number | null;
  intFlexiComponentID: number;
  strFlexiComponentCode?: string | null;
  strFlexiComponentName?: string | null;
  fltDefaultAmount?: number | null;
  fltMaxAmount?: number | null;
  blnIsActive?: boolean;
}): SalaryStructureFlexiMappingFormValue {
  return {
    strRowID: createRowID(),
    intFlexiComponentEligibilityID: dicMapping.intFlexiComponentEligibilityID ?? null,
    intFlexiComponentID: dicMapping.intFlexiComponentID,
    strFlexiComponentCode: dicMapping.strFlexiComponentCode ?? "",
    strFlexiComponentName: dicMapping.strFlexiComponentName ?? "",
    fltDefaultAmount: dicMapping.fltDefaultAmount?.toString() ?? "",
    fltMaxAmount: dicMapping.fltMaxAmount?.toString() ?? "",
    blnIsActive: Boolean(dicMapping.blnIsActive ?? true)
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
    strFlexiComponentRole: normalizeSalaryStructureFlexiRole(dicLine.strFlexiComponentRole),
    blnIncludedInCtc: Boolean(dicLine.blnIncludedInCtc ?? true),
    strComponentCategory: dicLine.strComponentCategory ?? "",
    fltFixedAmount: dicLine.fltFixedAmount?.toString() ?? "",
    fltPercentageValue: dicLine.fltPercentageValue?.toString() ?? "",
    intBasisComponentID: dicLine.intBasisComponentID ?? "",
    strFormulaExpression: dicLine.strFormulaExpression ?? "",
    fltMinAmount: dicLine.fltMinAmount?.toString() ?? "",
    fltMaxAmount: dicLine.fltMaxAmount?.toString() ?? "",
    blnIsMandatory: dicLine.blnIsMandatory,
    blnIsActive: dicLine.blnIsActive,
    lstFlexiMappings: (dicLine.lstFlexiMappings ?? []).map(mapFlexiMappingToFormValue)
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
      strFlexiComponentRole: normalizeSalaryStructureFlexiRole(dicLine.strFlexiComponentRole),
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
      blnIsActive: dicLine.blnIsActive,
      lstFlexiMappings: (dicLine.lstFlexiMappings ?? []).map((dicMapping) => ({
        intFlexiComponentID: dicMapping.intFlexiComponentID,
        intFlexiComponentEligibilityID: dicMapping.intFlexiComponentEligibilityID ?? null,
        strFlexiComponentCode: dicMapping.strFlexiComponentCode ?? null,
        strFlexiComponentName: dicMapping.strFlexiComponentName ?? null,
        fltDefaultAmount: dicMapping.fltDefaultAmount ?? null,
        fltMaxAmount: dicMapping.fltMaxAmount ?? null,
        blnIsActive: Boolean(dicMapping.blnIsActive ?? true)
      }))
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
        blnIsFlexiBasketLine: isFlexiBasketLinePayload(dicLine),
        strFlexiComponentRole: isFlexiBasketLinePayload(dicLine) ? "basket" : normalizeSalaryStructureFlexiRole(dicLine.strFlexiComponentRole),
        fltFixedAmount: dicLine.strValueSource === "Fixed" ? formatOptionalNumber(dicLine.fltFixedAmount) : null,
        fltPercentageValue: dicLine.strValueSource === "Percentage" ? formatOptionalNumber(dicLine.fltPercentageValue) : null,
        intBasisComponentID: dicLine.strValueSource === "Percentage" ? dicLine.intBasisComponentID : null,
        strFormulaExpression: dicLine.strValueSource === "Formula" ? formatOptionalText(dicLine.strFormulaExpression) : null,
        fltMinAmount: formatOptionalNumber(dicLine.fltMinAmount),
        fltMaxAmount: formatOptionalNumber(dicLine.fltMaxAmount),
        blnIsMandatory: dicLine.blnIsMandatory,
        blnIsActive: dicLine.blnIsActive,
        lstFlexiMappings: dicLine.lstFlexiMappings
          .map((dicMapping) => ({
            ...dicMapping,
            intFlexiComponentID: formatOptionalInteger(dicMapping.intFlexiComponentID)
          }))
          .filter((dicMapping) => dicMapping.intFlexiComponentID !== null)
          .map((dicMapping) => ({
            intFlexiComponentID: dicMapping.intFlexiComponentID,
            fltDefaultAmount: formatOptionalNumber(dicMapping.fltDefaultAmount),
            fltMaxAmount: formatOptionalNumber(dicMapping.fltMaxAmount),
            blnIsActive: dicMapping.blnIsActive
          }))
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
    blnIsActive: true,
    lstFlexiMappings: []
  };
}

export function createEmptyFlexiMappingRow(): SalaryStructureFlexiMappingFormValue {
  return {
    strRowID: createRowID(),
    intFlexiComponentEligibilityID: null,
    intFlexiComponentID: "",
    strFlexiComponentCode: "",
    strFlexiComponentName: "",
    fltDefaultAmount: "",
    fltMaxAmount: "",
    blnIsActive: true
  };
}

function getFlexiEligibilityComponentID(dicRecord: FlexiComponentEligibilityApiRecord) {
  return Number(dicRecord.intFlexiComponentID ?? dicRecord.intSalaryComponentID ?? 0);
}

function getFlexiEligibilityRecordID(dicRecord: FlexiComponentEligibilityApiRecord) {
  return Number(dicRecord.intFlexiComponentEligibilityID ?? dicRecord.intID ?? 0);
}

function isFlexiEligibilityActive(dicRecord: FlexiComponentEligibilityApiRecord) {
  return Boolean(dicRecord.blnIsEligible ?? dicRecord.blnIsActive ?? false);
}

function getFlexiEligibilityCode(dicRecord: FlexiComponentEligibilityApiRecord) {
  return dicRecord.strFlexiComponentCode ?? dicRecord.strComponentCode ?? "";
}

function getFlexiEligibilityName(dicRecord: FlexiComponentEligibilityApiRecord) {
  return dicRecord.strFlexiComponentName ?? dicRecord.strComponentName ?? "";
}

function mergeFlexiEligibilityIntoOptions(
  dicOptions: SalaryStructureFormOptions,
  lstEligibilityRecords: FlexiComponentEligibilityApiRecord[]
): SalaryStructureFormOptions {
  const dicEligibilityByComponentID = new Map(
    lstEligibilityRecords
      .map((dicRecord) => [getFlexiEligibilityComponentID(dicRecord), dicRecord] as const)
      .filter(([intComponentID]) => intComponentID > 0)
  );
  const setExistingComponentIDs = new Set(dicOptions.lstSalaryComponents.map((dicComponent) => dicComponent.intID));
  const lstEligibilityOnlyComponents = lstEligibilityRecords
    .filter((dicRecord) => {
      const intComponentID = getFlexiEligibilityComponentID(dicRecord);
      return intComponentID > 0 && !setExistingComponentIDs.has(intComponentID);
    })
    .map((dicRecord) => ({
      intID: getFlexiEligibilityComponentID(dicRecord),
      strCode: getFlexiEligibilityCode(dicRecord),
      strLabel: getFlexiEligibilityName(dicRecord) || `Flexi Component #${getFlexiEligibilityComponentID(dicRecord)}`,
      intFlexiComponentEligibilityID: getFlexiEligibilityRecordID(dicRecord) || null,
      blnIsFlexiComponentEligible: isFlexiEligibilityActive(dicRecord),
      blnIsActive: true,
    }));
  return {
    ...dicOptions,
    lstSalaryComponents: [
      ...dicOptions.lstSalaryComponents.map((dicComponent) => {
        const dicEligibility = dicEligibilityByComponentID.get(dicComponent.intID);
        if (!dicEligibility) {
          return dicComponent;
        }
        return {
          ...dicComponent,
          intFlexiComponentEligibilityID: getFlexiEligibilityRecordID(dicEligibility) || null,
          blnIsFlexiComponentEligible: isFlexiEligibilityActive(dicEligibility),
        };
      }),
      ...lstEligibilityOnlyComponents,
    ],
  };
}

async function getFlexiComponentEligibilityWithTimeout(intTimeoutMs = 1500) {
  let intTimeoutID: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      masterApiService.getFlexiComponentEligibility(),
      new Promise<null>((resolve) => {
        intTimeoutID = setTimeout(() => resolve(null), intTimeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (intTimeoutID) {
      clearTimeout(intTimeoutID);
    }
  }
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
    const objOptionsResult = await masterApiService.getSalaryStructureFormOptions(authHelpers.getLanguageID() ?? 1);
    const objEligibilityResult = await getFlexiComponentEligibilityWithTimeout();
    return mergeFlexiEligibilityIntoOptions(objOptionsResult.Data, objEligibilityResult?.Data ?? []);
  },

  async saveFlexiComponentEligibility(dicValues: SalaryStructureFormValues): Promise<void> {
    const lstEligibilityUpdates = dicValues.lstComponents.flatMap((dicLine) =>
      dicLine.lstFlexiMappings
        .filter((dicMapping) => dicMapping.intFlexiComponentID !== "")
        .map((dicMapping) => ({
          intID: dicMapping.intFlexiComponentEligibilityID,
          intFlexiComponentEligibilityID: dicMapping.intFlexiComponentEligibilityID,
          intFlexiComponentID: Number(dicMapping.intFlexiComponentID),
          intSalaryComponentID: Number(dicMapping.intFlexiComponentID),
          blnIsEligible: dicMapping.blnIsActive,
          blnIsActive: dicMapping.blnIsActive,
        }))
    );
    if (lstEligibilityUpdates.length === 0) {
      return;
    }
    await masterApiService.saveFlexiComponentEligibility({ lstFlexiComponentEligibility: lstEligibilityUpdates });
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
