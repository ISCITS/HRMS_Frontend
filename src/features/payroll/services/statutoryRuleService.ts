import axios from "axios";

import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type {
  StatutoryRuleApiRecord,
  StatutoryRuleDetailRecord,
  StatutoryRuleFormValues,
  StatutoryRuleListRecord,
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

function mapApiRecord(dicRecord: StatutoryRuleApiRecord): StatutoryRuleDetailRecord {
  return {
    ...dicRecord,
  };
}

function toPayload(dicValues: StatutoryRuleFormValues) {
  const strRuleConfig = dicValues.strRuleConfig.trim();
  return {
    strRuleCode: dicValues.strRuleCode.trim(),
    strScopeType: dicValues.strScopeType,
    dtEffectiveFrom: dicValues.dtEffectiveFrom,
    decRuleValue: dicValues.strRuleValue.trim() ? Number(dicValues.strRuleValue) : null,
    objRuleConfig: strRuleConfig ? JSON.parse(strRuleConfig) : null,
    blnIsActive: dicValues.blnIsActive,
  };
}

export function createInitialStatutoryRuleForm(): StatutoryRuleFormValues {
  return {
    strRuleCode: "",
    strScopeType: "tenant",
    dtEffectiveFrom: new Date().toISOString().slice(0, 10),
    strRuleValue: "",
    strRuleConfig: "",
    blnIsActive: true,
  };
}

export function toStatutoryRuleFormValues(dicRecord: StatutoryRuleDetailRecord): StatutoryRuleFormValues {
  return {
    strRuleCode: dicRecord.strRuleCode,
    strScopeType: dicRecord.strScopeType,
    dtEffectiveFrom: dicRecord.dtEffectiveFrom,
    strRuleValue: dicRecord.decRuleValue?.toString() ?? "",
    strRuleConfig: dicRecord.objRuleConfig ? JSON.stringify(dicRecord.objRuleConfig, null, 2) : "",
    blnIsActive: dicRecord.blnIsActive,
  };
}

export const statutoryRuleService = {
  async getStatutoryRules(objFilters?: {
    strSearchCode?: string;
    strScopeType?: string;
    strStatus?: string;
  }): Promise<StatutoryRuleListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchCode?.trim()) {
      objParams.set("strSearchCode", objFilters.strSearchCode.trim());
    }
    if (objFilters?.strScopeType?.trim() && objFilters.strScopeType !== "all") {
      objParams.set("strScopeType", objFilters.strScopeType.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<StatutoryRuleApiRecord[]>({
      strPath: `/payroll/statutory-rules${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_STATUTORY_RULE_LIST",
    });
    return objResult.Data.map(mapApiRecord);
  },

  async getStatutoryRuleById(intRuleID: number): Promise<StatutoryRuleDetailRecord> {
    const objResult = await requestApi<StatutoryRuleApiRecord>({
      strPath: `/payroll/statutory-rules/${intRuleID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_STATUTORY_RULE_VIEW",
    });
    return mapApiRecord(objResult.Data);
  },

  async createStatutoryRule(dicValues: StatutoryRuleFormValues): Promise<StatutoryRuleDetailRecord> {
    const objResult = await requestApi<StatutoryRuleApiRecord>({
      strPath: "/payroll/statutory-rules",
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_STATUTORY_RULE_CREATE",
    });
    return mapApiRecord(objResult.Data);
  },

  async updateStatutoryRule(intRuleID: number, dicValues: StatutoryRuleFormValues): Promise<StatutoryRuleDetailRecord> {
    const objResult = await requestApi<StatutoryRuleApiRecord>({
      strPath: `/payroll/statutory-rules/${intRuleID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_STATUTORY_RULE_UPDATE",
    });
    return mapApiRecord(objResult.Data);
  },
};
