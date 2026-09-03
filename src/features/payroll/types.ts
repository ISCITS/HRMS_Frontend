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

export type EmployeePayrollInputStatus = "Draft" | "Submitted" | "Approved" | "Locked";
export type EmployeePayrollInputLineType =
  | "addition"
  | "deduction"
  | "recovery"
  | "arrear"
  | "reimbursement";

export type PayrollSelectOption = {
  intID: number;
  strLabel: string;
  strCode: string;
};

export type PayrollRunOption = PayrollSelectOption & {
  strScopeType?: PayrollRunScopeType;
  intScopedEmployeeID?: number | null;
  dtPayrollMonth: string;
  decCalendarDays?: number | null;
  strStatus: string;
  blnIsLocked: boolean;
};

export type PayrollRunScopeType = "All" | "SelectedEmployee";

export type PayrollRunStatus =
  | "DRAFT"
  | "VALIDATED"
  | "PROCESSED"
  | "FINALIZED"
  | "CANCELLED";

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
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  strValidationCode: string;
  strValidationLevel: string;
  strValidationMessage: string;
  blnIsBlocking: boolean;
  blnIsResolved?: boolean;
  strEntityName?: string | null;
  intEntityID?: number | null;
  strCategory?: string;
  strSeverity?: "BLOCKING" | "WARNING" | "INFO";
  objNavigationTarget?: { strEntityName: string; intEntityID: number | null } | null;
};

export type PayrollValidationCategorySummary = {
  strCategory: string;
  intBlockingCount: number;
  intWarningCount: number;
  intInfoCount: number;
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
  lstCategorySummary?: PayrollValidationCategorySummary[];
  dicAttendanceSync?: AttendanceValidateRunResult | null;
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
  dicAttendanceSync?: AttendanceValidateRunResult | null;
  lstExceptions: {
    intEmployeeID: number;
    strEmployeeCode: string;
    strMessage: string;
  }[];
};

export type PayrollRunRecord = {
  intID: number;
  /** Public identifier the UI routes on; the internal id stays out of the address bar. */
  strRecordUUID: string;
  intPayrollCycleID: number;
  strPayrollScheduleName: string | null;
  strPayrollGroupName: string | null;
  strRunCode: string;
  strRunName: string;
  strScopeType: PayrollRunScopeType;
  intScopedEmployeeID: number | null;
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  intRunTypeID: number | null;
  strRunTypeCode: string;
  dtPaymentDate: string | null;
  intVariablePayTypeID: number | null;
  intReferencePayrollRunID: number | null;
  blnIsLocked: boolean;
  intEmployeeCount: number;
  intProcessedEmployeeCount: number;
  intFailedEmployeeCount: number;
  blnHasPayrollResults: boolean;
  decGrossPayTotal: number;
  decDeductionTotal: number;
  decTaxTotal: number;
  decNetPayTotal: number;
  decEmployerContributionTotal: number;
  decNonWageCapPercent: number | null;
  strFinancialYearCode: string | null;
  strValidationStatus: string | null;
  intReprocessCount: number;
  strRemarks: string | null;
  dtLastExecutedOn: string | null;
  dicSummary: PayrollRunSummary;
};

export type PayrollRunListRecord = PayrollRunRecord;

export type PayrollRunDetailRecord = PayrollRunRecord & {
  dtAddedOn: string | null;
  dtLastModifiedOn: string | null;
  dtClosedOn: string | null;
  lstValidationResults: PayrollValidationResultRecord[];
  lstProcessedResults?: Array<PayrollResultRecord & { lstLines?: PayrollResultLineRecord[] }>;
};

export type PayrollRunFormValues = {
  intPayrollCycleID: number | "";
  strRunName: string;
  strScopeType: PayrollRunScopeType;
  strProcessFor: "AllEmployees" | "SelectedEmployees" | "PayrollGroup";
  intScopedEmployeeID: number | "";
  dtPayrollMonth: string;
  strRunStatus: PayrollRunStatus;
  blnIsLocked: boolean;
  strRemarks: string;
  intRunTypeID: number | "";
  dtPaymentDate: string;
  intVariablePayTypeID: number | "";
  intReferencePayrollRunID: number | "";
};

export type PayrollRunTypeLookupOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
};

export type VariablePayTypeOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
  intSalaryComponentID: number | null;
};

export type PayrollRunFormOptions = {
  lstPayrollCycles: Array<{
    intID: number;
    strLabel: string;
    strCode: string;
    strPeriodType: string;
    intPayrollGroupID: number | null;
    strPayrollGroupName: string | null;
  }>;
  lstEmployees: PayrollSelectOption[];
  lstPayrollRunTypeLookups?: PayrollRunTypeLookupOption[];
  lstVariablePayTypes?: VariablePayTypeOption[];
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
export type FNFRecoveryType = "NOTICE" | "LOAN" | "ADVANCE" | "ASSET" | "EXCESS_SALARY" | "OTHER";

export type FNFEmployeeOption = {
  intID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strLabel: string;
};

export type FNFDefaultPayrollRunOption = {
  intID: number;
  strRunCode: string;
  strRunName: string;
  strScopeType: PayrollRunScopeType;
  intScopedEmployeeID?: number | null;
  dtPayrollMonth: string;
  strRunStatus: string;
  blnIsLocked: boolean;
  blnIsFinalSettlementRun: boolean;
};

export type FNFSettlementLineRecord = {
  intID: number;
  strLineType: FNFLineType;
  strRecoveryType?: FNFRecoveryType | null;
  strLineCode: string;
  strLineName: string;
  intSalaryComponentID?: number | null;
  decAmount: number;
  decActualAmount?: number | null;
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
  /** Public identifier used in URLs and API paths; the internal id stays server-side. */
  strRecordUUID: string;
  intEmployeeID: number;
  strEmployeeCode?: string | null;
  strDepartmentName?: string | null;
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
  dtAddedOn?: string | null;
  dtLastModifiedOn?: string | null;
  lstLines?: FNFSettlementLineRecord[];
  lstAudit?: FNFAuditRecord[];
};

export type FNFSettlementFormValues = {
  intEmployeeID?: number | "";
  strEmployeeCode: string;
  strSettlementNumber: string;
  intPayrollRunID: number | "";
  strPayrollCycleCode?: string;
  strExitType: string;
  strExitReason: string;
  dtResignationDate: string;
  dtLastWorkingDate: string;
  dtSettlementDate: string;
  dtSettlementMonth: string;
  decNoticePeriodDays: string;
  decNoticeServedDays: string;
  decNoticeShortfallDays: string;
  decWorkDays?: string;
  decDaysWorked?: string;
  strCurrencyCode: string;
  strRemarks: string;
  lstLeaveEncashments?: FNFLeaveEncashmentFormValue[];
};

export type FNFLeaveEncashmentFormValue = {
  strLeaveTypeCode: string;
  strLeaveTypeName: string;
  decBalanceDays: string;
  decEncashableDays: string;
};

export type FNFLineFormValues = {
  intID?: number;
  strLineType: FNFLineType;
  strRecoveryType: FNFRecoveryType | "";
  strLineCode: string;
  strLineName: string;
  decActualAmount: string;
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

export type LoanAdvanceStatus = "draft" | "sent_back" | "pending_approval" | "approved" | "disbursed" | "active" | "closed" | "rejected" | "cancelled";
export type LoanAdvanceRequestType = "loan" | "advance";

export type LoanAdvanceCategoryRecord = {
  intID: number;
  strCategoryCode: string;
  strCategoryName: string;
  strRequestType: LoanAdvanceRequestType;
  strCategoryDescription?: string | null;
  decMaxRequestAmount?: number | null;
  intMaxInstallments?: number | null;
  decMinInstallmentAmount?: number | null;
  decDeductionCapPercent?: number | null;
  blnPreventDuplicateActive?: boolean;
  blnDocumentRequired?: boolean;
  blnInterestApplicable?: boolean;
  decCompanyInterestRatePercent?: number;
  blnPerquisiteTaxApplicable?: boolean;
  decBenchmarkInterestRatePercent?: number;
  strCalculationBasis?: string;
  strInterestRecoveryMode?: string;
  blnAutoDeductInPayroll?: boolean;
  blnFNFRecoveryEnabled?: boolean;
};

export type LoanAdvanceEmployeeRecord = {
  intID: number;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  strDepartmentName?: string | null;
};

export type LoanAdvanceScheduleRecord = {
  intID: number;
  intInstallmentNo: number;
  dtPayrollMonth: string;
  decOpeningPrincipalBalance: number;
  decPrincipalDueAmount: number;
  decActualInterestAmount?: number;
  decBenchmarkInterestAmount?: number;
  decTaxablePerquisiteAmount?: number;
  decTotalDueAmount: number;
  decRecoveredPrincipalAmount?: number;
  decRecoveredInterestAmount?: number;
  decRecoveredTotalAmount?: number;
  decClosingPrincipalBalance: number;
  strScheduleStatus: string;
};

export type LoanAdvanceLedgerRecord = {
  intID: number;
  strLedgerEvent: string;
  strFromStatus?: string | null;
  strToStatus?: string | null;
  decEventAmount: number;
  decBalanceAfterEvent?: number;
  strRemarks?: string | null;
  dtEventOn: string;
};

export type LoanAdvanceRecord = {
  intID: number;
  /** Public identifier used in URLs and API paths; the internal id stays server-side. */
  strRecordUUID: string;
  intEmployeeID: number;
  strLoanAdvanceNumber?: string | null;
  strRequestType: LoanAdvanceRequestType;
  intCategoryID: number;
  dtRequestDate: string;
  decRequestedAmount: number;
  decApprovedAmount: number;
  decDisbursedAmount?: number;
  decTotalOutstandingAmount?: number;
  strReason?: string | null;
  strEmployeeRemarks?: string | null;
  strApproverRemarks?: string | null;
  strPayrollRemarks?: string | null;
  strRecoveryMode: string;
  dtRecoveryStartMonth?: string | null;
  intNumberOfInstallments: number;
  decInstallmentAmount: number;
  blnLastInstallmentAdjustment?: boolean;
  blnAutoDeductInPayroll?: boolean;
  blnPerquisiteTaxApplicable?: boolean;
  decBenchmarkInterestRatePercent?: number;
  decTaxablePerquisiteYTD?: number;
  strWorkflowStatus: LoanAdvanceStatus;
  dtDisbursementDate?: string | null;
  strPaymentMode?: string | null;
  strTransactionReferenceNo?: string | null;
  objEmployee?: LoanAdvanceEmployeeRecord | null;
  objCategory?: LoanAdvanceCategoryRecord | null;
  objPolicySnapshot?: LoanAdvanceCategoryRecord | Record<string, unknown> | null;
  objCalculationSnapshot?: Record<string, unknown> | unknown[] | null;
  lstSchedule?: LoanAdvanceScheduleRecord[];
  lstLedger?: LoanAdvanceLedgerRecord[];
};

export type LoanAdvanceFormValues = {
  intEmployeeID: number | "";
  strEmployeeCode: string;
  strRequestType: LoanAdvanceRequestType;
  intCategoryID: number | "";
  dtRequestDate: string;
  decRequestedAmount: string;
  decApprovedAmount: string;
  strReason: string;
  strEmployeeRemarks: string;
  strApproverRemarks: string;
  strPayrollRemarks: string;
  strRecoveryMode: string;
  dtRecoveryStartMonth: string;
  intNumberOfInstallments: string;
  decInstallmentAmount: string;
  blnLastInstallmentAdjustment: boolean;
  blnAutoDeductInPayroll: boolean;
};

export type LoanBudgetEmployeeScope = "all" | "specific";

export type LoanBudgetSummaryRecord = {
  intID: number;
  strFinancialYear: string;
  decTotalBudgetAmount: number;
  decApprovedTotal: number;
  decOutstandingTotal: number;
  decRemaining: number;
  blnIsActive: boolean;
  strRemarks?: string | null;
};

export type LoanBudgetEmployeeLimitRecord = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  decLimitAmount: number;
};

export type LoanBudgetDesignationLimitRecord = {
  intID: number;
  intDesignationID: number;
  strDesignationName?: string | null;
  strEmployeeScope: LoanBudgetEmployeeScope;
  decLimitAmount: number;
  lstEmployees: LoanBudgetEmployeeLimitRecord[];
};

export type LoanBudgetConfigurationRecord = {
  objBudget: LoanBudgetSummaryRecord;
  lstDesignationLimits: LoanBudgetDesignationLimitRecord[];
};

export type LoanBudgetFormValues = {
  strFinancialYear: string;
  decTotalBudgetAmount: string;
  strRemarks: string;
  lstDesignationLimits: {
    intDesignationID: number | "";
    decLimitAmount: string;
    strEmployeeScope: LoanBudgetEmployeeScope;
    lstEmployees: { intEmployeeID: number; strEmployeeCode: string; strEmployeeName: string; decLimitAmount: string }[];
  }[];
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
  /** Public identifier used in URLs and API paths; the internal id stays server-side. */
  strRecordUUID: string;
  intPayrollRunID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  strRunStatus: string;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  decCalendarDays: number | null;
  decWorkingDays: number | null;
  decPaidDays: number | null;
  decPayableDays: number | null;
  decLwpDays: number | null;
  decLopDays: number | null;
  strManualLwpSource: string | null;
  dtManualLwpCapturedOn: string | null;
  intManualLwpCapturedBy: number | null;
  strManualLwpReason: string | null;
  strRemarks: string | null;
  strStatus: EmployeePayrollInputStatus;
  blnIsLocked: boolean;
  intAdjustmentLineCount?: number;
  lstValidationMessages?: Array<{
    strLevel: string;
    strCode: string;
    strMessage: string;
    blnBlocking: boolean;
  }>;
};

export type EmployeePayrollInputListRecord = EmployeePayrollInputRecord;

export type EmployeePayrollInputDetailRecord = EmployeePayrollInputRecord & {
  lstLines: EmployeePayrollInputLineRecord[];
};

// ---------------------------------------------------------------------------
// Attendance-to-payroll integration (Stage 2/3)
// ---------------------------------------------------------------------------

export type AttendanceIntegrationStatusRecord = {
  strIntegrationStatus: "NOT_STARTED" | "IMPORTED" | "FINALIZED" | "REOPENED";
  intVersionNumber: number | null;
  intEmployeeCount: number;
  intReadyCount: number;
  intBlockedCount: number;
  intWarningCount: number;
  dtImportedOn: string | null;
  dtFinalizedOn: string | null;
  dtReopenedOn: string | null;
  strReopenReason: string | null;
};

export type AttendanceValidateRunResult = {
  intTotalEmployees: number;
  intReadyCount: number;
  intBlockedCount: number;
  intWarningCount: number;
  intAppliedCount: number;
  intFinalizedLockedCount: number;
  intPreservedManualCount: number;
  intSkippedCount: number;
  intInputLockedCount: number;
  dicIntegrationStatus?: AttendanceIntegrationStatusRecord;
};

export type AttendanceReasonEntry = {
  strCode: string | null;
  strMessage: string | null;
  dtDate: string | null;
};

export type AttendanceDayBreakdownEntry = {
  strStatus: string | null;
  decPaidFraction: number | string | null;
  strSource: string | null;
};

export type EmployeeAttendancePreview = {
  decCalendarDays: number;
  decWorkingDays: number;
  decAttendanceDays: number;
  decPaidDays: number;
  decLwpLopDays: number;
  decPayableDays: number;
  decDenominator?: number;
  strDenominatorSource?: string | null;
  strReconciliationStatus?: string | null;
  dtEffectiveStart: string;
  dtEffectiveEnd: string;
  blnHasZeroServiceDays: boolean;
  blnBlocked: boolean;
  lstBlockingReasons: AttendanceReasonEntry[];
  lstWarnings: AttendanceReasonEntry[];
  dicDayBreakdown: Record<string, AttendanceDayBreakdownEntry>;
};

export type AttendanceTraceJson = {
  dtEffectiveStart: string | null;
  dtEffectiveEnd: string | null;
  blnBlocked: boolean;
  lstBlockingReasons: AttendanceReasonEntry[];
  lstWarnings: AttendanceReasonEntry[];
  decDenominator?: string | null;
  strDenominatorSource?: string | null;
  strReconciliationStatus?: string | null;
  dicDayBreakdown: Record<string, AttendanceDayBreakdownEntry>;
} | null;

export type AttendanceTraceRecord = {
  intID: number;
  intPayrollRunID: number;
  intEmployeeID: number;
  objAttendanceTraceJson: AttendanceTraceJson;
};

// Fields mirror clsPayrollRepository.listArrearInputLinesForEmployee's actual return
// shape - there is no strAdjustmentType/strEarningRecovery/decDifferenceAmount/
// strStatus/intSourceRunID field on the backend response despite caption keys
// (ARREARS_FIELD_ADJUSTMENT_TYPE, ARREARS_FIELD_EARNING_RECOVERY,
// ARREARS_FIELD_DIFFERENCE_AMOUNT, ARREARS_FIELD_SOURCE_RUN, ARREARS_FIELD_STATUS, etc.)
// existing for a richer UI - only render what is actually present here.
export type ArrearAdjustmentLine = {
  intID: number;
  intSalaryComponentID: number | null;
  strComponentCode: string | null;
  strComponentName: string | null;
  strLineType: string;
  decAmount: number;
  strRemarks: string | null;
  strSourceType: string;
  intSourceEntityID: number | null;
  intSourceEntityLineID: number | null;
  strSourceVersionRef: string | null;
  dtAddedOn: string | null;
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
  strCalendarDays: string;
  strWorkingDays: string;
  strPaidDays: string;
  strPayableDays: string;
  strLwpDays: string;
  strLopDays: string;
  strManualLwpReason: string;
  strManualLwpSource: string;
  dtManualLwpCapturedOn: string | null;
  intManualLwpCapturedBy: number | null;
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
  decCalculatedAmount?: number | null;
  decOriginalAmount?: number | null;
  decProratedAmount?: number | null;
  decQuantity?: number | null;
  decRate?: number | null;
  strSourceType?: string | null;
  intSourceEntityID?: number | null;
  intSourceEntityLineID?: number | null;
  strSourceLabel?: string | null;
  intFlexiAllocationID?: number | null;
  blnIsFlexiComponent?: boolean;
  blnIsFlexiResidual?: boolean;
  blnIsEmployerContribution?: boolean;
  blnIsEmployeeDeduction?: boolean;
  blnIsTaxLine?: boolean;
  blnIsDeclaredFlexi?: boolean;
  blnIsResidualTaxable?: boolean;
  blnIncludeInGross?: boolean;
  blnIncludeInNetPay?: boolean;
  blnIncludeInPayslip?: boolean;
  strCalculationSource?: string | null;
  objCalculationTrace?: Record<string, unknown> | null;
  dicLwpTrace?: Record<string, unknown> | null;
  blnIsWages?: boolean | null;
  blnIncludeInRemuneration?: boolean | null;
  strPayslipSection?: string | null;
  strBasisSnapshot?: string | null;
  strFormulaSnapshot?: string | null;
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

export type WageRulePreviewRecord = {
  wage_total?: number | null;
  non_wage_total?: number | null;
  wage_percent_of_ctc?: number | null;
  minimum_required_wage?: number | null;
  deemed_wage_shortfall?: number | null;
  deemed_wage_base?: number | null;
  calculation_basis?: string | null;
  threshold_percent?: number | null;
  total_remuneration_base?: number | null;
  total_remuneration_base_annual?: number | null;
  ctc_annual?: number | null;
  gross_annual?: number | null;
};

export type PayrollResultRecord = {
  intID: number;
  /** Public identifier used in URLs and API paths; the internal id stays server-side. */
  strRecordUUID: string;
  intPayrollRunID: number;
  /** The run's public identifier, so run-scoped calls from result screens need no internal id. */
  strPayrollRunRecordUUID: string | null;
  intEmployeePayrollInputID: number | null;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
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
  decOriginalSalaryAmount?: number;
  decLwpReductionAmount?: number;
  decGrossEarningsAmount: number;
  decEarningsSectionTotal?: number;
  decReimbursementSectionTotal?: number;
  decEmployeeDeductionTotal: number;
  decTaxTotal: number;
  decTotalEmployerCost: number;
  decFlexiBucketAmount: number;
  decDeclaredFlexiAmount: number;
  decResidualFlexiAmount: number;
  strRegimeUsed: string | null;
  decTaxableIncome: number;
  decAnnualTaxAmount: number;
  decMonthlyTds: number;
  dicTaxSummary?: {
    strRegimeUsed: string | null;
    decTaxableIncome: number;
    decProjectedTaxableIncome: number;
    decExemptionAmount: number;
    decDeclaredDeductionAmount: number;
    decStandardDeductionAmount: number;
    decTotalDeductionAmount: number;
    decAnnualTaxAmount: number;
    decTaxBeforeRebate: number;
    decRebateAmount: number;
    decMarginalRebateReliefAmount: number;
    decTaxAfterRebate: number;
    decSurchargeAmount: number;
    decMarginalSurchargeReliefAmount: number;
    decTaxAfterSurcharge: number;
    decCessAmount: number;
    decTotalTaxLiability: number;
    decMonthlyTds: number;
    intRemainingMonths: number | null;
    strRegimeTypeCode?: string | null;
    strSlabProfileCode?: string | null;
    strTaxRuleVersion?: string | null;
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
  dtPeriodStartDate?: string | null;
  dtPeriodEndDate?: string | null;
  decCalendarDays?: number | null;
  decPaidDays: number | null;
  decLwpDays?: number | null;
  decLopDays: number | null;
  intPayslipID: number | null;
  /** Public identifier the payslip-document URL routes on; null when no payslip exists yet. */
  strPayslipRecordUUID?: string | null;
  strPayslipNumber: string | null;
  strPayslipStatus: string | null;
  blnPayslipGenerated: boolean;
  dtPayslipGeneratedOn: string | null;
  strRemarks: string | null;
  objCalculationSnapshot?: Record<string, unknown> | unknown[] | null;
  objCalculationTrace?: Record<string, unknown> | null;
  dicWageRulePreview?: WageRulePreviewRecord | null;
};

export type PayrollResultListRecord = PayrollResultRecord;

export type PayrollResultDetailRecord = PayrollResultRecord & {
  lstLines: PayrollResultLineRecord[];
  lstStatutoryResults?: PayrollStatutoryResultRecord[];
};

export type TaxDeclarationItemRecord = {
  strCategoryCode: string | null;
  strSectionCode: string | null;
  strCategoryType: string | null;
  decDeclaredAmount: number;
  decApprovedAmount: number;
};

export type TaxSlabTraceRecord = {
  mode?: string;
  intSlabID?: number | null;
  from_amount: number;
  to_amount: number | null;
  taxable_amount: number;
  rate_percent: number;
  fixed_tax_amount?: number;
  tax_amount: number;
  slab_profile_code?: string | null;
};

export type TaxCessRuleRecord = {
  strCalculationBaseCode: string | null;
  fltCessRatePercent: number | null;
  decBaseAmount: number;
  decCessAmount: number;
};

export type TaxCalculationDetailRecord = {
  intResultID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strFinancialYearCode: string | null;
  strRegimeUsed: string | null;
  strRegimeTypeCode: string | null;
  decGrossTaxableIncomeYtd: number;
  decProjectedTaxableIncome: number;
  dicExemptions: {
    decTotalAmount: number;
    lstItems: TaxDeclarationItemRecord[];
  };
  dicDeductions: {
    decDeclaredTotalAmount: number;
    lstItems: TaxDeclarationItemRecord[];
    decStandardDeductionAmount: number;
    dicStandardDeductionRule: Record<string, unknown> | null;
  };
  decNetTaxableIncome: number;
  lstSlabTrace: TaxSlabTraceRecord[];
  decTaxBeforeRebate: number;
  dicRebate: {
    decAmount: number;
    decMarginalReliefAmount: number;
    dicRule: Record<string, unknown> | null;
  };
  decTaxAfterRebate: number;
  dicSurcharge: {
    decAmount: number;
    decMarginalReliefAmount: number;
    dicRule: Record<string, unknown> | null;
  };
  decTaxAfterSurcharge: number;
  dicCess: {
    decTotalAmount: number;
    lstRules: TaxCessRuleRecord[];
  };
  decTotalTaxLiability: number;
  decTaxDeductedYtd: number;
  decMonthlyTds: number;
  intRemainingMonths: number | null;
  strSlabProfileCode: string | null;
  strTaxRuleVersion: string | null;
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
  strDepartmentName?: string | null;
  strLocationName?: string | null;
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

export type TdsReportRow = {
  intID: number;
  intEmployeePayrollResultID: number;
  intEmployeeID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
  strStatus: string;
  strFinancialYearCode: string | null;
  strRegimeUsed: string | null;
  decGrossTaxableIncomeYtd: number;
  decNetTaxableIncome: number;
  decTotalTaxLiability: number;
  decTaxDeductedYtd: number;
  decMonthlyTds: number;
  strSlabProfileCode: string | null;
};

export type VariablePayRegisterRow = {
  intID: number;
  intPayrollRunID: number;
  strRunCode: string;
  strRunName: string;
  dtPayrollMonth: string | null;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strVariablePayTypeName: string;
  strComponentName: string;
  decInputAmount: number;
  decApprovedAmount: number;
  decFinalAmount: number;
  strTransactionStatus: string;
  strSourceType: string;
  strExternalReference: string | null;
  strRemarks: string | null;
  strRegimeUsed: string | null;
  decGrossEarningsAmount: number;
  decTaxTotal: number;
  decNetPayAmount: number;
  strPayrollRunStatus: string;
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
  /** Public identifier the payslip-document URL routes on; null when no payslip exists yet. */
  strPayslipRecordUUID?: string | null;
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
  lstReimbursements?: PayslipLineRecord[];
  lstStatutoryInformation?: PayslipLineRecord[];
  lstInformation: PayslipLineRecord[];
  lstEmployerContributions: PayslipLineRecord[];
  dicTax?: {
    strRegimeUsed: string | null;
    decTaxableIncome: number;
    decProjectedTaxableIncome?: number;
    decExemptionAmount?: number;
    decDeclaredDeductionAmount?: number;
    decStandardDeductionAmount?: number;
    decTotalDeductionAmount?: number;
    decTaxBeforeRebate?: number;
    decRebateAmount?: number;
    decMarginalRebateReliefAmount?: number;
    decTaxAfterRebate?: number;
    decSurchargeAmount?: number;
    decMarginalSurchargeReliefAmount?: number;
    decTaxAfterSurcharge?: number;
    decCessAmount?: number;
    decAnnualTaxAmount: number;
    decCurrentMonthTds: number;
    decTotalTaxLiability: number;
    intRemainingMonths: number | null;
    strRegimeTypeCode?: string | null;
    strSlabProfileCode?: string | null;
    strTaxRuleVersion?: string | null;
  };
  dicTotals: {
    decGrossEarnings: number;
    decEmployeeDeductions: number;
    decTaxTotal: number;
    decTotalDeductions: number;
    decNetPay: number;
    decEmployerContributionTotal: number;
    decTotalEmployerCost: number;
    strNetPayInWords: string;
  };
  dicSummary?: {
    decFlexiBucketAmount: number;
    decDeclaredFlexiAmount: number;
    decResidualFlexiAmount: number;
    decGrossEarningsAmount: number;
    decEmployeeDeductionTotal: number;
    decTaxTotal: number;
    decEmployerContributionTotal: number;
    decTotalEmployerCost: number;
  };
  dicFooter?: {
    strPayrollRunCode: string;
    strPayrollRunName: string;
    intPayrollResultID: number;
    intPayrollResultVersion: number;
    strPayslipNumber: string | null;
    strPayslipStatus: string;
    dtGeneratedOn: string | null;
    strSystemNote: string;
  };
  objTemplateSettings: Record<string, unknown>;
  strRemarks: string | null;
};

export type PayslipRunListRecord = {
  intPayslipID: number | null;
  /** Public identifier the payslip-document URL routes on; null when no payslip exists yet. */
  strPayslipRecordUUID?: string | null;
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
  /** Public identifier the payslip-document URL routes on; null when no payslip exists yet. */
  strPayslipRecordUUID?: string | null;
    strPayslipNumber: string | null;
    strEmployeeCode: string | null;
    strEmployeeName: string | null;
    strPayslipStatus: string | null;
  }[];
};

export type Form16ListRecord = {
  intForm16ID: number;
  /** Public identifier the Form 16 document URL routes on. */
  strRecordUUID: string;
  strForm16Number: string;
  strFinancialYearCode: string;
  strGenerationStatus: string;
  intSupersededForm16ID: number | null;
  dtGeneratedOn: string | null;
  dtPeriodStart: string | null;
  dtPeriodEnd: string | null;
  decGrossSalary: number;
  decTotalTaxDeducted: number;
  strEmployeeCode: string | null;
  strEmployeeName: string | null;
};

export type Form16QuarterlyBreakdown = {
  strQuarterCode: string;
  dtQuarterStart: string;
  dtQuarterEnd: string;
  decTaxableAmount: number;
  decTaxDeducted: number;
  decTaxDeposited: number;
};

export type Form16DeclarationBreakupRow = {
  strSectionCode: string;
  strCategoryName: string;
  decDeclaredAmount: number;
  decEligibleAmount: number;
};

export type Form16PreviewRecord = {
  intForm16ID: number;
  strForm16Number: string;
  strFinancialYearCode: string;
  strAssessmentYear: string;
  strGenerationStatus: string;
  dtPeriodStart: string | null;
  dtPeriodEnd: string | null;
  dtGeneratedOn: string | null;
  dicCompany: {
    strCompanyName: string;
    strCompanyAddress: string | null;
    strCompanyTan: string | null;
    strCompanyPan: string | null;
  };
  dicEmployee: {
    strEmployeeCode: string;
    strEmployeeName: string;
    strPanNumber: string | null;
    strWorkEmail: string | null;
  };
  strTaxRegimeLabel: string | null;
  dicAnnualSummary: Record<string, number>;
  lstQuarterlyBreakdown: Form16QuarterlyBreakdown[];
  lstDeclarationBreakup: Form16DeclarationBreakupRow[];
  decYtdReconciliationVariance: number;
  strSignatoryName: string | null;
  strSignatoryDesignation: string | null;
};

export type Form16GenerateResultRow = {
  intEmployeeID: number;
  blnSuccess: boolean;
  intForm16ID: number | null;
  strForm16Number: string | null;
  strEmployeeName: string | null;
  strMessage: string | null;
};

export type Form16GenerateCompanySummary = {
  intGeneratedCount: number;
  intFailedCount: number;
  lstResults: Form16GenerateResultRow[];
};
