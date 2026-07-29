"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useDashboardLabels() {
  return useModuleLabels("dashboard", "Unable to load dashboard labels.");
}
