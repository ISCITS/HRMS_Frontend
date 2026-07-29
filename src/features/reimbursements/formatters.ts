export function formatCurrency(decValue?: number | null) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, decValue || 0))}`;
}

export function formatDateLabel(strDate?: string | null) {
  if (!strDate) return "-";
  const objDate = new Date(strDate);
  if (Number.isNaN(objDate.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(objDate);
}

export function toInputDate(strDate?: string | null) {
  if (!strDate) return "";
  return strDate.slice(0, 10);
}

export function formatStatusLabel(strStatus?: string | null) {
  return (strStatus || "-")
    .split("_")
    .map((strPart) => strPart.charAt(0).toUpperCase() + strPart.slice(1))
    .join(" ");
}

export function normalizeReimbursementLabelKey(strValue?: string | null) {
  return (strValue || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function translateKnownReimbursementText(
  strValue: string | null | undefined,
  t: (strKey: string, strFallback?: string) => string
) {
  const strLabel = (strValue || "").trim();
  if (!strLabel) {
    return "-";
  }
  const strKey = normalizeReimbursementLabelKey(strLabel);
  return strKey ? t(strKey, strLabel) : strLabel;
}
