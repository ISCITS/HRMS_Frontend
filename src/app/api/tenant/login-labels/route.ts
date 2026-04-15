import { NextRequest, NextResponse } from "next/server";

import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";

type TenantRequestPayload = {
  strTenantUUID?: string;
  tenantUuid?: string;
  languageId?: number;
  language_id?: number;
};

function buildTenantProxyHeaders(objRequestHeaders?: Headers) {
  const strTenantID = objRequestHeaders?.get("X-Tenant-Id")?.trim() || DefaultContextValue.PrimaryId;
  const strCompanyID = objRequestHeaders?.get("X-Company-Id")?.trim() || DefaultContextValue.PrimaryId;
  const strFrontendOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() || "http://localhost:3000";

  return {
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(apiConstants.csrfSecretKey, "TENANT_LOGIN_LABELS_READ"),
    "X-Tenant-Id": strTenantID,
    "X-Company-Id": strCompanyID
  };
}

async function proxyTenantLoginLabels(strTenantUUID: string, intLanguageID?: number, objRequestHeaders?: Headers) {
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
    const objResult = await callBackendApi(`/api/v1/tenant/${encodeURIComponent(strTenantUUID)}/login-labels${strQuery}`, {
      method: "GET",
      cache: "no-store",
      headers: buildTenantProxyHeaders(objRequestHeaders)
    });
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load login labels.",
        Data: {}
      },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const intLanguageID = Number(request.nextUrl.searchParams.get("languageId") ?? request.nextUrl.searchParams.get("language_id") ?? "");
  return proxyTenantLoginLabels(
    request.nextUrl.searchParams.get("tenantUuid")?.trim() ?? "",
    Number.isFinite(intLanguageID) ? intLanguageID : undefined,
    request.headers
  );
}

export async function POST(request: Request) {
  const objBody = (await request.json().catch(() => ({} as TenantRequestPayload))) as TenantRequestPayload;
  return proxyTenantLoginLabels(
    (objBody.strTenantUUID ?? objBody.tenantUuid ?? "").trim(),
    objBody.languageId ?? objBody.language_id,
    request.headers
  );
}
