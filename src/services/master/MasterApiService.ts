"use client";

import axios from "axios";

import { authHelpers } from "@/lib/auth";
import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

export type DepartmentApiRecord = {
  intID: number;
  strDepartmentCode: string;
  strDepartmentName: string;
  strManagerName?: string | null;
  blnIsActive: boolean;
  intCompanyID: number;
  intTenantID: number;
};

export type DesignationApiRecord = {
  intID: number;
  strDesignationCode: string;
  strDesignationName: string;
  blnIsActive: boolean;
  intTenantID: number;
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  const strAccessToken = authHelpers.getAccessToken();
  const objHeaders: Record<string, string> = {};

  if (strAccessToken) {
    objHeaders.Authorization = `Bearer ${strAccessToken}`;
  }

  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `api/v1${objOptions.strPath}`,
      data: objOptions.objBody,
      csrfMenuAction: objOptions.strMenuAction,
      headers: objHeaders
    });

    const objRawPayload = objResponse.data as ApiEnvelope<TData> | { payload: string };
    const objPayload = "payload" in objRawPayload
      ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
      : objRawPayload;

    if (objPayload.ResultCode !== 1) {
      throw new Error(objPayload.Msg ?? "Request failed.");
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as ApiEnvelope<TData> | { payload?: string; Msg?: string } | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }
      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
    }

    throw objError;
  }
}

export const masterApiService = {
  getDepartments() {
    return requestApi<DepartmentApiRecord[]>({
      strPath: "/masters/departments",
      strMethod: "GET",
      strMenuAction: "MASTER_DEPARTMENT_LIST"
    });
  },

  createDepartment(objBody: { strDepartmentCode: string; strDepartmentName: string; strManagerName: string; blnIsActive: boolean }) {
    return requestApi<DepartmentApiRecord>({
      strPath: "/masters/departments",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_DEPARTMENT_CREATE"
    });
  },

  updateDepartment(intID: number, objBody: { strDepartmentCode: string; strDepartmentName: string; strManagerName: string; blnIsActive: boolean }) {
    return requestApi<DepartmentApiRecord>({
      strPath: `/masters/departments/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_DEPARTMENT_UPDATE"
    });
  },

  bulkDepartmentStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/departments/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_DEPARTMENT_BULK_STATUS"
    });
  },

  bulkDepartmentDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/departments/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_DEPARTMENT_BULK_DELETE"
    });
  },

  getDesignations() {
    return requestApi<DesignationApiRecord[]>({
      strPath: "/masters/designations",
      strMethod: "GET",
      strMenuAction: "MASTER_DESIGNATION_LIST"
    });
  },

  createDesignation(objBody: { strDesignationCode: string; strDesignationName: string; blnIsActive: boolean }) {
    return requestApi<DesignationApiRecord>({
      strPath: "/masters/designations",
      strMethod: "POST",
      objBody,
      strMenuAction: "MASTER_DESIGNATION_CREATE"
    });
  },

  updateDesignation(intID: number, objBody: { strDesignationCode: string; strDesignationName: string; blnIsActive: boolean }) {
    return requestApi<DesignationApiRecord>({
      strPath: `/masters/designations/${intID}`,
      strMethod: "PUT",
      objBody,
      strMenuAction: "MASTER_DESIGNATION_UPDATE"
    });
  },

  bulkDesignationStatus(lstIDs: number[], blnIsActive: boolean) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/designations/bulk-status",
      strMethod: "POST",
      objBody: { lstIDs, blnIsActive },
      strMenuAction: "MASTER_DESIGNATION_BULK_STATUS"
    });
  },

  bulkDesignationDelete(lstIDs: number[]) {
    return requestApi<{ blnSuccess: boolean }>({
      strPath: "/masters/designations/bulk-delete",
      strMethod: "POST",
      objBody: { lstIDs },
      strMenuAction: "MASTER_DESIGNATION_BULK_DELETE"
    });
  }
};
