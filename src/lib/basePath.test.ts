import { afterEach, describe, expect, it } from "vitest";

import { getBasePath, normalizeBasePath, stripBasePath, withBasePath } from "@/lib/basePath";

function setBasePathEnv(strValue: string | undefined) {
  if (strValue === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = strValue;
  }
}

afterEach(() => {
  setBasePathEnv(undefined);
});

describe("normalizeBasePath", () => {
  it.each([
    ["", ""],
    ["/", ""],
    ["abc", "/abc"],
    ["/abc", "/abc"],
    ["/abc/", "/abc"],
    ["//abc//", "/abc"],
  ])("normalizes %j to %j", (strInput, strExpected) => {
    expect(normalizeBasePath(strInput)).toBe(strExpected);
  });

  it("treats undefined/null the same as an empty string (root deployment)", () => {
    expect(normalizeBasePath(undefined)).toBe("");
    expect(normalizeBasePath(null)).toBe("");
  });
});

describe("getBasePath", () => {
  it("reflects NEXT_PUBLIC_BASE_PATH at call time", () => {
    setBasePathEnv(undefined);
    expect(getBasePath()).toBe("");

    setBasePathEnv("/example");
    expect(getBasePath()).toBe("/example");

    setBasePathEnv("//example//");
    expect(getBasePath()).toBe("/example");
  });
});

describe("withBasePath - root deployment", () => {
  it("returns paths unchanged when no base path is configured", () => {
    setBasePathEnv("");
    expect(withBasePath("/dashboard")).toBe("/dashboard");
    expect(withBasePath("/login/abc")).toBe("/login/abc");
    expect(withBasePath("/")).toBe("/");
  });
});

describe("withBasePath - subpath deployment", () => {
  it("prefixes root-relative paths with the base path", () => {
    setBasePathEnv("/example");
    expect(withBasePath("/dashboard")).toBe("/example/dashboard");
    expect(withBasePath("/login/abc")).toBe("/example/login/abc");
    expect(withBasePath("/")).toBe("/example");
  });

  it("adds a leading slash when the input path is missing one", () => {
    setBasePathEnv("/example");
    expect(withBasePath("dashboard")).toBe("/example/dashboard");
  });

  it("never produces a double slash", () => {
    setBasePathEnv("/example");
    expect(withBasePath("//dashboard//details")).not.toContain("//");
  });

  it("is idempotent: does not duplicate the base path on a second call", () => {
    setBasePathEnv("/example");
    const strOnce = withBasePath("/dashboard");
    expect(withBasePath(strOnce)).toBe(strOnce);
    expect(withBasePath(strOnce)).not.toContain("/example/example");
  });

  it("preserves query strings appended to the path", () => {
    setBasePathEnv("/example");
    expect(withBasePath("/logout?tenantUuid=abc-123")).toBe("/example/logout?tenantUuid=abc-123");
  });
});

describe("stripBasePath", () => {
  it("is a no-op for root deployments", () => {
    setBasePathEnv("");
    expect(stripBasePath("/dashboard")).toBe("/dashboard");
  });

  it("removes a configured base path from a pathname", () => {
    setBasePathEnv("/example");
    expect(stripBasePath("/example/dashboard")).toBe("/dashboard");
    expect(stripBasePath("/example")).toBe("/");
  });

  it("leaves a pathname without the base path unchanged", () => {
    setBasePathEnv("/example");
    expect(stripBasePath("/dashboard")).toBe("/dashboard");
  });
});
