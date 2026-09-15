import { NextRequest, NextResponse } from "next/server";
import { appRoutes } from "@/config";
import { authHelpers } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const strPathname = req.nextUrl.pathname;
  const strAuthCookie = req.cookies.get(authHelpers.cookieName)?.value ?? "";
  const strTenantUUID = req.cookies.get(authHelpers.tenantCookieName)?.value?.trim() ?? "";
  const intIsAuthenticated = authHelpers.isAuthenticated(strAuthCookie) ? 1 : 0;

  const intIsStaticAsset = strPathname.includes(".") ? 1 : 0;
  if (intIsStaticAsset === 1) {
    return NextResponse.next();
  }

  const lstPublicRoutes = [appRoutes.login, appRoutes.register, appRoutes.forgotPassword, "/signup", "/session-expired", appRoutes.tenantAdminLogin];
  const blnIsTenantLoginRoute = strPathname.startsWith(`${appRoutes.login}/`);
  const blnIsAdminRoute = strPathname === appRoutes.tenantAdminBase || strPathname.startsWith(`${appRoutes.tenantAdminBase}/`);
  const intIsPublicRoute =
    lstPublicRoutes.includes(strPathname) ||
    blnIsTenantLoginRoute ||
    strPathname.startsWith("/t/") ||
    strPathname.startsWith("/sso/callback")
      ? 1
      : 0;

  if (intIsAuthenticated === 0 && blnIsAdminRoute && strPathname !== appRoutes.tenantAdminLogin) {
    const dicLoginUrl = req.nextUrl.clone();
    dicLoginUrl.pathname = appRoutes.tenantAdminLogin;
    dicLoginUrl.searchParams.set("redirect", strPathname);
    return NextResponse.redirect(dicLoginUrl);
  }

  if (intIsAuthenticated === 0 && intIsPublicRoute === 0) {
    const dicLoginUrl = req.nextUrl.clone();
    dicLoginUrl.pathname = strTenantUUID ? `${appRoutes.login}/${strTenantUUID}` : "/session-expired";
    if (strPathname !== appRoutes.home) {
      dicLoginUrl.searchParams.set("redirect", strPathname);
    }
    return NextResponse.redirect(dicLoginUrl);
  }

  if (intIsAuthenticated === 0 && strPathname === appRoutes.login) {
    const dicLoginUrl = req.nextUrl.clone();
    dicLoginUrl.pathname = strTenantUUID ? `${appRoutes.login}/${strTenantUUID}` : "/session-expired";
    return NextResponse.redirect(dicLoginUrl);
  }

  if (intIsAuthenticated === 1 && strPathname === appRoutes.tenantAdminLogin) {
    const dicDashboardUrl = req.nextUrl.clone();
    dicDashboardUrl.pathname = appRoutes.tenantAdminDashboard;
    return NextResponse.redirect(dicDashboardUrl);
  }

  if (
    intIsAuthenticated === 1 &&
    intIsPublicRoute === 1 &&
    (strPathname === appRoutes.login || strPathname.startsWith("/t/"))
  ) {
    const dicDashboardUrl = req.nextUrl.clone();
    dicDashboardUrl.pathname = appRoutes.dashboard;
    return NextResponse.redirect(dicDashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
