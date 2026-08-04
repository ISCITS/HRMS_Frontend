"use client";

// Thin wrapper over the centralized backend file service (`/api/v1/files/...`).
// Per the backend contract (app/api/v1/FileRoutes.py), the generic upload/replace endpoints are
// only usable for the ESS self-service modules BANK, LOAN and PROFILE — reimbursement/it-declaration/
// leave/flexi-pay must keep calling their own existing endpoints (see those features' services).
// Mirrors reimbursementService.ts's pattern of building FormData and calling axiosInstance.request()
// directly (FormData bodies skip JSON payload-encryption automatically, see axiosInstance.ts:84-88).

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

export type EssSelfServiceFileModule = "BANK" | "LOAN" | "PROFILE";

export type FileUploadProgressHandler = (intPercentComplete: number) => void;

export type FileMetadataDto = {
  intFileID: number;
  intEmployeeID: number;
  strModule: string;
  strDocumentType: string | null;
  strRelatedEntityType: string | null;
  intRelatedEntityID: number | null;
  strFinancialYear: string | null;
  strOriginalFileName: string;
  strFileExtension: string;
  strContentType: string;
  intFileSizeBytes: number;
  strStatus: string;
  intVersionNumber: number;
  strContentUrl: string;
  dtUploadedOn: string;
  dtUpdatedOn: string;
};

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export type UploadFileRequest = {
  objFile: File;
  strModule: EssSelfServiceFileModule;
  strDocumentType?: string;
  intRelatedEntityID?: number | null;
  strRelatedEntityType?: string;
  strFinancialYear?: string;
  fnOnProgress?: FileUploadProgressHandler;
};

export type ListFilesFilter = {
  strModule?: EssSelfServiceFileModule;
  intRelatedEntityID?: number | null;
  strRelatedEntityType?: string;
};

const strFilesBasePath = `${ApiRoutePrefix.ApiV1}/files`;

function toProgressPercent(objProgressEvent: { loaded: number; total?: number }): number {
  if (!objProgressEvent.total) {
    return 0;
  }
  return Math.min(100, Math.round((objProgressEvent.loaded * 100) / objProgressEvent.total));
}

function unwrapEnvelope<TData>(objRawData: ApiEnvelope<TData> | TData): TData {
  if (objRawData && typeof objRawData === "object" && "Data" in (objRawData as Record<string, unknown>)) {
    return (objRawData as ApiEnvelope<TData>).Data;
  }
  return objRawData as TData;
}

function buildUploadFormData(objRequest: Pick<UploadFileRequest, "objFile" | "strModule" | "strDocumentType" | "intRelatedEntityID" | "strRelatedEntityType" | "strFinancialYear">): FormData {
  const objFormData = new FormData();
  // Field name must be "objFile" -- matches the FastAPI parameter name in
  // app/api/v1/FileRoutes.py's uploadFile()/replaceFile() (`objFile: UploadFile
  // = File(...)`, no alias given).
  objFormData.append("objFile", objRequest.objFile);
  objFormData.append("module", objRequest.strModule);
  if (objRequest.strDocumentType) {
    objFormData.append("documentType", objRequest.strDocumentType);
  }
  if (objRequest.intRelatedEntityID != null) {
    objFormData.append("relatedEntityId", String(objRequest.intRelatedEntityID));
  }
  if (objRequest.strRelatedEntityType) {
    objFormData.append("relatedEntityType", objRequest.strRelatedEntityType);
  }
  if (objRequest.strFinancialYear) {
    objFormData.append("financialYear", objRequest.strFinancialYear);
  }
  return objFormData;
}

export const fileUploadService = {
  async uploadFile(objRequest: UploadFileRequest): Promise<FileMetadataDto> {
    const objFormData = buildUploadFormData(objRequest);
    try {
      const objResponse = await axiosInstance.request<ApiEnvelope<FileMetadataDto> | FileMetadataDto>({
        method: ApiRequestMethod.Post,
        url: `${strFilesBasePath}/upload`,
        data: objFormData,
        csrfMenuAction: `ESS_${objRequest.strModule}_UPLOAD`,
        onUploadProgress: objRequest.fnOnProgress
          ? (objProgressEvent) => objRequest.fnOnProgress?.(toProgressPercent(objProgressEvent))
          : undefined,
      } as ApiRequestConfig);
      return unwrapEnvelope(objResponse.data);
    } catch (objError) {
      throw await createApiRequestError<FileMetadataDto>(objError);
    }
  },

  async replaceFile(intFileID: number, objFile: File, fnOnProgress?: FileUploadProgressHandler): Promise<FileMetadataDto> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<ApiEnvelope<FileMetadataDto> | FileMetadataDto>({
        method: ApiRequestMethod.Put,
        url: `${strFilesBasePath}/${intFileID}`,
        data: objFormData,
        csrfMenuAction: "ESS_FILE_REPLACE",
        onUploadProgress: fnOnProgress
          ? (objProgressEvent) => fnOnProgress(toProgressPercent(objProgressEvent))
          : undefined,
      } as ApiRequestConfig);
      return unwrapEnvelope(objResponse.data);
    } catch (objError) {
      throw await createApiRequestError<FileMetadataDto>(objError);
    }
  },

  async listFiles(objFilter?: ListFilesFilter): Promise<FileMetadataDto[]> {
    try {
      const objResponse = await axiosInstance.request<ApiEnvelope<FileMetadataDto[]> | FileMetadataDto[]>({
        method: ApiRequestMethod.Get,
        url: strFilesBasePath,
        params: {
          module: objFilter?.strModule,
          relatedEntityId: objFilter?.intRelatedEntityID ?? undefined,
          relatedEntityType: objFilter?.strRelatedEntityType,
        },
        csrfMenuAction: "ESS_FILE_LIST",
      } as ApiRequestConfig);
      return unwrapEnvelope(objResponse.data) ?? [];
    } catch (objError) {
      throw await createApiRequestError<FileMetadataDto[]>(objError);
    }
  },

  async getFileMetadata(intFileID: number): Promise<FileMetadataDto> {
    try {
      const objResponse = await axiosInstance.request<ApiEnvelope<FileMetadataDto> | FileMetadataDto>({
        method: ApiRequestMethod.Get,
        url: `${strFilesBasePath}/${intFileID}`,
        csrfMenuAction: "ESS_FILE_VIEW",
      } as ApiRequestConfig);
      return unwrapEnvelope(objResponse.data);
    } catch (objError) {
      throw await createApiRequestError<FileMetadataDto>(objError);
    }
  },

  async deleteFile(intFileID: number): Promise<void> {
    try {
      await axiosInstance.request<ApiEnvelope<null> | null>({
        method: ApiRequestMethod.Delete,
        url: `${strFilesBasePath}/${intFileID}`,
        csrfMenuAction: "ESS_FILE_DELETE",
      } as ApiRequestConfig);
    } catch (objError) {
      throw await createApiRequestError<null>(objError);
    }
  },

  // Fetches raw binary content as a Blob (auth header required, so it cannot be used directly as an
  // <img>/<a> src) — same pattern as ReimbursementProofViewer.tsx's previewProof/openBlobInNewTab.
  async fetchFileContentBlob(intFileID: number): Promise<Blob> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${strFilesBasePath}/${intFileID}/content`,
        responseType: "blob",
        csrfMenuAction: "ESS_FILE_VIEW",
      } as ApiRequestConfig);
      return objResponse.data;
    } catch (objError) {
      throw await createApiRequestError<Blob>(objError);
    }
  },

  async previewFile(intFileID: number): Promise<void> {
    const objBlob = await this.fetchFileContentBlob(intFileID);
    const strObjectUrl = URL.createObjectURL(objBlob);
    window.open(strObjectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(strObjectUrl), 30000);
  },

  async downloadFile(intFileID: number, strFileName: string): Promise<void> {
    const objBlob = await this.fetchFileContentBlob(intFileID);
    const strObjectUrl = URL.createObjectURL(objBlob);
    const objAnchor = document.createElement("a");
    objAnchor.href = strObjectUrl;
    objAnchor.download = strFileName || "document";
    document.body.appendChild(objAnchor);
    objAnchor.click();
    document.body.removeChild(objAnchor);
    URL.revokeObjectURL(strObjectUrl);
  },
};
