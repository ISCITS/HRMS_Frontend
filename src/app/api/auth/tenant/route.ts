import { NextResponse } from "next/server";

import { proxyTenantLookup } from "@/app/api/auth/AuthProxy";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as { strTenantUUID?: string; tenantUuid?: string };
    const strTenantUUID = objBody.strTenantUUID ?? objBody.tenantUuid ?? "";
    const objResult = await proxyTenantLookup(strTenantUUID);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to resolve tenant.",
        Data: {}
      },
      { status: 404 }
    );
  }
}
