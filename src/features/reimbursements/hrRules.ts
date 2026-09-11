import type { ReimbursementClaimDto } from "@/features/reimbursements/types";

export function isHrReimbursementTerminal(strStatus?: string | null) {
  // Purpose: Keeps HR action controls disabled after payroll lock/push/payment states.
  return ["locked", "pushed_to_payroll", "paid"].includes(strStatus || "");
}

export function canStartReimbursementReview(strStatus?: string | null) {
  // Purpose: Allows HR review to start only after employee submission/resubmission.
  return ["submitted", "resubmitted"].includes(strStatus || "");
}

export function canLockReimbursementClaim(strStatus?: string | null) {
  // Purpose: Mirrors backend lock rule for approved and partially approved claims.
  return ["approved", "partially_approved"].includes(strStatus || "");
}

export function canPushReimbursementClaim(strStatus?: string | null) {
  // Purpose: Push-to-payroll is allowed after approval or lock, before terminal paid state.
  return ["approved", "partially_approved", "locked"].includes(strStatus || "");
}

export function claimHasProofPending(objClaim: ReimbursementClaimDto) {
  // Purpose: Helps filters and lock readiness show blocking proof pending items.
  return (objClaim.lstItems ?? []).some((objItem) => objItem.strItemStatus === "proof_pending" || (objItem.blnProofRequired && objItem.lstProofs.every((objProof) => objProof.strVerificationStatus !== "verified")));
}
