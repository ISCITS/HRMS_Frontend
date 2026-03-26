"use client";

import { useCallback, useEffect, useState } from "react";

import { masterApiService, type SalaryComponentApiRecord } from "@/services/master/MasterApiService";

export function useSalaryComponents() {
  const [lstSalaryComponents, setLstSalaryComponents] = useState<SalaryComponentApiRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const loadSalaryComponents = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await masterApiService.getSalaryComponents();
      setLstSalaryComponents(objResult.Data);
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load salary components.");
    } finally {
      setBlnLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalaryComponents().catch(() => undefined);
  }, [loadSalaryComponents]);

  return {
    lstSalaryComponents,
    blnLoading,
    strError,
    reload: loadSalaryComponents
  };
}
