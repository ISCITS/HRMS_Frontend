"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  LeaveApplicationDto,
  LeaveApplyRequest,
  LeaveBalanceDto,
  LeaveDecisionRequest,
  LeaveLookups,
  LeavePolicyDto,
  LeavePolicyRequest,
  LeaveTypeAggregate,
  LeaveTypeDto,
  LeaveTypeEnrichedDto,
  LeaveTypeRequest,
  LeaveTypeUsageDto,
} from "@/features/leave/types";

const LEAVE_VIEW = "LEAVE_VIEW";
const LEAVE_MANAGE = "LEAVE_MANAGE";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const leaveService = {
  // ---- HR / Admin: leave types ----
  async listLeaveTypes(): Promise<LeaveTypeDto[]> {
    const objResult = await requestApi<LeaveTypeDto[]>({
      strPath: "/leave/types",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // ---- Enterprise leave-type master (list with current policy + localized name) ----
  async listEnterpriseLeaveTypes(): Promise<LeaveTypeEnrichedDto[]> {
    const objResult = await requestApi<LeaveTypeEnrichedDto[]>({
      strPath: "/leave/leave-types",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getLeaveLookups(): Promise<LeaveLookups> {
    const objResult = await requestApi<LeaveLookups>({
      strPath: "/leave/lookups",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? {};
  },

  async getLeaveTypeAggregate(intLeaveTypeID: number): Promise<LeaveTypeAggregate> {
    const objResult = await requestApi<LeaveTypeAggregate>({
      strPath: `/leave/leave-types/${intLeaveTypeID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async createLeaveTypeAggregate(objPayload: LeaveTypeAggregate): Promise<LeaveTypeAggregate> {
    const objResult = await requestApi<LeaveTypeAggregate>({
      strPath: "/leave/leave-types",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async updateLeaveTypeAggregate(intLeaveTypeID: number, objPayload: LeaveTypeAggregate): Promise<LeaveTypeAggregate> {
    const objResult = await requestApi<LeaveTypeAggregate>({
      strPath: `/leave/leave-types/${intLeaveTypeID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async deleteEnterpriseLeaveType(intLeaveTypeID: number): Promise<LeaveTypeDto> {
    const objResult = await requestApi<LeaveTypeDto>({
      strPath: `/leave/leave-types/${intLeaveTypeID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async getLeaveTypeUsage(intLeaveTypeID: number): Promise<LeaveTypeUsageDto> {
    const objResult = await requestApi<LeaveTypeUsageDto>({
      strPath: `/leave/leave-types/${intLeaveTypeID}/usage`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async setLeaveTypeStatus(intLeaveTypeID: number, blnIsActive: boolean): Promise<LeaveTypeDto> {
    const objResult = await requestApi<LeaveTypeDto>({
      strPath: `/leave/leave-types/${intLeaveTypeID}/status?is_active=${blnIsActive}`,
      strMethod: ApiRequestMethod.Post,
      objBody: {},
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async createLeaveType(objPayload: LeaveTypeRequest): Promise<LeaveTypeDto> {
    const objResult = await requestApi<LeaveTypeDto>({
      strPath: "/leave/types",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async updateLeaveType(intLeaveTypeID: number, objPayload: LeaveTypeRequest): Promise<LeaveTypeDto> {
    const objResult = await requestApi<LeaveTypeDto>({
      strPath: `/leave/types/${intLeaveTypeID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async deleteLeaveType(intLeaveTypeID: number): Promise<LeaveTypeDto> {
    const objResult = await requestApi<LeaveTypeDto>({
      strPath: `/leave/types/${intLeaveTypeID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  // ---- HR / Admin: leave policies ----
  async listPolicies(intLeaveTypeID?: number | null): Promise<LeavePolicyDto[]> {
    const strQuery = intLeaveTypeID ? `?leave_type_id=${encodeURIComponent(String(intLeaveTypeID))}` : "";
    const objResult = await requestApi<LeavePolicyDto[]>({
      strPath: `/leave/policies${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async createPolicy(objPayload: LeavePolicyRequest): Promise<LeavePolicyDto> {
    const objResult = await requestApi<LeavePolicyDto>({
      strPath: "/leave/policies",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async updatePolicy(intPolicyID: number, objPayload: LeavePolicyRequest): Promise<LeavePolicyDto> {
    const objResult = await requestApi<LeavePolicyDto>({
      strPath: `/leave/policies/${intPolicyID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async deletePolicy(intPolicyID: number): Promise<LeavePolicyDto> {
    const objResult = await requestApi<LeavePolicyDto>({
      strPath: `/leave/policies/${intPolicyID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async runAccrual(strPeriod: string): Promise<{ strPeriod: string; intEntriesPosted: number; intEmployees: number; intPoliciesApplied: number }> {
    const objResult = await requestApi<{ strPeriod: string; intEntriesPosted: number; intEmployees: number; intPoliciesApplied: number }>({
      strPath: `/leave/accrual/run?period=${encodeURIComponent(strPeriod)}`,
      strMethod: ApiRequestMethod.Post,
      objBody: {},
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  // ---- ESS: applicable types ----
  async getEssLeaveTypes(): Promise<LeaveTypeDto[]> {
    const objResult = await requestApi<LeaveTypeDto[]>({
      strPath: "/ess/leave/types",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // ---- ESS: my balance ----
  async getMyBalances(): Promise<LeaveBalanceDto[]> {
    const objResult = await requestApi<LeaveBalanceDto[]>({
      strPath: "/ess/leave/balance",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // ---- ESS: applications ----
  async applyLeave(objPayload: LeaveApplyRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: "/ess/leave/apply",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async listMyApplications(strStatus?: string): Promise<LeaveApplicationDto[]> {
    const strQuery = strStatus ? `?status=${encodeURIComponent(strStatus)}` : "";
    const objResult = await requestApi<LeaveApplicationDto[]>({
      strPath: `/ess/leave/applications${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async cancelMyApplication(intApplicationID: number): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/ess/leave/applications/${intApplicationID}/cancel`,
      strMethod: ApiRequestMethod.Post,
      objBody: {},
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  // ---- HR / Manager: approval queue ----
  async listApplicationQueue(strStatus?: string): Promise<LeaveApplicationDto[]> {
    const strQuery = strStatus ? `?status=${encodeURIComponent(strStatus)}` : "";
    const objResult = await requestApi<LeaveApplicationDto[]>({
      strPath: `/leave/applications${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async approveApplication(intApplicationID: number, objPayload?: LeaveDecisionRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload ?? {},
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async rejectApplication(intApplicationID: number, objPayload?: LeaveDecisionRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/reject`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload ?? {},
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },
};
