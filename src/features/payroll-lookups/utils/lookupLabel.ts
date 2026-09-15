function toTitleCase(strValue: string) {
  return strValue
    .split(" ")
    .filter(Boolean)
    .map((strToken) => strToken.charAt(0).toUpperCase() + strToken.slice(1).toLowerCase())
    .join(" ");
}

export function normalizeLookupText(strValue: string | null | undefined) {
  return String(strValue ?? "").trim();
}

export function humanizeLookupCode(strValue: string | null | undefined) {
  const strNormalizedValue = normalizeLookupText(strValue).replace(/[_-]+/g, " ");
  return strNormalizedValue ? toTitleCase(strNormalizedValue) : "";
}

export function resolveLookupDisplayLabel(objValue: {
  strDisplayName?: string | null;
  strLegacyValue?: string | null;
  strValueCode?: string | null;
  strFallbackLabel?: string | null;
}) {
  const strDisplayName = normalizeLookupText(objValue.strDisplayName);
  if (strDisplayName) {
    return strDisplayName;
  }

  const strLegacyValue = normalizeLookupText(objValue.strLegacyValue);
  if (strLegacyValue) {
    return strLegacyValue;
  }

  const strFallbackLabel = normalizeLookupText(objValue.strFallbackLabel);
  if (strFallbackLabel) {
    return strFallbackLabel;
  }

  return humanizeLookupCode(objValue.strValueCode);
}
