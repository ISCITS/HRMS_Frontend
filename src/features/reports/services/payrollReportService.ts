import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type { PayrollResultListRecord } from "@/features/payroll/types";

export type PayrollReportFilters = {
  strSearchEmployee?: string;
  strSearchRun?: string;
  strStatus?: string;
};

export const payrollReportService = {
  async getPayrollRegisterRows(
    objFilters?: PayrollReportFilters,
  ): Promise<PayrollResultListRecord[]> {
    return payrollResultService.getPayrollResults(objFilters);
  },

  async getBankFileRows(
    objFilters?: PayrollReportFilters,
  ): Promise<PayrollResultListRecord[]> {
    const lstRows = await payrollResultService.getPayrollResults(objFilters);
    return lstRows.filter((dicRow) =>
      ["Approved", "Published", "Paid", "Generated"].includes(dicRow.strStatus)
    );
  },
};
