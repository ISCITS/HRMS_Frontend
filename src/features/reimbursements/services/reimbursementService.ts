"use client";

import axios from "axios";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
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

  async getClaim(intClaimID: number): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_REIMBURSEMENT_VIEW",
    });
    return objResult.Data;
  },

  async getClaimForEmployee(intClaimID: number, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    });
    return objResult.Data;
  },

  async createClaim(objPayload: ReimbursementClaimRequest): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: "/ess/reimbursements",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "ESS_REIMBURSEMENT_CREATE",
    });
    return objResult.Data;
  },

  async updateClaim(intClaimID: number, objPayload: ReimbursementClaimRequest): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = objPayload.intEmployeeID ? `?employee_id=${encodeURIComponent(String(objPayload.intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: objPayload.intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteClaim(intClaimID: number, intEmployeeID?: number | null): Promise<void> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    await requestApi<null>({
      strPath: `/ess/reimbursements/${intClaimID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
  },

  async saveItem(
    intClaimID: number,
    objPayload: ReimbursementClaimItemRequest,
    intItemID?: number | null,
    intEmployeeID?: number | null
  ): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: intItemID
        ? `/ess/reimbursements/${intClaimID}/items/${intItemID}${strEmployeeQuery}`
        : `/ess/reimbursements/${intClaimID}/items${strEmployeeQuery}`,
      strMethod: intItemID ? ApiRequestMethod.Put : ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteItem(intClaimID: number, intItemID: number, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async uploadProof(intClaimID: number, intItemID: number, objFile: File, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", "reimbursement_proof");
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    try {
      const objResponse = await axiosInstance.request<ReimbursementClaimDto | { Data: ReimbursementClaimDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs${strEmployeeQuery}`,
        data: objFormData,
        csrfMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_UPLOAD_PROOF",
      } as ApiRequestConfig);
      return "Data" in objResponse.data ? objResponse.data.Data : objResponse.data;
    } catch (objError) {
      throw await createApiRequestError<ReimbursementClaimDto>(objError);
    }
  },

  async deleteProof(intClaimID: number, intItemID: number, intProofID: number, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs/${intProofID}${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_UPLOAD_PROOF",
    });
    return objResult.Data;
  },

  async previewProof(intClaimID: number, intItemID: number, intProofID: number, intEmployeeID?: number | null): Promise<Blob> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
        responseType: "blob",
        csrfMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
      } as ApiRequestConfig);
      return objResponse.data;
    } catch (objError) {
      if (!axios.isAxiosError(objError) || objError.response?.status !== 404) {
        throw objError;
      }
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${intClaimID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
        responseType: "blob",
        csrfMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
      } as ApiRequestConfig);
      return objResponse.data;
    }
  },

  async previewProofByID(intClaimID: number, intProofID: number, intEmployeeID?: number | null): Promise<Blob> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResponse = await axiosInstance.request<Blob>({
      method: ApiRequestMethod.Get,
      url: `${ApiRoutePrefix.ApiV1}/ess/reimbursements/${intClaimID}/proofs/${intProofID}/preview${strEmployeeQuery}`,
      responseType: "blob",
      csrfMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    } as ApiRequestConfig);
    return objResponse.data;
  },

  async submitClaim(intClaimID: number, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/submit${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawClaim(intClaimID: number, intEmployeeID?: number | null): Promise<ReimbursementClaimDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/withdraw${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_REIMBURSEMENT_WITHDRAW",
    });
    return objResult.Data;
  },

  async getEmployeeDetail(intEmployeeID: number): Promise<EmployeeDetailApiRecord> {
    const objResult = await masterApiService.getEmployeeById(intEmployeeID);
    return objResult.Data;
  },

  async getOptions(intEmployeeID?: number | null): Promise<ReimbursementOptionsDto> {
    const strEmployeeQuery = intEmployeeID ? `?employee_id=${encodeURIComponent(String(intEmployeeID))}` : "";
    const objResult = await requestApi<ReimbursementOptionsDto>({
      strPath: `/ess/reimbursements/options${strEmployeeQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: intEmployeeID ? "ESS_REIMBURSEMENT_CREATE" : "ESS_REIMBURSEMENT_VIEW",
    });
    return normalizeOptions(objResult.Data);
  },
};
