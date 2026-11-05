import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type { EmployeeListRecord } from "@/features/employee/types";
import type { EmployeeSalaryDetailRecord, EmployeeSalaryListRecord } from "@/features/employee-salary/types";

export type CtcDocument = {
  sheetName: string; widths: number[]; version: string; warnings: string[];
  rows: Array<Array<{ text: string; span: number; bold: boolean; background: string; color: string | null; borders: boolean[]; align: "left" | "center" | "right" }>>;
};
type CtcDownload = { strFileName: string; strContentType: string; strBase64Content: string };
/** ours: the application's statement; format1: the client's layout (previous salary next to the current one). */
export type CtcLayout = "ours" | "format1";
export type CtcPeriod = "monthly" | "annual";

function query(month: string, zeroStatutory: boolean, layout: CtcLayout, period: CtcPeriod) {
  return `month=${encodeURIComponent(month)}&zero_statutory=${zeroStatutory}&layout=${layout}&period=${period}`;
}

async function get<T>(path: string): Promise<T> {
  const result = await requestEncryptedApi<T>({
    strPath: `${ApiRoutePrefix.ApiV1}/reports/ctc-format/${path}`,
    strMethod: ApiRequestMethod.Get, strMenuAction: "EMPLOYEE_SALARY", blnUseAuthHeader: true,
  });
  return result.Data;
}

export const ctcReportService = {
  /** month: "YYYY-MM" - the statement shows the salary in force that month. */
  document: (uuid: string, month: string, zeroStatutory = false, layout: CtcLayout = "ours", period: CtcPeriod = "monthly") =>
    get<CtcDocument>(`document/${encodeURIComponent(uuid)}?${query(month, zeroStatutory, layout, period)}`),
  download: (uuid: string, format: "xlsx" | "pdf", version: string, month: string, zeroStatutory = false, layout: CtcLayout = "ours", period: CtcPeriod = "monthly") =>
    get<CtcDownload>(`document/${encodeURIComponent(uuid)}?format=${format}&version=${encodeURIComponent(version)}&${query(month, zeroStatutory, layout, period)}`),
  options: () => get<{ employees: EmployeeListRecord[]; salaries: EmployeeSalaryListRecord[] }>("options"),
  detail: (uuid: string, action: "view" | "export" = "view") =>
    get<EmployeeSalaryDetailRecord>(`employee/${encodeURIComponent(uuid)}?action=${action}`),
};
