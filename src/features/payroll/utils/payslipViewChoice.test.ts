import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPayslipSwitchView,
  getPayslipTabRequestView,
  getPayslipViewChoice,
  loadAllowedPayslipViews,
  PAYSLIP_FORMAT_OPTIONS,
  PAYSLIP_VIEW_OPTIONS,
  resetAllowedPayslipViews,
} from "./payslipViewChoice";

describe("payslip view choice", () => {
  afterEach(() => resetAllowedPayslipViews());

  it("asks only when both views are allowed", () => {
    expect(getPayslipViewChoice(["monthly", "detailed"])).toBe("ask");
    expect(getPayslipViewChoice(["detailed", "monthly"])).toBe("ask");
  });

  it("opens the only allowed view without asking", () => {
    expect(getPayslipViewChoice(["monthly"])).toEqual({ strView: "monthly" });
    expect(getPayslipViewChoice(["detailed"])).toEqual({ strView: "detailed" });
  });

  it("refuses when no view is allowed", () => {
    expect(getPayslipViewChoice([])).toBe("none");
  });

  it("always asks when the screen offers the client format and Monthly is allowed", () => {
    expect(getPayslipViewChoice(["monthly"], true)).toBe("ask");
    expect(getPayslipViewChoice(["monthly", "detailed"], true)).toBe("ask");
    // The client format is a monthly payslip: without the Monthly right it is not offered.
    expect(getPayslipViewChoice(["detailed"], true)).toEqual({ strView: "detailed" });
    expect(getPayslipViewChoice([], true)).toBe("none");
  });

  it("fetches the detailed page for the tab's switch, the client format as chosen", () => {
    expect(getPayslipTabRequestView("monthly", true)).toBe("detailed");
    expect(getPayslipTabRequestView("monthly", false)).toBe("monthly");
    expect(getPayslipTabRequestView("client", true)).toBe("client");
  });

  it("shows the Monthly / Detailed switch for the default format only", () => {
    expect(getPayslipSwitchView("monthly", true)).toBe("monthly");
    expect(getPayslipSwitchView("client", true)).toBeUndefined();
    expect(getPayslipSwitchView("detailed", false)).toBeUndefined();
  });

  it("offers the default format first, then the client format", () => {
    expect(PAYSLIP_FORMAT_OPTIONS.map((objOption) => objOption.strFormat)).toEqual(["default", "client"]);
  });

  it("offers Monthly first, then Detailed", () => {
    expect(PAYSLIP_VIEW_OPTIONS.map((objOption) => objOption.strView)).toEqual(["monthly", "detailed"]);
  });

  it("fetches the user's views once per page load", async () => {
    const fnLoad = vi.fn(async () => ["monthly" as const]);
    await expect(loadAllowedPayslipViews(fnLoad)).resolves.toEqual(["monthly"]);
    await expect(loadAllowedPayslipViews(fnLoad)).resolves.toEqual(["monthly"]);
    expect(fnLoad).toHaveBeenCalledOnce();
  });

  it("retries after a failed fetch instead of remembering the failure", async () => {
    const fnLoad = vi
      .fn<() => Promise<Array<"monthly" | "detailed">>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(["monthly", "detailed"]);
    await expect(loadAllowedPayslipViews(fnLoad)).rejects.toThrow("offline");
    await expect(loadAllowedPayslipViews(fnLoad)).resolves.toEqual(["monthly", "detailed"]);
    expect(fnLoad).toHaveBeenCalledTimes(2);
  });
});
