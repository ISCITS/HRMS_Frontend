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
  // True only when strStatus is "holiday" AND this employee has their own approved
  // Restricted Holiday leave application on this date - lets the ESS calendar show
  // "Restricted Holiday" instead of a plain "Holiday" chip for that specific day/employee.
  blnIsMyRestrictedHoliday?: boolean;
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

export const ATTENDANCE_STATUS_COLORS: Record<string, { bg: string; fg: string; short: string }> = {
  present: { bg: "#dcfce7", fg: "#166534", short: "P" },
  half_day: { bg: "#fef9c3", fg: "#854d0e", short: "½" },
  on_leave: { bg: "#dbeafe", fg: "#1e40af", short: "L" },
  lwp: { bg: "#fae8ff", fg: "#86198f", short: "LWP" },
  holiday: { bg: "#ccfbf1", fg: "#115e59", short: "H" },
  // Frontend-only display key (see attendanceDisplayStatus in EssAttendancePanel) - the
  // backend always reports strStatus "holiday" for this day; never sent by the API itself.
  restricted_holiday: { bg: "#ffedd5", fg: "#9a3412", short: "RH" },
  weekly_off: { bg: "#e0e7ff", fg: "#3730a3", short: "WO" },
  absent: { bg: "#fee2e2", fg: "#991b1b", short: "A" },
  on_duty: { bg: "#f1f5f9", fg: "#475569", short: "OD" },
};
