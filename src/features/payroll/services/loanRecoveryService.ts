import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type { LoanRecoveryEligibleResult, LoanRecoveryPostResult, LoanRecoveryRunOption } from "@/features/payroll/types";

async function requestApi<TData>(objOptions: { strPath: string; strMethod: ApiRequestMethod | "GET" | "POST"; objBody?: unknown; strMenuAction: string }): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const loanRecoveryService = {
  async listEligiblePayrollRuns(): Promise<LoanRecoveryRunOption[]> {
    const objResult = await requestApi<LoanRecoveryRunOption[]>({
      strPath: "/payroll/loan-recovery/payroll-runs",
      strMethod: "GET",
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async listEligible(strPayrollRunUUID: string): Promise<LoanRecoveryEligibleResult> {
    const objResult = await requestApi<LoanRecoveryEligibleResult>({
      strPath: `/payroll/loan-recovery/${strPayrollRunUUID}/eligible`,
      strMethod: "GET",
      strMenuAction: "LOAN_ADV_VIEW",
    });
    return objResult.Data;
  },
  async post(strPayrollRunUUID: string, lstScheduleIDs: number[]): Promise<LoanRecoveryPostResult> {
    const objResult = await requestApi<LoanRecoveryPostResult>({
      strPath: `/payroll/loan-recovery/${strPayrollRunUUID}/post`,
      strMethod: "POST",
      objBody: { lstScheduleIDs },
      strMenuAction: "LOAN_ADV_RECOVERY_POST",
    });
    return objResult.Data;
  },
  async unpost(intScheduleID: number, strReason?: string): Promise<LoanRecoveryEligibleResult> {
    const objResult = await requestApi<LoanRecoveryEligibleResult>({
      strPath: `/payroll/loan-recovery/schedule/${intScheduleID}/unpost`,
      strMethod: "POST",
      objBody: strReason ? { strReason } : undefined,
      strMenuAction: "LOAN_ADV_RECOVERY_UNPOST",
    });
    return objResult.Data;
  },
};
