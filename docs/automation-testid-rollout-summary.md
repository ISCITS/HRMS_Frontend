# `data-testid` Rollout Summary

Last updated: 2026-06-01

## Purpose

This document records what was implemented during the application-wide `data-testid` rollout, the rollout approach that was used, how future development should continue following the same standard, and whether any known files still remain uncovered.

## What We Standardized

We standardized the frontend automation attribute strategy on:

- `data-testid` as the single automation selector contract

We explicitly did **not** standardize on:

- MUI-generated icon `data-testid`
- `.Mui*` CSS classes
- visible text selectors
- generated/random ids
- index-based selectors
- `data-textid`

## Naming Standard

Canonical format:

`<module>.<screen>.<element>.<role>`

Examples:

- `auth.login.password.input`
- `auth.login.submit.button`
- `employee.form.department.select`
- `payroll-runs.list.search.button`
- `tenant.onboarding.create.button`

Rules followed in the rollout:

- lowercase only
- dot-separated segments
- semantic names, not visual names
- stable names, not derived from index or runtime randomness
- where row-level controls repeat, use a stable shared selector plus `data-row-key` where appropriate

## Rollout Approach Used

The rollout was executed in phases rather than by editing every file blindly in one pass.

### 1. Audit and baseline scan

We first scanned the React/MUI application to determine:

- where MUI and wrapper controls were used
- where stable automation attributes already existed
- where only library-generated attributes existed
- where wrappers blocked selector passthrough

This established that:

- app-authored `data-testid` usage was effectively absent
- `data-textid` was absent
- only a small number of `id` attributes existed
- most of the application lacked stable automation attributes

### 2. Documentation and shared foundations

We created the source-of-truth standard:

- [automation-testid-standard.md](/d:/HRMS_Project/HRMS_Frontend/docs/automation-testid-standard.md:1)

Then we updated the shared components first, so selectors could scale consistently:

- `src/components/master/ActiveStatusSwitch.tsx`
- `src/Common/components/CommonMasterDialog.tsx`
- `src/Common/components/CommonConfirmDialog.tsx`
- `src/Common/components/AlertDialog.tsx`
- `src/features/payroll/components/CommonPayrollDialog.tsx`
- `src/components/master/CommonRowActions.tsx`
- `src/components/ui/CommonDataGrid.tsx`

This was the key foundation. Once these components supported selector passthrough, the rest of the app could be covered with much less duplication and lower regression risk.

### 3. Critical-flow rollout first

We prioritized:

- login and MFA
- tenant admin login
- dialogs and alert actions
- high-traffic forms
- shared row/list surfaces

This ensured the most business-critical automation paths were covered early.

### 4. Broad feature rollout

After shared infrastructure and auth were covered, the same pattern was extended across:

- employee masters and editor flows
- tenant onboarding and tenant admin screens
- payroll runs, payroll results, statutory rules, payroll cycles, process logs
- reimbursements
- IT declaration
- salary components and salary structures
- tax regime screens
- reports
- ESS screens
- security and user group screens
- version log screens

### 5. Final verification sweep

At the end, we ran file-level coverage checks comparing:

- files that render relevant interactive MUI/custom controls
- files that now contain app-authored selector props

That final sweep reduced the remaining gap to two scan artifacts rather than uncovered feature screens.

## What Was Implemented

The rollout added:

- stable `data-testid` on actual buttons, inputs, icon buttons, dialogs, tabs, filters, selects, toggles, and repeated row actions
- wrapper passthrough support so callers can assign selectors without modifying internal component structure repeatedly
- row-level selector support using shared prefixes
- `data-row-key` support where repeated rows need stable identity alongside a shared control selector
- documentation for both the standard and the resulting inventory

Supporting docs created:

- [automation-testid-standard.md](/d:/HRMS_Project/HRMS_Frontend/docs/automation-testid-standard.md:1)
- [automation-testid-inventory.md](/d:/HRMS_Project/HRMS_Frontend/docs/automation-testid-inventory.md:1)

## How Future Development Should Work

All new frontend work should follow this process:

### For new screens

Every new interactive control that matters for automation should receive an app-authored `data-testid`.

This includes:

- primary and secondary buttons
- dialog confirm/cancel actions
- text inputs
- selects
- checkboxes
- radios
- switches
- tabs
- filter controls
- row actions
- upload/view/download actions

### For repeated rows

Use:

- a stable shared `data-testid` for the control type
- `data-row-key` for row identity when needed

Do not use:

- array index in the selector
- random suffixes
- raw CSS selectors

### For shared wrappers

If a new wrapper component is created around MUI controls, it must expose selector passthrough from the start.

That means wrapper APIs should accept props like:

- `testId`
- `rootTestId`
- `cancelButtonTestId`
- `confirmButtonTestId`
- `primaryButtonTestId`

depending on the component type.

### For code review

Reviewers should verify:

- selector is app-authored
- selector follows the canonical naming convention
- selector is attached to the actionable or native element
- no selector relies on MUI icon `data-testid`
- no selector relies on `.Mui*` classes
- no selector exposes sensitive identifiers in `data-testid`

## Recommended Ongoing Process

When adding or changing UI in future:

1. Add the `data-testid` while implementing the control, not later.
2. Reuse existing module/screen prefixes where possible.
3. If a shared wrapper lacks passthrough, update the wrapper first.
4. For lists/tables, prefer the shared row-action and grid patterns already in the repo.
5. Update the inventory documentation if a brand-new module or naming family is introduced.

## Current Remaining Status

Current file-level coverage result:

- interactive React files scanned: `107`
- files with app-authored selector coverage: `105`
- remaining unmatched files: `2`

The remaining two are **not known missing implementation gaps**:

### 1. `src/Common/components/CommonTable.tsx`

Reason:

- this file only wraps and re-exports `CommonDataGrid`
- selector coverage actually comes from `CommonDataGrid`

Conclusion:

- no separate `data-testid` rollout work is required here

### 2. `src/components/master/ActiveStatusSwitch.tsx`

Reason:

- this component already forwards a native-input selector through `inputProps`
- the final grep-based scan does not count that pattern as a direct literal file match in the same way as `data-testid="..."`

Conclusion:

- no missing rollout work is currently known here

## Are Any Functional Screens Still Known To Be Missing Coverage?

Based on the final implementation sweep and verification scan:

- no known remaining functional feature screen is currently pending this rollout

Important caveat:

- this conclusion is based on the file-level coverage scan and targeted implementation review
- it does **not** claim that every single individual control in every covered file has been manually enumerated one by one in the final doc
- if QA wants stricter verification, the next step should be a literal selector extraction report or DOM-based smoke audit

## Validation Notes

`npm.cmd run typecheck` was rerun during the rollout.

Result:

- the repo still has pre-existing baseline TypeScript errors unrelated to this selector rollout
- the selector rollout was corrected where necessary so it does not add new selector-specific typecheck failures

Known baseline problem areas still unrelated to this rollout include:

- auth route typing
- SSO callback typing
- shared API helper typing
- shared data grid typing
- some employee/security screen typings
- tenant service typings

## Final Outcome

The application now has an enterprise-wide `data-testid` strategy in place, documented and applied across the frontend.

The rollout delivered:

- a standard
- shared infrastructure support
- broad application coverage
- a selector inventory
- a repeatable process for future development

For future work, this should now be treated as a normal engineering standard rather than a one-time cleanup task.
