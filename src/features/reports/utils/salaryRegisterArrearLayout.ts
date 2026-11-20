import type { SalaryRegisterRow } from "@/features/reports/services/salaryRegisterReportService";

/**
 * Column layout + gross figures for the Salary Register "Show arrear columns separately" toggle.
 *
 * ON  - arrear columns are shown on their own, AFTER the gross they belong to:
 *       [regular earnings] Gross Earning [arrear earnings] [regular deductions] Gross Deduction [arrear deductions] Net
 *       Gross Earning / Gross Deduction cover the regular (current-month) components only.
 * OFF - arrear columns are hidden and their amounts are added into Gross Earning / Gross Deduction.
 *
 * Net Earning is the actual pay in both modes (backend value, already includes arrears).
 */
export type SalaryRegisterArrearLayout = {
  blnShowArrearColumns: boolean;
  lstPaymentColumns: string[];
  lstArrearPaymentColumns: string[];
  lstRecoveryColumns: string[];
  lstArrearRecoveryColumns: string[];
  fnGrossEarning: (dicRow: SalaryRegisterRow) => number;
  fnGrossDeduction: (dicRow: SalaryRegisterRow) => number;
};

function sumColumns(dicAmounts: Record<string, number>, lstColumns: string[]) {
  return lstColumns.reduce((decTotal, strColumn) => decTotal + Number(dicAmounts[strColumn] || 0), 0);
}

function round2(decValue: number) {
  return Math.round(decValue * 100) / 100;
}

export function buildSalaryRegisterArrearLayout(
  lstAllPaymentColumns: string[],
  lstAllRecoveryColumns: string[],
  lstArrearColumns: string[],
  blnShowArrearColumns: boolean,
): SalaryRegisterArrearLayout {
  const setArrear = new Set(lstArrearColumns);
  const lstRegularPayments = lstAllPaymentColumns.filter((strColumn) => !setArrear.has(strColumn));
  const lstArrearPayments = lstAllPaymentColumns.filter((strColumn) => setArrear.has(strColumn));
  const lstRegularRecoveries = lstAllRecoveryColumns.filter((strColumn) => !setArrear.has(strColumn));
  const lstArrearRecoveries = lstAllRecoveryColumns.filter((strColumn) => setArrear.has(strColumn));

  return {
    blnShowArrearColumns,
    lstPaymentColumns: lstRegularPayments,
    lstArrearPaymentColumns: blnShowArrearColumns ? lstArrearPayments : [],
    lstRecoveryColumns: lstRegularRecoveries,
    lstArrearRecoveryColumns: blnShowArrearColumns ? lstArrearRecoveries : [],
    // Backend gross already includes arrears: OFF uses it as-is, ON takes the arrears out.
    fnGrossEarning: (dicRow) => (blnShowArrearColumns
      ? round2(Number(dicRow.decGrossEarning || 0) - sumColumns(dicRow.dicPayments, lstArrearPayments))
      : Number(dicRow.decGrossEarning || 0)),
    fnGrossDeduction: (dicRow) => (blnShowArrearColumns
      ? round2(Number(dicRow.decGrossDeduction || 0) - sumColumns(dicRow.dicRecoveries, lstArrearRecoveries))
      : Number(dicRow.decGrossDeduction || 0)),
  };
}
