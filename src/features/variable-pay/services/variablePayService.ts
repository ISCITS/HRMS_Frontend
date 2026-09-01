"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { VariablePayTypeOption } from "@/features/payroll/types";
import type {
  VariablePayEligibleRunOption,
  VariablePayEmployeeRow,
  VariablePayFetchResult,
  VariablePayImportCommitResult,
  VariablePayImportPreviewResult,
  VariablePayRunContext,
  VariablePaySaveResult,
  VariablePayTransitionResult,
} from "@/features/variable-pay/types";

const VARIABLE_PAY_VIEW = "variable_pay_view";
const VARIABLE_PAY_EDIT = "variable_pay_edit";
const VARIABLE_PAY_IMPORT = "variable_pay_import";
const VARIABLE_PAY_APPROVE = "variable_pay_approve";
const VARIABLE_PAY_FETCH = "variable_pay_fetch";

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

export const variablePayService = {
  async listVariablePayTypes(): Promise<VariablePayTypeOption[]> {
    const objResult = await requestApi<VariablePayTypeOption[]>({
      strPath: "/variable-pay/types",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: VARIABLE_PAY_VIEW,
    });
    return objResult.Data;
  },

  async getRunContext(intRunID: number): Promise<VariablePayRunContext> {
    const objResult = await requestApi<VariablePayRunContext>({
      strPath: `/variable-pay/runs/${intRunID}/context`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: VARIABLE_PAY_VIEW,
    });
    return objResult.Data;
  },

  async listEligibleEmployees(intRunID: number): Promise<VariablePayEmployeeRow[]> {
    const objResult = await requestApi<VariablePayEmployeeRow[]>({
      strPath: `/variable-pay/runs/${intRunID}/employees`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: VARIABLE_PAY_VIEW,
    });
    return objResult.Data;
  },

  async saveManualTransactions(
    intRunID: number,
    lstTransactions: Array<{ intEmployeeID: number; decInputAmount: number; strRemarks?: string | null }>,
  ): Promise<VariablePaySaveResult> {
    const objResult = await requestApi<VariablePaySaveResult>({
      strPath: `/variable-pay/runs/${intRunID}/transactions`,
      strMethod: ApiRequestMethod.Post,
      objBody: { lstTransactions },
      strMenuAction: VARIABLE_PAY_EDIT,
    });
    return objResult.Data;
  },

  async downloadImportTemplate(intRunID: number): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/variable-pay/runs/${intRunID}/import/template`,
        responseType: "blob",
        csrfMenuAction: VARIABLE_PAY_IMPORT,
      } as ApiRequestConfig);
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = "variable_pay_import_template.xlsx";
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async previewImport(intRunID: number, objFile: File): Promise<VariablePayImportPreviewResult> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: VariablePayImportPreviewResult }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/variable-pay/runs/${intRunID}/import/preview`,
        data: objFormData,
        csrfMenuAction: VARIABLE_PAY_IMPORT,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<VariablePayImportPreviewResult>(objError);
    }
  },

  async commitImport(
    intRunID: number,
    lstRows: Array<{ strEmployeeCode: string; decAmount: number; strRemarks?: string | null; strExternalReference?: string | null }>,
  ): Promise<VariablePayImportCommitResult> {
    const objResult = await requestApi<VariablePayImportCommitResult>({
      strPath: `/variable-pay/runs/${intRunID}/import/commit`,
      strMethod: ApiRequestMethod.Post,
      objBody: { lstRows },
      strMenuAction: VARIABLE_PAY_IMPORT,
    });
    return objResult.Data;
  },

  async validateTransactions(intRunID: number, lstTransactionIDs: number[]): Promise<VariablePayTransitionResult> {
    const objResult = await requestApi<VariablePayTransitionResult>({
      strPath: `/variable-pay/runs/${intRunID}/transactions/validate`,
      strMethod: ApiRequestMethod.Post,
      objBody: { lstTransactionIDs },
      strMenuAction: VARIABLE_PAY_EDIT,
    });
    return objResult.Data;
  },

  async approveTransactions(intRunID: number, lstTransactionIDs: number[]): Promise<VariablePayTransitionResult> {
    const objResult = await requestApi<VariablePayTransitionResult>({
      strPath: `/variable-pay/runs/${intRunID}/transactions/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: { lstTransactionIDs },
      strMenuAction: VARIABLE_PAY_APPROVE,
    });
    return objResult.Data;
  },

  async fetchVariablePay(intRunID: number): Promise<VariablePayFetchResult> {
    const objResult = await requestApi<VariablePayFetchResult>({
      strPath: `/variable-pay/runs/${intRunID}/fetch`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: VARIABLE_PAY_FETCH,
    });
    return objResult.Data;
  },
};

export type { VariablePayEligibleRunOption };
