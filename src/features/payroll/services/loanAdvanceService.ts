import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { ApiRequestError, createApiRequestError, requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type { FileUploadPanelService } from "@/components/shared/files/FileUploadPanel";
import type { LoanAdvanceCategoryRecord, LoanAdvanceFormValues, LoanAdvanceRecord } from "@/features/payroll/types";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { FileMetadataDto, ListFilesFilter, UploadFileRequest } from "@/lib/fileUploadService";
import { openBlobUrlInNewTab } from "@/lib/openBlobUrlInNewTab";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET" | "POST" | "PUT" | "DELETE";
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

function isMissingBackendRoute(objError: unknown) {
  return objError instanceof ApiRequestError && objError.intStatusCode === 404;
}

export function createInitialLoanAdvanceForm(): LoanAdvanceFormValues {
  const strToday = new Date().toISOString().slice(0, 10);
  return {
    intEmployeeID: "",
    strEmployeeCode: "",
    strRequestType: "loan",
    intCategoryID: "",
    dtRequestDate: strToday,
    decRequestedAmount: "",
    decApprovedAmount: "",
    strReason: "",
    strEmployeeRemarks: "",
    strApproverRemarks: "",
    strPayrollRemarks: "",
    strRecoveryMode: "payroll",
    dtRecoveryStartMonth: strToday.slice(0, 8) + "01",
    intNumberOfInstallments: "1",
    decInstallmentAmount: "",
    blnLastInstallmentAdjustment: true,
    blnAutoDeductInPayroll: true,
  };
}

export function toLoanAdvanceForm(objRecord: LoanAdvanceRecord): LoanAdvanceFormValues {
  return {
    intEmployeeID: objRecord.intEmployeeID || "",
    strEmployeeCode: objRecord.objEmployee?.strEmployeeCode || "",
    strRequestType: objRecord.strRequestType || "loan",
    intCategoryID: objRecord.intCategoryID || "",
    dtRequestDate: (objRecord.dtRequestDate || "").slice(0, 10),
    decRequestedAmount: String(objRecord.decRequestedAmount || ""),
    decApprovedAmount: String(objRecord.decApprovedAmount || ""),
    strReason: objRecord.strReason || "",
    strEmployeeRemarks: objRecord.strEmployeeRemarks || "",
    strApproverRemarks: objRecord.strApproverRemarks || "",
    strPayrollRemarks: objRecord.strPayrollRemarks || "",
    strRecoveryMode: objRecord.strRecoveryMode || "payroll",
    dtRecoveryStartMonth: (objRecord.dtRecoveryStartMonth || "").slice(0, 10),
    intNumberOfInstallments: String(objRecord.intNumberOfInstallments || 1),
    decInstallmentAmount: String(objRecord.decInstallmentAmount || ""),
    blnLastInstallmentAdjustment: objRecord.blnLastInstallmentAdjustment ?? true,
    blnAutoDeductInPayroll: objRecord.blnAutoDeductInPayroll ?? true,
  };
}

function toPayload(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown) {
  return {
    intEmployeeID: dicValues.intEmployeeID ? Number(dicValues.intEmployeeID) : undefined,
    strEmployeeCode: dicValues.strEmployeeCode.trim() || undefined,
    strRequestType: dicValues.strRequestType,
    intCategoryID: Number(dicValues.intCategoryID),
    dtRequestDate: dicValues.dtRequestDate || undefined,
    decRequestedAmount: Number(dicValues.decRequestedAmount || 0),
    decApprovedAmount: Number(dicValues.decApprovedAmount || 0),
    strReason: dicValues.strReason.trim() || undefined,
    strEmployeeRemarks: dicValues.strEmployeeRemarks.trim() || undefined,
    strApproverRemarks: dicValues.strApproverRemarks.trim() || undefined,
    strPayrollRemarks: dicValues.strPayrollRemarks.trim() || undefined,
    strRecoveryMode: dicValues.strRecoveryMode,
    dtRecoveryStartMonth: dicValues.dtRecoveryStartMonth || undefined,
    intNumberOfInstallments: Number(dicValues.intNumberOfInstallments || 1),
    decInstallmentAmount: Number(dicValues.decInstallmentAmount || 0),
    blnLastInstallmentAdjustment: dicValues.blnLastInstallmentAdjustment,
    blnAutoDeductInPayroll: dicValues.blnAutoDeductInPayroll,
    objCalculationSnapshot,
  };
}

function buildListQuery(objFilters?: Record<string, string>) {
  const objParams = new URLSearchParams();
  Object.entries(objFilters || {}).forEach(([strKey, strValue]) => {
    if (strValue && strValue !== "All") objParams.set(strKey, strValue);
  });
  const strQuery = objParams.toString();
  return strQuery ? `?${strQuery}` : "";
}

export const loanAdvanceService = {
  async listLoans(objFilters?: Record<string, string>): Promise<LoanAdvanceRecord[]> {
    const strQuery = buildListQuery(objFilters);
    try {
      const objResult = await requestApi<LoanAdvanceRecord[]>({
        strPath: `/payroll/loans-advances${strQuery}`,
        strMethod: "GET",
        strMenuAction: "LOAN_ADV_VIEW",
      });
      return objResult.Data;
    } catch (objError) {
      if (isMissingBackendRoute(objError)) {
        return [];
      }
      throw objError;
    }
  },
  async listCategories(strRequestType?: string): Promise<LoanAdvanceCategoryRecord[]> {
    const strQuery = strRequestType ? `?request_type=${encodeURIComponent(strRequestType)}` : "";
    try {
      const objResult = await requestApi<LoanAdvanceCategoryRecord[]>({
        strPath: `/payroll/loans-advances/categories${strQuery}`,
        strMethod: "GET",
        strMenuAction: "LOAN_ADV_VIEW",
      });
      return objResult.Data;
    } catch (objError) {
      if (isMissingBackendRoute(objError)) {
        return [];
      }
      throw objError;
    }
  },
  async getCategoryPolicy(intCategoryID: number): Promise<LoanAdvanceCategoryRecord> {
    const objResult = await requestApi<LoanAdvanceCategoryRecord>({
      strPath: `/payroll/loans-advances/categories/${intCategoryID}/policy`,
      strMethod: "GET",
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getLoan(intID: number): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}`,
      strMethod: "GET",
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async createLoan(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: "/payroll/loans-advances",
      strMethod: "POST",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "LOAN_ADV_CREATE",
    });
    return objResult.Data;
  },
  async updateLoan(intID: number, dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues, objCalculationSnapshot),
      strMenuAction: "LOAN_ADV_EDIT",
    });
    return objResult.Data;
  },
  async action(intID: number, strAction: string, objBody?: unknown): Promise<LoanAdvanceRecord> {
    const dicActionCodeByAction: Record<string, string> = {
      "save-draft": "LOAN_ADV_EDIT",
      submit: "LOAN_ADV_SUBMIT",
      approve: "LOAN_ADV_APPROVE",
      reject: "LOAN_ADV_REJECT",
      "send-back": "LOAN_ADV_APPROVE",
      cancel: "LOAN_ADV_CANCEL",
      disburse: "LOAN_ADV_DISBURSE",
      activate: "LOAN_ADV_DISBURSE",
      close: "LOAN_ADV_CLOSE",
      "manual-recovery": "LOAN_ADV_MANUAL_RECOVERY",
      "skip-installment": "LOAN_ADV_SKIP_INSTALLMENT",
      "adjust-schedule": "LOAN_ADV_ADJUST_SCHEDULE",
    };
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/payroll/loans-advances/${intID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: dicActionCodeByAction[strAction] || "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async listEssLoans(objFilters?: Record<string, string>): Promise<LoanAdvanceRecord[]> {
    const objResult = await requestApi<LoanAdvanceRecord[]>({
      strPath: `/ess/loans-advances${buildListQuery(objFilters)}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async listEssCategories(strRequestType?: string): Promise<LoanAdvanceCategoryRecord[]> {
    const strQuery = strRequestType ? `?request_type=${encodeURIComponent(strRequestType)}` : "";
    const objResult = await requestApi<LoanAdvanceCategoryRecord[]>({
      strPath: `/ess/loans-advances/categories${strQuery}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getEssCategoryPolicy(intCategoryID: number): Promise<LoanAdvanceCategoryRecord> {
    const objResult = await requestApi<LoanAdvanceCategoryRecord>({
      strPath: `/ess/loans-advances/categories/${intCategoryID}/policy`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async getEssLoan(intID: number): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${intID}`,
      strMethod: "GET",
      strMenuAction: "ESS_LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async createEssLoan(dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objPayload = toPayload(dicValues, objCalculationSnapshot);
    delete (objPayload as { intEmployeeID?: number }).intEmployeeID;
    delete (objPayload as { strEmployeeCode?: string }).strEmployeeCode;
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: "/ess/loans-advances",
      strMethod: "POST",
      objBody: objPayload,
      strMenuAction: "ESS_LOAN_ADV_CREATE",
    });
    return objResult.Data;
  },
  async updateEssLoan(intID: number, dicValues: LoanAdvanceFormValues, objCalculationSnapshot?: unknown): Promise<LoanAdvanceRecord> {
    const objPayload = toPayload(dicValues, objCalculationSnapshot);
    delete (objPayload as { intEmployeeID?: number }).intEmployeeID;
    delete (objPayload as { strEmployeeCode?: string }).strEmployeeCode;
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${intID}`,
      strMethod: "PUT",
      objBody: objPayload,
      strMenuAction: "ESS_LOAN_ADV_EDIT",
    });
    return objResult.Data;
  },
  async essAction(intID: number, strAction: "submit" | "cancel", objBody?: unknown): Promise<LoanAdvanceRecord> {
    const objResult = await requestApi<LoanAdvanceRecord>({
      strPath: `/ess/loans-advances/${intID}/${strAction}`,
      strMethod: "POST",
      objBody,
      strMenuAction: strAction === "submit" ? "ESS_LOAN_ADV_SUBMIT" : "ESS_LOAN_ADV_CANCEL",
    });
    return objResult.Data;
  },
};

// HR-authorized equivalent of fileUploadService.ts's generic /api/v1/files/* self-service API —
// used by FileUploadPanel (via its objFileService override) when a payroll/HR reviewer needs to
// manage documents on an employee's loan/advance request, since the self-service endpoints derive
// the employee strictly from the caller's own session and would silently target the wrong person.
export function createHrLoanAdvanceFileService(intLoanAdvanceID: number): FileUploadPanelService {
  const strBase = `/payroll/loans-advances/${intLoanAdvanceID}/files`;

  return {
    async listFiles(_objFilter?: ListFilesFilter): Promise<FileMetadataDto[]> {
      const objResult = await requestApi<FileMetadataDto[]>({
        strPath: strBase,
        strMethod: "GET",
        strMenuAction: "LOAN_ADV_VIEW",
      });
      return objResult.Data ?? [];
    },

    async uploadFile(objRequest: UploadFileRequest): Promise<FileMetadataDto> {
      const objFormData = new FormData();
      objFormData.append("objFile", objRequest.objFile);
      try {
        const objResponse = await axiosInstance.request<{ Data: FileMetadataDto }>({
          method: ApiRequestMethod.Post,
          url: `${ApiRoutePrefix.ApiV1}${strBase}`,
          data: objFormData,
          csrfMenuAction: "LOAN_ADV_EDIT",
          onUploadProgress: objRequest.fnOnProgress
            ? (objProgressEvent) => {
                if (objProgressEvent.total) {
                  objRequest.fnOnProgress?.(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
                }
              }
            : undefined,
        } as ApiRequestConfig);
        return objResponse.data.Data;
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },

    async replaceFile(intFileID: number, objFile: File, fnOnProgress?: (intPercentComplete: number) => void): Promise<FileMetadataDto> {
      const objFormData = new FormData();
      objFormData.append("objFile", objFile);
      try {
        const objResponse = await axiosInstance.request<{ Data: FileMetadataDto }>({
          method: ApiRequestMethod.Put,
          url: `${ApiRoutePrefix.ApiV1}${strBase}/${intFileID}`,
          data: objFormData,
          csrfMenuAction: "LOAN_ADV_EDIT",
          onUploadProgress: fnOnProgress
            ? (objProgressEvent) => {
                if (objProgressEvent.total) {
                  fnOnProgress(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
                }
              }
            : undefined,
        } as ApiRequestConfig);
        return objResponse.data.Data;
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },

    async deleteFile(intFileID: number): Promise<void> {
      await requestApi<null>({
        strPath: `${strBase}/${intFileID}`,
        strMethod: "DELETE",
        strMenuAction: "LOAN_ADV_EDIT",
      });
    },

    async previewFile(intFileID: number): Promise<void> {
      try {
        const objResponse = await axiosInstance.request<Blob>({
          method: ApiRequestMethod.Get,
          url: `${ApiRoutePrefix.ApiV1}${strBase}/${intFileID}/content`,
          responseType: "blob",
          csrfMenuAction: "LOAN_ADV_VIEW",
        } as ApiRequestConfig);
        const strUrl = URL.createObjectURL(objResponse.data);
        openBlobUrlInNewTab(strUrl);
        window.setTimeout(() => URL.revokeObjectURL(strUrl), 30000);
      } catch (objError) {
        throw await createApiRequestError(objError);
      }
    },
  };
}
