import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type { EmployeeListRecord } from "@/features/employee/types";
import type { EmployeeSalaryDetailRecord, EmployeeSalaryListRecord } from "@/features/employee-salary/types";

export type CtcDocument = {
  sheetName: string; widths: number[]; version: string; warnings: string[];
  rows: Array<Array<{ text: string; span: number; bold: boolean; background: string; borders: boolean[]; align: "left" | "center" | "right" }>>;
};
type CtcDownload = { strFileName: string; strContentType: string; strBase64Content: string };

async function get<T>(path: string): Promise<T> {
  const result = await requestEncryptedApi<T>({
    strPath: `${ApiRoutePrefix.ApiV1}/reports/ctc-format/${path}`,
    strMethod: ApiRequestMethod.Get, strMenuAction: "EMPLOYEE_SALARY", blnUseAuthHeader: true,
  });
  return result.Data;
}

export const ctcReportService = {
  document: (uuid: string) => get<CtcDocument>(`document/${encodeURIComponent(uuid)}`),
  download: (uuid: string, format: "xlsx" | "pdf", version: string) =>
    get<CtcDownload>(`document/${encodeURIComponent(uuid)}?format=${format}&version=${encodeURIComponent(version)}`),
  options: () => get<{ employees: EmployeeListRecord[]; salaries: EmployeeSalaryListRecord[] }>("options"),
  detail: (uuid: string, action: "view" | "export" = "view") =>
    get<EmployeeSalaryDetailRecord>(`employee/${encodeURIComponent(uuid)}?action=${action}`),
};
