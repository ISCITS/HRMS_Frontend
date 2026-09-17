import type { MonthlyTaxTransaction } from "@/features/payroll/services/employeeMonthlyTaxService";

// Consolidate the monthly display without changing the underlying ledger entries.
export function buildMonthlyTaxDisplayRows(lstTransactions: MonthlyTaxTransaction[]): MonthlyTaxTransaction[] {
  const dicGroups = new Map<string, { objRow: MonthlyTaxTransaction; setReferences: Set<string> }>();

  for (const objTxn of lstTransactions) {
    // Reversals remain individual audit entries and never contribute to active totals.
    const strKey = objTxn.blnIsReversed
      ? `reversed:${objTxn.intID}`
      : JSON.stringify([objTxn.strSourceType, objTxn.blnIsSystemGenerated, objTxn.blnIsPreviousEmployer]);
    let objGroup = dicGroups.get(strKey);
    if (!objGroup) {
      objGroup = {
        objRow: { ...objTxn, decGrossIncomeAmount: 0, decTaxableIncomeAmount: 0, decTdsAmount: 0 },
        setReferences: new Set<string>(),
      };
      dicGroups.set(strKey, objGroup);
    }
    for (const strField of ["decGrossIncomeAmount", "decTaxableIncomeAmount", "decTdsAmount"] as const) {
      // Decimal API values can arrive as strings; sum in paise to avoid float artifacts.
      objGroup.objRow[strField] = (
        Math.round(objGroup.objRow[strField] * 100) + Math.round(Number(objTxn[strField]) * 100)
      ) / 100;
    }
    if (objTxn.strSourceReferenceNo) objGroup.setReferences.add(objTxn.strSourceReferenceNo);
  }

  return Array.from(dicGroups.values(), ({ objRow, setReferences }) => ({
    ...objRow,
    strSourceReferenceNo: Array.from(setReferences).join(", ") || null,
  }));
}
