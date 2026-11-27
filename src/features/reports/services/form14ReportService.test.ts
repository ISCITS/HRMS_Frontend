import { beforeEach, describe, expect, it, vi } from "vitest";

const objRequest = vi.fn();
vi.mock("@/lib/axiosInstance", () => ({ axiosInstance: { request: (...lstArgs: unknown[]) => objRequest(...lstArgs) } }));
const objRequestEncryptedApi = vi.fn();
const objCreateApiRequestError = vi.fn(async (objError: unknown) => objError);
vi.mock("@/Common/utils/apiErrorHandler", () => ({
  requestEncryptedApi: (...lstArgs: unknown[]) => objRequestEncryptedApi(...lstArgs),
  createApiRequestError: (...lstArgs: unknown[]) => objCreateApiRequestError(...(lstArgs as [unknown])),
}));

import { buildForm14Query, form14ReportService, getFileNameFromDisposition, type Form14Filters } from "./form14ReportService";

const objFilters: Form14Filters = { intYear: 2026, intDepartmentID: 3, intEmployeeID: null, strStatus: "active", strSearch: " asha " };

describe("form14 query building", () => {
  it("omits empty filters and trims the search", () => {
    expect(buildForm14Query(objFilters)).toBe("intYear=2026&intDepartmentID=3&strStatus=active&strSearch=asha");
    expect(buildForm14Query({ intYear: 2026, strStatus: "both", strSearch: "" })).toBe("intYear=2026&strStatus=both");
  });

  it("appends extras and skips undefined ones", () => {
    expect(buildForm14Query({ intYear: 2026, strStatus: "both" }, { strFormat: "pdf", strPageSize: "A3", blnShowAdditional: false, other: undefined }))
      .toBe("intYear=2026&strStatus=both&strFormat=pdf&strPageSize=A3&blnShowAdditional=false");
  });

  it("reads the file name from content-disposition", () => {
    expect(getFileNameFromDisposition("attachment; filename=\"a.pdf\"; filename*=UTF-8''Form14_2026_all.pdf", "x")).toBe("Form14_2026_all.pdf");
    expect(getFileNameFromDisposition("attachment; filename=\"b.xlsx\"", "x")).toBe("b.xlsx");
    expect(getFileNameFromDisposition(undefined, "fallback.pdf")).toBe("fallback.pdf");
  });
});

describe("form14 report service", () => {
  beforeEach(() => {
    objRequestEncryptedApi.mockReset();
    objRequestEncryptedApi.mockResolvedValue({ Data: { ok: true } });
    objRequest.mockReset();
    objCreateApiRequestError.mockClear();
  });

  it("loads options with the view action", async () => {
    await form14ReportService.getOptions(2025);
    const objCall = objRequestEncryptedApi.mock.calls[0][0];
    expect(objCall.strPath).toMatch(/\/form14\/options\?intYear=2025$/);
    expect(objCall.strMethod).toBe("GET");
    expect(objCall.strMenuAction).toBe("FORM14_VIEW");
  });

  it("generates the register list and the employee register", async () => {
    await form14ReportService.getRegisterList(objFilters);
    expect(objRequestEncryptedApi.mock.calls[0][0].strPath).toMatch(/\/form14\/register\?intYear=2026&intDepartmentID=3&strStatus=active&strSearch=asha$/);
    await form14ReportService.getEmployeeRegister(7, 2026);
    expect(objRequestEncryptedApi.mock.calls[1][0].strPath).toMatch(/\/form14\/employee\/7\?intYear=2026$/);
  });

  it("sends a dry-run or real close with the close action", async () => {
    await form14ReportService.closeYear(objFilters, true);
    const objCall = objRequestEncryptedApi.mock.calls[0][0];
    expect(objCall.strPath).toMatch(/\/form14\/close$/);
    expect(objCall.strMethod).toBe("POST");
    expect(objCall.strMenuAction).toBe("FORM14_CLOSE");
    expect(objCall.objBody).toEqual({ intYear: 2026, blnDryRun: true, intDepartmentID: 3, intEmployeeID: null, strStatus: "active" });
    await form14ReportService.closeYear(objFilters, false);
    expect(objRequestEncryptedApi.mock.calls[1][0].objBody.blnDryRun).toBe(false);
  });

  it("reverses, sets opening and saves the profile", async () => {
    await form14ReportService.reverseYear(2026, 7, "wrong close");
    expect(objRequestEncryptedApi.mock.calls[0][0]).toMatchObject({ strMethod: "POST", objBody: { intYear: 2026, intEmployeeID: 7, strReason: "wrong close" } });
    expect(objRequestEncryptedApi.mock.calls[0][0].strPath).toMatch(/\/form14\/reverse$/);

    await form14ReportService.setOpening({ intYear: 2026, intEmployeeID: 7, decOpeningBalance: 10, decOpeningEarned: 5, decRefused798Balance: 0 });
    expect(objRequestEncryptedApi.mock.calls[1][0]).toMatchObject({ strMethod: "PUT", strMenuAction: "FORM14_CLOSE" });
    expect(objRequestEncryptedApi.mock.calls[1][0].strPath).toMatch(/\/form14\/opening$/);

    await form14ReportService.saveProfile(7, { intRegisterSerialNo: 4, strRegisterNo: "R-4", blnIsChildWorkerOverride: false });
    expect(objRequestEncryptedApi.mock.calls[2][0]).toMatchObject({ strMethod: "PUT", objBody: { intRegisterSerialNo: 4, strRegisterNo: "R-4", blnIsChildWorkerOverride: false } });
    expect(objRequestEncryptedApi.mock.calls[2][0].strPath).toMatch(/\/form14\/employee-profile\/7$/);
  });

  it("reads and saves the configuration with the config action", async () => {
    await form14ReportService.getConfig();
    expect(objRequestEncryptedApi.mock.calls[0][0]).toMatchObject({ strMethod: "GET", strMenuAction: "FORM14_CONFIG" });
    await form14ReportService.saveConfig({ eligibility_days: 240, el_leave_type_codes: ["EL"] });
    expect(objRequestEncryptedApi.mock.calls[1][0]).toMatchObject({
      strMethod: "PUT",
      strMenuAction: "FORM14_CONFIG",
      objBody: { dicSettings: { eligibility_days: 240, el_leave_type_codes: ["EL"] } },
    });
  });

  it("requests the export as a blob with the export right and the same filters", async () => {
    const objBlob = new Blob(["x"]);
    objRequest.mockResolvedValue({ data: objBlob, headers: { "content-disposition": "attachment; filename=\"Form14_2026_E004.pdf\"" } });
    const dicResult = await form14ReportService.fetchExport({ ...objFilters, intEmployeeID: 7 }, { strFormat: "pdf", strPageSize: "A3", blnShowAdditional: true }, "fallback.pdf");
    const objConfig = objRequest.mock.calls[0][0];
    expect(objConfig.url).toMatch(/\/form14\/export\?intYear=2026&intDepartmentID=3&intEmployeeID=7&strStatus=active&strSearch=asha&strFormat=pdf&strPageSize=A3&blnShowAdditional=true$/);
    expect(objConfig.responseType).toBe("blob");
    expect(objConfig.csrfMenuAction).toBe("FORM14_EXPORT");
    expect(dicResult).toEqual({ objBlob, strFileName: "Form14_2026_E004.pdf" });
  });

  it("wraps export failures", async () => {
    objRequest.mockRejectedValue(new Error("boom"));
    await expect(form14ReportService.fetchExport(objFilters, { strFormat: "xlsx" }, "f.xlsx")).rejects.toThrow("boom");
    expect(objCreateApiRequestError).toHaveBeenCalledTimes(1);
  });
});
