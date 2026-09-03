import { NextResponse } from "next/server";

import { isAuthSuccessData, proxySsoCallback, setAuthCookies } from "@/app/api/auth/AuthProxy";

export async function GET(request: Request) {
  try {
    const objUrl = new URL(request.url);
    const objResult = await proxySsoCallback(objUrl.search);
    const objResponse = NextResponse.json(objResult, { status: 200 });
    if (isAuthSuccessData(objResult.Data)) {
      await setAuthCookies(objResponse, objResult.Data);
    }
    return objResponse;
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to complete SSO callback.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
