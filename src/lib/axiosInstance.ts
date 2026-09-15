import axios, { AxiosHeaders, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { AuthStorageKey } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config/constants";
import { authHelpers } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrfToken";
import { decryptPayload } from "@/lib/security/decryptPayload";
import { encryptPayload } from "@/lib/security/encryptPayload";
import { isEncryptablePayload, isPayloadEncryptionMethod } from "@/lib/security/isEncryptablePayload";

export type ApiRequestConfig = AxiosRequestConfig & {
  csrfMenuAction?: string;
  csrfToken?: string;
};

type ApiInterceptorConfig = InternalAxiosRequestConfig & {
  csrfMenuAction?: string;
  csrfToken?: string;
};

function ensureHeaders(headers?: InternalAxiosRequestConfig["headers"]) {
  if (headers instanceof AxiosHeaders) {
    return headers;
  }

  return new AxiosHeaders(headers);
}

function shouldRedirectToSessionExpired(objError: unknown) {
  if (!axios.isAxiosError(objError)) {
    return false;
  }

  const intStatusCode = objError.response?.status;
  if (intStatusCode !== 401) {
    return false;
  }

  const strRequestUrl = String(objError.config?.url ?? "");
  const blnIsPublicAuthEndpoint =
    /\/auth\/login(\/generic)?$/i.test(strRequestUrl) ||
    /\/auth\/sso\/callback/i.test(strRequestUrl) ||
    /\/auth\/sso\/mfa\/(setup\/verify|verify|backup-code\/verify)$/i.test(strRequestUrl) ||
    /\/tenant\/[^/]+\/auth-details/i.test(strRequestUrl) ||
    /\/tenant\/[^/]+\/login-labels/i.test(strRequestUrl) ||
    /\/auth\/tenant\//i.test(strRequestUrl);

  if (blnIsPublicAuthEndpoint) {
    return false;
  }

  const strAuthorizationHeader = objError.config?.headers instanceof AxiosHeaders
    ? objError.config.headers.get("Authorization")
    : undefined;

  return Boolean((typeof strAuthorizationHeader === "string" ? strAuthorizationHeader.trim() : "") || authHelpers.getAccessToken());
}

export const axiosInstance = axios.create({
  baseURL: apiConstants.baseURL,
  headers: {
    Accept: "application/json"
  }
});

axiosInstance.interceptors.request.use(async (config) => {
  const dicConfig = config as ApiInterceptorConfig;
  const headers = ensureHeaders(dicConfig.headers);
  const menuAction = dicConfig.csrfMenuAction ?? "GLOBAL_ACTION";
  const csrfToken = dicConfig.csrfToken ?? generateCSRFToken(apiConstants.csrfSecretKey, menuAction);
  const blnSkipPayloadEncryption = headers.get("x-skip-payload-encryption") === "true";

  headers.set(apiConstants.csrfHeaderName, csrfToken);
    if (typeof window !== "undefined") {
      const strSessionToken = authHelpers.getAccessToken();
      const strTenantID = window.localStorage.getItem(AuthStorageKey.TenantId);
      const strCompanyID = window.localStorage.getItem(AuthStorageKey.CompanyId);
      if (strSessionToken) {
        headers.set("Authorization", `Bearer ${strSessionToken}`);
      }
    // Send these ONLY when the context is actually known. They used to default to "1", which the
    // server accepts ahead of the signed-in identity — so a user with no company of their own was
    // silently scoped to company 1 (another tenant's company) and every company-scoped list came
    // back empty. Omitting the header lets the server resolve the right company from the identity.
    if (strTenantID) headers.set("X-Tenant-Id", strTenantID);
    if (strCompanyID) headers.set("X-Company-Id", strCompanyID);
  }

  if (typeof FormData !== "undefined" && dicConfig.data instanceof FormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (
    !blnSkipPayloadEncryption &&
    isPayloadEncryptionMethod(dicConfig.method) &&
    isEncryptablePayload(dicConfig.data)
  ) {
    dicConfig.data = {
      payload: await encryptPayload(dicConfig.data)
    };
  }

  dicConfig.headers = headers;
  return dicConfig;
});

axiosInstance.interceptors.response.use(async (response) => {
  const dicResponseData = response.data as { payload?: string } | undefined;
  if (dicResponseData?.payload && typeof dicResponseData.payload === "string") {
    response.data = await decryptPayload(dicResponseData.payload);
  }
  return response;
}, async (objError) => {
  if (shouldRedirectToSessionExpired(objError)) {
    authHelpers.redirectToSessionExpired();
  }

  return Promise.reject(objError);
});
