import {
  masterApiService,
  type CostCenterApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type CostCenterTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strCostCenterName: string;
  strCostCenterCode: string;
};

export type CostCenterFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: CostCenterTextFormValue[];
};

let intRowIDCounter = 0;

function createRowID() {
  intRowIDCounter += 1;
  return `cost-center-row-${Date.now()}-${intRowIDCounter}`;
}

export function createEmptyCostCenterTextRow(): CostCenterTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strCostCenterName: "",
    strCostCenterCode: "",
  };
}

export function createInitialCostCenterForm(): CostCenterFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyCostCenterTextRow()],
  };
}

export function toCostCenterFormValues(
  dicCostCenter: CostCenterApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): CostCenterFormValues {
  const lstTexts = (dicCostCenter.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strCostCenterName: dicText.strCostCenterName,
    strCostCenterCode: dicCostCenter.strCostCenterCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicCostCenter.strCostCenterCode,
    name:
      dicDefaultLanguageRow?.strCostCenterName ?? dicCostCenter.strCostCenterName,
    status: dicCostCenter.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyCostCenterTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strCostCenterName: dicCostCenter.strCostCenterName,
              strCostCenterCode: dicCostCenter.strCostCenterCode,
            },
          ],
  };
}

function toPayload(dicValues: CostCenterFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strCostCenterName.trim(),
  );
  const strPrimaryCostCenterName =
    dicPrimaryText?.strCostCenterName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strCostCenterName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strCostCenterName = dicText.strCostCenterName.trim();
    if (
      !Number.isFinite(intLanguageID) ||
      intLanguageID <= 0 ||
      !strCostCenterName
    ) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strCostCenterName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strCostCenterName: strPrimaryCostCenterName,
  };
  return {
    strCostCenterCode: dicValues.code.trim().toUpperCase(),
    strCostCenterName: strPrimaryCostCenterName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const costCenterService = {
  async getCostCenterFormOptions() {
    const objResult = await masterApiService.getCostCenterFormOptions();
    return objResult.Data;
  },

  async getCostCenter(intCostCenterID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getCostCenter(
      intCostCenterID,
      intLanguageID,
    );
    return objResult.Data;
  },

  async createCostCenter(dicValues: CostCenterFormValues) {
    const objResult = await masterApiService.createCostCenter(toPayload(dicValues));
    return objResult.Data;
  },

  async updateCostCenter(intCostCenterID: number, dicValues: CostCenterFormValues) {
    const objResult = await masterApiService.updateCostCenter(
      intCostCenterID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateCostCenterText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateCostCenterText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
