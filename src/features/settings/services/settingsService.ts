"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  ApproverEmployeeDto,
  LeaveSettingsConfigDto,
  LeaveSettingsSaveRequest,
  PayrollDocumentFormatConfigDto,
  PayrollDocumentFormatSaveRequest,
} from "@/features/settings/types";

const SETTINGS_VIEW = "SETTINGS_VIEW";
const SETTINGS_EDIT = "SETTINGS_EDIT";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const settingsService = {
  // ---- Business single-page Leave settings ----
  async getLeaveConfig(): Promise<LeaveSettingsConfigDto> {
    const objResult = await requestApi<LeaveSettingsConfigDto>({
      strPath: "/settings/leave/config",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data as LeaveSettingsConfigDto;
  },

  async searchApproverEmployees(strSearch: string): Promise<ApproverEmployeeDto[]> {
    const strQuery = strSearch.trim() ? `?q=${encodeURIComponent(strSearch.trim())}` : "";
    const objResult = await requestApi<ApproverEmployeeDto[]>({
      strPath: `/settings/leave/approver-employees${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data ?? [];
  },

  async searchAttendanceApproverEmployees(strSearch: string): Promise<ApproverEmployeeDto[]> {
    const strQuery = strSearch.trim() ? `?q=${encodeURIComponent(strSearch.trim())}` : "";
    const objResult = await requestApi<ApproverEmployeeDto[]>({
      strPath: `/settings/attendance/approver-employees${strQuery}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data ?? [];
  },

  async saveLeaveConfig(objPayload: LeaveSettingsSaveRequest): Promise<LeaveSettingsConfigDto> {
    const objResult = await requestApi<LeaveSettingsConfigDto>({
      strPath: "/settings/leave/config",
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: SETTINGS_EDIT,
    });
    return objResult.Data as LeaveSettingsConfigDto;
  },

  // ---- Payroll: payslip & F&F report formats ----
  async getPayrollDocumentFormat(): Promise<PayrollDocumentFormatConfigDto> {
    const objResult = await requestApi<PayrollDocumentFormatConfigDto>({
      strPath: "/settings/payroll/document-format",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data as PayrollDocumentFormatConfigDto;
  },

  async savePayrollDocumentFormat(objPayload: PayrollDocumentFormatSaveRequest): Promise<PayrollDocumentFormatConfigDto> {
    const objResult = await requestApi<PayrollDocumentFormatConfigDto>({
      strPath: "/settings/payroll/document-format",
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: SETTINGS_EDIT,
    });
    return objResult.Data as PayrollDocumentFormatConfigDto;
  },

  /** A template filled with sample figures. */
  async previewPayrollDocumentFormat(
    strDocument: "payslip" | "fnf" | "ctc",
    strFormat: "default" | "client",
    strView: "monthly" | "detailed" | "annual" = "monthly",
  ): Promise<string> {
    const objResult = await requestApi<{ strHtml: string }>({
      strPath: `/settings/payroll/document-format/preview?document=${strDocument}&format=${strFormat}&view=${strView}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SETTINGS_VIEW,
    });
    return objResult.Data?.strHtml ?? "";
  },

  /** The formats payslip / F&F screens open (any signed-in user). */
  async getEffectivePayrollDocumentFormat(): Promise<PayrollDocumentFormatSaveRequest> {
    const objResult = await requestApi<PayrollDocumentFormatSaveRequest>({
      strPath: "/settings/payroll/document-format/effective",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYSLIP_VIEW",
    });
    return objResult.Data as PayrollDocumentFormatSaveRequest;
  },
};
