// Tenant-level app header styling (tbltenant.header_color / header_label).
// A tenant with no colour keeps the default white header; a coloured tenant (e.g. a test copy of a
// client) gets that background plus a text colour chosen for contrast, so labels stay readable.

const STR_HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/;
const STR_STORAGE_KEY = "hrms.tenantHeaderTheme";

export type TenantHeaderTheme = {
  strHeaderColor: string | null;
  strHeaderLabel: string | null;
};

export const objEmptyTenantHeaderTheme: TenantHeaderTheme = { strHeaderColor: null, strHeaderLabel: null };

export function normalizeTenantHeaderColor(strValue: string | null | undefined): string | null {
  const strTrimmed = String(strValue ?? "").trim().toUpperCase();
  if (!strTrimmed) {
    return null;
  }
  const strWithHash = strTrimmed.startsWith("#") ? strTrimmed : `#${strTrimmed}`;
  return STR_HEX_COLOR_PATTERN.test(strWithHash) ? strWithHash : null;
}

export function normalizeTenantHeaderLabel(strValue: string | null | undefined): string | null {
  const strTrimmed = String(strValue ?? "").trim();
  return strTrimmed ? strTrimmed.slice(0, 40) : null;
}

/** WCAG relative luminance → dark text on light backgrounds, white text on dark ones. */
export function getReadableTextColor(strHexColor: string): string {
  const strColor = normalizeTenantHeaderColor(strHexColor) ?? "#FFFFFF";
  const lstChannels = [1, 3, 5].map((intOffset) => {
    const fltChannel = parseInt(strColor.slice(intOffset, intOffset + 2), 16) / 255;
    return fltChannel <= 0.03928 ? fltChannel / 12.92 : ((fltChannel + 0.055) / 1.055) ** 2.4;
  });
  const fltLuminance = 0.2126 * lstChannels[0] + 0.7152 * lstChannels[1] + 0.0722 * lstChannels[2];
  // Contrast against white vs against the app's default dark text (#172b4d, luminance ≈ 0.027).
  const fltContrastWithWhite = 1.05 / (fltLuminance + 0.05);
  const fltContrastWithDark = (fltLuminance + 0.05) / (0.027 + 0.05);
  return fltContrastWithWhite >= fltContrastWithDark ? "#FFFFFF" : "#172B4D";
}

/** Border/divider colour that stays subtle on any header background. */
export function getHeaderBorderColor(strTextColor: string): string {
  return strTextColor === "#FFFFFF" ? "rgba(255, 255, 255, 0.28)" : "rgba(23, 43, 77, 0.14)";
}

export function readCachedTenantHeaderTheme(strTenantUUID: string | null | undefined): TenantHeaderTheme {
  if (!strTenantUUID || typeof window === "undefined") {
    return objEmptyTenantHeaderTheme;
  }
  try {
    const strRaw = window.sessionStorage.getItem(STR_STORAGE_KEY);
    if (!strRaw) {
      return objEmptyTenantHeaderTheme;
    }
    const dicCached = JSON.parse(strRaw) as Partial<TenantHeaderTheme> & { strTenantUUID?: string };
    if (dicCached.strTenantUUID !== strTenantUUID) {
      return objEmptyTenantHeaderTheme;
    }
    return {
      strHeaderColor: normalizeTenantHeaderColor(dicCached.strHeaderColor),
      strHeaderLabel: normalizeTenantHeaderLabel(dicCached.strHeaderLabel),
    };
  } catch {
    return objEmptyTenantHeaderTheme;
  }
}

export function writeCachedTenantHeaderTheme(strTenantUUID: string | null | undefined, objTheme: TenantHeaderTheme): void {
  if (!strTenantUUID || typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(STR_STORAGE_KEY, JSON.stringify({ strTenantUUID, ...objTheme }));
  } catch {
    // Storage can be unavailable (private mode / quota); the header still renders from the API.
  }
}
