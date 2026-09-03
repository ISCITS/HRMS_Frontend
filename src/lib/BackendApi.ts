import { appConfig } from "@/config";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { decryptPayload } from "@/lib/security/decryptPayload";

type RequestInitWithJson = RequestInit & {
  objJsonBody?: unknown;
};

function normalizeServerApiBaseUrl(strValue: string | undefined) {
  let strBaseUrl = (strValue ?? "").trim().replace(/\/+$/g, "");
  if (!strBaseUrl) {
    return "";
  }

  if (strBaseUrl.endsWith("/api")) {
    strBaseUrl = strBaseUrl.slice(0, -"/api".length);
  }

  try {
    const objUrl = new URL(strBaseUrl);
    // Node/Windows local fetch can fail on localhost/host.docker.internal due to DNS/IPv6
    // resolution quirks even when the backend is reachable on IPv4.
    if (objUrl.hostname === "localhost" || objUrl.hostname === "host.docker.internal") {
      objUrl.hostname = "127.0.0.1";
      return objUrl.toString().replace(/\/+$/g, "");
    }
  } catch {
    // Keep the configured URL if parsing fails.
  }

  return strBaseUrl;
}

function buildServerApiBaseUrlCandidates(strValue: string | undefined) {
  const strPrimaryBaseUrl = normalizeServerApiBaseUrl(strValue);
  if (!strPrimaryBaseUrl) {
    return [];
  }

  const lstCandidates = [strPrimaryBaseUrl];
  try {
    const objUrl = new URL(strPrimaryBaseUrl);
    if (objUrl.hostname === "localhost" || objUrl.hostname === "127.0.0.1") {
      objUrl.hostname = "host.docker.internal";
      lstCandidates.push(objUrl.toString().replace(/\/+$/g, ""));
    } else if (objUrl.hostname === "host.docker.internal") {
      objUrl.hostname = "127.0.0.1";
      lstCandidates.push(objUrl.toString().replace(/\/+$/g, ""));
    }
  } catch {
    // Keep the primary candidate only if URL parsing fails.
  }

  return [...new Set(lstCandidates)];
}

function isNetworkFetchFailure(objError: unknown) {
  return objError instanceof TypeError && /fetch failed/i.test(objError.message);
}

export async function callBackendApi<TResponse>(
  strPath: string,
  objInit: RequestInitWithJson = {}
): Promise<TResponse> {
  const strConfiguredApiBaseUrl =
    typeof window === "undefined"
      ? process.env.BACKEND_API_BASE_URL?.trim() || appConfig.apiBaseUrl
      : appConfig.apiBaseUrl;
  const lstApiBaseUrls =
    typeof window === "undefined"
      ? buildServerApiBaseUrlCandidates(strConfiguredApiBaseUrl)
      : [strConfiguredApiBaseUrl];
  const strApiBaseUrl = lstApiBaseUrls[0] ?? "";

  if (!strApiBaseUrl) {
    throw new Error("BACKEND_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const { objJsonBody, headers, ...objRest } = objInit;
  let objResponse: Response | null = null;
  let objLastError: unknown = null;

  for (const strBaseUrl of lstApiBaseUrls) {
    const strUrl = `${strBaseUrl.replace(/\/$/, "")}${strPath.startsWith("/") ? strPath : `/${strPath}`}`;
    try {
      objResponse = await fetch(strUrl, {
        ...objRest,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(headers ?? {})
        },
        body: objJsonBody !== undefined ? JSON.stringify(objJsonBody) : objRest.body
      });
      break;
    } catch (objError) {
      objLastError = objError;
      if (!isNetworkFetchFailure(objError)) {
        throw objError;
      }
    }
  }

  if (!objResponse) {
    if (isNetworkFetchFailure(objLastError)) {
      throw new Error("Unable to reach the HRMS backend service. Please verify the backend server is running and reachable.");
    }
    throw objLastError ?? new Error("Unable to reach the HRMS backend service. Please verify the backend server is running and reachable.");
  }

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
