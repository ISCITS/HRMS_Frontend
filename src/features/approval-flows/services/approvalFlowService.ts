"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type { ApprovalFlowRecord, ApprovalFlowSaveRequest } from "@/features/approval-flows/types";

const SETTINGS_VIEW = "SETTINGS_VIEW";
const SETTINGS_EDIT = "SETTINGS_EDIT";

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

export const approvalFlowService = {
  async listFlows(strSearch?: string, strModule?: string, strStatus?: string): Promise<ApprovalFlowRecord[]> {
    const objParams = new URLSearchParams();
    if (strSearch?.trim()) objParams.set("q", strSearch.trim());
    if (strModule && strModule !== "ALL") objParams.set("module", strModule);
    if (strStatus && strStatus !== "ALL") objParams.set("status", strStatus);
    const strQuery = objParams.toString();
    const objResult = await requestApi<ApprovalFlowRecord[]>({
      strPath: `/settings/approval-flows${strQuery ? `?${strQuery}` : ""}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getFlow(intApprovalFlowID: number): Promise<ApprovalFlowRecord> {
    const objResult = await requestApi<ApprovalFlowRecord>({
      strPath: `/settings/approval-flows/${intApprovalFlowID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data as ApprovalFlowRecord;
  },

  async createFlow(objPayload: ApprovalFlowSaveRequest): Promise<ApprovalFlowRecord> {
    const objResult = await requestApi<ApprovalFlowRecord>({
      strPath: "/settings/approval-flows",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: SETTINGS_EDIT,
    });
    return objResult.Data as ApprovalFlowRecord;
  },

  async updateFlow(intApprovalFlowID: number, objPayload: ApprovalFlowSaveRequest): Promise<ApprovalFlowRecord> {
    const objResult = await requestApi<ApprovalFlowRecord>({
      strPath: `/settings/approval-flows/${intApprovalFlowID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: SETTINGS_EDIT,
    });
    return objResult.Data as ApprovalFlowRecord;
  },
};