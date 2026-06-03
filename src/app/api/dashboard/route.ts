import { NextRequest, NextResponse } from "next/server";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import { getServerAppOrigin, getServerCsrfSecretKey } from "@/lib/serverSecurity";
import type { ApiEnvelope, DashboardResponse } from "@/models/AuthModels";

import { getAccessTokenFromCookie, getAccessTokenFromRequest } from "@/app/api/auth/AuthProxy";

function buildProtectedProxyHeaders(strAccessToken: string, objRequestHeaders?: Headers) {
  const strFrontendOrigin = getServerAppOrigin();
  const strTenantID = objRequestHeaders?.get("X-Tenant-Id")?.trim() || "";
  const strCompanyID = objRequestHeaders?.get("X-Company-Id")?.trim() || "";
  return {
    Authorization: `Bearer ${strAccessToken}`,
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(getServerCsrfSecretKey(), "DASHBOARD_VIEW"),
    ...(strTenantID ? { "X-Tenant-Id": strTenantID } : {}),
    ...(strCompanyID ? { "X-Company-Id": strCompanyID } : {})
  };
}

export async function GET(request: NextRequest) {
  const strAccessToken = getAccessTokenFromRequest(request) || await getAccessTokenFromCookie();
  if (!strAccessToken) {
    return NextResponse.json(
      { ResultCode: 0, Msg: "Authentication token is missing.", Data: {} },
      { status: 401 }
    );
  }

  try {
    const strPayrollMonth = request.nextUrl.searchParams.get("payroll_month")?.trim() || "";
    const strBackendPath = strPayrollMonth
      ? `/api/v1/dashboard?payroll_month=${encodeURIComponent(strPayrollMonth)}`
      : "/api/v1/dashboard";
    const objResult = await callBackendApi<ApiEnvelope<DashboardResponse>>(strBackendPath, {
      method: "GET",
      cache: "no-store",
      headers: buildProtectedProxyHeaders(strAccessToken, request.headers)
    });
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    const intStatusCode = objError instanceof ApiRequestError ? objError.intStatusCode ?? 400 : 400;
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load dashboard.",
        Data: {},
        RequestId: objError instanceof ApiRequestError ? objError.strRequestId : undefined,
      },
      { status: intStatusCode }
    );
  }
}
