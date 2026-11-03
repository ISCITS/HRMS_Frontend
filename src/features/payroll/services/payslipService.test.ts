import { beforeEach, describe, expect, it, vi } from "vitest";

const objGet = vi.fn();
vi.mock("@/lib/axiosInstance", () => ({ axiosInstance: { get: (...lstArgs: unknown[]) => objGet(...lstArgs) } }));
const objRequestEncryptedApi = vi.fn();
vi.mock("@/Common/utils/apiErrorHandler", () => ({ requestEncryptedApi: (...lstArgs: unknown[]) => objRequestEncryptedApi(...lstArgs) }));

import { payslipService } from "./payslipService";

describe("payslip view rights", () => {
  it("reads the views the user may open and ignores anything unknown", async () => {
    objRequestEncryptedApi.mockResolvedValueOnce({ Data: { lstViews: ["monthly", "annual", "detailed"] } });
    await expect(payslipService.getAllowedViews()).resolves.toEqual(["monthly", "detailed"]);
    expect(objRequestEncryptedApi.mock.calls[0][0].strPath).toMatch(/\/payroll\/payslip-views$/);
  });

  it("treats a missing list as no views", async () => {
    objRequestEncryptedApi.mockResolvedValueOnce({ Data: null });
    await expect(payslipService.getAllowedViews()).resolves.toEqual([]);
  });
});

describe("payslip service", () => {
  beforeEach(() => {
    objGet.mockReset();
    objGet.mockResolvedValue({ data: "<html>payslip</html>" });
  });

  it("opens the latest payslip of an employee's run in the chosen view", async () => {
    await expect(payslipService.getPayslipDocument("run-uuid", 7, "monthly")).resolves.toBe("<html>payslip</html>");
    const [strUrl, objConfig] = objGet.mock.calls[0];
    expect(strUrl).toMatch(/\/payroll\/runs\/run-uuid\/employees\/7\/payslip\/document\?view=monthly&purpose=view$/);
    expect(objConfig.csrfMenuAction).toBe("PAYSLIP_VIEW");
  });

  it("asks for the export right when printing or downloading", async () => {
    await payslipService.getPayslipDocument("run-uuid", 7, "detailed", "export");
    const [strUrl, objConfig] = objGet.mock.calls[0];
    expect(strUrl).toMatch(/view=detailed&purpose=export$/);
    expect(objConfig.csrfMenuAction).toBe("PAYSLIP_EXPORT");
  });

  it("passes the view for saved-payslip links and defaults to detailed", async () => {
    await payslipService.getDownloadHtml("payslip-uuid");
    await payslipService.getDownloadHtml("payslip-uuid", "monthly");
    expect(objGet.mock.calls[0][0]).toMatch(/\/payslips\/payslip-uuid\/download\?view=detailed$/);
    expect(objGet.mock.calls[1][0]).toMatch(/\/payslips\/payslip-uuid\/download\?view=monthly$/);
  });

  it("opens the client format as a page with the monthly figures", async () => {
    await expect(payslipService.getPayslipDocument("run-uuid", 7, "client", "export")).resolves.toBe("<html>payslip</html>");
    const [strUrl, objConfig] = objGet.mock.calls[0];
    expect(strUrl).toMatch(/\/payroll\/runs\/run-uuid\/employees\/7\/payslip\/document\?view=monthly&format=client&purpose=export$/);
    expect(objConfig.responseType).toBe("text");
    await payslipService.getDownloadHtml("payslip-uuid", "client");
    expect(objGet.mock.calls[1][0]).toMatch(/\/payslips\/payslip-uuid\/download\?view=monthly&format=client$/);
  });

  it("rejects an empty document", async () => {
    objGet.mockResolvedValue({ data: "   " });
    await expect(payslipService.getPayslipDocument("run-uuid", 7, "monthly")).rejects.toThrow("Payslip document is empty.");
  });
});
