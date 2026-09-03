// Regression guard for the India POC "Leave Type Final Refinement" (Stages 2-5).
//
// Follows this repo's lightweight convention (exported `testXxx` functions + local assertions): it
// scans the editor source, so it needs no DOM/component render harness. It locks in the simplified
// labels/controls and confirms the advanced/legacy labels they replaced are gone, so a future edit
// cannot silently revert the simplification. Backend schema round-trip is covered by the Python suite
// app/tests/test_leave_type_enterprise.py.

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(blnCondition: boolean, strMessage: string) {
  if (!blnCondition) throw new Error(strMessage);
}

function readEditorSource(): string {
  return readFileSync(join(process.cwd(), "src/features/leave/components/LeaveTypeEditorPage.tsx"), "utf8");
}

// Labels/tokens that MUST be present after the refinement.
const lstMustContain = [
  // Stage 2 — Sandwich
  'label="Enable Sandwich Leave"',
  'label="Apply Sandwich On"',
  // Stage 3 — Entitlement
  'label="Annual Entitlement"',
  'label="Credit per Cycle"',
  'label="Credit Timing"',
  'label="Joining Proration Method"',
  'label="Leave Eligibility"',
  "Manual Credit",
  "Nearest Full Day",
  // Stage 4 — Application Limits
  'label="Minimum Days per Request"',
  'label="Maximum Requests per Year"',
  'label="Allow Backdated Requests"',
  'label="Available During Probation"',
  // Stage 5 — Approval Workflow
  'label="Backup Resource Requirement"',
  'label="Action Due Within (Days)"',
  'label="If No Action"',
];

// Labels/tokens that MUST be gone (replaced by the simplified controls).
const lstMustNotContain = [
  'label="Weekly-off treatment"',
  'label="Holiday treatment"',
  'label="Sandwich boundary"',
  'label="Sandwich scope"',
  'label="Qty / cycle"',
  'label="Min per request"',
  'label="Max / year"',
  'label="No-action days"',
  'label="On no-action"',
  'label="No-action auto behaviour"',
  'label="Action req."',
  'label="Backup resource rule"',
  // Approval Route was moved out of Basic Information (Approval Steps is the single routing source).
  'label="Approval Route"',
];

export function testRefinedLabelsPresent() {
  const strSource = readEditorSource();
  const lstMissing = lstMustContain.filter((strToken) => !strSource.includes(strToken));
  assert(lstMissing.length === 0, `Missing expected POC token(s): ${lstMissing.join(", ")}`);
}

export function testLegacyLabelsRemoved() {
  const strSource = readEditorSource();
  const lstLeftover = lstMustNotContain.filter((strToken) => strSource.includes(strToken));
  assert(lstLeftover.length === 0, `Legacy label(s) should have been removed: ${lstLeftover.join(", ")}`);
}

// Credit-per-cycle math mirrors computeCreditPerCycle in the editor (yearly=full, monthly=/12, manual=0).
// Kept in sync by copy here since the helper is module-private in the component.
function creditPerCycle(decEntitlement: number, strFrequency: string): number {
  if (strFrequency === "yearly") return decEntitlement;
  if (strFrequency === "monthly") return Math.round((decEntitlement / 12) * 100) / 100;
  return 0;
}

export function testCreditPerCycleDerivation() {
  assert(creditPerCycle(24, "yearly") === 24, "yearly credit should equal annual entitlement");
  assert(creditPerCycle(24, "monthly") === 2, "monthly credit should be entitlement / 12");
  assert(creditPerCycle(24, "none") === 0, "manual credit should be 0");
}
