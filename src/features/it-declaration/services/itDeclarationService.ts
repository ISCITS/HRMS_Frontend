"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { FileUploadProgressHandler } from "@/lib/fileUploadService";

export type ItDeclarationStatus = "draft" | "submitted" | "approved" | "rejected";
export type ItDeclarationFlowStatus = "NOT_STARTED" | "REGIME_SELECTED" | "IN_PROGRESS" | "SUBMITTED";
export type ItDeclarationRegime = "Old Regime" | "New Regime";
export type ItDeclarationPrimaryAction = "continue" | "view" | "edit" | "submit";

export type ItDeclarationDashboardCardDto = {
  intDeclarationID: number;
  strFinancialYearCode: string;
  strTaxRegime: string;
  strStatus: string;
  decDeclaredAmount: number;
  decApprovedAmount: number;
  strLastUpdated?: string | null;
  blnReadOnly: boolean;
  strPrimaryAction: ItDeclarationPrimaryAction;
};

export type ItDeclarationDashboardDto = {
  strCurrentFinancialYearCode: string;
  lstDeclarations: ItDeclarationDashboardCardDto[];
};

export type ItDeclarationItemDto = {
  intItemID?: number | null;
  strSection: string;
  strDeclarationKind?: string | null;
  strDescription: string;
  strMaxLimit: string;
  decMaxLimitAmount?: number | null;
  decMaxEligibleAmount?: number | null;
  strMaxLimitAppliedAt?: "ENTRY_LEVEL" | "APPROVAL_LEVEL" | "Entry Level" | "Approval Level" | string | null;
  blnProofRequired?: boolean;
  decDeclaredAmount: number;
  strInvestmentName: string;
  strStatus: "Completed" | "In Progress" | "Not Started";
  objProof?: {
    intProofID: number;
    strFileName: string;
    strFilePath: string;
    strMimeType: string;
    intFileSizeBytes: number;
    strVerificationStatus: string;
  } | null;
};

export type ItDeclarationProofPreviewDto = {
  intProofID: number;
  strFileName: string;
  strMimeType: string;
  strBase64Content: string;
  intFileSizeBytes: number;
};

export type ItDeclarationInvestmentOptionDto = {
  strOptionCode: string;
  strOptionName: string;
  strSectionCode: string;
};

export type ItDeclarationSummaryDto = {
  decGrossSalary: number;
  decExemptions: number;
  decDeductions?: number;
  decTaxableIncome: number;
  decTaxableIncomeOld?: number;
  decTaxableIncomeNew?: number;
  decOldTax: number;
  decNewTax: number;
  decSavings: number;
  strSelectedSlabProfileCode?: string;
  strResidentialStatusCode?: string;
  intAgeYears?: number | null;
  objSelectedRegimeBreakdown?: Record<string, unknown> | null;
  objOldRegimeBreakdown?: Record<string, unknown> | null;
  objNewRegimeBreakdown?: Record<string, unknown> | null;
  blnSummaryFallback?: boolean;
  blnSelectedRegimePayrollAligned?: boolean;
  strSelectedRegimeTaxBasis?: "declared" | "approved" | string;
  strSummaryNote?: string;
  strSummaryWarning?: string;
  strRecommendedRegime: ItDeclarationRegime;
};

export type ItDeclarationDto = {
  intDeclarationID?: number | null;
  strFinancialYearCode: string;
  strFlowStatus: ItDeclarationFlowStatus;
  strSelectedRegime: ItDeclarationRegime | "";
  strDeclarationStatus: ItDeclarationStatus;
  strLastUpdated: string;
  lstItems: ItDeclarationItemDto[];
  objSummary: ItDeclarationSummaryDto;
  objRegimeConfig?: {
    strDefaultRegime: ItDeclarationRegime;
    blnAllowEmployeeOptOut: boolean;
  };
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const itDeclarationService = {
  async getDeclaration(strFinancialYearCode: string): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: "/ess/it-declaration",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: { financial_year_code: strFinancialYearCode },
      strMenuAction: "ESS_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async startDeclaration(strFinancialYearCode: string, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: "/ess/it-declaration/start",
      strMethod: ApiRequestMethod.Post,
      objBody: {
        // Backend contracts in this module primarily use snake_case.
        financial_year_code: strFinancialYearCode,
        selected_regime: strRegime,
        strFinancialYearCode,
        strSelectedRegime: strRegime,
      },
      strMenuAction: "ESS_IT_DECLARATION_START",
    });
    return objResult.Data;
  },

  async changeRegime(intDeclarationID: number, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/regime`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strSelectedRegime: strRegime },
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async saveItem(
    intDeclarationID: number,
    objItem: { intItemID?: number | null; strSection: string; strInvestmentName: string; decDeclaredAmount: number }
  ): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/items/save`,
      strMethod: ApiRequestMethod.Post,
      objBody: objItem,
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async deleteItem(intDeclarationID: number, intItemID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/items/${intItemID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async getDashboard(): Promise<ItDeclarationDashboardDto> {
    const objResult = await requestApi<ItDeclarationDashboardDto>({
      strPath: "/ess/it-declaration/dashboard",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? { strCurrentFinancialYearCode: "", lstDeclarations: [] };
  },

  async uploadItemProof(
    intDeclarationID: number,
    intItemID: number,
    objFile: File,
    strDocumentType = "investment_proof",
    fnOnProgress?: FileUploadProgressHandler
  ): Promise<ItDeclarationDto> {
    // Called directly through axiosInstance (rather than the requestApi/requestEncryptedApi helper
    // above) only so onUploadProgress can be wired for a real progress bar — the URL, method and
    // FormData field names are unchanged from before. Mirrors reimbursementService.uploadProof().
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", strDocumentType);
    try {
      const objResponse = await axiosInstance.request<ItDeclarationDto | { Data: ItDeclarationDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/ess/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
        data: objFormData,
        csrfMenuAction: "ESS_IT_DECLARATION_UPDATE",
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
      throw await createApiRequestError<ItDeclarationDto>(objError);
    }
  },

  async previewItemProof(
    intDeclarationID: number,
    intItemID: number
  ): Promise<ItDeclarationProofPreviewDto> {
    const objResult = await requestApi<ItDeclarationProofPreviewDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async deleteItemProof(
    intDeclarationID: number,
    intItemID: number
  ): Promise<ItDeclarationDto | null> {
    const objResult = await requestApi<ItDeclarationDto | null>({
      strPath: `/ess/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },

  async listInvestmentOptions(
    strSectionCode: string
  ): Promise<ItDeclarationInvestmentOptionDto[]> {
    const objResult = await requestApi<ItDeclarationInvestmentOptionDto[]>({
      strPath: "/ess/it-declaration/investment-options",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: { section_code: strSectionCode },
      strMenuAction: "ESS_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? [];
  },

  async compareTax(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/compare`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_COMPARE",
    });
    return objResult.Data;
  },

  async submitDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/submit`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/withdraw`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_WITHDRAW",
    });
    return objResult.Data;
  },

  async copyPreviousDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/ess/it-declaration/${intDeclarationID}/copy-previous`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "ESS_IT_DECLARATION_UPDATE",
    });
    return objResult.Data;
  },
};

export type ItDeclarationEnvelope = ApiEnvelope<ItDeclarationDto>;

export type HrItDeclarationEmployeeOption = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strFullName: string;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
  boolHasDeclaration: boolean;
};

export type HrEmployeeItDeclarationListRecord = {
  intEmployeeID?: number;
  strEmployeeCode?: string;
  strFullName?: string;
  strDeclarationCode: string;
  intDeclarationID: number;
  strFinancialYearCode: string;
  strTaxRegime: string;
  decDeclaredTotalAmount: number;
  decApprovedTotalAmount: number;
  intProofPendingCount: number;
  strStatus: string;
  strSubmittedOn?: string | null;
  strLastUpdated?: string | null;
};

export type HrEmployeeItDeclarationListDto = {
  objEmployee: {
    intEmployeeID: number;
    strEmployeeCode: string;
    strFullName: string;
  };
  lstRows: HrEmployeeItDeclarationListRecord[];
};

export const hrItDeclarationService = {
  async listEmployees(objFilters?: { strSearch?: string; strFinancialYearCode?: string }): Promise<HrItDeclarationEmployeeOption[]> {
    const objQueryParams = {
      ...(objFilters?.strSearch?.trim() ? { search: objFilters.strSearch.trim() } : {}),
      ...(objFilters?.strFinancialYearCode?.trim() ? { financial_year_code: objFilters.strFinancialYearCode.trim() } : {}),
    };
    const objResult = await requestApi<HrItDeclarationEmployeeOption[]>({
      strPath: "/hr/it-declaration/employees",
      strMethod: ApiRequestMethod.Get,
      objQueryParams,
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? [];
  },

  async getEmployeeDeclarations(intEmployeeID?: number | null, strFinancialYearCode?: string): Promise<HrEmployeeItDeclarationListDto> {
    const objQueryParams = {
      ...(intEmployeeID ? { employee_id: intEmployeeID } : {}),
      ...(strFinancialYearCode?.trim() ? { financial_year_code: strFinancialYearCode.trim() } : {}),
    };
    const objResult = await requestApi<HrEmployeeItDeclarationListDto>({
      strPath: "/hr/it-declaration",
      strMethod: ApiRequestMethod.Get,
      objQueryParams,
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? { objEmployee: { intEmployeeID: intEmployeeID ?? 0, strEmployeeCode: "", strFullName: "" }, lstRows: [] };
  },

  async getDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/declaration/${intDeclarationID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async startDeclaration(intEmployeeID: number, strFinancialYearCode: string, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: "/hr/it-declaration/start",
      strMethod: ApiRequestMethod.Post,
      objBody: { intEmployeeID, strFinancialYearCode, strSelectedRegime: strRegime },
      strMenuAction: "HR_IT_DECLARATION_ADD",
    });
    return objResult.Data;
  },

  async changeRegime(intDeclarationID: number, strRegime: ItDeclarationRegime): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/regime`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strSelectedRegime: strRegime },
      strMenuAction: "HR_IT_DECLARATION_EDIT",
    });
    return objResult.Data;
  },

  async saveItem(
    intDeclarationID: number,
    objItem: { intItemID?: number | null; strSection: string; strInvestmentName: string; decDeclaredAmount: number }
  ): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/items/save`,
      strMethod: ApiRequestMethod.Post,
      objBody: objItem,
      strMenuAction: "HR_IT_DECLARATION_EDIT",
    });
    return objResult.Data;
  },

  async deleteItem(intDeclarationID: number, intItemID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/items/${intItemID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "HR_IT_DECLARATION_DELETE",
    });
    return objResult.Data;
  },

  async uploadItemProof(
    intDeclarationID: number,
    intItemID: number,
    objFile: File,
    strDocumentType = "investment_proof",
    fnOnProgress?: FileUploadProgressHandler
  ): Promise<ItDeclarationDto> {
    // See itDeclarationService.uploadItemProof for why this bypasses requestApi (progress wiring only).
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", strDocumentType);
    try {
      const objResponse = await axiosInstance.request<ItDeclarationDto | { Data: ItDeclarationDto }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/hr/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
        data: objFormData,
        csrfMenuAction: "HR_IT_DECLARATION_EDIT",
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
      throw await createApiRequestError<ItDeclarationDto>(objError);
    }
  },

  async previewItemProof(intDeclarationID: number, intItemID: number): Promise<ItDeclarationProofPreviewDto> {
    const objResult = await requestApi<ItDeclarationProofPreviewDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async deleteItemProof(intDeclarationID: number, intItemID: number): Promise<ItDeclarationDto | null> {
    const objResult = await requestApi<ItDeclarationDto | null>({
      strPath: `/hr/it-declaration/${intDeclarationID}/items/${intItemID}/proof`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "HR_IT_DECLARATION_DELETE",
    });
    return objResult.Data;
  },

  async listInvestmentOptions(strSectionCode: string): Promise<ItDeclarationInvestmentOptionDto[]> {
    const objResult = await requestApi<ItDeclarationInvestmentOptionDto[]>({
      strPath: "/hr/it-declaration/investment-options",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: { section_code: strSectionCode },
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? [];
  },

  async compareTax(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/compare`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "HR_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async submitDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/submit`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "HR_IT_DECLARATION_SUBMIT",
    });
    return objResult.Data;
  },

  async withdrawDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/withdraw`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "HR_IT_DECLARATION_EDIT",
    });
    return objResult.Data;
  },

  async copyPreviousDeclaration(intDeclarationID: number): Promise<ItDeclarationDto> {
    const objResult = await requestApi<ItDeclarationDto>({
      strPath: `/hr/it-declaration/${intDeclarationID}/copy-previous`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "HR_IT_DECLARATION_EDIT",
    });
    return objResult.Data;
  },
};

export type HrItDeclarationListRecord = {
  strDeclarationCode: string;
  intDeclarationID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strFinancialYearCode: string;
  strTaxRegime: string;
  decDeclaredTotalAmount: number;
  decApprovedTotalAmount: number;
  intProofPendingCount: number;
  strStatus: string;
  strSubmittedOn?: string | null;
  strLastUpdated?: string | null;
  strCompanyName?: string | null;
  strDepartmentName?: string | null;
  strLocationName?: string | null;
};

export type HrItDeclarationItemRecord = {
  intItemID: number;
  strSection: string;
  strDescription: string;
  strInvestmentName?: string | null;
  strInvestmentOptionName?: string | null;
  strOptionName?: string | null;
  strDeductionName?: string | null;
  strComponentName?: string | null;
  investment_name?: string | null;
  investmentName?: string | null;
  strEmployeeRemarks?: string | null;
  strReviewerRemarks?: string | null;
  strMaxLimit?: string | null;
  decMaxLimitAmount?: number | null;
  decMaxEligibleAmount?: number | null;
  strMaxLimitAppliedAt?: "ENTRY_LEVEL" | "APPROVAL_LEVEL" | "Entry Level" | "Approval Level" | string | null;
  decDeclaredAmount: number;
  decApprovedAmount: number;
  strItemStatus: string;
  strProofStatus?: string | null;
  blnProofRequired?: boolean;
};

export type HrItDeclarationProofRecord = {
  intProofID: number;
  intItemID: number;
  strFileName: string;
  strMimeType: string;
  intFileSizeBytes: number;
  strVerificationStatus: string;
};

export type HrItDeclarationAuditRecord = {
  strAction: string;
  strActionBy: string;
  strActionOn: string;
  strRemarks?: string | null;
};

export type HrItDeclarationDetailRecord = {
  intDeclarationID: number;
  strDeclarationCode: string;
  strEmployeeCode: string;
  strEmployeeName: string;
  strFinancialYearCode: string;
  strTaxRegime: string;
  strStatus: string;
  blnLocked: boolean;
  decDeclaredTotalAmount: number;
  decApprovedTotalAmount: number;
  intProofPendingCount: number;
  objHraDetails?: Record<string, unknown> | null;
  objHomeLoanDetails?: Record<string, unknown> | null;
  objPreviousEmployerDetails?: Record<string, unknown> | null;
  lstItems: HrItDeclarationItemRecord[];
  lstProofs: HrItDeclarationProofRecord[];
};

export const hrItDeclarationReviewService = {
  async getList(objFilters?: Record<string, string | number | boolean | null | undefined>): Promise<{ lstRows: HrItDeclarationListRecord[]; objSummary: Record<string, number> }> {
    const objResult = await requestApi<{ lstRows: HrItDeclarationListRecord[]; objSummary: Record<string, number> }>({
      strPath: "/payroll/it-declaration-review",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: objFilters,
      strMenuAction: "PAYROLL_IT_DECLARATION_VIEW",
    });
    return objResult.Data ?? { lstRows: [], objSummary: {} };
  },

  async getDetail(intDeclarationID: number): Promise<HrItDeclarationDetailRecord> {
    const objResult = await requestApi<HrItDeclarationDetailRecord>({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async startReview(intDeclarationID: number) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/start-review`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "PAYROLL_IT_DECLARATION_REVIEW",
    });
  },

  async reviewItem(intDeclarationID: number, intItemID: number, strAction: "approve" | "reject" | "partial-approve" | "proof-pending", objPayload?: unknown) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/items/${intItemID}/${strAction}`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: strAction === "reject" ? "PAYROLL_IT_DECLARATION_REJECT" : "PAYROLL_IT_DECLARATION_APPROVE",
    });
  },

  async reviewProof(intDeclarationID: number, intItemID: number, strAction: "verify" | "reject", objPayload?: unknown) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/items/${intItemID}/proof/${strAction}`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_IT_DECLARATION_PROOF_VERIFY",
    });
  },

  async reviewHeader(intDeclarationID: number, strAction: "approve" | "reject", objPayload?: unknown) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/${strAction}`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: strAction === "approve" ? "PAYROLL_IT_DECLARATION_APPROVE" : "PAYROLL_IT_DECLARATION_REJECT",
    });
  },

  async release(intDeclarationID: number, objPayload: { strRemarks: string }) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/release`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_IT_DECLARATION_RELEASE",
    });
  },

  async lock(intDeclarationID: number, objPayload?: { strRemarks?: string }) {
    return requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/lock`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_IT_DECLARATION_LOCK",
    });
  },

  async getAudit(intDeclarationID: number): Promise<HrItDeclarationAuditRecord[]> {
    const objResult = await requestApi<HrItDeclarationAuditRecord[]>({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/audit`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_IT_DECLARATION_AUDIT_VIEW",
    });
    return objResult.Data ?? [];
  },

  async previewProof(intDeclarationID: number, intItemID: number): Promise<ItDeclarationProofPreviewDto> {
    const objResult = await requestApi<ItDeclarationProofPreviewDto>({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/items/${intItemID}/proof`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

  async uploadProof(
    intDeclarationID: number,
    intItemID: number,
    objFile: File,
    strDocumentType = "investment_proof",
    fnOnProgress?: FileUploadProgressHandler
  ): Promise<void> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    objFormData.append("strDocumentType", strDocumentType);
    try {
      await axiosInstance.request({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/payroll/it-declaration-review/${intDeclarationID}/items/${intItemID}/proof`,
        data: objFormData,
        csrfMenuAction: "PAYROLL_IT_DECLARATION_EDIT",
        onUploadProgress: fnOnProgress
          ? (objProgressEvent) => {
              if (objProgressEvent.total) {
                fnOnProgress(Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total)));
              }
            }
          : undefined,
      } as ApiRequestConfig);
    } catch (objError) {
      throw await createApiRequestError(objError);
    }
  },

  async deleteProofByID(intDeclarationID: number, intItemID: number, intProofID: number): Promise<void> {
    await requestApi({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/items/${intItemID}/proof/${intProofID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: "PAYROLL_IT_DECLARATION_EDIT",
    });
  },

  async previewProofByID(intDeclarationID: number, intProofID: number): Promise<ItDeclarationProofPreviewDto> {
    const objResult = await requestApi<ItDeclarationProofPreviewDto>({
      strPath: `/payroll/it-declaration-review/${intDeclarationID}/proof/${intProofID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_IT_DECLARATION_VIEW",
    });
    return objResult.Data;
  },

};
