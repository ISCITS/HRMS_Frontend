import {
  ESS_SHORTCUT_ROUTES,
  getTodayIsoDate,
  resolveComplianceCheckHref,
  resolveCurrentMonthPayslipHref,
  resolveNextPunchDirection,
  resolvePunchButtonState,
} from "@/features/dashboard/utils/essDashboardHelpers";

function assertEqual(objActual: unknown, objExpected: unknown, strMessage: string) {
  if (objActual !== objExpected) {
    throw new Error(`${strMessage}: expected '${String(objExpected)}' but received '${String(objActual)}'.`);
  }
}

export function testGetTodayIsoDateFormatsAsYyyyMmDd() {
  assertEqual(
    getTodayIsoDate(new Date(2026, 7, 8)),
    "2026-08-08",
    "Today's date should be formatted as YYYY-MM-DD using local date parts"
  );
}

export function testGetTodayIsoDatePadsSingleDigitMonthAndDay() {
  assertEqual(
    getTodayIsoDate(new Date(2026, 0, 5)),
    "2026-01-05",
    "Single digit month/day should be zero-padded"
  );
}

export function testResolveCurrentMonthPayslipHrefReturnsNullWhenNoPayrollResult() {
  assertEqual(
    resolveCurrentMonthPayslipHref([], false, new Date(2026, 7, 8)),
    null,
    "View Payslip should be disabled (null href) when there is no payroll result yet"
  );
}

export function testResolveCurrentMonthPayslipHrefLinksToDocumentForCurrentMonthRow() {
  assertEqual(
    resolveCurrentMonthPayslipHref(
      [
        { payroll_month: "2026-07-01", payslip_id: 11, result_id: 101 },
        { payroll_month: "2026-08-01", payslip_id: 22, result_id: 202 },
      ],
      true,
      new Date(2026, 7, 8)
    ),
    "/ess/my-payslips/document/22",
    "Should link to the specific payslip document matching the current calendar month"
  );
}

export function testResolveCurrentMonthPayslipHrefFallsBackToResultIdWhenPayslipIdMissing() {
  assertEqual(
    resolveCurrentMonthPayslipHref(
      [{ payroll_month: "2026-08-01", payslip_id: null, result_id: 303 }],
      true,
      new Date(2026, 7, 8)
    ),
    "/ess/my-payslips/303",
    "Should fall back to the payroll result route when no payslip document id is present"
  );
}

export function testResolveCurrentMonthPayslipHrefFallsBackToListPageWhenNoIdsAvailable() {
  assertEqual(
    resolveCurrentMonthPayslipHref(
      [{ payroll_month: "2026-08-01" }],
      true,
      new Date(2026, 7, 8)
    ),
    "/ess/my-payslips",
    "Should fall back to the payslip list page rather than link to a broken URL"
  );
}

export function testResolveCurrentMonthPayslipHrefUsesMostRecentRowWhenNoMonthMatches() {
  assertEqual(
    resolveCurrentMonthPayslipHref(
      [{ payroll_month: "2026-06-01", payslip_id: 9 }],
      true,
      new Date(2026, 7, 8)
    ),
    "/ess/my-payslips/document/9",
    "Should fall back to the most recent payslip row when none match the current month exactly"
  );
}

export function testResolvePunchButtonStateDefaultsToInWhenOverviewMissing() {
  const objState = resolvePunchButtonState(null, false);
  assertEqual(objState.strDirection, "in", "Direction should default to 'in' before the overview has loaded");
  assertEqual(objState.blnDisabled, true, "Button should be disabled while the overview has not loaded yet");
}

export function testResolvePunchButtonStateReflectsNextDirectionAndEnablesWhenAllowed() {
  const objState = resolvePunchButtonState({ blnCanPunch: true, strNextPunchDirection: "out" }, false);
  assertEqual(objState.strDirection, "out", "Direction should mirror the attendance overview's next punch direction");
  assertEqual(objState.blnDisabled, false, "Button should be enabled when the overview allows punching and no punch is in flight");
}

export function testResolvePunchButtonStateDisablesWhilePunchInFlightEvenIfAllowed() {
  const objState = resolvePunchButtonState({ blnCanPunch: true, strNextPunchDirection: "in" }, true);
  assertEqual(objState.blnDisabled, true, "Button should be disabled while a punch request is already in flight");
}

export function testResolvePunchButtonStateDisablesWhenOverviewBlocksPunching() {
  const objState = resolvePunchButtonState({ blnCanPunch: false, strNextPunchDirection: "in" }, false);
  assertEqual(objState.blnDisabled, true, "Button should be disabled when the attendance policy does not allow punching right now");
}

export function testResolveNextPunchDirectionFallsBackToBackendFieldWhenNoPunchesYet() {
  assertEqual(
    resolveNextPunchDirection({ blnCanPunch: true, strNextPunchDirection: "in", lstPunches: [] }),
    "in",
    "With no punches recorded today, should trust the backend-provided next direction"
  );
}

export function testResolveNextPunchDirectionDerivesOutAfterAnInPunch() {
  assertEqual(
    resolveNextPunchDirection({
      blnCanPunch: true,
      strNextPunchDirection: "in",
      lstPunches: [{ dtPunchAt: "2026-08-08T02:30:00Z", strDirection: "in" }],
    }),
    "out",
    "After an 'in' punch, the next direction should derive to 'out' from the punch log even if the backend summary field is stale"
  );
}

export function testResolveNextPunchDirectionDerivesInAfterAnOutPunch() {
  assertEqual(
    resolveNextPunchDirection({
      blnCanPunch: true,
      strNextPunchDirection: "out",
      lstPunches: [
        { dtPunchAt: "2026-08-08T02:30:00Z", strDirection: "in" },
        { dtPunchAt: "2026-08-08T10:00:00Z", strDirection: "out" },
      ],
    }),
    "in",
    "After an 'out' punch, the next direction should derive back to 'in'"
  );
}

export function testResolveNextPunchDirectionUsesLatestPunchRegardlessOfArrayOrder() {
  assertEqual(
    resolveNextPunchDirection({
      blnCanPunch: true,
      strNextPunchDirection: "in",
      lstPunches: [
        { dtPunchAt: "2026-08-08T10:00:00Z", strDirection: "out" },
        { dtPunchAt: "2026-08-08T02:30:00Z", strDirection: "in" },
      ],
    }),
    "in",
    "Should sort by punch time and use the most recent punch, not array order, to derive the next direction"
  );
}

export function testResolveComplianceCheckHrefRoutesPanUanEsiToStatutoryTab() {
  assertEqual(resolveComplianceCheckHref("pan", 42), "/ess/my-profile/edit/42?tab=statutory", "PAN should deep-link to the statutory tab");
  assertEqual(resolveComplianceCheckHref("uan", 42), "/ess/my-profile/edit/42?tab=statutory", "UAN should deep-link to the statutory tab");
  assertEqual(resolveComplianceCheckHref("esi", 42), "/ess/my-profile/edit/42?tab=statutory", "ESI should deep-link to the statutory tab");
}

export function testResolveComplianceCheckHrefRoutesAddressToAddressTab() {
  assertEqual(resolveComplianceCheckHref("address", 42), "/ess/my-profile/edit/42?tab=address", "Address should deep-link to the address tab");
}

export function testResolveComplianceCheckHrefRoutesNomineeAndEmergencyContactToFamilyTab() {
  assertEqual(resolveComplianceCheckHref("nominee", 42), "/ess/my-profile/edit/42?tab=family", "Nominee should deep-link to the family tab");
  assertEqual(resolveComplianceCheckHref("emergency_contact", 42), "/ess/my-profile/edit/42?tab=family", "Emergency contact should deep-link to the family tab");
}

export function testResolveComplianceCheckHrefRoutesBankToDedicatedBankDetailsPage() {
  assertEqual(resolveComplianceCheckHref("bank", 42), "/ess/my-bank-details", "Bank should route to the dedicated ESS bank-details page");
}

export function testResolveComplianceCheckHrefFallsBackToProfileWhenEmployeeIdMissing() {
  assertEqual(resolveComplianceCheckHref("pan", null), "/ess/my-profile", "Without a resolved employee id, should fall back to the read-only profile page rather than a broken edit link");
}

export function testEssShortcutRoutesCoverAllEightRequiredDestinations() {
  const lstRoutes = Object.values(ESS_SHORTCUT_ROUTES);
  assertEqual(lstRoutes.length, 8, "There should be exactly 8 ESS dashboard shortcut routes");
  assertEqual(new Set(lstRoutes).size, 8, "All 8 shortcut routes should be unique");
  assertEqual(ESS_SHORTCUT_ROUTES.flexiPay, "/salary/flexi-pay-declaration", "Flexi Pay shortcut should point at the real flexi-pay-declaration route, not the broken /salary/flexi-pay path");
}
