import { appConfig } from "@/config";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { decryptPayload } from "@/lib/security/decryptPayload";

type RequestInitWithJson = RequestInit & {
  objJsonBody?: unknown;
};

export async function callBackendApi<TResponse>(
  strPath: string,
  objInit: RequestInitWithJson = {}
): Promise<TResponse> {
  const strApiBaseUrl =
    typeof window === "undefined"
      ? process.env.BACKEND_API_BASE_URL?.trim() || appConfig.apiBaseUrl
      : appConfig.apiBaseUrl;

  if (!strApiBaseUrl) {
    throw new Error("BACKEND_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const { objJsonBody, headers, ...objRest } = objInit;
  const strUrl = `${strApiBaseUrl.replace(/\/$/, "")}${strPath.startsWith("/") ? strPath : `/${strPath}`}`;
  const objResponse = await fetch(strUrl, {
    ...objRest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(headers ?? {})
    },
    body: objJsonBody !== undefined ? JSON.stringify(objJsonBody) : objRest.body
  });

  const objRawPayload = (await objResponse.json().catch(() => ({}))) as
    | (TResponse & {
        Msg?: string;
        message?: string;
        Data?: unknown;
        RequestId?: string;
      })
    | { payload?: string };

  const objPayload = "payload" in objRawPayload && typeof objRawPayload.payload === "string"
    ? await decryptPayload<
        TResponse & {
          Msg?: string;
          message?: string;
          Data?: unknown;
          RequestId?: string;
        }
      >(objRawPayload.payload)
    : objRawPayload as TResponse & {
    Msg?: string;
    message?: string;
    Data?: unknown;
    RequestId?: string;
  };
  if (!objResponse.ok) {
    const strMessage = objPayload.Msg ?? objPayload.message ?? "Request failed.";
    throw new ApiRequestError(
      strMessage,
      objPayload.Data,
      objResponse.status,
      objPayload.RequestId ?? objResponse.headers.get("x-request-id") ?? undefined,
    );
  }
  return objPayload;
}
