"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

const strMonthlyTaxView = "EMPLOYEE_MONTHLY_TAX_VIEW";
const strMonthlyTaxEdit = "EMPLOYEE_MONTHLY_TAX_EDIT";
const strMonthlyTaxLock = "EMPLOYEE_MONTHLY_TAX_LOCK";
const strMonthlyTaxImport = "EMPLOYEE_MONTHLY_TAX_IMPORT";

export type MonthlyTaxMonthCell = {
  decTaxableIncome: number;
  decTds: number;
  blnHasImportedData: boolean;
  blnHasSystemData: boolean;
  blnIsLocked: boolean;
  intTransactionCount: number;
};

export type MonthlyTaxMatrixRow = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  dicMonths: Record<string, MonthlyTaxMonthCell>;
  decFyTaxable: number;
  decFyTds: number;
};

export type MonthlyTaxMatrixResult = {
  strFinancialYearCode: string;
  lstMonths: string[];
  lstRows: MonthlyTaxMatrixRow[];
};

export type MonthlyTaxTransaction = {
  intID: number;
  strSourceType: string;
  strSourceReferenceNo: string | null;
  decGrossIncomeAmount: number;
  decTaxableIncomeAmount: number;
  decTdsAmount: number;
  blnIsPreviousEmployer: boolean;
  blnIsSystemGenerated: boolean;
  blnIsReversed: boolean;
  strRemarks: string | null;
  dtAddedOn: string;
};

export type MonthlyTaxImportPreviewRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  strFinancialYearCode: string;
  dtPeriodMonth: string | null;
  decTaxableIncome: string | null;
  decTds: string | null;
  decGrossIncome: string | null;
  strSourceType: string;
  strExternalReference: string | null;
  strRemarks: string | null;
  blnValid: boolean;
  strErrorMessage: string | null;
};

export type MonthlyTaxImportPreviewResult = {
  lstRows: MonthlyTaxImportPreviewRow[];
  intTotalRows: number;
  intValidRows: number;
  intErrorRows: number;
};

export type MonthlyTaxImportCommitResult = {
  intCreated: number;
  intSkipped: number;
  lstFailures: Array<{ strEmployeeCode?: string; strError: string }>;
};

export type Form16ExtractionResult = {
  decGrossSalary: number | null;
  strGrossSalaryMatchedText: string | null;
  decTotalTaxDeducted: number | null;
  strTotalTaxDeductedMatchedText: string | null;
};

export type PreviousEmployerDeclaration = {
  id: number;
  employer_name: string;
  employer_tan: string | null;
  employment_from: string | null;
  employment_to: string | null;
  gross_salary: number;
  taxable_salary: number;
  professional_tax: number;
  provident_fund: number;
  tds_deducted: number;
  form16_available: boolean;
  verification_status: string;
  remarks: string | null;
  monthly_tax_history_captured: boolean;
};

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

export const employeeMonthlyTaxService = {
  async getMatrix(strFinancialYearCode: string, intEmployeeID?: number): Promise<MonthlyTaxMatrixResult> {
    const objResult = await requestApi<MonthlyTaxMatrixResult>({
      strPath: "/payroll/monthly-tax/matrix",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strMonthlyTaxView,
      objQueryParams: { financial_year_code: strFinancialYearCode, employee_id: intEmployeeID },
    });
    return objResult.Data;
  },

  async getMonthDetail(intEmployeeID: number, strFinancialYearCode: string, strPeriodMonth: string): Promise<MonthlyTaxTransaction[]> {
    const objResult = await requestApi<MonthlyTaxTransaction[]>({
      strPath: `/payroll/monthly-tax/${intEmployeeID}/months/${strPeriodMonth}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strMonthlyTaxView,
      objQueryParams: { financial_year_code: strFinancialYearCode },
    });
    return objResult.Data;
  },

  async saveTransaction(objPayload: {
    intEmployeeID: number;
    strFinancialYearCode: string;
    dtPeriodMonth: string;
    strSourceType: string;
    decGrossIncomeAmount: number;
    decTaxableIncomeAmount: number;
    decTdsAmount: number;
    strExternalReference?: string | null;
    strRemarks?: string | null;
    intExistingTransactionID?: number | null;
  }): Promise<void> {
    await requestApi<null>({
      strPath: "/payroll/monthly-tax/transaction",
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strMonthlyTaxEdit,
      objBody: {
        employee_id: objPayload.intEmployeeID,
        financial_year_code: objPayload.strFinancialYearCode,
        period_month: objPayload.dtPeriodMonth,
        source_type: objPayload.strSourceType,
        gross_income_amount: objPayload.decGrossIncomeAmount,
        taxable_income_amount: objPayload.decTaxableIncomeAmount,
        tds_amount: objPayload.decTdsAmount,
        external_reference: objPayload.strExternalReference,
        remarks: objPayload.strRemarks,
        existing_transaction_id: objPayload.intExistingTransactionID,
      },
    });
  },

  async setLock(intEmployeeID: number, strFinancialYearCode: string, dtPeriodMonth: string, blnLocked: boolean): Promise<void> {
    await requestApi<null>({
      strPath: "/payroll/monthly-tax/lock",
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strMonthlyTaxLock,
      objBody: {
        employee_id: intEmployeeID,
        financial_year_code: strFinancialYearCode,
        period_month: dtPeriodMonth,
        locked: blnLocked,
      },
    });
  },

  async listPreviousEmployerDeclarations(intEmployeeID: number, strFinancialYearCode: string): Promise<PreviousEmployerDeclaration[]> {
    const objResult = await requestApi<PreviousEmployerDeclaration[]>({
      strPath: "/payroll/monthly-tax/previous-employer",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: strMonthlyTaxView,
      objQueryParams: { employee_id: intEmployeeID, financial_year_code: strFinancialYearCode },
    });
    return objResult.Data;
  },

  async savePreviousEmployer(objPayload: {
    intEmployeeID: number;
    strFinancialYearCode: string;
    strEmployerName: string;
    strEmployerTan?: string | null;
    dtEmploymentFrom?: string | null;
    dtEmploymentTo?: string | null;
    decGrossSalary: number;
    decTaxableSalary: number;
    decTdsDeducted: number;
    blnForm16Available?: boolean;
    strRemarks?: string | null;
    lstMonthlyValues?: Array<{ dtPeriodMonth: string; decTaxableIncomeAmount: number; decTdsAmount: number }> | null;
    dtOpeningAsOfMonth?: string | null;
  }): Promise<{ intPreviousEmployerIncomeID: number }> {
    const objResult = await requestApi<{ intPreviousEmployerIncomeID: number }>({
      strPath: "/payroll/monthly-tax/previous-employer",
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strMonthlyTaxEdit,
      objBody: {
        employee_id: objPayload.intEmployeeID,
        financial_year_code: objPayload.strFinancialYearCode,
        employer_name: objPayload.strEmployerName,
        employer_tan: objPayload.strEmployerTan,
        employment_from: objPayload.dtEmploymentFrom,
        employment_to: objPayload.dtEmploymentTo,
        gross_salary: objPayload.decGrossSalary,
        taxable_salary: objPayload.decTaxableSalary,
        tds_deducted: objPayload.decTdsDeducted,
        form16_available: objPayload.blnForm16Available ?? false,
        remarks: objPayload.strRemarks,
        monthly_values: objPayload.lstMonthlyValues,
        opening_as_of_month: objPayload.dtOpeningAsOfMonth,
      },
    });
    return objResult.Data;
  },

  // Bypasses requestApi (multipart upload) - mirrors variablePayService.previewImport.
  async importForm16(objFile: File): Promise<Form16ExtractionResult> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: Form16ExtractionResult }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/payroll/monthly-tax/previous-employer/form16`,
        data: objFormData,
        csrfMenuAction: strMonthlyTaxEdit,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<Form16ExtractionResult>(objError);
    }
  },

  async downloadImportTemplate(): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}/payroll/monthly-tax/import/template`,
        responseType: "blob",
        csrfMenuAction: strMonthlyTaxImport,
      } as ApiRequestConfig);
      const strObjectUrl = URL.createObjectURL(objResponse.data);
      const objAnchor = document.createElement("a");
      objAnchor.href = strObjectUrl;
      objAnchor.download = "monthly_tax_history_import_template.xlsx";
      document.body.appendChild(objAnchor);
      objAnchor.click();
      document.body.removeChild(objAnchor);
      URL.revokeObjectURL(strObjectUrl);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async previewImport(objFile: File): Promise<MonthlyTaxImportPreviewResult> {
    const objFormData = new FormData();
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: MonthlyTaxImportPreviewResult }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}/payroll/monthly-tax/import/preview`,
        data: objFormData,
        csrfMenuAction: strMonthlyTaxImport,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<MonthlyTaxImportPreviewResult>(objError);
    }
  },

  async commitImport(lstRows: MonthlyTaxImportPreviewRow[]): Promise<MonthlyTaxImportCommitResult> {
    // Caller passes exactly the rows the user checked in the preview grid -
    // no implicit re-filtering here.
    const objResult = await requestApi<MonthlyTaxImportCommitResult>({
      strPath: "/payroll/monthly-tax/import/commit",
      strMethod: ApiRequestMethod.Post,
      strMenuAction: strMonthlyTaxImport,
      objBody: {
        rows: lstRows
          .map((objRow) => ({
            intEmployeeID: objRow.intEmployeeID,
            strEmployeeCode: objRow.strEmployeeCode,
            strFinancialYearCode: objRow.strFinancialYearCode,
            dtPeriodMonth: objRow.dtPeriodMonth,
            decTaxableIncome: objRow.decTaxableIncome,
            decTds: objRow.decTds,
            decGrossIncome: objRow.decGrossIncome,
            strSourceType: objRow.strSourceType,
            strExternalReference: objRow.strExternalReference,
            strRemarks: objRow.strRemarks,
          })),
      },
    });
    return objResult.Data;
  },
};
