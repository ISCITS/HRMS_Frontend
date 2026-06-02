import { NextResponse } from "next/server";

import { normalizeAuthRouteBody } from "@/app/api/auth/AuthRouteBody";
import { isAuthSuccessData, proxyGenericLogin, setAuthCookies } from "@/app/api/auth/AuthProxy";

type GenericLoginRouteBody = {
  payload?: string;
  strEmailAddress?: string;
  emailAddress?: string;
  email?: string;
  strPassword?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    const objBody = await normalizeAuthRouteBody<GenericLoginRouteBody>(await request.json());
    const objResult = await proxyGenericLogin({
      strEmailAddress: objBody.strEmailAddress ?? objBody.emailAddress ?? objBody.email,
      strPassword: objBody.strPassword ?? objBody.password,
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
        Msg: objError instanceof Error ? objError.message : "Unable to complete generic login.",
        Data: {}
      },
      { status: 400 }
    );
  }
}
