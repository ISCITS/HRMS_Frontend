import axios from "axios";
import { apiConstants } from "@/config/constants";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { generateCSRFToken } from "@/lib/csrfToken";

export type ApiClientResponse<TResponse> = {
  Response: TResponse;
  MethodName: string;
};

function toEndpoint(methodName: string) {
  debugger
  if (methodName.startsWith("/")) {
    return methodName;
  }

  return `${apiConstants.apiPrefix}/${methodName}`;
}

/*
Functional responsibility:
- Execute a CSRF-protected API request through the shared Axios client.

Inputs:
- Request payload, method name/path, and optional menu action for CSRF scoping.

Output:
- Standardized response object containing the API payload and the requested method name.

Failure behavior:
- Throws a normalized Error when the API request fails.
*/

export async function callAPI<TResponse = unknown>(
  data: unknown,
  methodName: string,
  menuAction = methodName
): Promise<ApiClientResponse<TResponse>> {

  const csrfToken = generateCSRFToken(apiConstants.csrfSecretKey, menuAction);

  const requestConfig: ApiRequestConfig = {
    method: "POST",

    // use dynamic endpoint
    url: toEndpoint(methodName),

    data,

    csrfMenuAction: menuAction,
    csrfToken
  };

  try {

    const response = await axiosInstance.request<TResponse>(requestConfig);

    return {
      Response: response.data,
      MethodName: methodName
    };

  } catch (error) {

    if (axios.isAxiosError(error)) {

      const responseMessage =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message ??
        "API request failed.";

      throw new Error(responseMessage);
    }

    throw new Error("Unexpected API client error.");
  }
}
