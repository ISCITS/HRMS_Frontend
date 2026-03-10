import { NextRequest, NextResponse } from "next/server";

// Enforces route-level authentication using a lightweight auth cookie.
export function middleware(req: NextRequest) {
  // Functional responsibility:
  // - Guard application routes so unauthenticated users cannot access protected pages.
  // Inputs:
  // - NextRequest with pathname + cookies.
  // Output:
  // - NextResponse.next() for allowed requests or redirect response for blocked paths.
  // Failure behavior:
  // - Missing/invalid auth cookie is treated as unauthenticated and redirected to /login.
  const strPathname = req.nextUrl.pathname;
  const strAuthCookie = req.cookies.get("hrms_auth")?.value ?? "";
  const intIsAuthenticated = strAuthCookie === "1" ? 1 : 0;

  // Skips auth checks for static assets from /public or files with extensions.
  const intIsStaticAsset = strPathname.includes(".") ? 1 : 0;
  if (intIsStaticAsset === 1) {
    return NextResponse.next();
  }

  const lstPublicRoutes = ["/login", "/signup", "/forgot-password"];
  const intIsPublicRoute = lstPublicRoutes.includes(strPathname) ? 1 : 0;

  if (intIsAuthenticated === 0 && intIsPublicRoute === 0) {
    const dicLoginUrl = req.nextUrl.clone();
    dicLoginUrl.pathname = "/login";
    return NextResponse.redirect(dicLoginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
