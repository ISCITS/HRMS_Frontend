export function isCtcProvisionCategory(category: string | null | undefined): boolean {
  return String(category ?? "").toLowerCase().replace(/[\s_-]+/g, "") === "ctcprovision";
}
