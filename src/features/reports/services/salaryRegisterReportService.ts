"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

export type SalaryRegisterRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  strDepartment: string | null;
  strDesignation: string | null;
  strLocation: string | null;
  strCostCenter: string | null;
  strEmployeeCategory: string | null;
  strState: string | null;
  strPayCycle: string | null;
  strDataSource: "Processed" | "Configured";
  decTotalPresentDays: number | null;
  dicPayments: Record<string, number>;
  dicRecoveries: Record<string, number>;
  decGrossEarning: number;
  decGrossDeduction: number;
  decNetEarning: number;
};

export type SalaryRegisterEnvelope = {
  lstItems: SalaryRegisterRow[];
  intTotal: number;
  intPage: number;
  intPageSize: number;
  strScope: string;
  strMonth: string;
  strMonthLabel: string;
  strCompanyName: string;
  lstPaymentColumns: string[];
  lstRecoveryColumns: string[];
};

function buildQuery(dicFilters: Record<string, string | number | undefined | null>): string {
  const objParams = new URLSearchParams();
  Object.entries(dicFilters).forEach(([strKey, objValue]) => {
    if (objValue !== undefined && objValue !== null && String(objValue).trim() !== "") {
      objParams.set(strKey, String(objValue).trim());
    }
  });
  const strQuery = objParams.toString();
  return strQuery ? `?${strQuery}` : "";
}

// A generous single-page fetch; the grid paginates client-side, matching the other report pages.
// Must stay <= the backend route's page_size cap (see getSalaryRegisterReport in ReportRoutes.py).
const REPORT_PAGE_SIZE = 1000;

export const salaryRegisterReportService = {
  async getSalaryRegister(dicFilters: Record<string, string | number | undefined>): Promise<SalaryRegisterEnvelope> {
    const strQuery = buildQuery({ ...dicFilters, page: 1, page_size: REPORT_PAGE_SIZE });
    const objResult = await requestEncryptedApi<SalaryRegisterEnvelope>({
      strPath: `${ApiRoutePrefix.ApiV1}/reports/salary/register${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "SALARY_REGISTER",
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },
};
