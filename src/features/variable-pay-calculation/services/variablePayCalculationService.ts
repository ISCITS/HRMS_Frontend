"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { employeeService } from "@/features/employee/services/employeeService";
import { masterApiService } from "@/services/master/MasterApiService";
import type {
  AllocationBasedComponentOption,
  EmployeeNameOption,
  MonthlyEntityValueRecord,
  MonthlyEntityValueSaveRow,
  MonthlyEntityValueStatus,
  VariablePayCalculationBatch,
  VariablePayEmployeeCalculation,
} from "@/features/variable-pay-calculation/types";

const MONTHLY_ENTITY_VALUE_VIEW = "variable_pay_monthly_entity_value_view";
const MONTHLY_ENTITY_VALUE_EDIT = "variable_pay_monthly_entity_value_edit";
const MONTHLY_ENTITY_VALUE_APPROVE = "variable_pay_monthly_entity_value_approve";
const CALCULATION_VIEW = "variable_pay_calculation_view";
const CALCULATION_EDIT = "variable_pay_calculation_edit";
const CALCULATION_APPROVE = "variable_pay_calculation_approve";
const CALCULATION_OVERRIDE = "variable_pay_calculation_override";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  objQueryParams?: Record<string, string | number | boolean | null | undefined>;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    objQueryParams: objOptions.objQueryParams,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

function toNullableNumber(objValue: unknown): number | null {
  if (objValue === null || objValue === undefined || objValue === "") {
    return null;
  }
  const decParsed = Number(objValue);
  return Number.isFinite(decParsed) ? decParsed : null;
}

export const variablePayCalculationService = {
  // ------------------------------------------------------------------
  // Filter-bar option loaders
  // ------------------------------------------------------------------

  // Reads the RAW Salary Component list endpoint rather than salaryComponentService's
  // mapped list record, because that mapper drops the variable-pay calculation fields.
  async listAllocationBasedComponents(): Promise<AllocationBasedComponentOption[]> {
    const objResult = await masterApiService.getSalaryComponents();
    return (objResult.Data ?? [])
      .filter(
        (dicRecord) =>
          Boolean(dicRecord.blnVariablePayCalculationEnabled) &&
          String(dicRecord.strVariablePayCalculationMethodCode ?? "").toUpperCase() === "ALLOCATION_BASED",
      )
      .map((dicRecord) => ({
        intID: dicRecord.intID,
        strComponentCode: dicRecord.strComponentCode,
        strComponentName: dicRecord.strComponentName,
        intAllocationEntityTypeID: dicRecord.intAllocationEntityTypeID ?? null,
        blnAttendanceEligibilityApplicable: Boolean(dicRecord.blnAttendanceEligibilityApplicable),
        blnAttendanceProrationApplicable: Boolean(dicRecord.blnAttendanceProrationApplicable),
        blnMonthlyAdjustmentApplicable: Boolean(dicRecord.blnMonthlyAdjustmentApplicable),
        decMonthlyAdjustmentMinPercent: toNullableNumber(dicRecord.decMonthlyAdjustmentMinPercent),
        decMonthlyAdjustmentMaxPercent: toNullableNumber(dicRecord.decMonthlyAdjustmentMaxPercent),
      }));
  },

  // There is no dedicated employee-name lookup endpoint for this feature, so the generic
  // master employee list is reused and reshaped (note it exposes intID / strFullName).
  async listEmployeeNameOptions(): Promise<EmployeeNameOption[]> {
    const lstEmployees = await employeeService.getEmployees();
    return lstEmployees.map((dicEmployee) => ({
      intEmployeeID: dicEmployee.intID,
      strEmployeeCode: dicEmployee.strEmployeeCode,
      strEmployeeName: dicEmployee.strFullName,
    }));
  },

  // ------------------------------------------------------------------
  // Monthly Allocation Entity Values
  // ------------------------------------------------------------------
  async listMonthlyEntityValues(objFilters: {
    intCompanyID: number;
    dtPayrollMonth: string;
    intSalaryComponentID: number;
  }): Promise<MonthlyEntityValueRecord[]> {
    const objResult = await requestApi<MonthlyEntityValueRecord[]>({
      strPath: "/variable-pay-calculation/monthly-entity-values",
      strMethod: ApiRequestMethod.Get,
      objQueryParams: {
        intCompanyID: objFilters.intCompanyID,
        dtPayrollMonth: objFilters.dtPayrollMonth,
        intSalaryComponentID: objFilters.intSalaryComponentID,
      },
      strMenuAction: MONTHLY_ENTITY_VALUE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async saveMonthlyEntityValues(objPayload: {
    intCompanyID: number;
    dtPayrollMonth: string;
    intSalaryComponentID: number;
    lstValues: MonthlyEntityValueSaveRow[];
  }): Promise<MonthlyEntityValueRecord[]> {
    const objResult = await requestApi<MonthlyEntityValueRecord[]>({
      strPath: "/variable-pay-calculation/monthly-entity-values",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: MONTHLY_ENTITY_VALUE_EDIT,
    });
    return objResult.Data ?? [];
  },

  async setMonthlyEntityValueStatus(objPayload: {
    intCompanyID: number;
    dtPayrollMonth: string;
    intSalaryComponentID: number;
    strStatus: MonthlyEntityValueStatus;
  }): Promise<MonthlyEntityValueRecord[]> {
    const objResult = await requestApi<MonthlyEntityValueRecord[]>({
      strPath: "/variable-pay-calculation/monthly-entity-values/status",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: MONTHLY_ENTITY_VALUE_APPROVE,
    });
    return objResult.Data ?? [];
  },

  // ------------------------------------------------------------------
  // Calculation batches
  // ------------------------------------------------------------------
  async createBatch(objPayload: {
    intCompanyID: number;
    dtPayrollMonth: string;
    intSalaryComponentID: number;
    intTargetPayrollRunID?: number | null;
  }): Promise<VariablePayCalculationBatch> {
    const objResult = await requestApi<VariablePayCalculationBatch>({
      strPath: "/variable-pay-calculation/batches",
      strMethod: ApiRequestMethod.Post,
      objBody: {
        intCompanyID: objPayload.intCompanyID,
        dtPayrollMonth: objPayload.dtPayrollMonth,
        intSalaryComponentID: objPayload.intSalaryComponentID,
        intTargetPayrollRunID: objPayload.intTargetPayrollRunID ?? null,
      },
      strMenuAction: CALCULATION_EDIT,
    });
    return objResult.Data;
  },

  // If the component has attendance eligibility/proration enabled and the batch has no
  // intSourcePayrollRunID, the backend answers 409 with an explanatory message.
  // TODO: there is no PATCH endpoint to set intSourcePayrollRunID on an existing batch;
  // confirm with the backend owner whether one should be added before wiring a picker here.
  async calculateBatch(intCalculationBatchID: number): Promise<VariablePayCalculationBatch> {
    const objResult = await requestApi<VariablePayCalculationBatch>({
      strPath: `/variable-pay-calculation/batches/${intCalculationBatchID}/calculate`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: CALCULATION_EDIT,
    });
    return objResult.Data;
  },

  async listEmployeeCalculations(intCalculationBatchID: number): Promise<VariablePayEmployeeCalculation[]> {
    const objResult = await requestApi<VariablePayEmployeeCalculation[]>({
      strPath: `/variable-pay-calculation/batches/${intCalculationBatchID}/employees`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: CALCULATION_VIEW,
    });
    return objResult.Data ?? [];
  },

  async overrideEmployeeCalculation(
    intEmployeeVariablePayCalculationID: number,
    strOverrideReason: string,
  ): Promise<VariablePayEmployeeCalculation> {
    const objResult = await requestApi<VariablePayEmployeeCalculation>({
      strPath: `/variable-pay-calculation/employee-calculations/${intEmployeeVariablePayCalculationID}/override`,
      strMethod: ApiRequestMethod.Post,
      objBody: { strOverrideReason },
      strMenuAction: CALCULATION_OVERRIDE,
    });
    return objResult.Data;
  },

  // decApprovedAmount omitted/null accepts the calculated amount as-is.
  async approveEmployeeCalculation(
    intEmployeeVariablePayCalculationID: number,
    decApprovedAmount?: number | null,
  ): Promise<VariablePayEmployeeCalculation> {
    const objResult = await requestApi<VariablePayEmployeeCalculation>({
      strPath: `/variable-pay-calculation/employee-calculations/${intEmployeeVariablePayCalculationID}/approve`,
      strMethod: ApiRequestMethod.Post,
      objBody: { decApprovedAmount: decApprovedAmount ?? null },
      strMenuAction: CALCULATION_APPROVE,
    });
    return objResult.Data;
  },

  // Idempotent on the backend - a repeated post creates no duplicate transactions.
  async postBatch(intCalculationBatchID: number): Promise<VariablePayCalculationBatch> {
    const objResult = await requestApi<VariablePayCalculationBatch>({
      strPath: `/variable-pay-calculation/batches/${intCalculationBatchID}/post`,
      strMethod: ApiRequestMethod.Post,
      strMenuAction: CALCULATION_APPROVE,
    });
    return objResult.Data;
  },
};
