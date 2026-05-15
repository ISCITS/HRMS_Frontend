"use client";

import { Chip } from "@mui/material";

const dicToneByStatus: Record<string, { background: string; color: string }> = {
  submitted: { background: "#dbeafe", color: "#1d4ed8" },
  under_review: { background: "#ffedd5", color: "#9a3412" },
  approved: { background: "#dcfce7", color: "#166534" },
  released: { background: "#e0f2fe", color: "#0c4a6e" },
  locked: { background: "#e2e8f0", color: "#334155" },
  rejected: { background: "#fee2e2", color: "#991b1b" },
  draft: { background: "#f1f5f9", color: "#475569" },
};

function normalizeStatus(strStatus: string) {
  return (strStatus || "draft").trim().toLowerCase().replace(/\s+/g, "_");
}

export default function ITDeclarationStatusBadge({ strStatus }: { strStatus: string }) {
  const strNormalized = normalizeStatus(strStatus);
  const objTone = dicToneByStatus[strNormalized] ?? dicToneByStatus.draft;
  return (
    <Chip
      size="small"
      label={strStatus || "Draft"}
      sx={{ fontWeight: 700, backgroundColor: objTone.background, color: objTone.color }}
    />
  );
}

