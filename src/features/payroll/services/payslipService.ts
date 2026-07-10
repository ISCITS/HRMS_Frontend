import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { axiosInstance } from "@/lib/axiosInstance";
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
    intRunID: number,
    intEmployeeID: number
  ): Promise<PayslipPreviewRecord> {
    const objResult = await requestApi<PayslipPreviewRecord>({
      strPath: `/payroll/runs/${intRunID}/employees/${intEmployeeID}/payslip`,
      strMethod: "GET",
      strMenuAction: "PAYSLIP_VIEW",
    });
    return objResult.Data;
  },

  async generatePayslip(
    intRunID: number,
    intEmployeeID: number
  ): Promise<PayslipPreviewRecord> {
    const objResult = await requestApi<PayslipPreviewRecord>({
      strPath: `/payroll/runs/${intRunID}/employees/${intEmployeeID}/payslip/generate`,
      strMethod: "POST",
      strMenuAction: "PAYSLIP_GENERATE",
    });
    return objResult.Data;
  },

  async getRunPayslips(intRunID: number): Promise<PayslipRunListRecord[]> {
    const objResult = await requestApi<PayslipRunListRecord[]>({
      strPath: `/payroll/runs/${intRunID}/payslips`,
      strMethod: "GET",
      strMenuAction: "PAYSLIP_LIST",
    });
    return objResult.Data;
  },

  async generateAll(intRunID: number): Promise<PayslipGenerateAllSummary> {
    const objResult = await requestApi<PayslipGenerateAllSummary>({
      strPath: `/payroll/runs/${intRunID}/payslips/generate-all`,
      strMethod: "POST",
      strMenuAction: "PAYSLIP_GENERATE_ALL",
    });
    return objResult.Data;
  },

  async getDownloadHtml(intPayslipID: number): Promise<string> {
    const objResponse = await axiosInstance.get(
      `${ApiRoutePrefix.ApiV1}/payslips/${intPayslipID}/download`,
      {
        csrfMenuAction: "PAYSLIP_EXPORT",
        responseType: "text",
        headers: {
          Accept: "text/html",
          "x-skip-payload-encryption": "true",
        },
      }
    );
    const strHtml = extractHtmlPayload(objResponse.data);
    if (!strHtml.trim()) {
      throw new Error("Payslip document is empty.");
    }
    return strHtml;
  },
};
