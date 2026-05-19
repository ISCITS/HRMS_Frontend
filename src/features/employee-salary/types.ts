export type EmployeeSalaryStatus = "Assigned" | "Unassigned";

export type EmployeeSalaryListRecord = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strWorkEmail: string | null;
  strEmploymentStatus: "Active" | "Inactive";
  strSalaryStatus: EmployeeSalaryStatus;
  strStructureName: string | null;
  strStructureCode: string | null;
  dtEffectiveFrom: string | null;
  decGrossMonthly: number | null;
  decCtcAnnual: number | null;
  strRevisionReason: string | null;
};

export type EmployeeSalaryOption = {
  intID: number;
  strLabel: string;
  strCode?: string;
  strCurrencyCode?: string;
  dtEffectiveFrom?: string;
  lstComponents?: EmployeeSalaryStructureComponentOption[];
};

export type EmployeeSalaryStructureComponentOption = {
  intSalaryComponentID: number;
  strComponentCode: string | null;
  strComponentName: string | null;
  strComponentCategory: string | null;
  strValueSource: string;
  decFixedAmount?: number | null;
  decPercentageValue?: number | null;
  strFormulaExpression?: string | null;
  blnAllowManualOverride: boolean;
  intLineOrder: number;
};

export type EmployeeSalaryFormOptions = {
  lstEmployees: EmployeeSalaryOption[];
  lstSalaryStructures: EmployeeSalaryOption[];
};

export type EmployeeSalaryComponentLine = {
  intEmployeeSalaryComponentID: number;
  intSalaryComponentID: number;
  strComponentCode: string | null;
  strComponentName: string | null;
  strComponentCategory: string | null;
  blnAllowManualOverride: boolean;
  strComponentValueType: string;
  decAmountMonthly: number | null;
  decAmountAnnual: number | null;
  decPercentageValue: number | null;
  decDefaultAmountMonthly?: number | null;
  decDefaultAmountAnnual?: number | null;
  decDefaultPercentageValue?: number | null;
  intBasisComponentID: number | null;
  strFormulaExpression: string | null;
  blnIsOverride: boolean;
  strRemarks: string | null;
};

export type EmployeeSalaryHistoryRecord = {
  intEmployeeSalaryStructureID: number;
  strStructureName: string | null;
  strStructureCode: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  decCtcAnnual: number | null;
  decGrossMonthly: number | null;
  strRevisionReason: string | null;
  blnIsCurrent: boolean;
};

export type EmployeeSalaryDetailRecord = {
  objEmployeeSummary: {
    intEmployeeID: number;
    strEmployeeCode: string;
    strEmployeeName: string;
    strWorkEmail: string | null;
    strEmploymentStatus: "Active" | "Inactive";
  };
  objCurrentSalarySnapshot: {
    decCtcAnnual: number | null;
    decGrossMonthly: number | null;
    strRevisionReason: string | null;
    dtEffectiveFrom: string;
  } | null;
  objAssignedStructure: {
    intSalaryStructureID: number;
    strStructureName: string | null;
    strStructureCode: string | null;
    strCurrencyCode: string;
    dtEffectiveFrom: string;
  } | null;
  lstComponentLines: EmployeeSalaryComponentLine[];
  lstRevisionHistory: EmployeeSalaryHistoryRecord[];
};

export type EmployeeSalarySummaryRecord = {
  objEmployeeSummary: EmployeeSalaryDetailRecord["objEmployeeSummary"];
  objCurrentSalarySnapshot: EmployeeSalaryDetailRecord["objCurrentSalarySnapshot"];
  objAssignedStructure: EmployeeSalaryDetailRecord["objAssignedStructure"];
  intRevisionCount: number;
};

export type EmployeeSalaryOverrideFormValue = {
  intSalaryComponentID: number;
  strComponentName: string;
  blnAllowManualOverride: boolean;
  decAmountMonthly: string;
  decAmountAnnual: string;
  decPercentageValue: string;
  strDefaultMonthly: string;
  strDefaultAnnual: string;
  strDefaultPercentage: string;
  strRemarks: string;
};

export type EmployeeSalaryRevisionFormValues = {
  intSalaryStructureID: number | "";
  dtEffectiveFrom: string;
  strRevisionReason: string;
  lstOverrides: EmployeeSalaryOverrideFormValue[];
};
