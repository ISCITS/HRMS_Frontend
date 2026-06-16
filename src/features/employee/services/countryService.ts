import {
  masterApiService,
  type CountryApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type CountryTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strCountryName: string;
  strCountryCode: string;
};

export type CountryFormValues = {
  code: string;
  name: string;
  currencyCode: string;
  phoneCode: string;
  status: "Active" | "Inactive";
  lstTexts: CountryTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyCountryTextRow(): CountryTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strCountryName: "",
    strCountryCode: "",
  };
}

export function createInitialCountryForm(): CountryFormValues {
  return {
    code: "",
    name: "",
    currencyCode: "",
    phoneCode: "",
    status: "Active",
    lstTexts: [createEmptyCountryTextRow()],
  };
}

export function toCountryFormValues(
  dicCountry: CountryApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): CountryFormValues {
  const lstTexts = (dicCountry.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strCountryName: dicText.strCountryName,
    strCountryCode: dicCountry.strCountryCode,
  }));
  const intDefaultLanguageID = authHelpers.getLanguageID() ?? objOptions.lstLanguages[0]?.intID ?? "";
  const dicDefaultLanguageRow = lstTexts.find((dicText) => dicText.intLanguageID === intDefaultLanguageID);
  return {
    code: dicCountry.strCountryCode,
    name: dicDefaultLanguageRow?.strCountryName ?? dicCountry.strCountryName,
    currencyCode: dicCountry.strCurrencyCode,
    phoneCode: dicCountry.strPhoneCode ?? "",
    status: dicCountry.blnIsActive ? "Active" : "Inactive",
    lstTexts: lstTexts.length > 0 ? lstTexts : [{
      ...createEmptyCountryTextRow(),
      intLanguageID: intDefaultLanguageID,
      strLanguageName: objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intDefaultLanguageID)?.strLabel ?? "",
      strCountryName: dicCountry.strCountryName,
      strCountryCode: dicCountry.strCountryCode,
    }],
  };
}

function toPayload(dicValues: CountryFormValues) {
  const intDefaultLanguageID = Number(dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1);
  const dicPrimaryText = dicValues.lstTexts.find((dicText) => Number(dicText.intLanguageID) === intDefaultLanguageID && dicText.strCountryName.trim());
  const strPrimaryCountryName = dicPrimaryText?.strCountryName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<number, { intLanguageID: number; strCountryName: string }> = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strCountryName = dicText.strCountryName.trim();
    if (!Number.isFinite(intLanguageID) || intLanguageID <= 0 || !strCountryName) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = { intLanguageID, strCountryName };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strCountryName: strPrimaryCountryName,
  };
  return {
    strCountryCode: dicValues.code.trim().toUpperCase(),
    strCountryName: strPrimaryCountryName,
    strCurrencyCode: dicValues.currencyCode.trim().toUpperCase(),
    strPhoneCode: dicValues.phoneCode.trim() || null,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const countryService = {
  async getCountryFormOptions() {
    const objResult = await masterApiService.getCountryFormOptions();
    return objResult.Data;
  },

  async getCountry(intCountryID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getCountry(intCountryID, intLanguageID);
    return objResult.Data;
  },

  async createCountry(dicValues: CountryFormValues) {
    const objResult = await masterApiService.createCountry(toPayload(dicValues));
    return objResult.Data;
  },

  async updateCountry(intCountryID: number, dicValues: CountryFormValues) {
    const objResult = await masterApiService.updateCountry(intCountryID, toPayload(dicValues));
    return objResult.Data;
  },

  async translateCountryText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateCountryText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
