import { NextResponse } from "next/server";

import { proxySsoRedirect } from "@/app/api/auth/AuthProxy";

export async function GET(_: Request, { params }: { params: Promise<{ tenantUuid: string }> }) {
  try {
    const { tenantUuid } = await params;
    const objResult = await proxySsoRedirect(tenantUuid);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to prepare SSO redirect.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
