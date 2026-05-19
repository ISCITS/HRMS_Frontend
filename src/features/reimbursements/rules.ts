import type { ReimbursementClaimDto, ReimbursementClaimItemDto, ReimbursementClaimStatus } from "./types";

export const lstEmployeeEditableClaimStatuses: ReimbursementClaimStatus[] = ["draft", "released"];
export const lstEmployeeWithdrawableClaimStatuses: ReimbursementClaimStatus[] = ["submitted", "resubmitted"];

export function canEditReimbursementClaim(strStatus?: string | null) {
  // Purpose: Keeps employee edit gates aligned with the backend business rule for draft/released claims.
  return lstEmployeeEditableClaimStatuses.includes((strStatus || "").trim().toLowerCase() as ReimbursementClaimStatus);
}

export function canWithdrawReimbursementClaim(strStatus?: string | null) {
  // Purpose: Shows withdraw only before HR has moved the claim into review.
  return lstEmployeeWithdrawableClaimStatuses.includes((strStatus || "").trim().toLowerCase() as ReimbursementClaimStatus);
}

export function getMissingProofItems(objClaim: ReimbursementClaimDto | null | undefined) {
  // Purpose: Finds proof-required items without uploads so submit can explain the blocking rule.
  return (objClaim?.lstItems ?? []).filter((objItem) => objItem.blnProofRequired && objItem.lstProofs.length === 0);
}

export function isPayrollVisibleStatus(strStatus?: string | null) {
  // Purpose: Highlights statuses that indicate the reimbursement has entered payroll processing.
  return ["locked", "pushed_to_payroll", "paid"].includes(strStatus || "");
}

export function getItemDisplayName(objItem: ReimbursementClaimItemDto, strCategoryName?: string) {
  // Purpose: Provides a stable label for item rows when a category name is unavailable.
  return strCategoryName || objItem.strExpenseDescription || `Item #${objItem.intID}`;
}
