"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useFlexiPayDeclarationLabels() {
  return useModuleLabels("flexi-pay-declaration", "Unable to load flexi pay declaration labels.");
}
