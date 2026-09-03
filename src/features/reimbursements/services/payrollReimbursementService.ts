"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type { ReimbursementClaimDto } from "@/features/reimbursements/types";
import type { PayrollRunOption } from "@/features/payroll/types";

export type PayrollReimbursementFilters = {
  strStatus: string;
  intEmployeeID: string;
  strSearchText: string;
  strClaimMonth: string;
  strReimbursementType: string;
  strProofPending: string;
  strPayrollStatus: string;
  strCompany: string;
  strDepartment: string;
  strLocation: string;
};

export type ReimbursementAuditRecord = {
  intID: number;
  intClaimID: number;
  intClaimItemID?: number | null;
  strActionCode: string;
  strFromStatus?: string | null;
  strToStatus?: string | null;
  strRemarks?: string | null;
  intActionBy?: number | null;
  dtActionOn?: string | null;
};

export type ReimbursementDecisionPayload = {
  strRemarks?: string | null;
};

export type ReimbursementItemDecisionPayload = {
  decApprovedAmount?: number | null;
  strRemarks?: string | null;
  blnOverrideProofRequirement?: boolean;
};

export type ReimbursementPushPayload = {
  intPayrollRunID?: number | null;
  strRemarks?: string | null;
};

export type ReimbursementFinanceSettlementPayload = {
  strPaymentReference?: string | null;
  strRemarks?: string | null;
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

export function createInitialPayrollReimbursementFilters(): PayrollReimbursementFilters {
  return {
    strStatus: "",
    intEmployeeID: "",
    strSearchText: "",
    strClaimMonth: "",
    strReimbursementType: "",
    strProofPending: "",
    strPayrollStatus: "",
    strCompany: "",
    strDepartment: "",
    strLocation: "",
  };
}

export const payrollReimbursementService = {
  async listClaims(dicFilters: PayrollReimbursementFilters): Promise<ReimbursementClaimDto[]> {
    const objResult = await requestApi<ReimbursementClaimDto[]>({
      strPath: "/payroll/reimbursements",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: {
        status: dicFilters.strStatus || undefined,
        employee_id: dicFilters.intEmployeeID ? Number(dicFilters.intEmployeeID) : undefined,
      },
      strMenuAction: "PAYROLL_REIMBURSEMENT_VIEW",
    });
    return objResult.Data ?? [];
  },

  async getClaim(strClaimRecordUUID: string): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_REIMBURSEMENT_VIEW",
    });
    return objResult.Data;
  },

  async listEligiblePayrollRuns(strClaimRecordUUID: string): Promise<PayrollRunOption[]> {
    const objResult = await requestApi<PayrollRunOption[]>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/payroll-runs`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_REIMBURSEMENT_VIEW",
    });
    return objResult.Data ?? [];
  },

  async startReview(strClaimRecordUUID: string): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/start-review`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "PAYROLL_REIMBURSEMENT_REVIEW",
    });
    return objResult.Data;
  },

  async approveClaim(strClaimRecordUUID: string, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_APPROVE",
    });
    return objResult.Data;
  },

  async rejectClaim(strClaimRecordUUID: string, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/reject`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_REJECT",
    });
    return objResult.Data;
  },

  async releaseClaim(strClaimRecordUUID: string, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/release`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_RELEASE",
    });
    return objResult.Data;
  },

  async lockClaim(strClaimRecordUUID: string): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/lock`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: "PAYROLL_REIMBURSEMENT_LOCK",
    });
    return objResult.Data;
  },

  async pushToPayroll(strClaimRecordUUID: string, objPayload: ReimbursementPushPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/push-to-payroll`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_PUSH_TO_PAYROLL",
    });
    return objResult.Data;
  },

  async markFinanceSettled(strClaimRecordUUID: string, objPayload: ReimbursementFinanceSettlementPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/mark-finance-settled`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_RELEASE",
    });
    return objResult.Data;
  },

  async approveItem(strClaimRecordUUID: string, intItemID: number, objPayload: ReimbursementItemDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/items/${intItemID}/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_APPROVE",
    });
    return objResult.Data;
  },

  async rejectItem(strClaimRecordUUID: string, intItemID: number, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/items/${intItemID}/reject`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_REJECT",
    });
    return objResult.Data;
  },

  async markProofPending(strClaimRecordUUID: string, intItemID: number, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/items/${intItemID}/mark-proof-pending`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_REVIEW",
    });
    return objResult.Data;
  },

  async verifyProof(strClaimRecordUUID: string, intProofID: number, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/proofs/${intProofID}/verify`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_PROOF_VERIFY",
    });
    return objResult.Data;
  },

  async rejectProof(strClaimRecordUUID: string, intProofID: number, objPayload: ReimbursementDecisionPayload): Promise<ReimbursementClaimDto> {
    const objResult = await requestApi<ReimbursementClaimDto>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/proofs/${intProofID}/reject`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "PAYROLL_REIMBURSEMENT_PROOF_VERIFY",
    });
    return objResult.Data;
  },

  async previewProof(strClaimRecordUUID: string, intProofID: number): Promise<Blob> {
    const objResponse = await axiosInstance.request<Blob>({
      method: ApiRequestMethod.Get,
      url: `${ApiRoutePrefix.ApiV1}/payroll/reimbursements/${strClaimRecordUUID}/proofs/${intProofID}/preview`,
      responseType: "blob",
      csrfMenuAction: "PAYROLL_REIMBURSEMENT_VIEW",
    } as ApiRequestConfig);
    return objResponse.data;
  },

  async listAudit(strClaimRecordUUID: string): Promise<ReimbursementAuditRecord[]> {
    const objResult = await requestApi<ReimbursementAuditRecord[]>({
      strPath: `/payroll/reimbursements/${strClaimRecordUUID}/audit`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_REIMBURSEMENT_AUDIT_VIEW",
    });
    return objResult.Data ?? [];
  },
};
