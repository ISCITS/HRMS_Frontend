import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type {
  PayrollJobStatus,
  PayslipGenerateAllSummary,
  PayslipPreviewRecord,
  PayslipRunListRecord,
} from "@/features/payroll/types";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod | "GET" | "POST";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod as ApiRequestMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

function extractHtmlPayload(objData: unknown): string {
  if (typeof objData === "string") {
    return objData;
  }

  if (
    objData &&
    typeof objData === "object" &&
    "raw" in objData &&
    typeof (objData as { raw?: unknown }).raw === "string"
  ) {
    return (objData as { raw: string }).raw;
  }

  if (
    objData &&
    typeof objData === "object" &&
    "Data" in objData &&
    typeof (objData as { Data?: unknown }).Data === "string"
  ) {
    return (objData as { Data: string }).Data;
  }

  if (
    objData &&
    typeof objData === "object" &&
    "strHtml" in objData &&
    typeof (objData as { strHtml?: unknown }).strHtml === "string"
  ) {
    return (objData as { strHtml: string }).strHtml;
  }

  return "";
}

/** Monthly: this month only. Detailed: adds year-to-date and annual tax figures. */
export type PayslipView = "monthly" | "detailed";

async function getHtml(strPath: string, strCsrfMenuAction: string): Promise<string> {
  const objResponse = await axiosInstance.get(`${ApiRoutePrefix.ApiV1}${strPath}`, {
    csrfMenuAction: strCsrfMenuAction,
    responseType: "text",
    headers: {
      Accept: "text/html",
      "x-skip-payload-encryption": "true",
    },
  } as ApiRequestConfig);
  const strHtml = extractHtmlPayload(objResponse.data);
  if (!strHtml.trim()) {
    throw new Error("Payslip document is empty.");
  }
  return strHtml;
}

export const payslipService = {
  /** The payslip views this user may open (Payroll Runs rights; ESS employees get both). */
  async getAllowedViews(): Promise<PayslipView[]> {
    const objResult = await requestApi<{ lstViews: PayslipView[] }>({
      strPath: "/payroll/payslip-views",
      strMethod: "GET",
      strMenuAction: "PAYSLIP_VIEW",
    });
    return (objResult.Data?.lstViews ?? []).filter((strView) => strView === "monthly" || strView === "detailed");
  },

  /**
   * The payslip page with the latest figures for an employee's run - built from the processed
   * result until the run is finalized, the saved official copy after. No Generate step needed.
   * purpose "export" (print/download) needs the export right; "view" shows it on screen.
   */
  async getPayslipDocument(
    strRunID: string,
    intEmployeeID: number,
    strView: PayslipView,
    strPurpose: "view" | "export" = "view",
  ): Promise<string> {
    return getHtml(
      `/payroll/runs/${strRunID}/employees/${intEmployeeID}/payslip/document?view=${strView}&purpose=${strPurpose}`,
      strPurpose === "export" ? "PAYSLIP_EXPORT" : "PAYSLIP_VIEW",
    );
  },

  async getPayslipPreview(
    strRunID: string,
    intEmployeeID: number
  ): Promise<PayslipPreviewRecord> {
    const objResult = await requestApi<PayslipPreviewRecord>({
      strPath: `/payroll/runs/${strRunID}/employees/${intEmployeeID}/payslip`,
      strMethod: "GET",
      strMenuAction: "PAYSLIP_VIEW",
    });
    return objResult.Data;
  },

  async generatePayslip(
    strRunID: string,
    intEmployeeID: number
  ): Promise<PayslipPreviewRecord> {
    const objResult = await requestApi<PayslipPreviewRecord>({
      strPath: `/payroll/runs/${strRunID}/employees/${intEmployeeID}/payslip/generate`,
      strMethod: "POST",
      strMenuAction: "PAYSLIP_GENERATE",
    });
    return objResult.Data;
  },

  async getRunPayslips(strRunID: string): Promise<PayslipRunListRecord[]> {
    const objResult = await requestApi<PayslipRunListRecord[]>({
      strPath: `/payroll/runs/${strRunID}/payslips`,
      strMethod: "GET",
      strMenuAction: "PAYSLIP_LIST",
    });
    return objResult.Data;
  },

  /** Starts bulk payslip generation in the background; follow it with payrollRunService.getRunJobStatus. */
  async startGenerateAll(strRunID: string): Promise<PayrollJobStatus> {
    const objResult = await requestApi<PayrollJobStatus>({
      strPath: `/payroll/runs/${strRunID}/payslips/generate-all?blnBackground=true`,
      strMethod: "POST",
      strMenuAction: "PAYSLIP_GENERATE_ALL",
    });
    return objResult.Data;
  },

  async generateAll(strRunID: string): Promise<PayslipGenerateAllSummary> {
    const objResult = await requestApi<PayslipGenerateAllSummary>({
      strPath: `/payroll/runs/${strRunID}/payslips/generate-all`,
      strMethod: "POST",
      strMenuAction: "PAYSLIP_GENERATE_ALL",
    });
    return objResult.Data;
  },

  async getPayslipSummary(
    strPayslipID: string
  ): Promise<{ intEmployeeID: number; intPayrollRunID: number; intEmployeePayrollResultID: number }> {
    const objResult = await requestApi<{
      intEmployeeID: number;
      intPayrollRunID: number;
      intEmployeePayrollResultID: number;
    }>({
      strPath: `/payslips/${strPayslipID}/summary`,
      strMethod: "GET",
      strMenuAction: "PAYSLIP_VIEW",
    });
    return objResult.Data;
  },

  /** A saved payslip's page; the server returns the latest figures if that copy is outdated. */
  async getDownloadHtml(strPayslipID: string, strView: PayslipView = "detailed"): Promise<string> {
    return getHtml(`/payslips/${strPayslipID}/download?view=${strView}`, "PAYSLIP_EXPORT");
  },
};
