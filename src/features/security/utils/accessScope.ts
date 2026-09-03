const setAccessScopes = new Set(["none", "self", "team", "custom", "all"]);

export function normalizeAccessScope(strScope: string | null | undefined): string {
  const strNormalized = String(strScope ?? "").trim().toLowerCase();

  if (setAccessScopes.has(strNormalized)) {
    return strNormalized;
  }

  if (["own", "owner", "employee", "user", "mine", "my"].includes(strNormalized)) {
    return "self";
  }

  if (["manager", "managers", "department", "dept", "reportees", "subordinates"].includes(strNormalized)) {
    return "team";
  }

  if (["company", "tenant", "global", "full", "admin", "administrator"].includes(strNormalized)) {
    return "all";
  }

  if (["deny", "denied", "false", "0", "no", ""].includes(strNormalized)) {
    return "none";
  }

  return "self";
}
