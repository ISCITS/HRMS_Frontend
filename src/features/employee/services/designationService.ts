import {
  masterApiService,
  type DesignationApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type DesignationTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strDesignationName: string;
  strDesignationCode: string;
};

export type DesignationFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: DesignationTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyDesignationTextRow(): DesignationTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strDesignationName: "",
    strDesignationCode: "",
  };
}

export function createInitialDesignationForm(): DesignationFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyDesignationTextRow()],
  };
}

export function toDesignationFormValues(
  dicDesignation: DesignationApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): DesignationFormValues {
  const lstTexts = (dicDesignation.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strDesignationName: dicText.strDesignationName,
    strDesignationCode: dicDesignation.strDesignationCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicDesignation.strDesignationCode,
    name:
      dicDefaultLanguageRow?.strDesignationName ?? dicDesignation.strDesignationName,
    status: dicDesignation.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyDesignationTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strDesignationName: dicDesignation.strDesignationName,
              strDesignationCode: dicDesignation.strDesignationCode,
            },
          ],
  };
}

function toPayload(dicValues: DesignationFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strDesignationName.trim(),
  );
  const strPrimaryDesignationName =
    dicPrimaryText?.strDesignationName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strDesignationName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strDesignationName = dicText.strDesignationName.trim();
    if (
      !Number.isFinite(intLanguageID) ||
      intLanguageID <= 0 ||
      !strDesignationName
    ) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strDesignationName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strDesignationName: strPrimaryDesignationName,
  };
  return {
    strDesignationCode: dicValues.code.trim().toUpperCase(),
    strDesignationName: strPrimaryDesignationName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const designationService = {
  async getDesignationFormOptions() {
    const objResult = await masterApiService.getDesignationFormOptions();
    return objResult.Data;
  },

  async getDesignation(intDesignationID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getDesignation(
      intDesignationID,
      intLanguageID,
    );
    return objResult.Data;
  },

  async createDesignation(dicValues: DesignationFormValues) {
    const objResult = await masterApiService.createDesignation(toPayload(dicValues));
    return objResult.Data;
  },

  async updateDesignation(
    intDesignationID: number,
    dicValues: DesignationFormValues,
  ) {
    const objResult = await masterApiService.updateDesignation(
      intDesignationID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateDesignationText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateDesignationText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
