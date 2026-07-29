"use client";

import { Chip } from "@mui/material";
import type { LoanAdvanceStatus } from "@/features/payroll/types";

const dicStatusColor: Record<LoanAdvanceStatus, { strBg: string; strColor: string }> = {
  draft: { strBg: "#e2e8f0", strColor: "#334155" },
  sent_back: { strBg: "#fef3c7", strColor: "#92400e" },
  pending_approval: { strBg: "#dbeafe", strColor: "#1d4ed8" },
  approved: { strBg: "#dcfce7", strColor: "#166534" },
  disbursed: { strBg: "#ccfbf1", strColor: "#0f766e" },
  active: { strBg: "#dcfce7", strColor: "#166534" },
  closed: { strBg: "#e0e7ff", strColor: "#3730a3" },
  rejected: { strBg: "#fee2e2", strColor: "#b91c1c" },
  cancelled: { strBg: "#f1f5f9", strColor: "#475569" },
};

export function formatLoanAdvanceStatus(strStatus?: string | null) {
  return (strStatus || "-").replaceAll("_", " ").replace(/\b\w/g, (strChar) => strChar.toUpperCase());
}

export default function LoanAdvanceStatusBadge({
  strStatus,
  t,
}: {
  strStatus?: string | null;
  t?: (strKey: string, strFallback?: string) => string;
}) {
  const objTone = dicStatusColor[(strStatus || "draft") as LoanAdvanceStatus] || dicStatusColor.draft;
  const strLabel = strStatus ? t?.(`status_${strStatus}`, formatLoanAdvanceStatus(strStatus)) ?? formatLoanAdvanceStatus(strStatus) : "-";
  return (
    <Chip
      size="small"
      label={strLabel}
      sx={{ height: 24, borderRadius: "999px", fontWeight: 800, backgroundColor: objTone.strBg, color: objTone.strColor }}
    />
  );
}
