import axios from "axios";

import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type {
  PayrollRunDetailRecord,
  PayrollRunFormValues,
  PayrollRunListRecord,
  PayrollRunStatus,
} from "@/features/payroll/types";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `api/v1${objOptions.strPath}`,
      data: objOptions.objBody,
      csrfMenuAction: objOptions.strMenuAction,
    });

    const objRawPayload = objResponse.data as ApiEnvelope<TData> | { payload: string };
    const objPayload =
      "payload" in objRawPayload
        ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
        : objRawPayload;

    if (objPayload.ResultCode !== 1) {
      throw new Error(objPayload.Msg ?? "Request failed.");
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as
        | ApiEnvelope<TData>
        | { payload?: string; Msg?: string }
        | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload =
          await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }
      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
    }

    throw objError;
  }
}

export function createInitialPayrollRunForm(): PayrollRunFormValues {
  return {
    strRunCode: "",
    strRunName: "",
    dtPayrollMonth: new Date().toISOString().slice(0, 10),
    strRunStatus: "Open",
    blnIsLocked: false,
  };
}

function toPayload(dicValues: PayrollRunFormValues) {
  return {
    strRunCode: dicValues.strRunCode.trim(),
    strRunName: dicValues.strRunName.trim(),
    dtPayrollMonth: dicValues.dtPayrollMonth,
    strRunStatus: dicValues.strRunStatus,
    blnIsLocked: dicValues.blnIsLocked,
  };
}

export const payrollRunService = {
  async getPayrollRuns(objFilters?: {
    strSearch?: string;
    strStatus?: string;
  }): Promise<PayrollRunListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearch?.trim()) {
      objParams.set("strSearch", objFilters.strSearch.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<PayrollRunListRecord[]>({
      strPath: `/payroll/runs${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RUN_LIST",
    });
    return objResult.Data;
  },

  async getPayrollRunById(intRunID: number): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${intRunID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RUN_VIEW",
    });
    return objResult.Data;
  },

  async createPayrollRun(
    dicValues: PayrollRunFormValues
  ): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: "/payroll/runs",
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_RUN_CREATE",
    });
    return objResult.Data;
  },

  async updatePayrollRunStatus(
    intRunID: number,
    strRunStatus: PayrollRunStatus,
    blnIsLocked: boolean
  ): Promise<PayrollRunDetailRecord> {
    const objResult = await requestApi<PayrollRunDetailRecord>({
      strPath: `/payroll/runs/${intRunID}/status`,
      strMethod: "PUT",
      objBody: { strRunStatus, blnIsLocked },
      strMenuAction: "PAYROLL_RUN_UPDATE_STATUS",
    });
    return objResult.Data;
  },
};
