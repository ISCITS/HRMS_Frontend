"use client";

import { Box } from "@mui/material";

// Separation state is not employment state: "Active" means the separation is in force (regular payroll
// excluded per policy), not that the employee has left.
const dicTone: Record<string, { bg: string; fg: string; label: string }> = {
  DRAFT: { bg: "#e2e8f0", fg: "#475569", label: "Draft" },
  ACTIVATED: { bg: "#dbeafe", fg: "#1d4ed8", label: "Active" },
  COMPLETED: { bg: "#dcfce7", fg: "#166534", label: "Completed" },
  CANCELLED: { bg: "#fee2e2", fg: "#b91c1c", label: "Cancelled" },
};

const dicFnfTone: Record<string, { bg: string; fg: string; label: string }> = {
  not_initiated: { bg: "#f1f5f9", fg: "#64748b", label: "Not Initiated" },
  draft: { bg: "#e2e8f0", fg: "#475569", label: "Draft" },
  calculated: { bg: "#dbeafe", fg: "#1d4ed8", label: "Calculated" },
  under_review: { bg: "#ffedd5", fg: "#c2410c", label: "Under Review" },
  released: { bg: "#ede9fe", fg: "#6d28d9", label: "Released" },
  approved: { bg: "#dcfce7", fg: "#15803d", label: "Approved" },
  locked: { bg: "#ccfbf1", fg: "#0f766e", label: "Locked" },
  paid: { bg: "#dcfce7", fg: "#166534", label: "Paid" },
  recovered: { bg: "#fef3c7", fg: "#a16207", label: "Recovered" },
};

function Badge({ objTone }: { objTone: { bg: string; fg: string; label: string } }) {
  return (
    <Box component="span" sx={{ bgcolor: objTone.bg, color: objTone.fg, border: "1px solid rgba(148, 163, 184, 0.18)", borderRadius: 999, display: "inline-flex", fontSize: "0.76rem", fontWeight: 800, px: 1.2, py: 0.55, whiteSpace: "nowrap" }}>
      {objTone.label}
    </Box>
  );
}

export function SeparationStatusBadge({ strStatus }: { strStatus: string }) {
  return <Badge objTone={dicTone[strStatus] ?? { bg: "#e2e8f0", fg: "#475569", label: strStatus }} />;
}

export function SeparationFnfStatusBadge({ strStatus }: { strStatus: string }) {
  return <Badge objTone={dicFnfTone[strStatus] ?? { bg: "#e2e8f0", fg: "#475569", label: strStatus }} />;
}
