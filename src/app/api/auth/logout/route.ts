import { NextResponse } from "next/server";

import { clearAuthCookies, getAccessTokenFromCookie, proxyLogout } from "@/app/api/auth/AuthProxy";

export async function POST() {
  try {
    const strAccessToken = await getAccessTokenFromCookie();
    if (strAccessToken) {
      await proxyLogout(strAccessToken);
    }
    const objResponse = NextResponse.json(
      {
        ResultCode: 1,
        Msg: "Logout successful.",
        Data: { blnLoggedOut: true }
      },
      { status: 200 }
    );
    await clearAuthCookies(objResponse);
    return objResponse;
  } catch (objError) {
    const objResponse = NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to complete logout.",
        Data: {}
      },
      { status: 400 }
    );
    await clearAuthCookies(objResponse);
    return objResponse;
  }
}
