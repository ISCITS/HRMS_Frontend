import { NextResponse } from "next/server";

import { callBackendApi } from "@/lib/BackendApi";
import type { TenantAuthDetails } from "@/models/AuthModels";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as { strTenantUUID?: string; tenantUuid?: string };
    const strTenantUUID = objBody.strTenantUUID ?? objBody.tenantUuid ?? "";
    const objResult = await callBackendApi<{ ResultCode: number; Msg: string; Data: TenantAuthDetails }>("/api/v1/tenant/auth-details", {
      method: "POST",
      cache: "no-store",
      objJsonBody: { strTenantUUID }
    });
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load tenant authentication details.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
