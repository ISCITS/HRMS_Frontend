"use client";

import { Box } from "@mui/material";
import type { FNFSettlementStatus } from "@/features/payroll/types";

const dicTone: Record<FNFSettlementStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#e2e8f0", fg: "#475569", label: "Draft" },
  calculated: { bg: "#dbeafe", fg: "#1d4ed8", label: "Calculated" },
  under_review: { bg: "#ffedd5", fg: "#c2410c", label: "Under Review" },
  released: { bg: "#ede9fe", fg: "#6d28d9", label: "Released" },
  approved: { bg: "#dcfce7", fg: "#15803d", label: "Approved" },
  locked: { bg: "#ccfbf1", fg: "#0f766e", label: "Locked" },
  paid: { bg: "#dcfce7", fg: "#166534", label: "Paid" },
  recovered: { bg: "#fef3c7", fg: "#a16207", label: "Recovered" },
  cancelled: { bg: "#fee2e2", fg: "#b91c1c", label: "Cancelled" },
};

export default function FNFStatusBadge({ strStatus }: { strStatus: FNFSettlementStatus }) {
  const dicCurrent = dicTone[strStatus] ?? dicTone.draft;
  return (
    <Box component="span" sx={{ bgcolor: dicCurrent.bg, color: dicCurrent.fg, border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: 999, display: "inline-flex", fontSize: "0.76rem", fontWeight: 800, px: 1.2, py: 0.55 }}>
      {dicCurrent.label}
    </Box>
  );
}
