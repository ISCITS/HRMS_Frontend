import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: [
      "node_modules",
      ".next",
      "e2e",
      // Pre-existing manual-assertion scripts (plain exported functions, no
      // describe/it) written before any test runner was wired up. Unrelated
      // to this change; left as-is rather than rewritten to fit vitest.
      "src/features/dashboard/utils/essDashboardHelpers.test.ts",
      "src/features/leave/components/HourBasedLeave.test.ts",
      "src/features/leave/components/LeaveTypeEditorPage.headings.test.ts",
      "src/features/leave/components/LeaveTypeEditorPage.pocRefinement.test.ts",
      "src/features/employee-salary/utils/employeeSalarySummary.test.ts",
      "src/features/employee-salary/utils/overrideRecalculation.test.ts",
      "src/features/payroll-lookups/utils/lookupLabel.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
