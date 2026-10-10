import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { middleware } from "./middleware";

/*
Scope note: a standalone NextRequest built outside a running Next server has
no basePath context, so these tests exercise middleware's decision logic in
logical (basePath-agnostic) path space only - exactly the space middleware
already operates in, since req.nextUrl.pathname strips the base path and
req.nextUrl.clone() re-applies it automatically (see middleware.ts). Base-path
prefixing itself is covered by basePath.test.ts / urlHelpers.test.ts.
*/

function buildRequest(strPathname: string, dicCookies: Record<string, string> = {}) {
  const objUrl = new URL(strPathname, "http://localhost:3000");
  const objRequest = new NextRequest(objUrl);
  for (const [strName, strValue] of Object.entries(dicCookies)) {
    objRequest.cookies.set(strName, strValue);
  }
  return objRequest;
}

describe("middleware - unauthenticated redirects", () => {
  it("redirects to the tenant login route when a tenant cookie is present", () => {
    const objResponse = middleware(buildRequest("/dashboard", { hrms_tenant_uuid: "tenant-123" }));
    const objLocation = new URL(objResponse.headers.get("location") ?? "", "http://localhost:3000");

    expect(objResponse.status).toBe(307);
    expect(objLocation.pathname).toBe("/login/tenant-123");
    expect(objLocation.searchParams.get("redirect")).toBe("/dashboard");
  });

  it("redirects to session-expired when no tenant cookie is present", () => {
    const objResponse = middleware(buildRequest("/dashboard"));
    const objLocation = new URL(objResponse.headers.get("location") ?? "", "http://localhost:3000");

    expect(objLocation.pathname).toBe("/session-expired");
  });

  it("does not redirect a public route unrelated to login", () => {
    const objResponse = middleware(buildRequest("/register"));
    expect(objResponse.headers.get("location")).toBeNull();
  });

  it("redirects the generic /login route itself to the tenant/session-expired route when unauthenticated", () => {
    const objResponse = middleware(buildRequest("/login", { hrms_tenant_uuid: "tenant-123" }));
    const objLocation = new URL(objResponse.headers.get("location") ?? "", "http://localhost:3000");
    expect(objLocation.pathname).toBe("/login/tenant-123");
  });
});

describe("middleware - authenticated requests", () => {
  it("passes an authenticated request on protected routes through unchanged", () => {
    const objResponse = middleware(buildRequest("/dashboard", { hrms_access_token: "token" }));
    expect(objResponse.headers.get("location")).toBeNull();
  });

  it("bounces an authenticated user away from the generic login route to the dashboard", () => {
    const objResponse = middleware(buildRequest("/login", { hrms_access_token: "token" }));
    const objLocation = new URL(objResponse.headers.get("location") ?? "", "http://localhost:3000");
    expect(objLocation.pathname).toBe("/dashboard");
  });
});
