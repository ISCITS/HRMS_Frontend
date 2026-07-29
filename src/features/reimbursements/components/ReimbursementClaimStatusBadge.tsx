"use client";

import { Chip } from "@mui/material";

import { formatStatusLabel } from "@/features/reimbursements/formatters";
import { useReimbursementLabels } from "@/features/reimbursements/hooks/useReimbursementLabels";
import type { ReimbursementClaimStatus, ReimbursementItemStatus, ReimbursementProofStatus } from "@/features/reimbursements/types";

type StatusBadgeProps = {
  strStatus?: ReimbursementClaimStatus | ReimbursementItemStatus | ReimbursementProofStatus | string | null;
  size?: "small" | "medium";
  strTextColorOverride?: string;
};

function getStatusBackgroundColor(strStatus?: string | null) {
  if (["approved", "partially_approved", "verified", "paid"].includes(strStatus || "")) return "#dcfce7";
  if (["submitted", "resubmitted", "under_review", "locked", "pushed_to_payroll", "pending"].includes(strStatus || "")) return "#fef3e2";
  if (["rejected"].includes(strStatus || "")) return "#fee2e2";
  if (["released", "proof_pending"].includes(strStatus || "")) return "#e0f2fe";
  return "#e2e8f0";
}

function getStatusTextColor(strStatus?: string | null) {
  if (["approved", "partially_approved", "verified", "paid"].includes(strStatus || "")) return "#15803d";
  if (["submitted", "resubmitted", "under_review", "locked", "pushed_to_payroll", "pending"].includes(strStatus || "")) return "#b45309";
  if (["rejected"].includes(strStatus || "")) return "#b91c1c";
  if (["released", "proof_pending"].includes(strStatus || "")) return "#0369a1";
  return "#475569";
}

export default function ReimbursementClaimStatusBadge({ strStatus, size = "small", strTextColorOverride }: StatusBadgeProps) {
  const { t } = useReimbursementLabels();
  const strNormalizedStatus = (strStatus || "").toLowerCase();

  return (
    <Chip
      size={size}
      label={t(`status_${strNormalizedStatus}`, formatStatusLabel(strStatus))}
      sx={{
        minWidth: 0,
        height: 32,
        border: "none",
        backgroundColor: getStatusBackgroundColor(strStatus),
        color: strTextColorOverride ?? getStatusTextColor(strStatus),
        justifyContent: "flex-start",
        fontWeight: 800,
        borderRadius: "999px",
        "& .MuiChip-label": { px: 1.75 },
      }}
    />
  );
}
