import { ApiDefaultMessage, ApiRequestMethod } from "@/Common/enums/AppEnums";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { apiConstants } from "@/config/constants";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";
import { generateCSRFToken } from "@/lib/csrfToken";

export type ApiClientResponse<TResponse> = {
  Response: TResponse;
  MethodName: string;
};

export type ApiCallOptions = {
  method?: ApiRequestMethod;
  params?: Record<string, string | number | boolean | null | undefined>;
};

function toEndpoint(methodName: string) {
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
  menuAction = methodName,
  options: ApiCallOptions = {}
): Promise<ApiClientResponse<TResponse>> {

  const csrfToken = generateCSRFToken(apiConstants.csrfSecretKey, menuAction);
  const strMethod = options.method ?? ApiRequestMethod.Post;

  const requestConfig: ApiRequestConfig = {
    method: strMethod,

    // use dynamic endpoint
    url: toEndpoint(methodName),

    data: strMethod === ApiRequestMethod.Get ? undefined : data,
    params: options.params,

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
    throw await createApiRequestError(error, ApiDefaultMessage.UnexpectedClientError);
  }
}
