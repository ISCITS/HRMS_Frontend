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

// Developer Guide s6, last bullet: a Separate-Payroll salary component (e.g. Incentive) is
// deliberately rejected as a Salary Structure line, so its employee-specific CTC/base
// entitlement is assigned directly here against the employee's current salary structure period.
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
    dicAmount: { decAmountMonthly?: number | null; decAmountAnnual?: number | null },
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
