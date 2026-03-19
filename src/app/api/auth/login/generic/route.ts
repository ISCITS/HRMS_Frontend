import { NextResponse } from "next/server";

import { proxyGenericLogin, setAuthCookies } from "@/app/api/auth/AuthProxy";

export async function POST(request: Request) {
  try {
    const objBody = (await request.json()) as unknown;
    const objResult = await proxyGenericLogin(objBody);
    const objResponse = NextResponse.json(objResult, { status: 200 });
    await setAuthCookies(objResponse, objResult.Data);
    return objResponse;
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to complete generic login.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
