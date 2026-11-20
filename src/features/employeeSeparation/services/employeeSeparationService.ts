import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  RegularPayrollPolicyResponse,
  RegularPayrollPolicySaveRequest,
  SeparationCancelCheck,
  SeparationDetail,
  SeparationEmployeeOption,
  SeparationHistoryEntry,
  SeparationListQuery,
  SeparationListResponse,
  SeparationLookups,
  SeparationPreview,
  SeparationRequest,
} from "@/features/employeeSeparation/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

function toQuery(dicValues: Record<string, string | number | undefined | null>): string {
  const objParams = new URLSearchParams();
  Object.entries(dicValues).forEach(([strKey, objValue]) => {
    if (objValue !== undefined && objValue !== null && String(objValue).trim() !== "") objParams.set(strKey, String(objValue));
  });
  const strQuery = objParams.toString();
  return strQuery ? `?${strQuery}` : "";
}

function encodeID(strID: string) {
  return encodeURIComponent(strID);
}

export const employeeSeparationService = {
  async listSeparations(dicQuery: SeparationListQuery): Promise<SeparationListResponse> {
    const objResult = await requestApi<SeparationListResponse>({
      strPath: `/employee-separations${toQuery(dicQuery)}`,
      strMethod: "GET",
      strMenuAction: "EMPLOYEE_SEPARATIONS_VIEW",
    });
    return objResult.Data;
  },

  async getLookups(): Promise<SeparationLookups> {
    const objResult = await requestApi<SeparationLookups>({ strPath: "/employee-separations/lookups", strMethod: "GET", strMenuAction: "EMPLOYEE_SEPARATIONS_VIEW" });
    return objResult.Data;
  },

  async listEmployeeOptions(strSearch: string, intLimit = 25): Promise<SeparationEmployeeOption[]> {
    const objResult = await requestApi<SeparationEmployeeOption[]>({
      strPath: `/employee-separations/employee-options${toQuery({ search: strSearch, limit: intLimit })}`,
      strMethod: "GET",
      strMenuAction: "EMPLOYEE_SEPARATIONS_ADD",
    });
    return objResult.Data;
  },

  async preview(objRequest: SeparationRequest): Promise<SeparationPreview> {
    const objResult = await requestApi<SeparationPreview>({ strPath: "/employee-separations/preview", strMethod: "POST", objBody: objRequest, strMenuAction: "EMPLOYEE_SEPARATIONS_ADD" });
    return objResult.Data;
  },

  async activate(objRequest: SeparationRequest): Promise<SeparationDetail> {
    const objResult = await requestApi<SeparationDetail>({ strPath: "/employee-separations", strMethod: "POST", objBody: objRequest, strMenuAction: "EMPLOYEE_SEPARATIONS_ADD" });
    return objResult.Data;
  },

  async getSeparation(strID: string): Promise<SeparationDetail> {
    const objResult = await requestApi<SeparationDetail>({ strPath: `/employee-separations/${encodeID(strID)}`, strMethod: "GET", strMenuAction: "EMPLOYEE_SEPARATIONS_VIEW" });
    return objResult.Data;
  },

  async getHistory(strID: string): Promise<SeparationHistoryEntry[]> {
    const objResult = await requestApi<SeparationHistoryEntry[]>({ strPath: `/employee-separations/${encodeID(strID)}/history`, strMethod: "GET", strMenuAction: "EMPLOYEE_SEPARATIONS_VIEW" });
    return objResult.Data;
  },

  async getCancelCheck(strID: string): Promise<SeparationCancelCheck> {
    const objResult = await requestApi<SeparationCancelCheck>({ strPath: `/employee-separations/${encodeID(strID)}/cancel-check`, strMethod: "GET", strMenuAction: "EMPLOYEE_SEPARATIONS_CANCEL" });
    return objResult.Data;
  },

  async cancel(strID: string, strReason: string, blnAcknowledgeWarnings: boolean): Promise<SeparationDetail> {
    const objResult = await requestApi<SeparationDetail>({
      strPath: `/employee-separations/${encodeID(strID)}/cancel`,
      strMethod: "POST",
      objBody: { strReason, blnAcknowledgeWarnings },
      strMenuAction: "EMPLOYEE_SEPARATIONS_CANCEL",
    });
    return objResult.Data;
  },

  // F&F Rules > Regular Payroll Processing (F&F menu rights: view to read, approve to save).
  async getRegularPayrollPolicy(): Promise<RegularPayrollPolicyResponse> {
    const objResult = await requestApi<RegularPayrollPolicyResponse>({ strPath: "/payroll/fnf-settlements/regular-payroll-policy", strMethod: "GET", strMenuAction: "PAYROLL_FNF_VIEW" });
    return objResult.Data;
  },

  async saveRegularPayrollPolicy(objRequest: RegularPayrollPolicySaveRequest): Promise<RegularPayrollPolicyResponse> {
    const objResult = await requestApi<RegularPayrollPolicyResponse>({ strPath: "/payroll/fnf-settlements/regular-payroll-policy", strMethod: "PUT", objBody: objRequest, strMenuAction: "PAYROLL_FNF_APPROVE" });
    return objResult.Data;
  },
};
