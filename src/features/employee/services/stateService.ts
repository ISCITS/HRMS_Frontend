import {
  masterApiService,
  type StateApiRecord,
  type StateFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type StateTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strStateName: string;
  strStateCode: string;
};

export type StateFormValues = {
  countryId: number | "";
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: StateTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyStateTextRow(): StateTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strStateName: "",
    strStateCode: "",
  };
}

export function createInitialStateForm(): StateFormValues {
  return {
    countryId: "",
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyStateTextRow()],
  };
}

export function toStateFormValues(
  dicState: StateApiRecord,
  objOptions: StateFormOptionsApiRecord,
): StateFormValues {
  const lstTexts = (dicState.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strStateName: dicText.strStateName,
    strStateCode: dicState.strStateCode,
  }));
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID ?? "";
  const dicDefaultLanguageRow = lstTexts.find((dicText) => dicText.intLanguageID === intDefaultLanguageID);
  return {
    countryId: dicState.intCountryID,
    code: dicState.strStateCode,
    name: dicDefaultLanguageRow?.strStateName ?? dicState.strStateName,
    status: dicState.blnIsActive ? "Active" : "Inactive",
    lstTexts: lstTexts.length > 0 ? lstTexts : [{
      ...createEmptyStateTextRow(),
      intLanguageID: intDefaultLanguageID,
      strLanguageName: objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intDefaultLanguageID)?.strLabel ?? "",
      strStateName: dicState.strStateName,
      strStateCode: dicState.strStateCode,
    }],
  };
}

function toPayload(dicValues: StateFormValues) {
  const intDefaultLanguageID = Number(dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1);
  const dicPrimaryText = dicValues.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID && dicText.strStateName.trim());
  const strPrimaryStateName = dicPrimaryText?.strStateName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<number, { intLanguageID: number; strStateName: string }> = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strStateName = dicText.strStateName.trim();
    if (!Number.isFinite(intLanguageID) || intLanguageID <= 0 || !strStateName) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = { intLanguageID, strStateName };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strStateName: strPrimaryStateName,
  };
  return {
    intCountryID: Number(dicValues.countryId),
    strStateCode: dicValues.code.trim().toUpperCase(),
    strStateName: strPrimaryStateName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const stateService = {
  async getStateFormOptions(intLanguageID?: number | null) {
    const objResult = await masterApiService.getStateFormOptions(intLanguageID);
    return objResult.Data;
  },

  async getState(intStateID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getState(intStateID, intLanguageID);
    return objResult.Data;
  },

  async createState(dicValues: StateFormValues) {
    const objResult = await masterApiService.createState(toPayload(dicValues));
    return objResult.Data;
  },

  async updateState(intStateID: number, dicValues: StateFormValues) {
    const objResult = await masterApiService.updateState(intStateID, toPayload(dicValues));
    return objResult.Data;
  },

  async translateStateText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateStateText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
