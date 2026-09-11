import { NextResponse } from "next/server";

import {
  getAccessTokenFromCookie,
  getAccessTokenFromRequest,
  proxyPortalContext,
  setAccessTokenCookie
} from "@/app/api/auth/AuthProxy";
import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";

type PortalContextRouteBody = {
  payload?: string;
  strPortal?: string;
  portal?: string;
};

// "Continue To" / portal switch. The chosen portal is revalidated by the backend, which returns a
// token carrying the new active context; that token replaces the session cookie here.
export async function POST(objRequest: Request) {
  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }
    const objBody = await normalizeAuthRouteBody<PortalContextRouteBody>(await objRequest.json());
    const strPortal = String(objBody.strPortal ?? objBody.portal ?? "").trim();
    if (!strPortal) {
      return NextResponse.json({ ResultCode: 0, Msg: "A portal is required.", Data: {} }, { status: 400 });
    }

    const objResult = await proxyPortalContext(strAccessToken, strPortal, objRequest.headers);
    const objResponse = NextResponse.json(objResult, { status: 200 });
    const strRefreshedToken = objResult?.Data?.objToken?.strAccessToken;
    if (strRefreshedToken) {
      await setAccessTokenCookie(objResponse, strRefreshedToken);
    }
    return objResponse;
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to activate the selected portal.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
