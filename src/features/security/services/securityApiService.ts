"use client";

import { callAPI } from "@/lib/apiClient";
import { authHelpers } from "@/lib/auth";
import type {
  ActionRightsData,
  UserGroupAuthorizationMetadata,
  UserGroupAuthorizationSavePayload,
  SecurityMenuNode,
  UserGroupAssignmentRecord,
  UserGroupAssignmentSaveItem,
  UserGroupFormPayload,
  UserGroupRecord,
  UserGroupRightSaveItem,
} from "@/models/SecurityModels";

async function requestApi<TData>(
  strPath: string,
  strMethod: "GET" | "POST" | "PUT" | "PATCH",
  objBody?: unknown,
  objParams?: Record<string, string | number | boolean | null | undefined>,
) {
  const objResult = await callAPI<TData>(
    objBody ?? null,
    `/api/v1${strPath}`,
    `SECURITY_${strMethod}_${strPath}`,
    {
      method: strMethod,
      params: objParams,
    }
  );
  return objResult.Response;
}

export const securityApiService = {
  async listUserGroups(objFilters?: {
    strSearchName?: string;
    strSearchCode?: string;
    strStatus?: string;
  }) {
    return requestApi<UserGroupRecord[]>("/security/user-groups", "GET", null, {
      strSearchName: objFilters?.strSearchName ?? "",
      strSearchCode: objFilters?.strSearchCode ?? "",
      strStatus: objFilters?.strStatus ?? "",
      intLanguageID: authHelpers.getLanguageID() ?? 1,
    });
  },

  async getUserGroup(intUserGroupID: number) {
    return requestApi<UserGroupRecord>(`/security/user-groups/${intUserGroupID}`, "GET", null, {
      intLanguageID: authHelpers.getLanguageID() ?? 1,
    });
  },

  async createUserGroup(objPayload: UserGroupFormPayload) {
    return requestApi<UserGroupRecord>("/security/user-groups", "POST", objPayload);
  },

  async updateUserGroup(intUserGroupID: number, objPayload: UserGroupFormPayload) {
    return requestApi<UserGroupRecord>(`/security/user-groups/${intUserGroupID}`, "PUT", objPayload);
  },

  async updateUserGroupStatus(intUserGroupID: number, blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>(
      `/security/user-groups/${intUserGroupID}/status`,
      "PATCH",
      { blnIsActive }
    );
  },

  async getUserGroupRights(intUserGroupID: number) {
    return requestApi<SecurityMenuNode[]>(
      `/security/user-groups/${intUserGroupID}/rights`,
      "GET",
      null,
      { intLanguageID: authHelpers.getLanguageID() ?? 1 }
    );
  },

  async getUserGroupAuthorizationMetadata(intUserGroupID: number) {
    return requestApi<UserGroupAuthorizationMetadata>(
      `/security/user-groups/${intUserGroupID}/authorization-metadata`,
      "GET",
      null,
      { intLanguageID: authHelpers.getLanguageID() ?? 1 }
    );
  },

  async saveUserGroupAuthorization(intUserGroupID: number, objPayload: UserGroupAuthorizationSavePayload) {
    return requestApi<{ blnSuccess: boolean }>(
      `/security/user-groups/${intUserGroupID}/authorization`,
      "PUT",
      objPayload
    );
  },

  async saveUserGroupRights(intUserGroupID: number, lstRights: UserGroupRightSaveItem[]) {
    return requestApi<{ blnSuccess: boolean }>(
      `/security/user-groups/${intUserGroupID}/rights`,
      "PUT",
      { lstRights }
    );
  },

  async getUserAssignments(intUserID: number) {
    return requestApi<UserGroupAssignmentRecord[]>(
      `/security/users/${intUserID}/groups`,
      "GET",
      null,
      { intLanguageID: authHelpers.getLanguageID() ?? 1 }
    );
  },

  async saveUserAssignments(intUserID: number, lstAssignments: UserGroupAssignmentSaveItem[]) {
    return requestApi<{ blnSuccess: boolean }>(
      `/security/users/${intUserID}/groups`,
      "PUT",
      { lstAssignments }
    );
  },

  async getActionRights() {
    return requestApi<ActionRightsData>("/auth/action-rights", "GET");
  },
};
