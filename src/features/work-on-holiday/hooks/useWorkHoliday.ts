"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError, createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { workHolidayService } from "@/features/work-on-holiday/services/workHolidayService";
import type {
  WorkHolidayList,
  WorkHolidayMutationPayload,
  WorkHolidayRequest,
} from "@/features/work-on-holiday/types/WorkHolidayTypes";

const objEmptyList: WorkHolidayList = { lstItems: [], intTotal: 0, intPage: 1, intPageSize: 20 };

export function useWorkHolidayList(
  strMode: "my" | "queue" | "all",
  strStatus?: string,
  intPage = 1,
  intPageSize = 20,
  blnEnabled = true,
) {
  const [objList, setObjList] = useState<WorkHolidayList>(objEmptyList);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");

  const reload = useCallback(async () => {
    if (!blnEnabled) return;
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = strMode === "my"
        ? await workHolidayService.listMy(strStatus, intPage, intPageSize)
        : strMode === "queue"
          ? await workHolidayService.listQueue(intPage, intPageSize)
          : await workHolidayService.listAll(strStatus, intPage, intPageSize);
      setObjList(objResult);
    } catch (objError) {
      const objHandledError = await createApiRequestError(objError, "Unable to load Work on Holiday requests.");
      setStrError(objHandledError.message);
    } finally {
      setBlnLoading(false);
    }
  }, [blnEnabled, intPage, intPageSize, strMode, strStatus]);

  useEffect(() => { void reload(); }, [reload]);
  return { objList, blnLoading, strError, reload };
}

export function useWorkHolidayDetail() {
  const [objDetail, setObjDetail] = useState<WorkHolidayRequest | null>(null);
  const [blnLoading, setBlnLoading] = useState(false);
  const [strError, setStrError] = useState("");

  const loadDetail = useCallback(async (intRequestID: number) => {
    setBlnLoading(true);
    setStrError("");
    try {
      const objResult = await workHolidayService.getDetail(intRequestID);
      setObjDetail(objResult);
      return objResult;
    } catch (objError) {
      const objHandledError = await createApiRequestError(objError, "Unable to load request details.");
      setStrError(objHandledError.message);
      return null;
    } finally {
      setBlnLoading(false);
    }
  }, []);

  const runMutation = useCallback(async (
    fnMutation: (objPayload: WorkHolidayMutationPayload) => Promise<WorkHolidayRequest>,
    objPayload: WorkHolidayMutationPayload,
  ) => {
    try {
      const objResult = await fnMutation(objPayload);
      setObjDetail(objResult);
      return { objResult, blnConflict: false, strError: "" };
    } catch (objError) {
      const objHandledError = await createApiRequestError(objError, "Unable to complete Work on Holiday action.");
      const blnConflict = objHandledError instanceof ApiRequestError && objHandledError.intStatusCode === 409;
      if (blnConflict && objDetail) await loadDetail(objDetail.intID);
      return { objResult: null, blnConflict, strError: objHandledError.message };
    }
  }, [loadDetail, objDetail]);

  return { objDetail, blnLoading, strError, loadDetail, runMutation, setObjDetail };
}
