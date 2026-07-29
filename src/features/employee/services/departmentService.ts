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

let intRowIDCounter = 0;

function createRowID() {
  intRowIDCounter += 1;
  return `department-row-${Date.now()}-${intRowIDCounter}`;
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
  const intDefaultLanguageID = Number(dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1);
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strDepartmentName.trim()
  );
  const strPrimaryDepartmentName =
    dicPrimaryText?.strDepartmentName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<number, { intLanguageID: number; strDepartmentName: string; strDepartmentDescription: string | null }> = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strDepartmentName = dicText.strDepartmentName.trim();
    if (!Number.isFinite(intLanguageID) || intLanguageID <= 0 || !strDepartmentName) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strDepartmentName,
      strDepartmentDescription: formatOptionalText(dicText.strDepartmentDescription),
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strDepartmentName: strPrimaryDepartmentName,
    strDepartmentDescription:
      dicTextsByLanguageID[intDefaultLanguageID]?.strDepartmentDescription ?? null,
  };
  return {
    strDepartmentCode: dicValues.code.trim().toUpperCase(),
    strDepartmentName: strPrimaryDepartmentName,
    strManagerName: "",
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
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
