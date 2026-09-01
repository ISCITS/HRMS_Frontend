"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { leavePlanService } from "@/features/leave-plan/services/leavePlanService";
import type {
  LeavePlan, LeavePlanLanguages, LeavePlanSaveRequest, LeavePolicyOption, LeaveTypeOption,
} from "@/features/leave-plan/types/LeavePlanTypes";

const objEmptyLanguages: LeavePlanLanguages = { lstLanguages: [], intDefaultLanguageID: 0, intSecondaryLanguageID: null };

// Accepts the plan's public identifier from the URL; the endpoints dual-accept.
export function useLeavePlanEditor(intPlanID?: string | number) {
  const [objPlan, setObjPlan] = useState<LeavePlan | null>(null);
  const [lstLeaveTypes, setLstLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [objLanguages, setObjLanguages] = useState<LeavePlanLanguages>(objEmptyLanguages);
  const [dicPolicies, setDicPolicies] = useState<Record<number, LeavePolicyOption[]>>({});
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  const loadPolicies = useCallback(async (intLeaveTypeID: number, dtEffectiveOn?: string) => {
    if (!intLeaveTypeID) return [];
    const lstPolicies = await leavePlanService.getCompatiblePolicies(intLeaveTypeID, dtEffectiveOn);
    setDicPolicies((dicCurrent) => ({ ...dicCurrent, [intLeaveTypeID]: lstPolicies }));
    return lstPolicies;
  }, []);

  useEffect(() => {
    let blnMounted = true;
    async function loadEditor() {
      setBlnLoading(true);
      setStrError("");
      try {
        // Lookups intentionally load before edit data so IDs can be mapped deterministically.
        const [lstTypes, objLanguageResult] = await Promise.all([leavePlanService.getActiveLeaveTypes(), leavePlanService.getLanguages()]);
        if (!blnMounted) return;
        setLstLeaveTypes(lstTypes);
        setObjLanguages(objLanguageResult);
        if (intPlanID) {
          const objPlanResult = await leavePlanService.getPlan(intPlanID);
          const lstTypeIDs = Array.from(new Set((objPlanResult.lstItems ?? []).map((objItem) => objItem.intLeaveTypeID)));
          const lstPolicyResults = await Promise.all(lstTypeIDs.map(async (intTypeID) => [intTypeID, await leavePlanService.getCompatiblePolicies(intTypeID, objPlanResult.dtEffectiveFrom)] as const));
          if (!blnMounted) return;
          setDicPolicies(Object.fromEntries(lstPolicyResults));
          setObjPlan(objPlanResult);
        }
      } catch (objError) {
        if (blnMounted) setStrError((await createApiRequestError(objError)).message);
      } finally {
        if (blnMounted) setBlnLoading(false);
      }
    }
    void loadEditor();
    return () => { blnMounted = false; };
  }, [intPlanID]);

  async function savePlan(objPayload: LeavePlanSaveRequest) {
    setBlnSaving(true);
    try {
      return intPlanID ? await leavePlanService.updatePlan(intPlanID, objPayload) : await leavePlanService.createPlan(objPayload);
    } finally {
      setBlnSaving(false);
    }
  }

  return { objPlan, lstLeaveTypes, objLanguages, dicPolicies, blnLoading, blnSaving, strError, loadPolicies, savePlan };
}
