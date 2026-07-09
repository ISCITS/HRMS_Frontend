"use client";

import { Chip } from "@mui/material";

const dicToneByStatus: Record<string, { background: string; color: string }> = {
  submitted: { background: "#dbeafe", color: "#1d4ed8" },
  under_review: { background: "#ffedd5", color: "#9a3412" },
  proof_pending: { background: "#fef3c7", color: "#92400e" },
  approved: { background: "#dcfce7", color: "#166534" },
  partially_approved: { background: "#ecfccb", color: "#3f6212" },
  released: { background: "#e0f2fe", color: "#0c4a6e" },
  resubmitted: { background: "#ede9fe", color: "#5b21b6" },
  locked: { background: "#e2e8f0", color: "#334155" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
  draft: { background: "#f1f5f9", color: "#475569" },
};

function normalizeStatus(strStatus: string) {
  return (strStatus || "draft").trim().toLowerCase().replace(/\s+/g, "_");
}

export default function ITDeclarationStatusBadge({ strStatus, strLabel }: { strStatus: string; strLabel?: string }) {
  const strNormalized = normalizeStatus(strStatus);
  const objTone = dicToneByStatus[strNormalized] ?? dicToneByStatus.draft;
  return (
    <Chip
      size="small"
      label={strLabel || strStatus || "Draft"}
      sx={{ fontWeight: 700, backgroundColor: objTone.background, color: objTone.color }}
    />
  );
}
