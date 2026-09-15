"use client";

import axios from "axios";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { FileUploadProgressHandler } from "@/lib/fileUploadService";
import { masterApiService, type EmployeeDetailApiRecord } from "@/services/master/MasterApiService";
import type {
  ReimbursementClaimDto,
  ReimbursementClaimItemRequest,
  ReimbursementClaimRequest,
  ReimbursementOptionsDto,
} from "@/features/reimbursements/types";

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

function normalizeOptions(objOptions?: ReimbursementOptionsDto | null): ReimbursementOptionsDto {
  const lstSalaryComponents = objOptions?.lstSalaryComponents ?? [];
  return { lstSalaryComponents };
}

export const reimbursementService = {
  async listClaims(): Promise<ReimbursementClaimDto[]> {
    const objResult = await requestApi<ReimbursementClaimDto[]>({
      strPath: "/ess/reimbursements",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_REIMBURSEMENT_VIEW",
    });
    return objResult.Data ?? [];
  },

  async getClaim(strClaimID: string): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_REIMBURSEMENT_VIEW",
    });
    return objResult.Data;
  },

  async getClaimForEmployee(strClaimID: string, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    });
    return objResult.Data;
  },

  async createClaim(objPayload: ReimbursementClaimRequest, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "ESS_REIMBURSEMENT_CREATE",
    });
    return objResult.Data;
  },

  async updateClaim(strClaimID: string, objPayload: ReimbursementClaimRequest, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteClaim(strClaimID: string, strEmployeeID?: string | null): Promise<void> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    await requestApi<null>({
      strPath: `/ess/reimbursements/${strClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
  },

  async saveItem(
    strClaimID: string,
    objPayload: ReimbursementClaimItemRequest,
    intItemID?: number | null,
    strEmployeeID?: string | null
  ): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: intItemID
        ? `/ess/reimbursements/${strClaimID}/items/${intItemID}${strEmployeeQuery}`
        : `/ess/reimbursements/${strClaimID}/items${strEmployeeQuery}`,
      strMethod: intItemID ? ApiRequestMethod.Put : ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteItem(strClaimID: string, intItemID: number, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}/items/${intItemID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async uploadProof(
    strClaimID: string,
    intItemID: number,
    objFile: File,
    strEmployeeID?: string | null,
    fnOnProgress?: FileUploadProgressHandler
  ): Promise<ReimbursementClaimDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", "reimbursement_proof");
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    try {
      const objResponse = await axiosInstance.request<ReimbursementClaimDto | { Data: ReimbursementClaimDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${strClaimID}/items/${intItemID}/proofs${strEmployeeQuery}`,
        data: objFormData,
        csrfMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_UPLOAD_PROOF",
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
      throw await createApiRequestError<ReimbursementClaimDto>(objError);
    }
  },

  async deleteProof(strClaimID: string, intItemID: number, intProofID: number, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}/items/${intItemID}/proofs/${intProofID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_UPLOAD_PROOF",
    });
    return objResult.Data;
  },

  async previewProof(strClaimID: string, intItemID: number, intProofID: number, strEmployeeID?: string | null): Promise<Blob> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${strClaimID}/items/${intItemID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
        responseType: "blob",
        csrfMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
      } as ApiRequestConfig);
      return objResponse.data;
    } catch (objError) {
      if (!axios.isAxiosError(objError) || objError.response?.status !== 404) {
        throw objError;
      }
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${strClaimID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
        responseType: "blob",
        csrfMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
      } as ApiRequestConfig);
      return objResponse.data;
    }
  },

  async previewProofByID(strClaimID: string, intProofID: number, strEmployeeID?: string | null): Promise<Blob> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResponse = await axiosInstance.request<Blob>({
      method: ApiRequestMethod.Get,
      url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${strClaimID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
      responseType: "blob",
      csrfMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    } as ApiRequestConfig);
    return objResponse.data;
  },

  async submitClaim(strClaimID: string, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}/submit${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawClaim(strClaimID: string, strEmployeeID?: string | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${strClaimID}/withdraw${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_REIMBURSEMENT_WITHDRAW",
    });
    return objResult.Data;
  },

  // getEmployeeById already takes either identifier, so the public one passes straight through.
  async getEmployeeDetail(strEmployeeID: string): Promise<EmployeeDetailApiRecord> {
    const objResult = await masterApiService.getEmployeeById(strEmployeeID);
    return objResult.Data;
  },

  async getOptions(strEmployeeID?: string | null): Promise<ReimbursementOptionsDto> {
    const strEmployeeQuery = strEmployeeID ? `?employee_id=${encodeURIComponent(strEmployeeID)}` : "";
    const objResult = await requestApi<ReimbursementOptionsDto>({
      strPath: `/ess/reimbursements/options${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    });
    return normalizeOptions(objResult.Data);
  },
};
