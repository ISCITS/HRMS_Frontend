import { NextResponse } from "next/server";

import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";
import { proxyResendOtp } from "@/app/api/auth/AuthProxy";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";

type ResendOtpRouteBody = {
  payload?: string;
  intUserID?: number;
  userId?: number;
  intTenantID?: number;
  tenantId?: number;
  strPreAuthToken?: string;
  preAuthToken?: string;
  pre_auth_token?: string;
};

export async function POST(request: Request) {
  try {
    const objBody = await normalizeAuthRouteBody<ResendOtpRouteBody>(await request.json());
    const objResult = await proxyResendOtp({
      intUserID: objBody.intUserID ?? objBody.userId,
      intTenantID: objBody.intTenantID ?? objBody.tenantId,
      strPreAuthToken: objBody.strPreAuthToken ?? objBody.preAuthToken ?? objBody.pre_auth_token,
    });
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to resend OTP.",
        Data: objError instanceof ApiRequestError ? objError.objData ?? {} : {},
        RequestId: objError instanceof ApiRequestError ? objError.strRequestId : undefined,
      },
      { status: objError instanceof ApiRequestError ? objError.intStatusCode ?? 400 : 400 }
    );
  }
}
