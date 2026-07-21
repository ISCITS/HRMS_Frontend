"use client";

import { ApiRequestMethod, ApiRoutePrefix } from "@/Common/enums/AppEnums";
import { requestEncryptedApi } from "@/Common/utils/apiErrorHandler";
import type {
  AttendanceDayDto,
  HolidayDto,
  HolidayFormOptions,
  HolidayListFilters,
  HolidayRequest,
  MyShiftDto,
  PunchRequest,
  RosterRequest,
  ShiftDto,
  ShiftRequest,
} from "@/features/attendance/dto";

const ATTENDANCE_VIEW = "ATTENDANCE_VIEW";
const ATTENDANCE_MANAGE = "ATTENDANCE_MANAGE";
const HOLIDAY_MASTER_VIEW = "HOLIDAY_MASTER_VIEW";
const HOLIDAY_MASTER_CREATE = "HOLIDAY_MASTER_CREATE";
const HOLIDAY_MASTER_EDIT = "HOLIDAY_MASTER_EDIT";

async function requestApi<TData>(objOptions: {
  strPath: string;
  strMethod: ApiRequestMethod;
  objBody?: unknown;
  strMenuAction: string;
}) {
  return requestEncryptedApi<TData>({
    strPath: `${ApiRoutePrefix.ApiV1}${objOptions.strPath}`,
    strMethod: objOptions.strMethod,
    objBody: objOptions.objBody,
    strMenuAction: objOptions.strMenuAction,
    blnUseAuthHeader: true,
  });
}

export const attendanceService = {
  // ---- ESS ----
  async punch(objPayload: PunchRequest): Promise<AttendanceDayDto> {
    const objResult = await requestApi<AttendanceDayDto>({
      strPath: "/ess/attendance/punch",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data;
  },

  async getMyCalendar(strPeriod: string): Promise<AttendanceDayDto[]> {
    const objResult = await requestApi<AttendanceDayDto[]>({
      strPath: `/ess/attendance/calendar?period=${encodeURIComponent(strPeriod)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getMyShift(): Promise<MyShiftDto | null> {
    const objResult = await requestApi<MyShiftDto | null>({
      strPath: "/ess/attendance/shift",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? null;
  },

  // ---- HR / Admin ----
  async listShifts(): Promise<ShiftDto[]> {
    const objResult = await requestApi<ShiftDto[]>({
      strPath: "/attendance/shifts",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async createShift(objPayload: ShiftRequest): Promise<ShiftDto> {
    const objResult = await requestApi<ShiftDto>({
      strPath: "/attendance/shifts",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  async assignRoster(objPayload: RosterRequest): Promise<unknown> {
    const objResult = await requestApi<unknown>({
      strPath: "/attendance/roster/assign",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },

  async getMuster(strDate: string): Promise<AttendanceDayDto[]> {
    const objResult = await requestApi<AttendanceDayDto[]>({
      strPath: `/attendance/muster?date=${encodeURIComponent(strDate)}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: ATTENDANCE_VIEW,
    });
    return objResult.Data ?? [];
  },

  async listHolidays(objFilters: HolidayListFilters | number): Promise<HolidayDto[]> {
    const objResolvedFilters: HolidayListFilters = typeof objFilters === "number" ? { intYear: objFilters } : objFilters;
    const objQuery = new URLSearchParams({ year: String(objResolvedFilters.intYear) });
    if (objResolvedFilters.strSearch) objQuery.set("search", objResolvedFilters.strSearch);
    if (objResolvedFilters.strHolidayTypeCode) objQuery.set("holiday_type_code", objResolvedFilters.strHolidayTypeCode);
    if (objResolvedFilters.blnIsPaid !== undefined) objQuery.set("is_paid", String(objResolvedFilters.blnIsPaid));
    if (objResolvedFilters.blnIsOptional !== undefined) objQuery.set("is_optional", String(objResolvedFilters.blnIsOptional));
    if (objResolvedFilters.blnIsActive !== undefined) objQuery.set("is_active", String(objResolvedFilters.blnIsActive));
    const objResult = await requestApi<HolidayDto[]>({
      strPath: `/attendance/holidays?${objQuery.toString()}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: HOLIDAY_MASTER_VIEW,
    });
    return objResult.Data ?? [];
  },

  async getHolidayFormOptions(): Promise<HolidayFormOptions> {
    const objResult = await requestApi<HolidayFormOptions>({
      strPath: "/attendance/holidays/form-options",
      strMethod: ApiRequestMethod.Get,
      strMenuAction: HOLIDAY_MASTER_VIEW,
    });
    return objResult.Data;
  },

  async getHoliday(intHolidayID: number): Promise<HolidayDto> {
    const objResult = await requestApi<HolidayDto>({
      strPath: `/attendance/holidays/${intHolidayID}`,
      strMethod: ApiRequestMethod.Get,
      strMenuAction: HOLIDAY_MASTER_VIEW,
    });
    return objResult.Data;
  },

  async createHoliday(objPayload: HolidayRequest): Promise<HolidayDto> {
    const objResult = await requestApi<HolidayDto>({
      strPath: "/attendance/holidays",
      strMethod: ApiRequestMethod.Post,
      objBody: objPayload,
      strMenuAction: HOLIDAY_MASTER_CREATE,
    });
    return objResult.Data;
  },

  async updateHoliday(intHolidayID: number, objPayload: HolidayRequest): Promise<HolidayDto> {
    const objResult = await requestApi<HolidayDto>({
      strPath: `/attendance/holidays/${intHolidayID}`,
      strMethod: ApiRequestMethod.Put,
      objBody: objPayload,
      strMenuAction: HOLIDAY_MASTER_EDIT,
    });
    return objResult.Data;
  },

  async translateHolidayText(strText: string, intSourceLanguageID: number, intTargetLanguageID: number): Promise<string> {
    const objResult = await requestApi<{ strTranslatedText: string }>({
      strPath: "/attendance/holidays/translate",
      strMethod: ApiRequestMethod.Post,
      objBody: { strText, intSourceLanguageID, intTargetLanguageID },
      strMenuAction: HOLIDAY_MASTER_EDIT,
    });
    return objResult.Data.strTranslatedText;
  },

  async reconcile(intEmployeeID: number, strPeriod: string): Promise<{ intDaysReconciled: number; strPeriod: string }> {
    const objResult = await requestApi<{ intDaysReconciled: number; strPeriod: string }>({
      strPath: `/attendance/reconcile?employee_id=${intEmployeeID}&period=${encodeURIComponent(strPeriod)}`,
      strMethod: ApiRequestMethod.Post,
      objBody: {},
      strMenuAction: ATTENDANCE_MANAGE,
    });
    return objResult.Data;
  },
};
