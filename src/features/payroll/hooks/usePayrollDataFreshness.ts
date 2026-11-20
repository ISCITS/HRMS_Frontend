"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";

export type PayrollDataVersion = { strVersion: string; dtChangedOn: string | null };
type MonthsInput = string | Array<string | null | undefined> | null | undefined;

const intCheckEveryMilliseconds = 60_000;

async function getPayrollDataVersion(strMonths: string): Promise<PayrollDataVersion> {
  const objResult = await requestEncryptedApi<PayrollDataVersion>({
    strPath: `${ApiRoutePrefix.ApiV1}/payroll/data-version${strMonths ? `?months=${encodeURIComponent(strMonths)}` : ""}`,
    strMethod: ApiRequestMethod.Get,
    strMenuAction: "PAYROLL_RESULT_VIEW",
    blnUseAuthHeader: true,
  });
  return objResult.Data;
}

/** "2026-09", "2026-09-01", "2026-09,2026-08" or a list of those -> "2026-09,2026-08" ("" = all months). */
export function normalizeMonths(objMonths?: MonthsInput): string {
  const lstValues = Array.isArray(objMonths) ? objMonths : String(objMonths ?? "").split(",");
  return Array.from(
    new Set(lstValues.map((strValue) => String(strValue ?? "").trim().slice(0, 7)).filter((strValue) => /^\d{4}-\d{2}$/.test(strValue))),
  ).join(",");
}

/**
 * Remembers which version of the payroll figures a screen loaded and tells it when they change.
 *
 * trackLoad reads the version BEFORE loading the data, so a reprocess made while the data loads is
 * still noticed. check() compares the current version with it and reports a change once. Errors
 * reading the version are ignored: not knowing is no reason to alarm the user.
 */
export function createPayrollDataVersionTracker(
  fnGetVersion: (strMonths: string) => Promise<PayrollDataVersion>,
  fnOnChange: (blnStale: boolean, dtChangedOn: string | null) => void,
) {
  let objLoaded: { strMonths: string; strVersion: string } | null = null;
  let blnChecking = false;
  let fnReload: (() => unknown) | null = null;

  return {
    async trackLoad<TResult>(fnLoad: () => Promise<TResult>, objMonths?: MonthsInput, fnReloadScreen?: () => unknown): Promise<TResult> {
      fnReload = fnReloadScreen ?? null;
      const strMonths = normalizeMonths(objMonths);
      const objVersion = await fnGetVersion(strMonths).catch(() => null);
      const objResult = await fnLoad();
      objLoaded = objVersion ? { strMonths, strVersion: objVersion.strVersion } : null;
      fnOnChange(false, null);
      return objResult;
    },
    async check(): Promise<void> {
      const objChecked = objLoaded;
      if (!objChecked || blnChecking) {
        return;
      }
      blnChecking = true;
      try {
        const objCurrent = await fnGetVersion(objChecked.strMonths);
        // Ignore an answer that arrives after the screen reloaded.
        if (objLoaded === objChecked && objCurrent.strVersion !== objChecked.strVersion) {
          fnOnChange(true, objCurrent.dtChangedOn);
        }
      } catch {
        // See the docstring.
      } finally {
        blnChecking = false;
      }
    },
    reload(): void {
      void Promise.resolve(fnReload?.()).catch(() => undefined);
    },
  };
}

/**
 * Tells a screen showing payroll figures that they changed after it loaded them (a reprocess, a
 * newly processed run or employee, or an edit to a result) so it can offer a Refresh.
 * Wrap the screen's load in trackLoad(fnLoad, months, reload); the version is checked every minute
 * and whenever the window regains focus. Finalizing/reopening a run does not change figures and
 * does not raise the notice.
 */
export function usePayrollDataFreshness(blnEnabled = true) {
  const [dtChangedOn, setDtChangedOn] = useState<string | null>(null);
  const [blnStale, setBlnStale] = useState(false);
  const objTracker = useMemo(
    () =>
      createPayrollDataVersionTracker(
        (strMonths) => (blnEnabled ? getPayrollDataVersion(strMonths) : Promise.reject(new Error("disabled"))),
        (blnNowStale, dtNowChangedOn) => {
          setBlnStale(blnNowStale);
          setDtChangedOn(dtNowChangedOn);
        },
      ),
    [blnEnabled],
  );
  const trackLoad = objTracker.trackLoad;
  const checkNow = useCallback(() => objTracker.check(), [objTracker]);
  const reload = useCallback(() => objTracker.reload(), [objTracker]);

  useEffect(() => {
    if (!blnEnabled) {
      return;
    }
    const intTimer = window.setInterval(() => void checkNow(), intCheckEveryMilliseconds);
    const fnOnFocus = () => void checkNow();
    const fnOnVisible = () => {
      if (document.visibilityState === "visible") {
        void checkNow();
      }
    };
    window.addEventListener("focus", fnOnFocus);
    document.addEventListener("visibilitychange", fnOnVisible);
    return () => {
      window.clearInterval(intTimer);
      window.removeEventListener("focus", fnOnFocus);
      document.removeEventListener("visibilitychange", fnOnVisible);
    };
  }, [blnEnabled, checkNow]);

  return { blnStale, dtChangedOn, trackLoad, checkNow, reload };
}

export type PayrollDataFreshness = ReturnType<typeof usePayrollDataFreshness>;
