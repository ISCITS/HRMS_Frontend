import type { FNFBonusDetail, FNFSettlementLineRecord } from "@/features/payroll/types";

/** Line code shared by the calculated Bonus FNF and HR's override of it. */
export const FNF_BONUS_LINE_CODE = "BONUS_FNF";
const LST_EDITABLE_STATUSES = ["draft", "calculated", "released"];

/** Bonus working from the settlement's calculation snapshot, or null before the first Calculate. */
export function readFNFBonusDetail(objSnapshot: Record<string, unknown> | null | undefined): FNFBonusDetail | null {
  const objDetail = objSnapshot?.bonus_detail;
  return objDetail && typeof objDetail === "object" && !Array.isArray(objDetail) ? (objDetail as FNFBonusDetail) : null;
}

/** HR's bonus override: the manual (not system-calculated) line with the bonus code. */
export function findFNFBonusOverrideLine(lstLines: FNFSettlementLineRecord[] | null | undefined): FNFSettlementLineRecord | null {
  return (lstLines || []).find((objLine) => (objLine.strLineCode || "").toUpperCase() === FNF_BONUS_LINE_CODE && !objLine.blnIsSystemCalculated) || null;
}

/** The bonus line the settlement pays now: the override when there is one, else the calculated line. */
export function findFNFBonusLine(lstLines: FNFSettlementLineRecord[] | null | undefined): FNFSettlementLineRecord | null {
  return findFNFBonusOverrideLine(lstLines) || (lstLines || []).find((objLine) => (objLine.strLineCode || "").toUpperCase() === FNF_BONUS_LINE_CODE) || null;
}

export function isFNFBonusEditable(strStatus: string | null | undefined): boolean {
  return LST_EDITABLE_STATUSES.includes(String(strStatus || "").toLowerCase());
}

/** Error message for the override form, or "" when it can be saved. */
export function validateFNFBonusOverride(strAmount: string, strReason: string): string {
  const strTrimmed = strAmount.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(strTrimmed)) return "Enter the bonus amount (0 or more, up to 2 decimals).";
  if (!strReason.trim()) return "Enter the reason for overriding the bonus.";
  return "";
}

/** "2026-06-01" -> "Jun 2026". */
export function formatFNFBonusMonth(strMonth: string): string {
  const [strYear, strMonthNumber] = strMonth.split("-");
  const lstNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const intMonth = Number(strMonthNumber);
  return intMonth >= 1 && intMonth <= 12 ? `${lstNames[intMonth - 1]} ${strYear}` : strMonth;
}
