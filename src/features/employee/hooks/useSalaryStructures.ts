"use client";

import { useCallback, useEffect, useState } from "react";

import { masterApiService, type SalaryStructureApiRecord } from "@/services/master/MasterApiService";

export function useSalaryStructures() {
  const [lstSalaryStructures, setLstSalaryStructures] = useState<SalaryStructureApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const loadSalaryStructures = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await masterApiService.getSalaryStructures();
      setLstSalaryStructures(objResult.Data);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary structures.");
    } finally {
      setBlnLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalaryStructures().catch(() => undefined);
  }, [loadSalaryStructures]);

  return {
    lstSalaryStructures,
    blnLoading,
    strError,
    reload: loadSalaryStructures
  };
}
