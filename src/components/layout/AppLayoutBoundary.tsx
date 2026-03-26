"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const publicRoutes = ["/", "/home", "/login", "/register", "/forgot-password"];
const publicPrefixes = ["/t", "/sso/callback"];

/*
Functional responsibility:
- Apply the SaaS shell only to protected application routes.

Inputs:
- Current pathname from Next navigation and route children.

Output:
- Auth routes render plain content while protected routes render inside AppShell.

Failure behavior:
- Unknown routes default to the protected shell unless they match a public prefix.
*/
export default function AppLayoutBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isTenantLoginRoute = Boolean(pathname?.startsWith("/login/"));
  const isPublicRoute =
    !pathname ||
    publicRoutes.includes(pathname) ||
    isTenantLoginRoute ||
    publicPrefixes.some((prefix) => {
      if (prefix === "/t") {
        return pathname === "/t" || pathname.startsWith("/t/");
      }

      return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
