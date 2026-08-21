import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi, type ApiEnvelope } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import type {
  Form16GenerateCompanySummary,
  Form16ListRecord,
  Form16PreviewRecord,
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

export type Form16GenerateRequest = {
  strFinancialYearCode: string;
  intEmployeeID?: number;
  blnCompanyWide?: boolean;
  blnReissue?: boolean;
  strReissueReason?: string;
  strSignatoryName?: string;
  strSignatoryDesignation?: string;
};

export const form16Service = {
  async generate(objRequest: Form16GenerateRequest): Promise<Form16PreviewRecord | Form16GenerateCompanySummary> {
    const objResult = await requestApi<Form16PreviewRecord | Form16GenerateCompanySummary>({
      strPath: "/form16/generate",
      strMethod: "POST",
      objBody: objRequest,
      strMenuAction: "FORM16_GENERATE",
    });
    return objResult.Data;
  },

  async listMine(): Promise<Form16ListRecord[]> {
    const objResult = await requestApi<Form16ListRecord[]>({
      strPath: "/form16/mine",
      strMethod: "GET",
      strMenuAction: "MY_FORM16",
    });
    return objResult.Data;
  },

  async listForCompany(strFinancialYearCode: string): Promise<Form16ListRecord[]> {
    const objResult = await requestApi<Form16ListRecord[]>({
      strPath: `/form16/company?strFinancialYearCode=${encodeURIComponent(strFinancialYearCode)}`,
      strMethod: "GET",
      strMenuAction: "FORM16_GENERATE",
    });
    return objResult.Data;
  },

  async getSummary(
    intForm16ID: number
  ): Promise<{ intEmployeeID: number; intForm16ID: number }> {
    const objResult = await requestApi<{ intEmployeeID: number; intForm16ID: number }>({
      strPath: `/form16/${intForm16ID}/summary`,
      strMethod: "GET",
      strMenuAction: "FORM16_VIEW",
    });
    return objResult.Data;
  },

  async getDownloadHtml(intForm16ID: number): Promise<string> {
    const objResponse = await axiosInstance.get(
      `${ApiRoutePrefix.ApiV1}/form16/${intForm16ID}/download`,
      {
        csrfMenuAction: "FORM16_EXPORT",
        responseType: "text",
        headers: {
          Accept: "text/html",
          "x-skip-payload-encryption": "true",
        },
      } as ApiRequestConfig
    );
    const strHtml = extractHtmlPayload(objResponse.data);
    if (!strHtml.trim()) {
      throw new Error("Form 16 document is empty.");
    }
    return strHtml;
  },
};
