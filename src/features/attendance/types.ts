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
  strInTime: string | null;
  strOutTime: string | null;
  decFullDayThresholdHours: number;
  decHalfDayThresholdHours: number;
  decAbsentThresholdHours: number;
  blnInPunchRequired: boolean;
  blnOutPunchRequired: boolean;
  strMissingPunchTreatmentCode: "EXCEPTION" | "ABSENT" | "HALF_DAY" | "IGNORE";
  intWorkHoursRoundingMinutes: number;
  blnOtEnabled: boolean;
  decOtMinHours: number;
  blnLateDeductionEnabled: boolean;
  intLateArrivalDays: number | null;
  strLateArrivalDeductionType: "HALF_DAY" | "FULL_DAY" | null;
  strWeeklyOffPattern: string;
  blnIsDefault: boolean;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  blnIsActive: boolean;
  strRemarks: string | null;
  lstTexts?: AttendancePolicyText[];
  blnHasAssignmentsOrUsage?: boolean;
};

export type AttendancePolicyFormValues = Omit<AttendancePolicy, "intID" | "blnHasAssignmentsOrUsage">;
export type AttendancePolicyList = { lstItems: AttendancePolicy[]; intTotal: number; intPage: number; intPageSize: number };

export type AttendancePolicyText = {
  intLanguageID: number;
  strPolicyName: string;
  strDescription: string | null;
};

export type AttendancePolicyAssignmentEmployee = {
  intEmployeeID: number;
  strEmployeeCode: string;
  strEmployeeName: string;
  intDepartmentID: number | null;
  strDepartmentName: string | null;
  strEmployeeStatus: string;
  intCurrentPolicyID: number | null;
  strCurrentPolicyCode: string | null;
  strCurrentPolicyName: string | null;
  dtCurrentEffectiveFrom: string | null;
  dtCurrentEffectiveTo: string | null;
};

export type AttendancePolicyAssignmentHistory = {
  intID: number;
  intEmployeeID: number;
  strEmployeeCode: string | null;
  strEmployeeName: string | null;
  intAttendancePolicyID: number;
  strPolicyCode: string | null;
  strPolicyName: string | null;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  strAssignmentStatus: string;
  strSourceType: string;
  strAssignmentReason: string | null;
  blnIsCurrent: boolean;
};

export type AttendancePolicyAssignmentRequest = {
  lstEmployeeIDs: number[];
  intAttendancePolicyID: number;
  dtEffectiveFrom: string;
  dtEffectiveTo: string | null;
  strAssignmentReason: string | null;
  blnReplaceExisting: boolean;
};

export type AttendancePolicyAssignmentResult = {
  intAssignedCount: number;
  intClosedCount: number;
  lstAssignments: AttendancePolicyAssignmentHistory[];
};

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
  intEarlyMinutes: number;
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
  intEarlyMinutes: number;
  decOtHours: number;
  blnIsPaid: boolean;
  strRemark: string | null;
};

// Single-row HR Edit/Override payload (Attendance Finalization POC stabilization,
// Developer Guide Section E). Reason is mandatory whenever the row already exists.
export type DailyAttendanceOverrideRequest = DailyAttendanceSaveRow & { dtWorkDate: string };

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

export type DailyAttendanceFinalizeRequest = {
  dtWorkDate: string;
  intDepartmentID?: number;
  intLocationID?: number;
  intEmployeeID?: number;
};

export type DailyAttendanceFinalizeSkippedEmployee = {
  intEmployeeID: number;
  strEmployeeCode?: string | null;
  strReason: string;
  strMissingDirection?: string | null;
};

export type DailyAttendanceFinalizeConfigError = { intEmployeeID: number; strEmployeeCode?: string | null; strReason: string };

export type AttendanceImportRow = {
  intExcelRowNumber: number;
  strEmployeeCode: string;
  strEmployeeName: string | null;
  intEmployeeID: number | null;
  strRawDate: string;
  dtWorkDate: string | null;
  strStatus: string;
  strFirstIn: string | null;
  strLastOut: string | null;
  blnValid: boolean;
  strErrorMessage: string | null;
  blnWillOverwrite: boolean;
};

export type AttendanceImportPreviewResult = {
  lstRows: AttendanceImportRow[];
  intTotal: number;
  intValid: number;
  intErrors: number;
  intWillOverwrite: number;
};

export type AttendanceImportCommitRow = {
  intExcelRowNumber: number;
  intEmployeeID: number;
  dtWorkDate: string;
  strStatus: string;
  tmFirstIn: string | null;
  tmLastOut: string | null;
};

export type AttendanceImportCommitFailure = {
  intExcelRowNumber: number;
  intEmployeeID: number | null;
  strMessage: string;
};

export type AttendanceImportCommitResult = {
  intCreated: number;
  intUpdated: number;
  intSkipped: number;
  lstFailures: AttendanceImportCommitFailure[];
};

export type DailyAttendanceFinalizeResult = {
  dtWorkDate: string;
  intProcessed: number;
  intFinalized: number;
  intExceptionsCreated: number;
  lstSkipped: DailyAttendanceFinalizeSkippedEmployee[];
  lstConfigurationErrors: DailyAttendanceFinalizeConfigError[];
};
