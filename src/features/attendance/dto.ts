// DTOs for the Attendance module (Slice 4), mirroring the backend serialization.

export type AttendanceDayDto = {
  intID: number;
  intEmployeeID: number;
  dtWorkDate: string | null;
  strStatus: string;
  strFirstIn: string | null;
  strLastOut: string | null;
  decWorkedHours: number;
  intLateMinutes: number;
  intEarlyMinutes: number;
  decOtHours: number;
  blnIsPaid: boolean;
  blnIsFinalized?: boolean;
  strRemark: string | null;
  strEmployeeCode?: string | null;
  strEmployeeName?: string | null;
};

export type ShiftDto = {
  intID: number;
  intCompanyID: number | null;
  strShiftCode: string;
  strShiftName: string;
  strStartTime: string | null;
  strEndTime: string | null;
  intGraceInMinutes: number;
  intBreakMinutes: number;
  decFullDayHours: number;
  decHalfDayHours: number;
  blnIsActive: boolean;
};

export type ShiftRequest = {
  intCompanyID?: number | null;
  strShiftCode: string;
  strShiftName: string;
  tmStartTime: string;
  tmEndTime: string;
  intGraceInMinutes: number;
  intGraceOutMinutes: number;
  intBreakMinutes: number;
  decFullDayHours: number;
  decHalfDayHours: number;
  blnIsActive: boolean;
};

export type RosterRequest = {
  intCompanyID?: number | null;
  intEmployeeID: number;
  intShiftID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
  strWeeklyOffPattern: string;
};

export type MyShiftDto = {
  intID: number;
  intEmployeeID: number;
  intShiftID: number;
  strShiftName: string | null;
  dtEffectiveFrom: string | null;
  dtEffectiveTo: string | null;
  strWeeklyOffPattern: string;
  blnIsActive: boolean;
};

export type PunchRequest = {
  strDirection?: string | null;
  strSource: string;
  dtPunchAt?: string | null;
  decGeoLat?: number | null;
  decGeoLng?: number | null;
};

export type HolidayDto = {
  intID: number;
  objRecordUUID?: string | null;
  intCompanyID?: number | null;
  intHolidayYear: number;
  dtHolidayDate: string;
  strHolidayCode: string;
  strHolidayName: string;
  strDisplayName: string;
  strHolidayTypeCode: string;
  strHolidayTypeName?: string | null;
  blnIsPaid: boolean;
  blnIsOptional: boolean;
  blnWorkOnHolidayAllowed: boolean;
  blnCompOffEligible: boolean;
  blnIsActive: boolean;
  lstTexts?: HolidayTextDto[];
  dtAddedOn?: string | null;
  intAddedBy?: number | null;
  dtLastModifiedOn?: string | null;
  intLastModifiedBy?: number | null;
};

export type HolidayTextDto = {
  intLanguageID: number;
  strHolidayName: string;
};

export type HolidayRequest = {
  intCompanyID?: number | null;
  intHolidayYear: number;
  dtHolidayDate: string;
  strHolidayCode: string;
  strHolidayName: string;
  strHolidayTypeCode: string;
  blnIsPaid: boolean;
  blnIsOptional: boolean;
  blnWorkOnHolidayAllowed: boolean;
  blnCompOffEligible: boolean;
  blnIsActive: boolean;
  intLanguageID?: number | null;
  lstTexts: HolidayTextDto[];
};

export type HolidayListFilters = {
  intYear: number;
  strSearch?: string;
  strHolidayTypeCode?: string;
  blnIsPaid?: boolean;
  blnIsOptional?: boolean;
  blnIsActive?: boolean;
};

export type HolidayFormOptions = {
  lstLanguages: Array<{ intID: number; strLabel: string; strCode?: string }>;
  lstHolidayTypes: Array<{ intID: number; strValueCode: string; strDisplayName: string }>;
  intDefaultLanguageID: number | null;
  intSecondaryLanguageID: number | null;
  lstYears: number[];
};

export const ATTENDANCE_STATUS_COLORS: Record<string, { bg: string; fg: string; short: string }> = {
  present: { bg: "#dcfce7", fg: "#166534", short: "P" },
  half_day: { bg: "#fef9c3", fg: "#854d0e", short: "½" },
  on_leave: { bg: "#dbeafe", fg: "#1e40af", short: "L" },
  lwp: { bg: "#fae8ff", fg: "#86198f", short: "LWP" },
  holiday: { bg: "#ccfbf1", fg: "#115e59", short: "H" },
  weekly_off: { bg: "#e0e7ff", fg: "#3730a3", short: "WO" },
  absent: { bg: "#fee2e2", fg: "#991b1b", short: "A" },
  on_duty: { bg: "#f1f5f9", fg: "#475569", short: "OD" },
};
