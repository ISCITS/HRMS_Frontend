import { masterApiService } from "@/services/master/MasterApiService";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalaryFormOptions,
  EmployeeSalaryFlexiAllocationSummary,
  EmployeeSalaryListRecord,
  EmployeeSalaryOverrideFormValue,
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

function normalizeFlexiAllocationAmounts(dicAllocation: {
  decAllocationMonthly: string;
  decAllocationAnnual: string;
}) {
  const decAllocationMonthly = parseOptionalDecimal(dicAllocation.decAllocationMonthly);
  const decAllocationAnnual = parseOptionalDecimal(dicAllocation.decAllocationAnnual);
  return {
    decAllocationMonthly:
      decAllocationMonthly ??
      (decAllocationAnnual !== null ? decAllocationAnnual / 12 : null),
    decAllocationAnnual:
      decAllocationAnnual ??
      (decAllocationMonthly !== null ? decAllocationMonthly * 12 : null)
  };
}

function areOptionalDecimalsEqual(decLeft: number | null, decRight: number | null) {
  if (decLeft === null && decRight === null) {
    return true;
  }
  if (decLeft === null || decRight === null) {
    return false;
  }
  return Math.abs(decLeft - decRight) < 0.0001;
}

function shouldPersistOverride(dicOverride: EmployeeSalaryOverrideFormValue) {
  const decAmountMonthly = parseOptionalDecimal(dicOverride.decAmountMonthly);
  const decAmountAnnual = parseOptionalDecimal(dicOverride.decAmountAnnual);
  const decPercentageValue = parseOptionalDecimal(dicOverride.decPercentageValue);
  const decDefaultMonthly = parseOptionalDecimal(dicOverride.strDefaultMonthly);
  const decDefaultAnnual = parseOptionalDecimal(dicOverride.strDefaultAnnual);
  const decDefaultPercentage = parseOptionalDecimal(dicOverride.strDefaultPercentage);
  const strRemarks = dicOverride.strRemarks.trim();

  return {
    decAmountMonthly,
    decAmountAnnual,
    decPercentageValue,
    strRemarks,
    blnShouldPersist:
      !areOptionalDecimalsEqual(decAmountMonthly, decDefaultMonthly) ||
      !areOptionalDecimalsEqual(decAmountAnnual, decDefaultAnnual) ||
      !areOptionalDecimalsEqual(decPercentageValue, decDefaultPercentage) ||
      Boolean(strRemarks)
  };
}

export type EmployeeSalaryRevisionPreviewRecord = {
  lstComponentLines: Array<{
    intSalaryComponentID: number;
    decAmountMonthly?: number | null;
    decAmountAnnual?: number | null;
    decPercentageValue?: number | null;
    strRemarks?: string | null;
    blnIsOverride?: boolean;
  }>;
  objFlexiAllocation: EmployeeSalaryFlexiAllocationSummary;
};

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

  async previewRevision(
    intEmployeeID: number,
    dicValues: EmployeeSalaryRevisionFormValues
  ): Promise<EmployeeSalaryRevisionPreviewRecord> {
    const objResult = await masterApiService.previewEmployeeSalaryRevision(intEmployeeID, {
      intSalaryStructureID: dicValues.intSalaryStructureID,
      dtEffectiveFrom: dicValues.dtEffectiveFrom,
      strRevisionReason: dicValues.strRevisionReason.trim() || null,
      lstOverrides: dicValues.lstOverrides
        .filter((dicOverride) => dicOverride.blnAllowManualOverride)
        .map((dicOverride) => {
          const dicNormalizedOverride = shouldPersistOverride(dicOverride);
          return {
            intSalaryComponentID: dicOverride.intSalaryComponentID,
            decAmountMonthly: dicNormalizedOverride.decAmountMonthly,
            decAmountAnnual: dicNormalizedOverride.decAmountAnnual,
            decPercentageValue: dicNormalizedOverride.decPercentageValue,
            strRemarks: dicNormalizedOverride.strRemarks || null,
            blnShouldPersist: dicNormalizedOverride.blnShouldPersist
          };
        })
        .filter((dicOverride) => dicOverride.blnShouldPersist)
        .map(({ blnShouldPersist: _blnShouldPersist, ...dicOverride }) => dicOverride),
      lstFlexiAllocations: dicValues.lstFlexiAllocations
        .map((dicAllocation) => ({
          intSalaryComponentID: dicAllocation.intSalaryComponentID,
          ...normalizeFlexiAllocationAmounts(dicAllocation)
        }))
        .filter((dicAllocation) =>
          dicAllocation.decAllocationMonthly !== null ||
          dicAllocation.decAllocationAnnual !== null
        )
    });
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
        .map((dicOverride) => {
          const dicNormalizedOverride = shouldPersistOverride(dicOverride);
          return {
            intSalaryComponentID: dicOverride.intSalaryComponentID,
            decAmountMonthly: dicNormalizedOverride.decAmountMonthly,
            decAmountAnnual: dicNormalizedOverride.decAmountAnnual,
            decPercentageValue: dicNormalizedOverride.decPercentageValue,
            strRemarks: dicNormalizedOverride.strRemarks || null,
            blnShouldPersist: dicNormalizedOverride.blnShouldPersist
          };
        })
        .filter((dicOverride) => dicOverride.blnShouldPersist)
        .map(({ blnShouldPersist: _blnShouldPersist, ...dicOverride }) => dicOverride),
      lstFlexiAllocations: dicValues.lstFlexiAllocations
        .map((dicAllocation) => ({
          intSalaryComponentID: dicAllocation.intSalaryComponentID,
          ...normalizeFlexiAllocationAmounts(dicAllocation)
        }))
        .filter((dicAllocation) =>
          dicAllocation.decAllocationMonthly !== null ||
          dicAllocation.decAllocationAnnual !== null
        )
    });
    return objResult.Data;
  },

  async unassignSalary(intEmployeeID: number): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.unassignEmployeeSalary(intEmployeeID);
    return objResult.Data;
  }
};
