import { NextResponse } from "next/server";
import { appConfig } from "@/config";
import { decryptPayload } from "@/lib/security/decryptPayload";

type LoginRequestBody = {
  userId?: string;
  password?: string;
  payload?: string;
};

function isLoginRequestBody(value: unknown): value is LoginRequestBody {
  return typeof value === "object" && value !== null;
}

// API login route for client authentication flow.
export async function POST(request: Request) {
  let dicRawBody: LoginRequestBody | string = {};

  try {
    dicRawBody = (await request.json()) as LoginRequestBody | string;
  } catch {
    dicRawBody = {};
  }

  let dicBody: LoginRequestBody = {};

  if (typeof dicRawBody === "string" && dicRawBody.trim()) {
    try {
      dicBody = await decryptPayload<LoginRequestBody>(dicRawBody);
    } catch {
      return NextResponse.json({ message: "Invalid encrypted request payload." }, { status: 400 });
    }
  } else if (isLoginRequestBody(dicRawBody) && typeof dicRawBody.payload === "string" && dicRawBody.payload.trim()) {
    try {
      dicBody = await decryptPayload<LoginRequestBody>(dicRawBody.payload);
    } catch {
      return NextResponse.json({ message: "Invalid encrypted request payload." }, { status: 400 });
    }
  } else if (isLoginRequestBody(dicRawBody)) {
    dicBody = dicRawBody;
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
