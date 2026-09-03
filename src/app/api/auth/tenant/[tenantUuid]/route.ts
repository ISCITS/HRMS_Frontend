import { NextResponse } from "next/server";

import { ApiRequestError } from "@/Common/utils/apiErrorHandler";
import { proxyTenantLookup } from "@/app/api/auth/AuthProxy";

export async function GET(_: Request, { params }: { params: Promise<{ tenantUuid: string }> }) {
  try {
    const { tenantUuid } = await params;
    const objResult = await proxyTenantLookup(tenantUuid);
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
