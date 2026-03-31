import { masterApiService } from "@/services/master/MasterApiService";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFormOptions,
  EmployeeSalaryListRecord,
  EmployeeSalaryRevisionFormValues,
  EmployeeSalarySummaryRecord
} from "@/features/employee-salary/types";

function parseOptionalDecimal(strValue: string): number | null {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

export const employeeSalaryService = {
  async getEmployeeSalaries(): Promise<EmployeeSalaryListRecord[]> {
    const objResult = await masterApiService.getEmployeeSalaries();
    return objResult.Data;
  },

  async getFormOptions(): Promise<EmployeeSalaryFormOptions> {
    const objResult = await masterApiService.getEmployeeSalaryFormOptions();
    return objResult.Data;
  },

  async getEmployeeSalaryDetail(intEmployeeID: number): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.getEmployeeSalaryDetail(intEmployeeID);
    return objResult.Data;
  },

  async getEmployeeSalarySummary(intEmployeeID: number): Promise<EmployeeSalarySummaryRecord> {
    const objResult = await masterApiService.getEmployeeSalarySummary(intEmployeeID);
    return objResult.Data;
  },

  async createRevision(
    intEmployeeID: number,
    dicValues: EmployeeSalaryRevisionFormValues
  ): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.createEmployeeSalaryRevision(intEmployeeID, {
      intSalaryStructureID: dicValues.intSalaryStructureID,
      dtEffectiveFrom: dicValues.dtEffectiveFrom,
      strRevisionReason: dicValues.strRevisionReason.trim() || null,
      lstOverrides: dicValues.lstOverrides
        .filter((dicOverride) => dicOverride.blnAllowManualOverride)
        .map((dicOverride) => ({
          intSalaryComponentID: dicOverride.intSalaryComponentID,
          decAmountMonthly: parseOptionalDecimal(dicOverride.decAmountMonthly),
          decAmountAnnual: parseOptionalDecimal(dicOverride.decAmountAnnual),
          decPercentageValue: parseOptionalDecimal(dicOverride.decPercentageValue),
          strRemarks: dicOverride.strRemarks.trim() || null
        }))
        .filter((dicOverride) =>
          dicOverride.decAmountMonthly !== null ||
          dicOverride.decAmountAnnual !== null ||
          dicOverride.decPercentageValue !== null ||
          dicOverride.strRemarks !== null
        )
    });
    return objResult.Data;
  }
};
