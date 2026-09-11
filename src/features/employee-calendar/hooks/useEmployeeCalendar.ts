"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiDefaultMessage } from "@/Common/enums/AppEnums";
import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeCalendarService } from "@/features/employee-calendar/services/employeeCalendarService";
import type { EmployeeCalendarData } from "@/features/employee-calendar/types/EmployeeCalendarTypes";

function toIsoDate(objDate: Date) {
  const intMonth = objDate.getMonth() + 1;
  return `${objDate.getFullYear()}-${String(intMonth).padStart(2, "0")}-${String(objDate.getDate()).padStart(2, "0")}`;
}

export function useEmployeeCalendar(objMonth: Date, blnCanLoad: boolean, intLanguageID: number | null) {
  const [objCalendar, setObjCalendar] = useState<EmployeeCalendarData | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");
  const [intReloadToken, setIntReloadToken] = useState(0);
  const reload = useCallback(() => setIntReloadToken((intValue) => intValue + 1), []);

  useEffect(() => {
    if (!blnCanLoad) return;
    let blnCurrent = true;
    const objFromDate = new Date(objMonth.getFullYear(), objMonth.getMonth(), 1);
    const objToDate = new Date(objMonth.getFullYear(), objMonth.getMonth() + 1, 0);
    setBlnLoading(true);
    setStrError("");
    employeeCalendarService.getCalendar(toIsoDate(objFromDate), toIsoDate(objToDate))
      .then((objData) => { if (blnCurrent) setObjCalendar(objData); })
      .catch(async (objError: unknown) => {
        const objApiError = await createApiRequestError(objError, ApiDefaultMessage.RequestFailed);
        if (blnCurrent) { setObjCalendar(null); setStrError(objApiError.message); }
      })
      .finally(() => { if (blnCurrent) setBlnLoading(false); });
    return () => { blnCurrent = false; };
  }, [blnCanLoad, intLanguageID, intReloadToken, objMonth]);

  return { objCalendar, blnLoading, strError, reload };
}
