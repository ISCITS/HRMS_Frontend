"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useVersionLogLabels() {
  return useModuleLabels("version_log", "Unable to load version log labels.");
}
