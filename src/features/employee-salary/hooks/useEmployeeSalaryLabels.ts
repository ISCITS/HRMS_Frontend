"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useEmployeeSalaryLabels() {
  return useModuleLabels("employee-salary", "Unable to load employee salary labels.");
}
