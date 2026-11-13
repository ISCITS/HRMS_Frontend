import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PAYROLL_DOCUMENT_FORMATS,
  loadPayrollDocumentFormats,
  normalizePayrollDocumentFormats,
  resetPayrollDocumentFormats,
  resolveConfiguredPayslipView,
  type PayrollDocumentFormats,
} from "./payrollDocumentFormat";

const OURS_MONTHLY: PayrollDocumentFormats = { strPayslipFormat: "default", strPayslipView: "monthly", strFNFReportFormat: "default" };
const OURS_DETAILED: PayrollDocumentFormats = { ...OURS_MONTHLY, strPayslipView: "detailed" };
const CLIENT: PayrollDocumentFormats = { strPayslipFormat: "client", strPayslipView: "detailed", strFNFReportFormat: "client" };

describe("payroll document formats", () => {
  afterEach(() => resetPayrollDocumentFormats());

  it("defaults to our format, Monthly", () => {
    expect(DEFAULT_PAYROLL_DOCUMENT_FORMATS).toEqual(OURS_MONTHLY);
    expect(normalizePayrollDocumentFormats(null)).toEqual(OURS_MONTHLY);
  });

  it("keeps known values and drops unknown ones", () => {
    expect(normalizePayrollDocumentFormats(CLIENT)).toEqual(CLIENT);
    expect(normalizePayrollDocumentFormats({ strPayslipFormat: "pdf", strPayslipView: "yearly", strFNFReportFormat: 3 })).toEqual(OURS_MONTHLY);
  });

  it("opens the configured view of our format", () => {
    expect(resolveConfiguredPayslipView(OURS_MONTHLY, ["monthly", "detailed"])).toBe("monthly");
    expect(resolveConfiguredPayslipView(OURS_DETAILED, ["monthly", "detailed"])).toBe("detailed");
  });

  it("opens the view the user holds when the configured one is not granted", () => {
    expect(resolveConfiguredPayslipView(OURS_DETAILED, ["monthly"])).toBe("monthly");
    expect(resolveConfiguredPayslipView(OURS_MONTHLY, ["detailed"])).toBe("detailed");
  });

  it("opens the client format when configured and Monthly is granted", () => {
    expect(resolveConfiguredPayslipView(CLIENT, ["monthly", "detailed"])).toBe("client");
    expect(resolveConfiguredPayslipView(CLIENT, ["monthly"])).toBe("client");
  });

  it("falls back to our format when the client format cannot be opened", () => {
    // The client format is a monthly payslip: without the Monthly right, our Detailed one opens.
    expect(resolveConfiguredPayslipView(CLIENT, ["detailed"])).toBe("detailed");
    // A screen that does not offer the client format opens our format.
    expect(resolveConfiguredPayslipView(CLIENT, ["monthly", "detailed"], false)).toBe("detailed");
  });

  it("refuses when the user holds no payslip view", () => {
    expect(resolveConfiguredPayslipView(OURS_MONTHLY, [])).toBe("none");
    expect(resolveConfiguredPayslipView(CLIENT, [])).toBe("none");
  });

  it("fetches the formats once per page load", async () => {
    const fnLoad = vi.fn(async () => CLIENT);
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(CLIENT);
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(CLIENT);
    expect(fnLoad).toHaveBeenCalledOnce();
  });

  it("opens our format when the fetch fails, and fetches again next time", async () => {
    const fnLoad = vi.fn<() => Promise<unknown>>().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(CLIENT);
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(OURS_MONTHLY);
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(CLIENT);
    expect(fnLoad).toHaveBeenCalledTimes(2);
  });

  it("fetches again after Settings saves new formats", async () => {
    const fnLoad = vi.fn<() => Promise<unknown>>().mockResolvedValueOnce(OURS_MONTHLY).mockResolvedValueOnce(CLIENT);
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(OURS_MONTHLY);
    resetPayrollDocumentFormats();
    await expect(loadPayrollDocumentFormats(fnLoad)).resolves.toEqual(CLIENT);
  });
});
