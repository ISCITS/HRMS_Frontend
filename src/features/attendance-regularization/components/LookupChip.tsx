"use client";

import { Chip } from "@mui/material";

import type { LookupOption } from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";

export function lookupLabel(lstOptions: LookupOption[], strCode?: string | null, strFallback = "-") {
  const strNormalizedCode = strCode?.trim().toUpperCase();
  return lstOptions.find((objOption) => objOption.strValueCode.trim().toUpperCase() === strNormalizedCode)?.strDisplayName ?? strFallback;
}

// Timeline action codes (CREATED, SUBMITTED, SENT_BACK, ...) are not seeded in the
// ATTENDANCE_REGULARIZATION_ACTION lookup, so fall back to a label derived from the code itself
// instead of a generic "Action" that hides what actually happened.
export function actionLabel(lstOptions: LookupOption[], strCode: string | null | undefined, t: (strKey: string, strFallback: string) => string) {
  const strNormalizedCode = strCode?.trim().toUpperCase() ?? "";
  if (!strNormalizedCode) return t("action", "Action");
  const strHumanized = strNormalizedCode.toLowerCase().split("_").map((strWord) => strWord.charAt(0).toUpperCase() + strWord.slice(1)).join(" ");
  return lookupLabel(lstOptions, strNormalizedCode, t(`action_${strNormalizedCode.toLowerCase()}`, strHumanized));
}

export default function LookupChip({
  lstOptions,
  strCode,
  strFallback,
  blnHideIcon = false,
}: {
  lstOptions: LookupOption[];
  strCode?: string | null;
  strFallback: string;
  blnHideIcon?: boolean;
}) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={lookupLabel(lstOptions, strCode, strFallback)}
      icon={blnHideIcon ? undefined : <span aria-hidden="true">•</span>}
      sx={{ fontWeight: 750, "& .MuiChip-icon": { fontSize: 10, color: "primary.main" } }}
    />
  );
}
