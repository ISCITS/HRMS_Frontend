import axios, { AxiosHeaders, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { apiConstants } from "@/config/constants";
import { generateCSRFToken } from "@/lib/csrfToken";

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

axiosInstance.interceptors.request.use((config) => {
  const dicConfig = config as ApiInterceptorConfig;
  const headers = ensureHeaders(dicConfig.headers);
  const menuAction = dicConfig.csrfMenuAction ?? "GLOBAL_ACTION";
  const csrfToken = dicConfig.csrfToken ?? generateCSRFToken(apiConstants.csrfSecretKey, menuAction);

  headers.set(apiConstants.csrfHeaderName, csrfToken);

  if (typeof FormData !== "undefined" && dicConfig.data instanceof FormData) {
    headers.delete("Content-Type");
  } else if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  dicConfig.headers = headers;
  return dicConfig;
});
