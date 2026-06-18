"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  EmployeeSalaryDetailRecord,
  EmployeeSalarySummaryRecord,
} from "@/features/employee-salary/types";

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
      strPath: "/employee-salary/detail",
      strMethod: ApiRequestMethod.Post,
      objBody: { intID: intEmployeeID },
      strMenuAction: "ESS_FLEXI_PAY_DECLARATION_SALARY_VIEW",
    });
    return objResult.Data;
  },
};
