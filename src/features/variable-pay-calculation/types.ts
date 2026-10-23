// Types for the Generic Variable Pay / Allocation-Based Calculation workspace.
// NOTE: the backend serializes every Decimal via str(), so all dec* fields arrive as
// strings (e.g. "10250.00"), never numbers. Parse with Number() at the point of use.

export type MonthlyEntityValueStatus = "DRAFT" | "VALIDATED" | "APPROVED" | "LOCKED" | "CANCELLED";

export type MonthlyEntityValueRecord = {
  intID: number;
  intAllocationEntityID: number;
  intEmployeeSalaryComponentID: number | null;
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

// One employee's allocation-entity split for a component, company-wide - used to render the
// full set of entity columns before a calculation batch even exists.
export type ComponentAllocationRow = {
  intEmployeeID: number;
  strEmployeeName: string;
  strEmployeeCode: string;
  intEmployeeSalaryComponentID: number;
  intAllocationEntityID: number | null;
  decAllocationPercent: string | null;
  decBaseAmount: string;
};

export type WorkspaceSalaryComponent = {
  intID: number;
  strComponentName: string;
  intAllocationEntityTypeID: number | null;
  blnAttendanceEligibilityApplicable: boolean;
  decAttendanceEligibilityPercent: string | null;
  blnAttendanceProrationApplicable: boolean;
  blnEligibilityOverrideAllowed: boolean;
  blnMonthlyAdjustmentApplicable: boolean;
  decMonthlyAdjustmentMinPercent: string | null;
  decMonthlyAdjustmentMaxPercent: string | null;
};

// The manual/import-eligible employee row shape from GET /variable-pay/runs/{id}/employees,
// duplicated here (rather than imported from the variable-pay feature) to keep this feature's
// public type surface self-contained - the two teams' types happen to already match 1:1.
export type ManualEligibleEmployeeRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartment: string | null;
  strLocation: string | null;
  intTransactionID: number | null;
  decAmount: number | null;
  strSourceType: string | null;
  strStatus: string;
  strRemarks: string | null;
};

export type VariablePayRunWorkspace = {
  intPayrollRunID: number;
  dtPayrollMonth: string;
  intCompanyID: number;
  intVariablePayTypeID: number;
  strVariablePayTypeName: string;
  intSalaryComponentID: number | null;
  objSalaryComponent: WorkspaceSalaryComponent | null;
  objBatch: VariablePayCalculationBatch | null;
  lstEmployeeCalculations: VariablePayEmployeeCalculation[];
  lstMonthlyEntityValues: MonthlyEntityValueRecord[];
  lstAllocationsForComponent: ComponentAllocationRow[];
  lstEligibleEmployeesForRun: ManualEligibleEmployeeRow[];
};
