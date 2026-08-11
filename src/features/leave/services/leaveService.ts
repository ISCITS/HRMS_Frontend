"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { FileUploadProgressHandler } from "@/lib/fileUploadService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";
import type {
  LeaveApplicationDto,
  LeaveApplyRequest,
  LeaveApplicationAttachmentDto,
  LeaveBalanceDto,
  LeaveLedgerDto,
  LeaveDecisionRequest,
  LeaveDraftRequest,
  LeaveLookups,
  LeaveOverrideRequest,
  LeavePolicyDto,
  LeavePolicyRequest,
  LeavePreviewDto,
  LeaveQueueItemDto,
  LeaveReassignRequest,
  LeaveRouteStepDto,
  LeaveTimelineDto,
  LeaveTypeAggregate,
  LeaveTypeDto,
  LeaveTypeEnrichedDto,
  LeaveTypeRequest,
  LeaveTypeUsageDto,
  LeaveWorkflowExceptionDto,
  TeamCalendarDto,
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

  async getMyLedger(intLeaveYear: number): Promise<LeaveLedgerDto[]> {
    const objResult = await requestApi<LeaveLedgerDto[]>({
      strPath: `/ess/leave/ledger?leave_year=${intLeaveYear}`,
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

  async uploadMyLeaveAttachment(intApplicationID: number, objFile: File, fnOnProgress?: FileUploadProgressHandler): Promise<LeaveApplicationAttachmentDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<LeaveApplicationAttachmentDto | { Data: LeaveApplicationAttachmentDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/ess/leave/applications/${intApplicationID}/attachments`,
        data: objFormData,
        csrfMenuAction: LEAVE_MANAGE,
        onUploadProgress: fnOnProgress
          ? (objProgressEvent) => {
              if (objProgressEvent.total) {
                fnOnProgress(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
              }
            }
          : undefined,
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

  // The GET attachment endpoint already exists on the backend (returns the raw file inline, used
  // for download); this just fetches it as a blob and opens it in a new tab instead of forcing a
  // save-as prompt, matching ReimbursementProofViewer's fetch-then-window.open preview pattern.
  async previewMyLeaveAttachment(intApplicationID: number, intAttachmentID: number): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/ess/leave/applications/${intApplicationID}/attachments/${intAttachmentID}`,
        responseType: "blob",
        csrfMenuAction: LEAVE_VIEW,
      } as ApiRequestConfig);
      const strUrl = URL.createObjectURL(objResponse.data);
      openBlobUrlInNewTab(strUrl);
      window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
    } catch (objError) {
      throw await createApiRequestError(objError);
    }
  },

  // ---- HR / Manager: approval queue + workflow ----
  async listApplicationQueue(strStatus?: string): Promise<LeaveQueueItemDto[]> {
    const strQuery = strStatus ? `?status=${encodeURIComponent(strStatus)}` : "";
    const objResult = await requestApi<LeaveQueueItemDto[]>({
      strPath: `/leave/applications${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // Applications the current approver has personally decided (approve/reject/send-back/…).
  async listActionedApplications(): Promise<LeaveQueueItemDto[]> {
    const objResult = await requestApi<LeaveQueueItemDto[]>({
      strPath: "/leave/applications/actioned",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // HR workbench: applications created/actioned by HR on behalf of an employee.
  async listOnBehalfApplications(): Promise<LeaveQueueItemDto[]> {
    const objResult = await requestApi<LeaveQueueItemDto[]>({
      strPath: "/leave/applications/on-behalf",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  // HR workbench: applications auto-approved/auto-rejected by the workflow engine.
  async listAutoDecidedApplications(): Promise<LeaveQueueItemDto[]> {
    const objResult = await requestApi<LeaveQueueItemDto[]>({
      strPath: "/leave/applications/auto-decisions",
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

  async sendBackApplication(intApplicationID: number, objPayload: LeaveDecisionRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/send-back`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async cancelApprovedLeave(intApplicationID: number, objPayload: LeaveDecisionRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/cancel-approved`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async assignBackupResource(intApplicationID: number, objPayload: { intBackupEmployeeID: number; strReason?: string | null }): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/backup-resource`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async reassignApplication(intApplicationID: number, objPayload: LeaveReassignRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/reassign`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async overrideApplication(intApplicationID: number, objPayload: LeaveOverrideRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/override`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },

  async getApplicationTimeline(intApplicationID: number): Promise<LeaveTimelineDto> {
    const objResult = await requestApi<LeaveTimelineDto>({
      strPath: `/leave/applications/${intApplicationID}/timeline`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async getApplicationRouteSnapshot(intApplicationID: number): Promise<LeaveRouteStepDto[]> {
    const objResult = await requestApi<
      LeaveRouteStepDto[] | { lstRoute?: LeaveRouteStepDto[]; objWorkflow?: { lstSteps?: LeaveRouteStepDto[]; lstRouteSnapshot?: LeaveRouteStepDto[] } }
    >({
      strPath: `/leave/applications/${intApplicationID}/route-snapshot`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    const objData = objResult.Data;
    if (Array.isArray(objData)) return objData;
    // The backend returns { objApplication, objWorkflow: { lstSteps, lstRouteSnapshot } }; the live
    // workflow steps carry status, so prefer them and fall back to the immutable submission snapshot.
    return objData?.objWorkflow?.lstSteps ?? objData?.objWorkflow?.lstRouteSnapshot ?? objData?.lstRoute ?? [];
  },

  async listWorkflowExceptions(blnOpenOnly = true): Promise<LeaveWorkflowExceptionDto[]> {
    const objResult = await requestApi<LeaveWorkflowExceptionDto[]>({
      strPath: `/leave/workflow-exceptions?open_only=${blnOpenOnly}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getTeamCalendar(strFromDate: string, strToDate: string): Promise<TeamCalendarDto> {
    const objResult = await requestApi<TeamCalendarDto>({
      strPath: `/leave/team-calendar?from_date=${encodeURIComponent(strFromDate)}&to_date=${encodeURIComponent(strToDate)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: LEAVE_VIEW,
    });
    return objResult.Data;
  },

  async acknowledgeBackup(intApplicationID: number, objPayload?: LeaveDecisionRequest): Promise<LeaveApplicationDto> {
    const objResult = await requestApi<LeaveApplicationDto>({
      strPath: `/leave/applications/${intApplicationID}/backup-acknowledge`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload ?? {},
      strMenuAction: LEAVE_MANAGE,
    });
    return objResult.Data;
  },
};
