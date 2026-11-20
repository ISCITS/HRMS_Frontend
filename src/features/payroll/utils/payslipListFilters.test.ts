import { describe, expect, it } from "vitest";

import {
  buildPayslipFilterOptions,
  filterPayslipRows,
  formatPayslipMonthOption,
  getPayslipMonthKeys,
  type PayslipFilterRow,
  type PayslipFilterValues,
} from "./payslipListFilters";

function row(strEmployeeCode: string, strRunCode: string, strRunName: string, dtPayrollMonth: string): PayslipFilterRow {
  return { strEmployeeCode, strEmployeeName: `Employee ${strEmployeeCode}`, strRunCode, strRunName, dtPayrollMonth, strPayslipStatus: "Processed" };
}

// The same run name is used in different months.
const lstRows = [
  row("E1", "PR-202609-003", "Sept 2026 Payroll", "2026-09-11"),
  row("E1", "PR-202604-003", "Sept 2026 Payroll", "2026-04-01"),
  row("E2", "PR-202608-001", "Aug 2026 Payroll", "2026-08-01"),
  row("E2", "PR-202609-001", "Sept 2026 Payroll for loan recovery", "2026-09-01"),
];

const dicNoFilters: PayslipFilterValues = {
  strSearchEmployee: "", strSearchRun: "", strPayrollMonth: "", strStatus: "All", strDepartment: "", strLocation: "",
};

describe("payslip list filters", () => {
  it("offers one option per run (name and code) and every month, newest first", () => {
    const dicOptions = buildPayslipFilterOptions(lstRows, dicNoFilters);
    expect(dicOptions.lstRuns).toEqual([
      "Sept 2026 Payroll (PR-202609-003)",
      "Sept 2026 Payroll for loan recovery (PR-202609-001)",
      "Aug 2026 Payroll (PR-202608-001)",
      "Sept 2026 Payroll (PR-202604-003)",
    ]);
    expect(dicOptions.lstMonths).toEqual(["Sep 2026", "Aug 2026", "Apr 2026"]);
  });

  it("lists only the chosen month's runs and the chosen run's months", () => {
    const dicOptions = buildPayslipFilterOptions(lstRows, { strSearchRun: "Sept 2026 Payroll (PR-202604-003)", strPayrollMonth: "Sep 2026" });
    expect(dicOptions.lstRuns).toEqual(["Sept 2026 Payroll (PR-202609-003)", "Sept 2026 Payroll for loan recovery (PR-202609-001)"]);
    expect(dicOptions.lstMonths).toEqual(["Apr 2026"]);
  });

  it("matches a chosen run exactly, not every run with the same name", () => {
    const lstFound = filterPayslipRows(lstRows, { ...dicNoFilters, strSearchRun: "Sept 2026 Payroll (PR-202609-003)" });
    expect(lstFound.map((dicRow) => dicRow.strRunCode)).toEqual(["PR-202609-003"]);
  });

  it("still finds runs by typed text or code", () => {
    expect(filterPayslipRows(lstRows, { ...dicNoFilters, strSearchRun: "loan" }).map((dicRow) => dicRow.strRunCode)).toEqual(["PR-202609-001"]);
    expect(filterPayslipRows(lstRows, { ...dicNoFilters, strSearchRun: "pr-202608-001" })).toHaveLength(1);
  });

  it("filters by chosen or typed month, and by month and employee together", () => {
    expect(filterPayslipRows(lstRows, { ...dicNoFilters, strPayrollMonth: "Sep 2026" })).toHaveLength(2);
    expect(filterPayslipRows(lstRows, { ...dicNoFilters, strPayrollMonth: "2026-04" })).toHaveLength(1);
    expect(filterPayslipRows(lstRows, { ...dicNoFilters, strPayrollMonth: "Sep 2026, Aug 2026", strSearchEmployee: "E2" })).toHaveLength(2);
  });

  it("reads month options back as month keys", () => {
    expect(getPayslipMonthKeys("Sep 2026, 2026-04, September 2025")).toEqual(["2026-09", "2026-04", "2025-09"]);
    expect(formatPayslipMonthOption("2026-12")).toBe("Dec 2026");
  });
});
