import { describe, expect, it } from "vitest";

import { compressMonths, countBySeverity, summarizeIssues, type Form14IssueLike } from "./form14Issues";

const issue = (strCode: string, strSeverity: string, intMonth: number | null, strMessage = "msg"): Form14IssueLike => ({
  strCode,
  strSeverity,
  strMessage,
  intMonth,
});

describe("compressMonths", () => {
  it("collapses runs of three or more and lists the rest", () => {
    expect(compressMonths([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe("Jan–Sep");
    expect(compressMonths([1, 3, 4, 5, 9])).toBe("Jan, Mar–May, Sep");
    expect(compressMonths([2, 3])).toBe("Feb, Mar");
    expect(compressMonths([12, 1, 1])).toBe("Jan, Dec");
    expect(compressMonths([])).toBe("");
  });
});

describe("summarizeIssues", () => {
  it("merges the same monthly check into one line and puts errors first", () => {
    const lstIssues = [
      ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((intMonth) => issue("CALENDAR_DAYS_MISMATCH", "error", intMonth, "long per-month text")),
      issue("QUALIFYING_TRENDING_LOW", "warning", null, "Qualifying days 0 after month 9"),
      issue("EL_MAPPING_MISSING", "warning", null, "No EL leave type is mapped"),
    ];
    const lstLines = summarizeIssues(lstIssues);
    expect(lstLines).toHaveLength(3);
    expect(lstLines[0]).toMatchObject({ strCode: "CALENDAR_DAYS_MISMATCH", strSeverity: "error", strMonths: "Jan–Sep", intCount: 9 });
    expect(lstLines[0].strText).not.toContain("long per-month text");
    expect(lstLines[1].strSeverity).toBe("warning");
    expect(lstLines[2].strText).toBe("No EL leave type is mapped");
  });

  it("keeps the server message for non-monthly checks and shows the month of a single one", () => {
    const lstLines = summarizeIssues([issue("BALANCE_MISMATCH", "error", null, "Col 11 minus EL is 5 but col 16 is 6")]);
    expect(lstLines[0]).toMatchObject({ strText: "Col 11 minus EL is 5 but col 16 is 6", strMonths: "" });
  });
});

describe("countBySeverity", () => {
  it("counts errors and warnings", () => {
    expect(countBySeverity([issue("A", "error", 1), issue("B", "warning", null), issue("C", "warning", null)])).toEqual({ intErrors: 1, intWarnings: 2 });
  });
});
