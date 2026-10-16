import type { MonthlyTaxTransaction } from "@/features/payroll/services/employeeMonthlyTaxService";

// Consolidate the monthly display without changing the underlying ledger entries.
export function buildMonthlyTaxDisplayRows(lstTransactions: MonthlyTaxTransaction[]): MonthlyTaxTransaction[] {
  const dicGroups = new Map<string, { objRow: MonthlyTaxTransaction; setReferences: Set<string> }>();

  for (const objTxn of lstTransactions) {
    // Reversed postings are superseded by a later payroll reprocess and never count towards totals,
    // so they are left out of the display entirely (they remain in the ledger for audit).
    if (objTxn.blnIsReversed) continue;
    // Payroll postings of the same kind are merged; imported/manual entries stay one row each so
    // e.g. REGULAR_PAYROLL_HISTORY and INCENTIVE_HISTORY rows of the same month remain visible.
    const strKey = objTxn.blnIsSystemGenerated
      ? JSON.stringify([objTxn.strSourceType, objTxn.blnIsSystemGenerated, objTxn.blnIsPreviousEmployer])
      : `entry:${objTxn.intID}`;
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
    const strReference = objTxn.strSourceReferenceNo || objTxn.strExternalReference;
    if (strReference) objGroup.setReferences.add(strReference);
  }

  return Array.from(dicGroups.values(), ({ objRow, setReferences }) => ({
    ...objRow,
    strSourceReferenceNo: Array.from(setReferences).join(", ") || null,
  }));
}
