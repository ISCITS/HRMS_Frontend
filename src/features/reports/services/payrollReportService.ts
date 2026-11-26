import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type { PayrollResultListRecord, StatutoryReportCode, StatutoryReportRow, TdsReportRow, VariablePayRegisterRow } from "@/features/payroll/types";

export type PayrollReportFilters = {
  strSearchEmployee?: string;
  strSearchRun?: string;
  strStatus?: string;
  strDepartment?: string;
  strLocation?: string;
  strAllocationEntity?: string;
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
    // The calculation snapshot/trace (~7 KB per row) is never shown on the register.
    return payrollResultService.getPayrollResults({ ...objFilters, blnExcludeCalculationDetails: true });
  },

  async getBankFileRows(
    objFilters?: PayrollReportFilters,
  ): Promise<PayrollResultListRecord[]> {
    const objApiFilters = objFilters?.strStatus === "Approved"
      ? { ...objFilters, strStatus: "All" }
      : objFilters;
    const lstRows = await payrollResultService.getPayrollResults({ ...objApiFilters, blnExcludeCalculationDetails: true });
    return lstRows.filter((dicRow) => setBankFileEligibleStatuses.has(dicRow.strStatus));
  },

  async getStatutoryReportRows(
    objFilters?: StatutoryReportFilters,
  ): Promise<StatutoryReportRow[]> {
    return payrollResultService.getStatutoryReportRows(objFilters);
  },

  async getTdsReportRows(
    objFilters?: PayrollReportFilters,
  ): Promise<TdsReportRow[]> {
    return payrollResultService.getTdsReportRows(objFilters);
  },

  async getVariablePayRegisterRows(
    objFilters?: PayrollReportFilters & { strVariablePayType?: string },
  ): Promise<VariablePayRegisterRow[]> {
    return payrollResultService.getVariablePayRegisterRows(objFilters);
  },
};
