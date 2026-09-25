"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

const EMPLOYEE_SALARY_VIEW = "employee_salary_view";
const EMPLOYEE_SALARY_EDIT = "employee_salary_edit";

// The backend serializes every Decimal as a nullable number here (EmployeeSalaryRepository's
// normalizeDecimal returns float|None, not a string), unlike the allocation endpoints above.
export type SeparatePayComponentEntitlementRecord = {
  intSalaryComponentID: number;
  strComponentCode: string;
  strComponentName: string;
  strVariablePayCalculationMethodCode: string;
  intEmployeeSalaryComponentID: number | null;
  decAmountMonthly: number | null;
  decAmountAnnual: number | null;
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

// Assigns any active salary component's value directly to one employee, without adding it as a
// Salary Structure line - used by the Employee Salary Detail "Add Line" flow for a component
// that isn't part of the employee's assigned structure (e.g. Incentive, which stays out of the
// structure on purpose since it's processed via Separate Payroll).
export const separatePayEntitlementService = {
  async listEntitlements(strEmployeeID: string | number): Promise<SeparatePayComponentEntitlementRecord[]> {
    const objResult = await requestApi<SeparatePayComponentEntitlementRecord[]>({
      strPath: `/employee-salary/${strEmployeeID}/separate-pay-components`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: EMPLOYEE_SALARY_VIEW,
    });
    return objResult.Data;
  },

  async saveEntitlement(
    strEmployeeID: string | number,
    intSalaryComponentID: number,
    dicAmount: { decAmountMonthly?: number | null; decAmountAnnual?: number | null; strRemarks?: string | null },
  ): Promise<{ intSalaryComponentID: number; intEmployeeSalaryComponentID: number; decAmountMonthly: number | null; decAmountAnnual: number | null }> {
    const objResult = await requestApi<{
      intSalaryComponentID: number;
      intEmployeeSalaryComponentID: number;
      decAmountMonthly: number | null;
      decAmountAnnual: number | null;
    }>({
      strPath: `/employee-salary/${strEmployeeID}/separate-pay-components/${intSalaryComponentID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: dicAmount,
      strMenuAction: EMPLOYEE_SALARY_EDIT,
    });
    return objResult.Data;
  },
};
