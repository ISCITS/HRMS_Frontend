"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

const strForm14Path = "/form14";
const strViewAction = "FORM14_VIEW";
const strExportAction = "FORM14_EXPORT";
const strCloseAction = "FORM14_CLOSE";
const strConfigAction = "FORM14_CONFIG";

export type Form14Status = "active" | "discharged" | "both";
export type Form14ExportFormat = "pdf" | "xlsx";
export type Form14PageSize = "A4" | "A3";

export type Form14Options = {
  intDefaultYear: number;
  lstYears: number[];
  lstDepartments: Array<{ intID: number; strName: string }>;
  lstEmployees: Array<{ intID: number; strEmployeeCode: string; strName: string }>;
  dicConfig: {
    strState: string;
    strRegime: string;
    strRuleReference: string;
    strFactoryName: string;
    intEligibilityDays: number;
    decCarryForwardCapAdult: number;
    blnShowAdditionalColumns: boolean;
    lstAdditionalLeaveTypes: string[];
    blnElMapped: boolean;
  };
};

export type Form14Filters = {
  intYear: number;
  intDepartmentID?: number | null;
  intEmployeeID?: number | null;
  strStatus: Form14Status;
  strSearch?: string;
};

export type Form14ExportOptions = {
  strFormat: Form14ExportFormat;
  strPageSize?: Form14PageSize;
  blnShowAdditional?: boolean;
};

export type Form14Issue = {
  strCode: string;
  strSeverity: string;
  intMonth: number | null;
  strMessage: string;
};

export type Form14ListIssue = Form14Issue & {
  intEmployeeID: number;
  strEmployeeCode: string;
  strName: string;
};

export type Form14ListRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strName: string;
  strDepartment: string;
  decQualifyingDays: number;
  intEligibilityDays: number;
  blnOnTrack: boolean;
  decOpeningEl: number;
  decElTaken: number;
  decElBalance: number;
  intIssueCount: number;
  blnLocked: boolean;
};

export type Form14List = {
  intYear: number;
  dicSummary: {
    intWorkers: number;
    intOnTrack: number;
    intIssueCount: number;
    intEmployeesWithIssues: number;
    strYearStatus: "Open" | "Locked" | "Partly locked";
    intLocked: number;
  };
  lstEmployees: Form14ListRow[];
  lstIssues: Form14ListIssue[];
};

export type Form14ElTxn = {
  dtFrom: string | null;
  dtTo: string | null;
  decDays: number | null;
  blnRefusedUnder798?: boolean;
  decNormalRate?: number | null;
  decConcessionRate?: number | null;
  decLeaveWageRate?: number | null;
};

export type Form14Month = {
  intMonth: number;
  blnHasData: boolean;
  decWagesEarned?: number | null;
  decWorked?: number | null;
  decLayoff?: number | null;
  decMaternity?: number | null;
  decEl?: number | null;
  decTotal?: number | null;
  decBalance?: number | null;
  lstElTxns?: Form14ElTxn[];
  dicAdditional?: Record<string, number | null | undefined>;
};

export type Form14Header = {
  intYear: number;
  strSerialNo: number | string | null;
  strDepartment: string;
  strAdultChild: string;
  dtDateOfEntry: string | null;
  strRegisterNo: string;
  strEmployeeCode: string;
  strName: string;
  strFatherName: string | null;
  dtDateOfDischarge: string | null;
  dtEncashmentDate: string | null;
  decEncashmentAmount: number | null;
  strFactoryName: string;
  strState: string;
  strRuleReference: string;
  strRegime: string;
  blnShowAdditionalColumns: boolean;
  lstAdditionalLeaveTypes: string[];
};

export type Form14Register = {
  intYear: number;
  intEmployeeID: number;
  blnLocked: boolean;
  dicHeader: Form14Header;
  dicOpening: {
    decBalance: number;
    decEarned: number;
    decTotal: number;
    decRefused798: number;
    dicAdditional: Record<string, number | null | undefined>;
    [strKey: string]: unknown;
  };
  lstMonths: Form14Month[];
  dicTotals: {
    decWagesEarned: number;
    decWorked: number;
    decLayoff: number;
    decMaternity: number;
    decEl: number;
    decTotal: number;
    decElDays: number;
    decWeeklyOffHoliday: number;
    decCalendarDays: number;
    [strKey: string]: unknown;
  };
  dicAdditionalTotals: Record<string, number | null | undefined>;
  dicSummary: {
    decQualifyingDays: number;
    intEligibilityDays: number;
    decCarryForwardCap: number;
    blnClosed?: boolean;
    decEarnedForNextYear?: number | null;
    decCarryForward?: number | null;
    [strKey: string]: unknown;
  };
  lstIssues: Form14Issue[];
  decYearEndBalance?: number;
};

export type Form14ClosePlanRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strName: string;
  strOutcome: "skipped" | "dry_run" | "closed";
  strReason?: string;
  dicResult?: {
    decEarnedForNextYear?: number;
    decCarryForwardToNext?: number;
    decLapsed?: number;
    [strKey: string]: unknown;
  };
};

export type Form14CloseResult = {
  intYear: number;
  blnDryRun: boolean;
  intClosed: number;
  intSkipped: number;
  lstEmployees: Form14ClosePlanRow[];
};

export type Form14OpeningInput = {
  intYear: number;
  intEmployeeID: number;
  decOpeningBalance: number;
  decOpeningEarned: number;
  decRefused798Balance: number;
  strReason?: string;
};

export type Form14ProfileInput = {
  intRegisterSerialNo?: number | null;
  strRegisterNo?: string | null;
  blnIsChildWorkerOverride?: boolean | null;
};

export type Form14ConfigValue = string | number | boolean | string[];

export type Form14Config = {
  dicSettings: Record<string, Form14ConfigValue>;
  dicDefaults?: Record<string, Form14ConfigValue>;
  dicAllowedValues?: Record<string, string[] | null>;
  [strKey: string]: unknown;
};

function setParam(objParams: URLSearchParams, strKey: string, objValue: string | number | boolean | null | undefined) {
  if (objValue === null || objValue === undefined || objValue === "") {
    return;
  }
  objParams.set(strKey, String(objValue));
}

export function buildForm14Query(objFilters: Form14Filters, objExtra: Record<string, string | number | boolean | null | undefined> = {}): string {
  const objParams = new URLSearchParams();
  setParam(objParams, "intYear", objFilters.intYear);
  setParam(objParams, "intDepartmentID", objFilters.intDepartmentID);
  setParam(objParams, "intEmployeeID", objFilters.intEmployeeID);
  setParam(objParams, "strStatus", objFilters.strStatus);
  setParam(objParams, "strSearch", objFilters.strSearch?.trim());
  Object.entries(objExtra).forEach(([strKey, objValue]) => setParam(objParams, strKey, objValue));
  return objParams.toString();
}

export function getFileNameFromDisposition(strDisposition: string | undefined, strFallback: string): string {
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

async function request<TData>(strMethod: ApiRequestMethod, strPath: string, strMenuAction: string, objBody?: unknown): Promise<TData> {
  const objResult = await requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${strForm14Path}${strPath}`,
    strMethod,
    strMenuAction,
    blnUseAuthHeader: true,
    ...(objBody === undefined ? {} : { objBody }),
  });
  return objResult.Data;
}

export const form14ReportService = {
  getOptions(intYear?: number): Promise<Form14Options> {
    return request<Form14Options>(ApiRequestMethod.Get, `/options${intYear ? `?intYear=${intYear}` : ""}`, strViewAction);
  },

  getRegisterList(objFilters: Form14Filters): Promise<Form14List> {
    return request<Form14List>(ApiRequestMethod.Get, `/register?${buildForm14Query(objFilters)}`, strViewAction);
  },

  getEmployeeRegister(intEmployeeID: number, intYear: number): Promise<Form14Register> {
    return request<Form14Register>(ApiRequestMethod.Get, `/employee/${intEmployeeID}?intYear=${intYear}`, strViewAction);
  },

  // Fetches the register(s) as one landscape PDF (a page per worker) or an Excel workbook.
  async fetchExport(objFilters: Form14Filters, objOptions: Form14ExportOptions, strFallbackFileName: string): Promise<{ objBlob: Blob; strFileName: string }> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strForm14Path}/export?${buildForm14Query(objFilters, {
          strFormat: objOptions.strFormat,
          strPageSize: objOptions.strPageSize,
          blnShowAdditional: objOptions.blnShowAdditional,
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

  async downloadExport(objFilters: Form14Filters, objOptions: Form14ExportOptions, strFallbackFileName: string): Promise<void> {
    const { objBlob, strFileName } = await form14ReportService.fetchExport(objFilters, objOptions, strFallbackFileName);
    const strObjectUrl = URL.createObjectURL(objBlob);
    const objAnchor = document.createElement("a");
    objAnchor.href = strObjectUrl;
    objAnchor.download = strFileName;
    document.body.appendChild(objAnchor);
    objAnchor.click();
    document.body.removeChild(objAnchor);
    URL.revokeObjectURL(strObjectUrl);
  },

  // Opens the PDF in a new tab so it can be printed; falls back to a download if the browser blocks the tab.
  async printPdf(objFilters: Form14Filters, objOptions: Omit<Form14ExportOptions, "strFormat">, strFallbackFileName: string): Promise<void> {
    const { objBlob, strFileName } = await form14ReportService.fetchExport(objFilters, { ...objOptions, strFormat: "pdf" }, strFallbackFileName);
    const strObjectUrl = URL.createObjectURL(objBlob);
    const objWindow = window.open(strObjectUrl, "_blank");
    if (objWindow) {
      // The tab keeps its own reference; release ours later.
      setTimeout(() => URL.revokeObjectURL(strObjectUrl), 60000);
      return;
    }
    const objAnchor = document.createElement("a");
    objAnchor.href = strObjectUrl;
    objAnchor.download = strFileName;
    document.body.appendChild(objAnchor);
    objAnchor.click();
    document.body.removeChild(objAnchor);
    URL.revokeObjectURL(strObjectUrl);
  },

  closeYear(objFilters: Form14Filters, blnDryRun: boolean): Promise<Form14CloseResult> {
    return request<Form14CloseResult>(ApiRequestMethod.Post, "/close", strCloseAction, {
      intYear: objFilters.intYear,
      blnDryRun,
      intDepartmentID: objFilters.intDepartmentID ?? null,
      intEmployeeID: objFilters.intEmployeeID ?? null,
      strStatus: objFilters.strStatus,
    });
  },

  reverseYear(intYear: number, intEmployeeID: number, strReason: string): Promise<{ intYear: number; intEmployeeID: number; blnReopened: boolean }> {
    return request(ApiRequestMethod.Post, "/reverse", strCloseAction, { intYear, intEmployeeID, strReason });
  },

  setOpening(objInput: Form14OpeningInput): Promise<Record<string, unknown>> {
    return request(ApiRequestMethod.Put, "/opening", strCloseAction, objInput);
  },

  saveProfile(intEmployeeID: number, objInput: Form14ProfileInput): Promise<Record<string, unknown>> {
    return request(ApiRequestMethod.Put, `/employee-profile/${intEmployeeID}`, strCloseAction, objInput);
  },

  getConfig(): Promise<Form14Config> {
    return request<Form14Config>(ApiRequestMethod.Get, "/config", strConfigAction);
  },

  saveConfig(dicSettings: Record<string, Form14ConfigValue>): Promise<Form14Config> {
    return request<Form14Config>(ApiRequestMethod.Put, "/config", strConfigAction, { dicSettings });
  },
};
