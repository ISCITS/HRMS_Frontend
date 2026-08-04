"use client";

import { useCallback, useEffect, useState } from "react";

import { createApiRequestError } from "@/Common/utils/apiErrorHandler";
import { employeeService } from "@/features/employee/services/employeeService";
import type { EmployeeDetailRecord, EmployeeListRecord } from "@/features/employee/types";
import { leavePlanService } from "@/features/leave-plan/services/leavePlanService";
import type {
  BalanceMovementRequest, EmployeeLeaveLedger, EmployeeLeavePlanOverview, EmployeePlanAssignRequest,
  EmployeePlanAssignmentUpdateRequest, LeavePlan, LeaveTypeOption, OpeningBalanceRequest,
  ReplacementPreviewRequest,
} from "@/features/leave-plan/types/LeavePlanTypes";

export function useEmployeeOptions() {
  const [lstEmployees, setLstEmployees] = useState<EmployeeListRecord[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [strError, setStrError] = useState("");
  useEffect(() => {
    let blnMounted = true;
    employeeService.getEmployees()
      .then((lstResult) => { if (blnMounted) setLstEmployees(lstResult); })
      .catch(async (objError) => { if (blnMounted) setStrError((await createApiRequestError(objError)).message); })
      .finally(() => { if (blnMounted) setBlnLoading(false); });
    return () => { blnMounted = false; };
  }, []);
  return { lstEmployees, blnLoading, strError };
}

export function useEmployeeLeavePlan(intEmployeeID: number, intLeaveYear: number) {
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objOverview, setObjOverview] = useState<EmployeeLeavePlanOverview | null>(null);
  const [objCurrentPlan, setObjCurrentPlan] = useState<LeavePlan | null>(null);
  const [lstPlans, setLstPlans] = useState<LeavePlan[]>([]);
  const [lstLeaveTypes, setLstLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [lstLedger, setLstLedger] = useState<EmployeeLeaveLedger[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");

  const loadData = useCallback(async () => {
    setBlnLoading(true);
    setStrError("");
    try {
      const [objEmployeeResult, objOverviewResult, lstPlanResult, lstTypeResult, lstLedgerResult] = await Promise.all([
        employeeService.getEmployeeById(intEmployeeID, { strMenuAction: "LEAVE_VIEW" }),
        leavePlanService.getEmployeeOverview(intEmployeeID, intLeaveYear),
        leavePlanService.listPlans(),
        leavePlanService.getActiveLeaveTypes(),
        leavePlanService.getLedger(intEmployeeID, intLeaveYear),
      ]);
      setObjEmployee(objEmployeeResult);
      setObjOverview(objOverviewResult);
      setLstPlans(lstPlanResult);
      setLstLeaveTypes(lstTypeResult);
      setLstLedger(lstLedgerResult);
      setObjCurrentPlan(objOverviewResult.objCurrentAssignment
        ? await leavePlanService.getPlan(objOverviewResult.objCurrentAssignment.intLeavePlanID)
        : null);
    } catch (objError) {
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      setBlnLoading(false);
    }
  }, [intEmployeeID, intLeaveYear]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function runMutation(fnMutation: () => Promise<unknown>) {
    setBlnSaving(true);
    try { await fnMutation(); await loadData(); } finally { setBlnSaving(false); }
  }

  return {
    objEmployee, objOverview, objCurrentPlan, lstPlans, lstLeaveTypes, lstLedger, blnLoading, blnSaving, strError, loadData,
    fetchPlan: (intPlanID: number) => leavePlanService.getPlan(intPlanID),
    previewReplacement: (objPayload: ReplacementPreviewRequest) => leavePlanService.previewReplacement(intEmployeeID, objPayload),
    assignPlan: (objPayload: EmployeePlanAssignRequest, blnReplace: boolean) => runMutation(() => leavePlanService.assignPlan(intEmployeeID, objPayload, blnReplace)),
    updateAssignment: (objPayload: EmployeePlanAssignmentUpdateRequest) => runMutation(() => leavePlanService.updateAssignment(intEmployeeID, objPayload)),
    initializeBalances: () => runMutation(() => leavePlanService.initializeBalances(intEmployeeID, intLeaveYear)),
    setOpeningBalance: (intBalanceID: number, objPayload: OpeningBalanceRequest) => runMutation(() => leavePlanService.setOpeningBalance(intEmployeeID, intBalanceID, objPayload)),
    adjustBalance: (intBalanceID: number, strDirection: "credit" | "debit", objPayload: BalanceMovementRequest) => runMutation(() => leavePlanService.adjustBalance(intEmployeeID, intBalanceID, strDirection, objPayload)),
  };
}
