// Types for the Generic Variable Pay / Allocation-Based Calculation workspace.
// NOTE: the backend serializes every Decimal via str(), so all dec* fields arrive as
// strings (e.g. "10250.00"), never numbers. Parse with Number() at the point of use.

export type MonthlyEntityValueStatus = "DRAFT" | "VALIDATED" | "APPROVED" | "LOCKED" | "CANCELLED";

export type MonthlyEntityValueRecord = {
  intID: number;
  intAllocationEntityID: number;
  decAdjustmentPercent: string;
  strStatus: MonthlyEntityValueStatus | string;
  strSourceType: string | null;
  strRemarks: string | null;
};

export type MonthlyEntityValueSaveRow = {
  intAllocationEntityID: number;
  decAdjustmentPercent: number;
  strRemarks?: string | null;
};

export type VariablePayCalculationBatch = {
  intID: number;
  intCompanyID: number;
  dtPayrollMonth: string;
  intSalaryComponentID: number;
  intVariablePayTypeID: number | null;
  intSourcePayrollRunID: number | null;
  intTargetPayrollRunID: number | null;
  strCalculationStatus: string;
  intEmployeeCount: number;
  intEligibleCount: number;
  intExceptionCount: number;
  decTotalCalculatedAmount: string;
  decTotalApprovedAmount: string;
};

export type VariablePayCalculationDetail = {
  intAllocationEntityID: number;
  decAllocationPercent: string;
  decBaseShareAmount: string;
  decMonthlyAdjustmentPercent: string;
  decAdjustedAmount: string;
  decProratedAmount: string | null;
  decFinalDetailAmount: string;
};

export type VariablePayEmployeeCalculation = {
  intID: number;
  intEmployeeID: number;
  decBaseAmount: string;
  decPayableDaysPercent: string | null;
  blnIsEligible: boolean;
  blnEligibilityOverride: boolean;
  strOverrideReason: string | null;
  decCalculatedAmount: string;
  decApprovedAmount: string | null;
  decFinalAmount: string;
  strStatus: string;
  lstDetails: VariablePayCalculationDetail[];
};

// Allocation-Based salary components, narrowed from the raw Salary Component list endpoint.
export type AllocationBasedComponentOption = {
  intID: number;
  strComponentCode: string;
  strComponentName: string;
  intAllocationEntityTypeID: number | null;
  blnAttendanceEligibilityApplicable: boolean;
  blnAttendanceProrationApplicable: boolean;
  blnMonthlyAdjustmentApplicable: boolean;
  decMonthlyAdjustmentMinPercent: number | null;
  decMonthlyAdjustmentMaxPercent: number | null;
};

export type EmployeeNameOption = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
};
