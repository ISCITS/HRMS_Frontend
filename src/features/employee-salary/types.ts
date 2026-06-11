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
  blnIsFlexiBenefit?: boolean;
  blnIsFlexiBasket?: boolean;
  blnIncludedInCtc?: boolean;
  blnProofRequired?: boolean;
  strTaxTreatment?: string | null;
  strValueSource: string;
  decFixedAmount?: number | null;
  decPercentageValue?: number | null;
  strFormulaExpression?: string | null;
  strFlexiComponentRole?: string | null;
  blnIsFlexiBasketLine?: boolean;
  decFlexiMaxMonthlyAmount?: number | null;
  decFlexiMaxYearlyAmount?: number | null;
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
  blnIsFlexiBenefit?: boolean;
  blnIsFlexiBasket?: boolean;
  blnIncludedInCtc?: boolean;
  blnProofRequired?: boolean;
  strTaxTreatment?: string | null;
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
  decFlexiBasketAnnualAmount?: number | null;
  decFlexiAllocatedAnnualAmount?: number | null;
  decFlexiBalanceAnnualAmount?: number | null;
  intFlexiBalanceComponentID?: number | null;
  strRevisionReason: string | null;
  blnIsCurrent: boolean;
};

export type EmployeeSalaryFlexiAllocationLine = {
  intSalaryComponentID: number;
  strComponentCode: string | null;
  strComponentName: string | null;
  decAnnualLimit: number | null;
  decMonthlyLimit: number | null;
  decAllocationAnnual: number;
  decAllocationMonthly: number;
  blnProofRequired: boolean;
  strTaxTreatment: string | null;
  decBalanceAnnual: number | null;
};

export type EmployeeSalaryFlexiAllocationSummary = {
  blnHasFlexiBasket: boolean;
  intFlexiBasketComponentID?: number | null;
  intResidualComponentID?: number | null;
  strResidualComponentCode?: string | null;
  strResidualComponentName?: string | null;
  decFlexiBasketAvailableAnnual?: number | null;
  decFlexiBasketAvailableMonthly?: number | null;
  decAllocatedFlexiAnnual?: number | null;
  decAllocatedFlexiMonthly?: number | null;
  decBalanceFlexiAnnual?: number | null;
  decBalanceFlexiMonthly?: number | null;
  decResidualTaxableAllowanceAnnual?: number | null;
  decResidualTaxableAllowanceMonthly?: number | null;
  lstAllocationLines: EmployeeSalaryFlexiAllocationLine[];
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
    decFlexiBasketAnnualAmount?: number | null;
    decFlexiAllocatedAnnualAmount?: number | null;
    decFlexiBalanceAnnualAmount?: number | null;
    intFlexiBalanceComponentID?: number | null;
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
  objFlexiAllocation?: EmployeeSalaryFlexiAllocationSummary;
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

export type EmployeeSalaryFlexiAllocationFormValue = {
  intSalaryComponentID: number;
  strComponentName: string;
  strComponentCode: string;
  strTaxTreatment: string;
  blnProofRequired: boolean;
  decAnnualLimit: number | null;
  decMonthlyLimit: number | null;
  decAllocationMonthly: string;
  decAllocationAnnual: string;
};

export type EmployeeSalaryRevisionFormValues = {
  intSalaryStructureID: number | "";
  dtEffectiveFrom: string;
  strRevisionReason: string;
  lstOverrides: EmployeeSalaryOverrideFormValue[];
  lstFlexiAllocations: EmployeeSalaryFlexiAllocationFormValue[];
};
