import { NextRequest, NextResponse } from "next/server";

import { DefaultContextValue } from "@/Common/enums/AppEnums";
import { getAccessTokenFromCookie, getAccessTokenFromRequest } from "@/app/api/auth/AuthProxy";
import { apiConstants } from "@/config/constants";
import type { AllLabelsResponse } from "@/features/labels/types";
import { callBackendApi } from "@/lib/BackendApi";
import { generateCSRFToken } from "@/lib/csrfToken";
import { decryptPayload } from "@/lib/security/decryptPayload";
import { getServerAppOrigin, getServerCsrfSecretKey } from "@/lib/serverSecurity";

type AllLabelRequestPayload = {
  language_id?: string | number | null;
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
    "X-Company-Id": strCompanyID,
  };
}

async function proxyAllLabels(objRequest: NextRequest, objPayload: AllLabelRequestPayload) {
  const strLanguageID = String(objPayload.language_id ?? "").trim();

  if (!strLanguageID) {
    return NextResponse.json(
      { message: "language_id is required." },
      { status: 400 }
    );
  }

  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ message: "Unauthenticated." }, { status: 401 });
    }

    const objResolvedLabels = await callBackendApi<AllLabelsResponse | { payload?: string }>(
      `/api/v1/labels/all?language_id=${encodeURIComponent(strLanguageID)}`,
      {
        method: "GET",
        cache: "no-store",
        headers: buildLabelHeaders(objRequest, strAccessToken),
      }
    ).then((objLabels) =>
      typeof objLabels === "object" &&
      objLabels !== null &&
      "payload" in objLabels &&
      typeof objLabels.payload === "string"
        ? decryptPayload<AllLabelsResponse>(objLabels.payload)
        : (objLabels as AllLabelsResponse)
    );

    return NextResponse.json(objResolvedLabels, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        message: objError instanceof Error ? objError.message : "Unable to load labels.",
      },
      { status: 502 }
    );
  }
}

export async function GET(objRequest: NextRequest) {
  return proxyAllLabels(objRequest, {
    language_id: objRequest.nextUrl.searchParams.get("language_id"),
  });
}

export async function POST(objRequest: NextRequest) {
  const objPayload = await objRequest.json().catch(() => ({} as AllLabelRequestPayload));
  return proxyAllLabels(objRequest, objPayload);
}
