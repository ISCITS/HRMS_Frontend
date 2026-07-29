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

async function buildAuthorizedHeaders(objRequest: Request) {
  const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
  if (!strAccessToken) {
    return null;
  }

  return {
    Authorization: `Bearer ${strAccessToken}`,
  };
}

export async function GET(objRequest: Request) {
  const objHeaders = await buildAuthorizedHeaders(objRequest);
  if (!objHeaders) {
    return new NextResponse("Unauthenticated.", { status: 401 });
  }

  const strBackendBaseUrl = resolveBackendBaseUrl();
  const objUrl = new URL(objRequest.url);
  const strVersionQuery = objUrl.searchParams.get("v");
  const strAvatarUrl = `${strBackendBaseUrl.replace(/\/$/, "")}/api/v1/auth/avatar/current${strVersionQuery ? `?v=${encodeURIComponent(strVersionQuery)}` : ""}`;

  const objBackendResponse = await fetch(strAvatarUrl, {
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
  const strBackendBaseUrl = resolveBackendBaseUrl();
  const objHeaders: Record<string, string> = {
    ...buildProtectedProxyRequestHeaders(strAccessToken, "AUTH_AVATAR_UPDATE", objRequest.headers)
  };
  delete objHeaders["Content-Type"];
  const objBackendResponse = await fetch(`${strBackendBaseUrl.replace(/\/$/, "")}/api/v1/auth/avatar/current`, {
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

  const strBackendBaseUrl = resolveBackendBaseUrl();
  const objHeaders = buildProtectedProxyRequestHeaders(strAccessToken, "AUTH_AVATAR_DELETE", objRequest.headers);
  const objBackendResponse = await fetch(`${strBackendBaseUrl.replace(/\/$/, "")}/api/v1/auth/avatar/current`, {
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
