import { NextResponse } from "next/server";

import { isAuthSuccessData, proxyVerifyOtp, setAuthCookies } from "@/app/api/auth/AuthProxy";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as unknown;
    const objResult = await proxyVerifyOtp(objBody);
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
