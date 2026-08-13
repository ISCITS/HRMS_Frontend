import { NextResponse } from "next/server";

import {
  buildProtectedProxyRequestHeaders,
  getAccessTokenFromCookie,
  getAccessTokenFromRequest
} from "@/app/api/auth/AuthProxy";
import { appConfig } from "@/config";

function resolveBackendBaseUrl() {
  return process.env.BACKEND_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || appConfig.apiBaseUrl;
}

function buildBackendAvatarUrl(objRequest: Request) {
  const strBackendBaseUrl = resolveBackendBaseUrl();
  const objUrl = new URL(objRequest.url);
  const objBackendQuery = new URLSearchParams();
  const strEmployeeID = objUrl.searchParams.get("employee_id");
  const strVersion = objUrl.searchParams.get("v");
  if (strEmployeeID) {
    objBackendQuery.set("employee_id", strEmployeeID);
  }
  if (strVersion) {
    objBackendQuery.set("v", strVersion);
  }
  const strQuery = objBackendQuery.toString();
  return `${strBackendBaseUrl.replace(/\/$/, "")}/api/v1/auth/avatar/current${strQuery ? `?${strQuery}` : ""}`;
}

export async function GET(objRequest: Request) {
  const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
  if (!strAccessToken) {
    return new NextResponse("Unauthenticated.", { status: 401 });
  }
  const objHeaders = buildProtectedProxyRequestHeaders(strAccessToken, "AUTH_ME", objRequest.headers);

  const objBackendResponse = await fetch(buildBackendAvatarUrl(objRequest), {
    method: "GET",
    headers: objHeaders,
    cache: "no-store",
  });
  if (objBackendResponse.status === 404) {
    return new NextResponse(null, { status: 204 });
  }
  if (!objBackendResponse.ok) {
    return new NextResponse("Avatar not found.", { status: objBackendResponse.status });
  }

  const bytPayload = await objBackendResponse.arrayBuffer();
  return new NextResponse(bytPayload, {
    status: 200,
    headers: {
      "Content-Type": objBackendResponse.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}

export async function PUT(objRequest: Request) {
  const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
  if (!strAccessToken) {
    return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
  }

  const objFormData = await objRequest.formData();
  const objHeaders: Record<string, string> = {
    ...buildProtectedProxyRequestHeaders(strAccessToken, "AUTH_AVATAR_UPDATE", objRequest.headers)
  };
  delete objHeaders["Content-Type"];
  const objBackendResponse = await fetch(buildBackendAvatarUrl(objRequest), {
    method: "PUT",
    headers: objHeaders,
    body: objFormData,
    cache: "no-store",
  });
  const strResponseText = await objBackendResponse.text();
  return new NextResponse(strResponseText, {
    status: objBackendResponse.status,
    headers: {
      "Content-Type": objBackendResponse.headers.get("content-type") || "application/json",
    },
  });
}

export async function DELETE(objRequest: Request) {
  const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
  if (!strAccessToken) {
    return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
  }

  const objHeaders = buildProtectedProxyRequestHeaders(strAccessToken, "AUTH_AVATAR_DELETE", objRequest.headers);
  const objBackendResponse = await fetch(buildBackendAvatarUrl(objRequest), {
    method: "DELETE",
    headers: objHeaders,
    cache: "no-store",
  });
  const strResponseText = await objBackendResponse.text();
  return new NextResponse(strResponseText, {
    status: objBackendResponse.status,
    headers: {
      "Content-Type": objBackendResponse.headers.get("content-type") || "application/json",
    },
  });
}
