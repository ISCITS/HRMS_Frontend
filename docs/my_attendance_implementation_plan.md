# My Attendance — ESS Implementation Plan

## 1. Objective and scope

Build a responsive, self-service **My Attendance** experience for an individual employee. It must consume the same Attendance Policy and daily attendance records used by HR Attendance Management.

The screen will:

- Allow an eligible employee to punch IN and OUT.
- Show the server-confirmed current attendance state and next allowed action.
- Show today's punch timeline and calculated attendance result.
- Show monthly attendance history, summary, and per-day detail.
- Explain policy-driven exceptions without recalculating attendance in the browser.
- Remain tenant, company, user, and employee scoped.

The implementation will not introduce Shift Master, roster planning, cross-midnight attendance, attendance regularization, manager approval, biometric-device administration, or payroll calculations.

## 2. Repository findings

### Reusable backend objects

- `tblattendance_log`: append-only raw IN/OUT punch history.
- `tblattendance_day`: derived daily attendance result.
- `tblattendance_policy` / `tblattendance_policy_text`: effective policy configuration and translated names.
- `tblemployee`: authenticated-user-to-employee resolution and service period.
- Existing `clsAttendanceRepository`, `clsAttendanceService`, `deriveDayStatus`, and policy resolution.
- Existing standard API envelope and exception handling.

### Reusable frontend objects

- Existing ESS route: `/ess/attendance`.
- Existing attendance API wrapper and status tokens.
- Existing module-label hook, action-right hook, shared alerts/dialogs, and MUI responsive primitives.
- Existing Holiday Calendar remains separate and must not be duplicated in My Attendance.

### Defects and gaps to resolve

- ESS context currently accepts employee and tenant/company values from request headers and has tenant/company `1` fallbacks.
- Employee resolution uses raw SQL inside the route instead of the repository/service architecture.
- Punch time and work date are derived with UTC rather than an explicitly resolved tenant/company timezone.
- The UI calls and displays shift data even though Shift Management is outside this POC.
- Punch direction is inferred by odd/even punch count without returning a server-owned next-action state.
- The monthly endpoint returns only derived days and not the raw punch timeline required for employee verification.
- There are no dedicated `ESS_MY_ATTENDANCE_VIEW` and `ESS_MY_ATTENDANCE_PUNCH` rights.
- Current ESS labels and weekdays are hardcoded.
- Snackbar close actions and calendar day interactions do not yet have complete `data-control-id` coverage.
- Holiday Master still has switches, translation controls, dialog fields, and AI Translate controls requiring a final rendered-DOM control-ID audit.

## 3. Proposed user experience

### Page header

- Database-driven menu/page title: **My Attendance**.
- Localized subtitle explaining self-service punch and attendance history.
- Current company timezone and last refreshed time.
- Refresh action.

### Today card

- Server date/time.
- Current state: Not Punched In, Punched In, Punched Out, or Attendance Closed.
- Large policy-controlled **Punch In** or **Punch Out** action.
- Confirmation dialog showing direction, server time, and source.
- Disable the action while submitting and prevent duplicate submission.
- Show success receipt containing punch direction, timestamp, source, and request/reference ID.
- Show policy explanation if punching is unavailable.

### Today summary

- Attendance status.
- First IN.
- Last OUT.
- Worked hours.
- Late minutes.
- Overtime hours, only where enabled by policy.
- Paid/unpaid indicator.
- Missing-punch or policy exception message.

### Punch timeline

- Chronological IN/OUT log for the selected date.
- Time, direction, source, and recorded timestamp.
- Read-only and append-only from the employee perspective.
- Clear empty state before the first punch.

### Monthly summary

- Present.
- Absent.
- Half Day.
- On Leave/LWP.
- Holiday/Weekly Off where already recorded in `tblattendance_day`.
- Worked hours.
- Late occurrences.
- Missing-punch exceptions.

### Monthly attendance view

- Month/year selector, Previous, Next, and Today.
- Desktop: calendar with compact status and worked-hours indicators.
- Mobile: summary cards followed by a chronological day list; avoid a compressed seven-column grid.
- Selecting a date opens a responsive drawer/dialog with daily result and all raw punches.
- Status colors come from shared theme/status tokens, not business logic.
- Future dates are non-interactive or clearly marked.

### Policy information

- Read-only “Your attendance rules” drawer.
- IN/OUT requirement.
- Full-day and half-day thresholds.
- Late/early grace.
- Missing-punch treatment.
- Work-hour rounding.
- Overtime eligibility.
- Effective dates.
- Do not expose internal configuration IDs.

### Error and state handling

- Loading skeleton.
- No employee profile.
- No applicable policy.
- Punch disabled by policy.
- Already punched / invalid sequence.
- Network failure with retry.
- Permission denied.
- No monthly records.
- Date outside service period.

## 4. Backend design

### Security

- Resolve `user_id`, `tenant_id`, `company_id`, and language only from validated authentication/session claims.
- Resolve the employee through the existing auth repository; never accept `employee_id` from the browser.
- Remove default tenant/company `1` fallbacks and unrestricted employee headers from ESS attendance routes.
- Scope every query by tenant, company, and resolved employee.
- Validate employee active/service dates.
- Add permissions:
  - `ESS_MY_ATTENDANCE_VIEW`
  - `ESS_MY_ATTENDANCE_PUNCH`
- Keep `ATTENDANCE_VIEW` only as a documented migration compatibility alias if required.

### API contract

#### `GET /ess/attendance/overview?date=YYYY-MM-DD`

Returns:

- Employee-safe display identity.
- Server date/time and timezone.
- Applicable policy summary.
- Today's derived attendance.
- Ordered raw punches.
- `strCurrentState`.
- `strNextPunchDirection`.
- `blnCanPunch`.
- Stable reason/error code when punching is unavailable.

#### `POST /ess/attendance/punch`

Payload:

```json
{
  "strDirection": "in",
  "strSource": "web",
  "strIdempotencyKey": "client-generated-uuid"
}
```

Rules:

- Timestamp is server-owned for web punches.
- Direction must match the server-calculated next action.
- Reject duplicate/replayed idempotency keys.
- Reject cross-midnight behavior under the POC.
- Apply employee service-period and policy validation.
- Persist the append-only log and recompute `tblattendance_day` in one controlled transaction.
- Return updated overview data and a punch receipt.

#### `GET /ess/attendance/history?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD`

Returns:

- Date range, summary totals, and daily rows.
- Raw punch details only for the selected day or in a bounded grouped result.
- Maximum range of 366 days.
- No N+1 query pattern.

#### Compatibility

- Retain `GET /ess/attendance/calendar` during migration.
- Deprecate the ESS shift endpoint from the My Attendance UI; do not delete unrelated legacy APIs in this scope.

### Repository strategy

- One query for employee/service context.
- One query for effective policy.
- One query for bounded daily attendance.
- One query for bounded raw punch logs.
- Aggregate summaries in SQL or one in-memory pass over the bounded result.
- Add company scope to existing punch/day queries where missing.
- Use database transaction boundaries for punch log plus derived day update.

### Exact backend files

Change:

- `app/api/v1/EssAttendanceRoutes.py`
- `app/schemas/AttendanceSchema.py`
- `app/repositories/AttendanceRepository.py`
- `app/services/AttendanceService.py`
- `app/constants/AttendanceConstants.py`
- `app/core/DependencyContainer.py` only if a new auth dependency is required

Add:

- `app/tests/test_ess_my_attendance.py`
- A new additive DB script/migration for permission, menu, labels, and idempotency only if the approved schema requires it

No new attendance transaction table is proposed.

## 5. Frontend design

### Architecture

Keep the page thin and split the current monolithic ESS component:

Change:

- `src/app/ess/attendance/page.tsx`
- `src/features/attendance/services/attendanceService.ts`
- `src/features/attendance/dto.ts`
- `src/config/routes.ts` only if route metadata is missing

Replace/refactor:

- `src/features/attendance/components/EssAttendancePanel.tsx`

Add:

- `src/features/attendance/hooks/useMyAttendance.ts`
- `src/features/attendance/types/MyAttendanceTypes.ts`
- `src/features/attendance/components/MyAttendancePage.tsx`
- `src/features/attendance/components/MyAttendanceTodayCard.tsx`
- `src/features/attendance/components/MyAttendanceSummary.tsx`
- `src/features/attendance/components/MyAttendancePunchTimeline.tsx`
- `src/features/attendance/components/MyAttendanceMonthView.tsx`
- `src/features/attendance/components/MyAttendanceDayDetail.tsx`
- Focused component/hook tests following the existing frontend test structure

### Responsive behavior

- `xs`: single-column layout, full-width punch button, day-list history, bottom drawer for details.
- `sm/md`: two-column today/summary area and adaptive calendar.
- `lg+`: today card and timeline beside the monthly calendar.
- Minimum 44px touch targets.
- No horizontal page scrolling.
- Accessible focus order, keyboard operation, visible focus, ARIA labels, and screen-reader status announcements.

## 6. Multilingual strategy

- Use the existing module label hook with a dedicated `my_attendance` module.
- Seed all user-visible captions in `tbllabel` / `tbllabeltext`.
- Menu caption comes from `tblmenu` / `tblmenu_text`.
- Backend returns stable codes and data, not UI captions.
- Format date/time through the active locale and company timezone.
- Do not hardcode weekday, status, empty-state, toast, or validation labels.

## 7. `data-control-id` compliance

### Required naming convention

Use stable semantic IDs:

- `ess.my-attendance.refresh.button`
- `ess.my-attendance.punch-in.button`
- `ess.my-attendance.punch-out.button`
- `ess.my-attendance.punch-confirm.dialog`
- `ess.my-attendance.punch-confirm.submit.button`
- `ess.my-attendance.month.select`
- `ess.my-attendance.year.select`
- `ess.my-attendance.previous-month.button`
- `ess.my-attendance.next-month.button`
- `ess.my-attendance.today.button`
- `ess.my-attendance.day.<YYYY-MM-DD>.button`
- `ess.my-attendance.day-detail.drawer`
- `ess.my-attendance.policy-info.button`
- `ess.my-attendance.retry.button`
- `ess.my-attendance.notification.close.button`

Dynamic row controls must use stable business keys, not array indexes.

### Mandatory audit scope

During implementation, audit the final rendered DOM for:

- `HolidayMasterPanel.tsx`
- `AttendancePocPanel.tsx` covering Attendance Policy and Daily Attendance
- All new My Attendance components
- Shared `CommonTable`, dialog, switch, alert, snackbar, pagination, and export controls used by these screens

Every clickable, focusable, or actionable control must render one unique `data-control-id`; merely passing `controlId` is insufficient unless the rendered DOM is verified.

Add an automated component/E2E assertion that:

- Finds interactive elements without `data-control-id`.
- Finds duplicate IDs on the same rendered screen.
- Covers dialogs, drawers, row actions, switches, AI Translate, pagination, export, alert close/retry, and calendar-day buttons.

## 8. Validation and business rules

- Backend time is authoritative.
- Explicit IN/OUT sequencing; do not silently alternate based only on count.
- No browser-supplied employee identity.
- No punch before joining or after exit.
- No duplicate punch submission.
- Policy decides required punches, thresholds, grace, rounding, and overtime.
- Punchless statuses remain controlled by HR/reconciliation.
- Employee cannot edit or delete raw logs or derived attendance.
- No Present inference when no attendance evidence exists.
- Cross-midnight attendance remains rejected.
- Past records remain viewable.

## 9. Tests

### Backend

- Authenticated employee resolution.
- Missing employee profile.
- Permission view/punch denial.
- Cross-tenant and cross-company isolation.
- Browser-supplied employee ID ignored/rejected.
- Server timestamp and company timezone.
- IN then OUT sequence.
- Duplicate IN/OUT and idempotent retry.
- Transaction rollback when day recomputation fails.
- Policy punch requirement and missing-punch treatment.
- Joining/exit date validation.
- Month/year boundary and leap year.
- Bounded range and no N+1 behavior.
- Raw log audit fields.

### Frontend

- Initial current-day load.
- Punch confirmation, loader, receipt, and refreshed summary.
- Duplicate-click prevention.
- Month/year navigation and Today.
- Calendar/list responsive modes.
- Day detail shows all punches.
- Policy drawer.
- Loading, empty, unauthorized, no-profile, no-policy, and API error states.
- Language change refreshes labels.
- Keyboard and screen-reader behavior.
- `data-control-id` presence and uniqueness.

### Regression

- HR Attendance Policy CRUD.
- HR Daily Attendance load/edit/bulk save.
- Holiday Master CRUD, translations, and AI Translate.
- Holiday Calendar.
- Leave Application.
- Payroll attendance/LWP consumption.
- No Shift menu, route, or field introduced.

## 10. Implementation sequence

1. Approve this scope and decide whether punch idempotency needs an additive DB column/table.
2. Harden ESS authentication context and add dedicated permissions.
3. Add overview/history contracts and transactional punch behavior.
4. Add backend tests.
5. Build responsive My Attendance components and localization.
6. Remove shift presentation from My Attendance.
7. Complete Holiday Master and Attendance Management control-ID audit.
8. Run frontend tests, lint, type-check, backend tests, and manual responsive smoke tests.
9. Produce a completion report with deferred items.

## 11. Deferred enterprise capabilities

These require separate approved workflows and should not be silently added:

- Attendance regularization/correction request.
- Manager approval.
- Biometric/device integration.
- Geofence enforcement.
- Work-from-home/on-duty request.
- Shift/roster management.
- Cross-midnight attendance.
- Team attendance.
- Payroll recalculation.

Recommended next phase after this POC: Attendance Regularization with reason, attachments, approval, audit trail, and controlled recomputation.

