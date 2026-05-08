import axios from "axios";

import { ApiDefaultMessage, ApiRequestMethod, ApiResultCode } from "@/Common/enums/AppEnums";
import { authHelpers } from "@/lib/auth";
import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";

export type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
  RequestId?: string;
};

type ApiPayloadResponse<TData> = ApiEnvelope<TData> | { payload: string };
type ApiErrorResponse<TData> = ApiEnvelope<TData> | { payload?: string; Msg?: string; message?: string; RequestId?: string };

function buildRequestIdAwareMessage(strMessage: unknown, strRequestId?: string) {
  const strResolvedMessage = typeof strMessage === "string"
    ? (strMessage.trim() || ApiDefaultMessage.RequestFailed)
    : ApiDefaultMessage.RequestFailed;
  if (!strRequestId?.trim()) {
    return strResolvedMessage;
  }

  if (strResolvedMessage.toLowerCase().includes("x-request-id")) {
    return strResolvedMessage;
  }

  return `${strResolvedMessage} Kindly refer the X-Request-Id ${strRequestId.trim()}`;
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
  const objPayload = "payload" in objRawPayload
    ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
    : objRawPayload;

  if (objPayload.ResultCode !== ApiResultCode.Success) {
    throw new ApiRequestError(
      objPayload.Msg ?? ApiDefaultMessage.RequestFailed,
      objPayload.Data,
      undefined,
      objPayload.RequestId,
    );
  }

  return objPayload;
}

export async function createApiRequestError<TData>(
  objError: unknown,
  strFallbackMessage = ApiDefaultMessage.RequestFailed,
): Promise<ApiRequestError> {
  if (axios.isAxiosError(objError)) {
    const objResponseData = objError.response?.data as ApiErrorResponse<TData> | undefined;
    const strRequestId = objResponseData?.RequestId ?? objError.response?.headers?.["x-request-id"];

    if (objResponseData?.payload) {
      const objDecryptedPayload = await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
      return new ApiRequestError(
        objDecryptedPayload.Msg ?? strFallbackMessage,
        objDecryptedPayload.Data,
        objError.response?.status,
        objDecryptedPayload.RequestId ?? strRequestId,
      );
    }

    return new ApiRequestError(
      objResponseData?.Msg ?? objResponseData?.message ?? objError.message ?? strFallbackMessage,
      undefined,
      objError.response?.status,
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

export function resolveErrorMessage(objError: unknown, strFallbackMessage = ApiDefaultMessage.RequestFailed) {
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
    const objResponse = await axiosInstance.request<ApiPayloadResponse<TData>>({
      method: objOptions.strMethod,
      url: objOptions.strPath,
      data: objOptions.objBody,
      params: objOptions.objQueryParams,
      csrfMenuAction: objOptions.strMenuAction,
      headers: objHeaders,
    });

    return unwrapApiPayload(objResponse.data);
  } catch (objError) {
    throw await createApiRequestError<TData>(objError);
  }
}
