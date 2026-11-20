/** Employee Separation (Phase 1) - mirrors HRMS_Backend EmployeeSeparationService payloads. */

export type SeparationStatus = "DRAFT" | "ACTIVATED" | "CANCELLED" | "COMPLETED";
export type RegularPayrollPolicyCode = "ACTIVATION_MONTH" | "LWD_MONTH" | "POST_LWD_MONTH";

export type CodeLabel = { strCode: string; strLabel: string };

export type SeparationSettlementRef = {
  intID: number;
  strRecordUUID: string | null;
  strSettlementNumber: string | null;
  strSettlementStatus: string;
  dtLastWorkingDate: string | null;
};

export type SeparationRow = {
  intID: number;
  strRecordUUID: string;
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartmentName: string | null;
  strLocationName: string | null;
  strEmploymentStatus: string;
  strActionStatus: SeparationStatus;
  strActionStatusLabel: string;
  strSeparationType: string;
  strSeparationTypeLabel: string;
  strSeparationReason: string | null;
  dtResignationDate: string | null;
  dtLastWorkingDate: string;
  dtActivatedOn: string | null;
  dtCancelledOn: string | null;
  strCancellationReason: string | null;
  strExclusionPolicyCode: RegularPayrollPolicyCode | null;
  strExclusionPolicyLabel: string | null;
  dtExclusionFromMonth: string | null;
  strExclusionFromMonthLabel: string | null;
  strRemarks: string | null;
  strFnfStatus: string;
  objSettlement: SeparationSettlementRef | null;
  blnCanCreateFNF: boolean;
  blnCanOpenFNF: boolean;
  blnCanCancel: boolean;
  strCancelBlockedReason: string | null;
};

export type SeparationHistoryEntry = {
  intID: number;
  strEventCode: string;
  objOldValues: Record<string, unknown> | null;
  objNewValues: Record<string, unknown> | null;
  strReason: string | null;
  intActorUserID: number | null;
  dtOccurredOn: string | null;
};

export type SeparationDetail = SeparationRow & {
  objPolicySnapshot: Record<string, unknown> | null;
  strPayrollProcessingStatus: string;
  dtDateOfJoining: string | null;
  lstSettlements: SeparationSettlementRef[];
  lstHistory: SeparationHistoryEntry[];
};

export type SeparationListResponse = {
  lstRows: SeparationRow[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
};

export type SeparationListQuery = {
  search?: string;
  department_id?: string;
  location_id?: string;
  status?: string;
  fnf_status?: string;
  lwd_from?: string;
  lwd_to?: string;
  activation_from?: string;
  activation_to?: string;
  resignation_from?: string;
  resignation_to?: string;
  exclusion_month?: string;
  page: number;
  page_size: number;
  sort?: string;
  direction?: "asc" | "desc";
};

export type SeparationLookups = {
  lstDepartments: Array<{ intID: number; strLabel: string }>;
  lstLocations: Array<{ intID: number; strLabel: string }>;
  lstSeparationTypes: CodeLabel[];
  lstSeparationStatuses: CodeLabel[];
  lstFnfStatuses: CodeLabel[];
  lstPolicyOptions: CodeLabel[];
};

export type SeparationEmployeeOption = {
  intID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strLabel: string;
  strDepartmentName: string | null;
  strLocationName: string | null;
  strEntityName?: string | null;
  strDesignationName?: string | null;
  dtDateOfJoining: string | null;
  strEmploymentStatus: string;
  intNoticePeriodDays: number | null;
};

export type SeparationRequest = {
  intEmployeeID: number;
  strSeparationType: string;
  strSeparationReason?: string | null;
  dtResignationDate?: string | null;
  dtLastWorkingDate: string;
  strRemarks?: string | null;
  strOverridePolicyCode?: string | null;
  strOverrideReason?: string | null;
  blnAcknowledgeWarnings?: boolean;
};

export type SeparationIssue = { strCode: string; strMessage: string };

export type SeparationPolicyResolved = {
  intPolicyID: number | null;
  strPolicyCode: RegularPayrollPolicyCode;
  strPolicyLabel: string;
  blnAllowHrOverride: boolean;
  strSource: "COMPANY" | "TENANT" | "DEFAULT";
  dtEffectiveFrom: string | null;
};

export type SeparationPreview = {
  objEmployee: SeparationEmployeeOption;
  dtActivationDate: string;
  dtLastWorkingDate: string;
  dicPolicy: SeparationPolicyResolved;
  strAppliedPolicyCode: RegularPayrollPolicyCode;
  strAppliedPolicyLabel: string;
  blnPolicyOverridden: boolean;
  dtExclusionFromMonth: string;
  strExclusionFromMonthLabel: string;
  strSummary: string;
  lstImpactedRuns: Array<{ intRunID: number; strRunCode: string; strMonth: string; strRunStatus: string; blnFinalized: boolean }>;
  lstErrors: SeparationIssue[];
  lstWarnings: SeparationIssue[];
  blnCanActivate: boolean;
};

export type SeparationCancelCheck = {
  blnCanCancel: boolean;
  lstErrors: SeparationIssue[];
  lstWarnings: SeparationIssue[];
};

export type RegularPayrollPolicyVersion = {
  intID: number;
  strScope: "COMPANY" | "TENANT";
  strPolicyCode: RegularPayrollPolicyCode;
  strPolicyLabel: string;
  blnAllowHrOverride: boolean;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type RegularPayrollPolicyResponse = {
  objEffective: SeparationPolicyResolved;
  lstVersions: RegularPayrollPolicyVersion[];
  lstPolicyOptions: CodeLabel[];
  strDefaultPolicyCode: RegularPayrollPolicyCode;
};

export type RegularPayrollPolicySaveRequest = {
  strPolicyCode: RegularPayrollPolicyCode;
  blnAllowHrOverride: boolean;
  dtEffectiveFrom: string;
  blnCompanyOverride: boolean;
};
