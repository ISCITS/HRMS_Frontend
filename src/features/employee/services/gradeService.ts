import {
  masterApiService,
  type GradeApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type GradeTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strGradeName: string;
  strGradeCode: string;
};

export type GradeFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: GradeTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyGradeTextRow(): GradeTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strGradeName: "",
    strGradeCode: "",
  };
}

export function createInitialGradeForm(): GradeFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyGradeTextRow()],
  };
}

export function toGradeFormValues(
  dicGrade: GradeApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): GradeFormValues {
  const lstTexts = (dicGrade.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strGradeName: dicText.strGradeName,
    strGradeCode: dicGrade.strGradeCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicGrade.strGradeCode,
    name: dicDefaultLanguageRow?.strGradeName ?? dicGrade.strGradeName,
    status: dicGrade.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyGradeTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strGradeName: dicGrade.strGradeName,
              strGradeCode: dicGrade.strGradeCode,
            },
          ],
  };
}

function toPayload(dicValues: GradeFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strGradeName.trim(),
  );
  const strPrimaryGradeName = dicPrimaryText?.strGradeName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strGradeName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strGradeName = dicText.strGradeName.trim();
    if (!Number.isFinite(intLanguageID) || intLanguageID <= 0 || !strGradeName) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strGradeName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strGradeName: strPrimaryGradeName,
  };
  return {
    strGradeCode: dicValues.code.trim().toUpperCase(),
    strGradeName: strPrimaryGradeName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const gradeService = {
  async getGradeFormOptions() {
    const objResult = await masterApiService.getGradeFormOptions();
    return objResult.Data;
  },

  async getGrade(intGradeID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getGrade(intGradeID, intLanguageID);
    return objResult.Data;
  },

  async createGrade(dicValues: GradeFormValues) {
    const objResult = await masterApiService.createGrade(toPayload(dicValues));
    return objResult.Data;
  },

  async updateGrade(intGradeID: number, dicValues: GradeFormValues) {
    const objResult = await masterApiService.updateGrade(
      intGradeID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateGradeText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateGradeText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
