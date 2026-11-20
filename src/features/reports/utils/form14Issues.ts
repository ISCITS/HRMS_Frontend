// Form 14 validation issues, condensed for display: the same check failing in many months becomes one
// line ("Jan–Sep") instead of one line per month. Pure - no React.

export type Form14IssueLike = {
  strCode: string;
  strSeverity: string;
  strMessage: string;
  intMonth: number | null;
};

export type Form14IssueLine = {
  strCode: string;
  strSeverity: string;
  strText: string;
  strMonths: string;
  intCount: number;
};

const lstMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Checks that repeat per month get one generic sentence; the others keep the server's message.
const dicMonthlyText: Record<string, string> = {
  CALENDAR_DAYS_MISMATCH: "Worked + off + leave days do not add up to the days in the month",
  EL_TXN_NO_DATES: "EL taken without From/To dates",
  MISSING_WAGE_DATA: "EL taken but wage data (cols 17–19) is missing",
};

export function compressMonths(lstMonths: number[]): string {
  const lstSorted = Array.from(new Set(lstMonths.filter((intMonth) => intMonth >= 1 && intMonth <= 12))).sort((a, b) => a - b);
  const lstParts: string[] = [];
  let intIndex = 0;
  while (intIndex < lstSorted.length) {
    let intEnd = intIndex;
    while (intEnd + 1 < lstSorted.length && lstSorted[intEnd + 1] === lstSorted[intEnd] + 1) {
      intEnd += 1;
    }
    const strFrom = lstMonthNames[lstSorted[intIndex] - 1];
    const strTo = lstMonthNames[lstSorted[intEnd] - 1];
    lstParts.push(intEnd - intIndex >= 2 ? `${strFrom}–${strTo}` : lstSorted.slice(intIndex, intEnd + 1).map((intMonth) => lstMonthNames[intMonth - 1]).join(", "));
    intIndex = intEnd + 1;
  }
  return lstParts.join(", ");
}

function severityRank(strSeverity: string): number {
  return strSeverity === "error" ? 0 : 1;
}

export function summarizeIssues(lstIssues: Form14IssueLike[]): Form14IssueLine[] {
  const dicByCode = new Map<string, Form14IssueLike[]>();
  lstIssues.forEach((dicIssue) => {
    dicByCode.set(dicIssue.strCode, [...(dicByCode.get(dicIssue.strCode) ?? []), dicIssue]);
  });
  const lstLines: Form14IssueLine[] = [];
  dicByCode.forEach((lstItems, strCode) => {
    const lstMonths = lstItems.map((dicItem) => dicItem.intMonth).filter((intMonth): intMonth is number => intMonth !== null);
    const blnMonthly = lstMonths.length > 0 && strCode in dicMonthlyText;
    lstLines.push({
      strCode,
      strSeverity: lstItems.some((dicItem) => dicItem.strSeverity === "error") ? "error" : lstItems[0].strSeverity,
      strText: blnMonthly ? dicMonthlyText[strCode] : lstItems[0].strMessage,
      strMonths: blnMonthly ? compressMonths(lstMonths) : lstItems.length === 1 && lstMonths.length === 1 ? compressMonths(lstMonths) : "",
      intCount: lstItems.length,
    });
  });
  return lstLines.sort((a, b) => severityRank(a.strSeverity) - severityRank(b.strSeverity));
}

export function countBySeverity(lstIssues: Form14IssueLike[]): { intErrors: number; intWarnings: number } {
  const intErrors = lstIssues.filter((dicIssue) => dicIssue.strSeverity === "error").length;
  return { intErrors, intWarnings: lstIssues.length - intErrors };
}
