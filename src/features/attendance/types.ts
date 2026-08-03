export type AttendanceRecord = {
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
};

export type AttendancePolicy = {
  intID: number;
  intCompanyID: number | null;
  strPolicyCode: string;
  strPolicyName: string | null;
  strDescription: string | null;
  intLocationID: number | null;
  intGradeID: number | null;
  intEmploymentTypeID: number | null;
  intLateGraceMinutes: number;
  intEarlyDepartureGraceMinutes: number;
  decFullDayThresholdHours: number;
  decHalfDayThresholdHours: number;
  decAbsentThresholdHours: number;
  blnInPunchRequired: boolean;
  blnOutPunchRequired: boolean;
  strMissingPunchTreatmentCode: "EXCEPTION" | "ABSENT" | "HALF_DAY" | "IGNORE";
  intWorkHoursRoundingMinutes: number;
  blnOtEnabled: boolean;
  decOtMinHours: number;
  strLateDeductionRule: string | null;
  strWeeklyOffPattern: string;
  blnIsDefault: boolean;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
  strRemarks: string | null;
};

export type AttendancePolicyFormValues = Omit<AttendancePolicy, "intID">;
export type AttendancePolicyList = { lstItems: AttendancePolicy[]; intTotal: number; intPage: number; intPageSize: number };

export type DailyAttendanceRow = {
  intID: number | null;
  intEmployeeID: number;
  dtWorkDate: string;
  strEmployeeCode: string;
  strEmployeeName: string;
  intDepartmentID: number | null;
  strDepartmentName: string | null;
  intLocationID: number;
  strLocationName: string | null;
  strStatus: string | null;
  strFirstIn: string | null;
  strLastOut: string | null;
  decWorkedHours: number;
  intLateMinutes: number;
  decOtHours: number;
  blnIsPaid: boolean;
  strRemark: string | null;
};

export type DailyAttendanceSaveRow = {
  intEmployeeID: number;
  strStatus: string;
  tmFirstIn: string | null;
  tmLastOut: string | null;
  decWorkedHours: number;
  intLateMinutes: number;
  decOtHours: number;
  blnIsPaid: boolean;
  strRemark: string | null;
};

export type DailyAttendanceValidationResult = { intRowIndex: number; intEmployeeID: number; blnValid: boolean; strErrorCode: string | null; strMessage: string | null };
export type DailyAttendanceBulkResult = { blnSaved: boolean; intSavedCount: number; lstResults: DailyAttendanceValidationResult[] };

export type DailyAttendanceBulkFillRangeRequest = {
  intEmployeeID: number;
  dtFromDate: string;
  dtToDate: string;
  strDefaultStatus: string;
  blnSkipResolvedDays: boolean;
  blnOverwriteExisting: boolean;
};

export type DailyAttendanceBulkFillSkippedDay = { dtDate: string; strReason: string; strMessage?: string | null };
export type DailyAttendanceBulkFillRangeResult = {
  intEmployeeID: number;
  intCreatedCount: number;
  intSkippedCount: number;
  lstCreatedDates: string[];
  lstSkipped: DailyAttendanceBulkFillSkippedDay[];
};
