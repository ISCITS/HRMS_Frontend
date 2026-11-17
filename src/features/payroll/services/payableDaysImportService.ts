"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

export type PayableDaysImportStatus = {
  intPayrollRunID: number;
  blnImportEnabled: boolean;
  strImportDisabledReason: string | null;
  intEmployeesWithImportedDays: number;
  dtLastImportedOn: string | null;
};

export type PayableDaysImportPreviewRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  decCalendarDays: string | null;
  decWorkingDays: string | null;
  decPayableDays: string | null;
  decLwpDays: string | null;
  decLopDays: string | null;
  decPaidDays: string | null;
  decPresentDays: string | null;
  decWeeklyOffDays: string | null;
  decPaidLeaveDays: string | null;
  decHolidayDays: string | null;
  decHoursWorked: string | null;
  decProrateFactor: string | null;
  intPayrollYear: number | null;
  intPayrollMonth: number | null;
  strPayrollMonth: string | null;
  decCurrentPayableDays: string | null;
  strCurrentSource: string | null;
  strRemarks: string | null;
  blnValid: boolean;
  strErrorMessage: string | null;
  lstWarnings: string[];
};

export type PayableDaysImportPreviewResult = {
  lstRows: PayableDaysImportPreviewRow[];
  intTotalRows: number;
  intValidRows: number;
  intErrorRows: number;
  intWarningRows: number;
  intRunEmployeeCount: number;
  intEmployeesNotInSheet: number;
  decMonthCalendarDays: string;
  strPayrollMonth: string;
  strRunStatus: string;
  strFileChecksum: string;
};

export type PayableDaysImportCommitRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  decCalendarDays: number | null;
  decWorkingDays: number | null;
  decPayableDays: number;
  decLwpDays: number | null;
  decLopDays: number | null;
  decPaidDays: number | null;
  decPresentDays: number | null;
  decWeeklyOffDays: number | null;
  decPaidLeaveDays: number | null;
  decHolidayDays: number | null;
  decHoursWorked: number | null;
  decProrateFactor: number | null;
  intPayrollYear: number | null;
  intPayrollMonth: number | null;
  strRemarks: string | null;
};

export type PayableDaysImportCommitResult = {
  intCreated: number;
  intUpdated: number;
  intSkipped: number;
  lstFailures: Array<{ strEmployeeCode: string | null; strError: string | null }>;
  decTotalPayableDays: string;
  blnReprocessRequired: boolean;
};

const PAYABLE_DAYS_IMPORT_VIEW = "PAYROLL_EMPLOYEE_PAYROLL_INPUT_VIEW";
const PAYABLE_DAYS_IMPORT = "PAYROLL_EMPLOYEE_PAYROLL_INPUT_PAYABLE_DAYS_IMPORT";
const strImportPath = "/payroll/employee-payroll-inputs/payable-days-import";

export const payableDaysImportService = {
  async getImportStatus(intPayrollRunID: number): Promise<PayableDaysImportStatus> {
    const objResult = await requestEncryptedApi<PayableDaysImportStatus>({
      strPath: `${ApiRoutePrefix.ApiV1}${strImportPath}/status?intPayrollRunID=${intPayrollRunID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: PAYABLE_DAYS_IMPORT_VIEW,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },

  async downloadImportTemplate(intPayrollRunID: number): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strImportPath}/template?intPayrollRunID=${intPayrollRunID}`,
        responseType: "blob",
        csrfMenuAction: PAYABLE_DAYS_IMPORT,
      } as ApiRequestConfig);
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = `payable_days_import_run_${intPayrollRunID}.xlsx`;
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async previewImport(intPayrollRunID: number, objFile: File): Promise<PayableDaysImportPreviewResult> {
    const objFormData = new FormData();
    objFormData.append("intPayrollRunID", String(intPayrollRunID));
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: PayableDaysImportPreviewResult }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}${strImportPath}/preview`,
        data: objFormData,
        csrfMenuAction: PAYABLE_DAYS_IMPORT,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<PayableDaysImportPreviewResult>(objError);
    }
  },

  async commitImport(objPayload: {
    intPayrollRunID: number;
    strFileName: string | null;
    strFileChecksum: string | null;
    lstRows: PayableDaysImportCommitRow[];
  }): Promise<PayableDaysImportCommitResult> {
    const objResult = await requestEncryptedApi<PayableDaysImportCommitResult>({
      strPath: `${ApiRoutePrefix.ApiV1}${strImportPath}/commit`,
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: PAYABLE_DAYS_IMPORT,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },
};
