import { describe, expect, it } from "vitest";

import type { RunArrearEmployeeRecord, RunArrearsRecord } from "@/features/payroll/types";
import {
  getArrearTabSummary,
  getArrearTotals,
  isArrearPreview,
  isRunFinalizedForArrears,
  shouldShowArrearsTab,
} from "@/features/payroll/utils/runArrearsTab";

function employee(dicOverride: Partial<RunArrearEmployeeRecord>): RunArrearEmployeeRecord {
  return {
    intEmployeeID: 1,
    strEmployeeCode: "E1",
    strEmployeeName: "Employee",
    strPeriodLabel: "Aug 2026 - Sep 2026",
    decArrearAmount: 0,
    decRecoveryAmount: 0,
    decPfEmployee: 0,
    decEsiEmployee: 0,
    strStatus: "PAYABLE",
    blnHeld: false,
    ...dicOverride,
  };
}

function runArrears(lstEmployees: RunArrearEmployeeRecord[], dicOverride: Partial<RunArrearsRecord> = {}): RunArrearsRecord {
  return {
    blnAvailable: true,
    strMode: "on",
    blnRequiresReviewAck: true,
    blnReviewAcknowledged: false,
    dicSummary: null,
    lstEmployees,
    ...dicOverride,
  };
}

describe("shouldShowArrearsTab", () => {
  it("shows for processed and finalized salary runs only", () => {
    expect(shouldShowArrearsTab("PROCESSED", "REGULAR")).toBe(true);
    expect(shouldShowArrearsTab("Finalized", "REGULAR")).toBe(true);
    expect(shouldShowArrearsTab("DRAFT", "REGULAR")).toBe(false);
    expect(shouldShowArrearsTab("VALIDATED", "REGULAR")).toBe(false);
    expect(shouldShowArrearsTab("PROCESSED", "VARIABLE_PAY")).toBe(false);
    expect(shouldShowArrearsTab(undefined, undefined)).toBe(false);
  });
});

describe("isRunFinalizedForArrears", () => {
  it("treats finalized and cancelled runs as closed", () => {
    expect(isRunFinalizedForArrears("FINALIZED")).toBe(true);
    expect(isRunFinalizedForArrears("CANCELLED")).toBe(true);
    expect(isRunFinalizedForArrears("PROCESSED")).toBe(false);
  });
});

describe("getArrearTotals", () => {
  it("adds arrears and recoveries, leaving out held employees", () => {
    const objData = runArrears([
      employee({ intEmployeeID: 1, decArrearAmount: 1500.5, decRecoveryAmount: 0 }),
      employee({ intEmployeeID: 2, decArrearAmount: 2499.5, decRecoveryAmount: 300 }),
      employee({ intEmployeeID: 3, decArrearAmount: 10000, decRecoveryAmount: 700, blnHeld: true }),
    ]);
    expect(getArrearTotals(objData)).toEqual({ decArrearTotal: 4000, decRecoveryTotal: 300 });
  });

  it("is zero when there are no employees", () => {
    expect(getArrearTotals(runArrears([]))).toEqual({ decArrearTotal: 0, decRecoveryTotal: 0 });
  });
});

describe("isArrearPreview", () => {
  it("is preview only when nothing is payable or paid", () => {
    expect(isArrearPreview(runArrears([employee({ strStatus: "PREVIEW" })]))).toBe(true);
    expect(isArrearPreview(runArrears([employee({ strStatus: "PREVIEW" }), employee({ strStatus: "PAYABLE" })]))).toBe(false);
    expect(isArrearPreview(runArrears([employee({ strStatus: "PAID" })]))).toBe(false);
  });
});

describe("getArrearTabSummary", () => {
  const lstPaying = [employee({ intEmployeeID: 1 }), employee({ intEmployeeID: 2, blnHeld: true })];

  it("counts every employee with arrears (held included) and flags pending review", () => {
    expect(getArrearTabSummary(runArrears(lstPaying), false)).toEqual({ intEmployeeCount: 2, blnReviewPending: true });
  });

  it("is not pending once reviewed", () => {
    expect(getArrearTabSummary(runArrears(lstPaying, { blnReviewAcknowledged: true }), false).blnReviewPending).toBe(false);
  });

  it("is not pending when the company does not require the review", () => {
    expect(getArrearTabSummary(runArrears(lstPaying, { blnRequiresReviewAck: false }), false).blnReviewPending).toBe(false);
  });

  it("is not pending for preview-only arrears or a finalized run", () => {
    expect(getArrearTabSummary(runArrears([employee({ strStatus: "PREVIEW" })]), false).blnReviewPending).toBe(false);
    expect(getArrearTabSummary(runArrears(lstPaying), true).blnReviewPending).toBe(false);
  });

  it("is empty when arrears are unavailable or not loaded", () => {
    expect(getArrearTabSummary(null, false)).toEqual({ intEmployeeCount: 0, blnReviewPending: false });
    expect(getArrearTabSummary(runArrears(lstPaying, { blnAvailable: false }), false)).toEqual({ intEmployeeCount: 0, blnReviewPending: false });
  });
});
