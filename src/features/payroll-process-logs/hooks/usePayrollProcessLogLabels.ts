"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function usePayrollProcessLogLabels() {
  return useModuleLabels("payroll-process-logs", "Unable to load payroll process log labels.");
}
