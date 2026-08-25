import {
  masterApiService,
  type PayrollGroupApiRecord
} from "@/services/master/MasterApiService";
import type {
  PayrollGroupDetailRecord,
  PayrollGroupFormOptions,
  PayrollGroupFormValues,
  PayrollGroupListRecord
} from "@/features/payroll-groups/types";

function mapApiRecord(dicRecord: PayrollGroupApiRecord): PayrollGroupDetailRecord {
  return {
    intID: dicRecord.intID,
    intTenantID: dicRecord.intTenantID,
    intCompanyID: dicRecord.intCompanyID,
    strPayrollGroupName: dicRecord.strPayrollGroupName,
    strDescription: dicRecord.strDescription ?? null,
    intDisplayOrder: dicRecord.intDisplayOrder ?? 10,
    blnIsActive: dicRecord.blnIsActive,
    lstTexts: (dicRecord.lstTexts ?? []).map((dicText) => ({
      intLanguageID: dicText.intLanguageID,
      strLanguageName: dicText.strLanguageName,
      strPayrollGroupName: dicText.strPayrollGroupName
    })),
    dicUsage: dicRecord.dicUsage
      ? {
          intPayrollCycleCount: dicRecord.dicUsage.intPayrollCycleCount,
          intEmployeeCount: dicRecord.dicUsage.intEmployeeCount,
          blnInUse: dicRecord.dicUsage.blnInUse
        }
      : null
  };
}

function toPayload(dicValues: PayrollGroupFormValues) {
  return {
    strPayrollGroupName: dicValues.strPayrollGroupName.trim(),
    strDescription: dicValues.strDescription.trim() || null,
    blnIsActive: dicValues.blnIsActive,
    intLanguageID: dicValues.intLanguageID,
    lstTexts: dicValues.lstTexts
      .filter((dicText) => dicText.intLanguageID !== "" && dicText.strPayrollGroupName.trim())
      .map((dicText) => ({
        intLanguageID: Number(dicText.intLanguageID),
        strPayrollGroupName: dicText.strPayrollGroupName.trim()
      }))
  };
}

export function createInitialPayrollGroupForm(): PayrollGroupFormValues {
  return {
    strPayrollGroupName: "",
    strDescription: "",
    blnIsActive: true,
    intLanguageID: 1,
    lstTexts: []
  };
}

export function toPayrollGroupFormValues(
  dicRecord: PayrollGroupDetailRecord
): PayrollGroupFormValues {
  return {
    strPayrollGroupName: dicRecord.strPayrollGroupName,
    strDescription: dicRecord.strDescription ?? "",
    blnIsActive: dicRecord.blnIsActive,
    intLanguageID: 1,
    lstTexts: dicRecord.lstTexts.map((dicText) => ({
      intLanguageID: dicText.intLanguageID,
      strPayrollGroupName: dicText.strPayrollGroupName
    }))
  };
}

export const payrollGroupService = {
  async getPayrollGroups(): Promise<PayrollGroupListRecord[]> {
    const objResult = await masterApiService.getPayrollGroups();
    return objResult.Data.map(mapApiRecord);
  },

  async getPayrollGroupById(intPayrollGroupID: number): Promise<PayrollGroupDetailRecord> {
    const objResult = await masterApiService.getPayrollGroup(intPayrollGroupID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<PayrollGroupFormOptions> {
    const objResult = await masterApiService.getPayrollGroupFormOptions();
    return objResult.Data;
  },

  async createPayrollGroup(dicValues: PayrollGroupFormValues): Promise<PayrollGroupDetailRecord> {
    const objResult = await masterApiService.createPayrollGroup(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updatePayrollGroup(
    intPayrollGroupID: number,
    dicValues: PayrollGroupFormValues
  ): Promise<PayrollGroupDetailRecord> {
    const objResult = await masterApiService.updatePayrollGroup(
      intPayrollGroupID,
      toPayload(dicValues)
    );
    return mapApiRecord(objResult.Data);
  },

  async setPayrollGroupStatus(
    intPayrollGroupID: number,
    blnIsActive: boolean
  ): Promise<PayrollGroupDetailRecord> {
    const objResult = await masterApiService.setPayrollGroupStatus(
      intPayrollGroupID,
      blnIsActive
    );
    return mapApiRecord(objResult.Data);
  }
};
