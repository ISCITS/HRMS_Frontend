"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  BalanceMovementRequest, BalanceMutationResult, EmployeeLeaveBalance, EmployeeLeaveLedger,
  EmployeeLeavePlanOverview, EmployeePlanAssignRequest, EmployeePlanAssignmentUpdateRequest, LeavePlan, LeavePlanFilters, LeavePlanLanguages,
  LeavePlanSaveRequest, LeavePolicyOption, LeaveTypeOption, OpeningBalanceRequest,
} from "@/features/leave-plan/types/LeavePlanTypes";

const strLeaveViewAction = "LEAVE_VIEW";
const strLeaveManageAction = "LEAVE_MANAGE";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  strMenuAction: string;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    strMenuAction: objOptions.strMenuAction,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    blnUseAuthHeader: true,
  });
}

export const leavePlanService = {
  async listPlans(objFilters: LeavePlanFilters = {}): Promise<LeavePlan[]> {
    const objResult = await requestApi<LeavePlan[]>({
      strPath: "/leave/plans", strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction,
      objQueryParams: { search: objFilters.strSearch || undefined, is_active: objFilters.blnIsActive, effective_on: objFilters.dtEffectiveOn || undefined },
    });
    return objResult.Data ?? [];
  },
  async getPlan(intPlanID: number): Promise<LeavePlan> {
    const objResult = await requestApi<LeavePlan>({ strPath: `/leave/plans/${intPlanID}`, strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction });
    return objResult.Data;
  },
  async createPlan(objPayload: LeavePlanSaveRequest): Promise<LeavePlan> {
    const objResult = await requestApi<LeavePlan>({ strPath: "/leave/plans", strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async updatePlan(intPlanID: number, objPayload: LeavePlanSaveRequest): Promise<LeavePlan> {
    const objResult = await requestApi<LeavePlan>({ strPath: `/leave/plans/${intPlanID}`, strMethod: ApiRequestMethod.Put, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async setPlanStatus(intPlanID: number, blnIsActive: boolean): Promise<LeavePlan> {
    const objResult = await requestApi<LeavePlan>({ strPath: `/leave/plans/${intPlanID}/status`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objQueryParams: { is_active: blnIsActive }, objBody: {} });
    return objResult.Data;
  },
  async deletePlan(intPlanID: number): Promise<void> {
    await requestApi<LeavePlan>({ strPath: `/leave/plans/${intPlanID}`, strMethod: ApiRequestMethod.Delete, strMenuAction: strLeaveManageAction });
  },
  async getActiveLeaveTypes(): Promise<LeaveTypeOption[]> {
    const objResult = await requestApi<LeaveTypeOption[]>({ strPath: "/leave/plans/leave-types", strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction });
    return objResult.Data ?? [];
  },
  async getCompatiblePolicies(intLeaveTypeID: number, dtEffectiveOn?: string): Promise<LeavePolicyOption[]> {
    const objResult = await requestApi<LeavePolicyOption[]>({ strPath: "/leave/plans/policies", strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction, objQueryParams: { leave_type_id: intLeaveTypeID, effective_on: dtEffectiveOn || undefined } });
    return objResult.Data ?? [];
  },
  async getLanguages(): Promise<LeavePlanLanguages> {
    const objResult = await requestApi<LeavePlanLanguages>({ strPath: "/leave/plans/languages", strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction });
    return objResult.Data;
  },
  async getEmployeeOverview(intEmployeeID: number, intLeaveYear: number): Promise<EmployeeLeavePlanOverview> {
    const objResult = await requestApi<EmployeeLeavePlanOverview>({ strPath: `/leave/plan-assignments/${intEmployeeID}`, strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction, objQueryParams: { leave_year: intLeaveYear } });
    return objResult.Data;
  },
  async assignPlan(intEmployeeID: number, objPayload: EmployeePlanAssignRequest, blnReplace: boolean): Promise<EmployeeLeavePlanOverview> {
    const objResult = await requestApi<EmployeeLeavePlanOverview>({ strPath: `/leave/plan-assignments/${intEmployeeID}/${blnReplace ? "replace" : "assign"}`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async updateAssignment(intEmployeeID: number, objPayload: EmployeePlanAssignmentUpdateRequest): Promise<EmployeeLeavePlanOverview> {
    const objResult = await requestApi<EmployeeLeavePlanOverview>({ strPath: `/leave/plan-assignments/${intEmployeeID}/update`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async initializeBalances(intEmployeeID: number, intLeaveYear: number): Promise<EmployeeLeaveBalance[]> {
    const objResult = await requestApi<EmployeeLeaveBalance[]>({ strPath: `/leave/plan-assignments/${intEmployeeID}/balances/initialize`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: { intLeaveYear } });
    return objResult.Data ?? [];
  },
  async setOpeningBalance(intEmployeeID: number, intBalanceID: number, objPayload: OpeningBalanceRequest): Promise<BalanceMutationResult> {
    const objResult = await requestApi<BalanceMutationResult>({ strPath: `/leave/plan-assignments/${intEmployeeID}/balances/${intBalanceID}/opening`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async adjustBalance(intEmployeeID: number, intBalanceID: number, strDirection: "credit" | "debit", objPayload: BalanceMovementRequest): Promise<BalanceMutationResult> {
    const objResult = await requestApi<BalanceMutationResult>({ strPath: `/leave/plan-assignments/${intEmployeeID}/balances/${intBalanceID}/${strDirection}`, strMethod: ApiRequestMethod.Post, strMenuAction: strLeaveManageAction, objBody: objPayload });
    return objResult.Data;
  },
  async getLedger(intEmployeeID: number, intLeaveYear: number, intBalanceID?: number): Promise<EmployeeLeaveLedger[]> {
    const objResult = await requestApi<EmployeeLeaveLedger[]>({ strPath: `/leave/plan-assignments/${intEmployeeID}/ledger`, strMethod: ApiRequestMethod.Get, strMenuAction: strLeaveViewAction, objQueryParams: { leave_year: intLeaveYear, balance_id: intBalanceID } });
    return objResult.Data ?? [];
  },
};
