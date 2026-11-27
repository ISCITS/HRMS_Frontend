import { describe, expect, it } from "vitest";

import { fmtDays, getDayCodeStyle, isSundayIndex } from "@/features/reports/utils/form12Grid";

describe("form12Grid", () => {
  it("formats days without trailing zeros and blanks missing values", () => {
    expect(fmtDays(24)).toBe("24");
    expect(fmtDays(20.5)).toBe("20.5");
    expect(fmtDays(0)).toBe("0");
    expect(fmtDays(0, true)).toBe("");
    expect(fmtDays(null)).toBe("");
  });

  it("colours the exception codes only", () => {
    expect(getDayCodeStyle("P")).toBeNull();
    expect(getDayCodeStyle("")).toBeNull();
    expect(getDayCodeStyle("A")).not.toBeNull();
    expect(getDayCodeStyle("CPL")).not.toBeNull();
    expect(getDayCodeStyle("NH")).toEqual(getDayCodeStyle("HD"));
  });

  it("finds the Sundays of October 2026 (4, 11, 18, 25)", () => {
    const lstSundays = Array.from({ length: 31 }, (_, intIndex) => intIndex).filter((intIndex) => isSundayIndex(2026, 10, intIndex)).map((intIndex) => intIndex + 1);
    expect(lstSundays).toEqual([4, 11, 18, 25]);
  });
});
