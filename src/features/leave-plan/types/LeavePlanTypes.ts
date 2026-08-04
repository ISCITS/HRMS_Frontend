export type LeavePlanItem = {
  intID?: number;
  intLeaveTypeID: number;
  // Resolved server-side from Leave Type + plan effective date; the UI no longer selects it.
  intLeavePolicyID: number | null;
  decAnnualEntitlement: number;
  // Entitlement inheritance/override (POC refinement).
  blnIsEntitlementOverride: boolean;
  decBaseEntitlementSnapshot?: number | null;
  strOverrideReason?: string | null;
  blnOpeningBalanceAllowed: boolean;
  decNegativeBalanceLimit: number;
  intDisplayOrder: number;
  blnIsMandatory: boolean;
  blnIsActive: boolean;
};

export type LeavePlanText = {
  intID?: number;
  intLanguageID: number;
  strPlanName: string;
  strDescription: string | null;
};

export type LeavePlanUsage = { intAssignments: number; intAssignedEmployeeCount: number; blnInUse: boolean };

export type LeavePlan = {
  intID: number;
  intCompanyID: number;
  strPlanCode: string;
  strPlanName: string;
  strDisplayName?: string;
  strDescription: string | null;
  strCountryCode: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsDefault: boolean;
  blnIsActive: boolean;
  intVersionNo: number;
  strRemarks: string | null;
  intItemCount?: number;
  intAssignedEmployeeCount?: number;
  lstItems?: LeavePlanItem[];
  lstText?: LeavePlanText[];
  objUsage?: LeavePlanUsage;
};

export type LeavePlanSaveRequest = Omit<LeavePlan, "intID" | "intCompanyID" | "strDisplayName" | "intItemCount" | "intAssignedEmployeeCount" | "lstItems" | "lstText" | "objUsage"> & {
  intCompanyID?: number;
  lstItems: LeavePlanItem[];
  lstText: LeavePlanText[];
};

export type LeaveTypeOption = { intID: number; strTypeCode: string; strTypeName: string; blnIsActive: boolean; blnAllowNegativeBalance?: boolean };
export type LeavePolicyOption = {
  intID: number;
  intLeaveTypeID: number;
  strPolicyCode?: string | null;
  strPolicyName?: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  decEntitlementQty?: number | null;
  blnIsActive: boolean;
};
export type LanguageOption = { intID: number; strLabel: string; strCode?: string };
export type LeavePlanLanguages = { lstLanguages: LanguageOption[]; intDefaultLanguageID: number; intSecondaryLanguageID: number | null };
export type LeavePlanFilters = { strSearch?: string; blnIsActive?: boolean; dtEffectiveOn?: string };

export type EmployeeLeavePlanAssignment = {
  intID: number;
  intEmployeeID: number;
  intCompanyID: number;
  intLeavePlanID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  strAssignmentStatus: string;
  strSourceType: string;
  strAssignmentReason: string | null;
  blnIsCurrent: boolean;
};

export type EmployeeLeaveBalance = {
  intID: number;
  intEmployeeID: number;
  intLeavePlanAssignmentID: number | null;
  intLeaveTypeID: number;
  intLeaveYear: number;
  decOpeningBalance: number;
  decEntitledBalance: number;
  decAccruedBalance: number;
  decCarriedForwardBalance: number;
  decAdjustmentCredit: number;
  decAdjustmentDebit: number;
  decUtilizedBalance: number;
  decHoldBalance: number;
  decLapsedBalance: number;
  decEncashedBalance: number;
  decAvailableBalance: number;
  dtLastTransactionOn: string | null;
  blnIsLocked: boolean;
  strRemarks: string | null;
};

export type EmployeeLeaveLedger = {
  intID: number;
  intEmployeeLeaveBalanceID: number;
  intLeaveTypeID: number;
  intLeaveYear: number;
  dtTransactionDate: string;
  strTransactionType: string;
  decCreditDays: number;
  decDebitDays: number;
  decHoldDays: number;
  decReleaseHoldDays: number;
  decBalanceAfter: number;
  decHoldAfter: number;
  strSourceType: string;
  strTransactionRemarks: string | null;
  dtTransactionOn: string | null;
};

export type ReplacementImpactLine = { intLeaveTypeID: number; strLeaveType: string; lstReasons?: string[]; decAvailableBalance?: number };
export type ReplacementImpact = {
  lstRetained: ReplacementImpactLine[];
  lstAdded: ReplacementImpactLine[];
  lstRemovedFrozen: ReplacementImpactLine[];
  lstBlocking: ReplacementImpactLine[];
  blnCanReplace: boolean;
};

export type EmployeeLeavePlanOverview = {
  objCurrentAssignment: EmployeeLeavePlanAssignment | null;
  lstAssignments: EmployeeLeavePlanAssignment[];
  lstBalances: EmployeeLeaveBalance[];
  objReplacementImpact?: ReplacementImpact;
};

export type ReplacementPreviewRequest = { intLeavePlanID: number; intLeaveYear: number; dtEffectiveFrom: string };

export type BalanceMutationResult = { objBalance: EmployeeLeaveBalance; lstLedger: EmployeeLeaveLedger[] };

export type EmployeePlanAssignRequest = {
  intEmployeeID: number;
  intLeavePlanID: number;
  intLeaveYear: number;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
  blnInitializeBalances: boolean;
  strAssignmentReason: string;
  lstOpeningBalances: Array<{ intLeaveTypeID: number; decOpeningBalance: number }>;
};
export type EmployeePlanAssignmentUpdateRequest = {
  intEmployeeID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
  strAssignmentReason?: string | null;
};
export type BalanceMovementRequest = { decDays: number; dtTransactionDate?: string | null; strRemarks: string };
export type OpeningBalanceRequest = { decOpeningBalance: number; dtTransactionDate?: string | null; strRemarks: string };
