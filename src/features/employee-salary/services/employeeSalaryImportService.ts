"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { createApiRequestError, requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import { axiosInstance, type ApiRequestConfig } from "@/lib/axiosInstance";

export type SalaryImportAction = "NO_CHANGE" | "REVISION" | "NEW" | "CORRECTION" | "ERROR";

export type SalaryImportStatus = {
  blnEnabled: boolean;
  dtDefaultSalaryMonth: string;
  objLastImport: {
    intImportBatchID: number;
    dtSalaryMonth: string;
    strFileName: string | null;
    dtImportedOn: string | null;
    intSavedCount: number;
  } | null;
};

export type SalaryImportChange = {
  strComponentCode: string;
  strComponentName: string;
  decOldMonthly: number | null;
  decNewMonthly: number | null;
  blnIsFixed: boolean;
};

export type SalaryImportPreviewRow = {
  intExcelRowNumber: number | null;
  strEmployeeCode: string;
  intEmployeeID: number | null;
  strEmployeeName: string | null;
  strAction: SalaryImportAction;
  blnNeedsConfirmation: boolean;
  lstErrors: string[];
  lstWarnings: string[];
  lstNotes: string[];
  intCurrentSalaryRecordID: number | null;
  strCurrentStructureCode: string | null;
  strCurrentStructureName: string | null;
  dtCurrentEffectiveFrom: string | null;
  decCurrentGross: number | null;
  strStructureCode: string | null;
  strStructureName: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  strRevisionReason: string | null;
  decNewGross: number | null;
  decGrossChange: number | null;
  lstChanges: SalaryImportChange[];
  dicAmounts: Record<string, number | null>;
};

export type SalaryImportPreview = {
  dtSalaryMonth: string;
  strFileName: string | null;
  strFileChecksum: string;
  objSummary: {
    intTotalRows: number;
    intNoChange: number;
    intRevision: number;
    intNew: number;
    intCorrection: number;
    intError: number;
    intToSave: number;
    intNeedsConfirmation: number;
    intActiveNotInFile: number;
    decCurrentGrossTotal: number;
    decNewGrossTotal: number;
    lstPaidPayrollMonths: string[];
  };
  lstComponentCodes: string[];
  lstRows: SalaryImportPreviewRow[];
  lstActiveNotInFile: Array<{ strEmployeeCode: string; strEmployeeName: string }>;
};

export type SalaryImportCommitResult = {
  intImportBatchID: number;
  intSaved: number;
  intRevision: number;
  intNew: number;
  intCorrection: number;
  intNoChange: number;
  lstPaidPayrollMonths: string[];
};

export const SALARY_IMPORT_SAVE_ACTIONS: SalaryImportAction[] = ["REVISION", "NEW", "CORRECTION"];
export const SALARY_IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

const strImportPath = "/employee-salary/import";
const SALARY_IMPORT_VIEW = "EMPLOYEE_SALARY_LIST";
const SALARY_IMPORT = "EMPLOYEE_SALARY_IMPORT";

function saveBlob(objBlob: Blob, strFileName: string) {
  const strObjectUrl = URL.createObjectURL(objBlob);
  const objAnchor = document.createElement("a");
  objAnchor.href = strObjectUrl;
  objAnchor.download = strFileName;
  document.body.appendChild(objAnchor);
  objAnchor.click();
  document.body.removeChild(objAnchor);
  URL.revokeObjectURL(strObjectUrl);
}

export const employeeSalaryImportService = {
  async getStatus(): Promise<SalaryImportStatus> {
    const objResult = await requestEncryptedApi<SalaryImportStatus>({
      strPath: `${ApiRoutePrefix.ApiV1}${strImportPath}/status`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: SALARY_IMPORT_VIEW,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },

  async downloadTemplate(strSalaryMonth: string): Promise<void> {
    try {
      const objResponse = await axiosInstance.request<Blob>({
        method: ApiRequestMethod.Get,
        url: `${ApiRoutePrefix.ApiV1}${strImportPath}/template?strSalaryMonth=${encodeURIComponent(strSalaryMonth)}`,
        responseType: "blob",
        csrfMenuAction: SALARY_IMPORT,
      } as ApiRequestConfig);
      saveBlob(objResponse.data, `employee_salary_import_${strSalaryMonth.replace("-", "_")}.xlsx`);
    } catch (objError) {
      throw await createApiRequestError<void>(objError);
    }
  },

  async previewImport(strSalaryMonth: string, objFile: File): Promise<SalaryImportPreview> {
    const objFormData = new FormData();
    objFormData.append("strSalaryMonth", strSalaryMonth);
    objFormData.append("objFile", objFile);
    try {
      const objResponse = await axiosInstance.request<{ Data: SalaryImportPreview }>({
        method: ApiRequestMethod.Post,
        url: `${ApiRoutePrefix.ApiV1}${strImportPath}/preview`,
        data: objFormData,
        csrfMenuAction: SALARY_IMPORT,
      } as ApiRequestConfig);
      return objResponse.data.Data;
    } catch (objError) {
      throw await createApiRequestError<SalaryImportPreview>(objError);
    }
  },

  async commitImport(objPreview: SalaryImportPreview, setConfirmedRows: Set<number>, setSelectedRows: Set<number>): Promise<SalaryImportCommitResult> {
    const lstRows = objPreview.lstRows
      .filter((objRow) => SALARY_IMPORT_SAVE_ACTIONS.includes(objRow.strAction) && setSelectedRows.has(rowKey(objRow)))
      .map((objRow) => ({
        intExcelRowNumber: objRow.intExcelRowNumber,
        strEmployeeCode: objRow.strEmployeeCode,
        strStructureCode: objRow.strStructureCode,
        dtEffectiveFrom: objRow.dtEffectiveFrom,
        dtEffectiveTo: objRow.dtEffectiveTo,
        strRevisionReason: objRow.strRevisionReason,
        dicAmounts: objRow.dicAmounts,
        intCurrentSalaryRecordID: objRow.intCurrentSalaryRecordID,
        blnConfirmed: setConfirmedRows.has(rowKey(objRow)),
      }));
    const objResult = await requestEncryptedApi<SalaryImportCommitResult>({
      strPath: `${ApiRoutePrefix.ApiV1}${strImportPath}/commit`,
      strMethod: ApiRequestMethod.Post,
      objBody: {
        dtSalaryMonth: objPreview.dtSalaryMonth,
        strFileName: objPreview.strFileName,
        strFileChecksum: objPreview.strFileChecksum,
        intFileRowCount: objPreview.objSummary.intTotalRows,
        intNoChangeCount: objPreview.objSummary.intNoChange,
        lstRows,
      },
      strMenuAction: SALARY_IMPORT,
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },

  downloadErrorRows(objPreview: SalaryImportPreview) {
    const lstHeader = ["Row", "Employee Code", "Employee Name", "Problem"];
    const lstLines = objPreview.lstRows
      .filter((objRow) => objRow.strAction === "ERROR")
      .map((objRow) => [String(objRow.intExcelRowNumber ?? ""), objRow.strEmployeeCode, objRow.strEmployeeName ?? "", objRow.lstErrors.join(" ")]);
    const strCsv = [lstHeader, ...lstLines]
      .map((lstCells) => lstCells.map((strCell) => `"${String(strCell).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    saveBlob(new Blob([`﻿${strCsv}`], { type: "text/csv;charset=utf-8" }), `salary_import_errors_${objPreview.dtSalaryMonth.slice(0, 7)}.csv`);
  },
};

/** Stable key for a preview row: its Excel row number (unique within one file). */
export function rowKey(objRow: Pick<SalaryImportPreviewRow, "intExcelRowNumber">): number {
  return objRow.intExcelRowNumber ?? -1;
}
