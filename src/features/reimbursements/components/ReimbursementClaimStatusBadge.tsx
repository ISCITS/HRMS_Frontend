"use client";

import { Chip } from "@mui/material";

import { formatStatusLabel } from "@/features/reimbursements/formatters";
import type { ReimbursementClaimStatus, ReimbursementItemStatus, ReimbursementProofStatus } from "@/features/reimbursements/types";

type StatusBadgeProps = {
  strStatus?: ReimbursementClaimStatus | ReimbursementItemStatus | ReimbursementProofStatus | string | null;
  size?: "small" | "medium";
};

function getStatusColor(strStatus?: string | null) {
  if (["approved", "partially_approved", "verified", "paid"].includes(strStatus || "")) return "success";
  if (["submitted", "resubmitted", "under_review", "locked", "pushed_to_payroll", "pending"].includes(strStatus || "")) return "warning";
  if (["rejected"].includes(strStatus || "")) return "error";
  if (["released", "proof_pending"].includes(strStatus || "")) return "info";
  return "default";
}

export default function ReimbursementClaimStatusBadge({ strStatus, size = "small" }: StatusBadgeProps) {
  return (
    <Chip
      size={size}
      color={getStatusColor(strStatus)}
      label={formatStatusLabel(strStatus)}
      sx={{ minWidth: 94, height: 30, fontWeight: 700, borderRadius: "8px" }}
    />
  );
}
