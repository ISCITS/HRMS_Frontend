import { NextResponse } from "next/server";

import { getAccessTokenFromCookie, getAccessTokenFromRequest, proxyMenu } from "@/app/api/auth/AuthProxy";

async function handleMenu(objRequest: Request) {
  try {
    const strAccessToken = getAccessTokenFromRequest(objRequest) || await getAccessTokenFromCookie();
    if (!strAccessToken) {
      return NextResponse.json({ ResultCode: 0, Msg: "Unauthenticated.", Data: {} }, { status: 401 });
    }
    const objResult = await proxyMenu(strAccessToken, objRequest.headers);
    return NextResponse.json(objResult, { status: 200 });
  } catch (objError) {
    return NextResponse.json(
      {
        ResultCode: 0,
        Msg: objError instanceof Error ? objError.message : "Unable to load dynamic menu.",
        Data: {}
      },
      { status: 401 }
    );
  }
}

export async function GET(objRequest: Request) {
  return handleMenu(objRequest);
}

export async function POST(objRequest: Request) {
  return handleMenu(objRequest);
}
