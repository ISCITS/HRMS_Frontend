import { afterEach, describe, expect, it } from "vitest";

import { getDashboardUrl, getLoginUrl, getLogoutUrl, getSessionExpiredUrl } from "@/lib/urlHelpers";

function setBasePathEnv(strValue: string) {
  process.env.NEXT_PUBLIC_BASE_PATH = strValue;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
});

describe("urlHelpers - root deployment (NEXT_PUBLIC_BASE_PATH=\"\")", () => {
  it("builds a tenant login URL", () => {
    setBasePathEnv("");
    expect(getLoginUrl("tenant-123")).toBe("/login/tenant-123");
  });

  it("falls back to the generic login route when no tenant UUID is available", () => {
    setBasePathEnv("");
    expect(getLoginUrl()).toBe("/login");
  });

  it("builds the session-expired URL", () => {
    setBasePathEnv("");
    expect(getSessionExpiredUrl()).toBe("/session-expired");
  });

  it("builds the dashboard URL", () => {
    setBasePathEnv("");
    expect(getDashboardUrl()).toBe("/dashboard");
  });

  it("builds the logout URL with the tenant UUID preserved as a query parameter", () => {
    setBasePathEnv("");
    expect(getLogoutUrl("tenant-123")).toBe("/logout?tenantUuid=tenant-123");
  });
});

describe("urlHelpers - subpath deployment (NEXT_PUBLIC_BASE_PATH=\"/example\")", () => {
  it("builds a tenant login URL under the base path", () => {
    setBasePathEnv("/example");
    expect(getLoginUrl("tenant-123")).toBe("/example/login/tenant-123");
  });

  it("builds the session-expired URL under the base path", () => {
    setBasePathEnv("/example");
    expect(getSessionExpiredUrl()).toBe("/example/session-expired");
  });

  it("carries an explicit tenant UUID on the session-expired URL", () => {
    setBasePathEnv("/example");
    expect(getSessionExpiredUrl("tenant-123")).toBe("/example/session-expired?tenantUuid=tenant-123");
  });

  it("builds the dashboard URL under the base path", () => {
    setBasePathEnv("/example");
    expect(getDashboardUrl()).toBe("/example/dashboard");
  });

  it("builds the logout URL under the base path with the query string preserved", () => {
    setBasePathEnv("/example");
    expect(getLogoutUrl("tenant-123")).toBe("/example/logout?tenantUuid=tenant-123");
  });

  it("never doubles the base path or introduces a double slash", () => {
    setBasePathEnv("/example");
    const strUrl = getLoginUrl("tenant-123");
    expect(strUrl).not.toContain("/example/example");
    expect(strUrl).not.toContain("//");
  });

  it("percent-encodes a tenant UUID containing reserved characters", () => {
    setBasePathEnv("/example");
    expect(getLoginUrl("tenant a/b")).toBe("/example/login/tenant%20a%2Fb");
    expect(getLogoutUrl("tenant a/b")).toBe("/example/logout?tenantUuid=tenant%20a%2Fb");
  });
});
