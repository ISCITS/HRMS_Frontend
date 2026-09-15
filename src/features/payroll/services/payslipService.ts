import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type {
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

export const payslipService = {
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

  async getDownloadHtml(strPayslipID: string): Promise<string> {
    const objResponse = await axiosInstance.get(
      `${ApiRoutePrefix.ApiV1}/payslips/${strPayslipID}/download`,
      {
        csrfMenuAction: "PAYSLIP_EXPORT",
        responseType: "text",
        headers: {
          Accept: "text/html",
          "x-skip-payload-encryption": "true",
        },
      } as ApiRequestConfig
    );
    const strHtml = extractHtmlPayload(objResponse.data);
    if (!strHtml.trim()) {
      throw new Error("Payslip document is empty.");
    }
    return strHtml;
  },
};
