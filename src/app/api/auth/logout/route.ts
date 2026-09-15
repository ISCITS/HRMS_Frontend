import { NextResponse } from "next/server";

import { clearAuthCookies, getAccessTokenFromCookie, proxyLogout } from "@/app/api/auth/AuthProxy";
import { ApiRequestError } from "@/Common/utils/apiErrorHandler";

export async function POST(objRequest: Request) {
  try {
    const strAccessToken = await getAccessTokenFromCookie();
    const objBackendResult = strAccessToken
      ? await proxyLogout(strAccessToken, objRequest.headers)
      : {
          ResultCode: 1,
          Msg: "Logout successful.",
          Data: { blnLoggedOut: true },
        };

    const objResponse = NextResponse.json(
      {
        ResultCode: 1,
        Msg: objBackendResult?.Msg || "Logout successful.",
        Data: objBackendResult?.Data || { blnLoggedOut: true },
      },
      { status: 200 }
    );
    await clearAuthCookies(objResponse);
    return objResponse;
  } catch (objError) {
    if (
      objError instanceof ApiRequestError &&
      (objError.intStatusCode === 401 || objError.intStatusCode === 403)
    ) {
      const objResponse = NextResponse.json(
        {
          ResultCode: 1,
          Msg: "Logout successful.",
          Data: { blnLoggedOut: true },
        },
        { status: 200 }
      );
      await clearAuthCookies(objResponse);
      return objResponse;
    }

    console.error("POST /api/auth/logout failed", objError);
    const objResponse = NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to complete logout.",
        Data: objError instanceof ApiRequestError ? objError.objData ?? {} : {},
      },
      { status: 400 }
    );
    await clearAuthCookies(objResponse);
    return objResponse;
  }
}
