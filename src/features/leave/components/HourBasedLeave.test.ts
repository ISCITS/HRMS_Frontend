// Regression guard for Hour-based Leave (Leave Type unit = "hour").
//
// Follows this repo's lightweight convention (exported `testXxx` functions + local assertions): it
// scans the two touched sources, so it needs no DOM/component render harness, and it re-derives the
// hour arithmetic the panel performs. Server-side enforcement of the same rules is covered by the
// Python suites app/tests/test_leave_type_enterprise.py and app/tests/test_ess_leave_application.py.

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(blnCondition: boolean, strMessage: string) {
  if (!blnCondition) throw new Error(strMessage);
}

function readSource(strRelativePath: string): string {
  return readFileSync(join(process.cwd(), strRelativePath), "utf8");
}

const strEditorPath = "src/features/leave/components/LeaveTypeEditorPage.tsx";
const strApplyPath = "src/features/leave/components/EssLeaveApplicationPanel.tsx";

export function testEditorShowsMaxHourLimitOnlyForTheHourUnit() {
  const strSource = readSource(strEditorPath);
  assert(strSource.includes('label="Max Hour Limit"'), "Editor should render a Max Hour Limit field.");
  assert(strSource.includes('const blnHourUnit = objForm.strUnit === "hour"'), "Editor should derive the hour unit from the Unit select.");
  assert(strSource.includes("{blnHourUnit ? ("), "Max Hour Limit should be conditional on the Hour unit.");
  // Switching Hour -> Day must drop the cap rather than leave it dormant on the record.
  assert(strSource.includes("decMaxHourLimit: blnHour ? objPrev.decMaxHourLimit ?? null : null"), "Changing the unit away from Hour should clear the Max Hour Limit.");
}

export function testEditorValidatesMaxHourLimitBeforeSave() {
  const strSource = readSource(strEditorPath);
  assert(strSource.includes("Max Hour Limit is required when the unit is Hour."), "A missing Max Hour Limit should be rejected for an Hour unit.");
  assert(strSource.includes("Max Hour Limit must be greater than zero."), "Zero/negative Max Hour Limit should be rejected.");
  assert(strSource.includes("decMaxHourLimit: blnHourUnit ? Number(objForm.decMaxHourLimit) : null"), "A non-Hour unit should never post a Max Hour Limit.");
}

export function testApplyScreenSwitchesToTheHourFlow() {
  const strSource = readSource(strApplyPath);
  assert(strSource.includes('label={fnLabel("start_time", "Start Time")}'), "Apply screen should offer a Start Time for hour leave.");
  assert(strSource.includes('label={fnLabel("end_time", "End Time")}'), "Apply screen should offer an End Time for hour leave.");
  assert(strSource.includes('label={fnLabel("total_hours", "Total Hours")}'), "Apply screen should display the calculated Total Hours.");
  // One date only: the To Date field is not rendered, and To Date mirrors From Date in form state.
  assert(strSource.includes("{!blnHourUnit ? <Grid"), "To Date should be hidden for an hour-based Leave Type.");
  assert(strSource.includes('fnLabel("leave_date", "Leave Date")'), "The single date should be labelled Leave Date for hour leave.");
  assert(strSource.includes('setValue("dtToDate", objWatchedForm.dtFromDate'), "To Date should track From Date for hour leave.");
  // Existing Day/Half-Day behaviour must stay reachable.
  assert(strSource.includes('label={fnLabel("to_date", "To Date")}'), "Day-based leave should keep its To Date field.");
  assert(strSource.includes('<MenuItem value="half">Half Day</MenuItem>'), "Half-day selection should survive for day-based types.");
}

export function testMaxHourLimitMessageComesFromTheLeaveType() {
  const strSource = readSource(strApplyPath);
  assert(
    strSource.includes("`You can apply for a maximum of ${Number(decLimit)} hours for this leave type.`"),
    "The limit in the message must be read from the selected Leave Type, never hardcoded.",
  );
  assert(!/maximum of 4 hours/.test(strSource), "The example limit of 4 must not be hardcoded.");
}

// Mirrors fnHourSpan in the panel (module-private there), so the arithmetic stays pinned.
function hourSpan(strStartTime: string, strEndTime: string): number | null {
  if (!strStartTime || !strEndTime) return null;
  const [intStartHour, intStartMinute] = strStartTime.split(":").map(Number);
  const [intEndHour, intEndMinute] = strEndTime.split(":").map(Number);
  const intMinutes = (intEndHour * 60 + intEndMinute) - (intStartHour * 60 + intStartMinute);
  if (intMinutes <= 0) return null;
  return Math.round((intMinutes / 60) * 100) / 100;
}

export function testTotalHoursDerivation() {
  assert(hourSpan("10:00", "13:00") === 3, "10:00-13:00 should be 3 hours");
  assert(hourSpan("09:00", "12:30") === 3.5, "09:00-12:30 should be 3.5 hours");
  assert(hourSpan("09:15", "10:00") === 0.75, "09:15-10:00 should be 0.75 hours");
  assert(hourSpan("13:00", "10:00") === null, "an inverted window has no duration");
  assert(hourSpan("10:00", "10:00") === null, "a zero-length window has no duration");
  assert(hourSpan("", "13:00") === null, "an incomplete window has no duration");
}

export function testMaxHourLimitBoundary() {
  const decLimit = 4;
  const lstValid = ["10:00-11:00", "10:00-12:00", "09:00-12:30", "09:00-13:00"];
  const lstInvalid = ["09:00-14:00"];
  lstValid.forEach((strWindow) => {
    const [strStart, strEnd] = strWindow.split("-");
    assert((hourSpan(strStart, strEnd) ?? 0) <= decLimit, `${strWindow} should be within a ${decLimit} hour limit`);
  });
  lstInvalid.forEach((strWindow) => {
    const [strStart, strEnd] = strWindow.split("-");
    assert((hourSpan(strStart, strEnd) ?? 0) > decLimit, `${strWindow} should exceed a ${decLimit} hour limit`);
  });
}
