import type { RunArrearsRecord } from "@/features/payroll/types";

export type ArrearTabSummary = { intEmployeeCount: number; blnReviewPending: boolean };

const PAYING_STATUSES = ["PAYABLE", "PAID"];

/** The run's "Review Arrears" tab: salary runs only, once the run is Processed or Finalized. */
export function shouldShowArrearsTab(strRunStatus: string | null | undefined, strRunTypeCode: string | null | undefined): boolean {
  return ["PROCESSED", "FINALIZED"].includes(String(strRunStatus || "").toUpperCase()) && strRunTypeCode !== "VARIABLE_PAY";
}

export function isRunFinalizedForArrears(strRunStatus: string | null | undefined): boolean {
  return ["FINALIZED", "CANCELLED"].includes(String(strRunStatus || "").toUpperCase());
}

/** True when automatic arrears are only being previewed (nothing in this run is paid). */
export function isArrearPreview(objData: RunArrearsRecord): boolean {
  return !objData.lstEmployees.some((objItem) => PAYING_STATUSES.includes(objItem.strStatus));
}

/** Totals shown in the tab header. Held employees are not paid in this run, so they are left out. */
export function getArrearTotals(objData: RunArrearsRecord): { decArrearTotal: number; decRecoveryTotal: number } {
  return objData.lstEmployees.reduce(
    (dicSum, objItem) =>
      objItem.blnHeld
        ? dicSum
        : {
            decArrearTotal: dicSum.decArrearTotal + Number(objItem.decArrearAmount || 0),
            decRecoveryTotal: dicSum.decRecoveryTotal + Number(objItem.decRecoveryAmount || 0),
          },
    { decArrearTotal: 0, decRecoveryTotal: 0 },
  );
}

/**
 * Tab badge: how many employees have arrears, and whether "Mark arrears reviewed" is still
 * needed (same rule as the server's finalize gate: setting on, arrears being paid, not yet
 * acknowledged, run not finalized).
 */
export function getArrearTabSummary(objData: RunArrearsRecord | null | undefined, blnFinalized: boolean): ArrearTabSummary {
  if (!objData?.blnAvailable) return { intEmployeeCount: 0, blnReviewPending: false };
  return {
    intEmployeeCount: objData.lstEmployees.length,
    blnReviewPending: Boolean(objData.blnRequiresReviewAck && !objData.blnReviewAcknowledged && !isArrearPreview(objData) && !blnFinalized),
  };
}
