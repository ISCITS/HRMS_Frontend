import axios from "axios";

import { axiosInstance } from "@/lib/axiosInstance";
import { decryptPayload } from "@/lib/security/decryptPayload";
import type {
  EmployeePayrollInputDetailRecord,
  EmployeePayrollInputFormLine,
  EmployeePayrollInputFormOptions,
  EmployeePayrollInputFormValues,
  EmployeePayrollInputListRecord,
} from "@/features/payroll/types";

type ApiEnvelope<TData> = {
  ResultCode: number;
  Msg: string;
  Data: TData;
};

type EmployeePayrollInputApiRecord = EmployeePayrollInputDetailRecord;

function getTodayDateSeed() {
  return Date.now();
}

function parseOptionalNumber(strValue: string): number | null {
  const strTrimmedValue = strValue.trim();
  if (!strTrimmedValue) {
    return null;
  }
  const decValue = Number(strTrimmedValue);
  return Number.isFinite(decValue) ? decValue : null;
}

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: "GET" | "POST" | "PUT";
  objBody?: unknown;
  strMenuAction: string;
}): Promise<ApiEnvelope<TData>> {
  try {
    const objResponse = await axiosInstance.request({
      method: objOptions.strMethod,
      url: `api/v1${objOptions.strPath}`,
      data: objOptions.objBody,
      csrfMenuAction: objOptions.strMenuAction,
    });

    const objRawPayload = objResponse.data as ApiEnvelope<TData> | { payload: string };
    const objPayload =
      "payload" in objRawPayload
        ? await decryptPayload<ApiEnvelope<TData>>(objRawPayload.payload)
        : objRawPayload;

    if (objPayload.ResultCode !== 1) {
      throw new Error(objPayload.Msg ?? "Request failed.");
    }

    return objPayload;
  } catch (objError) {
    if (axios.isAxiosError(objError)) {
      const objResponseData = objError.response?.data as
        | ApiEnvelope<TData>
        | { payload?: string; Msg?: string }
        | undefined;
      if (objResponseData?.payload) {
        const objDecryptedPayload =
          await decryptPayload<ApiEnvelope<TData>>(objResponseData.payload);
        throw new Error(objDecryptedPayload.Msg ?? "Request failed.");
      }
      throw new Error(objResponseData?.Msg ?? objError.message ?? "Request failed.");
    }

    throw objError;
  }
}

function mapLineForForm(dicLine: EmployeePayrollInputDetailRecord["lstLines"][number], intIndex: number): EmployeePayrollInputFormLine {
  return {
    intTempID: dicLine.intID || getTodayDateSeed() + intIndex,
    intSalaryComponentID: dicLine.intSalaryComponentID,
    strLineType: dicLine.strLineType,
    strAmount: String(dicLine.decAmount ?? ""),
    strRemarks: dicLine.strRemarks ?? "",
  };
}

function toPayload(dicValues: EmployeePayrollInputFormValues) {
  return {
    intPayrollRunID: Number(dicValues.intPayrollRunID),
    intEmployeeID: Number(dicValues.intEmployeeID),
    decLwpDays: parseOptionalNumber(dicValues.strLwpDays),
    decLopDays: parseOptionalNumber(dicValues.strLopDays),
    strRemarks: dicValues.strRemarks.trim() || null,
    strStatus: dicValues.strStatus,
    blnIsLocked: dicValues.blnIsLocked,
    lstLines: dicValues.lstLines.map((dicLine) => ({
      intSalaryComponentID: Number(dicLine.intSalaryComponentID),
      strLineType: dicLine.strLineType,
      decAmount: Number(dicLine.strAmount),
      strRemarks: dicLine.strRemarks.trim() || null,
    })),
  };
}

export function createEmptyEmployeePayrollInputLine(): EmployeePayrollInputFormLine {
  return {
    intTempID: getTodayDateSeed(),
    intSalaryComponentID: "",
    strLineType: "addition",
    strAmount: "",
    strRemarks: "",
  };
}

export function createInitialEmployeePayrollInputForm(): EmployeePayrollInputFormValues {
  return {
    intPayrollRunID: "",
    intEmployeeID: "",
    strLwpDays: "",
    strLopDays: "",
    strRemarks: "",
    strStatus: "Draft",
    blnIsLocked: false,
    lstLines: [createEmptyEmployeePayrollInputLine()],
  };
}

export function toEmployeePayrollInputFormValues(
  dicRecord: EmployeePayrollInputDetailRecord
): EmployeePayrollInputFormValues {
  return {
    intPayrollRunID: dicRecord.intPayrollRunID,
    intEmployeeID: dicRecord.intEmployeeID,
    strLwpDays: dicRecord.decLwpDays?.toString() ?? "",
    strLopDays: dicRecord.decLopDays?.toString() ?? "",
    strRemarks: dicRecord.strRemarks ?? "",
    strStatus: dicRecord.strStatus,
    blnIsLocked: dicRecord.blnIsLocked,
    lstLines: dicRecord.lstLines.length
      ? dicRecord.lstLines.map(mapLineForForm)
      : [createEmptyEmployeePayrollInputLine()],
  };
}

export const employeePayrollInputService = {
  async getEmployeePayrollInputs(objFilters?: {
    strSearchEmployee?: string;
    strSearchRun?: string;
    strStatus?: string;
  }): Promise<EmployeePayrollInputListRecord[]> {
    const objParams = new URLSearchParams();
    if (objFilters?.strSearchEmployee?.trim()) {
      objParams.set("strSearchEmployee", objFilters.strSearchEmployee.trim());
    }
    if (objFilters?.strSearchRun?.trim()) {
      objParams.set("strSearchRun", objFilters.strSearchRun.trim());
    }
    if (objFilters?.strStatus?.trim() && objFilters.strStatus !== "All") {
      objParams.set("strStatus", objFilters.strStatus.trim());
    }
    const strQuery = objParams.toString();
    const objResult = await requestApi<EmployeePayrollInputListRecord[]>({
      strPath: `/payroll/employee-payroll-inputs${strQuery ? `?${strQuery}` : ""}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_LIST",
    });
    return objResult.Data;
  },

  async getFormOptions(): Promise<EmployeePayrollInputFormOptions> {
    const objResult = await requestApi<EmployeePayrollInputFormOptions>({
      strPath: "/payroll/employee-payroll-inputs/form-options",
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_FORM_OPTIONS",
    });
    return objResult.Data;
  },

  async getEmployeePayrollInputById(
    intInputID: number
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: `/payroll/employee-payroll-inputs/${intInputID}`,
      strMethod: "GET",
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_VIEW",
    });
    return objResult.Data;
  },

  async createEmployeePayrollInput(
    dicValues: EmployeePayrollInputFormValues
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: "/payroll/employee-payroll-inputs",
      strMethod: "POST",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_CREATE",
    });
    return objResult.Data;
  },

  async updateEmployeePayrollInput(
    intInputID: number,
    dicValues: EmployeePayrollInputFormValues
  ): Promise<EmployeePayrollInputDetailRecord> {
    const objResult = await requestApi<EmployeePayrollInputApiRecord>({
      strPath: `/payroll/employee-payroll-inputs/${intInputID}`,
      strMethod: "PUT",
      objBody: toPayload(dicValues),
      strMenuAction: "PAYROLL_EMPLOYEE_PAYROLL_INPUT_UPDATE",
    });
    return objResult.Data;
  },
};
