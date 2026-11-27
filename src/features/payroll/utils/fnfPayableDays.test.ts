import { describe, expect, it } from "vitest";
import {
  buildFNFPayableDaysPayload,
  hasFNFPayableDaysChanges,
  maxFNFPayableDays,
  toFNFPayableDaysRows,
  validateFNFPayableDaysRows,
} from "@/features/payroll/utils/fnfPayableDays";

const objData = {
  lstPayableDays: [{ dtMonth: "2026-10-01", decPayableDays: 22, strSource: "MANUAL", strRemarks: "Client F&F" }],
  lstSalaryMonths: [
    { dtMonth: "2026-09-01", decPayableDays: 30, decLopDays: 0, strSource: "attendance" },
    { dtMonth: "2026-10-01", decPayableDays: 31, decLopDays: 0, strSource: "full_presence_fallback" },
  ],
  dtLastWorkingDate: "2026-10-31",
  blnEditable: true,
  strSettlementStatus: "calculated",
};

describe("F&F payable days", () => {
  it("lists every salary month with the entered days", () => {
    const lstRows = toFNFPayableDaysRows(objData);
    expect(lstRows.map((objRow) => [objRow.dtMonth, objRow.strDays, objRow.decUsedDays])).toEqual([
      ["2026-09-01", "", 30],
      ["2026-10-01", "22", 31],
    ]);
    expect(hasFNFPayableDaysChanges(lstRows, objData.lstPayableDays)).toBe(false);
  });

  it("sends only months with days and detects changes", () => {
    const lstRows = toFNFPayableDaysRows(objData).map((objRow) => (objRow.dtMonth === "2026-10-01" ? { ...objRow, strDays: "23" } : objRow));
    expect(buildFNFPayableDaysPayload(lstRows)).toEqual([{ dtMonth: "2026-10-01", decPayableDays: 23, strRemarks: "Client F&F" }]);
    expect(hasFNFPayableDaysChanges(lstRows, objData.lstPayableDays)).toBe(true);
  });

  it("caps days at the last working date and rejects bad input", () => {
    expect(maxFNFPayableDays("2026-10-01", "2026-10-05")).toBe(5);
    expect(maxFNFPayableDays("2026-09-01", "2026-10-05")).toBe(30);
    const lstRows = toFNFPayableDaysRows({ ...objData, dtLastWorkingDate: "2026-10-05" });
    expect(validateFNFPayableDaysRows(lstRows, "2026-10-05")).toContain("cannot be more than 5");
    expect(validateFNFPayableDaysRows([{ ...lstRows[0], strDays: "-1" }], "2026-10-05")).toContain("0 or more");
    expect(validateFNFPayableDaysRows([{ ...lstRows[0], strDays: "29.5" }], "2026-10-05")).toBe("");
  });
});
