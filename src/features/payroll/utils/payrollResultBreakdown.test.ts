import { describe, expect, it } from "vitest";
import type { PayrollResultLineRecord } from "@/features/payroll/types";
import { buildPayrollResultBreakdown, sumPayrollAmounts } from "./payrollResultBreakdown";

function line(code: string, amount: number, overrides: Partial<PayrollResultLineRecord> = {}): PayrollResultLineRecord {
  return { intID: 1, intSalaryComponentID: 1, strComponentCode: code, strComponentName: code,
    strComponentCategory: "deduction", strLineType: "deduction", decAmount: amount,
    strRemarks: null, ...overrides };
}

describe("payroll result breakdown", () => {
  it("separates employee contributions, tax and other deductions, and employer amounts", () => {
    const result = buildPayrollResultBreakdown([
      line("EMPLOYEE_PF", 1800), line("Employee ESIC", 150), line("LWF", 10),
      line("TDS", 2500, { blnIsTaxLine: true }), line("PT", 200), line("LOAN", 500),
      line("EMPLOYER_PF", 1800, { blnIsEmployerContribution: true }),
      line("BASIC", 30000, { strLineType: "earning", strComponentCategory: "earning" }),
    ]);
    expect(result.employeeContributions.map(row => row.strComponentCode)).toEqual(["EMPLOYEE_PF", "Employee ESIC", "LWF"]);
    expect(sumPayrollAmounts(result.employeeContributions)).toBe(1960);
    expect(result.deductions.map(row => row.strComponentCode)).toEqual(["TDS", "PT", "LOAN"]);
    expect(sumPayrollAmounts(result.deductions)).toBe(3200);
    expect(sumPayrollAmounts(result.employerContributions)).toBe(1800);
    expect(result.earnings.map(row => row.strComponentCode)).toEqual(["BASIC"]);
    expect(sumPayrollAmounts(result.earnings)).toBe(30000);
  });

  it("keeps legacy category labels and custom contribution components", () => {
    const result = buildPayrollResultBreakdown([
      line("CUSTOM_FUND", 123, { strComponentCategory: "Employee Contribution" }),
      line("CUSTOM_ER", 456, { strLineType: "Employer-Contribution" }),
      line("CUSTOM_TAX", 789, { strComponentCategory: "Tax" }),
    ]);
    expect(sumPayrollAmounts(result.employeeContributions)).toBe(123);
    expect(sumPayrollAmounts(result.employerContributions)).toBe(456);
    expect(sumPayrollAmounts(result.deductions)).toBe(789);
  });

  it("excludes provision and information amounts even with contribution flags", () => {
    const result = buildPayrollResultBreakdown([
      line("INCENTIVE", 1000, { strComponentCategory: "CTC Provision", blnIsEmployerContribution: true }),
      line("GRATUITY", 500, { strLineType: "ctc-provision" }),
      line("INFO", 300, { strLineType: "information" }),
      line("PF", 0),
    ]);
    expect(result).toEqual({ earnings: [], deductions: [], employeeContributions: [], employerContributions: [] });
  });

  it("preserves refunds and sorts components without mutating payroll lines", () => {
    const lines = [line("TDS", -100, { intDisplayOrder: 10 }), line("PT", 200, { intDisplayOrder: 5 })];
    const result = buildPayrollResultBreakdown(lines);
    expect(result.deductions.map(row => row.strComponentCode)).toEqual(["PT", "TDS"]);
    expect(sumPayrollAmounts(result.deductions)).toBe(100);
    expect(lines[0].strComponentCode).toBe("TDS");
  });
});
