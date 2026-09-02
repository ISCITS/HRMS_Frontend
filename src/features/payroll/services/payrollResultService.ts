import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
  StatutoryReportCode,
  StatutoryReportRow,
  TaxCalculationDetailRecord,
  TdsReportRow,
} from "@/features/payroll/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET";
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const payrollResultService = {
  async getPayrollResults(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
    strDepartment?: string;
    strLocation?: string;
    strPayrollMonth?: string;
    blnGeneratedPayslipsOnly?: boolean;
  }): Promise<PayrollResultListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    if (objFilters?.strDepartment?.trim()) {
      objParams.set("strDepartment", objFilters.strDepartment.trim());
    }
    if (objFilters?.strLocation?.trim()) {
      objParams.set("strLocation", objFilters.strLocation.trim());
    }
    if (objFilters?.strPayrollMonth?.trim()) {
      objParams.set("strPayrollMonth", objFilters.strPayrollMonth.trim());
    }
    if (objFilters?.blnGeneratedPayslipsOnly) {
      objParams.set("blnGeneratedPayslipsOnly", "true");
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<PayrollResultListRecord[]>({
      strPath: `/payroll/results${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_LIST",
    });
    return objResult.Data;
  },

  async getPayrollResultById(
    intResultID: number
  ): Promise<PayrollResultDetailRecord> {
    const objResult = await requestApi<PayrollResultDetailRecord>({
      strPath: `/payroll/results/${intResultID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_VIEW",
    });
    return objResult.Data;
  },

  async getStatutoryReportRows(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
    strDepartment?: string;
    strLocation?: string;
    strPayrollMonth?: string;
    strStatutoryCode?: StatutoryReportCode;
  }): Promise<StatutoryReportRow[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    if (objFilters?.strDepartment?.trim()) {
      objParams.set("strDepartment", objFilters.strDepartment.trim());
    }
    if (objFilters?.strLocation?.trim()) {
      objParams.set("strLocation", objFilters.strLocation.trim());
    }
    if (objFilters?.strPayrollMonth?.trim()) {
      objParams.set("strPayrollMonth", objFilters.strPayrollMonth.trim());
    }
    if (objFilters?.strStatutoryCode && objFilters.strStatutoryCode !== "ALL") {
      objParams.set("strStatutoryCode", objFilters.strStatutoryCode);
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<StatutoryReportRow[]>({
      strPath: `/payroll/results/statutory-report${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_LIST",
    });
    return objResult.Data;
  },

  async getTdsReportRows(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
    strDepartment?: string;
    strLocation?: string;
    strPayrollMonth?: string;
  }): Promise<TdsReportRow[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    if (objFilters?.strDepartment?.trim()) {
      objParams.set("strDepartment", objFilters.strDepartment.trim());
    }
    if (objFilters?.strLocation?.trim()) {
      objParams.set("strLocation", objFilters.strLocation.trim());
    }
    if (objFilters?.strPayrollMonth?.trim()) {
      objParams.set("strPayrollMonth", objFilters.strPayrollMonth.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<TdsReportRow[]>({
      strPath: `/payroll/results/tds-report${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_LIST",
    });
    return objResult.Data;
  },

  async getTaxCalculationDetails(
    intResultID: number
  ): Promise<TaxCalculationDetailRecord> {
    const objResult = await requestApi<TaxCalculationDetailRecord>({
      strPath: `/payroll/results/${intResultID}/tax-information`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_VIEW",
    });
    return objResult.Data;
  },
};
