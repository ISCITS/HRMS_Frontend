import type { AttendanceDayDto } from "@/features/attendance/dto";

export type MyAttendancePunch = {
  intID: number;
  dtPunchAt: string;
  strDirection: "in" | "out";
  strSource: string;
};

export type MyAttendancePolicy = {
  strPolicyName: string;
  strPolicySource?: "EMPLOYEE_ASSIGNMENT" | "COMPANY_DEFAULT" | null;
  decFullDayThresholdHours: number;
  decHalfDayThresholdHours: number;
  blnInPunchRequired: boolean;
  blnOutPunchRequired: boolean;
  strMissingPunchTreatmentCode: string;
  intLateGraceMinutes: number;
  intEarlyDepartureGraceMinutes: number;
  intWorkHoursRoundingMinutes: number;
  blnOtEnabled: boolean;
  dtEffectiveFrom: string;
  dtEffectiveTo?: string | null;
};

export type MyAttendanceOverview = {
  dtDate: string;
  dtServerTime: string;
  strCurrentState: "not_punched" | "punched_in" | "punched_out";
  strNextPunchDirection: "in" | "out";
  blnCanPunch: boolean;
  strUnavailableReasonCode?: string | null;
  objDay?: AttendanceDayDto | null;
  lstPunches: MyAttendancePunch[];
  objPolicy?: MyAttendancePolicy | null;
};

export type MyAttendanceHistory = {
  dtFromDate: string;
  dtToDate: string;
  objSummary: {
    dicStatusCounts: Record<string, number>;
    decWorkedHours: number;
    intLateOccurrences: number;
  };
  lstDays: AttendanceDayDto[];
};
