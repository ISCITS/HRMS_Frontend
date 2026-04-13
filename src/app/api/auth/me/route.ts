import { NextResponse } from "next/server";

import { getAccessTokenFromCookie, getAccessTokenFromRequest, proxyCurrentUser } from "@/app/api/auth/AuthProxy";

async function handleCurrentUser(objRequest: Request) {
  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }
    const objResult = await proxyCurrentUser(strAccessToken, objRequest.headers);
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

export async function GET(objRequest: Request) {
  return handleCurrentUser(objRequest);
}

export async function POST(objRequest: Request) {
  return handleCurrentUser(objRequest);
}
