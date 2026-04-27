export type PayrollKpiTone = "positive" | "neutral" | "negative";

export type StatutoryRuleScope = "tenant" | "company";

export type StatutoryRuleApiRecord = {
  intID: number;
  strRuleCode: string;
  strRuleLabel: string;
  strScopeType: StatutoryRuleScope;
  strScopeLabel: string;
  intCompanyID: number | null;
  blnCurrentCompanyScope: boolean;
  decRuleValue: number | null;
  objRuleConfig: Record<string, unknown> | unknown[] | null;
  dtEffectiveFrom: string;
  blnIsActive: boolean;
};

export type StatutoryRuleListRecord = StatutoryRuleApiRecord;

export type StatutoryRuleDetailRecord = StatutoryRuleApiRecord;

export type StatutoryRuleFormValues = {
  strRuleCode: string;
  strScopeType: StatutoryRuleScope;
  dtEffectiveFrom: string;
  strRuleValue: string;
  strRuleConfig: string;
  blnIsActive: boolean;
};

export type EmployeePayrollInputStatus = "Draft" | "Submitted" | "Locked";
export type EmployeePayrollInputLineType =
  | "addition"
  | "deduction"
  | "arrear"
  | "recovery";

export type PayrollSelectOption = {
  intID: number;
  strLabel: string;
  strCode: string;
};

export type PayrollRunOption = PayrollSelectOption & {
  dtPayrollMonth: string;
  strStatus: string;
  blnIsLocked: boolean;
};

export type PayrollRunStatus =
  | "Open"
  | "Submitted"
  | "Approved"
  | "Processed"
  | "Closed";

export type PayrollRunSummary = {
  intInputCount: number;
  intDraftCount: number;
  intSubmittedCount: number;
  intLockedCount: number;
  decTotalLwpDays: number;
  decTotalLopDays: number;
};

export type PayrollRunRecord = {
  intID: number;
  intPayrollCycleID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  blnIsLocked: boolean;
  dicSummary: PayrollRunSummary;
};

export type PayrollRunListRecord = PayrollRunRecord;

export type PayrollRunDetailRecord = PayrollRunRecord & {
  dtAddedOn: string | null;
  dtLastModifiedOn: string | null;
};

export type PayrollRunFormValues = {
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  blnIsLocked: boolean;
};

export type EmployeePayrollInputLineRecord = {
  intID: number;
  intSalaryComponentID: number;
  strComponentCode: string;
  strComponentName: string;
  strLineType: EmployeePayrollInputLineType;
  decAmount: number;
  strRemarks: string | null;
};

export type EmployeePayrollInputRecord = {
  intID: number;
  intPayrollRunID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  strRunStatus: string;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  decLwpDays: number | null;
  decLopDays: number | null;
  strRemarks: string | null;
  strStatus: EmployeePayrollInputStatus;
  blnIsLocked: boolean;
};

export type EmployeePayrollInputListRecord = EmployeePayrollInputRecord;

export type EmployeePayrollInputDetailRecord = EmployeePayrollInputRecord & {
  lstLines: EmployeePayrollInputLineRecord[];
};

export type EmployeePayrollInputFormLine = {
  intTempID: number;
  intSalaryComponentID: number | "";
  strLineType: EmployeePayrollInputLineType;
  strAmount: string;
  strRemarks: string;
};

export type EmployeePayrollInputFormValues = {
  intPayrollRunID: number | "";
  intEmployeeID: number | "";
  strLwpDays: string;
  strLopDays: string;
  strRemarks: string;
  strStatus: EmployeePayrollInputStatus;
  blnIsLocked: boolean;
  lstLines: EmployeePayrollInputFormLine[];
};

export type EmployeePayrollInputFormOptions = {
  lstEmployees: PayrollSelectOption[];
  lstSalaryComponents: PayrollSelectOption[];
  lstPayrollRuns: PayrollRunOption[];
  lstLineTypes: { strCode: EmployeePayrollInputLineType; strLabel: string }[];
  lstStatuses: { strCode: EmployeePayrollInputStatus; strLabel: string }[];
};

export type PayrollResultLineRecord = {
  intID: number;
  intSalaryComponentID: number;
  strComponentCode: string;
  strComponentName: string;
  strComponentCategory: string;
  strLineType: string;
  decAmount: number;
  strRemarks: string | null;
};

export type PayrollResultRecord = {
  intID: number;
  intPayrollRunID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strStatus: string;
  decGrossAmount: number;
  decDeductionAmount: number;
  decTaxAmount: number;
  decNetPayAmount: number;
  strRemarks: string | null;
};

export type PayrollResultListRecord = PayrollResultRecord;

export type PayrollResultDetailRecord = PayrollResultRecord & {
  lstLines: PayrollResultLineRecord[];
};
