import { appConfig } from "@/config";

type RequestInitWithJson = RequestInit & {
  objJsonBody?: unknown;
};

export async function callBackendApi<TResponse>(
  strPath: string,
  objInit: RequestInitWithJson = {}
): Promise<TResponse> {
  if (!appConfig.apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
  }

  const { objJsonBody, headers, ...objRest } = objInit;
  const strUrl = `${appConfig.apiBaseUrl.replace(/\/$/, "")}${strPath.startsWith("/") ? strPath : `/${strPath}`}`;
  const objResponse = await fetch(strUrl, {
    ...objRest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(headers ?? {})
    },
    body: objJsonBody !== undefined ? JSON.stringify(objJsonBody) : objRest.body
  });

  const objPayload = (await objResponse.json().catch(() => ({}))) as TResponse & { Msg?: string; message?: string };
  if (!objResponse.ok) {
    const strMessage = objPayload.Msg ?? objPayload.message ?? "Request failed.";
    throw new Error(strMessage);
  }
  return objPayload;
}
