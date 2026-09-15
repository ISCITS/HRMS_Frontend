// Regression guard for the "Edit Leave Type" section headings.
//
// Follows this repo's lightweight convention (exported `testXxx` functions + local assertions).
// It scans the editor source so it needs no DOM/component render harness. It confirms:
//   1. No section heading carries an alphabetical prefix (A., B., ... M., J2.).
//   2. All expected section titles still render, in the same order.
// Backend "save/edit still works" + validation invariants are covered by the Python suite
// app/tests/test_leave_type_enterprise.py.

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(blnCondition: boolean, strMessage: string) {
  if (!blnCondition) throw new Error(strMessage);
}

function readEditorSource(): string {
  return readFileSync(join(process.cwd(), "src/features/leave/components/LeaveTypeEditorPage.tsx"), "utf8");
}

// The rendered section titles, in on-screen order (prefixes intentionally absent). Order reflects
// the India POC simplification: Translations precedes the collapsible Advanced Configuration, which
// groups Applicability, Advanced Rules and Combination.
const lstExpectedHeadings = [
  "Basic Information",
  "Application Channels &amp; Behaviour",
  "Entitlement &amp; Accrual",
  "Application Limits",
  "Sandwich Rule",
  "Carry Forward &amp; Year-End",
  "Encashment",
  "Proof &amp; Documents",
  "Approval Workflow",
  "Translations",
  "Advanced Configuration",
  "Applicability &amp; Eligibility",
  "Advanced Rules (conditional eligibility)",
  "Combination Rules",
  "Usage Information",
];

export function testNoSectionHeadingHasAnAlphabeticalPrefix() {
  const strSource = readEditorSource();
  // Any heading Typography that still starts with "A. ", "B. ", ..., or "J2. ".
  const objPrefix = />(?:[A-M]|J2)\.\s/g;
  const lstMatches = strSource.match(objPrefix) ?? [];
  assert(lstMatches.length === 0, `Found ${lstMatches.length} section heading(s) with an alphabetical prefix: ${lstMatches.join(", ")}`);
}

export function testAllSectionHeadingsRenderInOrder() {
  const strSource = readEditorSource();
  let intCursor = -1;
  for (const strHeading of lstExpectedHeadings) {
    const intAt = strSource.indexOf(`>${strHeading}</Typography>`);
    assert(intAt !== -1, `Section heading not found: "${strHeading}".`);
    assert(intAt > intCursor, `Section heading out of order: "${strHeading}".`);
    intCursor = intAt;
  }
}
