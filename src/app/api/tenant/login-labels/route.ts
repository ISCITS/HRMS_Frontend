import { NextResponse } from "next/server";

import { callBackendApi } from "@/lib/BackendApi";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as { strTenantUUID?: string; tenantUuid?: string };
    const strTenantUUID = objBody.strTenantUUID ?? objBody.tenantUuid ?? "";
    const objResult = await callBackendApi("/api/v1/tenant/login-labels", {
      method: "POST",
      cache: "no-store",
      objJsonBody: { strTenantUUID }
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
