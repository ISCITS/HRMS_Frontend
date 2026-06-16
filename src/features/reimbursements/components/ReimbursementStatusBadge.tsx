"use client";

import ReimbursementClaimStatusBadge from "@/features/reimbursements/components/ReimbursementClaimStatusBadge";

export default function ReimbursementStatusBadge({ strStatus }: { strStatus?: string | null }) {
  return <ReimbursementClaimStatusBadge strStatus={strStatus} />;
}
