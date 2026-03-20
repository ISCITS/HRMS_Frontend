import { NextResponse } from "next/server";

import { getAccessTokenFromCookie, proxyCurrentUser } from "@/app/api/auth/AuthProxy";

export async function GET() {
  try {
    const strAccessToken = await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }
    const objResult = await proxyCurrentUser(strAccessToken);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load current user.",
        Data: {}
      },
      { status: 401 }
    );
  }
}
