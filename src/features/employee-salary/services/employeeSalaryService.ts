import { masterApiService } from "@/services/master/MasterApiService";
import { resolveLookupDisplayLabel } from "@/features/payroll-lookups/utils/lookupLabel";
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
  const blnAmountOverridden = Boolean(dicOverride.blnAmountOverridden) ||
    !areOptionalDecimalsEqual(decAmountMonthly, decDefaultMonthly) ||
    !areOptionalDecimalsEqual(decAmountAnnual, decDefaultAnnual);

  return {
    decAmountMonthly,
    decAmountAnnual,
    decPercentageValue,
    strRemarks,
    blnShouldPersist:
      blnAmountOverridden ||
      !areOptionalDecimalsEqual(decPercentageValue, decDefaultPercentage) ||
      Boolean(strRemarks),
    blnAmountOverridden
  };
}

function mapOverridePayload(dicOverride: EmployeeSalaryOverrideFormValue) {
  const dicNormalizedOverride = shouldPersistOverride(dicOverride);
  return {
    intSalaryComponentID: dicOverride.intSalaryComponentID,
    decAmountMonthly: dicNormalizedOverride.blnAmountOverridden ? dicNormalizedOverride.decAmountMonthly : null,
    decAmountAnnual: dicNormalizedOverride.blnAmountOverridden ? dicNormalizedOverride.decAmountAnnual : null,
    decPercentageValue: dicNormalizedOverride.decPercentageValue,
    strRemarks: dicNormalizedOverride.strRemarks || null,
    blnShouldPersist: dicNormalizedOverride.blnShouldPersist
  };
}

export type EmployeeSalaryRevisionPreviewRecord = {
  lstComponentLines: Array<{
    intSalaryComponentID: number;
    strComponentCode?: string | null;
    strComponentName?: string | null;
    strComponentCategory?: string | null;
    intPayslipSectionSnapshotID?: number | null;
    strPayslipSectionSnapshotCode?: string | null;
    intLwpTreatmentSnapshotID?: number | null;
    strLwpTreatmentSnapshotCode?: string | null;
    intLwpReducedAmountHandlingSnapshotID?: number | null;
    strLwpReducedAmountHandlingSnapshotCode?: string | null;
    strLwpProrationFormulaSnapshot?: string | null;
    blnIsWages?: boolean | null;
    decAmountMonthly?: number | null;
    decAmountAnnual?: number | null;
    decPercentageValue?: number | null;
    strRemarks?: string | null;
    blnIsOverride?: boolean;
  }>;
  objFlexiAllocation: EmployeeSalaryFlexiAllocationSummary;
  dicWageAdjustmentPreview?: {
    decWageAmount?: number | null;
    decNonWageAmount?: number | null;
    decWagePercent?: number | null;
    decMinimumRequiredWage?: number | null;
    decShortfallAmount?: number | null;
    decStatutoryWageAmount?: number | null;
  } | null;
};

export const employeeSalaryService = {
  async getEmployeeSalaries(): Promise<EmployeeSalaryListRecord[]> {
    const objResult = await masterApiService.getEmployeeSalaries();
    return objResult.Data;
  },

  async getFormOptions(): Promise<EmployeeSalaryFormOptions> {
    const objResult = await masterApiService.getEmployeeSalaryFormOptions();
    return {
      ...objResult.Data,
      lstSalaryStructures: (objResult.Data.lstSalaryStructures ?? []).map((dicStructure) => ({
        ...dicStructure,
        strLabel: resolveLookupDisplayLabel({
          strDisplayName: dicStructure.strLabel,
          strValueCode: dicStructure.strCode,
        }),
      })),
    };
  },

  async getEmployeeSalaryDetail(intEmployeeID: string | number): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.getEmployeeSalaryDetail(intEmployeeID);
    return objResult.Data;
  },

  async getEmployeeSalarySummary(intEmployeeID: string | number): Promise<EmployeeSalarySummaryRecord> {
    const objResult = await masterApiService.getEmployeeSalarySummary(intEmployeeID);
    return objResult.Data;
  },

  async previewRevision(
    intEmployeeID: string | number,
    dicValues: EmployeeSalaryRevisionFormValues
  ): Promise<EmployeeSalaryRevisionPreviewRecord> {
    const objResult = await masterApiService.previewEmployeeSalaryRevision(intEmployeeID, {
      intSalaryStructureID: dicValues.intSalaryStructureID,
      dtEffectiveFrom: dicValues.dtEffectiveFrom,
      strRevisionReason: dicValues.strRevisionReason.trim() || null,
      lstOverrides: dicValues.lstOverrides
        .filter((dicOverride) => dicOverride.blnAllowManualOverride)
        .map(mapOverridePayload)
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
    intEmployeeID: string | number,
    dicValues: EmployeeSalaryRevisionFormValues
  ): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.createEmployeeSalaryRevision(intEmployeeID, {
      intSalaryStructureID: dicValues.intSalaryStructureID,
      dtEffectiveFrom: dicValues.dtEffectiveFrom,
      strRevisionReason: dicValues.strRevisionReason.trim() || null,
      lstOverrides: dicValues.lstOverrides
        .filter((dicOverride) => dicOverride.blnAllowManualOverride)
        .map(mapOverridePayload)
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

  async unassignSalary(intEmployeeID: string | number): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await masterApiService.unassignEmployeeSalary(intEmployeeID);
    return objResult.Data;
  }
};
