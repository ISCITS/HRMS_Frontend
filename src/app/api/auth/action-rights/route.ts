import { NextResponse } from "next/server";

import { getAccessTokenFromCookie, getAccessTokenFromRequest, proxyActionRights } from "@/app/api/auth/AuthProxy";

async function handleActionRights(objRequest: Request) {
  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }

    const objResult = await proxyActionRights(strAccessToken, objRequest.headers);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load action rights.",
        Data: {}
      },
      { status: 401 }
    );
  }
}

export async function GET(objRequest: Request) {
  return handleActionRights(objRequest);
}

export async function POST(objRequest: Request) {
  return handleActionRights(objRequest);
}
