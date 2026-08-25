import { NextResponse } from "next/server";

import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";
import {
  getAccessTokenFromCookie,
  getAccessTokenFromRequest,
  proxyChangePassword
} from "@/app/api/auth/AuthProxy";

type ChangePasswordRouteBody = {
  payload?: string;
  strCurrentPassword?: string;
  strNewPassword?: string;
  strConfirmPassword?: string;
};

export async function POST(objRequest: Request) {
  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }
    const objBody = await normalizeAuthRouteBody<ChangePasswordRouteBody>(await objRequest.json());
    const objResult = await proxyChangePassword(strAccessToken, {
      strCurrentPassword: objBody.strCurrentPassword,
      strNewPassword: objBody.strNewPassword,
      strConfirmPassword: objBody.strConfirmPassword,
    }, objRequest.headers);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    const intStatusCode = typeof objError === "object" && objError !== null && "intStatusCode" in objError
      ? Number((objError as { intStatusCode?: number }).intStatusCode) || 400
      : 400;
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to change your password. Please try again.",
        Data: {}
      },
      { status: intStatusCode }
    );
  }
}
