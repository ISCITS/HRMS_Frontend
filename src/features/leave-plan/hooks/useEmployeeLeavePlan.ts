"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

// Accepts the employee's public identifier from the URL; every endpoint below dual-accepts.
export function useEmployeeLeavePlan(intEmployeeID: string | number, intLeaveYear: number) {
  const [objEmployee, setObjEmployee] = useState<EmployeeDetailRecord | null>(null);
  const [objOverview, setObjOverview] = useState<EmployeeLeavePlanOverview | null>(null);
  const [objCurrentPlan, setObjCurrentPlan] = useState<LeavePlan | null>(null);
  const [lstPlans, setLstPlans] = useState<LeavePlan[]>([]);
  const [lstLeaveTypes, setLstLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [lstLedger, setLstLedger] = useState<EmployeeLeaveLedger[]>([]);
  const [blnLoading, setBlnLoading] = useState(true);
  const [blnRefreshing, setBlnRefreshing] = useState(false);
  const [blnSaving, setBlnSaving] = useState(false);
  const [strError, setStrError] = useState("");
  // Only the very first load blanks the whole page; later reloads (e.g. changing the Leave Year)
  // refresh the data in place via blnRefreshing, so the page does not flash a full-screen spinner.
  const refInitialLoaded = useRef(false);
  // Guards against out-of-order responses: typing the Leave Year fires a request per keystroke, so a
  // superseded request (e.g. the invalid "202" while typing "2027") must not overwrite the newest
  // result — otherwise its validation error would linger after a valid year is entered.
  const refRequestToken = useRef(0);

  const loadData = useCallback(async () => {
    const intToken = ++refRequestToken.current;
    const blnInitial = !refInitialLoaded.current;
    if (blnInitial) setBlnLoading(true); else setBlnRefreshing(true);
    setStrError("");
    try {
      const [objEmployeeResult, objOverviewResult, lstPlanResult, lstTypeResult, lstLedgerResult] = await Promise.all([
        employeeService.getEmployeeById(intEmployeeID, { strMenuAction: "LEAVE_VIEW" }),
        leavePlanService.getEmployeeOverview(intEmployeeID, intLeaveYear),
        leavePlanService.listPlans(),
        leavePlanService.getActiveLeaveTypes(),
        leavePlanService.getLedger(intEmployeeID, intLeaveYear),
      ]);
      const objCurrentPlanResult = objOverviewResult.objCurrentAssignment
        ? await leavePlanService.getPlan(objOverviewResult.objCurrentAssignment.intLeavePlanID)
        : null;
      if (intToken !== refRequestToken.current) return;  // a newer request has superseded this one
      setObjEmployee(objEmployeeResult);
      setObjOverview(objOverviewResult);
      setLstPlans(lstPlanResult);
      setLstLeaveTypes(lstTypeResult);
      setLstLedger(lstLedgerResult);
      setObjCurrentPlan(objCurrentPlanResult);
      refInitialLoaded.current = true;
    } catch (objError) {
      if (intToken !== refRequestToken.current) return;  // ignore a stale (superseded) failure
      setStrError((await createApiRequestError(objError)).message);
    } finally {
      if (intToken === refRequestToken.current) {
        setBlnLoading(false);
        setBlnRefreshing(false);
      }
    }
  }, [intEmployeeID, intLeaveYear]);

  useEffect(() => { void loadData(); }, [loadData]);

  async function runMutation(fnMutation: () => Promise<unknown>) {
    setBlnSaving(true);
    try { await fnMutation(); await loadData(); } finally { setBlnSaving(false); }
  }

  return {
    objEmployee, objOverview, objCurrentPlan, lstPlans, lstLeaveTypes, lstLedger, blnLoading, blnRefreshing, blnSaving, strError, loadData,
    fetchPlan: (intPlanID: number) => leavePlanService.getPlan(intPlanID),
    previewReplacement: (objPayload: ReplacementPreviewRequest) => leavePlanService.previewReplacement(intEmployeeID, objPayload),
    assignPlan: (objPayload: EmployeePlanAssignRequest, blnReplace: boolean) => runMutation(() => leavePlanService.assignPlan(intEmployeeID, objPayload, blnReplace)),
    updateAssignment: (objPayload: EmployeePlanAssignmentUpdateRequest) => runMutation(() => leavePlanService.updateAssignment(intEmployeeID, objPayload)),
    initializeBalances: () => runMutation(() => leavePlanService.initializeBalances(intEmployeeID, intLeaveYear)),
    setOpeningBalance: (intBalanceID: number, objPayload: OpeningBalanceRequest) => runMutation(() => leavePlanService.setOpeningBalance(intEmployeeID, intBalanceID, objPayload)),
    adjustBalance: (intBalanceID: number, strDirection: "credit" | "debit", objPayload: BalanceMovementRequest) => runMutation(() => leavePlanService.adjustBalance(intEmployeeID, intBalanceID, strDirection, objPayload)),
  };
}
