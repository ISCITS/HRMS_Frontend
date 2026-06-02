import { NextResponse } from "next/server";

import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";
import { isAuthSuccessData, proxyVerifyOtp, setAuthCookies } from "@/app/api/auth/AuthProxy";

type VerifyOtpRouteBody = {
  payload?: string;
  intUserID?: number;
  userId?: number;
  intTenantID?: number;
  tenantId?: number;
  strPreAuthToken?: string;
  preAuthToken?: string;
  pre_auth_token?: string;
  strOtp?: string;
  otp?: string;
};

export async function POST(request: Request) {
  try {
    const objBody = await normalizeAuthRouteBody<VerifyOtpRouteBody>(await request.json());
    const objResult = await proxyVerifyOtp({
      intUserID: objBody.intUserID ?? objBody.userId,
      intTenantID: objBody.intTenantID ?? objBody.tenantId,
      strPreAuthToken: objBody.strPreAuthToken ?? objBody.preAuthToken ?? objBody.pre_auth_token,
      strOtp: objBody.strOtp ?? objBody.otp,
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
        Msg: objError instanceof Error ? objError.message : "Unable to verify OTP.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
