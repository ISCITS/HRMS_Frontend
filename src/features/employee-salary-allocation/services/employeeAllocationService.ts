"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

const EMPLOYEE_SALARY_VIEW = "employee_salary_view";
const EMPLOYEE_SALARY_EDIT = "employee_salary_edit";

// The backend serializes every Decimal as a string, so every dec* field below is a string.
export type EmployeeAllocationRow = {
  intAllocationEntityID: number;
  decAllocationPercent: string;
  strRemarks: string | null;
  decIllustrativeBaseShare: string | null;
};

export type EmployeeAllocationRecord = {
  intEmployeeSalaryComponentID: number;
  intSalaryComponentID: number;
  intAllocationEntityTypeID: number | null;
  decBaseAmountMonthly: string | null;
  lstAllocations: EmployeeAllocationRow[];
};

export type EmployeeAllocationSaveRow = {
  intAllocationEntityID: number;
  decAllocationPercent: number;
  strRemarks?: string | null;
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

export const employeeAllocationService = {
  async getAllocation(intEmployeeSalaryComponentID: number): Promise<EmployeeAllocationRecord> {
    const objResult = await requestApi<EmployeeAllocationRecord>({
      strPath: `/employee-salary/components/${intEmployeeSalaryComponentID}/allocation`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: EMPLOYEE_SALARY_VIEW,
    });
    return objResult.Data;
  },

  // The backend rejects the whole payload unless the active rows total exactly 100.0000%
  // and every decAllocationPercent is > 0, so zero/blank rows must be dropped by the caller.
  async saveAllocation(
    intEmployeeSalaryComponentID: number,
    lstAllocations: EmployeeAllocationSaveRow[],
  ): Promise<EmployeeAllocationRecord> {
    const objResult = await requestApi<EmployeeAllocationRecord>({
      strPath: `/employee-salary/components/${intEmployeeSalaryComponentID}/allocation`,
      strMethod: ApiRequestMethod.Put,
      objBody: { lstAllocations },
      strMenuAction: EMPLOYEE_SALARY_EDIT,
    });
    return objResult.Data;
  },
};
