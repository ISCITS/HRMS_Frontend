"use client";

import { useEffect, useMemo, useState } from "react";

import { getUniqueOptions } from "@/features/reports/components/ReportMultiSelectField";
import {
  payrollResultService,
  type PayrollReportFilterLookup,
} from "@/features/payroll/services/payrollResultService";

export type PayrollReportFilterOptions = {
  lstEmployees: string[];
  lstRuns: string[];
  lstMonths: string[];
  lstDepartments: string[];
  lstLocations: string[];
  lstAllocationEntities: string[];
  lstStatuses: string[];
  lstVariablePayTypes: string[];
};

/**
 * Search-first payroll report screens: nothing loads on open, so the filter dropdowns come from
 * a light lookup (GET /payroll/results/report-filter-options) instead of the loaded rows.
 */
export function usePayrollReportFilterOptions(blnEnabled: boolean, blnVariablePayRunsOnly = false) {
  const [objLookup, setObjLookup] = useState<PayrollReportFilterLookup | null>(null);
  const [strLookupError, setStrLookupError] = useState("");

  useEffect(() => {
    if (!blnEnabled) {
      return;
    }
    let blnCancelled = false;
    payrollResultService
      .getPayrollReportFilterOptions(blnVariablePayRunsOnly)
      .then((objResult) => {
        if (!blnCancelled) {
          setObjLookup(objResult);
        }
      })
      .catch((objError) => {
        if (!blnCancelled) {
          setStrLookupError(objError instanceof Error ? objError.message : "Unable to load report filters.");
        }
      });
    return () => {
      blnCancelled = true;
    };
  }, [blnEnabled, blnVariablePayRunsOnly]);

  const dicFilterOptions = useMemo<PayrollReportFilterOptions>(() => ({
    lstEmployees: getUniqueOptions((objLookup?.lstEmployees ?? []).flatMap((dicEmployee) => [
      dicEmployee.strEmployeeCode,
      dicEmployee.strEmployeeName,
      `${dicEmployee.strEmployeeCode} - ${dicEmployee.strEmployeeName}`,
    ])),
    lstRuns: getUniqueOptions((objLookup?.lstRuns ?? []).flatMap((dicRun) => [dicRun.strRunCode, dicRun.strRunName])),
    lstMonths: getUniqueOptions((objLookup?.lstRuns ?? []).map((dicRun) => dicRun.dtPayrollMonth?.slice(0, 7))),
    lstDepartments: objLookup?.lstDepartments ?? [],
    lstLocations: objLookup?.lstLocations ?? [],
    lstAllocationEntities: objLookup?.lstAllocationEntities ?? [],
    lstStatuses: objLookup?.lstStatuses ?? [],
    lstVariablePayTypes: objLookup?.lstVariablePayTypes ?? [],
  }), [objLookup]);

  return { dicFilterOptions, strLookupError, setStrLookupError };
}

/** A payroll report search must name an employee, a payroll month or a run before it loads. */
export function hasPayrollReportCriteria(objFilters: {
  strSearchEmployee?: string;
  strSearchRun?: string;
  strPayrollMonth?: string;
}) {
  return Boolean(
    objFilters.strSearchEmployee?.trim() || objFilters.strSearchRun?.trim() || objFilters.strPayrollMonth?.trim(),
  );
}

export const strPayrollReportCriteriaMessage = "Select an employee, payroll month or run, then search.";
