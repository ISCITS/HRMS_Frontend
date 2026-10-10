import { afterEach, describe, expect, it } from "vitest";

import { withBasePath } from "@/lib/basePath";
import { resolveLogoutRedirectPath } from "./route";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_BASE_PATH;
});

describe("resolveLogoutRedirectPath", () => {
  it("targets the tenant login route when a tenant UUID is present", () => {
    expect(resolveLogoutRedirectPath("tenant-123")).toBe("/login/tenant-123");
  });

  it("falls back to session-expired when no tenant UUID is present", () => {
    expect(resolveLogoutRedirectPath("")).toBe("/session-expired");
  });
});

describe("logout Location header (resolveLogoutRedirectPath + withBasePath)", () => {
  it("stays root-relative for a root deployment", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "";
    expect(withBasePath(resolveLogoutRedirectPath("tenant-123"))).toBe("/login/tenant-123");
  });

  it("carries the configured base path for a subpath deployment", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/example";
    expect(withBasePath(resolveLogoutRedirectPath("tenant-123"))).toBe("/example/login/tenant-123");
    expect(withBasePath(resolveLogoutRedirectPath(""))).toBe("/example/session-expired");
  });
});
