import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPayslipViewChoice,
  loadAllowedPayslipViews,
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
