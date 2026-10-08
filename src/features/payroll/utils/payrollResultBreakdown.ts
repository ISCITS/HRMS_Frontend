import type { PayrollResultLineRecord } from "@/features/payroll/types";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

export function buildPayrollResultBreakdown(lines: PayrollResultLineRecord[]) {
  const deductions: PayrollResultLineRecord[] = [];
  const employeeContributions: PayrollResultLineRecord[] = [];
  const employerContributions: PayrollResultLineRecord[] = [];

  for (const line of [...lines].sort((a, b) => (a.intDisplayOrder ?? 0) - (b.intDisplayOrder ?? 0))) {
    if (!Number.isFinite(line.decAmount) || line.decAmount === 0) continue;
    const types = [line.strLineType, line.strComponentCategory].map(normalize);
    if (types.some(type => ["ctc_provision", "provision", "information"].includes(type))) continue;
    if (line.blnIsEmployerContribution || types.includes("employer_contribution")) {
      employerContributions.push(line);
      continue;
    }
    const tokens = [line.strComponentCode, line.strComponentName].map(normalize).join("_");
    if (line.blnIsTaxLine || types.includes("tax") || /(^|_)(tds|income_tax)($|_)/.test(tokens)) {
      deductions.push(line);
      continue;
    }
    if (line.blnIsEmployeeDeduction || types.includes("deduction") || types.includes("employee_contribution")) {
      // PF, ESI and other employee fund contributions are a separate part of
      // deductions. Professional tax and TDS remain in the deductions section.
      const isContribution = types.includes("employee_contribution") ||
        /(^|_)(pf|epf|esi|esic|eesi|lwf|nps|pension|superannuation|provident_fund|labour_welfare_fund|labor_welfare_fund)($|_)/.test(tokens);
      (isContribution ? employeeContributions : deductions).push(line);
    }
  }
  return { deductions, employeeContributions, employerContributions };
}

export const sumPayrollAmounts = (lines: PayrollResultLineRecord[]) =>
  Math.round(lines.reduce((total, line) => total + line.decAmount, 0) * 100) / 100;
