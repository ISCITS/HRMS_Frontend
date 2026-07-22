import type { ApiEnvelope } from "@/models/AuthModels";

export type UserGroupRecord = {
  intID: number;
  intTenantID: number;
  intCompanyID: number | null;
  strGroupCode: string;
  strGroupName: string;
  strGroupDescription: string | null;
  blnIsActive: boolean;
  intLanguageID: number | null;
};

export type UserGroupFormPayload = {
  strGroupCode: string;
  strGroupName: string;
  strGroupDescription: string | null;
  intCompanyID: number | null;
  blnIsActive: boolean;
  intLanguageID?: number | null;
};

export type SecurityActionRight = {
  intActionID: number;
  strActionCode: string;
  strActionName: string;
  strActionCategory: string;
  blnIsAllowed: boolean;
  strAccessScope: string;
  objPolicyJson: Record<string, unknown> | null;
};

export type SecurityMenuNode = {
  intMenuID: number;
  strMenuCode: string;
  strMenuName: string;
  strRoutePath: string | null;
  strIconName: string | null;
  intMenuLevel: number;
  blnIsAllowed: boolean;
  lstActions: SecurityActionRight[];
  lstChildren: SecurityMenuNode[];
};

export type UserGroupRightSaveItem = {
  intMenuID: number;
  intActionID: number;
  blnIsAllowed: boolean;
  strAccessScope: string;
  objPolicyJson: Record<string, unknown> | null;
};

export type UserGroupAssignmentRecord = {
  intID: number;
  intUserID: number;
  intUserGroupID: number;
  strGroupCode: string;
  strGroupName: string;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type UserGroupAssignmentSaveItem = {
  intUserGroupID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type UserGroupAssignedUserSaveItem = {
  intUserID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
};

export type AssignableUserRecord = {
  intUserID: number;
  intCompanyID: number | null;
  strLoginName: string | null;
  strEmailAddress: string | null;
  blnIsActive: boolean;
};

export type UserGroupAuthorizationSummary = {
  intAssignedUserCount: number;
  intVisibleMenuCount: number;
  intAllowedActionCount: number;
};

export type UserGroupAuthorizationMetadata = {
  objGroup: UserGroupRecord;
  lstMenuTree: SecurityMenuNode[];
  lstAssignedUsers: UserGroupAssignmentRecord[];
  lstAssignableUsers: AssignableUserRecord[];
  objSummary: UserGroupAuthorizationSummary;
  blnCurrentUserSelfLockoutRisk: boolean;
  strCurrentUserSelfLockoutMessage: string | null;
};

export type UserGroupAuthorizationSavePayload = {
  objGroup?: UserGroupFormPayload | null;
  lstRights: UserGroupRightSaveItem[];
  lstAssignments: UserGroupAssignedUserSaveItem[];
};

export type ActionRightsData = {
  dicAllowedActions: Record<string, string[]>;
  dicAccessScopeByAction: Record<string, string>;
};

export type SecurityEnvelope<TData> = ApiEnvelope<TData>;
