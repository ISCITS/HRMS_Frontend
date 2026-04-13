"use client";

import { useCallback, useEffect, useState } from "react";

import { runFrontendAction } from "@/Common/utils/apiErrorHandler";
import { masterApiService, type SalaryStructureApiRecord } from "@/services/master/MasterApiService";

export function useSalaryStructures() {
  const [lstSalaryStructures, setLstSalaryStructures] = useState<SalaryStructureApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const loadSalaryStructures = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");

    await runFrontendAction({
      fnAction: () => masterApiService.getSalaryStructures(),
      fnOnSuccess: (objResult) => setLstSalaryStructures(objResult.Data),
      fnOnError: (objError) => setStrError(objError.message),
      fnFinally: () => setBlnLoading(false),
      strFallbackMessage: "Unable to load salary structures.",
    });
  }, []);

  useEffect(() => {
    void loadSalaryStructures();
  }, [loadSalaryStructures]);

  return {
    lstSalaryStructures,
    blnLoading,
    strError,
    reload: loadSalaryStructures
  };
}
