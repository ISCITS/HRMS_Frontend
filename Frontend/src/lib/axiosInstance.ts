import axios, { AxiosHeaders, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { apiConstants } from "@/config/constants";
import { generateCSRFToken } from "@/lib/csrfToken";
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

  if (typeof FormData !== "undefined" && dicConfig.data instanceof FormData) {
    // Multipart/form-data must remain unwrapped because the browser owns the boundary
    // generation and servers typically expect the original part structure unchanged.
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