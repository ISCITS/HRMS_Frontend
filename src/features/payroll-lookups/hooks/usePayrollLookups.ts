"use client";

import { useEffect, useState } from "react";

import { payrollLookupService, type PayrollLookupOption } from "@/features/payroll-lookups/services/payrollLookupService";
import { authHelpers } from "@/lib/auth";

export function usePayrollLookups(strDomainCode: string) {
  const [lstOptions, setLstOptions] = useState<PayrollLookupOption[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  useEffect(() => {
    let blnMounted = true;

    async function loadOptions() {
      setBlnLoading(true);
      setStrError("");
      try {
        const intLanguageID = authHelpers.getLanguageID();
        const lstResponse = await payrollLookupService.getDomainOptions(
          strDomainCode,
          intLanguageID,
        );
        if (!blnMounted) {
          return;
        }
        setLstOptions(lstResponse);
      } catch (objError) {
        if (!blnMounted) {
          return;
        }
        setLstOptions([]);
        setStrError(objError instanceof Error ? objError.message : "Unable to load payroll lookup options.");
      } finally {
        if (blnMounted) {
          setBlnLoading(false);
        }
      }
    }

    loadOptions().catch(() => undefined);
    return () => {
      blnMounted = false;
    };
  }, [strDomainCode]);

  return {
    lstOptions,
    blnLoading,
    strError,
  };
}
