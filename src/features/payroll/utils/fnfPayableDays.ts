import type { FNFPayableDaysResponse, FNFPayableDaysRow } from "@/features/payroll/types";

/** One editable month of the F&F Payable Days panel: blank days = use attendance. */
export type FNFPayableDaysFormRow = {
  /** First day of the month, YYYY-MM-DD. */
  dtMonth: string;
  strDays: string;
  strRemarks: string;
  /** Days the last calculation used for the month, and where they came from. */
  decUsedDays: number | null;
  strUsedSource: string | null;
};

const DIC_SOURCE_LABELS: Record<string, string> = {
  payable_days_entered: "Entered payable days",
  attendance: "Attendance",
  full_presence_fallback: "Full month (attendance incomplete)",
};

export function describeFNFDaysSource(strSource: string | null | undefined): string {
  if (!strSource) return "-";
  return DIC_SOURCE_LABELS[strSource] ?? strSource.replace(/_/g, " ");
}

export function formatFNFPayableMonth(strMonth: string): string {
  const [strYear, strMonthNo] = strMonth.split("-");
  const dtMonth = new Date(Number(strYear), Number(strMonthNo) - 1, 1);
  return Number.isNaN(dtMonth.getTime()) ? strMonth : dtMonth.toLocaleString("en-GB", { month: "short", year: "numeric" });
}

/** Days in the month that the employee can be paid for: the month, cut at the last working date. */
export function maxFNFPayableDays(strMonth: string, strLastWorkingDate: string | null): number {
  const [intYear, intMonth] = strMonth.split("-").map(Number);
  const intMonthDays = new Date(intYear, intMonth, 0).getDate();
  if (strLastWorkingDate && strLastWorkingDate.slice(0, 7) === strMonth.slice(0, 7)) {
    return Math.min(intMonthDays, Number(strLastWorkingDate.slice(8, 10)));
  }
  return intMonthDays;
}

/** Rows for every salary month of the last calculation plus any month that has entered days. */
export function toFNFPayableDaysRows(objData: FNFPayableDaysResponse): FNFPayableDaysFormRow[] {
  const dicRows = new Map<string, FNFPayableDaysFormRow>();
  for (const objMonth of objData.lstSalaryMonths) {
    const strMonth = objMonth.dtMonth.slice(0, 7) + "-01";
    dicRows.set(strMonth, { dtMonth: strMonth, strDays: "", strRemarks: "", decUsedDays: objMonth.decPayableDays, strUsedSource: objMonth.strSource });
  }
  for (const objEntered of objData.lstPayableDays) {
    const strMonth = objEntered.dtMonth.slice(0, 7) + "-01";
    const objRow = dicRows.get(strMonth) ?? { dtMonth: strMonth, strDays: "", strRemarks: "", decUsedDays: null, strUsedSource: null };
    dicRows.set(strMonth, { ...objRow, strDays: String(objEntered.decPayableDays), strRemarks: objEntered.strRemarks ?? "" });
  }
  if (!dicRows.size && objData.dtLastWorkingDate) {
    const strMonth = objData.dtLastWorkingDate.slice(0, 7) + "-01";
    dicRows.set(strMonth, { dtMonth: strMonth, strDays: "", strRemarks: "", decUsedDays: null, strUsedSource: null });
  }
  return [...dicRows.values()].sort((objA, objB) => objA.dtMonth.localeCompare(objB.dtMonth));
}

/** First problem with the entered days, or "" when they can be saved. */
export function validateFNFPayableDaysRows(lstRows: FNFPayableDaysFormRow[], strLastWorkingDate: string | null): string {
  for (const objRow of lstRows) {
    const strDays = objRow.strDays.trim();
    if (!strDays) continue;
    const decDays = Number(strDays);
    const strLabel = formatFNFPayableMonth(objRow.dtMonth);
    if (!Number.isFinite(decDays) || decDays < 0) return `${strLabel}: enter payable days as 0 or more.`;
    if (Math.round(decDays * 100) !== decDays * 100) return `${strLabel}: payable days can have at most 2 decimals.`;
    const intMax = maxFNFPayableDays(objRow.dtMonth, strLastWorkingDate);
    if (decDays > intMax) return `${strLabel}: payable days cannot be more than ${intMax}.`;
  }
  return "";
}

/** Payload rows: only months with entered days. */
export function buildFNFPayableDaysPayload(lstRows: FNFPayableDaysFormRow[]): FNFPayableDaysRow[] {
  return lstRows
    .filter((objRow) => objRow.strDays.trim() !== "")
    .map((objRow) => ({ dtMonth: objRow.dtMonth, decPayableDays: Number(objRow.strDays.trim()), strRemarks: objRow.strRemarks.trim() || null }));
}

export function hasFNFPayableDaysChanges(lstRows: FNFPayableDaysFormRow[], lstSaved: FNFPayableDaysRow[]): boolean {
  const strSaved = JSON.stringify(
    lstSaved.map((objRow) => ({ dtMonth: objRow.dtMonth.slice(0, 7) + "-01", decPayableDays: Number(objRow.decPayableDays), strRemarks: objRow.strRemarks || null }))
      .sort((objA, objB) => objA.dtMonth.localeCompare(objB.dtMonth)),
  );
  return JSON.stringify(buildFNFPayableDaysPayload(lstRows)) !== strSaved;
}
