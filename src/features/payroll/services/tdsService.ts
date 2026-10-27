"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

export type TdsMode = "AUTOMATIC" | "CLIENT_PROVIDED";

export const TDS_MODE_LABELS: Record<TdsMode, string> = {
  AUTOMATIC: "Automatic",
  CLIENT_PROVIDED: "Client provided",
};

export type TdsModeHistoryRow = {
  intID: number;
  strMode: TdsMode;
  dtEffectiveFrom: string;
  strReason: string | null;
  blnIsActive: boolean;
  dtAddedOn: string | null;
  intAddedBy: number | null;
};

export type TdsModeOverview = {
  strCurrentMode: TdsMode;
  strCurrentModeLabel: string;
  lstHistory: TdsModeHistoryRow[];
};

export type TdsRunRef = { intRunID: number; strRunName: string; strRunStatus: string };

export type TdsModeSwitchPreviewRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  decLastFinalTds: string;
  decLastSystemTds: string;
  decTdsDeductedSoFar: string | null;
  decEstimatedMonthlyTds: string | null;
  decChange: string | null;
};

export type TdsModeSwitchPreview = {
  strMode: TdsMode;
  strCurrentModeForMonth: TdsMode;
  dtEffectiveFrom: string;
  lstAffectedRuns: TdsRunRef[];
  lstRows: TdsModeSwitchPreviewRow[];
  strNote: string | null;
};

export type TdsModeSaveResult = {
  intID: number;
  strMode: TdsMode;
  dtEffectiveFrom: string;
  lstRunsToReprocess: TdsRunRef[];
};

export type TdsImportStatus = {
  intPayrollRunID: number;
  strTdsMode: TdsMode;
  strTdsModeLabel: string;
  blnImportEnabled: boolean;
  strImportDisabledReason: string | null;
  intEmployeesWithClientTds: number;
  objLastImport: {
    strFileName: string | null;
    dtImportedOn: string | null;
    intImportedRowCount: number;
    decTotalTdsAmount: string;
  } | null;
};

export type TdsImportPreviewRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  decTdsAmount: string | null;
  decSystemTds: string | null;
  decDifference: string | null;
  decCurrentTds: string | null;
  strRemarks: string | null;
  blnValid: boolean;
  strErrorMessage: string | null;
};

export type TdsImportPreviewResult = {
  lstRows: TdsImportPreviewRow[];
  intTotalRows: number;
  intValidRows: number;
  intErrorRows: number;
  intRunEmployeeCount: number;
  intEmployeesWithoutClientTds: number;
  lstRemovedEmployees: Array<{ intEmployeeID: number; strEmployeeCode: string; strEmployeeName: string }>;
  strTdsComponentCode: string;
  strRunStatus: string;
  strFileChecksum: string;
};

export type TdsImportCommitResult = {
  intImportBatchID: number;
  intCreated: number;
  intUpdated: number;
  intRemoved: number;
  intSkipped: number;
  lstFailures: Array<{ strEmployeeCode: string | null; strError: string | null }>;
  decTotalTdsAmount: string;
  blnReprocessRequired: boolean;
};

const TDS_MODE_VIEW = "PAYROLL_TDS_MODE_VIEW";
const TDS_MODE_EDIT = "PAYROLL_TDS_MODE_UPDATE";
const TDS_IMPORT_VIEW = "PAYROLL_EMPLOYEE_PAYROLL_INPUT_VIEW";
const TDS_IMPORT = "PAYROLL_EMPLOYEE_PAYROLL_INPUT_TDS_IMPORT";
const strInputImportPath = "/payroll/employee-payroll-inputs/tds-import";

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

export const tdsService = {
  async getModeOverview(): Promise<TdsModeOverview> {
    const objResult = await requestApi<TdsModeOverview>({
      strPath: "/payroll/tds-mode",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: TDS_MODE_VIEW,
    });
    return objResult.Data;
  },

  async getSwitchPreview(strMode: TdsMode, dtEffectiveMonth: string): Promise<TdsModeSwitchPreview> {
    const objParams = new URLSearchParams({ strMode, dtEffectiveMonth });
    const objResult = await requestApi<TdsModeSwitchPreview>({
      strPath: `/payroll/tds-mode/switch-preview?${objParams.toString()}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: TDS_MODE_VIEW,
    });
    return objResult.Data;
  },

  async saveModeVersion(strMode: TdsMode, dtEffectiveMonth: string, strReason: string): Promise<TdsModeSaveResult> {
    const objResult = await requestApi<TdsModeSaveResult>({
      strPath: "/payroll/tds-mode",
      strMethod: ApiRequestMethod.Post,
      objBody: { strMode, dtEffectiveMonth, strReason },
      strMenuAction: TDS_MODE_EDIT,
    });
    return objResult.Data;
  },

  async getImportStatus(intPayrollRunID: number): Promise<TdsImportStatus> {
    const objResult = await requestApi<TdsImportStatus>({
      strPath: `${strInputImportPath}/status?intPayrollRunID=${intPayrollRunID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: TDS_IMPORT_VIEW,
    });
    return objResult.Data;
  },

  async downloadImportTemplate(intPayrollRunID: number): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strInputImportPath}/template?intPayrollRunID=${intPayrollRunID}`,
        responseType: "blob",
        csrfMenuAction: TDS_IMPORT,
      } as ApiRequestConfig);
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = `tds_import_run_${intPayrollRunID}.xlsx`;
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async previewImport(intPayrollRunID: number, objFile: File): Promise<TdsImportPreviewResult> {
    const objFormData = new FormData();
    objFormData.append("intPayrollRunID", String(intPayrollRunID));
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: TdsImportPreviewResult }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}${strInputImportPath}/preview`,
        data: objFormData,
        csrfMenuAction: TDS_IMPORT,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<TdsImportPreviewResult>(objError);
    }
  },

  async commitImport(objPayload: {
    intPayrollRunID: number;
    strFileName: string | null;
    strFileChecksum: string | null;
    lstRows: Array<{ intExcelRowNumber: number; strEmployeeCode: string; decTdsAmount: number; strRemarks: string | null }>;
  }): Promise<TdsImportCommitResult> {
    const objResult = await requestApi<TdsImportCommitResult>({
      strPath: `${strInputImportPath}/commit`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: TDS_IMPORT,
    });
    return objResult.Data;
  },
};
