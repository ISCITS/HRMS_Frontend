"use client";

import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useReimbursementLabels() {
  return useModuleLabels("reimbursements", "Unable to load reimbursement labels.");
}
