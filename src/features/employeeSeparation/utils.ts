const lstMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-12-15" (or an ISO timestamp) -> "15-Dec-2026"; empty -> "-". */
export function formatDisplayDate(strValue?: string | null): string {
  if (!strValue) return "-";
  const objMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(strValue);
  if (!objMatch) return strValue;
  return `${objMatch[3]}-${lstMonthNames[Number(objMatch[2]) - 1]}-${objMatch[1]}`;
}

/** ISO timestamp -> local "15-Dec-2026 14:05". */
export function formatDisplayDateTime(strValue?: string | null): string {
  if (!strValue) return "-";
  const dtValue = new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(strValue) ? strValue : `${strValue}Z`);
  if (Number.isNaN(dtValue.getTime())) return strValue;
  const strDate = `${String(dtValue.getDate()).padStart(2, "0")}-${lstMonthNames[dtValue.getMonth()]}-${dtValue.getFullYear()}`;
  return `${strDate} ${String(dtValue.getHours()).padStart(2, "0")}:${String(dtValue.getMinutes()).padStart(2, "0")}`;
}

/** Local date as yyyy-mm-dd. */
export function todayText(): string {
  const dtNow = new Date();
  return `${dtNow.getFullYear()}-${String(dtNow.getMonth() + 1).padStart(2, "0")}-${String(dtNow.getDate()).padStart(2, "0")}`;
}
