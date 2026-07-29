"use client";

import { Chip } from "@mui/material";

import type { LookupOption } from "@/features/attendance-regularization/types/AttendanceRegularizationTypes";

export function lookupLabel(lstOptions: LookupOption[], strCode?: string | null, strFallback = "—") {
  const strNormalizedCode = strCode?.trim().toUpperCase();
  return lstOptions.find((objOption) => objOption.strValueCode.trim().toUpperCase() === strNormalizedCode)?.strDisplayName ?? strFallback;
}

export default function LookupChip({
  lstOptions,
  strCode,
  strFallback,
}: {
  lstOptions: LookupOption[];
  strCode?: string | null;
  strFallback: string;
}) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={lookupLabel(lstOptions, strCode, strFallback)}
      icon={<span aria-hidden="true">●</span>}
      sx={{ fontWeight: 750, "& .MuiChip-icon": { fontSize: 10, color: "primary.main" } }}
    />
  );
}
