import { NextRequest, NextResponse } from "next/server";

import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { getAccessTokenFromCookie, getAccessTokenFromRequest } from "@/app/api/auth/AuthProxy";
import { apiConstants } from "@/config/constants";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import { decryptPayload } from "@/lib/security/decryptPayload";
import { getServerAppOrigin, getServerCsrfSecretKey } from "@/lib/serverSecurity";
import type { ModuleLabelsResponse } from "@/features/labels/types";

type LabelRequestPayload = {
  language_id?: string | number | null;
  module_name?: string | null;
};

function buildLabelHeaders(objRequest: NextRequest, strAccessToken: string) {
  const strTenantID = objRequest.headers.get("X-Tenant-Id")?.trim() || DefaultContextValue.PrimaryId;
  const strCompanyID = objRequest.headers.get("X-Company-Id")?.trim() || DefaultContextValue.PrimaryId;
  const strFrontendOrigin = getServerAppOrigin();

  return {
    Authorization: `Bearer ${strAccessToken}`,
    Origin: strFrontendOrigin,
    [apiConstants.csrfHeaderName]: generateCSRFToken(getServerCsrfSecretKey(), "LABELS_READ"),
    "X-Tenant-Id": strTenantID,
    "X-Company-Id": strCompanyID
  };
}

async function proxyLabels(objRequest: NextRequest, objPayload: LabelRequestPayload) {
  const strLanguageID = String(objPayload.language_id ?? "").trim();
  const strModuleName = String(objPayload.module_name ?? "").trim();

  if (!strLanguageID || !strModuleName) {
    return NextResponse.json(
      { message: "language_id and module_name are required." },
      { status: 400 }
    );
  }

  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const objLabels = await callBackendApi<ModuleLabelsResponse | { payload?: string }>(
      `/api/v1/labels?language_id=${encodeURIComponent(strLanguageID)}&module_name=${encodeURIComponent(strModuleName)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: buildLabelHeaders(objRequest, strAccessToken)
      }
    );

    const objResolvedLabels =
      typeof objLabels === "object" &&
      objLabels !== null &&
      "payload" in objLabels &&
      typeof objLabels.payload === "string"
        ? await decryptPayload<ModuleLabelsResponse>(objLabels.payload)
        : objLabels;

    return NextResponse.json(objResolvedLabels, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        message: objError instanceof Error ? objError.message : "Unable to load labels."
      },
      { status: 502 }
    );
  }
}

export async function GET(objRequest: NextRequest) {
  return proxyLabels(objRequest, {
    language_id: objRequest.nextUrl.searchParams.get("language_id"),
    module_name: objRequest.nextUrl.searchParams.get("module_name")
  });
}

export async function POST(objRequest: NextRequest) {
  const objPayload = await objRequest.json().catch(() => ({} as LabelRequestPayload));
  return proxyLabels(objRequest, objPayload);
}
