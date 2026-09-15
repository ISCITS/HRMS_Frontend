"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { holidayMasterService } from "@/features/holiday-master/services/holidayMasterService";
import type { HolidayFilters, HolidayRecord } from "@/features/holiday-master/types/HolidayTypes";
import type { HolidayFormOptionsApiRecord } from "@/services/master/MasterApiService";
import { authHelpers } from "@/lib/auth";

export const objEmptyHolidayFilters: HolidayFilters = {
  strSearchName: "", strSearchCode: "", strHolidayTypeCode: "", strStatus: "", dtFromDate: "", dtToDate: "",
};

type HolidayPersistedFilters = HolidayFilters & { intYear: number };

function getHolidayFilterStorageKey() {
  return `hrms_holiday_filters_${authHelpers.getTenantID() ?? 0}_${authHelpers.getCompanyID() ?? 0}`;
}

function readHolidayFilters(): HolidayPersistedFilters {
  const objDefaultFilters = { intYear: new Date().getFullYear(), ...objEmptyHolidayFilters };
  if (typeof window === "undefined") return objDefaultFilters;
  try {
    const objStoredFilters = JSON.parse(window.sessionStorage.getItem(getHolidayFilterStorageKey()) ?? "null") as Partial<HolidayPersistedFilters> | null;
    if (!objStoredFilters || !Number.isInteger(objStoredFilters.intYear)) return objDefaultFilters;
    return {
      intYear: objStoredFilters.intYear as number,
      strSearchName: String(objStoredFilters.strSearchName ?? ""),
      strSearchCode: String(objStoredFilters.strSearchCode ?? ""),
      strHolidayTypeCode: String(objStoredFilters.strHolidayTypeCode ?? ""),
      strStatus: String(objStoredFilters.strStatus ?? ""),
      dtFromDate: String(objStoredFilters.dtFromDate ?? ""),
      dtToDate: String(objStoredFilters.dtToDate ?? ""),
    };
  } catch {
    return objDefaultFilters;
  }
}

export function useHolidayMaster() {
  const objInitialFilters = useMemo(readHolidayFilters, []);
  const [intYear, setIntYear] = useState(objInitialFilters.intYear);
  const [objFilters, setObjFilters] = useState<HolidayFilters>({
    strSearchName: objInitialFilters.strSearchName,
    strSearchCode: objInitialFilters.strSearchCode,
    strHolidayTypeCode: objInitialFilters.strHolidayTypeCode,
    strStatus: objInitialFilters.strStatus,
    dtFromDate: objInitialFilters.dtFromDate,
    dtToDate: objInitialFilters.dtToDate,
  });
  const [lstHolidays, setLstHolidays] = useState<HolidayRecord[]>([]);
  const [objOptions, setObjOptions] = useState<HolidayFormOptionsApiRecord>({ lstLanguages: [], lstHolidayTypes: [] });
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const load = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const [lstRecords, dicOptions] = await Promise.all([
        holidayMasterService.list(intYear, objFilters),
        holidayMasterService.options(),
      ]);
      setLstHolidays(lstRecords);
      const intCurrentLanguageID = authHelpers.getLanguageID();
      const intSecondaryLanguageID = authHelpers.getSecondaryLanguageID();
      const lstAllowedLanguageIDs = new Set(
        [intCurrentLanguageID, intSecondaryLanguageID].filter(
          (intLanguageID): intLanguageID is number => typeof intLanguageID === "number",
        ),
      );
      // Form options may be cached independently; only expose this session's tenant languages.
      setObjOptions({
        ...dicOptions,
        lstLanguages: dicOptions.lstLanguages.filter(
          (objLanguage) => lstAllowedLanguageIDs.size === 0 || lstAllowedLanguageIDs.has(objLanguage.intID),
        ),
      });
    } catch (objError) {
      setStrError(objError instanceof Error ? objError.message : "Unable to load holidays.");
    } finally {
      setBlnLoading(false);
    }
  }, [intYear, objFilters]);

  useEffect(() => { load().catch(() => undefined); }, [load]);
  useEffect(() => {
    window.sessionStorage.setItem(getHolidayFilterStorageKey(), JSON.stringify({ intYear, ...objFilters }));
  }, [intYear, objFilters]);
  return { intYear, setIntYear, objFilters, setObjFilters, lstHolidays, objOptions, blnLoading, strError, load };
}
