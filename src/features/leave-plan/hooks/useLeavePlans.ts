"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leavePlanService } from "@/features/leave-plan/services/leavePlanService";
import type { LeavePlan, LeavePlanFilters } from "@/features/leave-plan/types/LeavePlanTypes";

export function useLeavePlans(objFilters: LeavePlanFilters) {
  const [lstPlans, setLstPlans] = useState<LeavePlan[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");

  const { strSearch, blnIsActive, dtEffectiveOn } = objFilters;
  const loadPlans = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      setLstPlans(await leavePlanService.listPlans({ strSearch, blnIsActive, dtEffectiveOn }));
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }, [blnIsActive, dtEffectiveOn, strSearch]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  async function setPlanStatus(intPlanID: number, blnIsActive: boolean) {
    await leavePlanService.setPlanStatus(intPlanID, blnIsActive);
    await loadPlans();
  }

  async function deletePlan(intPlanID: number) {
    await leavePlanService.deletePlan(intPlanID);
    await loadPlans();
  }

  return { lstPlans, blnLoading, strError, loadPlans, setPlanStatus, deletePlan };
}
