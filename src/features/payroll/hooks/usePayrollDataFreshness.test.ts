import { describe, expect, it, vi } from "vitest";

vi.mock("@/Common/utils/apiErrorHandler", () => ({ requestEncryptedApi: vi.fn() }));

import { createPayrollDataVersionTracker, normalizeMonths, type PayrollDataVersion } from "./usePayrollDataFreshness";
import { formatChangedOn } from "@/features/payroll/components/PayrollDataChangedNotice";

function setup(lstVersions: Array<PayrollDataVersion | Error>, lstOrder: string[] = []) {
  const lstMonthsAsked: string[] = [];
  const fnGetVersion = vi.fn(async (strMonths: string) => {
    lstOrder.push("version");
    lstMonthsAsked.push(strMonths);
    const objNext = lstVersions.shift();
    if (!objNext || objNext instanceof Error) {
      throw objNext ?? new Error("no version");
    }
    return objNext;
  });
  const lstChanges: Array<[boolean, string | null]> = [];
  const objTracker = createPayrollDataVersionTracker(fnGetVersion, (blnStale, dtChangedOn) => lstChanges.push([blnStale, dtChangedOn]));
  return { objTracker, lstChanges, lstMonthsAsked, fnGetVersion };
}

const V1 = { strVersion: "v1", dtChangedOn: "2026-10-01T10:00:00" };
const V2 = { strVersion: "v2", dtChangedOn: "2026-10-02T11:30:00" };

describe("payroll data freshness", () => {
  it("normalizes the months a screen shows", () => {
    expect(normalizeMonths("2026-09")).toBe("2026-09");
    expect(normalizeMonths("2026-09-01")).toBe("2026-09");
    expect(normalizeMonths("2026-09, 2026-08,2026-09")).toBe("2026-09,2026-08");
    expect(normalizeMonths(["2026-09-01", null, "", "bad"])).toBe("2026-09");
    expect(normalizeMonths(undefined)).toBe("");
  });

  it("reads the version before the data, so a reprocess during loading is still noticed", async () => {
    const lstOrder: string[] = [];
    const { objTracker, lstChanges } = setup([V1, V2], lstOrder);
    const objRows = await objTracker.trackLoad(async () => {
      lstOrder.push("data");
      return ["row"];
    }, "2026-09");
    expect(objRows).toEqual(["row"]);
    expect(lstOrder).toEqual(["version", "data"]);
    await objTracker.check();
    expect(lstChanges.at(-1)).toEqual([true, V2.dtChangedOn]);
  });

  it("stays quiet while the figures are unchanged and clears after a refresh", async () => {
    const { objTracker, lstChanges, lstMonthsAsked } = setup([V1, V1, V2, V2]);
    await objTracker.trackLoad(async () => null, ["2026-09-01"]);
    await objTracker.check();
    expect(lstChanges).toEqual([[false, null]]);
    await objTracker.check();
    expect(lstChanges.at(-1)).toEqual([true, V2.dtChangedOn]);
    await objTracker.trackLoad(async () => null, "2026-09");
    expect(lstChanges.at(-1)).toEqual([false, null]);
    // The month the screen shows is what is compared.
    expect(lstMonthsAsked.every((strMonths) => strMonths === "2026-09")).toBe(true);
  });

  it("never alarms when the version cannot be read", async () => {
    const { objTracker, lstChanges } = setup([new Error("offline"), V2]);
    await objTracker.trackLoad(async () => null, "2026-09");
    await objTracker.check();
    expect(lstChanges).toEqual([[false, null]]);
    const objSecond = setup([V1, new Error("offline")]);
    await objSecond.objTracker.trackLoad(async () => null);
    await objSecond.objTracker.check();
    expect(objSecond.lstChanges).toEqual([[false, null]]);
  });

  it("does not check before anything was loaded, and Refresh reruns the screen's load", async () => {
    const { objTracker, fnGetVersion } = setup([V1]);
    await objTracker.check();
    expect(fnGetVersion).not.toHaveBeenCalled();
    const fnReload = vi.fn();
    await objTracker.trackLoad(async () => null, "2026-09", fnReload);
    objTracker.reload();
    expect(fnReload).toHaveBeenCalledOnce();
  });

  it("shows the change time from a UTC timestamp", () => {
    expect(formatChangedOn(null)).toBe("");
    expect(formatChangedOn("not a date")).toBe("");
    const strWithoutZone = formatChangedOn("2026-10-02T11:30:00");
    expect(strWithoutZone).toBe(formatChangedOn("2026-10-02T11:30:00Z"));
    expect(strWithoutZone).toBe(formatChangedOn("2026-10-02T11:30:00+00:00"));
    expect(strWithoutZone).toMatch(/Oct/);
  });
});
