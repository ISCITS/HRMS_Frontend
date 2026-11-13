import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getPayslipSwitchView,
  getPayslipTabRequestView,
  loadAllowedPayslipViews,
  resetAllowedPayslipViews,
} from "./payslipViewChoice";

describe("payslip view choice", () => {
  afterEach(() => resetAllowedPayslipViews());

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
