import { NextResponse } from "next/server";

import { isAuthSuccessData, proxyTenantLogin, setAuthCookies } from "@/app/api/auth/AuthProxy";
import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";

type LoginRouteBody = {
  payload?: string;
  strTenantUUID?: string;
  tenantUuid?: string;
  TenantUUID?: string;
  strLoginID?: string;
  loginId?: string;
  strPassword?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const objBody = await normalizeAuthRouteBody<LoginRouteBody>(await request.json());
    const objResult = await proxyTenantLogin({
      strTenantUUID: objBody.strTenantUUID ?? objBody.tenantUuid ?? objBody.TenantUUID,
      strLoginID: objBody.strLoginID ?? objBody.loginId,
      strPassword: objBody.strPassword ?? objBody.password,
    });
    const objResponse = NextResponse.json(objResult, { status: 200 });

    if (isAuthSuccessData(objResult.Data)) {
      await setAuthCookies(objResponse, objResult.Data);
    }

    return objResponse;
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to complete login.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
