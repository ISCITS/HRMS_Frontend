import { NextRequest, NextResponse } from "next/server";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import { getServerAppOrigin, getServerCsrfSecretKey } from "@/lib/serverSecurity";
import type { TenantAuthDetails } from "@/models/AuthModels";

type TenantRequestPayload = {
  strTenantUUID?: string;
  tenantUuid?: string;
  languageId?: number;
  language_id?: number;
};

function buildTenantProxyHeaders() {
  const strFrontendOrigin = getServerAppOrigin();

  return {
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(getServerCsrfSecretKey(), "TENANT_AUTH_DETAILS_READ"),
    // Tenant discovery is a pre-authentication operation. Never forward stale
    // browser tenant/company context while resolving the supplied tenant UUID.
    "X-Tenant-Id": DefaultContextValue.PrimaryId,
    "X-Company-Id": DefaultContextValue.PrimaryId
  };
}

async function proxyTenantAuthDetails(strTenantUUID: string, intLanguageID?: number) {
  if (!strTenantUUID) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: "tenantUuid is required.",
        Data: {}
      },
      { status: 400 }
    );
  }

  try {
    const strQuery = Number.isFinite(intLanguageID) && Number(intLanguageID) > 0
      ? `?language_id=${encodeURIComponent(String(intLanguageID))}`
      : "";
    const objResult = await callBackendApi<{ ResultCode: number; Msg: string; Data: TenantAuthDetails }>(
      `/api/v1/tenant/${encodeURIComponent(strTenantUUID)}/auth-details${strQuery}`,
      {
        method: "GET",
        cache: "no-store",
        headers: buildTenantProxyHeaders()
      }
    );
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load tenant authentication details.",
        Data: {},
        RequestId: objError instanceof ApiRequestError ? objError.strRequestId : undefined,
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const intLanguageID = Number(request.nextUrl.searchParams.get("languageId") ?? request.nextUrl.searchParams.get("language_id") ?? "");
  return proxyTenantAuthDetails(
    (
      request.nextUrl.searchParams.get("strTenantUUID") ??
      request.nextUrl.searchParams.get("tenantUuid") ??
      ""
    ).trim(),
    Number.isFinite(intLanguageID) ? intLanguageID : undefined
  );
}

export async function POST(request: Request) {
  const objBody = (await request.json().catch(() => ({} as TenantRequestPayload))) as TenantRequestPayload;
  return proxyTenantAuthDetails(
    (objBody.strTenantUUID ?? objBody.tenantUuid ?? "").trim(),
    objBody.languageId ?? objBody.language_id
  );
}
