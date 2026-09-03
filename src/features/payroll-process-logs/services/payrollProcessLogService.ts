import {
  masterApiService,
  type PayrollProcessLogApiRecord
} from "@/services/master/MasterApiService";
import type {
  PayrollProcessLogFilters,
  PayrollProcessLogFormOptions,
  PayrollProcessLogListRecord
} from "@/features/payroll-process-logs/types";

function mapApiRecord(dicRecord: PayrollProcessLogApiRecord): PayrollProcessLogListRecord {
  return {
    intID: dicRecord.intID,
    strRecordUUID: dicRecord.strRecordUUID,
    intPayrollRunID: dicRecord.intPayrollRunID,
    strPayrollRunRecordUUID: dicRecord.strPayrollRunRecordUUID,
    intEmployeeID: dicRecord.intEmployeeID,
    strEmployeeCode: dicRecord.strEmployeeCode ?? null,
    strEmployeeName: dicRecord.strEmployeeName ?? null,
    strProcessStage: dicRecord.strProcessStage,
    strProcessStatus: dicRecord.strProcessStatus,
    strMessageText: dicRecord.strMessageText,
    strEntityName: dicRecord.strEntityName ?? null,
    intEntityID: dicRecord.intEntityID,
    dtAddedOn: dicRecord.dtAddedOn
  };
}

function toFilterPayload(dicFilters: PayrollProcessLogFilters) {
  return {
    strPayrollRunRecordUUID: dicFilters.strPayrollRunRecordUUID.trim() || null,
    intEmployeeID: dicFilters.intEmployeeID === "" ? null : Number(dicFilters.intEmployeeID),
    strProcessStage: dicFilters.strProcessStage || null,
    strProcessStatus: dicFilters.strProcessStatus || null,
    strSearchText: dicFilters.strSearchText.trim() || null
  };
}

export function createInitialPayrollProcessLogFilters(strPayrollRunRecordUUID?: string): PayrollProcessLogFilters {
  return {
    strPayrollRunRecordUUID: strPayrollRunRecordUUID ?? "",
    intEmployeeID: "",
    strProcessStage: "",
    strProcessStatus: "",
    strSearchText: ""
  };
}

export const payrollProcessLogService = {
  async getPayrollProcessLogs(dicFilters: PayrollProcessLogFilters): Promise<PayrollProcessLogListRecord[]> {
    const objResult = await masterApiService.getPayrollProcessLogs(toFilterPayload(dicFilters));
    return objResult.Data.map(mapApiRecord);
  },

  async getFormOptions(): Promise<PayrollProcessLogFormOptions> {
    const objResult = await masterApiService.getPayrollProcessLogFormOptions();
    return objResult.Data;
  }
};
