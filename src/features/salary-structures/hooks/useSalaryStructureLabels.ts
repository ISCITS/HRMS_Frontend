"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useSalaryStructureLabels() {
  return useModuleLabels("salary-structures", "Unable to load salary structure labels.");
}
