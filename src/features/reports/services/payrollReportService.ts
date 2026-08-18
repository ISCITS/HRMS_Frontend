import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type { PayrollResultListRecord, StatutoryReportCode, StatutoryReportRow } from "@/features/payroll/types";

export type PayrollReportFilters = {
  strSearchEmployee?: string;
  strSearchRun?: string;
  strStatus?: string;
  strDepartment?: string;
  strLocation?: string;
  strPayrollMonth?: string;
};

export type StatutoryReportFilters = PayrollReportFilters & {
  strStatutoryCode?: StatutoryReportCode;
};

const setBankFileEligibleStatuses = new Set(["Approved", "Published", "Paid", "Generated", "Calculated"]);

export const payrollReportService = {
  async getPayrollRegisterRows(
    objFilters?: PayrollReportFilters,
  ): Promise<PayrollResultListRecord[]> {
    return payrollResultService.getPayrollResults(objFilters);
  },

  async getBankFileRows(
    objFilters?: PayrollReportFilters,
  ): Promise<PayrollResultListRecord[]> {
    const objApiFilters = objFilters?.strStatus === "Approved"
      ? { ...objFilters, strStatus: "All" }
      : objFilters;
    const lstRows = await payrollResultService.getPayrollResults(objApiFilters);
    return lstRows.filter((dicRow) => setBankFileEligibleStatuses.has(dicRow.strStatus));
  },

  async getStatutoryReportRows(
    objFilters?: StatutoryReportFilters,
  ): Promise<StatutoryReportRow[]> {
    return payrollResultService.getStatutoryReportRows(objFilters);
  },
};
