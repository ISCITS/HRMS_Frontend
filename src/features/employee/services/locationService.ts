import {
  masterApiService,
  type LocationApiRecord,
  type LocationFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type LocationTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strLocationName: string;
  strLocationCode: string;
};

export type LocationFormValues = {
  code: string;
  name: string;
  intStateID: number | "";
  strCityName: string;
  status: "Active" | "Inactive";
  lstTexts: LocationTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyLocationTextRow(): LocationTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strLocationName: "",
    strLocationCode: "",
  };
}

export function createInitialLocationForm(): LocationFormValues {
  return {
    code: "",
    name: "",
    intStateID: "",
    strCityName: "",
    status: "Active",
    lstTexts: [createEmptyLocationTextRow()],
  };
}

export function toLocationFormValues(
  dicLocation: LocationApiRecord,
  objOptions: LocationFormOptionsApiRecord,
): LocationFormValues {
  const lstTexts = (dicLocation.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strLocationName: dicText.strLocationName,
    strLocationCode: dicLocation.strLocationCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicLocation.strLocationCode,
    name: dicDefaultLanguageRow?.strLocationName ?? dicLocation.strLocationName,
    intStateID: dicLocation.intStateID ?? "",
    strCityName: dicLocation.strCityName ?? "",
    status: dicLocation.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyLocationTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strLocationName: dicLocation.strLocationName,
              strLocationCode: dicLocation.strLocationCode,
            },
          ],
  };
}

function toPayload(dicValues: LocationFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strLocationName.trim(),
  );
  const strPrimaryLocationName =
    dicPrimaryText?.strLocationName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strLocationName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strLocationName = dicText.strLocationName.trim();
    if (
      !Number.isFinite(intLanguageID) ||
      intLanguageID <= 0 ||
      !strLocationName
    ) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strLocationName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strLocationName: strPrimaryLocationName,
  };
  return {
    strLocationCode: dicValues.code.trim().toUpperCase(),
    strLocationName: strPrimaryLocationName,
    intStateID: dicValues.intStateID === "" ? null : Number(dicValues.intStateID),
    strCityName: dicValues.strCityName.trim() || null,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const locationService = {
  async getLocationFormOptions() {
    const objResult = await masterApiService.getLocationFormOptions();
    return objResult.Data;
  },

  async getLocation(intLocationID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getLocation(
      intLocationID,
      intLanguageID,
    );
    return objResult.Data;
  },

  async createLocation(dicValues: LocationFormValues) {
    const objResult = await masterApiService.createLocation(toPayload(dicValues));
    return objResult.Data;
  },

  async updateLocation(intLocationID: number, dicValues: LocationFormValues) {
    const objResult = await masterApiService.updateLocation(
      intLocationID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateLocationText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateLocationText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
