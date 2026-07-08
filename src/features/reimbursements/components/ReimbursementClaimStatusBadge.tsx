"use client";

import { Chip } from "@mui/material";

import { formatStatusLabel } from "@/features/reimbursements/formatters";
import { useReimbursementLabels } from "@/features/reimbursements/hooks/useReimbursementLabels";
import type { ReimbursementClaimStatus, ReimbursementItemStatus, ReimbursementProofStatus } from "@/features/reimbursements/types";

type StatusBadgeProps = {
  strStatus?: ReimbursementClaimStatus | ReimbursementItemStatus | ReimbursementProofStatus | string | null;
  size?: "small" | "medium";
};

function getStatusTextColor(strStatus?: string | null) {
  if (["approved", "partially_approved", "verified", "paid"].includes(strStatus || "")) return "#15803d";
  if (["submitted", "resubmitted", "under_review", "locked", "pushed_to_payroll", "pending"].includes(strStatus || "")) return "#b45309";
  if (["rejected"].includes(strStatus || "")) return "#b91c1c";
  if (["released", "proof_pending"].includes(strStatus || "")) return "#0369a1";
  return "#475569";
}

export default function ReimbursementClaimStatusBadge({ strStatus, size = "small" }: StatusBadgeProps) {
  const { t } = useReimbursementLabels();
  const strNormalizedStatus = (strStatus || "").toLowerCase();

  return (
    <Chip
      size={size}
      label={t(`status_${strNormalizedStatus}`, formatStatusLabel(strStatus))}
      sx={{
        minWidth: 0,
        height: 30,
        border: "none",
        backgroundColor: "transparent",
        color: getStatusTextColor(strStatus),
        justifyContent: "flex-start",
        fontWeight: 800,
        "& .MuiChip-label": { px: 0 },
      }}
    />
  );
}
