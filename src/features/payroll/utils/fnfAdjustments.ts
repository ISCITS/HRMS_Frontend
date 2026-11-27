import type {
  FNFAdjustmentCategory,
  FNFAdjustmentComponentOption,
  FNFAdjustmentFormRow,
  FNFAdjustmentRecord,
  FNFSettlementLineRecord,
} from "@/features/payroll/types";

/** Source type of settlement lines entered in the F&F Adjustments section (backend FNF_ADJUSTMENT_SOURCE_TYPE). */
export const FNF_ADJUSTMENT_SOURCE_TYPE = "fnf_adjustment";

export const LST_FNF_ADJUSTMENT_CATEGORIES: { strCode: FNFAdjustmentCategory; strLabel: string }[] = [
  { strCode: "addition", strLabel: "Addition" },
  { strCode: "deduction", strLabel: "Deduction" },
  { strCode: "recovery", strLabel: "Recovery" },
];

let intRowSequence = 0;

function nextRowKey() {
  intRowSequence += 1;
  return `adj-${intRowSequence}`;
}

export function isFNFAdjustmentLine(objLine: Pick<FNFSettlementLineRecord, "strSourceType">): boolean {
  return (objLine.strSourceType || "").trim().toLowerCase() === FNF_ADJUSTMENT_SOURCE_TYPE;
}

export function createEmptyFNFAdjustmentRow(): FNFAdjustmentFormRow {
  return { strRowKey: nextRowKey(), intSalaryComponentID: "", strCategory: "addition", strAmount: "", blnTaxable: true, strRemarks: "" };
}

export function toFNFAdjustmentRows(lstAdjustments: FNFAdjustmentRecord[]): FNFAdjustmentFormRow[] {
  return lstAdjustments.map((objAdjustment) => ({
    strRowKey: nextRowKey(),
    intSalaryComponentID: objAdjustment.intSalaryComponentID,
    strCategory: objAdjustment.strCategory,
    strAmount: String(objAdjustment.decAmount ?? ""),
    blnTaxable: Boolean(objAdjustment.blnTaxable),
    strRemarks: objAdjustment.strRemarks || "",
  }));
}

/** A component was picked: an addition takes the component's taxable setting as its default. */
export function applyFNFAdjustmentComponent(objRow: FNFAdjustmentFormRow, intComponentID: number | "", lstComponents: FNFAdjustmentComponentOption[]): FNFAdjustmentFormRow {
  const objComponent = lstComponents.find((objOption) => objOption.intID === intComponentID);
  return { ...objRow, intSalaryComponentID: intComponentID, blnTaxable: objComponent ? objComponent.blnTaxable : objRow.blnTaxable };
}

function parseAmount(strAmount: string): number {
  const strTrimmed = strAmount.trim();
  return strTrimmed ? Number(strTrimmed) : Number.NaN;
}

/** First problem in the rows, or "" when they can be saved. Blank rows (nothing entered) are ignored. */
export function validateFNFAdjustmentRows(lstRows: FNFAdjustmentFormRow[], lstComponents: FNFAdjustmentComponentOption[]): string {
  const setSeen = new Set<string>();
  for (const [intIndex, objRow] of lstRows.entries()) {
    if (isBlankRow(objRow)) continue;
    const strRow = `Row ${intIndex + 1}`;
    if (!objRow.intSalaryComponentID) return `${strRow}: select a salary component.`;
    if (!/^\d+(\.\d{1,2})?$/.test(objRow.strAmount.trim())) return `${strRow}: enter a valid amount (up to 2 decimals).`;
    if (parseAmount(objRow.strAmount) <= 0) return `${strRow}: enter an amount greater than 0.`;
    const strKey = `${objRow.intSalaryComponentID}:${objRow.strCategory}`;
    if (setSeen.has(strKey)) {
      const strName = lstComponents.find((objOption) => objOption.intID === objRow.intSalaryComponentID)?.strLabel || "This component";
      return `${strName} is entered more than once as ${categoryLabel(objRow.strCategory)}. Enter one amount per component.`;
    }
    setSeen.add(strKey);
  }
  return "";
}

export function isBlankRow(objRow: FNFAdjustmentFormRow): boolean {
  return !objRow.intSalaryComponentID && !objRow.strAmount.trim() && !objRow.strRemarks.trim();
}

export function categoryLabel(strCategory: FNFAdjustmentCategory): string {
  return LST_FNF_ADJUSTMENT_CATEGORIES.find((objCategory) => objCategory.strCode === strCategory)?.strLabel || strCategory;
}

/** The request body of PUT /fnf-settlements/{id}/adjustments (blank rows left out). */
export function buildFNFAdjustmentPayload(lstRows: FNFAdjustmentFormRow[]) {
  return {
    lstAdjustments: lstRows
      .filter((objRow) => !isBlankRow(objRow))
      .map((objRow) => ({
        intSalaryComponentID: Number(objRow.intSalaryComponentID),
        strCategory: objRow.strCategory,
        decAmount: Number(objRow.strAmount),
        // Taxability matters only for additions; deductions/recoveries never change taxable income.
        blnTaxable: objRow.strCategory === "addition" ? objRow.blnTaxable : false,
        strRemarks: objRow.strRemarks.trim() || null,
      })),
  };
}

/** Additions, deductions (deduction + recovery) and the net effect on the settlement. */
export function summarizeFNFAdjustments(lstRows: FNFAdjustmentFormRow[]) {
  let decAdditions = 0;
  let decDeductions = 0;
  for (const objRow of lstRows) {
    const decAmount = parseAmount(objRow.strAmount);
    if (!Number.isFinite(decAmount) || decAmount <= 0) continue;
    if (objRow.strCategory === "addition") decAdditions += decAmount;
    else decDeductions += decAmount;
  }
  const fnRound = (decValue: number) => Math.round(decValue * 100) / 100;
  return { decAdditions: fnRound(decAdditions), decDeductions: fnRound(decDeductions), decNet: fnRound(decAdditions - decDeductions) };
}

/** True when the rows differ from what is saved (so the screen can warn before leaving / show Save). */
export function hasFNFAdjustmentChanges(lstRows: FNFAdjustmentFormRow[], lstSaved: FNFAdjustmentRecord[]): boolean {
  const fnKey = (objPayload: ReturnType<typeof buildFNFAdjustmentPayload>) => JSON.stringify(objPayload.lstAdjustments);
  return fnKey(buildFNFAdjustmentPayload(lstRows)) !== fnKey(buildFNFAdjustmentPayload(toFNFAdjustmentRows(lstSaved)));
}
