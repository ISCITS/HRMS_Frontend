# `controlId` Inventory

Last updated: 2026-06-01

## Summary

- Canonical automation attribute: `controlId`
- Interactive React files scanned: `107`
- Files with app-authored selector coverage: `105`
- Remaining scan mismatches: `2`
- The remaining mismatches are expected:
  - `src/Common/components/CommonTable.tsx` only re-exports `CommonDataGrid`
  - `src/components/master/ActiveStatusSwitch.tsx` emits native-input selectors via `inputProps`, but the file-level grep check does not count that syntax as a direct literal match

## Shared Patterns

These components define reusable selector patterns used across the application.

- `src/components/ui/CommonDataGrid.tsx`
  - `${testIdPrefix}.export-excel.button`
  - `${testIdPrefix}.export-pdf.button`
  - `${testIdPrefix}.rows-per-page.select`
  - `${testIdPrefix}.pagination`
  - `${testIdPrefix}.table`
  - `${testIdPrefix}.row`

- `src/components/master/CommonRowActions.tsx`
  - `${testIdPrefix}.view.button`
  - `${testIdPrefix}.edit.button`
  - `${testIdPrefix}.delete.button`
  - `${testIdPrefix}.status.switch`
  - repeated rows also use `data-row-key`

- `src/Common/components/CommonMasterDialog.tsx`
  - `rootTestId`
  - `cancelButtonTestId`
  - `primaryButtonTestId`

- `src/Common/components/CommonConfirmDialog.tsx`
  - `rootTestId`
  - `cancelButtonTestId`
  - `confirmButtonTestId`

- `src/Common/components/AlertDialog.tsx`
  - `rootTestId`
  - `closeButtonTestId`

- `src/features/payroll/components/CommonPayrollDialog.tsx`
  - passes through `rootTestId`
  - passes through `cancelButtonTestId`
  - passes through `primaryButtonTestId`

## Auth

- `src/components/auth/AuthLoginExperience.tsx`
  - prefix: `auth.login.*`
  - includes login, password, password visibility, submit, resend OTP, error dialog
- `src/components/auth/GoogleMfaChallengeView.tsx`
  - MFA verify and backup-code toggle selectors
- `src/features/tenant-admin/components/TenantAdminLoginPage.tsx`
  - prefix: `tenant-admin.login.*`
- `src/app/(auth)/forgot-password/page.tsx`
  - prefix: `auth.forgot-password.*`
- `src/app/(auth)/register/page.tsx`
  - prefix: `auth.register.*`
- `src/app/(auth)/signup/page.tsx`
  - prefix: `auth.signup.*`
- `src/app/session-expired/SessionExpiredClient.tsx`
  - prefix: `auth.session-expired.*`

## Shell, Navigation, Shared UI

- `src/components/layout/AppShell.tsx`
  - prefix: `app-shell.*`
  - includes menu toggle, drawer, profile menu, language buttons, logout dialog/actions, retry
- `src/components/navigation/DynamicMenu.tsx`
  - prefix: `nav.menu.*`
  - includes menu toggles and links
- `src/components/shared/profile/ProfileForm.tsx`
  - prefix: `profile.form.*`
- `src/components/shared/settings/SettingsPanel.tsx`
  - prefix: `settings.*`
- `src/components/shared/theme/ThemePalettePanel.tsx`
  - prefix: `theme.palette.*`

## App-Level Pages

- `src/app/leave/page.tsx`
  - prefix: `leave.page.*`
- `src/app/payroll/page.tsx`
  - prefix: `payroll.page.*`
- `src/app/ess/calendar/page.tsx`
  - prefix: `ess.calendar.*`
- `src/app/ess/my-bank-details/page.tsx`
  - prefix: `ess.bank-details.*`
- `src/app/ess/my-profile/page.tsx`
  - prefix: `ess.profile.*`
- `src/app/salary/ess-declarations/page.tsx`
  - prefix: `salary.ess-declarations.*`
- `src/app/salary/it-declaration/page.tsx`
  - prefix: `salary.it-declaration.*`
- `src/app/user-management/page.tsx`
  - prefix: `user-management.*`

## Employee Master and Employee Screens

- `src/features/employee/components/BankMasterPanel.tsx`
  - prefix: `bank-master.list.*`
- `src/features/employee/components/CostCenterMasterPanel.tsx`
  - prefix: `cost-center-master.list.*`
- `src/features/employee/components/CountryMasterPanel.tsx`
  - prefix: `country-master.*`
- `src/features/employee/components/DepartmentMasterInlinePanel.tsx`
  - prefix: `department-inline.*`
- `src/features/employee/components/DepartmentMasterPanel.tsx`
  - prefix: `department-master.list.*`
- `src/features/employee/components/DesignationMasterPanel.tsx`
  - prefix: `designation-master.list.*`
- `src/features/employee/components/EmployeeEditorScreen.tsx`
  - prefix: `employee.editor.*`
- `src/features/employee/components/EmployeeForm.tsx`
  - prefix: `employee.form.*`
- `src/features/employee/components/EmployeeMasterListPanel.tsx`
  - prefix: `employee-master.list.*`
- `src/features/employee/components/EmployeeMasterPanel.tsx`
  - prefix: `employee-master.panel.*`
- `src/features/employee/components/FamilyDetailsTab.tsx`
  - prefix: `employee.family-details.*`
- `src/features/employee/components/FamilyForm.tsx`
  - prefix: `employee.family.form.*`
- `src/features/employee/components/FamilyTable.tsx`
  - prefix: `employee.family.table.*`
- `src/features/employee/components/GradeMasterPanel.tsx`
  - prefix: `grade-master.list.*`
- `src/features/employee/components/LocationMasterPanel.tsx`
  - prefix: `location-master.list.*`
- `src/features/employee/components/StateMasterPanel.tsx`
  - prefix: `state-master.list.*`
- `src/features/employee/components/UserMasterPanel.tsx`
  - prefix: `user-master.*`

## Employee Salary

- `src/features/employee-salary/components/EmployeeSalaryDetailPage.tsx`
  - prefix: `employee-salary.detail.*`
- `src/features/employee-salary/components/EmployeeSalaryListPage.tsx`
  - prefix: `employee-salary.list.*`
- `src/features/employee-salary/components/EmployeeSalarySummaryCard.tsx`
  - prefix: `employee-salary.summary.*`

## Leave

- `src/features/leave/components/LeaveForm.tsx`
  - prefix: `leave.form.*`

## IT Declaration Review

- `src/features/it-declaration/components/ITDeclarationActionBar.tsx`
  - prefix: `it-declaration.review.*`
- `src/features/it-declaration/components/ITDeclarationItemReviewPanel.tsx`
  - prefix: `it-declaration.review.*`
- `src/features/it-declaration/components/ITDeclarationProofViewer.tsx`
  - prefix: `it-declaration.proof-viewer.*`
- `src/features/it-declaration/components/ITDeclarationReviewDetailPage.tsx`
  - prefix: `it-declaration.review-detail.*`
- `src/features/it-declaration/components/ITDeclarationReviewListPage.tsx`
  - prefix: `it-declaration.review-list.*`

## Payroll

- `src/features/payroll/components/EmployeePayrollInputEditorPage.tsx`
  - prefix: `employee-payroll-input.editor.*`
- `src/features/payroll/components/EmployeePayrollInputListPage.tsx`
  - prefix: `employee-payroll-input.list.*`
- `src/features/payroll/components/EssDeclarationCategoryMasterPanel.tsx`
  - prefix: `ess-declaration-category.list.*`
- `src/features/payroll/components/FNFActionBar.tsx`
  - prefix: `payroll.fnf.action.*`
- `src/features/payroll/components/FNFSettlementCreatePage.tsx`
  - prefix: `payroll.fnf-settlement-create.*`
- `src/features/payroll/components/FNFSettlementDetailPage.tsx`
  - prefix: `payroll.fnf-settlement-detail.*`
- `src/features/payroll/components/FNFSettlementLineEditor.tsx`
  - prefix: `payroll.fnf.line-editor.*`
- `src/features/payroll/components/FNFSettlementListPage.tsx`
  - prefix: `payroll.fnf-settlement-list.*`
- `src/features/payroll/components/FNFSettlementPanels.tsx`
  - prefix: `payroll.fnf-settlement-panels.*`
- `src/features/payroll/components/PayrollResultDetailPage.tsx`
  - prefix: `payroll-results.detail.*`
- `src/features/payroll/components/PayrollResultListPage.tsx`
  - prefix: `payroll-results.list.*`
- `src/features/payroll/components/PayrollRunDetailPage.tsx`
  - prefix: `payroll-runs.detail.*`
- `src/features/payroll/components/PayrollRunEditorPage.tsx`
  - prefix: `payroll-runs.editor.*`
- `src/features/payroll/components/PayrollRunForm.tsx`
  - prefix: `payroll-runs.form.*`
- `src/features/payroll/components/PayrollRunListPage.tsx`
  - prefix: `payroll-runs.list.*`
- `src/features/payroll/components/StatutoryRuleEditorPage.tsx`
  - prefix: `statutory-rules.editor.*`
- `src/features/payroll/components/StatutoryRuleListPage.tsx`
  - prefix: `statutory-rules.list.*`

## Payroll Cycles and Process Logs

- `src/features/payroll-cycles/components/PayrollCycleEditorPage.tsx`
  - prefix: `payroll-cycles.editor.*`
- `src/features/payroll-cycles/components/PayrollCycleListPage.tsx`
  - prefix: `payroll-cycles.list.*`
- `src/features/payroll-process-logs/components/PayrollProcessLogPage.tsx`
  - prefix: `payroll-process-logs.list.*`

## Reimbursements

- `src/features/reimbursements/components/MyReimbursementClaimsPage.tsx`
  - prefix: `reimbursements.claims.*`
- `src/features/reimbursements/components/ReimbursementActionBar.tsx`
  - prefix: `reimbursements.review.*`
- `src/features/reimbursements/components/ReimbursementClaimEditorPage.tsx`
  - prefix: `reimbursements.claim-editor.*`
- `src/features/reimbursements/components/ReimbursementClaimItemForm.tsx`
  - prefix: `reimbursements.claim-item.*`
- `src/features/reimbursements/components/ReimbursementItemReviewPanel.tsx`
  - prefix: `reimbursements.review-item.*`
- `src/features/reimbursements/components/ReimbursementProofUploadPanel.tsx`
  - prefix: `reimbursements.proof-upload.*`
- `src/features/reimbursements/components/ReimbursementProofViewer.tsx`
  - prefix: `reimbursements.proof-viewer.*`
- `src/features/reimbursements/components/ReimbursementReviewDetailPage.tsx`
  - prefix: `reimbursements.review-detail.*`
- `src/features/reimbursements/components/ReimbursementReviewListPage.tsx`
  - prefix: `reimbursements.review-list.*`

## Reports

- `src/features/reports/components/BankFileReportPage.tsx`
  - prefix: `reports.bank-file.*`
- `src/features/reports/components/PayrollRegisterReportPage.tsx`
  - prefix: `reports.payroll-register.*`
- `src/features/reports/components/StatutoryReportPage.tsx`
  - prefix: `reports.statutory.*`

## Salary Components and Structures

- `src/features/salary-components/components/SalaryComponentEditorPage.tsx`
  - prefix: `salary-components.editor.*`
- `src/features/salary-components/components/SalaryComponentListPage.tsx`
  - prefix: `salary-components.list.*`
- `src/features/salary-structures/components/SalaryStructureEditorPage.tsx`
  - prefix: `salary-structures.editor.*`
- `src/features/salary-structures/components/SalaryStructureListPage.tsx`
  - prefix: `salary-structures.list.*`

## Security

- `src/features/security/components/UserGroupAdminPage.tsx`
  - prefix: `security.user-group-admin.*`
- `src/features/security/components/UserGroupAssignmentsPage.tsx`
  - prefix: `security.user-group-assignments.*`
- `src/features/security/components/UserGroupEditorDialog.tsx`
  - prefix: `security.user-group-editor.*`
- `src/features/security/components/UserGroupMasterDialog.tsx`
  - prefix: `security.user-group-master-dialog.*`
- `src/features/security/components/UserGroupMasterScreen.tsx`
  - prefix: `security.user-group-master.*`
- `src/features/security/components/UserGroupRightsEditor.tsx`
  - prefix: `security.user-group-rights-editor.*`
- `src/features/security/components/UserGroupRightsMatrix.tsx`
  - prefix: `security.user-group-rights-matrix.*`
- `src/features/security/components/UserGroupRightsPage.tsx`
  - prefix: `security.user-group-rights-page.*`

## Tax Regimes

- `src/features/tax-regimes/components/TaxRegimeEditorPage.tsx`
  - prefix: `tax-regimes.editor.*`
- `src/features/tax-regimes/components/TaxRegimeListPage.tsx`
  - prefix: `tax-regimes.list.*`
- `src/features/tax-regimes/components/TaxSlabMaintenancePage.tsx`
  - prefix: `tax-regimes.slabs.*`

## Tenant Admin and Tenant Onboarding

- `src/features/tenant-admin/components/TenantAdminShell.tsx`
  - prefix: `tenant-admin.shell.*`
- `src/features/tenant-admin/components/TenantAdminTenantEditorPage.tsx`
  - prefix: `tenant-admin.tenant-editor.*`
- `src/features/tenant-admin/components/TenantManagementPage.tsx`
  - prefix: `tenant-admin.tenant-management.*`
- `src/features/tenants/components/TenantOnboardingPage.tsx`
  - prefix: `tenant.onboarding.*`

## Version Logs

- `src/features/version-logs/components/VersionLogEditorPage.tsx`
  - prefix: `version-logs.editor.*`
- `src/features/version-logs/components/VersionLogListPage.tsx`
  - prefix: `version-logs.list.*`

## Notes

- Many row-level selectors are intentionally pattern-based through `CommonRowActions` and `CommonDataGrid`.
- For repeated controls, use `data-row-key` as the companion row identifier where already implemented.
- Do not use MUI icon SVG `controlId` values such as `AlternateEmailRoundedIcon` for automation.
- Do not use `.Mui*` classes for automation selectors.
