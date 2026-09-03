"use client";

import { useCallback, useEffect, useState } from "react";

import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";

export function useSalaryComponents() {
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const loadSalaryComponents = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");

    await runFrontendAction({
      fnAction: () => masterApiService.getSalaryComponents(),
      fnOnSuccess: (objResult) => setLstSalaryComponents(objResult.Data),
      fnOnError: (objError) => setStrError(objError.message),
      fnFinally: () => setBlnLoading(false),
      strFallbackMessage: "Unable to load salary components.",
    });
  }, []);

  useEffect(() => {
    void loadSalaryComponents();
  }, [loadSalaryComponents]);

  return {
    lstSalaryComponents,
    blnLoading,
    strError,
    reload: loadSalaryComponents
  };
}
