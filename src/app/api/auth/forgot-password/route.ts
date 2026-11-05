import { NextResponse } from "next/server";

import { proxyForgotPassword } from "@/app/api/auth/AuthProxy";
import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";

type ForgotPasswordRouteBody = {
  payload?: string;
  strEmailAddress?: string;
  emailAddress?: string;
  email?: string;
  strTenantUUID?: string;
  tenantUuid?: string;
  TenantUUID?: string;
};

export async function POST(request: Request) {
  try {
    const objBody = await normalizeAuthRouteBody<ForgotPasswordRouteBody>(await request.json());
    const strEmailAddress = objBody.strEmailAddress ?? objBody.emailAddress ?? objBody.email;
    const strTenantUUID = objBody.strTenantUUID ?? objBody.tenantUuid ?? objBody.TenantUUID;
    const objResult = await proxyForgotPassword({ strEmailAddress, strTenantUUID });
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to request password reset.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
