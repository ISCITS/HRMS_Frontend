"use client";

import { Box } from "@mui/material";
import type { FNFSettlementStatus } from "@/features/payroll/types";

const dicTone: Record<FNFSettlementStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#64748b", fg: "#fff", label: "Draft" },
  calculated: { bg: "#2563eb", fg: "#fff", label: "Calculated" },
  under_review: { bg: "#ea580c", fg: "#fff", label: "Under Review" },
  released: { bg: "#7c3aed", fg: "#fff", label: "Released" },
  approved: { bg: "#16a34a", fg: "#fff", label: "Approved" },
  locked: { bg: "#0f766e", fg: "#fff", label: "Locked" },
  paid: { bg: "#15803d", fg: "#fff", label: "Paid" },
  recovered: { bg: "#92400e", fg: "#fff", label: "Recovered" },
  cancelled: { bg: "#991b1b", fg: "#fff", label: "Cancelled" },
};

export default function FNFStatusBadge({ strStatus }: { strStatus: FNFSettlementStatus }) {
  const dicCurrent = dicTone[strStatus] ?? dicTone.draft;
  return (
    <Box component="span" sx={{ bgcolor: dicCurrent.bg, color: dicCurrent.fg, borderRadius: 999, display: "inline-flex", fontSize: "0.76rem", fontWeight: 800, px: 1.2, py: 0.55 }}>
      {dicCurrent.label}
    </Box>
  );
}
