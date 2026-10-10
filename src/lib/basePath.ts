/*
Functional responsibility:
- Single source of truth for the deployment base path (the subpath, if any, the
  app is hosted under, e.g. "/example" when served at https://host/example/).
- Normalize NEXT_PUBLIC_BASE_PATH once so every consumer (next.config.ts,
  middleware, pages, route handlers) agrees on the same value and format.

Inputs:
- process.env.NEXT_PUBLIC_BASE_PATH. Empty/undefined means the app is hosted
  at the domain root. Any non-empty value is normalized to "/segment[/segment...]"
  with no trailing slash.

Output:
- getBasePath(): the normalized base path ("" for root deployments).
- withBasePath(path): a root-relative path prefixed with the base path, safe to
  hand to window.location.*, a raw <a>/<img> tag, fetch() against this app's
  own routes, or a manually built Location header.
- stripBasePath(pathname): the inverse, for values read back from the browser
  (e.g. window.location.pathname) that need to be compared against logical,
  basePath-agnostic routes such as those returned by usePathname().

Failure behavior:
- Malformed input ("//abc//", "abc" without a leading slash, a lone "/") is
  normalized rather than rejected, so a misconfigured env value degrades to a
  sane path instead of producing duplicated or missing slashes.
*/

export function normalizeBasePath(strValue: string | null | undefined): string {
  const strTrimmed = (strValue ?? "").trim();
  if (!strTrimmed || strTrimmed === "/") {
    return "";
  }

  const strCollapsed = strTrimmed.replace(/\/+/g, "/");
  const strWithLeadingSlash = strCollapsed.startsWith("/") ? strCollapsed : `/${strCollapsed}`;
  const strWithoutTrailingSlash = strWithLeadingSlash.replace(/\/+$/, "");

  return strWithoutTrailingSlash;
}

export function getBasePath(): string {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
}

function normalizeAppPath(strPath: string): string {
  const strTrimmed = (strPath ?? "").trim();
  if (!strTrimmed || strTrimmed === "/") {
    return "/";
  }

  const strWithLeadingSlash = strTrimmed.startsWith("/") ? strTrimmed : `/${strTrimmed}`;
  return strWithLeadingSlash.replace(/\/+/g, "/");
}

export function withBasePath(strPath: string): string {
  const strBasePath = getBasePath();
  const strNormalizedPath = normalizeAppPath(strPath);

  if (!strBasePath) {
    return strNormalizedPath;
  }

  // Idempotent: a path that already carries the base path (e.g. a value
  // round-tripped through window.location.pathname) is returned unchanged
  // instead of being prefixed a second time.
  if (strNormalizedPath === strBasePath || strNormalizedPath.startsWith(`${strBasePath}/`)) {
    return strNormalizedPath;
  }

  return strNormalizedPath === "/" ? strBasePath : `${strBasePath}${strNormalizedPath}`;
}

export function stripBasePath(strPathname: string): string {
  const strBasePath = getBasePath();
  const strNormalizedPathname = normalizeAppPath(strPathname);

  if (!strBasePath) {
    return strNormalizedPathname;
  }

  if (strNormalizedPathname === strBasePath) {
    return "/";
  }

  if (strNormalizedPathname.startsWith(`${strBasePath}/`)) {
    return strNormalizedPathname.slice(strBasePath.length) || "/";
  }

  return strNormalizedPathname;
}
