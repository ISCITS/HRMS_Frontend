"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalarySummaryRecord,
} from "@/features/employee-salary/types";

export type FlexiDeclarationSavePayload = {
  strFinancialYearCode?: string | null;
  strEmployeeRemarks?: string | null;
  lstItems: Array<{
    intSalaryComponentID: number;
    decDeclaredAnnual?: number | null;
    decDeclaredMonthly?: number | null;
  }>;
  lstAnswers?: Array<{
    strAnswerCode: string;
    strAnswerValue?: string | null;
  }>;
};

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

export const flexiPayDeclarationService = {
  async getSummary(intEmployeeID: number): Promise<EmployeeSalarySummaryRecord> {
    const objResult = await requestApi<EmployeeSalarySummaryRecord>({
      strPath: "/employee-salary/summary/detail",
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intEmployeeID },
      strMenuAction: "ESS_FLEXI_PAY_DECLARATION_SALARY_VIEW",
    });
    return objResult.Data;
  },

  async getDetail(intEmployeeID: number): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await requestApi<EmployeeSalaryDetailRecord>({
      strPath: "/employee-salary/flexi-declaration/detail",
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intEmployeeID },
      strMenuAction: "ESS_FLEXI_PAY_DECLARATION_SALARY_VIEW",
    });
    return objResult.Data;
  },

  async saveDraft(
    intEmployeeID: number,
    objPayload: FlexiDeclarationSavePayload,
  ): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await requestApi<EmployeeSalaryDetailRecord>({
      strPath: `/employee-salary/${intEmployeeID}/flexi-declaration/draft`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "ESS_FLEXI_PAY_DECLARATION_EDIT",
    });
    return objResult.Data;
  },

  async submit(
    intEmployeeID: number,
    objPayload: FlexiDeclarationSavePayload,
  ): Promise<EmployeeSalaryDetailRecord> {
    const objResult = await requestApi<EmployeeSalaryDetailRecord>({
      strPath: `/employee-salary/${intEmployeeID}/flexi-declaration/submit`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: "ESS_FLEXI_PAY_DECLARATION_SUBMIT",
    });
    return objResult.Data;
  },
};
