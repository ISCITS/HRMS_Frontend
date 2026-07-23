"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type {
  LeaveApplicationDto,
  LeaveApplyRequest,
  LeaveApplicationAttachmentDto,
  LeaveBalanceDto,
  LeaveDecisionRequest,
  LeaveDraftRequest,
  LeaveLookups,
  LeavePolicyDto,
  LeavePolicyRequest,
  LeavePreviewDto,
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
      strMenuAction: LEAVE_MANAGE,
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
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async previewMyLeave(objPayload: LeaveApplyRequest, intApplicationID?: number | null): Promise<LeavePreviewDto> {
    const strQuery = intApplicationID ? `?application_id=${encodeURIComponent(String(intApplicationID))}` : "";
    const objResult = await requestApi<LeavePreviewDto>({
      strPath: `/ess/leave/preview${strQuery}`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async createMyLeaveDraft(objPayload: LeaveDraftRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: "/ess/leave/applications/draft",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async updateMyLeaveDraft(intApplicationID: number, objPayload: LeaveDraftRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/ess/leave/applications/${intApplicationID}/draft`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async submitMyLeaveDraft(intApplicationID: number, intVersionNo?: number): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/ess/leave/applications/${intApplicationID}/submit`,
      strMethod: ApiRequestMethod.Post,
      objBody: { intVersionNo },
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async getMyLeaveApplication(intApplicationID: number): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/ess/leave/applications/${intApplicationID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async withdrawMyLeaveApplication(intApplicationID: number, strReason: string): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/ess/leave/applications/${intApplicationID}/withdraw`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strReason },
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async uploadMyLeaveAttachment(intApplicationID: number, objFile: File): Promise<LeaveApplicationAttachmentDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<LeaveApplicationAttachmentDto | { Data: LeaveApplicationAttachmentDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/ess/leave/applications/${intApplicationID}/attachments`,
        data: objFormData,
        csrfMenuAction: LEAVE_MANAGE,
      } as ApiRequestConfig);
      return "Data" in objResponse.data ? objResponse.data.Data : objResponse.data;
    } catch (objError) {
      throw await createApiRequestError<LeaveApplicationAttachmentDto>(objError);
    }
  },

  async deleteMyLeaveAttachment(intApplicationID: number, intAttachmentID: number): Promise<void> {
    await requestApi<null>({
      strPath: `/ess/leave/applications/${intApplicationID}/attachments/${intAttachmentID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: LEAVE_MANAGE,
    });
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
