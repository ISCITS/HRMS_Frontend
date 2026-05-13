import { NextResponse } from "next/server";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { proxyTenantLookup, proxyTenantLookupPayload } from "@/app/api/auth/AuthProxy";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as { payload?: string; strTenantUUID?: string; tenantUuid?: string };
    if (typeof objBody.payload === "string" && objBody.payload.trim()) {
      const objResult = await proxyTenantLookupPayload(objBody);
      return NextResponse.json(objResult, { status: 200 });
    }

    const strTenantUUID = objBody.strTenantUUID ?? objBody.tenantUuid ?? "";
    const objResult = await proxyTenantLookup(strTenantUUID);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to resolve tenant.",
        Data: {},
        RequestId: objError instanceof ApiRequestError ? objError.strRequestId : undefined,
      },
      { status: 404 }
    );
  }
}
