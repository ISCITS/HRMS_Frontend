import { NextRequest, NextResponse } from "next/server";
import { appRoutes } from "@/config";
import { authHelpers } from "@/lib/auth";

// Enforces route-level authentication using a lightweight auth cookie.
export function middleware(req: NextRequest) {
  /*
  Functional responsibility:
  - Guard application routes so unauthenticated users cannot access protected pages.

  Inputs:
  - NextRequest with pathname and cookies.

  Output:
  - NextResponse.next() for allowed requests or redirect response for blocked paths.

  Failure behavior:
  - Missing or invalid auth cookie is treated as unauthenticated and redirected to /login.
  */
  const strPathname = req.nextUrl.pathname;
  const strAuthCookie = req.cookies.get(authHelpers.cookieName)?.value ?? "";
  const intIsAuthenticated = authHelpers.isAuthenticated(strAuthCookie) ? 1 : 0;

  // Skips auth checks for static assets from /public or files with extensions.
  const intIsStaticAsset = strPathname.includes(".") ? 1 : 0;
  if (intIsStaticAsset === 1) {
    return NextResponse.next();
  }

  const lstPublicRoutes = [appRoutes.login, appRoutes.register, appRoutes.forgotPassword, "/signup"];
  const intIsPublicRoute =
    lstPublicRoutes.includes(strPathname) ||
    strPathname.startsWith("/t/") ||
    strPathname.startsWith("/sso/callback")
      ? 1
      : 0;

  if (intIsAuthenticated === 0 && intIsPublicRoute === 0) {
    const dicLoginUrl = req.nextUrl.clone();
    dicLoginUrl.pathname = appRoutes.login;
    if (strPathname !== appRoutes.home) {
      dicLoginUrl.searchParams.set("redirect", strPathname);
    }
    return NextResponse.redirect(dicLoginUrl);
  }

  if (intIsAuthenticated === 1 && intIsPublicRoute === 1 && (strPathname === appRoutes.login || strPathname.startsWith("/t/"))) {
    const dicDashboardUrl = req.nextUrl.clone();
    dicDashboardUrl.pathname = appRoutes.dashboard;
    return NextResponse.redirect(dicDashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
