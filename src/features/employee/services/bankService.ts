import {
  masterApiService,
  type BankApiRecord,
  type SimpleMasterFormOptionsApiRecord,
} from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export type BankTextFormValue = {
  strRowID: string;
  intLanguageID: number | "";
  strLanguageName: string;
  strBankName: string;
  strBankCode: string;
};

export type BankFormValues = {
  code: string;
  name: string;
  status: "Active" | "Inactive";
  lstTexts: BankTextFormValue[];
};

let intRowIDCounter = 0;

function createRowID() {
  intRowIDCounter += 1;
  return `bank-row-${Date.now()}-${intRowIDCounter}`;
}

export function createEmptyBankTextRow(): BankTextFormValue {
  return {
    strRowID: createRowID(),
    intLanguageID: "",
    strLanguageName: "",
    strBankName: "",
    strBankCode: "",
  };
}

export function createInitialBankForm(): BankFormValues {
  return {
    code: "",
    name: "",
    status: "Active",
    lstTexts: [createEmptyBankTextRow()],
  };
}

export function toBankFormValues(
  dicBank: BankApiRecord,
  objOptions: SimpleMasterFormOptionsApiRecord,
): BankFormValues {
  const lstTexts = (dicBank.lstTexts ?? []).map((dicText) => ({
    strRowID: createRowID(),
    intLanguageID: dicText.intLanguageID,
    strLanguageName: dicText.strLanguageName,
    strBankName: dicText.strBankName,
    strBankCode: dicBank.strBankCode,
  }));
  const intDefaultLanguageID =
    authHelpers.getLanguageID() ??
    objOptions.lstLanguages[0]?.intID ??
    "";
  const dicDefaultLanguageRow = lstTexts.find(
    (dicText) => dicText.intLanguageID === intDefaultLanguageID,
  );
  return {
    code: dicBank.strBankCode,
    name: dicDefaultLanguageRow?.strBankName ?? dicBank.strBankName,
    status: dicBank.blnIsActive ? "Active" : "Inactive",
    lstTexts:
      lstTexts.length > 0
        ? lstTexts
        : [
            {
              ...createEmptyBankTextRow(),
              intLanguageID: intDefaultLanguageID,
              strLanguageName:
                objOptions.lstLanguages.find(
                  (dicLanguage) => dicLanguage.intID === intDefaultLanguageID,
                )?.strLabel ?? "",
              strBankName: dicBank.strBankName,
              strBankCode: dicBank.strBankCode,
            },
          ],
  };
}

function toPayload(dicValues: BankFormValues) {
  const intDefaultLanguageID = Number(
    dicValues.lstTexts[0]?.intLanguageID || authHelpers.getLanguageID() || 1,
  );
  const dicPrimaryText = dicValues.lstTexts.find(
    (dicText) =>
      Number(dicText.intLanguageID) === intDefaultLanguageID &&
      dicText.strBankName.trim(),
  );
  const strPrimaryBankName = dicPrimaryText?.strBankName.trim() || dicValues.name.trim();
  const dicTextsByLanguageID: Record<
    number,
    { intLanguageID: number; strBankName: string }
  > = {};
  for (const dicText of dicValues.lstTexts) {
    const intLanguageID = Number(dicText.intLanguageID);
    const strBankName = dicText.strBankName.trim();
    if (!Number.isFinite(intLanguageID) || intLanguageID <= 0 || !strBankName) {
      continue;
    }
    dicTextsByLanguageID[intLanguageID] = {
      intLanguageID,
      strBankName,
    };
  }
  dicTextsByLanguageID[intDefaultLanguageID] = {
    intLanguageID: intDefaultLanguageID,
    strBankName: strPrimaryBankName,
  };
  return {
    strBankCode: dicValues.code.trim().toUpperCase(),
    strBankName: strPrimaryBankName,
    blnIsActive: dicValues.status === "Active",
    intLanguageID: intDefaultLanguageID,
    lstTexts: Object.values(dicTextsByLanguageID),
  };
}

export const bankService = {
  async getBankFormOptions() {
    const objResult = await masterApiService.getBankFormOptions();
    return objResult.Data;
  },

  async getBank(intBankID: number, intLanguageID?: number | null) {
    const objResult = await masterApiService.getBank(intBankID, intLanguageID);
    return objResult.Data;
  },

  async createBank(dicValues: BankFormValues) {
    const objResult = await masterApiService.createBank(toPayload(dicValues));
    return objResult.Data;
  },

  async updateBank(intBankID: number, dicValues: BankFormValues) {
    const objResult = await masterApiService.updateBank(
      intBankID,
      toPayload(dicValues),
    );
    return objResult.Data;
  },

  async translateBankText(
    strText: string,
    intSourceLanguageID: number,
    intTargetLanguageID: number,
  ) {
    const objResult = await masterApiService.translateBankText({
      strText,
      intSourceLanguageID,
      intTargetLanguageID,
    });
    return objResult.Data.strTranslatedText;
  },
};
