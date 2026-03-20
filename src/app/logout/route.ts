import { NextResponse } from "next/server";
import { appConfig, appRoutes } from "@/config";

// Handles logout by clearing auth cookie and redirecting to login.
export async function GET(req: Request) {
  /*
  Functional responsibility:
  - Invalidate user session cookie on logout request.
  
  Inputs:
  - Incoming GET request for /logout.
  
  Output:
  - Redirect response to /login with cleared hrms_auth cookie.
  
  Failure behavior:
  - If cookie is already absent, response still redirects safely to /login.
  */
  const strLoginUrl = new URL(appRoutes.login, req.url);
  const dicResponse = NextResponse.redirect(strLoginUrl);
  dicResponse.cookies.set(appConfig.authCookieName, "", { path: "/", maxAge: 0 });
  dicResponse.cookies.set(appConfig.tenantCookieName, "", { path: "/", maxAge: 0 });
  return dicResponse;
}
