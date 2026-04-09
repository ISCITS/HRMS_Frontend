import {
  masterApiService,
  type DepartmentApiRecord,
  type DepartmentFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type DepartmentTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strDepartmentName: string;
  strDepartmentCode: string;
  strDepartmentDescription: string;
};

export type DepartmentFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: DepartmentTextFormValue[];
};

function createRowID() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatOptionalText(strValue: string) {
  const strTrimmedValue = strValue.trim();
  return strTrimmedValue ? strTrimmedValue : null;
}

export function createEmptyDepartmentTextRow(): DepartmentTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strDepartmentName: "",
    strDepartmentCode: "",
    strDepartmentDescription: "",
  };
}

export function createInitialDepartmentForm(): DepartmentFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyDepartmentTextRow()],
  };
}

export function toDepartmentFormValues(
  dicDepartment: DepartmentApiRecord,
  objOptions: DepartmentFormOptionsApiRecord,
): DepartmentFormValues {
  const lstTexts = (dicDepartment.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strDepartmentName: dicText.strDepartmentName,
    strDepartmentCode: dicDepartment.strDepartmentCode,
    strDepartmentDescription: dicText.strDepartmentDescription ?? "",
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find((dicText) => dicText.intLanguageID === intDefaultLanguageID);
  return {
    code: dicDepartment.strDepartmentCode,
    name: dicDefaultLanguageRow?.strDepartmentName ?? dicDepartment.strDepartmentName,
    status: dicDepartment.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyDepartmentTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find((dicLanguage) => dicLanguage.intID === intDefaultLanguageID)?.strLabel ?? "",
              strDepartmentName: dicDepartment.strDepartmentName,
              strDepartmentCode: dicDepartment.strDepartmentCode,
              strDepartmentDescription: dicDepartment.strDepartmentDescription ?? "",
            },
          ],
  };
}

function toPayload(dicValues: DepartmentFormValues) {
  const intDefaultLanguageID = Number(dicValues.lstTexts[0]?.intLanguageID || 1);
  return {
    strDepartmentCode: dicValues.code.trim().toUpperCase(),
    strDepartmentName: dicValues.name.trim(),
    strManagerName: "",
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strDepartmentName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strDepartmentName: dicText.strDepartmentName.trim(),
        strDepartmentDescription: formatOptionalText(dicText.strDepartmentDescription),
      })),
  };
}

export const departmentService = {
  async getDepartmentFormOptions() {
    const objResult = await masterApiService.getDepartmentFormOptions();
    return objResult.Data;
  },

  async getDepartment(intDepartmentID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getDepartment(intDepartmentID, intLanguageID);
    return objResult.Data;
  },

  async createDepartment(dicValues: DepartmentFormValues) {
    const objResult = await masterApiService.createDepartment(toPayload(dicValues));
    return objResult.Data;
  },

  async updateDepartment(intDepartmentID: number, dicValues: DepartmentFormValues) {
    const objResult = await masterApiService.updateDepartment(intDepartmentID, toPayload(dicValues));
    return objResult.Data;
  },

  async translateDepartmentText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number) {
    const objResult = await masterApiService.translateDepartmentText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
