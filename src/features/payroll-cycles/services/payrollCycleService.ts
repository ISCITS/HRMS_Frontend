import {
  masterApiService,
  type PayrollCycleApiRecord
} from "@/services/master/MasterApiService";
import type {
  PayrollCycleDetailRecord,
  PayrollCycleFormOptions,
  PayrollCycleFormValues,
  PayrollCycleListRecord
} from "@/features/payroll-cycles/types";

function mapApiRecord(dicRecord: PayrollCycleApiRecord): PayrollCycleDetailRecord {
  return {
    intID: dicRecord.intID,
    intCompanyID: dicRecord.intCompanyID,
    intPayrollGroupID: dicRecord.intPayrollGroupID,
    strPayrollGroupCode: dicRecord.strPayrollGroupCode ?? null,
    strPayrollGroupName: dicRecord.strPayrollGroupName ?? null,
    strCycleCode: dicRecord.strCycleCode,
    strCycleName: dicRecord.strCycleName,
    strPeriodType: dicRecord.strPeriodType,
    intCutoffDay: dicRecord.intCutoffDay ?? null,
    blnIsActive: dicRecord.blnIsActive
  };
}

function toPayload(dicValues: PayrollCycleFormValues) {
  const strTrimmedCutoffDay = dicValues.intCutoffDay.trim();
  return {
    intPayrollGroupID: Number(dicValues.intPayrollGroupID),
    strCycleCode: dicValues.strCycleCode.trim(),
    strCycleName: dicValues.strCycleName.trim(),
    strPeriodType: dicValues.strPeriodType.trim(),
    intCutoffDay: strTrimmedCutoffDay ? Number(strTrimmedCutoffDay) : null,
    blnIsActive: dicValues.blnIsActive
  };
}

export function createInitialPayrollCycleForm(): PayrollCycleFormValues {
  return {
    intPayrollGroupID: "",
    strCycleCode: "",
    strCycleName: "",
    strPeriodType: "Monthly",
    intCutoffDay: "",
    blnIsActive: true
  };
}

export function toPayrollCycleFormValues(
  dicRecord: PayrollCycleDetailRecord
): PayrollCycleFormValues {
  return {
    intPayrollGroupID: dicRecord.intPayrollGroupID,
    strCycleCode: dicRecord.strCycleCode,
    strCycleName: dicRecord.strCycleName,
    strPeriodType: dicRecord.strPeriodType,
    intCutoffDay: dicRecord.intCutoffDay?.toString() ?? "",
    blnIsActive: dicRecord.blnIsActive
  };
}

export const payrollCycleService = {
  async getPayrollCycles(): Promise<PayrollCycleListRecord[]> {
    const objResult = await masterApiService.getPayrollCycles();
    return objResult.Data.map(mapApiRecord);
  },

  async getPayrollCycleById(intPayrollCycleID: number): Promise<PayrollCycleDetailRecord> {
    const objResult = await masterApiService.getPayrollCycle(intPayrollCycleID);
    return mapApiRecord(objResult.Data);
  },

  async getFormOptions(): Promise<PayrollCycleFormOptions> {
    const objResult = await masterApiService.getPayrollCycleFormOptions();
    return objResult.Data;
  },

  async createPayrollCycle(dicValues: PayrollCycleFormValues): Promise<PayrollCycleDetailRecord> {
    const objResult = await masterApiService.createPayrollCycle(toPayload(dicValues));
    return mapApiRecord(objResult.Data);
  },

  async updatePayrollCycle(
    intPayrollCycleID: number,
    dicValues: PayrollCycleFormValues
  ): Promise<PayrollCycleDetailRecord> {
    const objResult = await masterApiService.updatePayrollCycle(
      intPayrollCycleID,
      toPayload(dicValues)
    );
    return mapApiRecord(objResult.Data);
  },

  async setPayrollCycleStatus(
    intPayrollCycleID: number,
    blnIsActive: boolean
  ): Promise<PayrollCycleDetailRecord> {
    const objResult = await masterApiService.setPayrollCycleStatus(
      intPayrollCycleID,
      blnIsActive
    );
    return mapApiRecord(objResult.Data);
  }
};
