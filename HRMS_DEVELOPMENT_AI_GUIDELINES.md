You are working on an existing enterprise HRMS + Payroll SaaS application.

Objective:
Implement ONLY the refinements described below.

This is an existing production-quality application.
The objective is to improve UI consistency, business rules and payroll behaviour WITHOUT redesigning the application.

==========================================================
IMPORTANT IMPLEMENTATION RULES
===

1. Do NOT redesign the application.
2. Do NOT rewrite modules from scratch.
3. Do NOT change database schema unless explicitly requested.
4. Do NOT modify existing APIs unless required for these refinements.
5. Reuse existing services, models, repositories and calculation methods wherever possible.
6. If multiple screens display the same salary information, they MUST consume the same calculation service.
Never duplicate calculation logic.
7. Fix root causes instead of screen-specific workarounds.
8. Preserve all existing functionality unless explicitly mentioned.
9. Do NOT remove any existing validations.
10. Keep all UI styling consistent with the existing application.
11. Preserve responsive behaviour.
12. Preserve multilingual support.
13. Preserve role-based permissions.
14. Preserve audit logging.
15. Preserve revision history.
16. Preserve payroll processing compatibility.
17. Preserve payroll results compatibility.
18. Preserve payslip generation compatibility.
19. Preserve ESS and HR synchronization.
20. Never hardcode business values that already exist in configuration.
21. If new calculations are introduced, implement them inside existing calculation services instead of UI components.
22. Do NOT create duplicate business rules.
23. Use existing enums/constants wherever available.
24. Follow existing coding standards used in the project.
25. Keep changes minimal, modular and production-ready.
26. Add clear comments only where business logic changes.
27. Remove temporary/demo code after implementation unless explicitly required.
28. Every interactive UI element must include a unique `data-control-id` attribute for automation.
29. This is mandatory for all user-interactive controls, including buttons, icons, action buttons, input fields, dropdowns, checkboxes, radio buttons, toggle switches, alerts and alert actions, dialogs/modals, links, events, and any other clickable or focusable control.
30. If a shared wrapper/component accepts a prop such as `controlId`, it must still render a unique `data-control-id` attribute in the final DOM/native test surface.
31. Do not reuse the same `data-control-id` across different interactive elements on the same screen.
32. For all new screens or features, every interactive UI element must include a unique data-control-id attribute as part of the implementation. When modifying or enhancing an existing screen, developers must review all interactive elements and add data-control-id attributes to any elements where they are missing, ensuring the entire screen complies with this standard.

==========================================================
BEFORE WRITING CODE
===

First analyse:

• existing architecture
• current calculation flow
• dependencies
• shared services
• affected modules

Then implement the requested refinements using the existing architecture.

Avoid introducing duplicate calculations.

==========================================================
AFTER IMPLEMENTATION
===

Provide:

1. Summary of changes
2. Files modified
3. Business rules updated
4. Any assumptions made
5. Any risks identified
6. Regression impact
7. Manual testing checklist
8. Confirm whether existing Payroll Processing, Payroll Results, Employee Salary, Salary Structure, ESS, Payslip and Dashboard continue to work without regression.

Do NOT modify anything outside the requested scope.

==========================================================
IMPORTANT:
===

Assume other developers are modifying parallel modules.
Limit your changes strictly to the files required for this task.
Avoid unnecessary formatting changes, renaming, code cleanup or refactoring outside the requested scope to minimize merge conflicts.

==========================================================
Payroll Calculation Rule:
===

Salary Structure is the master configuration.
Employee Salary is the employee-specific snapshot.
ESS stores employee declarations.
Payroll Processing is the final calculation engine.
Payroll Results are the single source of truth after payroll is processed.

Do not move business logic between these layers unless explicitly requested.

==========================================================
ARCHITECTURE OWNERSHIP
===

Salary Structure

* Defines master salary configuration.

Employee Salary

* Stores employee-specific assigned salary.
* May override Salary Structure where allowed.

ESS

* Stores employee declarations only.
* Must not become a payroll calculation engine.

Payroll Processing

* Performs final payroll calculations.

Payroll Results

* Are the final source of truth after processing.

Do not move responsibilities between these modules.

==========================================================
CALCULATION PRIORITY
===

Always follow this order:

Configuration
↓

Salary Structure

↓

Employee Salary

↓

ESS Declaration

↓

Payroll Processing

↓

Payroll Results

↓

Payslip

All salary values displayed across screens must originate from the same calculation service.

==========================================================
UI CONSISTENCY
===

If a field exists on multiple screens:

• Use identical terminology.
• Use identical labels.
• Use identical calculations.
• Use identical ordering.
• Use identical formatting.

Never display conflicting salary values.



==================================================

MULTI-DEVELOPER SAFETY

==================================================



Before making changes:



• Identify files owned by this task.

• Avoid modifying unrelated files.

• Avoid formatting-only changes.

• Avoid renaming shared methods.

• Avoid changing shared interfaces unless necessary.

• If a shared service must change,

&#x20; preserve backward compatibility.



Keep commits small and isolated.

==========================================================
DEMO READINESS
===

The application must appear clean and production ready.

Avoid:
• duplicate panels
• duplicate summaries
• conflicting totals
• placeholder labels
• Component #1 style names
• inconsistent terminology
• unnecessary warnings

Prefer clarity over showing excessive information.

