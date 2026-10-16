import {
  masterApiService,
  type EmployeeCategoryApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type EmployeeCategoryTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strEmployeeCategoryName: string;
  strEmployeeCategoryCode: string;
};

export type EmployeeCategoryFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: EmployeeCategoryTextFormValue[];
};

let intRowIDCounter = 0;

function createRowID() {
  intRowIDCounter += 1;
  return `employeeCategory-row-${Date.now()}-${intRowIDCounter}`;
}

export function createEmptyEmployeeCategoryTextRow(): EmployeeCategoryTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strEmployeeCategoryName: "",
    strEmployeeCategoryCode: "",
  };
}

export function createInitialEmployeeCategoryForm(): EmployeeCategoryFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyEmployeeCategoryTextRow()],
  };
}

export function toEmployeeCategoryFormValues(
  dicEmployeeCategory: EmployeeCategoryApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): EmployeeCategoryFormValues {
  const lstTexts = (dicEmployeeCategory.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strEmployeeCategoryName: dicText.strEmployeeCategoryName,
    strEmployeeCategoryCode: dicEmployeeCategory.strEmployeeCategoryCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicEmployeeCategory.strEmployeeCategoryCode,
    name:
      dicDefaultLanguageRow?.strEmployeeCategoryName ?? dicEmployeeCategory.strEmployeeCategoryName,
    status: dicEmployeeCategory.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyEmployeeCategoryTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strEmployeeCategoryName: dicEmployeeCategory.strEmployeeCategoryName,
              strEmployeeCategoryCode: dicEmployeeCategory.strEmployeeCategoryCode,
            },
          ],
  };
}

function toPayload(dicValues: EmployeeCategoryFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strEmployeeCategoryName.trim(),
  );
  const strPrimaryEmployeeCategoryName =
    dicPrimaryText?.strEmployeeCategoryName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strEmployeeCategoryName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strEmployeeCategoryName = dicText.strEmployeeCategoryName.trim();
    if (
      !Number.isFinite(intLanguageID) ||
      intLanguageID <= 0 ||
      !strEmployeeCategoryName
    ) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strEmployeeCategoryName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strEmployeeCategoryName: strPrimaryEmployeeCategoryName,
  };
  return {
    strEmployeeCategoryCode: dicValues.code.trim().toUpperCase(),
    strEmployeeCategoryName: strPrimaryEmployeeCategoryName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const employeeCategoryService = {
  async getEmployeeCategoryFormOptions() {
    const objResult = await masterApiService.getEmployeeCategoryFormOptions();
    return objResult.Data;
  },

  async getEmployeeCategory(intEmployeeCategoryID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getEmployeeCategory(
      intEmployeeCategoryID,
      intLanguageID,
    );
    return objResult.Data;
  },

  async createEmployeeCategory(dicValues: EmployeeCategoryFormValues) {
    const objResult = await masterApiService.createEmployeeCategory(toPayload(dicValues));
    return objResult.Data;
  },

  async updateEmployeeCategory(
    intEmployeeCategoryID: number,
    dicValues: EmployeeCategoryFormValues,
  ) {
    const objResult = await masterApiService.updateEmployeeCategory(
      intEmployeeCategoryID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateEmployeeCategoryText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateEmployeeCategoryText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
