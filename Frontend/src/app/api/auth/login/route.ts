import { NextResponse } from "next/server";
import { appConfig } from "@/config";

type LoginRequestBody = {
  userId?: string;
  password?: string;
};

// API login route for client authentication flow.
export async function POST(request: Request) {
  let dicBody: LoginRequestBody = {};

  try {
    dicBody = (await request.json()) as LoginRequestBody;
  } catch {
    dicBody = {};
  }

  const strUserId = String(dicBody.userId ?? "").trim();
  const strPassword = String(dicBody.password ?? "").trim();

  if (!strUserId || !strPassword) {
    return NextResponse.json({ message: "User ID and password are required." }, { status: 400 });
  }

  const dicResponse = NextResponse.json(
    {
      isAuthenticated: true,
      userId: strUserId
    },
    { status: 200 }
  );

  dicResponse.cookies.set(appConfig.authCookieName, "1", {
    path: "/",
    maxAge: appConfig.authCookieMaxAgeSeconds,
    sameSite: "lax"
  });

  return dicResponse;
}
