"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useTaxRegimeLabels() {
  return useModuleLabels("tax-regimes", "Unable to load tax regime labels.");
}
