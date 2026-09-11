# Automation `controlId` Standard

## Purpose

Use `controlId` as the single automation selector standard across the HRMS frontend.

This standard exists to make automation selectors:

- stable
- app-authored
- independent of styling and translation
- safe for long-term maintenance

`id` may still be used for accessibility, label wiring, native browser behavior, or third-party integration. `id` is not the automation contract.

## Canonical Format

Use this pattern:

`<module>.<screen>.<element>.<role>`

Examples:

- `auth.login.login-id.input`
- `auth.login.password.input`
- `auth.login.submit.button`
- `auth.login.password-visibility.toggle`
- `common.confirm-dialog.confirm.button`
- `employee.form.department.select`
- `leave.form.submit.button`

## Naming Rules

All `controlId` values must be:

- lowercase only
- dot-separated
- semantic and stable
- independent of UI text, CSS classes, icon names, translations, and array position

Allowed role suffixes include:

- `.button`
- `.icon-button`
- `.input`
- `.select`
- `.option`
- `.checkbox`
- `.radio`
- `.switch`
- `.toggle`
- `.tab`
- `.dialog`

## Anti-Patterns

Do not use the following as automation selectors:

- MUI icon-generated `controlId`
- `.Mui*` class names
- CSS module hash classes
- visible text
- translated labels
- array indexes
- UUIDs
- timestamps
- random suffixes
- sensitive business values

Examples to avoid:

- `Save`
- `submitBtn`
- `edit-${index}`
- `employee.${employeeId}.edit.button`
- `MuiButton-root`
- `DeleteIcon`

## Placement Rules

Place selectors on the actionable or native element, not on decorative wrappers.

### Buttons and dialog actions

Apply `controlId` directly to:

- `Button`
- `IconButton`
- `Tab`
- dialog action buttons

Do not rely on the inner SVG icon selector.

### Text inputs

For `TextField` and similar inputs, place `controlId` on the native input using the local MUI-compatible passthrough pattern.

### Select controls

For `Select` and `TextField select`, place `controlId` on the actual select surface or native select input, depending on the component implementation.

### Checkbox, radio, switch

Apply `controlId` to the native input via the component input passthrough.

### Menu options

Use a stable shared `controlId` and, if needed, a safe companion attribute such as `data-option-key`.

## Wrapper Rules

Shared wrappers must expose selector props and convert them into `controlId` internally.

Preferred prop names:

- `testId`
- `rootTestId`
- `cancelButtonTestId`
- `primaryButtonTestId`
- `confirmButtonTestId`

Avoid inconsistent names such as:

- `selector`
- `testID`
- `automationId`
- `qaId`

## Repeated Row Strategy

For repeated rows, `controlId` identifies the control type and a companion attribute identifies the specific row when required.

Preferred pattern:

- `controlId="employee.list.edit.button"`
- `data-row-key="<safe-stable-key>"`

Rules:

- never use array indexes in `controlId`
- never embed sensitive or internal identifiers in `controlId`
- use `data-row-key` only when the value is already safe for DOM exposure

## Privacy and Accessibility

Never place sensitive values in `controlId`, including:

- email addresses
- phone numbers
- employee identifiers
- tenant identifiers
- payroll values
- tokens

Do not remove or weaken accessibility wiring while adding selectors:

- preserve `id`/`htmlFor` relationships
- preserve `aria-*`
- preserve `name`
- preserve keyboard and focus behavior

## Rollout Checklist

For every new or updated screen:

- every important interactive control gets an app-authored `controlId`
- wrappers pass selector props through
- dialog actions are directly targetable
- repeated rows use a safe companion key only when needed
- no selector depends on `.Mui*` classes, icon SVGs, or text

## Reviewer Checklist

- selector is app-authored
- selector follows the naming format
- selector is on the actionable or native element
- selector does not depend on icon/class/text-based lookup
- selector does not leak sensitive data
- shared wrapper passthrough is used where appropriate
