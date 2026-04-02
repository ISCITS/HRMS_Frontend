import axios from "axios";

import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type {
  PayrollResultDetailRecord,
  PayrollResultListRecord,
} from "@/features/payroll/types";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET";
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `api/v1${objOptions.strPath}`,
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

export const payrollResultService = {
  async getPayrollResults(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
  }): Promise<PayrollResultListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<PayrollResultListRecord[]>({
      strPath: `/payroll/results${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_LIST",
    });
    return objResult.Data;
  },

  async getPayrollResultById(
    intResultID: number
  ): Promise<PayrollResultDetailRecord> {
    const objResult = await requestApi<PayrollResultDetailRecord>({
      strPath: `/payroll/results/${intResultID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_RESULT_VIEW",
    });
    return objResult.Data;
  },
};
