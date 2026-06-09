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
  strScopeType?: PayrollRunScopeType;
  intScopedEmployeeID?: number | null;
  dtPayrollMonth: string;
  strStatus: string;
  blnIsLocked: boolean;
};

export type PayrollRunScopeType = "All" | "SelectedEmployee";

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
  intProcessedCount: number;
  intValidationErrorCount: number;
  intValidationWarningCount: number;
};

export type PayrollValidationResultRecord = {
  intID?: number;
  intEmployeeID: number | null;
  strValidationCode: string;
  strValidationLevel: string;
  strValidationMessage: string;
  blnIsBlocking: boolean;
  blnIsResolved?: boolean;
  strEntityName?: string | null;
  intEntityID?: number | null;
};

export type PayrollValidationSummary = {
  strStatus: string;
  intEmployeesChecked: number;
  intBlockingErrorCount: number;
  intWarningCount: number;
  intMissingSalaryCount: number;
  intStatutoryGapCount: number;
  intMissingTaxProfileCount: number;
  intMissingBankAccountCount: number;
  strFinancialYearCode: string | null;
  intRuleSetID: number | null;
  strRuleSetCode: string | null;
  decNonWageCapPercent: number | null;
  lstIssues: PayrollValidationResultRecord[];
};

export type PayrollProcessSummary = {
  strStatus: string;
  dicValidationSummary?: PayrollValidationSummary;
  intEmployeesInScope?: number;
  intProcessedEmployeeCount: number;
  intFailedEmployeeCount: number;
  decGrossTotal?: number;
  decDeductionTotal?: number;
  decTaxTotal?: number;
  decNetPayTotal?: number;
  decEmployerContributionTotal?: number;
  intReprocessAuditID?: number;
  lstExceptions: {
    intEmployeeID: number;
    strEmployeeCode: string;
    strMessage: string;
  }[];
};

export type PayrollRunRecord = {
  intID: number;
  intPayrollCycleID: number;
  strRunCode: string;
  strRunName: string;
  strScopeType: PayrollRunScopeType;
  intScopedEmployeeID: number | null;
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  blnIsLocked: boolean;
  intEmployeeCount: number;
  intProcessedEmployeeCount: number;
  intFailedEmployeeCount: number;
  decGrossPayTotal: number;
  decDeductionTotal: number;
  decTaxTotal: number;
  decNetPayTotal: number;
  decEmployerContributionTotal: number;
  decNonWageCapPercent: number | null;
  strFinancialYearCode: string | null;
  strValidationStatus: string | null;
  intReprocessCount: number;
  dicSummary: PayrollRunSummary;
};

export type PayrollRunListRecord = PayrollRunRecord;

export type PayrollRunDetailRecord = PayrollRunRecord & {
  dtAddedOn: string | null;
  dtLastModifiedOn: string | null;
  dtLastExecutedOn: string | null;
  dtClosedOn: string | null;
  lstValidationResults: PayrollValidationResultRecord[];
  lstProcessedResults?: Array<PayrollResultRecord & { lstLines?: PayrollResultLineRecord[] }>;
};

export type PayrollRunFormValues = {
  intPayrollCycleID: number | "";
  strRunCode: string;
  strRunName: string;
  strScopeType: PayrollRunScopeType;
  strProcessFor: "AllEmployees" | "SelectedEmployees" | "PayrollGroup";
  intScopedEmployeeID: number | "";
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  blnIsLocked: boolean;
};

export type PayrollRunFormOptions = {
  lstPayrollCycles: Array<{
    intID: number;
    strLabel: string;
    strCode: string;
    strPeriodType: string;
  }>;
  lstEmployees: PayrollSelectOption[];
};

export type FNFSettlementStatus =
  | "draft"
  | "calculated"
  | "under_review"
  | "released"
  | "approved"
  | "locked"
  | "paid"
  | "recovered"
  | "cancelled";

export type FNFLineType = "EARNING" | "DEDUCTION" | "RECOVERY" | "STATUTORY" | "TAX";

export type FNFSettlementLineRecord = {
  intID: number;
  strLineType: FNFLineType;
  strLineCode: string;
  strLineName: string;
  intSalaryComponentID?: number | null;
  decAmount: number;
  decTaxableAmount?: number;
  decExemptAmount?: number;
  decStatutoryAmount?: number;
  strCalculationBasis?: string | null;
  decCalculationDays?: number | null;
  decRateAmount?: number | null;
  strSourceType?: string | null;
  intSourceReferenceID?: number | null;
  blnIsSystemCalculated?: boolean;
  blnIsManualOverride?: boolean;
  strOverrideReason?: string | null;
  intDisplayOrder?: number;
  strRemarks?: string | null;
};

export type FNFSettlementRecord = {
  intID: number;
  intEmployeeID: number;
  strEmployeeCode?: string | null;
  intCompanyID?: number;
  strSettlementNumber?: string | null;
  intPayrollRunID?: number | null;
  strExitType: string;
  strExitReason?: string | null;
  dtResignationDate?: string | null;
  dtLastWorkingDate: string;
  dtSettlementDate?: string | null;
  dtSettlementMonth?: string | null;
  decNoticePeriodDays?: number;
  decNoticeServedDays?: number;
  decNoticeShortfallDays?: number;
  strSettlementStatus: FNFSettlementStatus;
  strCurrencyCode?: string;
  decTotalEarnings?: number;
  decTotalDeductions?: number;
  decTotalRecoveries?: number;
  decTotalTaxDeducted?: number;
  decTotalStatutoryDeduction?: number;
  decNetPayableAmount?: number;
  decNetRecoverableAmount?: number;
  decFinalTaxLiability?: number;
  decFinalTdsAmount?: number;
  objCalculationSnapshot?: Record<string, unknown> | null;
  strRemarks?: string | null;
  lstLines?: FNFSettlementLineRecord[];
  lstAudit?: FNFAuditRecord[];
};

export type FNFSettlementFormValues = {
  strEmployeeCode: string;
  strSettlementNumber: string;
  intPayrollRunID: number | "";
  strExitType: string;
  strExitReason: string;
  dtResignationDate: string;
  dtLastWorkingDate: string;
  dtSettlementDate: string;
  dtSettlementMonth: string;
  decNoticePeriodDays: string;
  decNoticeServedDays: string;
  decNoticeShortfallDays: string;
  strCurrencyCode: string;
  strRemarks: string;
};

export type FNFLineFormValues = {
  intID?: number;
  strLineType: FNFLineType;
  strLineCode: string;
  strLineName: string;
  decAmount: string;
  blnIsManualOverride: boolean;
  strOverrideReason: string;
  strRemarks: string;
};

export type FNFAuditRecord = {
  intID: number;
  strActionCode: string;
  strFromStatus?: string | null;
  strToStatus?: string | null;
  strRemarks?: string | null;
  intActionBy?: number | null;
  dtActionOn?: string | null;
};

export type FNFStatementRecord = {
  intID: number;
  strStatementNumber: string;
  strStatementHTML?: string | null;
  objStatementJson?: Record<string, unknown> | null;
  dtGeneratedOn?: string | null;
  blnIsLatest?: boolean;
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
  strSourceType?: string | null;
  blnIsWages?: boolean | null;
  blnIncludeInRemuneration?: boolean | null;
  strRemarks: string | null;
};

export type PayrollStatutoryResultRecord = {
  intID: number;
  intPayrollRunID: number;
  intEmployeePayrollResultID: number;
  intEmployeeID: number;
  strStatutoryCode: string;
  strStatutoryName: string | null;
  decBasisAmount: number;
  decEmployeeRatePercent: number | null;
  decEmployerRatePercent: number | null;
  decEmployeeAmount: number;
  decEmployerAmount: number;
  decTotalAmount: number;
  decCeilingAmount: number | null;
  strCalculationMode: string | null;
  intRuleID: number | null;
  strRemarks: string | null;
};

export type PayrollResultRecord = {
  intID: number;
  intPayrollRunID: number;
  intEmployeePayrollInputID: number | null;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strBankName?: string | null;
  strBankCode?: string | null;
  strBankAccountMasked?: string | null;
  strIfscCode?: string | null;
  strAccountHolderName?: string | null;
  strStatus: string;
  decGrossAmount: number;
  decDeductionAmount: number;
  decTaxAmount: number;
  decNetPayAmount: number;
  strRegimeUsed: string | null;
  decTaxableIncome: number;
  decAnnualTaxAmount: number;
  decMonthlyTds: number;
  dicTaxSummary?: {
    strRegimeUsed: string | null;
    decTaxableIncome: number;
    decAnnualTaxAmount: number;
    decMonthlyTds: number;
    decProjectedTaxableIncome: number;
    intRemainingMonths: number | null;
  };
  decRemunerationAmount: number;
  decActualWagesAmount: number;
  decActualNonWagesAmount: number;
  decAllowedNonWagesAmount: number;
  decExcessNonWagesAmount: number;
  decDeemedWagesAmount: number;
  decComplianceWageBaseAmount: number;
  decEmployerContributionTotal: number;
  decTaxableIncomeMonthly: number;
  decPaidDays: number | null;
  decLopDays: number | null;
  intPayslipID: number | null;
  strPayslipNumber: string | null;
  strPayslipStatus: string | null;
  blnPayslipGenerated: boolean;
  dtPayslipGeneratedOn: string | null;
  strRemarks: string | null;
};

export type PayrollResultListRecord = PayrollResultRecord;

export type PayrollResultDetailRecord = PayrollResultRecord & {
  lstLines: PayrollResultLineRecord[];
  lstStatutoryResults?: PayrollStatutoryResultRecord[];
};

export type StatutoryReportCode = "ALL" | "PF" | "ESI" | "PT" | "LWF";

export type StatutoryReportRow = {
  intID: number;
  intPayrollRunID: number;
  intEmployeePayrollResultID: number;
  intEmployeeID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  strEmployeeCode: string;
  strEmployeeName: string;
  strStatus: string;
  strStatutoryCode: string;
  strStatutoryName: string;
  decBasisAmount: number;
  decEmployeeRatePercent: number | null;
  decEmployerRatePercent: number | null;
  decEmployeeAmount: number;
  decEmployerAmount: number;
  decTotalAmount: number;
  decCeilingAmount: number | null;
  strCalculationMode: string | null;
  intRuleID: number | null;
  strRemarks: string | null;
};

export type PayslipLineRecord = {
  strGroupCode: string;
  strSectionLabel: string;
  strLineType: string | null;
  strLineCode: string | null;
  strLineLabel: string;
  intDisplayOrder: number;
  decAmount: number;
  decBasisAmount: number | null;
  decEmployerAmount: number | null;
  strSourceType: string | null;
  blnIsEmployerContribution: boolean;
  objLineMeta?: Record<string, unknown> | null;
  strRemarks: string | null;
};

export type PayslipPreviewRecord = {
  intPayslipID: number | null;
  strPayslipNumber: string | null;
  strPayslipStatus: string;
  blnGenerated: boolean;
  dtGeneratedOn: string | null;
  dicCompany: {
    strCompanyName: string;
    strCompanyCode: string | null;
    strCompanyAddress: string | null;
    strCompanyPan: string | null;
    strCompanyTan: string | null;
    strLogoUrl: string | null;
  };
  dicRun: {
    strRunCode: string;
    strRunName: string;
    strRunStatus: string;
    dtPayrollMonth: string;
    strPayrollMonthLabel: string;
    dtPeriodStartDate: string | null;
    dtPeriodEndDate: string | null;
  };
  dicEmployee: {
    strEmployeeCode: string;
    strEmployeeName: string;
    strDepartmentName: string | null;
    strDesignationName: string | null;
    strLocationName: string | null;
    dtDateOfJoining: string | null;
    strPanNumber: string | null;
    strUanNumber: string | null;
    strEsiNumber: string | null;
    strPfNumber: string | null;
    strBankName: string | null;
    strBankAccountMasked: string | null;
  };
  dicAttendance: {
    decPayableDays: number;
    decPaidDays: number;
    decLopDays: number;
    decLwpDays: number;
    decCalendarDays: number;
  };
  lstEarnings: PayslipLineRecord[];
  lstDeductions: PayslipLineRecord[];
  lstInformation: PayslipLineRecord[];
  lstEmployerContributions: PayslipLineRecord[];
  dicTax?: {
    strRegimeUsed: string | null;
    decTaxableIncome: number;
    decAnnualTaxAmount: number;
    decCurrentMonthTds: number;
    decTotalTaxLiability: number;
    intRemainingMonths: number | null;
  };
  dicTotals: {
    decGrossEarnings: number;
    decTotalDeductions: number;
    decNetPay: number;
    decEmployerContributionTotal: number;
    strNetPayInWords: string;
  };
  objTemplateSettings: Record<string, unknown>;
  strRemarks: string | null;
};

export type PayslipRunListRecord = {
  intPayslipID: number | null;
  intPayrollRunID: number;
  intEmployeeID: number;
  strPayslipNumber: string | null;
  strPayslipStatus: string;
  blnGenerated: boolean;
  dtGeneratedOn: string | null;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string;
  strEmployeeCode: string;
  strEmployeeName: string;
  decGrossEarnings: number;
  decTotalDeductions: number;
  decNetPay: number;
};

export type PayslipGenerateAllSummary = {
  intGeneratedCount: number;
  lstPayslips: {
    intPayslipID: number | null;
    strPayslipNumber: string | null;
    strEmployeeCode: string | null;
    strEmployeeName: string | null;
    strPayslipStatus: string | null;
  }[];
};
