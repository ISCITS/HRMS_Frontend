"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { getFileNameFromDisposition } from "@/features/reports/services/form14ReportService";

const strForm12Path = "/form12";
const strViewAction = "FORM12_VIEW";
const strExportAction = "FORM12_EXPORT";
const strConfigAction = "FORM12_CONFIG";

export type Form12Group = "STAFF" | "CONSULTANT" | "WORKER_P" | "WORKER_T" | "APPRENTICE";
export type Form12ExportFormat = "pdf" | "xlsx";
export type Form12PageSize = "A4" | "A3";
export type Form12Sheet = "register" | "payable" | "both";

export type Form12Options = {
  intDefaultYear: number;
  intDefaultMonth: number;
  lstYears: number[];
  lstDepartments: Array<{ intID: number; strName: string }>;
  lstGroups: Array<{ strCode: Form12Group; strLabel: string }>;
  dicConfig: {
    strFactoryName: string;
    strState: string;
    strRuleReference: string;
    strSectionReference: string;
    blnLeaveMapped: boolean;
  };
};

export type Form12Filters = {
  intYear: number;
  intMonth: number;
  intDepartmentID?: number | null;
  intEmployeeID?: number | null;
  strGroup?: Form12Group | "";
  strSearch?: string;
};

export type Form12ExportOptions = {
  strFormat: Form12ExportFormat;
  strPageSize?: Form12PageSize;
  strSheet?: Form12Sheet;
};

export type Form12Issue = {
  strCode: string;
  strSeverity: string;
  strMessage: string;
  intEmployeeID: number | null;
  strEmployeeCode: string;
  strName: string;
};

export type Form12Totals = {
  decPresent: number;
  decHalfDay: number;
  decOnDuty: number;
  decCowin: number;
  decActualPresent: number;
  decWeeklyOff: number;
  decHoliday: number;
  decWorkedOnHoliday: number;
  decAbsent: number;
  decEL: number;
  decCL: number;
  decSL: number;
  decRH: number;
  decCPL: number;
  decTotalDays: number;
};

export type Form12Row = {
  intSerial: number;
  intEmployeeID: number;
  strEmployeeCode: string;
  strName: string;
  strFatherName: string;
  strDesignation: string;
  strDepartment: string;
  strShift: string;
  lstDays: string[];
  dicTotals: Form12Totals;
  lstIssues: Array<{ strCode: string; strSeverity: string; strMessage: string }>;
};

export type Form12GroupBlock = { strGroup: Form12Group; strLabel: string; lstRows: Form12Row[] };

export type Form12Register = {
  intYear: number;
  intMonth: number;
  strMonthName: string;
  intDaysInMonth: number;
  lstWeekdays: string[];
  dicHeader: {
    strFactoryName: string;
    strState: string;
    strRuleReference: string;
    strSectionReference: string;
    lstCommencementLines: string[];
    lstCompletionLines: string[];
    lstRestPeriodLines: string[];
  };
  lstGroups: Form12GroupBlock[];
  lstIssues: Form12Issue[];
  dicSummary: {
    intEmployees: number;
    intEmployeesWithIssues: number;
    intIssueCount: number;
    decTotalPayableDays: number;
  };
};

export type Form12ConfigValue = string | boolean | string[];

export type Form12Config = {
  dicSettings: Record<string, Form12ConfigValue>;
  dicDefaults?: Record<string, Form12ConfigValue>;
};

function setParam(objParams: URLSearchParams, strKey: string, objValue: string | number | null | undefined) {
  if (objValue === null || objValue === undefined || objValue === "") {
    return;
  }
  objParams.set(strKey, String(objValue));
}

export function buildForm12Query(objFilters: Form12Filters, objExtra: Record<string, string | undefined> = {}): string {
  const objParams = new URLSearchParams();
  setParam(objParams, "intYear", objFilters.intYear);
  setParam(objParams, "intMonth", objFilters.intMonth);
  setParam(objParams, "intDepartmentID", objFilters.intDepartmentID);
  setParam(objParams, "intEmployeeID", objFilters.intEmployeeID);
  setParam(objParams, "strGroup", objFilters.strGroup);
  setParam(objParams, "strSearch", objFilters.strSearch?.trim());
  Object.entries(objExtra).forEach(([strKey, strValue]) => setParam(objParams, strKey, strValue));
  return objParams.toString();
}

async function request<TData>(strMethod: ApiRequestMethod, strPath: string, strMenuAction: string, objBody?: unknown): Promise<TData> {
  const objResult = await requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${strForm12Path}${strPath}`,
    strMethod,
    strMenuAction,
    blnUseAuthHeader: true,
    ...(objBody === undefined ? {} : { objBody }),
  });
  return objResult.Data;
}

function saveBlob(objBlob: Blob, strFileName: string) {
  const strObjectUrl = URL.createObjectURL(objBlob);
  const objAnchor = document.createElement("a");
  objAnchor.href = strObjectUrl;
  objAnchor.download = strFileName;
  document.body.appendChild(objAnchor);
  objAnchor.click();
  document.body.removeChild(objAnchor);
  URL.revokeObjectURL(strObjectUrl);
}

export const form12ReportService = {
  getOptions(): Promise<Form12Options> {
    return request<Form12Options>(ApiRequestMethod.Get, "/options", strViewAction);
  },

  getRegister(objFilters: Form12Filters): Promise<Form12Register> {
    return request<Form12Register>(ApiRequestMethod.Get, `/register?${buildForm12Query(objFilters)}`, strViewAction);
  },

  async fetchExport(objFilters: Form12Filters, objOptions: Form12ExportOptions, strFallbackFileName: string): Promise<{ objBlob: Blob; strFileName: string }> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strForm12Path}/export?${buildForm12Query(objFilters, {
          strFormat: objOptions.strFormat,
          strPageSize: objOptions.strPageSize,
          strSheet: objOptions.strSheet,
        })}`,
        responseType: "blob",
        csrfMenuAction: strExportAction,
      } as ApiRequestConfig);
      const strHeader = (objResponse.headers as Record<string, string | undefined>)["content-disposition"];
      return { objBlob: objResponse.data, strFileName: getFileNameFromDisposition(strHeader, strFallbackFileName) };
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async downloadExport(objFilters: Form12Filters, objOptions: Form12ExportOptions, strFallbackFileName: string): Promise<void> {
    const { objBlob, strFileName } = await form12ReportService.fetchExport(objFilters, objOptions, strFallbackFileName);
    saveBlob(objBlob, strFileName);
  },

  // Opens the PDF in a new tab so it can be printed; falls back to a download if the browser blocks the tab.
  async printPdf(objFilters: Form12Filters, objOptions: Omit<Form12ExportOptions, "strFormat">, strFallbackFileName: string): Promise<void> {
    const { objBlob, strFileName } = await form12ReportService.fetchExport(objFilters, { ...objOptions, strFormat: "pdf" }, strFallbackFileName);
    const strObjectUrl = URL.createObjectURL(objBlob);
    if (window.open(strObjectUrl, "_blank")) {
      setTimeout(() => URL.revokeObjectURL(strObjectUrl), 60000);
      return;
    }
    URL.revokeObjectURL(strObjectUrl);
    saveBlob(objBlob, strFileName);
  },

  getConfig(): Promise<Form12Config> {
    return request<Form12Config>(ApiRequestMethod.Get, "/config", strConfigAction);
  },

  saveConfig(dicSettings: Record<string, Form12ConfigValue>): Promise<Form12Config> {
    return request<Form12Config>(ApiRequestMethod.Put, "/config", strConfigAction, { dicSettings });
  },
};
