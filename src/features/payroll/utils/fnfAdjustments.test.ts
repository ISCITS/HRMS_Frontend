import { describe, expect, it } from "vitest";

import type { FNFAdjustmentComponentOption, FNFAdjustmentFormRow, FNFAdjustmentRecord } from "@/features/payroll/types";

import {
  applyFNFAdjustmentComponent,
  buildFNFAdjustmentPayload,
  createEmptyFNFAdjustmentRow,
  hasFNFAdjustmentChanges,
  isFNFAdjustmentLine,
  summarizeFNFAdjustments,
  toFNFAdjustmentRows,
  validateFNFAdjustmentRows,
} from "./fnfAdjustments";

const lstComponents: FNFAdjustmentComponentOption[] = [
  { intID: 21, strCode: "REWARD", strLabel: "Reward", blnTaxable: true },
  { intID: 22, strCode: "EXGRATIA", strLabel: "Ex-gratia", blnTaxable: false },
  { intID: 23, strCode: "CANTEEN", strLabel: "Canteen", blnTaxable: false },
];

function row(dicValues: Partial<FNFAdjustmentFormRow>): FNFAdjustmentFormRow {
  return { ...createEmptyFNFAdjustmentRow(), ...dicValues };
}

describe("F&F adjustments", () => {
  it("recognises adjustment lines by source type", () => {
    expect(isFNFAdjustmentLine({ strSourceType: "fnf_adjustment" })).toBe(true);
    expect(isFNFAdjustmentLine({ strSourceType: " FNF_ADJUSTMENT " })).toBe(true);
    expect(isFNFAdjustmentLine({ strSourceType: "manual" })).toBe(false);
    expect(isFNFAdjustmentLine({ strSourceType: null })).toBe(false);
  });

  it("takes the component's taxable setting when a component is picked", () => {
    expect(applyFNFAdjustmentComponent(row({ blnTaxable: true }), 22, lstComponents).blnTaxable).toBe(false);
    expect(applyFNFAdjustmentComponent(row({ blnTaxable: false }), 21, lstComponents)).toMatchObject({ intSalaryComponentID: 21, blnTaxable: true });
    expect(applyFNFAdjustmentComponent(row({ blnTaxable: false }), "", lstComponents).blnTaxable).toBe(false);
  });

  it("validates component, amount and duplicates, ignoring blank rows", () => {
    expect(validateFNFAdjustmentRows([createEmptyFNFAdjustmentRow()], lstComponents)).toBe("");
    expect(validateFNFAdjustmentRows([row({ strAmount: "100" })], lstComponents)).toBe("Row 1: select a salary component.");
    expect(validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "" })], lstComponents)).toMatch(/Row 1: enter a valid amount/);
    expect(validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "-5" })], lstComponents)).toMatch(/valid amount/);
    expect(validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "10.555" })], lstComponents)).toMatch(/up to 2 decimals/);
    expect(validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "0" })], lstComponents)).toBe("Row 1: enter an amount greater than 0.");
    expect(
      validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "10" }), row({ intSalaryComponentID: 21, strAmount: "20" })], lstComponents)
    ).toBe("Reward is entered more than once as Addition. Enter one amount per component.");
    // The same component as an addition and as a recovery is allowed.
    expect(
      validateFNFAdjustmentRows([row({ intSalaryComponentID: 21, strAmount: "10" }), row({ intSalaryComponentID: 21, strCategory: "recovery", strAmount: "2.50" })], lstComponents)
    ).toBe("");
  });

  it("builds the save payload without blank rows and with taxability only on additions", () => {
    const objPayload = buildFNFAdjustmentPayload([
      row({ intSalaryComponentID: 21, strAmount: "5000", blnTaxable: true, strRemarks: "  Project reward " }),
      createEmptyFNFAdjustmentRow(),
      row({ intSalaryComponentID: 23, strCategory: "deduction", strAmount: "300", blnTaxable: true }),
    ]);
    expect(objPayload).toEqual({
      lstAdjustments: [
        { intSalaryComponentID: 21, strCategory: "addition", decAmount: 5000, blnTaxable: true, strRemarks: "Project reward" },
        { intSalaryComponentID: 23, strCategory: "deduction", decAmount: 300, blnTaxable: false, strRemarks: null },
      ],
    });
  });

  it("summarizes additions, deductions and net", () => {
    expect(
      summarizeFNFAdjustments([
        row({ intSalaryComponentID: 21, strAmount: "5000" }),
        row({ intSalaryComponentID: 22, strAmount: "2000.10" }),
        row({ intSalaryComponentID: 23, strCategory: "deduction", strAmount: "300" }),
        row({ intSalaryComponentID: 21, strCategory: "recovery", strAmount: "100.05" }),
        row({ intSalaryComponentID: 22, strAmount: "abc" }),
      ])
    ).toEqual({ decAdditions: 7000.1, decDeductions: 400.05, decNet: 6600.05 });
  });

  it("round-trips saved adjustments and detects unsaved changes", () => {
    const lstSaved: FNFAdjustmentRecord[] = [
      { intID: 1, intSalaryComponentID: 21, strComponentCode: "REWARD", strComponentName: "Reward", strCategory: "addition", strLineType: "EARNING", decAmount: 5000, blnTaxable: true, strRemarks: "Project reward" },
    ];
    const lstRows = toFNFAdjustmentRows(lstSaved);
    expect(lstRows[0]).toMatchObject({ intSalaryComponentID: 21, strCategory: "addition", strAmount: "5000", blnTaxable: true, strRemarks: "Project reward" });
    expect(hasFNFAdjustmentChanges(lstRows, lstSaved)).toBe(false);
    expect(hasFNFAdjustmentChanges([...lstRows, createEmptyFNFAdjustmentRow()], lstSaved)).toBe(false);
    expect(hasFNFAdjustmentChanges([{ ...lstRows[0], strAmount: "6000" }], lstSaved)).toBe(true);
    expect(hasFNFAdjustmentChanges([], lstSaved)).toBe(true);
  });
});
