import axios, { AxiosRequestConfig } from "axios";
import { env } from "@/config";

type RequestOptions = AxiosRequestConfig & {
  query?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const baseUrl = env.apiBaseUrl || "";
  const url = new URL(path, baseUrl || "http://localhost");

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return baseUrl ? url.toString() : `${url.pathname}${url.search}`;
}

/*
Functional responsibility:
- Provide a centralized axios-based JSON client for browser and server-side requests.

Inputs:
- Request path with optional axios config and query params.

Output:
- Parsed typed JSON payload from the API response.

Failure behavior:
- Throws when the HTTP request fails or the response cannot be processed.
*/
export async function requestJson<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { query, headers, ...requestConfig } = options;
  const response = await axios.request<TResponse>({
    url: buildUrl(path, query),
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    ...requestConfig
  });

  return response.data;
}
