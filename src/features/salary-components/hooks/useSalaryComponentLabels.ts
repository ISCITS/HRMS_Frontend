"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useSalaryComponentLabels() {
  return useModuleLabels("salary-components", "Unable to load salary component labels.");
}
