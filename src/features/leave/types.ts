// DTOs for the Leave module, mirroring the backend serialization
// (app/repositories/LeaveRepository.py and app/services/LeaveBalanceService.py).

export type LeaveTypeDto = {
  intID: number;
  objRecordUUID?: string;
  intCompanyID: number | null;
  strTypeCode: string;
  strTypeName: string;
  blnIsPaid: boolean;
  strUnit: string;
  blnRequiresProof: boolean;
  blnAllowHalfDay: boolean;
  blnIsEncashable: boolean;
  intDisplayOrder: number;
  blnIsActive: boolean;
  strDescription?: string | null;
  strEmployeeHelpText?: string | null;
  blnRequiresReason?: boolean;
};

// Enterprise leave-type row (GET /leave/leave-types) — master + current-policy summary + localized name.
export type LeaveTypeEnrichedDto = {
  intID: number;
  intCompanyID: number | null;
  strTypeCode: string;
  strTypeName: string;
  strDisplayName: string;
  strDescription: string | null;
  strLeaveCategoryCode: string;
  blnIsPaid: boolean;
  strUnit: string;
  blnRequiresProof: boolean;
  blnAllowHalfDay: boolean;
  blnIsEncashable: boolean;
  blnBalanceTrackingRequired: boolean;
  blnIsStatutory: boolean;
  blnIsSpecialLeave: boolean;
  strPayrollTreatmentCode: string;
  strAttendanceStatusCode: string;
  strApprovalRouteCode: string;
  blnAllowEmployeeApply: boolean;
  blnAllowHrApplyOnBehalf: boolean;
  blnAllowMobileApply: boolean;
  blnAllowNegativeBalance: boolean;
  blnRequiresReason: boolean;
  blnSystemDefined: boolean;
  strColorCode: string | null;
  strIconName: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  intDisplayOrder: number;
  blnIsActive: boolean;
  intCurrentPolicyID: number | null;
  strAccrualFrequency: string | null;
  decAccrualQty: number | null;
  decEntitlementQty: number | null;
  blnCarryForwardAllowed: boolean | null;
  blnSandwichRuleEnabled: boolean | null;
  blnEncashmentAllowed: boolean | null;
  decMaxCarryForward: number | null;
};

// ---- Enterprise aggregate (full-page Add/View/Edit) ----
export type LeavePolicyAggregate = {
  intID?: number | null;
  intCompanyID?: number | null;
  strPolicyCode?: string | null;
  strPolicyName?: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
  blnIsActive: boolean;
  intLeaveYearStartMonth: number;
  intLeaveYearStartDay: number;
  decEntitlementQty: number;
  strAccrualFrequency: string;
  decAccrualQty: number;
  strAccrualTimingCode: string;
  strAccrualRoundingCode: string;
  intAccrualWaitingDays: number;
  blnAccrualAfterConfirmation: boolean;
  blnCreditOnJoining: boolean;
  blnCreditOnConfirmation: boolean;
  strJoinProrationBasisCode: string;
  blnExitProrationEnabled: boolean;
  intMinServiceDays: number;
  decMinPerApplication?: number | null;
  decMaxPerApplication?: number | null;
  decMaxConsecutiveDays?: number | null;
  intMaxApplicationsPerMonth?: number | null;
  intMaxApplicationsPerYear?: number | null;
  intMinNoticeDays: number;
  blnBackdatedApplicationAllowed: boolean;
  intMaxBackdateDays: number;
  blnFutureApplicationAllowed: boolean;
  intMaxAdvanceDays?: number | null;
  blnAllowDuringProbation: boolean;
  blnAllowDuringNoticePeriod: boolean;
  decMinBalanceAfterRequest?: number | null;
  blnHalfDayAllowed: boolean;
  blnHourlyLeaveAllowed: boolean;
  decMinimumHourQty?: number | null;
  strWeeklyOffTreatmentCode: string;
  strHolidayTreatmentCode: string;
  blnSandwichRuleEnabled: boolean;
  strSandwichScopeCode: string;
  strSandwichBoundaryCode: string;
  blnSandwichApplyOnDifferentLeaveTypes: boolean;
  blnCarryForwardAllowed: boolean;
  strCarryForwardLimitTypeCode: string;
  decMaxCarryForward?: number | null;
  decCarryForwardPercent?: number | null;
  intCarryForwardExpiryMonths?: number | null;
  decMaxBalance?: number | null;
  blnLapseExcessBalance: boolean;
  blnEncashmentAllowed: boolean;
  strEncashmentEventCode: string;
  decMaxEncashableDays?: number | null;
  decMinBalanceForEncashment?: number | null;
  strProofRuleCode: string;
  decProofRequiredAfterDays?: number | null;
  strProofDocumentTypeCode?: string | null;
  blnReasonMandatory: boolean;
  strBackupResourceRuleCode: string;
  strAutoActionCode: string;
  intAutoActionAfterDays?: number | null;
  strEscalationRoleCode?: string | null;
  blnCancellationBeforeStartAllowed: boolean;
  blnCancellationAfterStartAllowed: boolean;
  blnManagerCancelApprovedAllowed: boolean;
  intPolicySnapshotVersion?: number;
  strRemarks?: string | null;
};

export type LeaveTypeTextRow = {
  intLanguageID: number;
  strTypeName: string;
  strDescription?: string | null;
  strEmployeeHelpText?: string | null;
};

export type LeaveApplicabilityRow = {
  strApplicabilityTypeCode: string;
  intApplicabilityEntityID?: number | null;
  strApplicabilityValueCode?: string | null;
  blnIncludeFlag: boolean;
  intPriority: number;
};

export type LeaveApprovalStepRow = {
  intStepNo: number;
  strApproverSourceCode: string;
  intFixedRoleID?: number | null;
  intFixedEmployeeID?: number | null;
  blnActionRequired: boolean;
  blnSkipIfUnavailable: boolean;
  intNoActionAfterDays?: number | null;
  strNoActionRuleCode: string;
  intEscalationStepNo?: number | null;
};

export type LeaveCombinationRow = {
  intOtherLeaveTypeID: number;
  strCombinationRuleCode: string;
  intSequenceGapDays: number;
};

export type LeavePolicyRuleRow = {
  intRuleGroupNo: number;
  intRuleSequence: number;
  strAttributeCode: string;
  strOperatorCode: string;
  strValueFrom?: string | null;
  strValueTo?: string | null;
  strResultCode?: string | null;
  decResultNumeric?: number | null;
  strFailureMessage?: string | null;
};

export type LeaveTypeAggregate = {
  intID?: number;
  intCompanyID?: number | null;
  strTypeCode: string;
  strTypeName: string;
  strDescription?: string | null;
  strLeaveCategoryCode: string;
  strUnit: string;
  blnIsPaid: boolean;
  strPayrollTreatmentCode: string;
  strAttendanceStatusCode: string;
  blnBalanceTrackingRequired: boolean;
  blnIsStatutory: boolean;
  blnIsSpecialLeave: boolean;
  strApprovalRouteCode: string;
  intDisplayOrder: number;
  strColorCode?: string | null;
  strIconName?: string | null;
  blnIsActive: boolean;
  dtEffectiveFrom?: string | null;
  dtEffectiveTo?: string | null;
  blnAllowEmployeeApply: boolean;
  blnAllowHrApplyOnBehalf: boolean;
  blnAllowMobileApply: boolean;
  blnAllowNegativeBalance: boolean;
  blnRequiresReason: boolean;
  blnRequiresProof: boolean;
  blnAllowHalfDay: boolean;
  blnIsEncashable: boolean;
  objPolicy?: LeavePolicyAggregate | null;
  lstText: LeaveTypeTextRow[];
  lstApplicability: LeaveApplicabilityRow[];
  lstApprovalSteps: LeaveApprovalStepRow[];
  lstRules: LeavePolicyRuleRow[];
  lstCombinationRules: LeaveCombinationRow[];
  objUsage?: LeaveTypeUsageDto;
};

export type LeaveLookupOption = {
  intID: number;
  strValueCode: string;
  strDisplayName: string;
  strDescription: string | null;
  intDisplayOrder: number;
  blnIsActive: boolean;
};

export type LeaveLookups = Record<string, LeaveLookupOption[]>;

export type LeaveTypeUsageDto = {
  intPolicies: number;
  intApplications: number;
  intBalances: number;
  intLedgerEntries: number;
  intCombinationRules: number;
  blnInUse: boolean;
};

export type LeaveTypeRequest = {
  intCompanyID?: number | null;
  strTypeCode: string;
  strTypeName: string;
  blnIsPaid: boolean;
  strUnit: string;
  blnRequiresProof: boolean;
  blnAllowHalfDay: boolean;
  blnIsEncashable: boolean;
  intDisplayOrder: number;
  blnIsActive: boolean;
};

export type LeavePolicyDto = {
  intID: number;
  intCompanyID: number | null;
  intLeaveTypeID: number;
  strAccrualFrequency: string;
  decAccrualQty: number;
  decMaxCarryForward: number | null;
  decMaxBalance: number | null;
  intMinNoticeDays: number;
  decMinPerApplication: number | null;
  decMaxPerApplication: number | null;
  blnProRataOnJoin: boolean;
  strAppliesToGrade: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type LeavePolicyRequest = {
  intCompanyID?: number | null;
  intLeaveTypeID: number;
  strAccrualFrequency: string;
  decAccrualQty: number;
  decMaxCarryForward?: number | null;
  decMaxBalance?: number | null;
  intMinNoticeDays: number;
  decMinPerApplication?: number | null;
  decMaxPerApplication?: number | null;
  blnProRataOnJoin: boolean;
  strAppliesToGrade?: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
  blnIsActive: boolean;
};

export type LeaveBalanceDto = {
  intLeaveTypeID: number;
  strTypeCode: string;
  strTypeName: string;
  strUnit: string;
  blnIsPaid: boolean;
  decCredited: number;
  decAvailed: number;
  decHeld: number;
  decAvailable: number;
};

export type LeaveApplicationActionDto = {
  intID: number;
  strAction: string;
  strComment: string | null;
  intActorID: number | null;
  dtActionOn: string | null;
};

export type LeaveApplicationAttachmentDto = {
  intID: number;
  strFileName: string;
  strContentType: string;
  intFileSizeBytes: number;
  dtAddedOn: string | null;
};

export type LeaveValidationMessage = {
  strCode: string;
  strMessage: string;
  strField: string | null;
};

export type LeaveDateBreakdownDto = {
  dtDate: string;
  blnHoliday: boolean;
  strHolidayName: string | null;
  blnWeeklyOff: boolean;
  blnCounted: boolean;
  strCalculationReason: string;
  decDays: number;
};

export type LeavePreviewDto = {
  blnValid: boolean;
  lstErrors: LeaveValidationMessage[];
  lstWarnings: LeaveValidationMessage[];
  lstDateBreakdown: LeaveDateBreakdownDto[];
  decCalculatedDays: number;
  blnProofRequired: boolean;
  intLeavePolicyID: number | null;
  intLeavePlanAssignmentID: number | null;
  intBalanceID: number | null;
  decAvailableBefore: number | null;
  decAvailableAfter: number | null;
};

export type LeaveApplicationDto = {
  intID: number;
  intEmployeeID: number;
  intLeaveTypeID: number;
  strTypeCode: string | null;
  strTypeName: string | null;
  dtFromDate: string | null;
  dtToDate: string | null;
  decDays: number;
  blnFromHalf: boolean;
  blnToHalf: boolean;
  strFromHalfSession?: "first" | "second" | null;
  strToHalfSession?: "first" | "second" | null;
  strReason: string | null;
  intBackupEmployeeID?: number | null;
  strStatus: string;
  intCurrentApproverID: number | null;
  dtAppliedOn: string | null;
  dtDecidedOn: string | null;
  intDecidedBy: number | null;
  intLeavePolicyID?: number | null;
  intLeavePlanAssignmentID?: number | null;
  intVersionNo?: number;
  objCalculation?: LeavePreviewDto | null;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
  lstActions?: LeaveApplicationActionDto[];
  lstAttachments?: LeaveApplicationAttachmentDto[];
};

export type LeaveApplyRequest = {
  intLeaveTypeID: number;
  dtFromDate: string;
  dtToDate: string;
  blnFromHalf: boolean;
  blnToHalf: boolean;
  strFromHalfSession?: "first" | "second" | null;
  strToHalfSession?: "first" | "second" | null;
  strReason?: string | null;
  strContactDuringLeave?: string | null;
  strBackupEmployee?: string | null;
};

export type LeaveDraftRequest = LeaveApplyRequest & {
  intVersionNo?: number | null;
};

export type LeaveDecisionRequest = {
  strComment?: string | null;
  intVersionNo?: number | null;
};

export type LeaveReassignRequest = {
  intReassignToUserID: number;
  strComment: string;
  intVersionNo?: number | null;
};

export type LeaveOverrideRequest = {
  strAction: "approve" | "reject";
  strComment: string;
  intVersionNo?: number | null;
};

// ---- Approval-workflow DTOs (GET /leave/applications queue, timeline, route, team-calendar) ----
export type LeaveWorkflowStepDto = {
  intID: number;
  intStepNo: number;
  strApproverSourceCode: string;
  strStepStatus: string;
  strSkipReason?: string | null;
  dtAssignedOn?: string | null;
  dtActionOn?: string | null;
};

export type LeaveWorkflowDto = {
  intID: number;
  strWorkflowStatus: string;
  intCurrentStepNo: number | null;
  intVersionNo?: number;
  dtStartedOn?: string | null;
  dtCompletedOn?: string | null;
  lstSteps?: LeaveWorkflowStepDto[];
};

// A row in the approver queue: the serialized application + workflow cursor + enterprise-UX tags.
export type LeaveQueueItemDto = LeaveApplicationDto & {
  objWorkflow?: LeaveWorkflowDto | null;
  intCurrentStepNo?: number | null;
  blnIsDelegated?: boolean;
  blnIsOverdue?: boolean;
  blnIsConfidential?: boolean;
  blnIsMasked?: boolean;
  dtLastActionOn?: string | null;
};

export type LeaveTimelineEntryDto = {
  intID?: number;
  intStepNo?: number | null;
  strActionCode?: string | null;
  strStepStatus?: string | null;
  strApproverSourceCode?: string | null;
  intActorUserID?: number | null;
  intOnBehalfOfUserID?: number | null;
  strComment?: string | null;
  dtActionOn?: string | null;
  dtAssignedOn?: string | null;
};

export type LeaveTimelineDto = {
  intApplicationID: number;
  lstTimeline: LeaveTimelineEntryDto[];
};

export type LeaveRouteStepDto = {
  intStepNo: number;
  strApproverSourceCode: string;
  strStepStatus?: string | null;
  blnActionRequired?: boolean;
  intNoActionAfterDays?: number | null;
  strApproverName?: string | null;
};

export type LeaveWorkflowExceptionDto = {
  intID: number;
  intApplicationID: number;
  intWorkflowInstanceID?: number | null;
  intWorkflowStepID?: number | null;
  strExceptionCode?: string | null;
  strExceptionDetail?: string | null;
  blnIsResolved?: boolean;
  dtAddedOn?: string | null;
};

export type TeamCalendarEventDto = {
  intApplicationID: number;
  dtFromDate: string;
  dtToDate: string;
  strStatus: string;
  strLabel: string | null;
  blnIsConfidential: boolean;
  blnIsMasked: boolean;
};

export type TeamCalendarMemberDto = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  lstLeaveEvents: TeamCalendarEventDto[];
};

export type TeamCalendarDto = {
  intManagerEmployeeID: number;
  dtFromDate: string;
  dtToDate: string;
  lstEmployees: TeamCalendarMemberDto[];
};

export const LEAVE_UNIT_OPTIONS = ["day", "half_day", "hour"] as const;
export const ACCRUAL_FREQUENCY_OPTIONS = ["monthly", "yearly", "none"] as const;

export const LEAVE_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#fef3c7", fg: "#92400e" },
  approved: { bg: "#dcfce7", fg: "#166534" },
  rejected: { bg: "#fee2e2", fg: "#991b1b" },
  cancelled: { bg: "#f1f5f9", fg: "#475569" },
  withdrawn: { bg: "#f1f5f9", fg: "#475569" },
};

// Rotating palette for leave-type badges (the coloured "CL / OD / SV" circles).
export const LEAVE_TYPE_PALETTE: { bg: string; fg: string }[] = [
  { bg: "#dbeafe", fg: "#1e40af" }, // blue
  { bg: "#dcfce7", fg: "#166534" }, // green
  { bg: "#fef3c7", fg: "#92400e" }, // amber
  { bg: "#fae8ff", fg: "#86198f" }, // purple
  { bg: "#ffe4e6", fg: "#9f1239" }, // rose
  { bg: "#ccfbf1", fg: "#115e59" }, // teal
  { bg: "#e0e7ff", fg: "#3730a3" }, // indigo
  { bg: "#ffedd5", fg: "#9a3412" }, // orange
];

// Deterministic badge (initials + colour) for a leave type, keyed off its code.
export function getLeaveTypeBadge(
  strTypeCode?: string | null,
  strTypeName?: string | null,
): { strLabel: string; bg: string; fg: string } {
  const strSource = (strTypeCode || strTypeName || "?").trim();
  const strLetters = strSource.replace(/[^A-Za-z]/g, "");
  const strLabel = (strLetters || strSource).slice(0, 2).toUpperCase() || "?";
  let intHash = 0;
  for (let intIndex = 0; intIndex < strSource.length; intIndex += 1) {
    intHash = (intHash * 31 + strSource.charCodeAt(intIndex)) >>> 0;
  }
  const objColor = LEAVE_TYPE_PALETTE[intHash % LEAVE_TYPE_PALETTE.length];
  return { strLabel, bg: objColor.bg, fg: objColor.fg };
}

// "2026-06-16" -> "16-Jun-2026" (falls back to the raw value on parse failure).
export function formatLeaveDate(strValue?: string | null): string {
  if (!strValue) {
    return "—";
  }
  const objDate = new Date(strValue);
  if (Number.isNaN(objDate.getTime())) {
    return strValue;
  }
  const lstMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const strDay = String(objDate.getDate()).padStart(2, "0");
  return `${strDay}-${lstMonths[objDate.getMonth()]}-${objDate.getFullYear()}`;
}
