import axios from "axios";

import { ApiDefaultMessage, ApiRequestMethod, ApiResultCode } from "@/Common/enums/AppEnums";
import { authHelpers } from "@/lib/auth";
import { axiosInstance, ApiRequestConfig } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";

export type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
  RequestId?: string;
};

type ApiPayloadResponse<TData> = ApiEnvelope<TData> | { payload: string };

function isObjectRecord(objValue: unknown): objValue is Record<string, unknown> {
  return typeof objValue === "object" && objValue !== null;
}

function getHttpFallbackMessage(intStatusCode?: number) {
  if (intStatusCode === 502 || intStatusCode === 503 || intStatusCode === 504) {
    return "The service is temporarily unavailable. Please try again shortly.";
  }
  return ApiDefaultMessage.RequestFailed;
}

function buildRequestIdAwareMessage(strMessage: unknown, strRequestId?: string) {
  const strNormalizedMessage = typeof strMessage === "string" ? strMessage.trim() : "";
  const strResolvedMessage = typeof strMessage === "string"
    ? (strNormalizedMessage && strNormalizedMessage !== "[]" ? strNormalizedMessage : ApiDefaultMessage.RequestFailed)
    : ApiDefaultMessage.RequestFailed;
  // The X-Request-Id is still captured on ApiRequestError.strRequestId for diagnostics/logs, but it
  // is intentionally NOT appended to the user-facing message.
  void strRequestId;
  return strResolvedMessage;
}

export class ApiRequestError extends Error {
  objData?: unknown;
  intStatusCode?: number;
  strRequestId?: string;

  constructor(strMessage: unknown, objData?: unknown, intStatusCode?: number, strRequestId?: string) {
    super(buildRequestIdAwareMessage(strMessage, strRequestId));
    this.name = "ApiRequestError";
    this.objData = objData;
    this.intStatusCode = intStatusCode;
    this.strRequestId = strRequestId;
  }
}

type RequestEncryptedApiOptions = {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
  blnUseAuthHeader?: boolean;
};

type RunFrontendActionOptions<TResult> = {
  fnAction: () => Promise<TResult>;
  fnOnSuccess?: (objResult: TResult) => void | Promise<void>;
  fnOnError?: (objError: ApiRequestError) => void | Promise<void>;
  fnFinally?: () => void | Promise<void>;
  strFallbackMessage?: string;
};

async function unwrapApiPayload<TData>(objRawPayload: ApiPayloadResponse<TData>) {
  if (!isObjectRecord(objRawPayload)) {
    throw new ApiRequestError("The server returned an invalid response. Please try again shortly.");
  }

  const objPayload = "payload" in objRawPayload && typeof objRawPayload.payload === "string"
    ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
    : objRawPayload;

  if (!isObjectRecord(objPayload)) {
    throw new ApiRequestError("The server returned an invalid response. Please try again shortly.");
  }
  if (!("ResultCode" in objPayload) || !("Msg" in objPayload) || !("Data" in objPayload)) {
    throw new ApiRequestError("The server returned an invalid response. Please try again shortly.");
  }
  const dicPayload = objPayload as ApiEnvelope<TData>;

  if (dicPayload.ResultCode !== ApiResultCode.Success) {
    throw new ApiRequestError(
      dicPayload.Msg ?? ApiDefaultMessage.RequestFailed,
      dicPayload.Data,
      undefined,
      dicPayload.RequestId,
    );
  }

  return dicPayload;
}

export async function createApiRequestError<TData>(
  objError: unknown,
  strFallbackMessage: string = ApiDefaultMessage.RequestFailed,
): Promise<ApiRequestError> {
  if (axios.isAxiosError(objError)) {
    const objResponseData = objError.response?.data as unknown;
    const intStatusCode = objError.response?.status;
    const strHttpFallbackMessage = getHttpFallbackMessage(intStatusCode);
    const strRequestId = isObjectRecord(objResponseData) && typeof objResponseData.RequestId === "string"
      ? objResponseData.RequestId
      : objError.response?.headers?.["x-request-id"];

    if (isObjectRecord(objResponseData) && typeof objResponseData.payload === "string" && objResponseData.payload) {
      try {
        const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        const strPayloadMessage = typeof objDecryptedPayload.Msg === "string" && objDecryptedPayload.Msg.trim() !== "[]"
          ? objDecryptedPayload.Msg
          : strFallbackMessage;
        return new ApiRequestError(
          strPayloadMessage,
          objDecryptedPayload.Data,
          intStatusCode,
          objDecryptedPayload.RequestId ?? strRequestId,
        );
      } catch {
        return new ApiRequestError(
          (typeof objResponseData.Msg === "string" ? objResponseData.Msg : undefined) ?? objError.message ?? strHttpFallbackMessage,
          undefined,
          intStatusCode,
          strRequestId,
        );
      }
    }

    return new ApiRequestError(
      (isObjectRecord(objResponseData) && typeof objResponseData.Msg === "string" ? objResponseData.Msg : undefined) ??
        (isObjectRecord(objResponseData) && typeof objResponseData.message === "string" ? objResponseData.message : undefined) ??
        (intStatusCode && intStatusCode >= 500 ? strHttpFallbackMessage : objError.message) ??
        strFallbackMessage,
      undefined,
      intStatusCode,
      strRequestId,
    );
  }

  if (objError instanceof ApiRequestError) {
    return objError;
  }

  if (objError instanceof Error) {
    return new ApiRequestError(objError.message || strFallbackMessage);
  }

  return new ApiRequestError(strFallbackMessage);
}

export function resolveErrorMessage(objError: unknown, strFallbackMessage: string = ApiDefaultMessage.RequestFailed) {
  if (objError instanceof Error && objError.message.trim()) {
    return objError.message;
  }

  return strFallbackMessage;
}

export async function runFrontendAction<TResult>(objOptions: RunFrontendActionOptions<TResult>) {
  try {
    const objResult = await objOptions.fnAction();
    await objOptions.fnOnSuccess?.(objResult);
    return objResult;
  } catch (objError) {
    const objHandledError = await createApiRequestError(objError, objOptions.strFallbackMessage);
    await objOptions.fnOnError?.(objHandledError);
    return null;
  } finally {
    await objOptions.fnFinally?.();
  }
}

export async function requestEncryptedApi<TData>(objOptions: RequestEncryptedApiOptions): Promise<ApiEnvelope<TData>> {
  const objHeaders: Record<string, string> = {};

  if (objOptions.blnUseAuthHeader) {
    const strAccessToken = authHelpers.getAccessToken();
    if (!strAccessToken) {
      throw new ApiRequestError(ApiDefaultMessage.Unauthorized);
    }

    objHeaders.Authorization = `Bearer ${strAccessToken}`;
  }

  try {
    const objResponse = await axiosInstance.request<ApiPayloadResponse<TData>>(
      {
        method: objOptions.strMethod,
        url: objOptions.strPath,
        data: objOptions.objBody,
        params: objOptions.objQueryParams,
        csrfMenuAction: objOptions.strMenuAction,
        headers: objHeaders,
      } as ApiRequestConfig
    );

    return unwrapApiPayload(objResponse.data);
  } catch (objError) {
    throw await createApiRequestError<TData>(objError);
  }
}
