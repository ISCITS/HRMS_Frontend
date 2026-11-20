import type { Form12Totals } from "@/features/reports/services/form12ReportService";

export const lstLeaveKeys = ["EL", "CL", "SL", "RH", "CPL"] as const;

// Day-code colours for the on-screen grid. Print output is monochrome, so colour only ever
// repeats what the code already says.
const dicCodeColours: Record<string, { strBackground: string; strColor: string }> = {
  A: { strBackground: "#fee2e2", strColor: "#b91c1c" },
  H: { strBackground: "#fef3c7", strColor: "#92400e" },
  WO: { strBackground: "#e5e7eb", strColor: "#4b5563" },
  NH: { strBackground: "#dbeafe", strColor: "#1d4ed8" },
  HD: { strBackground: "#dbeafe", strColor: "#1d4ed8" },
  OD: { strBackground: "#dcfce7", strColor: "#166534" },
};

export function getDayCodeStyle(strCode: string): { strBackground: string; strColor: string } | null {
  if (dicCodeColours[strCode]) {
    return dicCodeColours[strCode];
  }
  return (lstLeaveKeys as readonly string[]).includes(strCode) ? { strBackground: "#ede9fe", strColor: "#5b21b6" } : null;
}

// 24 -> "24", 20.5 -> "20.5"; blank for missing, optionally blank for a real zero.
export function fmtDays(decValue: number | null | undefined, blnBlankZero = false): string {
  if (decValue === null || decValue === undefined || Number.isNaN(decValue)) {
    return "";
  }
  if (blnBlankZero && decValue === 0) {
    return "";
  }
  return Number.isInteger(decValue) ? String(decValue) : String(Number(decValue.toFixed(2)));
}

export function getLeaveTotal(dicTotals: Form12Totals, strKey: (typeof lstLeaveKeys)[number]): number {
  return dicTotals[`dec${strKey}` as keyof Form12Totals];
}

// 1 -> "1st", 12 -> "12th", 22 -> "22nd" (day headings of the printed register).
export function ordinal(intDay: number): string {
  if (intDay % 100 >= 10 && intDay % 100 <= 20) {
    return `${intDay}th`;
  }
  const strSuffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[intDay % 10] ?? "th";
  return `${intDay}${strSuffix}`;
}

// How many summary columns each printed column number covers (P..ACTUAL P share one number, EL+CL and SL+RH share one).
const lstSummaryNumberSpans = [5, 1, 1, 1, 1, 2, 2, 1, 1];

// Column-number row under the headings: S.No blank, Emp Code..Department 1-5, Shift 7, days 8.., then the summary numbers.
export function buildNumberRow(intDays: number): { lstFixed: string[]; lstDays: string[]; lstSummary: Array<{ strText: string; intSpan: number }>; lstTail: string[] } {
  const intNext = 8 + intDays;
  return {
    lstFixed: ["", "1", "2", "3", "4", "5", "7"],
    lstDays: Array.from({ length: intDays }, (_, intIndex) => String(8 + intIndex)),
    lstSummary: lstSummaryNumberSpans.map((intSpan, intIndex) => ({ strText: String(intNext + intIndex), intSpan })),
    lstTail: [String(intNext + 9), String(intNext + 10), String(intNext + 11)],
  };
}

export function isSundayIndex(intYear: number, intMonth: number, intDayIndex: number): boolean {
  return new Date(intYear, intMonth - 1, intDayIndex + 1).getDay() === 0;
}
