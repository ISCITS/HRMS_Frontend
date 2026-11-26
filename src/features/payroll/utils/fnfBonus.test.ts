import { describe, expect, it } from "vitest";
import type { FNFSettlementLineRecord } from "@/features/payroll/types";
import {
  findFNFBonusLine,
  findFNFBonusOverrideLine,
  formatFNFBonusMonth,
  isFNFBonusEditable,
  readFNFBonusDetail,
  validateFNFBonusOverride,
} from "@/features/payroll/utils/fnfBonus";

function line(dicValues: Partial<FNFSettlementLineRecord>): FNFSettlementLineRecord {
  return { intID: 1, strLineType: "EARNING", strLineCode: "BASIC", strLineName: "Basic", decAmount: 0, blnIsSystemCalculated: true, ...dicValues } as FNFSettlementLineRecord;
}

describe("fnfBonus", () => {
  it("reads the bonus working from the snapshot", () => {
    expect(readFNFBonusDetail(null)).toBeNull();
    expect(readFNFBonusDetail({})).toBeNull();
    expect(readFNFBonusDetail({ bonus_detail: [] })).toBeNull();
    expect(readFNFBonusDetail({ bonus_detail: { eligible: true, amount: 15956 } })?.amount).toBe(15956);
  });

  it("finds the override before the calculated bonus line", () => {
    const objCalculated = line({ intID: 2, strLineCode: "BONUS_FNF", decAmount: 15956 });
    const objOverride = line({ intID: 3, strLineCode: "bonus_fnf", decAmount: 20000, blnIsSystemCalculated: false });
    expect(findFNFBonusOverrideLine([objCalculated])).toBeNull();
    expect(findFNFBonusLine([objCalculated])?.decAmount).toBe(15956);
    expect(findFNFBonusOverrideLine([objCalculated, objOverride])?.intID).toBe(3);
    expect(findFNFBonusLine([objCalculated, objOverride])?.decAmount).toBe(20000);
    expect(findFNFBonusLine([line({})])).toBeNull();
  });

  it("validates the override amount and reason", () => {
    expect(validateFNFBonusOverride("", "x")).toMatch(/amount/);
    expect(validateFNFBonusOverride("-5", "x")).toMatch(/amount/);
    expect(validateFNFBonusOverride("12.345", "x")).toMatch(/amount/);
    expect(validateFNFBonusOverride("12.5", "  ")).toMatch(/reason/);
    expect(validateFNFBonusOverride("0", "No bonus for this exit")).toBe("");
    expect(validateFNFBonusOverride(" 20000.50 ", "Client approved")).toBe("");
  });

  it("knows which statuses can change the bonus and formats months", () => {
    expect(isFNFBonusEditable("Calculated")).toBe(true);
    expect(isFNFBonusEditable("approved")).toBe(false);
    expect(formatFNFBonusMonth("2026-06-01")).toBe("Jun 2026");
    expect(formatFNFBonusMonth("bad")).toBe("bad");
  });
});
