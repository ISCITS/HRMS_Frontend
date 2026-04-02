"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function usePayrollCycleLabels() {
  return useModuleLabels("payroll-cycles", "Unable to load payroll cycle labels.");
}
