import { payrollResultService } from "@/features/payroll/services/payrollResultService";
import type { PayrollResultDetailRecord, PayrollResultLineRecord, PayrollResultListRecord, StatutoryReportCode, StatutoryReportRow } from "@/features/payroll/types";

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

function normalizeStatutoryCode(dicLine: PayrollResultLineRecord): Exclude<StatutoryReportCode, "ALL"> | null {
  const strLookup = `${dicLine.strComponentCode} ${dicLine.strComponentName} ${dicLine.strLineType} ${dicLine.strSourceType ?? ""}`.toUpperCase();
  if (strLookup.includes("PROFESSIONAL") || /\bPT\b/.test(strLookup)) {
    return "PT";
  }
  if (strLookup.includes("LABOUR") || strLookup.includes("LABOR") || /\bLWF\b/.test(strLookup)) {
    return "LWF";
  }
  if (strLookup.includes("ESI") || strLookup.includes("ESIC")) {
    return "ESI";
  }
  if (strLookup.includes("PF") || strLookup.includes("EPF") || strLookup.includes("PROVIDENT")) {
    return "PF";
  }
  return null;
}

function isStatutoryLine(dicLine: PayrollResultLineRecord) {
  const strSourceType = (dicLine.strSourceType ?? "").toLowerCase();
  return strSourceType.includes("statutory") || normalizeStatutoryCode(dicLine) !== null;
}

function resolveBasisAmount(dicResult: PayrollResultDetailRecord, strCode: StatutoryReportCode, decAmount: number) {
  if (strCode === "PF" || strCode === "ESI") {
    return dicResult.decComplianceWageBaseAmount || dicResult.decActualWagesAmount || dicResult.decRemunerationAmount || decAmount;
  }
  return decAmount;
}

function mapStatutoryLines(dicResult: PayrollResultDetailRecord): StatutoryReportRow[] {
  if (dicResult.lstStatutoryResults?.length) {
    return dicResult.lstStatutoryResults.map((dicRow) => ({
      intID: dicRow.intID,
      intPayrollRunID: dicRow.intPayrollRunID,
      intEmployeePayrollResultID: dicRow.intEmployeePayrollResultID,
      intEmployeeID: dicRow.intEmployeeID,
      strRunCode: dicResult.strRunCode,
      strRunName: dicResult.strRunName,
      dtPayrollMonth: dicResult.dtPayrollMonth,
      strEmployeeCode: dicResult.strEmployeeCode,
      strEmployeeName: dicResult.strEmployeeName,
      strDepartmentName: dicResult.strDepartmentName,
      strLocationName: dicResult.strLocationName,
      strStatus: dicResult.strStatus,
      strStatutoryCode: dicRow.strStatutoryCode,
      strStatutoryName: dicRow.strStatutoryName || dicRow.strStatutoryCode,
      decBasisAmount: Number(dicRow.decBasisAmount || 0),
      decEmployeeRatePercent: dicRow.decEmployeeRatePercent,
      decEmployerRatePercent: dicRow.decEmployerRatePercent,
      decEmployeeAmount: Number(dicRow.decEmployeeAmount || 0),
      decEmployerAmount: Number(dicRow.decEmployerAmount || 0),
      decTotalAmount: Number(dicRow.decTotalAmount || 0),
      decCeilingAmount: dicRow.decCeilingAmount,
      strCalculationMode: dicRow.strCalculationMode,
      intRuleID: dicRow.intRuleID,
      strRemarks: dicRow.strRemarks,
    }));
  }

  return (dicResult.lstLines ?? [])
    .filter(isStatutoryLine)
    .map((dicLine) => {
      const strCode = normalizeStatutoryCode(dicLine) ?? "PF";
      const decEmployeeAmount = Number(dicLine.decAmount || 0);
      return {
        intID: dicLine.intID,
        intPayrollRunID: dicResult.intPayrollRunID,
        intEmployeePayrollResultID: dicResult.intID,
        intEmployeeID: dicResult.intEmployeeID,
        strRunCode: dicResult.strRunCode,
        strRunName: dicResult.strRunName,
        dtPayrollMonth: dicResult.dtPayrollMonth,
        strEmployeeCode: dicResult.strEmployeeCode,
        strEmployeeName: dicResult.strEmployeeName,
        strDepartmentName: dicResult.strDepartmentName,
        strLocationName: dicResult.strLocationName,
        strStatus: dicResult.strStatus,
        strStatutoryCode: strCode,
        strStatutoryName: dicLine.strComponentName || dicLine.strComponentCode || strCode,
        decBasisAmount: resolveBasisAmount(dicResult, strCode, decEmployeeAmount),
        decEmployeeRatePercent: null,
        decEmployerRatePercent: null,
        decEmployeeAmount,
        decEmployerAmount: 0,
        decTotalAmount: decEmployeeAmount,
        decCeilingAmount: null,
        strCalculationMode: dicLine.strSourceType ?? dicLine.strLineType ?? null,
        intRuleID: null,
        strRemarks: dicLine.strRemarks,
      };
    });
}

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
    const lstResults = await payrollResultService.getPayrollResults(objFilters);
    const lstDetailResults = await Promise.allSettled(
      lstResults.map((dicRow) => payrollResultService.getPayrollResultById(dicRow.intID))
    );
    const lstDetails = lstDetailResults
      .filter((objResult): objResult is PromiseFulfilledResult<PayrollResultDetailRecord> => objResult.status === "fulfilled")
      .map((objResult) => objResult.value);
    const lstRows = lstDetails.flatMap(mapStatutoryLines);
    if (!objFilters?.strStatutoryCode || objFilters.strStatutoryCode === "ALL") {
      return lstRows;
    }
    return lstRows.filter((dicRow) => dicRow.strStatutoryCode.toUpperCase() === objFilters.strStatutoryCode);
  },
};
