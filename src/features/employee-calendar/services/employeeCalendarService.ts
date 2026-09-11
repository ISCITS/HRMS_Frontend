import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type { EmployeeCalendarData } from "@/features/employee-calendar/types/EmployeeCalendarTypes";

export const employeeCalendarService = {
  async getCalendar(strFromDate: string, strToDate: string): Promise<EmployeeCalendarData> {
    const objResult = await requestEncryptedApi<EmployeeCalendarData>({
      strPath: `${ApiRoutePrefix.ApiV1}/ess/employee-calendar?fromDate=${encodeURIComponent(strFromDate)}&toDate=${encodeURIComponent(strToDate)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: "ESS_EMPLOYEE_CALENDAR_VIEW",
      blnUseAuthHeader: true,
    });
    return objResult.Data;
  },
};
