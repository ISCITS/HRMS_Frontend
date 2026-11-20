"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

const ARREAR_IMPORT = "PAYROLL_RUN_ARREAR_IMPORT";

export type ArrearImportBatch = {
  intBatchID: number;
  strFileName: string | null;
  strStatus: "COMMITTED" | "REPLACED" | "UNDONE" | string;
  intCreatedLineCount: number;
  intEmployeeCount: number;
  decTotalArrearAmount: number;
  decTotalRecoveryAmount: number;
  dtAddedOn: string | null;
};

export type ArrearImportStatus = {
  blnImportEnabled: boolean;
  strDisabledReason: string | null;
  strImportMode: "REPLACE_BATCH" | "APPEND";
  strImportStatutory: "CALCULATE" | "FROM_FILE" | "CURRENT_MONTH";
  lstBatches: ArrearImportBatch[];
};

export type ArrearImportPreviewRow = {
  strSheet: string;
  intExcelRowNumber: number;
  strEmployeeCode: string;
  strEmployeeName: string | null;
  strComponentCode: string;
  strRawMonth: string;
  dtForMonth: string | null;
  decAmount: number | null;
  decPfEmployee: number | null;
  decEsiEmployee: number | null;
  strRemarks: string | null;
  strStatus: "OK" | "Warning" | "Error";
  lstMessages: string[];
};

export type ArrearImportPreview = {
  strFileChecksum: string;
  blnSameFileImported: boolean;
  lstRows: ArrearImportPreviewRow[];
  intRowCount: number;
  intValidRowCount: number;
  intErrorRowCount: number;
  intEmployeeCount: number;
  decArrearTotal: number;
  decRecoveryTotal: number;
  strImportStatutory: string;
  strImportMode: string;
};

export type ArrearImportCommitResult = {
  intBatchID: number;
  intCreatedLineCount: number;
  intSkippedRowCount: number;
  lstEmployeeIDs: number[];
  strMessage: string;
};

function basePath(strRunID: string) {
  return `/payroll/runs/${strRunID}/arrear-import`;
}

async function postFile<TData>(strRunID: string, strAction: "preview" | "commit", objFile: File): Promise<TData> {
  const objFormData = new FormData();
  objFormData.append("objFile", objFile);
  try {
    const objResponse = await axiosInstance.request<{ Data: TData }>({
      method: ApiRequestMethod.Post,
      url: `${ApiRoutePrefix.ApiV1}${basePath(strRunID)}/${strAction}`,
      data: objFormData,
      csrfMenuAction: ARREAR_IMPORT,
    } as ApiRequestConfig);
    return objResponse.data.Data;
  } catch (objError) {
    throw await createApiRequestError<TData>(objError);
  }
}

export const arrearImportService = {
  async getStatus(strRunID: string): Promise<ArrearImportStatus> {
    const objResult = await requestEncryptedApi<ArrearImportStatus>({
      strPath: `${ApiRoutePrefix.ApiV1}${basePath(strRunID)}/status`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "PAYROLL_RUN_VIEW",
      blnUseAuthHeader: true,
    });
    return objResult.Data as ArrearImportStatus;
  },

  async downloadTemplate(strRunID: string): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${basePath(strRunID)}/template`,
        responseType: "blob",
        csrfMenuAction: ARREAR_IMPORT,
      } as ApiRequestConfig);
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = `arrear_import_${strRunID}.xlsx`;
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  preview(strRunID: string, objFile: File): Promise<ArrearImportPreview> {
    return postFile<ArrearImportPreview>(strRunID, "preview", objFile);
  },

  commit(strRunID: string, objFile: File): Promise<ArrearImportCommitResult> {
    return postFile<ArrearImportCommitResult>(strRunID, "commit", objFile);
  },

  async undo(strRunID: string, intBatchID: number): Promise<{ lstEmployeeIDs: number[] }> {
    const objResult = await requestEncryptedApi<{ lstEmployeeIDs: number[] }>({
      strPath: `${ApiRoutePrefix.ApiV1}${basePath(strRunID)}/batches/${intBatchID}`,
      strMethod: ApiRequestMethod.Delete,
      strMenuAction: ARREAR_IMPORT,
      blnUseAuthHeader: true,
    });
    return objResult.Data as { lstEmployeeIDs: number[] };
  },
};
