"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { authHelpers } from "@/lib/auth";
import { getPostLoginRoute } from "@/lib/menu";
import { isAuthRedirectRoute, isPublicAppRoute, readAuthenticatedRouteHistory } from "@/lib/routeAccess";

/*
Functional responsibility:
- Apply the SaaS shell only to protected application routes.
- When the browser back/forward button restores a login-style route from
  Next's client-side route cache (no server round-trip, so middleware never
  runs), bounce an already-authenticated user back instead of showing it.
  A typed URL, refresh, or in-app link to a login route is a deliberate
  navigation and is left alone (e.g. tenant login resetting the session).

Inputs:
- Current pathname from Next navigation and route children.

Output:
- Auth routes render plain content while protected routes render inside AppShell.
- An authenticated user reaching a login-style route via back/forward is bounced
  to their last authenticated route (or the default post-login route).

Failure behavior:
- Unknown routes default to the protected shell unless they match a public prefix.
*/
export default function AppLayoutBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = !pathname || isPublicAppRoute(pathname);

  // The pathname a browser back/forward navigation most recently landed on,
  // captured straight from window.location.pathname (ahead of Next's own
  // usePathname() update) so it's visible in the very same render as the new
  // pathname. Cleared once rendering has moved past that pathname, following
  // React's "adjust state while rendering" pattern instead of an effect, so
  // there is never a committed render where the login route's children mount.
  const [strBackForwardPathname, setStrBackForwardPathname] = useState<string | null>(null);
  const [strPathnameAtLastRender, setStrPathnameAtLastRender] = useState(pathname);

  if (pathname !== strPathnameAtLastRender) {
    setStrPathnameAtLastRender(pathname);
    if (strBackForwardPathname && pathname !== strBackForwardPathname) {
      setStrBackForwardPathname(null);
    }
  }

  useEffect(() => {
    function handlePopState() {
      setStrBackForwardPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const shouldRedirectAuthenticatedAway =
    Boolean(pathname) &&
    pathname === strBackForwardPathname &&
    isAuthRedirectRoute(pathname) &&
    Boolean(authHelpers.getAccessToken());

  useEffect(() => {
    if (!shouldRedirectAuthenticatedAway) {
      return;
    }

    const lstAuthenticatedRoutes = readAuthenticatedRouteHistory();
    const strTargetRoute = lstAuthenticatedRoutes[lstAuthenticatedRoutes.length - 1] || getPostLoginRoute();
    router.replace(strTargetRoute);
  }, [router, shouldRedirectAuthenticatedAway]);

  if (shouldRedirectAuthenticatedAway) {
    return null;
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
