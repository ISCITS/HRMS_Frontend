"use client";

import dicConstant from "@/constants/Constant.json";
import { useModuleLabels } from "@/features/labels/hooks/useModuleLabels";

export function useEmployeeLabels() {
  return useModuleLabels("employee", dicConstant.employeeMaster.errorLoadWorkspace);
}
