"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

const strPfEcrPath = "/payroll/reports/pf-ecr";
const strMenuAction = "PAYROLL_RESULT_LIST";

export type PfEcrEntityOption = {
  strValue: string;
  strLabel: string;
  strEntityTypeCode: string;
  intEntityID: number | null;
  strEntityName: string;
};

export type PfEcrRunOption = {
  strValue: string;
  intPayrollRunID: number;
  strLabel: string;
  strRunStatus: string;
  strRunType: string;
  blnIsLocked: boolean;
  dtPayrollMonth: string | null;
};

export type PfEcrOptions = {
  lstEntities: PfEcrEntityOption[];
  lstRuns: PfEcrRunOption[];
  strDefaultPayrollMonth: string | null;
};

export type PfEcrReturnType = "PF" | "ESIC";

// One row of either return: PF rows carry the 11 EPFO ECR values (strUan, intEpfWages, ...),
// ESIC rows the six ESIC values (strIpNumber, intDays, intWages, strReasonCode, ...).
export type PfEcrRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  blnIncluded: boolean;
  strStatus: string;
  lstIssues: string[];
  [strKey: string]: string | number | boolean | null | string[];
};

export type PfEcrIssue = {
  strSeverity: "Blocking" | "Warning" | "Info";
  strIssue: string;
  strEmployeeCode: string;
  strEmployeeName: string;
  strUan: string;
};

export type PfEcrTotals = Record<string, number>;

export type PfEcrReport = {
  strReturnType: PfEcrReturnType;
  lstRows: PfEcrRow[];
  dicTotals: PfEcrTotals;
  intMemberCount: number;
  intExcludedCount: number;
  lstIssues: PfEcrIssue[];
  dicIssueCounts: Record<"Blocking" | "Warning" | "Info", number>;
  dicSummary: {
    strEntityValue: string;
    strEntityLabel: string;
    strPayrollMonth: string;
    strPayrollMonthLabel: string;
    intPayrollRunID: number;
    strPayrollRunUUID: string;
    strRunLabel: string;
    strRunStatus: string;
    blnRunLocked: boolean;
    strGeneratedOn: string;
    strFileName: string;
  };
};

// PF: xls (PFECRVersionII) or txt (PFECRFile). ESIC: xls (ESIC ECR file) or mc (portal MC_Template).
export type PfEcrExportFormat = "xls" | "txt" | "mc";

export type PfEcrFilters = {
  strPayrollMonth: string;
  strEntity: string;
  strPayrollRunID: string;
  strReturnType: PfEcrReturnType;
};

function buildQuery(objFilters: PfEcrFilters): string {
  const objParams = new URLSearchParams();
  objParams.set("strPayrollMonth", objFilters.strPayrollMonth);
  objParams.set("strEntity", objFilters.strEntity);
  objParams.set("strPayrollRunID", objFilters.strPayrollRunID);
  objParams.set("strReturnType", objFilters.strReturnType);
  return objParams.toString();
}

function getFileNameFromDisposition(strDisposition: string | undefined, strFallback: string): string {
  if (!strDisposition) {
    return strFallback;
  }
  const objUtf8Match = /filename\*=UTF-8''([^;]+)/i.exec(strDisposition);
  if (objUtf8Match?.[1]) {
    return decodeURIComponent(objUtf8Match[1]);
  }
  const objPlainMatch = /filename="?([^";]+)"?/i.exec(strDisposition);
  return objPlainMatch?.[1] ?? strFallback;
}

export const pfEcrReportService = {
  async getOptions(strPayrollMonth: string): Promise<PfEcrOptions> {
    const objParams = new URLSearchParams();
    if (strPayrollMonth) {
      objParams.set("strPayrollMonth", strPayrollMonth);
    }
    const objResult = await requestEncryptedApi<PfEcrOptions>({
      strPath: `${ApiRoutePrefix.ApiV1}${strPfEcrPath}/options?${objParams.toString()}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },

  async getReport(objFilters: PfEcrFilters): Promise<PfEcrReport> {
    const objResult = await requestEncryptedApi<PfEcrReport>({
      strPath: `${ApiRoutePrefix.ApiV1}${strPfEcrPath}?${buildQuery(objFilters)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },

  // Downloads the ECR upload file in the client's template layout: Excel or #~# text.
  async downloadFile(objFilters: PfEcrFilters, strFormat: PfEcrExportFormat, strFallbackFileName: string): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strPfEcrPath}/export?${buildQuery(objFilters)}&strFormat=${strFormat}`,
        responseType: "blob",
        csrfMenuAction: strMenuAction,
      } as ApiRequestConfig);
      const strHeader = (objResponse.headers as Record<string, string | undefined>)["content-disposition"];
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = getFileNameFromDisposition(strHeader, strFallbackFileName);
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },
};
