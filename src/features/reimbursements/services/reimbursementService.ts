"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { ApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  ReimbursementCategoryOption,
  ReimbursementClaimDto,
  ReimbursementClaimItemRequest,
  ReimbursementClaimRequest,
  ReimbursementOptionsDto,
  ReimbursementProofPreviewDto,
  ReimbursementTaxTreatment,
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
  const strDefaultTaxTreatment: ReimbursementTaxTreatment = "proof_based";
  const lstCategories =
    objOptions?.lstCategories?.length
      ? objOptions.lstCategories
      : lstSalaryComponents.length
        ? lstSalaryComponents.map<ReimbursementCategoryOption>((objComponent) => ({
            intID: objComponent.intID,
            strCategoryCode: objComponent.strComponentCode,
            strCategoryName: objComponent.strComponentName,
            intSalaryComponentID: objComponent.intID,
            strTaxTreatment: objComponent.strTaxTreatment ?? strDefaultTaxTreatment,
            blnProofRequired: objComponent.blnProofRequired ?? true,
            decMaxClaimAmount: null,
            decMaxItemAmount: null,
          }))
        : [{
            intID: -1,
            strCategoryCode: "GENERAL_REIMBURSEMENT",
            strCategoryName: "General Reimbursement",
            intSalaryComponentID: null,
            strTaxTreatment: strDefaultTaxTreatment,
            blnProofRequired: true,
            decMaxClaimAmount: null,
            decMaxItemAmount: null,
          }];

  return { lstCategories, lstSalaryComponents };
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
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteClaim(intClaimID: number): Promise<void> {
    await requestApi<null>({
      strPath: `/ess/reimbursements/${intClaimID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "ESS_REIMBURSEMENT_EDIT",
    });
  },

  async saveItem(
    intClaimID: number,
    objPayload: ReimbursementClaimItemRequest,
    intItemID?: number | null
  ): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: intItemID
        ? `/ess/reimbursements/${intClaimID}/items/${intItemID}`
        : `/ess/reimbursements/${intClaimID}/items`,
      strMethod: intItemID ? ApiRequestMethod.Put : ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async deleteItem(intClaimID: number, intItemID: number): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "ESS_REIMBURSEMENT_EDIT",
    });
    return objResult.Data;
  },

  async uploadProof(intClaimID: number, intItemID: number, objFile: File): Promise<ReimbursementClaimDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", "reimbursement_proof");
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs`,
      strMethod: ApiRequestMethod.Post,
      objBody: objFormData,
      strMenuAction: "ESS_REIMBURSEMENT_UPLOAD_PROOF",
    });
    return objResult.Data;
  },

  async deleteProof(intClaimID: number, intItemID: number, intProofID: number): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs/${intProofID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "ESS_REIMBURSEMENT_UPLOAD_PROOF",
    });
    return objResult.Data;
  },

  async previewProof(intClaimID: number, intItemID: number, intProofID: number): Promise<ReimbursementProofPreviewDto> {
    let objResult;
    try {
      objResult = await requestApi<ReimbursementProofPreviewDto>({
        strPath: `/ess/reimbursements/${intClaimID}/items/${intItemID}/proofs/${intProofID}/preview`,
        strMethod: ApiRequestMethod.Get,
        strMenuAction: "ESS_REIMBURSEMENT_VIEW",
      });
    } catch (objError) {
      if (!(objError instanceof ApiRequestError) || objError.intStatusCode !== 404) {
        throw objError;
      }
      objResult = await requestApi<ReimbursementProofPreviewDto>({
        strPath: `/ess/reimbursements/${intClaimID}/proofs/${intProofID}/preview`,
        strMethod: ApiRequestMethod.Get,
        strMenuAction: "ESS_REIMBURSEMENT_VIEW",
      });
    }
    return objResult.Data;
  },

  async submitClaim(intClaimID: number): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/submit`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_REIMBURSEMENT_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawClaim(intClaimID: number): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/ess/reimbursements/${intClaimID}/withdraw`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_REIMBURSEMENT_WITHDRAW",
    });
    return objResult.Data;
  },

  async getOptions(): Promise<ReimbursementOptionsDto> {
    const objResult = await requestApi<ReimbursementOptionsDto>({
      strPath: "/ess/reimbursements/options",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_REIMBURSEMENT_VIEW",
    });
    return normalizeOptions(objResult.Data);
  },
};
